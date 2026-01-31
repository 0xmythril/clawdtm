import { v } from 'convex/values'
import { mutation, query, internalMutation } from './_generated/server'

// ============================================
// Utility Functions
// ============================================

// Generate a random API key
function generateApiKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let key = 'clawdtm_sk_'
  for (let i = 0; i < 40; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return key
}

// Simple hash function for API keys (for demo - in production use proper crypto)
// Note: Convex doesn't have native crypto, so we use a simple hash
// In production, you'd want to use a proper hashing library via an action
function simpleHash(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  // Convert to hex and make it longer by including the string length
  const hex = Math.abs(hash).toString(16)
  return `${hex}_${str.length}_${str.slice(-8)}`
}

// ============================================
// Mutations - Human-initiated (via Clerk auth)
// ============================================

// Create a new bot agent (human creates via UI)
export const createAgent = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    // Get or create the clerk user
    let clerkUser = await ctx.db
      .query('clerkUsers')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', args.clerkId))
      .unique()

    if (!clerkUser) {
      const now = Date.now()
      const userId = await ctx.db.insert('clerkUsers', {
        clerkId: args.clerkId,
        createdAt: now,
        updatedAt: now,
      })
      clerkUser = await ctx.db.get(userId)
      if (!clerkUser) throw new Error('Failed to create user')
    }

    // Generate API key
    const apiKey = generateApiKey()
    const apiKeyHash = simpleHash(apiKey)
    const apiKeyPrefix = apiKey.slice(0, 16) + '...'

    const now = Date.now()
    const agentId = await ctx.db.insert('botAgents', {
      name: args.name,
      description: args.description,
      apiKeyHash,
      apiKeyPrefix,
      ownerClerkUserId: clerkUser._id,
      status: 'verified', // All agents are treated equally now
      voteCount: 0,
      createdAt: now,
      updatedAt: now,
    })

    return {
      success: true,
      agent: {
        id: agentId,
        name: args.name,
        apiKey, // Only returned once!
        apiKeyPrefix,
      },
      important: '⚠️ SAVE YOUR API KEY! You will not see it again.',
    }
  },
})

// List agents owned by a user
export const listMyAgents = query({
  args: {
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    const clerkUser = await ctx.db
      .query('clerkUsers')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', args.clerkId))
      .unique()

    if (!clerkUser) {
      return []
    }

    const agents = await ctx.db
      .query('botAgents')
      .withIndex('by_owner', (q) => q.eq('ownerClerkUserId', clerkUser._id))
      .collect()

    return agents
      .filter((a) => !a.revokedAt)
      .map((a) => ({
        id: a._id,
        name: a.name,
        description: a.description,
        apiKeyPrefix: a.apiKeyPrefix,
        voteCount: a.voteCount ?? 0,
        lastActiveAt: a.lastActiveAt,
        createdAt: a.createdAt,
      }))
  },
})

// Regenerate API key for an agent
export const regenerateApiKey = mutation({
  args: {
    agentId: v.id('botAgents'),
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    const clerkUser = await ctx.db
      .query('clerkUsers')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', args.clerkId))
      .unique()

    if (!clerkUser) {
      return { success: false, error: 'User not found' }
    }

    const agent = await ctx.db.get(args.agentId)
    if (!agent) {
      return { success: false, error: 'Agent not found' }
    }

    if (agent.ownerClerkUserId !== clerkUser._id) {
      return { success: false, error: 'Not authorized', hint: 'You do not own this agent' }
    }

    // Generate new API key
    const apiKey = generateApiKey()
    const apiKeyHash = simpleHash(apiKey)
    const apiKeyPrefix = apiKey.slice(0, 16) + '...'

    await ctx.db.patch(args.agentId, {
      apiKeyHash,
      apiKeyPrefix,
      updatedAt: Date.now(),
    })

    return {
      success: true,
      apiKey, // Only returned once!
      apiKeyPrefix,
      important: '⚠️ SAVE YOUR NEW API KEY! The old key no longer works.',
    }
  },
})

// Delete/revoke an agent
export const deleteAgent = mutation({
  args: {
    agentId: v.id('botAgents'),
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    const clerkUser = await ctx.db
      .query('clerkUsers')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', args.clerkId))
      .unique()

    if (!clerkUser) {
      return { success: false, error: 'User not found' }
    }

    const agent = await ctx.db.get(args.agentId)
    if (!agent) {
      return { success: false, error: 'Agent not found' }
    }

    if (agent.ownerClerkUserId !== clerkUser._id) {
      return { success: false, error: 'Not authorized', hint: 'You do not own this agent' }
    }

    // Soft delete by revoking
    await ctx.db.patch(args.agentId, {
      revokedAt: Date.now(),
      updatedAt: Date.now(),
    })

    return { success: true, message: `Agent "${agent.name}" has been deleted` }
  },
})

// ============================================
// Mutations - Bot-initiated (via API key)
// ============================================

// Rate limit constants
const REGISTRATION_RATE_LIMIT = 10 // Max registrations per minute globally
const REGISTRATION_WINDOW_MS = 60_000 // 1 minute

// Self-register a new bot agent (bot calls this directly)
export const selfRegister = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Rate limit: Check global registration rate
    const oneMinuteAgo = Date.now() - REGISTRATION_WINDOW_MS
    const recentAgents = await ctx.db
      .query('botAgents')
      .withIndex('by_created_at', (q) => q.gte('createdAt', oneMinuteAgo))
      .collect()

    if (recentAgents.length >= REGISTRATION_RATE_LIMIT) {
      return {
        success: false,
        error: 'Rate limit exceeded',
        hint: 'Too many registrations. Please try again in a minute.',
        retry_after: 60,
      }
    }

    // Validate name
    if (!args.name || args.name.length < 2 || args.name.length > 50) {
      return {
        success: false,
        error: 'Invalid name',
        hint: 'Name must be 2-50 characters',
      }
    }

    // Generate API key
    const apiKey = generateApiKey()
    const apiKeyHash = simpleHash(apiKey)
    const apiKeyPrefix = apiKey.slice(0, 16) + '...'

    const now = Date.now()
    const agentId = await ctx.db.insert('botAgents', {
      name: args.name,
      description: args.description,
      apiKeyHash,
      apiKeyPrefix,
      status: 'verified', // All agents are treated equally
      voteCount: 0,
      createdAt: now,
      updatedAt: now,
    })

    return {
      success: true,
      agent: {
        id: agentId,
        name: args.name,
        api_key: apiKey, // Using snake_case for API consistency
      },
      important: '⚠️ SAVE YOUR API KEY! You will not see it again.',
    }
  },
})

// ============================================
// Queries - Bot API key validation
// ============================================

// Validate an API key and return the agent (internal use)
export const validateApiKey = query({
  args: {
    apiKey: v.string(),
  },
  handler: async (ctx, args) => {
    if (!args.apiKey.startsWith('clawdtm_sk_')) {
      return null
    }

    const apiKeyHash = simpleHash(args.apiKey)

    const agent = await ctx.db
      .query('botAgents')
      .withIndex('by_api_key_hash', (q) => q.eq('apiKeyHash', apiKeyHash))
      .unique()

    if (!agent || agent.revokedAt) {
      return null
    }

    return {
      id: agent._id,
      name: agent.name,
      ownerClerkUserId: agent.ownerClerkUserId,
    }
  },
})

// Get agent status (bot can check their own status)
export const getAgentStatus = query({
  args: {
    apiKey: v.string(),
  },
  handler: async (ctx, args) => {
    const apiKeyHash = simpleHash(args.apiKey)

    const agent = await ctx.db
      .query('botAgents')
      .withIndex('by_api_key_hash', (q) => q.eq('apiKeyHash', apiKeyHash))
      .unique()

    if (!agent) {
      return { success: false, error: 'Invalid API key' }
    }

    if (agent.revokedAt) {
      return { success: false, error: 'API key has been revoked' }
    }

    return {
      success: true,
      agent: {
        name: agent.name,
        description: agent.description,
        vote_count: agent.voteCount ?? 0,
        last_active: agent.lastActiveAt,
        created_at: agent.createdAt,
      },
    }
  },
})

// ============================================
// Internal Mutations (for voting system)
// ============================================

// Update agent's last active time and vote count
export const updateAgentActivity = internalMutation({
  args: {
    agentId: v.id('botAgents'),
    incrementVotes: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const agent = await ctx.db.get(args.agentId)
    if (!agent) return

    const updates: { lastActiveAt: number; voteCount?: number; updatedAt: number } = {
      lastActiveAt: Date.now(),
      updatedAt: Date.now(),
    }

    if (args.incrementVotes) {
      updates.voteCount = (agent.voteCount ?? 0) + 1
    }

    await ctx.db.patch(args.agentId, updates)
  },
})

// Keep claimAgent for backwards compatibility but deprecate it
// This prevents errors if old code tries to call it
export const claimAgent = mutation({
  args: {
    claimCode: v.string(),
    clerkId: v.string(),
  },
  handler: async () => {
    return {
      success: false,
      error: 'Agent verification has been removed',
      hint: 'All agents are now equal. No verification needed.',
    }
  },
})
