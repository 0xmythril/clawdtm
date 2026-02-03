import { v } from 'convex/values'
import { mutation, query, internalMutation, internalAction } from './_generated/server'
import { internal } from './_generated/api'
import { analyzeWithAI, getDefaultModel } from './lib/openrouter'
import { extractScannableUrls, scanUrls, isVTConfigured } from './lib/virustotal'

// ============================================
// Types
// ============================================

type RiskLevel = 'safe' | 'low' | 'medium' | 'high' | 'critical'

interface SecurityAnalysis {
  score: number
  riskLevel: RiskLevel
  flags: string[]
  summary: string
  reasoning: string
}

// ============================================
// Security Analysis Prompt
// ============================================

const SECURITY_PROMPT = `You are a security analyst evaluating an OpenClaw/ClawdBot skill for potential security risks.

Analyze the following skill and provide a security assessment in JSON format.

IMPORTANT CONTEXT:
- OpenClaw skills can execute shell commands, access files, and make network requests
- Malicious skills may disguise themselves as helpful tools but contain backdoors, stealers, or droppers
- Common attack patterns include: downloading external binaries, obfuscated scripts, exfiltrating data

SECURITY FLAGS TO CHECK:
- remote_execution: Instructions to download and run external code/binaries
- obfuscated_code: Base64 encoded payloads, encoded scripts, or unusual encoding
- sensitive_data_access: Accesses passwords, wallets, credentials, SSH keys, API keys
- shell_commands: Executes shell commands (especially dangerous ones like curl|bash, eval)
- network_requests: Makes HTTP requests to untrusted/suspicious domains
- permission_escalation: Requests sudo, admin, or elevated permissions
- data_exfiltration: Sends local data to external servers
- persistence: Sets up cron jobs, startup scripts, or other persistence mechanisms
- external_url: Contains URLs to potentially dangerous downloads (flag for VT scan)

RISK LEVELS:
- safe (90-100): No concerning patterns, standard functionality
- low (70-89): Minor concerns but likely benign
- medium (50-69): Some suspicious patterns, warrants review
- high (25-49): Multiple red flags, likely malicious
- critical (0-24): Clear malicious intent, immediate threat

Respond with ONLY valid JSON in this exact format:
{
  "score": <number 0-100>,
  "riskLevel": "<safe|low|medium|high|critical>",
  "flags": ["<flag1>", "<flag2>"],
  "summary": "<1-2 sentence summary of findings>",
  "reasoning": "<detailed explanation of analysis>"
}

SKILL TO ANALYZE:
---
Name: {{name}}
Author: {{author}}
Description: {{description}}
Tags: {{tags}}
Category: {{category}}

Content (skill.md or summary):
{{content}}
---`

// ============================================
// Internal Helpers
// ============================================

function buildAnalysisPrompt(skill: {
  name?: string
  author?: string
  description?: string
  tags?: string[]
  category?: string
  content?: string
}): string {
  return SECURITY_PROMPT
    .replace('{{name}}', skill.name ?? 'Unknown')
    .replace('{{author}}', skill.author ?? 'Unknown')
    .replace('{{description}}', skill.description ?? 'No description')
    .replace('{{tags}}', (skill.tags ?? []).join(', ') || 'None')
    .replace('{{category}}', skill.category ?? 'Unknown')
    .replace('{{content}}', skill.content ?? skill.description ?? 'No content available')
}

function parseAnalysisResponse(content: string): SecurityAnalysis {
  try {
    // Try to extract JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No JSON found in response')
    }
    
    const parsed = JSON.parse(jsonMatch[0])
    
    // Validate and sanitize
    const score = Math.max(0, Math.min(100, Number(parsed.score) || 50))
    const validLevels: RiskLevel[] = ['safe', 'low', 'medium', 'high', 'critical']
    const riskLevel = validLevels.includes(parsed.riskLevel) 
      ? parsed.riskLevel as RiskLevel 
      : scoreToRiskLevel(score)
    
    return {
      score,
      riskLevel,
      flags: Array.isArray(parsed.flags) ? parsed.flags : [],
      summary: String(parsed.summary || 'Analysis complete'),
      reasoning: String(parsed.reasoning || 'No detailed reasoning provided'),
    }
  } catch (error) {
    console.error('Failed to parse AI response:', error, content)
    // Return a conservative fallback
    return {
      score: 50,
      riskLevel: 'medium',
      flags: ['parse_error'],
      summary: 'Failed to parse AI analysis - manual review recommended',
      reasoning: `Parse error: ${error}. Raw response: ${content.slice(0, 500)}`,
    }
  }
}

function scoreToRiskLevel(score: number): RiskLevel {
  if (score >= 90) return 'safe'
  if (score >= 70) return 'low'
  if (score >= 50) return 'medium'
  if (score >= 25) return 'high'
  return 'critical'
}

// ============================================
// Mutations
// ============================================

/**
 * Record a security scan result
 */
export const recordScanResult = internalMutation({
  args: {
    skillId: v.id('cachedSkills'),
    skillSlug: v.string(),
    scanType: v.union(v.literal('ai'), v.literal('virustotal')),
    securityScore: v.number(),
    riskLevel: v.union(
      v.literal('safe'),
      v.literal('low'),
      v.literal('medium'),
      v.literal('high'),
      v.literal('critical')
    ),
    flags: v.array(v.string()),
    summary: v.string(),
    reasoning: v.string(),
    vtPositives: v.optional(v.number()),
    vtTotal: v.optional(v.number()),
    vtPermalink: v.optional(v.string()),
    vtScannedUrls: v.optional(v.array(v.string())),
    model: v.optional(v.string()),
    durationMs: v.optional(v.number()),
    status: v.union(v.literal('success'), v.literal('error')),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Insert scan log
    await ctx.db.insert('securityScanLogs', {
      skillId: args.skillId,
      skillSlug: args.skillSlug,
      scanType: args.scanType,
      securityScore: args.securityScore,
      riskLevel: args.riskLevel,
      flags: args.flags,
      summary: args.summary,
      reasoning: args.reasoning,
      vtPositives: args.vtPositives,
      vtTotal: args.vtTotal,
      vtPermalink: args.vtPermalink,
      vtScannedUrls: args.vtScannedUrls,
      model: args.model,
      durationMs: args.durationMs,
      status: args.status,
      errorMessage: args.errorMessage,
      createdAt: Date.now(),
    })

    // Update skill with latest scan results (only on success)
    if (args.status === 'success') {
      await ctx.db.patch(args.skillId, {
        securityScore: args.securityScore,
        securityRisk: args.riskLevel,
        securityFlags: args.flags,
        lastSecurityScanAt: Date.now(),
        vtAnalysisUrl: args.vtPermalink,
      })
    }
  },
})

/**
 * Get skills that need security scanning
 */
export const getUnscannedSkills = internalMutation({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 10
    
    // Get skills that have never been scanned
    const unscanned = await ctx.db
      .query('cachedSkills')
      .withIndex('by_last_security_scan', (q) => q.eq('lastSecurityScanAt', undefined))
      .filter((q) => q.neq(q.field('hidden'), true))
      .take(limit)
    
    return unscanned.map(s => ({
      _id: s._id,
      slug: s.slug,
      name: s.name ?? s.displayName ?? s.slug,
      author: s.author,
      description: s.description ?? s.summary,
      tags: Array.isArray(s.tags) ? s.tags : [],
      category: s.category,
    }))
  },
})

/**
 * Get skills that need rescanning (scanned more than 7 days ago)
 */
export const getStaleScannedSkills = internalMutation({
  args: {
    limit: v.optional(v.number()),
    maxAgeMs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 10
    const maxAgeMs = args.maxAgeMs ?? 7 * 24 * 60 * 60 * 1000 // 7 days
    const cutoff = Date.now() - maxAgeMs
    
    // Get skills with old scans
    const stale = await ctx.db
      .query('cachedSkills')
      .withIndex('by_last_security_scan')
      .filter((q) => 
        q.and(
          q.neq(q.field('lastSecurityScanAt'), undefined),
          q.lt(q.field('lastSecurityScanAt'), cutoff),
          q.neq(q.field('hidden'), true)
        )
      )
      .take(limit)
    
    return stale.map(s => ({
      _id: s._id,
      slug: s.slug,
      name: s.name ?? s.displayName ?? s.slug,
      author: s.author,
      description: s.description ?? s.summary,
      tags: Array.isArray(s.tags) ? s.tags : [],
      category: s.category,
    }))
  },
})

// ============================================
// Actions (for external API calls)
// ============================================

/**
 * Analyze a single skill with AI
 */
export const analyzeSkill = internalAction({
  args: {
    skillId: v.id('cachedSkills'),
    slug: v.string(),
    name: v.optional(v.string()),
    author: v.optional(v.string()),
    description: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    category: v.optional(v.string()),
    content: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ success: boolean; analysis?: SecurityAnalysis; error?: string }> => {
    const startTime = Date.now()
    
    try {
      // Build the prompt
      const prompt = buildAnalysisPrompt({
        name: args.name,
        author: args.author,
        description: args.description,
        tags: args.tags,
        category: args.category,
        content: args.content,
      })

      // Call OpenRouter
      const aiResult = await analyzeWithAI(prompt, { 
        jsonMode: true,
        maxTokens: 1024,
      })

      // Parse the response
      const analysis = parseAnalysisResponse(aiResult.content)
      const durationMs = Date.now() - startTime

      // Check for external URLs that should be scanned by VT
      const contentToScan = args.content ?? args.description ?? ''
      const urls = extractScannableUrls(contentToScan)
      
      let vtResult = null
      if (urls.length > 0 && (analysis.riskLevel === 'high' || analysis.riskLevel === 'critical' || analysis.flags.includes('external_url'))) {
        // Scan URLs with VirusTotal if configured
        if (isVTConfigured()) {
          vtResult = await scanUrls(urls)
          
          // Adjust score based on VT results
          if (vtResult.hasThreats) {
            analysis.score = Math.max(0, analysis.score - (vtResult.totalPositives * 5))
            analysis.riskLevel = scoreToRiskLevel(analysis.score)
            analysis.flags.push('vt_threats_detected')
            analysis.summary += ` VirusTotal detected ${vtResult.totalPositives} threats.`
          }
        }
      }

      // Record the result
      await ctx.runMutation(internal.security.recordScanResult, {
        skillId: args.skillId,
        skillSlug: args.slug,
        scanType: 'ai',
        securityScore: analysis.score,
        riskLevel: analysis.riskLevel,
        flags: analysis.flags,
        summary: analysis.summary,
        reasoning: analysis.reasoning,
        vtPositives: vtResult?.totalPositives,
        vtTotal: vtResult?.totalScanned,
        vtPermalink: vtResult?.results[0]?.permalink,
        vtScannedUrls: vtResult?.scannedUrls,
        model: aiResult.model,
        durationMs,
        status: 'success',
      })

      return { success: true, analysis }
    } catch (error) {
      const durationMs = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : String(error)
      
      // Record the error
      await ctx.runMutation(internal.security.recordScanResult, {
        skillId: args.skillId,
        skillSlug: args.slug,
        scanType: 'ai',
        securityScore: 50,
        riskLevel: 'medium',
        flags: ['scan_error'],
        summary: 'Scan failed - manual review recommended',
        reasoning: errorMessage,
        model: getDefaultModel(),
        durationMs,
        status: 'error',
        errorMessage,
      })

      return { success: false, error: errorMessage }
    }
  },
})

/**
 * Batch scan multiple skills
 */
export const scanBatch = internalAction({
  args: {},
  handler: async (ctx): Promise<{ scanned: number; total: number }> => {
    // Get unscanned skills (larger batch for faster initial scanning)
    const skills = await ctx.runMutation(internal.security.getUnscannedSkills, { limit: 50 })
    
    if (skills.length === 0) {
      console.log('[Security] No unscanned skills found')
      return { scanned: 0, total: 0 }
    }

    console.log(`[Security] Scanning ${skills.length} skills...`)
    
    let successCount = 0
    for (const skill of skills) {
      try {
        const result = await ctx.runAction(internal.security.analyzeSkill, {
          skillId: skill._id,
          slug: skill.slug,
          name: skill.name,
          author: skill.author,
          description: skill.description,
          tags: skill.tags,
          category: skill.category,
        })
        
        if (result.success) {
          successCount++
        }
      } catch (error) {
        console.error(`[Security] Failed to scan ${skill.slug}:`, error)
      }
    }

    console.log(`[Security] Scanned ${successCount}/${skills.length} skills`)
    return { scanned: successCount, total: skills.length }
  },
})

/**
 * Rescan skills with old scans
 */
export const rescanOldSkills = internalAction({
  args: {},
  handler: async (ctx): Promise<{ rescanned: number; total: number }> => {
    // Get skills with stale scans (> 7 days old)
    const skills = await ctx.runMutation(internal.security.getStaleScannedSkills, { limit: 20 })
    
    if (skills.length === 0) {
      console.log('[Security] No stale scans found')
      return { rescanned: 0, total: 0 }
    }

    console.log(`[Security] Rescanning ${skills.length} skills...`)
    
    let successCount = 0
    for (const skill of skills) {
      try {
        const result = await ctx.runAction(internal.security.analyzeSkill, {
          skillId: skill._id,
          slug: skill.slug,
          name: skill.name,
          author: skill.author,
          description: skill.description,
          tags: skill.tags,
          category: skill.category,
        })
        
        if (result.success) {
          successCount++
        }
      } catch (error) {
        console.error(`[Security] Failed to rescan ${skill.slug}:`, error)
      }
    }

    console.log(`[Security] Rescanned ${successCount}/${skills.length} skills`)
    return { rescanned: successCount, total: skills.length }
  },
})

// ============================================
// Queries (for frontend)
// ============================================

/**
 * Get security scan history for a skill
 */
export const getSkillScanHistory = query({
  args: {
    slug: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 10
    
    const logs = await ctx.db
      .query('securityScanLogs')
      .withIndex('by_slug', (q) => q.eq('skillSlug', args.slug))
      .order('desc')
      .take(limit)
    
    return logs
  },
})

/**
 * Get skills by security risk level (for admin panel)
 */
export const getSkillsByRiskLevel = query({
  args: {
    riskLevel: v.union(
      v.literal('safe'),
      v.literal('low'),
      v.literal('medium'),
      v.literal('high'),
      v.literal('critical')
    ),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50
    const offset = args.offset ?? 0
    
    const skills = await ctx.db
      .query('cachedSkills')
      .withIndex('by_security_risk', (q) => q.eq('securityRisk', args.riskLevel))
      .filter((q) => q.neq(q.field('hidden'), true))
      .take(500) // Get a batch
    
    const paginated = skills.slice(offset, offset + limit)
    
    return {
      skills: paginated.map(s => ({
        _id: s._id,
        slug: s.slug,
        name: s.name ?? s.displayName ?? s.slug,
        author: s.author,
        securityScore: s.securityScore,
        securityRisk: s.securityRisk,
        securityFlags: s.securityFlags ?? [],
        lastSecurityScanAt: s.lastSecurityScanAt,
      })),
      total: skills.length,
      hasMore: offset + limit < skills.length,
    }
  },
})

/**
 * Get skills filtered by security score range (for slider filter)
 */
export const getSkillsByScoreRange = query({
  args: {
    minScore: v.number(),
    maxScore: v.number(),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50
    const offset = args.offset ?? 0
    
    // Get all scanned skills and filter by score range
    const allSkills = await ctx.db
      .query('cachedSkills')
      .filter((q) => 
        q.and(
          q.neq(q.field('hidden'), true),
          q.neq(q.field('securityScore'), undefined)
        )
      )
      .collect()
    
    // Filter by score range
    const filtered = allSkills.filter(s => 
      s.securityScore !== undefined && 
      s.securityScore >= args.minScore && 
      s.securityScore <= args.maxScore
    )
    
    // Sort by score ascending (worst first)
    filtered.sort((a, b) => (a.securityScore ?? 0) - (b.securityScore ?? 0))
    
    const paginated = filtered.slice(offset, offset + limit)
    
    return {
      skills: paginated.map(s => ({
        _id: s._id,
        slug: s.slug,
        name: s.name ?? s.displayName ?? s.slug,
        author: s.author,
        securityScore: s.securityScore,
        securityRisk: s.securityRisk,
        securityFlags: s.securityFlags ?? [],
        lastSecurityScanAt: s.lastSecurityScanAt,
      })),
      total: filtered.length,
      hasMore: offset + limit < filtered.length,
    }
  },
})

/**
 * Get security stats for admin dashboard
 */
export const getSecurityStats = query({
  args: {},
  handler: async (ctx) => {
    // Count skills by risk level
    const allSkills = await ctx.db
      .query('cachedSkills')
      .filter((q) => q.neq(q.field('hidden'), true))
      .collect()
    
    const stats = {
      total: allSkills.length,
      scanned: 0,
      unscanned: 0,
      safe: 0,
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    }
    
    for (const skill of allSkills) {
      if (skill.lastSecurityScanAt) {
        stats.scanned++
        if (skill.securityRisk) {
          stats[skill.securityRisk]++
        }
      } else {
        stats.unscanned++
      }
    }
    
    return stats
  },
})

// ============================================
// Admin Mutations
// ============================================

/**
 * Trigger a manual scan for a specific skill (admin only)
 */
export const triggerManualScan = mutation({
  args: {
    clerkId: v.string(),
    skillId: v.id('cachedSkills'),
  },
  handler: async (ctx, args) => {
    // Check if user is moderator/admin
    const user = await ctx.db
      .query('clerkUsers')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', args.clerkId))
      .unique()
    
    if (!user || (user.role !== 'admin' && user.role !== 'moderator')) {
      throw new Error('Unauthorized: Moderator role required')
    }

    const skill = await ctx.db.get(args.skillId)
    if (!skill) {
      throw new Error('Skill not found')
    }

    // Schedule the scan (will run as action)
    await ctx.scheduler.runAfter(0, internal.security.analyzeSkill, {
      skillId: args.skillId,
      slug: skill.slug,
      name: skill.name ?? skill.displayName,
      author: skill.author,
      description: skill.description ?? skill.summary,
      tags: Array.isArray(skill.tags) ? skill.tags : [],
      category: skill.category,
    })

    return { success: true, message: 'Scan scheduled' }
  },
})
