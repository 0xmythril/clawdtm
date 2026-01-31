import { v } from 'convex/values'
import { mutation, query, internalMutation } from './_generated/server'
import type { Id } from './_generated/dataModel'

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

// Generate a claim code (e.g., "CLAIM-7X9K")
function generateClaimCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Avoid confusing chars like 0/O, 1/I
  let code = 'CLAIM-'
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
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

// Create a new bot agent (human creates via UI - verified from start)
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
      status: 'verified',
      voteCount: 0,
      createdAt: now,
      updatedAt: now,
    })

    return {
      success: true,
      agent: {
        id: agentId,
        name: args.name,
        status: 'verified',
        apiKey, // Only returned once!
        apiKeyPrefix,
      },
      important: '⚠️ SAVE YOUR API KEY! You will not see it again.',
    }
  },
})

// Claim a self-registered bot agent
export const claimAgent = mutation({
  args: {
    claimCode: v.string(),
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

    // Find agent by claim code
    const agent = await ctx.db
      .query('botAgents')
      .withIndex('by_claim_code', (q) => q.eq('claimCode', args.claimCode.toUpperCase()))
      .unique()

    if (!agent) {
      return { success: false, error: 'Invalid claim code', hint: 'Check the code your agent gave you' }
    }

    if (agent.status === 'verified') {
      return { success: false, error: 'Agent already claimed', hint: 'This agent is already verified' }
    }

    if (agent.revokedAt) {
      return { success: false, error: 'Agent has been revoked', hint: 'This agent access was revoked' }
    }

    // Claim the agent
    await ctx.db.patch(agent._id, {
      ownerClerkUserId: clerkUser._id,
      status: 'verified',
      claimCode: undefined, // Clear claim code
      updatedAt: Date.now(),
    })

    // Update any existing votes from this bot to be verified
    const votes = await ctx.db
      .query('cachedSkillVotes')
      .withIndex('by_bot_agent', (q) => q.eq('botAgentId', agent._id))
      .collect()

    for (const vote of votes) {
      await ctx.db.patch(vote._id, { isVerified: true })
    }

    return {
      success: true,
      agent: {
        id: agent._id,
        name: agent.name,
        status: 'verified',
      },
      message: `Successfully claimed "${agent.name}"! Its votes are now verified.`,
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
        status: a.status,
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

// Self-register a new bot agent (bot calls this directly)
export const selfRegister = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Validate name
    if (!args.name || args.name.length < 2 || args.name.length > 50) {
      return {
        success: false,
        error: 'Invalid name',
        hint: 'Name must be 2-50 characters',
      }
    }

    // Generate API key and claim code
    const apiKey = generateApiKey()
    const apiKeyHash = simpleHash(apiKey)
    const apiKeyPrefix = apiKey.slice(0, 16) + '...'
    const claimCode = generateClaimCode()

    const now = Date.now()
    const agentId = await ctx.db.insert('botAgents', {
      name: args.name,
      description: args.description,
      apiKeyHash,
      apiKeyPrefix,
      claimCode,
      status: 'unverified',
      voteCount: 0,
      createdAt: now,
      updatedAt: now,
    })

    return {
      success: true,
      agent: {
        id: agentId,
        name: args.name,
        status: 'unverified',
        api_key: apiKey, // Using snake_case for API consistency
        claim_code: claimCode,
      },
      important: '⚠️ SAVE YOUR API KEY! You will not see it again.',
      hint: `To verify your agent, have your human log in to ClawdTM and enter claim code: ${claimCode}`,
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
      status: agent.status,
      isVerified: agent.status === 'verified',
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
        status: agent.status,
        is_verified: agent.status === 'verified',
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
