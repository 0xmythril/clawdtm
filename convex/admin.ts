import { v } from 'convex/values'
import { mutation, query, internalMutation } from './_generated/server'
import type { MutationCtx, QueryCtx } from './_generated/server'
import type { Id } from './_generated/dataModel'

// ============================================
// Types
// ============================================

type UserRole = 'user' | 'moderator' | 'admin'
type BotRole = 'agent' | 'moderator' | 'admin'

// ============================================
// Auth Helper Functions
// ============================================

// Simple hash function for API keys (same as in botAgents.ts)
function simpleHash(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16).padStart(8, '0')
}

/**
 * Check if a Clerk user has admin or moderator role
 */
export async function isHumanAdmin(
  ctx: QueryCtx | MutationCtx,
  clerkId: string
): Promise<{ isAdmin: boolean; isModerator: boolean; role: UserRole | null }> {
  const user = await ctx.db
    .query('clerkUsers')
    .withIndex('by_clerk_id', (q) => q.eq('clerkId', clerkId))
    .unique()

  if (!user) {
    return { isAdmin: false, isModerator: false, role: null }
  }

  const role = user.role ?? 'user'
  return {
    isAdmin: role === 'admin',
    isModerator: role === 'admin' || role === 'moderator',
    role,
  }
}

/**
 * Check if a bot agent has admin or moderator role
 */
export async function isBotAdmin(
  ctx: QueryCtx | MutationCtx,
  apiKey: string
): Promise<{ isAdmin: boolean; isModerator: boolean; role: BotRole | null; agentId: Id<'botAgents'> | null }> {
  if (!apiKey.startsWith('clawdtm_sk_')) {
    return { isAdmin: false, isModerator: false, role: null, agentId: null }
  }

  const apiKeyHash = simpleHash(apiKey)
  const agent = await ctx.db
    .query('botAgents')
    .withIndex('by_api_key_hash', (q) => q.eq('apiKeyHash', apiKeyHash))
    .unique()

  if (!agent || agent.revokedAt) {
    return { isAdmin: false, isModerator: false, role: null, agentId: null }
  }

  const role = agent.role ?? 'agent'
  return {
    isAdmin: role === 'admin',
    isModerator: role === 'admin' || role === 'moderator',
    role,
    agentId: agent._id,
  }
}

/**
 * Require admin or moderator role, throw if not authorized
 */
export async function requireModerator(
  ctx: QueryCtx | MutationCtx,
  options: { clerkId?: string; apiKey?: string }
): Promise<{ type: 'human' | 'bot'; id: string }> {
  if (options.clerkId) {
    const { isModerator } = await isHumanAdmin(ctx, options.clerkId)
    if (!isModerator) {
      throw new Error('Unauthorized: Moderator or admin role required')
    }
    return { type: 'human', id: options.clerkId }
  }

  if (options.apiKey) {
    const { isModerator, agentId } = await isBotAdmin(ctx, options.apiKey)
    if (!isModerator || !agentId) {
      throw new Error('Unauthorized: Moderator or admin bot role required')
    }
    return { type: 'bot', id: agentId }
  }

  throw new Error('Unauthorized: No credentials provided')
}

/**
 * Require admin role only
 */
export async function requireAdmin(
  ctx: QueryCtx | MutationCtx,
  options: { clerkId?: string; apiKey?: string }
): Promise<{ type: 'human' | 'bot'; id: string }> {
  if (options.clerkId) {
    const { isAdmin } = await isHumanAdmin(ctx, options.clerkId)
    if (!isAdmin) {
      throw new Error('Unauthorized: Admin role required')
    }
    return { type: 'human', id: options.clerkId }
  }

  if (options.apiKey) {
    const { isAdmin, agentId } = await isBotAdmin(ctx, options.apiKey)
    if (!isAdmin || !agentId) {
      throw new Error('Unauthorized: Admin bot role required')
    }
    return { type: 'bot', id: agentId }
  }

  throw new Error('Unauthorized: No credentials provided')
}

// ============================================
// Bootstrap Admin (Internal - run via CLI)
// ============================================

/**
 * Force set a user as admin (bypasses checks, use for emergency fixes)
 * Run with: npx convex run admin:forceSetAdmin '{"clerkId": "user_xxx"}'
 */
export const forceSetAdmin = internalMutation({
  args: {
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query('clerkUsers')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', args.clerkId))
      .unique()

    const now = Date.now()

    if (!user) {
      const userId = await ctx.db.insert('clerkUsers', {
        clerkId: args.clerkId,
        role: 'admin',
        createdAt: now,
        updatedAt: now,
      })
      return { success: true, userId, created: true }
    }

    await ctx.db.patch(user._id, {
      role: 'admin',
      updatedAt: now,
    })

    return { success: true, userId: user._id, created: false }
  },
})

/**
 * Bootstrap the first admin user
 * Run with: npx convex run admin:bootstrapAdmin '{"clerkId": "user_xxx"}'
 */
export const bootstrapAdmin = internalMutation({
  args: {
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if any admin exists
    const existingAdmins = await ctx.db
      .query('clerkUsers')
      .withIndex('by_role', (q) => q.eq('role', 'admin'))
      .take(1)

    if (existingAdmins.length > 0) {
      return { 
        success: false, 
        error: 'An admin already exists. Use the admin panel to manage roles.' 
      }
    }

    // Find or create the user
    const user = await ctx.db
      .query('clerkUsers')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', args.clerkId))
      .unique()

    const now = Date.now()

    if (!user) {
      // Create user with admin role
      const userId = await ctx.db.insert('clerkUsers', {
        clerkId: args.clerkId,
        role: 'admin',
        createdAt: now,
        updatedAt: now,
      })
      return { success: true, userId, created: true }
    }

    // Update existing user to admin
    await ctx.db.patch(user._id, {
      role: 'admin',
      updatedAt: now,
    })

    return { success: true, userId: user._id, created: false }
  },
})

// ============================================
// Admin Queries
// ============================================

/**
 * Get current user's role (for UI)
 */
export const getCurrentUserRole = query({
  args: {
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    const result = await isHumanAdmin(ctx, args.clerkId)
    return result
  },
})

/**
 * List all users (admin only)
 */
export const listAllUsers = query({
  args: {
    clerkId: v.string(),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { isAdmin } = await isHumanAdmin(ctx, args.clerkId)
    if (!isAdmin) {
      throw new Error('Unauthorized: Admin role required')
    }

    const limit = args.limit ?? 50
    const offset = args.offset ?? 0

    const users = await ctx.db.query('clerkUsers').collect()
    const total = users.length
    const paginated = users.slice(offset, offset + limit)

    return {
      users: paginated.map((u) => ({
        _id: u._id,
        clerkId: u.clerkId,
        email: u.email,
        name: u.name,
        displayName: u.displayName,
        role: u.role ?? 'user',
        createdAt: u.createdAt,
      })),
      total,
      hasMore: offset + limit < total,
    }
  },
})

/**
 * List all bot agents (admin only)
 */
export const listAllBots = query({
  args: {
    clerkId: v.string(),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { isAdmin } = await isHumanAdmin(ctx, args.clerkId)
    if (!isAdmin) {
      throw new Error('Unauthorized: Admin role required')
    }

    const limit = args.limit ?? 50
    const offset = args.offset ?? 0

    const bots = await ctx.db.query('botAgents').collect()
    const total = bots.length
    const paginated = bots.slice(offset, offset + limit)

    return {
      bots: paginated.map((b) => ({
        _id: b._id,
        name: b.name,
        description: b.description,
        apiKeyPrefix: b.apiKeyPrefix,
        status: b.status,
        role: b.role ?? 'agent',
        voteCount: b.voteCount ?? 0,
        lastActiveAt: b.lastActiveAt,
        createdAt: b.createdAt,
        revokedAt: b.revokedAt,
      })),
      total,
      hasMore: offset + limit < total,
    }
  },
})

/**
 * List skills for admin panel (includes hidden, with curation status)
 */
export const listSkillsForAdmin = query({
  args: {
    clerkId: v.string(),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
    search: v.optional(v.string()),
    filter: v.optional(v.union(
      v.literal('all'),
      v.literal('hidden'),
      v.literal('featured'),
      v.literal('verified')
    )),
  },
  handler: async (ctx, args) => {
    const { isModerator } = await isHumanAdmin(ctx, args.clerkId)
    if (!isModerator) {
      throw new Error('Unauthorized: Moderator role required')
    }

    const limit = args.limit ?? 50
    const offset = args.offset ?? 0
    const filter = args.filter ?? 'all'

    let skills = await ctx.db.query('cachedSkills').collect()

    // Apply filter
    if (filter === 'hidden') {
      skills = skills.filter((s) => s.hidden === true)
    } else if (filter === 'featured') {
      skills = skills.filter((s) => s.isFeatured === true)
    } else if (filter === 'verified') {
      skills = skills.filter((s) => s.isVerified === true)
    }

    // Apply search
    if (args.search) {
      const searchLower = args.search.toLowerCase()
      skills = skills.filter((s) => 
        s.slug.toLowerCase().includes(searchLower) ||
        (s.name ?? s.displayName ?? '').toLowerCase().includes(searchLower) ||
        (s.author ?? '').toLowerCase().includes(searchLower)
      )
    }

    // Sort by downloads desc
    skills.sort((a, b) => b.downloads - a.downloads)

    const total = skills.length
    const paginated = skills.slice(offset, offset + limit)

    return {
      skills: paginated.map((s) => ({
        _id: s._id,
        slug: s.slug,
        name: s.name ?? s.displayName ?? s.slug,
        author: s.author ?? 'unknown',
        downloads: s.downloads,
        category: s.category,
        hidden: s.hidden ?? false,
        hiddenReason: s.hiddenReason,
        hiddenAt: s.hiddenAt,
        isFeatured: s.isFeatured ?? false,
        featuredAt: s.featuredAt,
        isVerified: s.isVerified ?? false,
        verifiedAt: s.verifiedAt,
        reviewCount: s.reviewCount ?? 0,
        avgRating: s.avgRating,
      })),
      total,
      hasMore: offset + limit < total,
    }
  },
})

// ============================================
// Admin Mutations - User/Bot Role Management
// ============================================

/**
 * Set a user's role (admin only)
 */
export const setUserRole = mutation({
  args: {
    clerkId: v.string(), // The admin making the request
    targetClerkId: v.string(), // The user to modify
    role: v.union(v.literal('user'), v.literal('moderator'), v.literal('admin')),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, { clerkId: args.clerkId })

    // Prevent demoting yourself
    if (args.clerkId === args.targetClerkId && args.role !== 'admin') {
      throw new Error('Cannot demote yourself')
    }

    const targetUser = await ctx.db
      .query('clerkUsers')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', args.targetClerkId))
      .unique()

    if (!targetUser) {
      throw new Error('User not found')
    }

    await ctx.db.patch(targetUser._id, {
      role: args.role,
      updatedAt: Date.now(),
    })

    return { success: true, role: args.role }
  },
})

/**
 * Set a bot's role (admin only)
 */
export const setBotRole = mutation({
  args: {
    clerkId: v.string(),
    botAgentId: v.id('botAgents'),
    role: v.union(v.literal('agent'), v.literal('moderator'), v.literal('admin')),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, { clerkId: args.clerkId })

    const bot = await ctx.db.get(args.botAgentId)
    if (!bot) {
      throw new Error('Bot not found')
    }

    await ctx.db.patch(args.botAgentId, {
      role: args.role,
      updatedAt: Date.now(),
    })

    return { success: true, role: args.role }
  },
})

/**
 * Create a privileged bot (admin only) - returns raw API key
 */
export const createPrivilegedBot = mutation({
  args: {
    clerkId: v.string(),
    name: v.string(),
    description: v.optional(v.string()),
    role: v.union(v.literal('agent'), v.literal('moderator'), v.literal('admin')),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, { clerkId: args.clerkId })

    // Get the admin's user ID
    const adminUser = await ctx.db
      .query('clerkUsers')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', args.clerkId))
      .unique()

    if (!adminUser) {
      throw new Error('Admin user not found')
    }

    // Generate API key
    const randomPart = Array.from({ length: 32 }, () => 
      'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[
        Math.floor(Math.random() * 62)
      ]
    ).join('')
    const apiKey = `clawdtm_sk_${randomPart}`
    const apiKeyHash = simpleHash(apiKey)
    const apiKeyPrefix = apiKey.slice(0, 16) + '...'

    const now = Date.now()

    const botId = await ctx.db.insert('botAgents', {
      name: args.name,
      description: args.description,
      apiKeyHash,
      apiKeyPrefix,
      ownerClerkUserId: adminUser._id,
      status: 'verified',
      role: args.role,
      createdAt: now,
      updatedAt: now,
    })

    // Return the raw API key - this is the only time it's shown
    return {
      success: true,
      botId,
      apiKey, // Raw key - show to user once
      apiKeyPrefix,
      role: args.role,
    }
  },
})

/**
 * Revoke a bot's API key (admin only)
 */
export const revokeBot = mutation({
  args: {
    clerkId: v.string(),
    botAgentId: v.id('botAgents'),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx, { clerkId: args.clerkId })

    const bot = await ctx.db.get(args.botAgentId)
    if (!bot) {
      throw new Error('Bot not found')
    }

    await ctx.db.patch(args.botAgentId, {
      revokedAt: Date.now(),
      updatedAt: Date.now(),
    })

    return { success: true }
  },
})

// ============================================
// Admin Mutations - Skill Curation
// ============================================

/**
 * Set a skill's featured status (moderator+)
 */
export const setSkillFeatured = mutation({
  args: {
    clerkId: v.string(),
    slug: v.string(),
    featured: v.boolean(),
  },
  handler: async (ctx, args) => {
    const actor = await requireModerator(ctx, { clerkId: args.clerkId })

    const skill = await ctx.db
      .query('cachedSkills')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .unique()

    if (!skill) {
      throw new Error(`Skill not found: ${args.slug}`)
    }

    await ctx.db.patch(skill._id, {
      isFeatured: args.featured,
      featuredAt: args.featured ? Date.now() : undefined,
      featuredBy: args.featured ? actor.id : undefined,
    })

    return { success: true, slug: args.slug, featured: args.featured }
  },
})

/**
 * Set a skill's verified status (moderator+)
 */
export const setSkillVerified = mutation({
  args: {
    clerkId: v.string(),
    slug: v.string(),
    verified: v.boolean(),
  },
  handler: async (ctx, args) => {
    const actor = await requireModerator(ctx, { clerkId: args.clerkId })

    const skill = await ctx.db
      .query('cachedSkills')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .unique()

    if (!skill) {
      throw new Error(`Skill not found: ${args.slug}`)
    }

    await ctx.db.patch(skill._id, {
      isVerified: args.verified,
      verifiedAt: args.verified ? Date.now() : undefined,
      verifiedBy: args.verified ? actor.id : undefined,
    })

    return { success: true, slug: args.slug, verified: args.verified }
  },
})

/**
 * Hide a skill (moderator+) - protected version
 */
export const adminHideSkill = mutation({
  args: {
    clerkId: v.string(),
    slug: v.string(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const actor = await requireModerator(ctx, { clerkId: args.clerkId })

    const skill = await ctx.db
      .query('cachedSkills')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .unique()

    if (!skill) {
      throw new Error(`Skill not found: ${args.slug}`)
    }

    await ctx.db.patch(skill._id, {
      hidden: true,
      hiddenReason: args.reason ?? 'Hidden by moderator',
      hiddenAt: Date.now(),
      hiddenBy: actor.id,
    })

    return { success: true, slug: args.slug }
  },
})

/**
 * Unhide a skill (moderator+) - protected version
 */
export const adminUnhideSkill = mutation({
  args: {
    clerkId: v.string(),
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    await requireModerator(ctx, { clerkId: args.clerkId })

    const skill = await ctx.db
      .query('cachedSkills')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .unique()

    if (!skill) {
      throw new Error(`Skill not found: ${args.slug}`)
    }

    await ctx.db.patch(skill._id, {
      hidden: false,
      hiddenReason: undefined,
      hiddenAt: undefined,
      hiddenBy: undefined,
    })

    return { success: true, slug: args.slug }
  },
})

// ============================================
// Bot Admin Mutations (API Key Auth)
// ============================================

/**
 * Hide a skill (bot moderator+)
 */
export const botHideSkill = mutation({
  args: {
    apiKey: v.string(),
    slug: v.string(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const actor = await requireModerator(ctx, { apiKey: args.apiKey })

    const skill = await ctx.db
      .query('cachedSkills')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .unique()

    if (!skill) {
      throw new Error(`Skill not found: ${args.slug}`)
    }

    await ctx.db.patch(skill._id, {
      hidden: true,
      hiddenReason: args.reason ?? 'Hidden by bot moderator',
      hiddenAt: Date.now(),
      hiddenBy: actor.id,
    })

    return { success: true, slug: args.slug }
  },
})

/**
 * Unhide a skill (bot moderator+)
 */
export const botUnhideSkill = mutation({
  args: {
    apiKey: v.string(),
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    await requireModerator(ctx, { apiKey: args.apiKey })

    const skill = await ctx.db
      .query('cachedSkills')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .unique()

    if (!skill) {
      throw new Error(`Skill not found: ${args.slug}`)
    }

    await ctx.db.patch(skill._id, {
      hidden: false,
      hiddenReason: undefined,
      hiddenAt: undefined,
      hiddenBy: undefined,
    })

    return { success: true, slug: args.slug }
  },
})

/**
 * Set skill featured status (bot moderator+)
 */
export const botSetSkillFeatured = mutation({
  args: {
    apiKey: v.string(),
    slug: v.string(),
    featured: v.boolean(),
  },
  handler: async (ctx, args) => {
    const actor = await requireModerator(ctx, { apiKey: args.apiKey })

    const skill = await ctx.db
      .query('cachedSkills')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .unique()

    if (!skill) {
      throw new Error(`Skill not found: ${args.slug}`)
    }

    await ctx.db.patch(skill._id, {
      isFeatured: args.featured,
      featuredAt: args.featured ? Date.now() : undefined,
      featuredBy: args.featured ? actor.id : undefined,
    })

    return { success: true, slug: args.slug, featured: args.featured }
  },
})

/**
 * Set skill verified status (bot moderator+)
 */
export const botSetSkillVerified = mutation({
  args: {
    apiKey: v.string(),
    slug: v.string(),
    verified: v.boolean(),
  },
  handler: async (ctx, args) => {
    const actor = await requireModerator(ctx, { apiKey: args.apiKey })

    const skill = await ctx.db
      .query('cachedSkills')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .unique()

    if (!skill) {
      throw new Error(`Skill not found: ${args.slug}`)
    }

    await ctx.db.patch(skill._id, {
      isVerified: args.verified,
      verifiedAt: args.verified ? Date.now() : undefined,
      verifiedBy: args.verified ? actor.id : undefined,
    })

    return { success: true, slug: args.slug, verified: args.verified }
  },
})
