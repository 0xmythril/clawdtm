import { v } from 'convex/values'
import { query, action, internalAction, internalMutation, internalQuery } from './_generated/server'
import { internal } from './_generated/api'

// Environment variable for model (defaults to claude-sonnet-4-20250514)
const DEFAULT_MODEL = 'anthropic/claude-sonnet-4-20250514'
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions'

// Predefined categories for skills
const SKILL_CATEGORIES = [
  'dev-tools',      // Development tools, code generation, debugging
  'automation',     // Task automation, workflows, scheduling
  'productivity',   // Note-taking, organization, time management
  'data',           // Data processing, analysis, transformation
  'web',            // Web scraping, APIs, browser automation
  'ai-ml',          // AI/ML tools, model interaction
  'devops',         // CI/CD, deployment, infrastructure
  'security',       // Security tools, authentication
  'communication',  // Email, messaging, notifications
  'file-management',// File operations, storage
  'nix',            // Nix-related plugins
  'utility',        // General utilities
  'other',          // Doesn't fit other categories
] as const

type SkillCategory = typeof SKILL_CATEGORIES[number]

// ============================================
// Internal Queries
// ============================================

// Get skills that haven't been categorized yet
export const getUncategorizedSkills = internalQuery({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20
    
    // Get ALL cached skills (we need to scan them all to find uncategorized ones)
    const skills = await ctx.db.query('cachedSkills').collect()
    
    // Filter out ones that already have a category assigned by AI
    const uncategorized = []
    for (const skill of skills) {
      // Check if we already have a successful categorization log
      const existingLog = await ctx.db
        .query('categorizationLogs')
        .withIndex('by_skill', q => q.eq('skillId', skill._id))
        .filter(q => q.eq(q.field('status'), 'success'))
        .first()
      
      if (!existingLog) {
        uncategorized.push(skill)
        if (uncategorized.length >= limit) break
      }
    }
    
    return uncategorized
  },
})

// Get a single skill by ID
export const getSkillById = internalQuery({
  args: { id: v.id('cachedSkills') },
  handler: async (ctx, args) => {
    return ctx.db.get(args.id)
  },
})

// ============================================
// Internal Mutations
// ============================================

// Update a skill's category and tags
export const updateSkillCategorization = internalMutation({
  args: {
    skillId: v.id('cachedSkills'),
    category: v.string(),
    tags: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.skillId, {
      category: args.category,
      tags: args.tags,
    })
  },
})

// Log a categorization attempt
export const logCategorization = internalMutation({
  args: {
    skillId: v.id('cachedSkills'),
    skillSlug: v.string(),
    assignedCategory: v.optional(v.string()),
    assignedTags: v.optional(v.array(v.string())),
    reasoning: v.string(),
    model: v.string(),
    inputTokens: v.optional(v.number()),
    outputTokens: v.optional(v.number()),
    durationMs: v.optional(v.number()),
    status: v.union(v.literal('success'), v.literal('error'), v.literal('skipped')),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert('categorizationLogs', {
      skillId: args.skillId,
      skillSlug: args.skillSlug,
      assignedCategory: args.assignedCategory,
      assignedTags: args.assignedTags,
      reasoning: args.reasoning,
      model: args.model,
      inputTokens: args.inputTokens,
      outputTokens: args.outputTokens,
      durationMs: args.durationMs,
      status: args.status,
      errorMessage: args.errorMessage,
      createdAt: Date.now(),
    })
  },
})

// ============================================
// Internal Actions
// ============================================

interface OpenRouterResponse {
  id: string
  choices: {
    message: {
      content: string
    }
  }[]
  usage?: {
    prompt_tokens: number
    completion_tokens: number
  }
}

interface CategorizationResult {
  category: SkillCategory
  tags: string[]
  reasoning: string
}

// Categorize a single skill using AI
export const categorizeSkill = internalAction({
  args: {
    skillId: v.id('cachedSkills'),
  },
  handler: async (ctx, args): Promise<{ success: boolean; error?: string }> => {
    const startTime = Date.now()
    
    // Get the skill
    const skill = await ctx.runQuery(internal.categorization.getSkillById, {
      id: args.skillId,
    })
    
    if (!skill) {
      return { success: false, error: 'Skill not found' }
    }
    
    const skillName = skill.name ?? skill.displayName ?? skill.slug
    const skillDescription = skill.description ?? skill.summary ?? ''
    
    // Get API key
    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) {
      await ctx.runMutation(internal.categorization.logCategorization, {
        skillId: args.skillId,
        skillSlug: skill.slug,
        reasoning: 'OPENROUTER_API_KEY not configured',
        model: 'none',
        status: 'skipped',
        errorMessage: 'API key not configured',
      })
      return { success: false, error: 'OPENROUTER_API_KEY not configured' }
    }
    
    // Get model from env or use default
    const model = process.env.OPENROUTER_MODEL ?? DEFAULT_MODEL
    
    // Build prompt
    const prompt = buildCategorizationPrompt(skillName, skill.slug, skillDescription)
    
    try {
      const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://clawdtm.com',
          'X-Title': 'ClawdTM Skill Categorization',
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'system',
              content: 'You are a helpful assistant that categorizes AI agent skills. Respond only with valid JSON.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.3,
          max_tokens: 500,
        }),
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`OpenRouter API error: ${response.status} - ${errorText.slice(0, 200)}`)
      }
      
      const data: OpenRouterResponse = await response.json()
      const content = data.choices[0]?.message?.content
      
      if (!content) {
        throw new Error('No content in API response')
      }
      
      // Parse the JSON response
      const result = parseCategorizationResponse(content)
      
      const durationMs = Date.now() - startTime
      
      // Update the skill
      await ctx.runMutation(internal.categorization.updateSkillCategorization, {
        skillId: args.skillId,
        category: result.category,
        tags: result.tags,
      })
      
      // Log success
      await ctx.runMutation(internal.categorization.logCategorization, {
        skillId: args.skillId,
        skillSlug: skill.slug,
        assignedCategory: result.category,
        assignedTags: result.tags,
        reasoning: result.reasoning,
        model,
        inputTokens: data.usage?.prompt_tokens,
        outputTokens: data.usage?.completion_tokens,
        durationMs,
        status: 'success',
      })
      
      return { success: true }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      const durationMs = Date.now() - startTime
      const model = process.env.OPENROUTER_MODEL ?? DEFAULT_MODEL
      
      // Log error
      await ctx.runMutation(internal.categorization.logCategorization, {
        skillId: args.skillId,
        skillSlug: skill.slug,
        reasoning: `Error during categorization: ${errorMessage}`,
        model,
        durationMs,
        status: 'error',
        errorMessage,
      })
      
      return { success: false, error: errorMessage }
    }
  },
})

// Categorize multiple skills in a batch
export const categorizeSkillsBatch = internalAction({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<{ processed: number; succeeded: number; failed: number }> => {
    const limit = args.limit ?? 10
    
    // Get uncategorized skills
    const skills: Awaited<ReturnType<typeof ctx.runQuery<typeof internal.categorization.getUncategorizedSkills>>> = await ctx.runQuery(internal.categorization.getUncategorizedSkills, {
      limit,
    })
    
    if (skills.length === 0) {
      console.log('No uncategorized skills found')
      return { processed: 0, succeeded: 0, failed: 0 }
    }
    
    console.log(`Processing ${skills.length} skills for categorization`)
    
    let succeeded = 0
    let failed = 0
    
    for (const skill of skills) {
      const result = await ctx.runAction(internal.categorization.categorizeSkill, {
        skillId: skill._id,
      })
      
      if (result.success) {
        succeeded++
      } else {
        failed++
        console.warn(`Failed to categorize ${skill.slug}: ${result.error}`)
      }
      
      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500))
    }
    
    console.log(`Categorization complete: ${succeeded} succeeded, ${failed} failed`)
    
    return { processed: skills.length, succeeded, failed }
  },
})

// Manual trigger (internal only - not exposed via HTTP)
export const runCategorizationManually = internalAction({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<{ processed: number; succeeded: number; failed: number }> => {
    console.log('Manual categorization triggered')
    return await ctx.runAction(internal.categorization.categorizeSkillsBatch, {
      limit: args.limit ?? 50,
    })
  },
})

// Public trigger for testing categorization
export const triggerCategorization = action({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<{ processed: number; succeeded: number; failed: number }> => {
    console.log('Categorization manually triggered via public action')
    return await ctx.runAction(internal.categorization.categorizeSkillsBatch, {
      limit: args.limit ?? 20,
    })
  },
})

// ============================================
// Helper Functions
// ============================================

function buildCategorizationPrompt(name: string, slug: string, description: string): string {
  const categoriesList = SKILL_CATEGORIES.join(', ')
  
  return `Analyze this AI agent skill and categorize it.

Skill Name: ${name}
Skill Slug: ${slug}
Description: ${description || 'No description provided'}

Available categories: ${categoriesList}

Respond with a JSON object containing:
1. "category": One of the available categories that best fits this skill
2. "tags": An array of 2-5 relevant tags (lowercase, hyphenated) that describe the skill's functionality
3. "reasoning": A brief explanation (1-2 sentences) of why you chose this category and these tags

Example response:
{
  "category": "automation",
  "tags": ["workflow", "scheduling", "task-runner"],
  "reasoning": "This skill automates repetitive tasks with scheduling capabilities, making it primarily an automation tool."
}

Respond ONLY with valid JSON, no additional text.`
}

// ============================================
// Public Queries (for viewing logs)
// ============================================

// Get recent categorization logs
export const getCategorizationLogs = query({
  args: {
    limit: v.optional(v.number()),
    status: v.optional(v.union(v.literal('success'), v.literal('error'), v.literal('skipped'))),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50
    
    let logs
    if (args.status) {
      logs = await ctx.db
        .query('categorizationLogs')
        .withIndex('by_status', q => q.eq('status', args.status!))
        .order('desc')
        .take(limit)
    } else {
      logs = await ctx.db
        .query('categorizationLogs')
        .withIndex('by_created')
        .order('desc')
        .take(limit)
    }
    
    return logs
  },
})

// Get categorization stats
export const getCategorizationStats = query({
  args: {},
  handler: async (ctx) => {
    const allLogs = await ctx.db.query('categorizationLogs').collect()
    
    const stats = {
      total: allLogs.length,
      success: 0,
      error: 0,
      skipped: 0,
      categoriesCounts: {} as Record<string, number>,
      lastRun: null as number | null,
    }
    
    for (const log of allLogs) {
      if (log.status === 'success') stats.success++
      else if (log.status === 'error') stats.error++
      else if (log.status === 'skipped') stats.skipped++
      
      if (log.assignedCategory) {
        stats.categoriesCounts[log.assignedCategory] = 
          (stats.categoriesCounts[log.assignedCategory] ?? 0) + 1
      }
      
      if (!stats.lastRun || log.createdAt > stats.lastRun) {
        stats.lastRun = log.createdAt
      }
    }
    
    return stats
  },
})

// ============================================
// Parsing Helpers
// ============================================

function parseCategorizationResponse(content: string): CategorizationResult {
  // Try to extract JSON from the response
  let jsonStr = content.trim()
  
  // Handle markdown code blocks
  if (jsonStr.startsWith('```')) {
    const match = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (match) {
      jsonStr = match[1].trim()
    }
  }
  
  try {
    const parsed = JSON.parse(jsonStr)
    
    // Validate category
    const category = SKILL_CATEGORIES.includes(parsed.category)
      ? parsed.category
      : 'other'
    
    // Validate tags
    const tags = Array.isArray(parsed.tags)
      ? parsed.tags.filter((t: unknown): t is string => typeof t === 'string').slice(0, 5)
      : []
    
    // Get reasoning
    const reasoning = typeof parsed.reasoning === 'string'
      ? parsed.reasoning
      : 'No reasoning provided'
    
    return { category, tags, reasoning }
  } catch (err) {
    // If JSON parsing fails, try to extract info manually
    console.error('Failed to parse JSON:', err, content)
    return {
      category: 'other',
      tags: [],
      reasoning: `Failed to parse AI response: ${content.slice(0, 100)}...`,
    }
  }
}
