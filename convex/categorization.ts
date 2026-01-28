import { v } from 'convex/values'
import { internalMutation, internalAction, internalQuery } from './_generated/server'
import { internal } from './_generated/api'

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

// Logic-based categorization rules (keyword matching)
const CATEGORY_KEYWORDS: Record<SkillCategory, string[]> = {
  'dev-tools': [
    'code', 'programming', 'developer', 'git', 'github', 'gitlab', 'debug', 'compile', 'build',
    'swift', 'python', 'javascript', 'typescript', 'rust', 'go', 'java', 'c++', 'c#',
    'ide', 'editor', 'vscode', 'vim', 'emacs', 'terminal', 'cli', 'sdk', 'api', 'framework',
    'library', 'package', 'dependency', 'test', 'testing', 'lint', 'format', 'refactor'
  ],
  'automation': [
    'automate', 'workflow', 'schedule', 'cron', 'task', 'job', 'pipeline', 'trigger',
    'event', 'webhook', 'integration', 'zapier', 'ifttt', 'script', 'batch', 'process'
  ],
  'productivity': [
    'note', 'todo', 'task', 'reminder', 'calendar', 'schedule', 'organize', 'manage',
    'notion', 'obsidian', 'roam', 'evernote', 'todoist', 'asana', 'trello', 'jira',
    'time', 'track', 'focus', 'pomodoro', 'productivity', 'efficiency'
  ],
  'data': [
    'data', 'database', 'sql', 'query', 'analyze', 'analysis', 'process', 'transform',
    'csv', 'json', 'xml', 'excel', 'spreadsheet', 'table', 'chart', 'graph', 'visualize',
    'etl', 'extract', 'load', 'warehouse', 'bigquery', 'snowflake'
  ],
  'web': [
    'web', 'http', 'https', 'api', 'rest', 'graphql', 'scrape', 'crawl', 'browser',
    'chrome', 'firefox', 'safari', 'selenium', 'puppeteer', 'playwright', 'fetch',
    'request', 'response', 'url', 'link', 'html', 'css', 'javascript', 'frontend'
  ],
  'ai-ml': [
    'ai', 'artificial intelligence', 'machine learning', 'ml', 'llm', 'gpt', 'claude',
    'openai', 'anthropic', 'model', 'neural', 'deep learning', 'nlp', 'natural language',
    'chatbot', 'assistant', 'generation', 'image generation', 'text generation', 'embedding'
  ],
  'devops': [
    'deploy', 'deployment', 'ci', 'cd', 'ci/cd', 'docker', 'kubernetes', 'k8s',
    'container', 'infrastructure', 'terraform', 'ansible', 'puppet', 'chef',
    'aws', 'azure', 'gcp', 'cloud', 'server', 'monitor', 'log', 'metrics'
  ],
  'security': [
    'security', 'auth', 'authentication', 'authorization', 'encrypt', 'decrypt',
    'password', 'token', 'jwt', 'oauth', 'ssl', 'tls', 'vpn', 'firewall', 'scan',
    'vulnerability', 'penetration', 'audit', 'compliance'
  ],
  'communication': [
    'email', 'mail', 'gmail', 'outlook', 'message', 'chat', 'slack', 'discord',
    'teams', 'zoom', 'meet', 'call', 'sms', 'notification', 'alert', 'push',
    'twitter', 'x', 'social', 'linkedin', 'facebook', 'instagram'
  ],
  'file-management': [
    'file', 'folder', 'directory', 'upload', 'download', 'storage', 'drive',
    'dropbox', 'onedrive', 's3', 'gcs', 'azure blob', 'backup', 'sync', 'copy',
    'move', 'delete', 'archive', 'compress', 'zip', 'tar', 'gzip'
  ],
  'nix': [
    'nix', 'nixos', 'nixpkgs', 'flake', 'nix-shell', 'nix-build'
  ],
  'utility': [
    'utility', 'tool', 'helper', 'util', 'convert', 'format', 'parse', 'validate',
    'hash', 'encode', 'decode', 'random', 'uuid', 'date', 'time', 'string', 'number'
  ],
  'other': [] // Catch-all
}

// Logic-based categorization function
function categorizeSkillLogic(skill: {
  name?: string | null
  displayName?: string | null
  slug: string
  description?: string | null
  summary?: string | null
  tags?: any
}): { category: SkillCategory; tags: string[] } {
  const text = [
    skill.name,
    skill.displayName,
    skill.slug,
    skill.description,
    skill.summary,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  // Extract tags if they exist
  const existingTags: string[] = []
  if (Array.isArray(skill.tags)) {
    existingTags.push(...skill.tags.filter((t): t is string => typeof t === 'string'))
  } else if (skill.tags && typeof skill.tags === 'object') {
    existingTags.push(...Object.keys(skill.tags))
  }

  // Score each category based on keyword matches
  const scores: Record<SkillCategory, number> = {} as Record<SkillCategory, number>
  
  for (const category of SKILL_CATEGORIES) {
    scores[category] = 0
    const keywords = CATEGORY_KEYWORDS[category]
    
    for (const keyword of keywords) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi')
      if (regex.test(text)) {
        scores[category] += 1
      }
    }
    
    // Also check tags
    for (const tag of existingTags) {
      if (keywords.includes(tag.toLowerCase())) {
        scores[category] += 2 // Tags are weighted higher
      }
    }
  }

  // Find category with highest score
  let bestCategory: SkillCategory = 'other'
  let bestScore = 0
  
  for (const [category, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score
      bestCategory = category as SkillCategory
    }
  }

  // Extract meaningful tags (exclude version tags)
  const EXCLUDED_TAGS = new Set(['latest', 'stable', 'beta', 'alpha', 'dev', 'main', 'master'])
  const isVersionTag = (tag: string) => /^v?\d+\.\d+(\.\d+)?(-.*)?$/.test(tag)
  
  const tags = existingTags
    .filter(tag => {
      const normalized = tag.toLowerCase().trim()
      if (normalized.length < 2 || normalized.length > 30) return false
      if (EXCLUDED_TAGS.has(normalized)) return false
      if (isVersionTag(normalized)) return false
      return true
    })
    .slice(0, 10) // Limit to 10 tags

  return { category: bestCategory, tags }
}

// ============================================
// Internal Mutations
// ============================================

// Update a skill's category and tags (logic-based)
export const updateSkillCategorization = internalMutation({
  args: {
    skillId: v.id('cachedSkills'),
    category: v.string(),
    tags: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.skillId, {
      category: args.category,
      tags: args.tags.length > 0 ? args.tags : undefined,
    })
  },
})

// Categorize a single skill using logic-based rules
export const categorizeSkill = internalMutation({
  args: {
    skillId: v.id('cachedSkills'),
  },
  handler: async (ctx, args) => {
    const skill = await ctx.db.get(args.skillId)
    if (!skill) {
      throw new Error(`Skill not found: ${args.skillId}`)
    }

    // Skip if already categorized
    if (skill.category && skill.category !== 'uncategorized') {
      return { success: true, skipped: true }
    }

    // Categorize using logic-based rules
    const { category, tags } = categorizeSkillLogic({
      name: skill.name,
      displayName: skill.displayName,
      slug: skill.slug,
      description: skill.description,
      summary: skill.summary,
      tags: skill.tags,
    })

    // Update the skill
    await ctx.db.patch(args.skillId, {
      category,
      tags: tags.length > 0 ? tags : undefined,
    })

    return { success: true, category, tags }
  },
})

// Categorize multiple skills in a batch
export const categorizeSkillsBatch = internalAction({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<{ processed: number; succeeded: number; failed: number }> => {
    const limit = args.limit ?? 100
    
    // Get uncategorized skills
    const allSkills = await ctx.runQuery(internal.categorization.getUncategorizedSkills, {
      limit,
    })
    
    if (allSkills.length === 0) {
      return { processed: 0, succeeded: 0, failed: 0 }
    }

    let succeeded = 0
    let failed = 0

    for (const skill of allSkills) {
      try {
        const result = await ctx.runMutation(internal.categorization.categorizeSkill, {
          skillId: skill._id,
        })
        if (result.success && !result.skipped) {
          succeeded++
        }
      } catch (err) {
        failed++
        console.warn(`Failed to categorize ${skill.slug}:`, err)
      }
    }

    // Update cached counts after categorization
    if (succeeded > 0) {
      try {
        await ctx.runMutation(internal.clawdhubSync.updateCachedCounts, {})
      } catch (err) {
        console.warn('Failed to update cached counts:', err)
      }
    }

    return { processed: allSkills.length, succeeded, failed }
  },
})

// Get uncategorized skills
export const getUncategorizedSkills = internalQuery({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 100
    
    const allSkills = await ctx.db.query('cachedSkills').collect()
    const uncategorized = allSkills
      .filter(s => !s.hidden && (!s.category || s.category === 'uncategorized'))
      .slice(0, limit)
    
    return uncategorized
  },
})
