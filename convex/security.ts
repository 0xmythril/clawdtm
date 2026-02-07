import { v } from 'convex/values'
import { mutation, query, internalMutation, internalAction, internalQuery } from './_generated/server'
import { internal } from './_generated/api'
import type { Id } from './_generated/dataModel'
import { analyzeWithAI, getDefaultModel } from './lib/openrouter'
import { extractScannableUrls, scanUrls, isVTConfigured } from './lib/virustotal'
import { isHumanAdmin } from './admin'

// ============================================
// Types
// ============================================

type RiskLevel = 'safe' | 'low' | 'medium' | 'high' | 'critical'

type CheckStatus = 'pass' | 'fail' | 'warn' | 'unknown'

interface SecurityCheck {
  status: CheckStatus
  details: string
}

interface SecurityChecks {
  remote_execution: SecurityCheck
  obfuscated_code: SecurityCheck
  sensitive_data_access: SecurityCheck
  shell_commands: SecurityCheck
  network_requests: SecurityCheck
  permission_escalation: SecurityCheck
  data_exfiltration: SecurityCheck
  persistence: SecurityCheck
}

interface DataSources {
  skillContent: boolean
  userComments: boolean
  virusTotal: boolean
}

interface SecurityAnalysis {
  score: number
  riskLevel: RiskLevel
  flags: string[]
  summary: string
  reasoning: string
  // New structured fields
  checks: SecurityChecks
  dataSources: DataSources
}

// Check names for display
const CHECK_LABELS: Record<keyof SecurityChecks, string> = {
  remote_execution: 'Remote Execution',
  obfuscated_code: 'Obfuscated Code',
  sensitive_data_access: 'Sensitive Data Access',
  shell_commands: 'Shell Commands',
  network_requests: 'Network Requests',
  permission_escalation: 'Permission Escalation',
  data_exfiltration: 'Data Exfiltration',
  persistence: 'Persistence',
}

// For backwards compatibility - derive flags from checks
function deriveFlags(checks: SecurityChecks): string[] {
  const flags: string[] = []
  for (const [key, check] of Object.entries(checks)) {
    if (check.status === 'fail' || check.status === 'warn') {
      flags.push(key)
    }
  }
  return flags
}

// ============================================
// Security Analysis Prompt
// ============================================

const SECURITY_PROMPT = `You are a PARANOID security analyst evaluating an OpenClaw/ClawdBot skill for potential security risks.

Your job is to PROTECT USERS from malicious skills. When in doubt, flag it as suspicious. It is MUCH BETTER to have false positives than to let malware through.

CRITICAL MINDSET - BE PARANOID:
- Assume skills are GUILTY until proven innocent
- Any shell command execution should raise immediate suspicion
- Any network request to non-standard domains is suspicious
- Any file access outside typical working directories is suspicious
- curl|bash, wget|sh, or similar patterns are HIGH risk
- Base64 encoded content is almost always malicious in this context
- "Helpful" descriptions can hide malicious intent - focus on WHAT THE CODE DOES

IMPORTANT CONTEXT:
- OpenClaw skills can execute shell commands, access files, and make network requests
- Malicious skills disguise themselves as helpful tools but contain backdoors, stealers, or droppers
- Common attack patterns: downloading external binaries, obfuscated scripts, data exfiltration
- Authors can easily change names/descriptions but not their code patterns

SECURITY CHECKS TO PERFORM:
You must evaluate EACH of these 8 checks and provide a status for each:

1. remote_execution: Does this skill download and run external code/binaries?
   - FAIL: curl|bash, wget|sh, downloading executables
   - WARN: Downloads files that could be executed
   - PASS: No download+execute patterns

2. obfuscated_code: Does this contain encoded or hidden code?
   - FAIL: Base64 payloads, encoded scripts, steganography
   - WARN: Unusual encoding or minified code
   - PASS: No obfuscation detected

3. sensitive_data_access: Does this access credentials or sensitive files?
   - FAIL: Reads ~/.ssh, ~/.aws, passwords, wallets, API keys
   - WARN: Accesses config files that may contain secrets
   - PASS: No sensitive data access

4. shell_commands: Does this execute shell commands?
   - FAIL: Uses eval, exec, or dangerous shell patterns
   - WARN: Executes any shell commands
   - PASS: No shell execution

5. network_requests: Does this make external network requests?
   - FAIL: Requests to unknown/suspicious domains
   - WARN: Requests to external APIs (even known ones)
   - PASS: No network requests

6. permission_escalation: Does this request elevated permissions?
   - FAIL: sudo, root, or admin access
   - WARN: Requests additional permissions
   - PASS: No elevation requested

7. data_exfiltration: Does this send local data to external servers?
   - FAIL: Collects and sends user data externally
   - WARN: Sends any local data over network
   - PASS: No data exfiltration patterns

8. persistence: Does this set up persistent processes?
   - FAIL: Creates cron jobs, startup scripts, daemons
   - WARN: Modifies system configuration
   - PASS: No persistence mechanisms

STATUS VALUES:
- "pass": Check passed, no concerns detected
- "fail": Check failed, definite security risk
- "warn": Potential concern, needs attention
- "unknown": Cannot determine from available information

SCORING GUIDANCE:
- 90-100 (safe): All checks pass, no concerns
- 70-89 (low): All pass or warn, no fails
- 50-69 (medium): 1-2 warns, or cannot fully verify
- 25-49 (high): Any fail, or multiple warns
- 0-24 (critical): Multiple fails, clear malicious intent

Respond with ONLY valid JSON in this exact format:
{
  "score": <number 0-100>,
  "riskLevel": "<safe|low|medium|high|critical>",
  "checks": {
    "remote_execution": { "status": "<pass|fail|warn|unknown>", "details": "<brief explanation>" },
    "obfuscated_code": { "status": "<pass|fail|warn|unknown>", "details": "<brief explanation>" },
    "sensitive_data_access": { "status": "<pass|fail|warn|unknown>", "details": "<brief explanation>" },
    "shell_commands": { "status": "<pass|fail|warn|unknown>", "details": "<brief explanation>" },
    "network_requests": { "status": "<pass|fail|warn|unknown>", "details": "<brief explanation>" },
    "permission_escalation": { "status": "<pass|fail|warn|unknown>", "details": "<brief explanation>" },
    "data_exfiltration": { "status": "<pass|fail|warn|unknown>", "details": "<brief explanation>" },
    "persistence": { "status": "<pass|fail|warn|unknown>", "details": "<brief explanation>" }
  },
  "summary": "<1 sentence summary of overall findings>"
}

SKILL TO ANALYZE:
---
Name: {{name}}
Author: {{author}}
Description: {{description}}
Tags: {{tags}}
Category: {{category}}

FILES (ALL files from skill folder - PAY EXTRA ATTENTION TO CODE FILES):
{{content}}

CRITICAL: Python, JavaScript, and Shell files contain EXECUTABLE CODE.
Look specifically for:
- Python: os.system(), subprocess, exec(), eval(), requests.post(), open() with /etc or ~
- JavaScript: fetch(), eval(), child_process, fs.readFile with sensitive paths
- Shell: curl|bash, wget|sh, sudo, reading ~/.ssh or ~/.aws

USER COMMENTS (check for reports of malicious behavior):
{{comments}}
---

If users report malware, scams, or suspicious behavior in comments, treat this as a STRONG signal and mark relevant checks as FAIL.`

// ============================================
// Content Fetching (GitHub Archive)
// ============================================

// File extensions to scan for security issues
const SCANNABLE_EXTENSIONS = ['.md', '.py', '.js', '.mjs', '.ts', '.sh', '.bash', '.json']

type SkillFileType = 'markdown' | 'python' | 'javascript' | 'shell' | 'config' | 'other'

interface SkillFile {
  name: string
  content: string
  type: SkillFileType
}

function getFileType(filename: string): SkillFileType {
  const ext = filename.substring(filename.lastIndexOf('.')).toLowerCase()
  if (['.md'].includes(ext)) return 'markdown'
  if (['.py'].includes(ext)) return 'python'
  if (['.js', '.mjs', '.ts'].includes(ext)) return 'javascript'
  if (['.sh', '.bash'].includes(ext)) return 'shell'
  if (['.json'].includes(ext)) return 'config'
  return 'other'
}

function isScannable(filename: string): boolean {
  const ext = filename.substring(filename.lastIndexOf('.')).toLowerCase()
  return SCANNABLE_EXTENSIONS.includes(ext)
}

/**
 * Fetch ALL files in a skill folder from the GitHub archive
 * Returns an array of file objects with name, content, and type
 */
async function fetchAllSkillFiles(
  slug: string,
  author: string | undefined
): Promise<SkillFile[]> {
  // Skip if no author - can't construct GitHub URL
  if (!author || author === 'unknown') {
    console.log(`[Security] Cannot fetch files for ${slug}: author unknown`)
    return []
  }
  
  const files: SkillFile[] = []
  const basePath = `skills/${author}/${slug}`
  
  // Build headers with GitHub token for rate limiting
  const githubToken = process.env.GITHUB_TOKEN
  const apiHeaders: Record<string, string> = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'ClawdTM-Security/1.0',
  }
  if (githubToken) {
    apiHeaders['Authorization'] = `token ${githubToken}`
  }
  
  try {
    // 1. Get directory listing from GitHub API
    const listUrl = `https://api.github.com/repos/openclaw/skills/contents/${basePath}`
    const listResponse = await fetch(listUrl, { headers: apiHeaders })
    
    if (!listResponse.ok) {
      console.log(`[Security] Skill not in GitHub archive: ${author}/${slug} (${listResponse.status})`)
      return []
    }
    
    const items: Array<{ name: string; type: string; path: string }> = await listResponse.json()
    
    // 2. Fetch each scannable file
    for (const item of items) {
      if (item.type !== 'file') continue
      if (!isScannable(item.name)) continue
      if (item.name === '_meta.json') continue // Skip metadata file
      
      const rawUrl = `https://raw.githubusercontent.com/openclaw/skills/main/${basePath}/${item.name}`
      const contentResponse = await fetch(rawUrl)
      if (contentResponse.ok) {
        const content = await contentResponse.text()
        files.push({
          name: item.name,
          content,
          type: getFileType(item.name),
        })
      }
    }
    
    // 3. Recursively check subdirectories (e.g., scripts/)
    for (const item of items) {
      if (item.type !== 'dir') continue
      
      const subUrl = `https://api.github.com/repos/openclaw/skills/contents/${basePath}/${item.name}`
      const subResponse = await fetch(subUrl, { headers: apiHeaders })
      
      if (!subResponse.ok) continue
      
      const subItems: Array<{ name: string; type: string }> = await subResponse.json()
      
      for (const subItem of subItems) {
        if (subItem.type !== 'file') continue
        if (!isScannable(subItem.name)) continue
        
        const rawUrl = `https://raw.githubusercontent.com/openclaw/skills/main/${basePath}/${item.name}/${subItem.name}`
        const contentResponse = await fetch(rawUrl)
        if (contentResponse.ok) {
          const content = await contentResponse.text()
          files.push({
            name: `${item.name}/${subItem.name}`,
            content,
            type: getFileType(subItem.name),
          })
        }
      }
    }
    
    console.log(`[Security] Fetched ${files.length} files for ${author}/${slug}`)
    return files
  } catch (error) {
    console.error(`[Security] Failed to fetch files for ${author}/${slug}:`, error)
    return []
  }
}

/**
 * Legacy function for backwards compatibility - concatenates all files into single content string
 */
async function fetchSkillContent(slug: string, author?: string): Promise<string | null> {
  const files = await fetchAllSkillFiles(slug, author)
  if (files.length === 0) return null
  
  // Concatenate all files with headers
  const content = files
    .map(f => `=== ${f.name} (${f.type}) ===\n${f.content}`)
    .join('\n\n')
  
  return content
}

/**
 * Fetch user comments from Clawhub to check for reports of malicious behavior
 */
async function fetchSkillComments(slug: string): Promise<string[]> {
  try {
    const url = `https://clawhub.ai/api/v1/skills/${slug}/comments`
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
    })
    if (response.ok) {
      const data = await response.json()
      // Handle various response formats
      const comments = data.comments ?? data.data ?? data
      if (Array.isArray(comments)) {
        return comments
          .map((c: { body?: string; text?: string; content?: string }) => 
            c.body || c.text || c.content || ''
          )
          .filter((text: string) => text.length > 0)
      }
    }
    return []
  } catch (error) {
    console.error(`[Security] Failed to fetch comments for ${slug}:`, error)
    return []
  }
}

// ============================================
// Internal Helpers
// ============================================

// Truncate content to stay within token limits (~4 chars per token)
const MAX_CONTENT_CHARS = 12000 // ~3000 tokens for content
const MAX_COMMENTS_CHARS = 2000 // ~500 tokens for comments

function truncateContent(content: string, maxChars: number): string {
  if (content.length <= maxChars) return content
  return content.slice(0, maxChars) + '\n\n[... TRUNCATED - Full content too large for analysis ...]'
}

function buildAnalysisPrompt(skill: {
  name?: string
  author?: string
  description?: string
  tags?: string[]
  category?: string
  content?: string
  comments?: string[]
}): string {
  const commentsText = skill.comments && skill.comments.length > 0
    ? truncateContent(skill.comments.join('\n---\n'), MAX_COMMENTS_CHARS)
    : 'No user comments available'
  
  const contentText = truncateContent(
    skill.content ?? skill.description ?? 'No content available',
    MAX_CONTENT_CHARS
  )
  
  return SECURITY_PROMPT
    .replace('{{name}}', skill.name ?? 'Unknown')
    .replace('{{author}}', skill.author ?? 'Unknown')
    .replace('{{description}}', skill.description ?? 'No description')
    .replace('{{tags}}', (skill.tags ?? []).join(', ') || 'None')
    .replace('{{category}}', skill.category ?? 'Unknown')
    .replace('{{content}}', contentText)
    .replace('{{comments}}', commentsText)
}

// Default check result for when parsing fails or check is missing
function defaultCheck(status: CheckStatus = 'unknown'): SecurityCheck {
  return { status, details: 'Could not determine' }
}

// Create default checks object
function defaultChecks(): SecurityChecks {
  return {
    remote_execution: defaultCheck(),
    obfuscated_code: defaultCheck(),
    sensitive_data_access: defaultCheck(),
    shell_commands: defaultCheck(),
    network_requests: defaultCheck(),
    permission_escalation: defaultCheck(),
    data_exfiltration: defaultCheck(),
    persistence: defaultCheck(),
  }
}

// Validate and normalize a single check
function normalizeCheck(check: unknown): SecurityCheck {
  if (!check || typeof check !== 'object') {
    return defaultCheck()
  }
  const c = check as Record<string, unknown>
  const validStatuses: CheckStatus[] = ['pass', 'fail', 'warn', 'unknown']
  const status = validStatuses.includes(c.status as CheckStatus) 
    ? (c.status as CheckStatus) 
    : 'unknown'
  const details = typeof c.details === 'string' ? c.details : 'No details provided'
  return { status, details }
}

function parseAnalysisResponse(content: string, dataSources: DataSources): SecurityAnalysis {
  try {
    // Try to extract JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No JSON found in response')
    }
    
    const parsed = JSON.parse(jsonMatch[0])
    
    // Validate and sanitize score
    const score = Math.max(0, Math.min(100, Number(parsed.score) || 50))
    const validLevels: RiskLevel[] = ['safe', 'low', 'medium', 'high', 'critical']
    const riskLevel = validLevels.includes(parsed.riskLevel) 
      ? parsed.riskLevel as RiskLevel 
      : scoreToRiskLevel(score)
    
    // Parse structured checks
    const parsedChecks = parsed.checks ?? {}
    const checks: SecurityChecks = {
      remote_execution: normalizeCheck(parsedChecks.remote_execution),
      obfuscated_code: normalizeCheck(parsedChecks.obfuscated_code),
      sensitive_data_access: normalizeCheck(parsedChecks.sensitive_data_access),
      shell_commands: normalizeCheck(parsedChecks.shell_commands),
      network_requests: normalizeCheck(parsedChecks.network_requests),
      permission_escalation: normalizeCheck(parsedChecks.permission_escalation),
      data_exfiltration: normalizeCheck(parsedChecks.data_exfiltration),
      persistence: normalizeCheck(parsedChecks.persistence),
    }
    
    // Derive flags from checks for backwards compatibility
    const flags = deriveFlags(checks)
    
    // Build reasoning from check details
    const reasoning = Object.entries(checks)
      .map(([key, check]) => `${CHECK_LABELS[key as keyof SecurityChecks]}: [${check.status.toUpperCase()}] ${check.details}`)
      .join('\n')
    
    return {
      score,
      riskLevel,
      flags,
      summary: String(parsed.summary || 'Analysis complete'),
      reasoning,
      checks,
      dataSources,
    }
  } catch (error) {
    console.error('Failed to parse AI response:', error, content)
    // Return a conservative fallback with all unknown checks
    const checks = defaultChecks()
    return {
      score: 50,
      riskLevel: 'medium',
      flags: ['parse_error'],
      summary: 'Failed to parse AI analysis - manual review recommended',
      reasoning: `Parse error: ${error}. Raw response: ${content.slice(0, 500)}`,
      checks,
      dataSources,
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
    // New structured fields
    securityChecks: v.optional(v.any()),
    dataSources: v.optional(v.object({
      skillContent: v.boolean(),
      userComments: v.boolean(),
      virusTotal: v.boolean(),
    })),
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
      securityChecks: args.securityChecks,
      dataSources: args.dataSources,
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
      const now = Date.now()
      
      // Auto-hide skills with security score below 50
      const shouldAutoHide = args.securityScore < 50
      
      await ctx.db.patch(args.skillId, {
        securityScore: args.securityScore,
        securityRisk: args.riskLevel,
        securityFlags: args.flags,
        lastSecurityScanAt: now,
        vtAnalysisUrl: args.vtPermalink,
        ...(shouldAutoHide ? {
          hidden: true,
          hiddenReason: `Auto-blocked: Security score ${args.securityScore}/100 (${args.riskLevel} risk)`,
          hiddenAt: now,
          hiddenBy: 'system:security-scanner',
        } : {}),
      })
      
      if (shouldAutoHide) {
        console.log(`[Security] Auto-hidden "${args.skillSlug}": score ${args.securityScore} (${args.riskLevel})`)
        
        // Log to audit
        await ctx.db.insert('adminAuditLogs', {
          actorType: 'system',
          actorName: 'Security Scanner',
          action: 'hide_skill',
          targetType: 'skill',
          targetId: args.skillSlug,
          targetName: args.skillSlug,
          details: {
            reason: `Auto-blocked: Security score ${args.securityScore}/100 (${args.riskLevel} risk)`,
            riskLevel: args.riskLevel,
          },
          createdAt: now,
        })
      }
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
    
    // Over-fetch to ensure we get enough skills after filtering
    const overFetchLimit = limit * 3
    
    // Get skills that have never been scanned
    const unscanned = await ctx.db
      .query('cachedSkills')
      .withIndex('by_last_security_scan', (q) => q.eq('lastSecurityScanAt', undefined))
      .filter((q) => q.neq(q.field('hidden'), true))
      .take(overFetchLimit)
    
    // Prioritize skills with known authors (full GitHub scan) over unknown (description-only)
    const withAuthor = unscanned.filter(s => s.author && s.author !== 'unknown')
    const withoutAuthor = unscanned.filter(s => !s.author || s.author === 'unknown')
    const prioritized = [...withAuthor, ...withoutAuthor].slice(0, limit)
    
    return prioritized.map(s => ({
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
    comments: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args): Promise<{ success: boolean; analysis?: SecurityAnalysis; error?: string }> => {
    const startTime = Date.now()
    
    // Track data sources
    const dataSources: DataSources = {
      skillContent: !!(args.content && args.content.trim().length > 0),
      userComments: !!(args.comments && args.comments.length > 0),
      virusTotal: false, // Updated later if VT scan is performed
    }
    
    try {
      // If we couldn't fetch skill.md content, we can still analyze the description
      // but should mark all checks as "unknown" and not give a false sense of security
      const hasFullContent = !!(args.content && args.content.trim().length > 0)
      const hasDescription = !!(args.description && args.description.trim().length > 0)
      
      // If we have nothing to analyze at all, mark as unverified
      if (!hasFullContent && !hasDescription) {
        console.log(`[Security] No content or description for ${args.slug} - marking as unverified`)
        
        // All checks are unknown since we can't analyze anything
        const unknownChecks = defaultChecks()
        
        const unverifiedAnalysis: SecurityAnalysis = {
          score: 50,  // Medium - genuinely unknown
          riskLevel: 'medium',
          flags: ['content_unavailable', 'unverified'],
          summary: 'Could not fetch skill content for analysis - status unverified',
          reasoning: 'Neither the skill.md content nor a description could be retrieved. This skill cannot be verified and should be reviewed manually before use.',
          checks: unknownChecks,
          dataSources,
        }
        
        // Record the result
        await ctx.runMutation(internal.security.recordScanResult, {
          skillId: args.skillId,
          skillSlug: args.slug,
          scanType: 'ai',
          securityScore: unverifiedAnalysis.score,
          riskLevel: unverifiedAnalysis.riskLevel,
          flags: unverifiedAnalysis.flags,
          summary: unverifiedAnalysis.summary,
          reasoning: unverifiedAnalysis.reasoning,
          securityChecks: unverifiedAnalysis.checks,
          dataSources: unverifiedAnalysis.dataSources,
          model: 'content-unavailable',
          durationMs: Date.now() - startTime,
          status: 'success',
        })
        
        return { success: true, analysis: unverifiedAnalysis }
      }
      
      // If we only have description (not full skill.md), still analyze but note the limitation
      if (!hasFullContent && hasDescription) {
        console.log(`[Security] Only description available for ${args.slug} - limited analysis`)
        dataSources.skillContent = false // Mark that we don't have full content
      }
      
      // Build the prompt
      const prompt = buildAnalysisPrompt({
        name: args.name,
        author: args.author,
        description: args.description,
        tags: args.tags,
        category: args.category,
        content: args.content,
        comments: args.comments,
      })

      // Call OpenRouter
      const aiResult = await analyzeWithAI(prompt, { 
        jsonMode: true,
        maxTokens: 1000, // Reduced to stay within credit limits
      })

      // Parse the response with data sources info
      const analysis = parseAnalysisResponse(aiResult.content, dataSources)
      const durationMs = Date.now() - startTime

      // Check for external URLs that should be scanned by VT
      const contentToScan = args.content ?? args.description ?? ''
      const urls = extractScannableUrls(contentToScan)
      
      let vtResult = null
      if (urls.length > 0 && (analysis.riskLevel === 'high' || analysis.riskLevel === 'critical' || analysis.flags.includes('external_url'))) {
        // Scan URLs with VirusTotal if configured
        if (isVTConfigured()) {
          vtResult = await scanUrls(urls)
          dataSources.virusTotal = true
          analysis.dataSources.virusTotal = true
          
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
        securityChecks: analysis.checks,
        dataSources: analysis.dataSources,
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
      console.error(`[Security] analyzeSkill failed for ${args.slug}:`, errorMessage)
      
      // Record the error with unknown checks
      const errorChecks = defaultChecks()
      await ctx.runMutation(internal.security.recordScanResult, {
        skillId: args.skillId,
        skillSlug: args.slug,
        scanType: 'ai',
        securityScore: 50,
        riskLevel: 'medium',
        flags: ['scan_error'],
        summary: 'Scan failed - manual review recommended',
        reasoning: errorMessage,
        securityChecks: errorChecks,
        dataSources,
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
        let content: string | undefined = undefined
        let comments: string[] = []

        // If author is known, fetch full content from GitHub
        if (skill.author && skill.author !== 'unknown') {
          const [fetchedContent, fetchedComments] = await Promise.all([
            fetchSkillContent(skill.slug, skill.author),
            fetchSkillComments(skill.slug),
          ])
          content = fetchedContent ?? undefined
          comments = fetchedComments
          console.log(`[Security] Fetched content for ${skill.author}/${skill.slug}: ${content ? `${content.length} chars` : 'unavailable'}, ${comments.length} comments`)
        } else {
          console.log(`[Security] Scanning ${skill.slug} with description only (author unknown)`)
        }
        
        const result = await ctx.runAction(internal.security.analyzeSkill, {
          skillId: skill._id,
          slug: skill.slug,
          name: skill.name,
          author: skill.author,
          description: skill.description,
          tags: Array.isArray(skill.tags) ? skill.tags : undefined,
          category: skill.category,
          content,
          comments: comments.length > 0 ? comments : undefined,
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
        // Skip skills without author - can't fetch from GitHub
        if (!skill.author || skill.author === 'unknown') {
          console.log(`[Security] Skipping rescan ${skill.slug}: author unknown`)
          continue
        }
        
        // Fetch ALL files from GitHub and user comments
        const [content, comments] = await Promise.all([
          fetchSkillContent(skill.slug, skill.author),
          fetchSkillComments(skill.slug),
        ])
        
        const result = await ctx.runAction(internal.security.analyzeSkill, {
          skillId: skill._id,
          slug: skill.slug,
          name: skill.name,
          author: skill.author,
          description: skill.description,
          tags: Array.isArray(skill.tags) ? skill.tags : undefined,
          category: skill.category,
          content: content ?? undefined,
          comments: comments.length > 0 ? comments : undefined,
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
 * This fetches ALL files from GitHub and runs a comprehensive analysis
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

    // If author is unknown, run description-only analysis directly
    if (!skill.author || skill.author === 'unknown') {
      // Run analysis with just the description (no GitHub content)
      await ctx.scheduler.runAfter(0, internal.security.analyzeSkill, {
        skillId: args.skillId,
        slug: skill.slug,
        name: skill.name ?? skill.displayName,
        author: skill.author,
        description: skill.description ?? skill.summary,
        tags: Array.isArray(skill.tags) ? skill.tags : undefined,
        category: skill.category,
        content: undefined, // No GitHub content available
        comments: undefined,
      })
      return { success: true, message: 'Scan scheduled (description-only, author unknown)' }
    }

    // Schedule the action that fetches content from GitHub
    await ctx.scheduler.runAfter(0, internal.security.rescanSingleSkill, {
      skillId: args.skillId,
      clerkId: args.clerkId,
    })

    return { success: true, message: 'Scan scheduled (fetching from GitHub)' }
  },
})

// ============================================
// Full Rescan Management
// ============================================

/**
 * Get current rescan status (for admin dashboard)
 */
export const getRescanStatus = query({
  args: {},
  handler: async (ctx) => {
    const state = await ctx.db
      .query('securityRescanState')
      .withIndex('by_key', (q) => q.eq('key', 'full_rescan'))
      .unique()
    
    if (!state) {
      return {
        status: 'idle' as const,
        startedAt: null,
        completedAt: null,
        totalSkills: 0,
        scannedCount: 0,
        progress: 0,
        triggeredBy: null,
      }
    }
    
    return {
      status: state.status,
      startedAt: state.startedAt ?? null,
      completedAt: state.completedAt ?? null,
      totalSkills: state.totalSkills ?? 0,
      scannedCount: state.scannedCount ?? 0,
      progress: state.totalSkills ? Math.round((state.scannedCount ?? 0) / state.totalSkills * 100) : 0,
      triggeredBy: state.triggeredBy ?? null,
      lastError: state.lastError ?? null,
    }
  },
})

/**
 * Trigger a full rescan of all skills (admin only)
 */
export const triggerFullRescan = mutation({
  args: {
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if user is admin
    const user = await ctx.db
      .query('clerkUsers')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', args.clerkId))
      .unique()
    
    if (!user || user.role !== 'admin') {
      throw new Error('Unauthorized: Admin role required')
    }

    // Check if a rescan is already running
    const existing = await ctx.db
      .query('securityRescanState')
      .withIndex('by_key', (q) => q.eq('key', 'full_rescan'))
      .unique()
    
    if (existing?.status === 'running') {
      throw new Error('A rescan is already in progress')
    }

    // Count total skills to scan
    const allSkills = await ctx.db
      .query('cachedSkills')
      .filter((q) => q.neq(q.field('hidden'), true))
      .collect()
    
    const totalSkills = allSkills.length

    // Create or update rescan state
    if (existing) {
      await ctx.db.patch(existing._id, {
        status: 'running',
        startedAt: Date.now(),
        completedAt: undefined,
        totalSkills,
        scannedCount: 0,
        cursor: 0,
        triggeredBy: args.clerkId,
        lastError: undefined,
      })
    } else {
      await ctx.db.insert('securityRescanState', {
        key: 'full_rescan',
        status: 'running',
        startedAt: Date.now(),
        totalSkills,
        scannedCount: 0,
        cursor: 0,
        triggeredBy: args.clerkId,
      })
    }

    // Reset all lastSecurityScanAt to null so they get rescanned
    for (const skill of allSkills) {
      if (skill.lastSecurityScanAt) {
        await ctx.db.patch(skill._id, {
          lastSecurityScanAt: undefined,
        })
      }
    }

    // Schedule the rescan batch action
    await ctx.scheduler.runAfter(0, internal.security.runFullRescanBatch, {})

    return { 
      success: true, 
      message: `Full rescan started for ${totalSkills} skills`,
      totalSkills,
    }
  },
})

/**
 * Trigger scan of only unscanned skills (doesn't reset existing results)
 * Admin only - schedules the scanBatch action repeatedly until all are scanned
 */
export const triggerScanUnscanned = mutation({
  args: {
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query('clerkUsers')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', args.clerkId))
      .unique()
    
    if (!user || user.role !== 'admin') {
      throw new Error('Unauthorized: Admin role required')
    }

    // Check if a rescan is already running
    const existing = await ctx.db
      .query('securityRescanState')
      .withIndex('by_key', (q) => q.eq('key', 'full_rescan'))
      .unique()
    
    if (existing?.status === 'running') {
      throw new Error('A scan is already in progress')
    }

    // Count unscanned skills
    const unscanned = await ctx.db
      .query('cachedSkills')
      .withIndex('by_last_security_scan', (q) => q.eq('lastSecurityScanAt', undefined))
      .filter((q) => q.neq(q.field('hidden'), true))
      .collect()
    
    const unscannedCount = unscanned.length

    if (unscannedCount === 0) {
      return { success: true, message: 'All skills are already scanned', totalSkills: 0 }
    }

    // Create/update rescan state for tracking
    if (existing) {
      await ctx.db.patch(existing._id, {
        status: 'running',
        startedAt: Date.now(),
        completedAt: undefined,
        scannedCount: 0,
        totalSkills: unscannedCount,
        cursor: 0,
        triggeredBy: args.clerkId,
        lastError: undefined,
      })
    } else {
      await ctx.db.insert('securityRescanState', {
        key: 'full_rescan',
        status: 'running',
        startedAt: Date.now(),
        scannedCount: 0,
        totalSkills: unscannedCount,
        cursor: 0,
        triggeredBy: args.clerkId,
      })
    }

    // Schedule the rescan batch action (reuses same batch runner)
    await ctx.scheduler.runAfter(0, internal.security.runFullRescanBatch, {})

    return { 
      success: true, 
      message: `Scanning ${unscannedCount} unscanned skills (existing results preserved)`,
      totalSkills: unscannedCount,
    }
  },
})

/**
 * Pause/stop a running rescan (admin only)
 */
export const pauseRescan = mutation({
  args: {
    clerkId: v.optional(v.string()), // Optional for internal use
  },
  handler: async (ctx, args) => {
    // Check if user is admin (skip if no clerkId - internal call)
    if (args.clerkId) {
      const user = await ctx.db
        .query('clerkUsers')
        .withIndex('by_clerk_id', (q) => q.eq('clerkId', args.clerkId as string))
        .unique()
      
      if (!user || user.role !== 'admin') {
        throw new Error('Unauthorized: Admin role required')
      }
    }

    const state = await ctx.db
      .query('securityRescanState')
      .withIndex('by_key', (q) => q.eq('key', 'full_rescan'))
      .unique()
    
    if (!state || state.status !== 'running') {
      return { success: false, message: 'No rescan is currently running' }
    }

    // Set status to idle to stop the rescan
    await ctx.db.patch(state._id, {
      status: 'idle',
    })

    return { 
      success: true, 
      message: `Rescan paused at ${state.scannedCount}/${state.totalSkills} skills`,
      scannedCount: state.scannedCount,
      totalSkills: state.totalSkills,
    }
  },
})

/**
 * Internal mutation to update rescan progress
 */
export const updateRescanProgress = internalMutation({
  args: {
    scannedCount: v.number(),
    cursor: v.number(),
    status: v.optional(v.union(v.literal('running'), v.literal('completed'), v.literal('idle'))),
    lastError: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const state = await ctx.db
      .query('securityRescanState')
      .withIndex('by_key', (q) => q.eq('key', 'full_rescan'))
      .unique()
    
    if (!state) return
    
    const updates: Record<string, unknown> = {
      scannedCount: args.scannedCount,
      cursor: args.cursor,
    }
    
    if (args.status) {
      updates.status = args.status
      if (args.status === 'completed') {
        updates.completedAt = Date.now()
      }
    }
    
    if (args.lastError !== undefined) {
      updates.lastError = args.lastError
    }
    
    await ctx.db.patch(state._id, updates)
  },
})

/**
 * Internal action to run full rescan in batches
 */
export const runFullRescanBatch = internalAction({
  args: {},
  handler: async (ctx): Promise<{ completed: boolean; scanned: number }> => {
    // Get current rescan state
    const state = await ctx.runQuery(internal.security.getRescanStateInternal, {})
    
    if (!state || state.status !== 'running') {
      console.log('[Security] Rescan not running, stopping')
      return { completed: true, scanned: 0 }
    }

    // Get unscanned skills (batch of 25 for full rescan)
    const skills = await ctx.runMutation(internal.security.getUnscannedSkills, { limit: 25 })
    
    if (skills.length === 0) {
      // All done!
      await ctx.runMutation(internal.security.updateRescanProgress, {
        scannedCount: state.scannedCount ?? 0,
        cursor: state.cursor ?? 0,
        status: 'completed',
      })
      console.log(`[Security] Full rescan completed! Total scanned: ${state.scannedCount}`)
      return { completed: true, scanned: state.scannedCount ?? 0 }
    }

    console.log(`[Security] Full rescan batch: ${skills.length} skills (progress: ${state.scannedCount}/${state.totalSkills})`)
    
    let successCount = 0
    for (const skill of skills) {
      try {
        let content: string | undefined = undefined
        let comments: string[] = []

        if (skill.author && skill.author !== 'unknown') {
          const [fetchedContent, fetchedComments] = await Promise.all([
            fetchSkillContent(skill.slug, skill.author),
            fetchSkillComments(skill.slug),
          ])
          content = fetchedContent ?? undefined
          comments = fetchedComments
        } else {
          console.log(`[Security] Full rescan ${skill.slug}: description only (author unknown)`)
        }
        
        const result = await ctx.runAction(internal.security.analyzeSkill, {
          skillId: skill._id,
          slug: skill.slug,
          name: skill.name,
          author: skill.author,
          description: skill.description,
          tags: Array.isArray(skill.tags) ? skill.tags : undefined,
          category: skill.category,
          content,
          comments: comments.length > 0 ? comments : undefined,
        })
        
        if (result.success) {
          successCount++
        }
      } catch (error) {
        console.error(`[Security] Failed to scan ${skill.slug}:`, error)
      }
    }

    // Update progress
    const newScannedCount = (state.scannedCount ?? 0) + successCount
    await ctx.runMutation(internal.security.updateRescanProgress, {
      scannedCount: newScannedCount,
      cursor: (state.cursor ?? 0) + skills.length,
    })

    // Schedule next batch
    await ctx.scheduler.runAfter(1000, internal.security.runFullRescanBatch, {})
    
    return { completed: false, scanned: successCount }
  },
})

/**
 * Internal query to get rescan state (for actions)
 */
export const getRescanStateInternal = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query('securityRescanState')
      .withIndex('by_key', (q) => q.eq('key', 'full_rescan'))
      .unique()
  },
})

// ============================================
// GitHub Commit Tracking (Auto-rescan on updates)
// ============================================

/**
 * Get the GitHub commit sync state
 */
export const getGitHubCommitSyncState = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query('gitHubCommitSyncState')
      .withIndex('by_key', (q) => q.eq('key', 'commits'))
      .unique()
  },
})

/**
 * Update the GitHub commit sync state
 */
export const updateGitHubCommitSyncState = internalMutation({
  args: {
    lastCommitSha: v.optional(v.string()),
    lastSkillsRescanned: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('gitHubCommitSyncState')
      .withIndex('by_key', (q) => q.eq('key', 'commits'))
      .unique()
    
    if (existing) {
      await ctx.db.patch(existing._id, {
        lastCommitSha: args.lastCommitSha,
        lastCheckedAt: Date.now(),
        lastSkillsRescanned: args.lastSkillsRescanned,
      })
    } else {
      await ctx.db.insert('gitHubCommitSyncState', {
        key: 'commits',
        lastCommitSha: args.lastCommitSha,
        lastCheckedAt: Date.now(),
        lastSkillsRescanned: args.lastSkillsRescanned,
      })
    }
  },
})

/**
 * Rescan a skill by slug (used for commit-triggered rescans)
 */
export const rescanBySlug = internalAction({
  args: { slug: v.string() },
  handler: async (ctx, args): Promise<{ success: boolean; reason?: string; slug?: string }> => {
    // Find the skill in cachedSkills
    const skill = await ctx.runQuery(internal.security.getSkillBySlug, { slug: args.slug }) as {
      _id: string
      slug: string
      name?: string
      author?: string
      description?: string
      tags?: unknown // Can be array or object from different API versions
      category?: string
    } | null
    
    if (!skill) {
      console.log(`[Security] Commit rescan: skill not found in DB: ${args.slug}`)
      return { success: false, reason: 'not_found' }
    }
    
    if (!skill.author || skill.author === 'unknown') {
      console.log(`[Security] Commit rescan: author unknown for ${args.slug}`)
      return { success: false, reason: 'author_unknown' }
    }
    
    console.log(`[Security] Commit rescan triggered for ${skill.author}/${args.slug}`)
    
    // Fetch content and comments
    const [content, comments] = await Promise.all([
      fetchSkillContent(args.slug, skill.author),
      fetchSkillComments(args.slug),
    ])
    
    // Run analysis
    const analysisResult = await ctx.runAction(internal.security.analyzeSkill, {
      skillId: skill._id as Id<'cachedSkills'>,
      slug: args.slug,
      name: skill.name,
      author: skill.author,
      description: skill.description,
      tags: Array.isArray(skill.tags) ? skill.tags : undefined,
      category: skill.category,
      content: content ?? undefined,
      comments: comments.length > 0 ? comments : undefined,
    }) as { success: boolean }
    
    return { success: analysisResult.success, slug: args.slug }
  },
})

/**
 * Internal query to get skill by slug
 */
export const getSkillBySlug = internalQuery({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('cachedSkills')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .unique()
  },
})

/**
 * Check GitHub commits and trigger rescans for modified skills
 * This should be run as a cron job every 15 minutes
 */
export const checkGitHubCommits = internalAction({
  args: {},
  handler: async (ctx): Promise<{ checked: number; rescanned: number; skills: string[] }> => {
    console.log('[Security] Checking GitHub commits for skill updates...')
    
    // 1. Get last processed commit SHA
    const state = await ctx.runQuery(internal.security.getGitHubCommitSyncState)
    const lastSha = state?.lastCommitSha
    
    // 2. Fetch recent commits from GitHub
    const githubToken = process.env.GITHUB_TOKEN
    const commitHeaders: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'ClawdTM-Security/1.0',
    }
    if (githubToken) {
      commitHeaders['Authorization'] = `token ${githubToken}`
    }
    const response = await fetch(
      'https://api.github.com/repos/openclaw/skills/commits?per_page=100',
      { headers: commitHeaders }
    )
    
    if (!response.ok) {
      console.error(`[Security] GitHub commits API returned ${response.status}`)
      return { checked: 0, rescanned: 0, skills: [] }
    }
    
    const commits: Array<{ sha: string; commit: { message: string } }> = await response.json()
    
    if (commits.length === 0) {
      return { checked: 0, rescanned: 0, skills: [] }
    }
    
    // If no previous SHA, just store the latest and return
    if (!lastSha) {
      console.log('[Security] First run: storing latest commit SHA')
      await ctx.runMutation(internal.security.updateGitHubCommitSyncState, {
        lastCommitSha: commits[0].sha,
        lastSkillsRescanned: [],
      })
      return { checked: 0, rescanned: 0, skills: [] }
    }
    
    // 3. Find new commits since last check
    const newCommits: typeof commits = []
    for (const commit of commits) {
      if (commit.sha === lastSha) break
      newCommits.push(commit)
    }
    
    if (newCommits.length === 0) {
      console.log('[Security] No new commits since last check')
      return { checked: 0, rescanned: 0, skills: [] }
    }
    
    console.log(`[Security] Found ${newCommits.length} new commits to process`)
    
    // 4. Extract affected skills from commit file changes
    const affectedSlugs = new Set<string>()
    
    for (const commit of newCommits) {
      try {
        const detailResponse = await fetch(
          `https://api.github.com/repos/openclaw/skills/commits/${commit.sha}`,
          {
            headers: {
              'Accept': 'application/vnd.github.v3+json',
              'User-Agent': 'ClawdTM-Security/1.0',
            },
          }
        )
        
        if (!detailResponse.ok) continue
        
        const detail: { files?: Array<{ filename: string }> } = await detailResponse.json()
        
        for (const file of detail.files || []) {
          // Extract slug from path: skills/{owner}/{slug}/...
          const match = file.filename.match(/^skills\/([^/]+)\/([^/]+)\//)
          if (match) {
            const slug = match[2] // slug (not owner/slug, just the skill name)
            affectedSlugs.add(slug)
          }
        }
      } catch (error) {
        console.error(`[Security] Failed to fetch commit details for ${commit.sha}:`, error)
      }
    }
    
    console.log(`[Security] ${affectedSlugs.size} skills affected by new commits`)
    
    // 5. Trigger rescan for affected skills (with delay to avoid rate limiting)
    const rescannedSlugs: string[] = []
    let delay = 0
    
    for (const slug of affectedSlugs) {
      await ctx.scheduler.runAfter(delay, internal.security.rescanBySlug, { slug })
      rescannedSlugs.push(slug)
      delay += 2000 // 2 second delay between rescans to avoid rate limiting
    }
    
    // 6. Update last processed SHA
    await ctx.runMutation(internal.security.updateGitHubCommitSyncState, {
      lastCommitSha: commits[0].sha,
      lastSkillsRescanned: rescannedSlugs,
    })
    
    console.log(`[Security] Scheduled ${rescannedSlugs.length} skills for rescan`)
    
    return {
      checked: newCommits.length,
      rescanned: rescannedSlugs.length,
      skills: rescannedSlugs,
    }
  },
})

/**
 * Rescan a single skill by ID (for admin use)
 */
export const rescanSingleSkill = internalAction({
  args: {
    skillId: v.id('cachedSkills'),
    clerkId: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ success: boolean }> => {
    // Get the skill
    const skill = await ctx.runQuery(internal.security.getSkillById, { skillId: args.skillId }) as {
      _id: string
      slug: string
      name?: string
      author?: string
      description?: string
      tags?: unknown // Can be array or object from different API versions
      category?: string
    } | null
    
    if (!skill) {
      throw new Error('Skill not found')
    }
    
    if (!skill.author || skill.author === 'unknown') {
      throw new Error('Cannot rescan: author unknown')
    }
    
    console.log(`[Security] Admin rescan triggered for ${skill.author}/${skill.slug}`)
    
    // Fetch content and comments
    const [content, comments] = await Promise.all([
      fetchSkillContent(skill.slug, skill.author),
      fetchSkillComments(skill.slug),
    ])
    
    // Run analysis
    const analysisResult = await ctx.runAction(internal.security.analyzeSkill, {
      skillId: skill._id as Id<'cachedSkills'>,
      slug: skill.slug,
      name: skill.name,
      author: skill.author,
      description: skill.description,
      tags: Array.isArray(skill.tags) ? skill.tags : undefined,
      category: skill.category,
      content: content ?? undefined,
      comments: comments.length > 0 ? comments : undefined,
    }) as { success: boolean }
    
    // Log audit if clerkId provided
    if (args.clerkId) {
      await ctx.runMutation(internal.security.logAdminRescan, {
        clerkId: args.clerkId,
        skillSlug: skill.slug,
        success: analysisResult.success,
      })
    }
    
    return analysisResult
  },
})

/**
 * Get skill by ID (internal)
 */
export const getSkillById = internalQuery({
  args: { skillId: v.id('cachedSkills') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.skillId)
  },
})

/**
 * Log admin rescan action
 */
export const logAdminRescan = internalMutation({
  args: {
    clerkId: v.string(),
    skillSlug: v.string(),
    success: v.boolean(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert('adminAuditLogs', {
      actorClerkId: args.clerkId,
      actorType: 'human',
      action: 'hide_skill', // TODO: Add 'rescan_skill' to audit action types
      targetType: 'skill',
      targetId: args.skillSlug,
      details: {
        reason: 'Manual security rescan',
        newValue: args.success ? 'rescanned' : 'rescan_failed',
      },
      createdAt: Date.now(),
    })
  },
})

/**
 * Reset security data in batches - internal mutation for batch processing
 */
export const resetSecurityBatch = internalMutation({
  args: {
    batchType: v.union(v.literal('skills'), v.literal('logs')),
    limit: v.number(),
  },
  handler: async (ctx, args): Promise<{ processed: number; hasMore: boolean }> => {
    let processed = 0
    
    if (args.batchType === 'skills') {
      // Get skills with security data
      const skills = await ctx.db
        .query('cachedSkills')
        .filter((q) => q.neq(q.field('securityScore'), undefined))
        .take(args.limit)
      
      for (const skill of skills) {
        await ctx.db.patch(skill._id, {
          securityScore: undefined,
          securityRisk: undefined,
          securityFlags: undefined,
          lastSecurityScanAt: undefined,
          vtAnalysisUrl: undefined,
          // Unhide skills that were auto-hidden by security scanner
          ...(skill.hiddenBy === 'system:security-scanner' ? {
            hidden: undefined,
            hiddenAt: undefined,
            hiddenBy: undefined,
            hiddenReason: undefined,
          } : {}),
        })
        processed++
      }
      
      return { processed, hasMore: skills.length === args.limit }
    } else {
      // Delete scan logs
      const logs = await ctx.db.query('securityScanLogs').take(args.limit)
      
      for (const log of logs) {
        await ctx.db.delete(log._id)
        processed++
      }
      
      return { processed, hasMore: logs.length === args.limit }
    }
  },
})

/**
 * Reset all security data - orchestrator action
 * Processes in batches to avoid Convex limits
 */
export const resetAllSecurityData = internalAction({
  args: {},
  handler: async (ctx): Promise<{ skillsReset: number; logsDeleted: number }> => {
    const BATCH_SIZE = 200
    let totalSkillsReset = 0
    let totalLogsDeleted = 0
    
    // 1. Reset skills in batches
    console.log('[Security] Starting skill reset...')
    let hasMoreSkills = true
    while (hasMoreSkills) {
      const result = await ctx.runMutation(internal.security.resetSecurityBatch, {
        batchType: 'skills',
        limit: BATCH_SIZE,
      })
      totalSkillsReset += result.processed
      hasMoreSkills = result.hasMore
      if (result.processed > 0) {
        console.log(`[Security] Reset ${totalSkillsReset} skills so far...`)
      }
    }
    
    // 2. Delete logs in batches
    console.log('[Security] Starting log deletion...')
    let hasMoreLogs = true
    while (hasMoreLogs) {
      const result = await ctx.runMutation(internal.security.resetSecurityBatch, {
        batchType: 'logs',
        limit: BATCH_SIZE,
      })
      totalLogsDeleted += result.processed
      hasMoreLogs = result.hasMore
      if (result.processed > 0) {
        console.log(`[Security] Deleted ${totalLogsDeleted} logs so far...`)
      }
    }
    
    // 3. Reset rescan state
    await ctx.runMutation(internal.security.resetRescanState, {})
    
    console.log(`[Security] Reset complete: ${totalSkillsReset} skills reset, ${totalLogsDeleted} logs deleted`)
    
    return { skillsReset: totalSkillsReset, logsDeleted: totalLogsDeleted }
  },
})

/**
 * Hide all visible skills with security score below threshold
 * Used as a one-time cleanup or can be triggered by admin
 */
export const hideUnsafeSkills = internalMutation({
  args: {
    threshold: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const threshold = args.threshold ?? 50
    const now = Date.now()
    
    // Get all visible skills with low scores
    const allSkills = await ctx.db
      .query('cachedSkills')
      .collect()
    
    const unsafeVisible = allSkills.filter(
      s => !s.hidden && s.securityScore !== undefined && s.securityScore < threshold
    )
    
    let hiddenCount = 0
    for (const skill of unsafeVisible) {
      await ctx.db.patch(skill._id, {
        hidden: true,
        hiddenReason: `Auto-blocked: Security score ${skill.securityScore}/100 (${skill.securityRisk ?? 'unknown'} risk)`,
        hiddenAt: now,
        hiddenBy: 'system:security-scanner',
      })
      hiddenCount++
    }
    
    console.log(`[Security] Hidden ${hiddenCount} skills with score below ${threshold}`)
    return { hidden: hiddenCount, threshold }
  },
})

/**
 * Reset rescan state
 */
export const resetRescanState = internalMutation({
  args: {},
  handler: async (ctx) => {
    const rescanState = await ctx.db
      .query('securityRescanState')
      .withIndex('by_key', (q) => q.eq('key', 'full_rescan'))
      .unique()
    
    if (rescanState) {
      await ctx.db.patch(rescanState._id, {
        status: 'idle',
        scannedCount: 0,
        cursor: 0,
      })
    }
  },
})
