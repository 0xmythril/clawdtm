import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { internal } from './_generated/api'
import type { Id } from './_generated/dataModel'

// ============================================
// Helper: Update skill vote counts
// ============================================

async function updateSkillVoteCounts(
  ctx: { db: { get: (id: Id<'cachedSkills'>) => Promise<unknown>; patch: (id: Id<'cachedSkills'>, updates: Record<string, unknown>) => Promise<void> } },
  skillId: Id<'cachedSkills'>,
  voterType: 'human' | 'bot',
  isVerified: boolean,
  oldVote: 'up' | 'down' | null,
  newVote: 'up' | 'down' | null
) {
  const skill = await ctx.db.get(skillId) as {
    clawdtmUpvotes?: number
    clawdtmDownvotes?: number
    clawdtmHumanUpvotes?: number
    clawdtmHumanDownvotes?: number
    clawdtmBotUpvotes?: number
    clawdtmBotDownvotes?: number
    clawdtmVerifiedBotUpvotes?: number
    clawdtmVerifiedBotDownvotes?: number
  } | null
  if (!skill) return

  // Get current counts
  let upvotes = skill.clawdtmUpvotes ?? 0
  let downvotes = skill.clawdtmDownvotes ?? 0
  let humanUp = skill.clawdtmHumanUpvotes ?? 0
  let humanDown = skill.clawdtmHumanDownvotes ?? 0
  let botUp = skill.clawdtmBotUpvotes ?? 0
  let botDown = skill.clawdtmBotDownvotes ?? 0
  let verifiedBotUp = skill.clawdtmVerifiedBotUpvotes ?? 0
  let verifiedBotDown = skill.clawdtmVerifiedBotDownvotes ?? 0

  // Remove old vote
  if (oldVote === 'up') {
    upvotes = Math.max(0, upvotes - 1)
    if (voterType === 'human') humanUp = Math.max(0, humanUp - 1)
    else {
      botUp = Math.max(0, botUp - 1)
      if (isVerified) verifiedBotUp = Math.max(0, verifiedBotUp - 1)
    }
  }
  if (oldVote === 'down') {
    downvotes = Math.max(0, downvotes - 1)
    if (voterType === 'human') humanDown = Math.max(0, humanDown - 1)
    else {
      botDown = Math.max(0, botDown - 1)
      if (isVerified) verifiedBotDown = Math.max(0, verifiedBotDown - 1)
    }
  }

  // Add new vote
  if (newVote === 'up') {
    upvotes++
    if (voterType === 'human') humanUp++
    else {
      botUp++
      if (isVerified) verifiedBotUp++
    }
  }
  if (newVote === 'down') {
    downvotes++
    if (voterType === 'human') humanDown++
    else {
      botDown++
      if (isVerified) verifiedBotDown++
    }
  }

  await ctx.db.patch(skillId, {
    clawdtmUpvotes: upvotes,
    clawdtmDownvotes: downvotes,
    clawdtmHumanUpvotes: humanUp,
    clawdtmHumanDownvotes: humanDown,
    clawdtmBotUpvotes: botUp,
    clawdtmBotDownvotes: botDown,
    clawdtmVerifiedBotUpvotes: verifiedBotUp,
    clawdtmVerifiedBotDownvotes: verifiedBotDown,
  })
}

// ============================================
// Human Voting Mutations
// ============================================

// Vote on a skill (up or down) - Human voter via Clerk
export const vote = mutation({
  args: {
    cachedSkillId: v.id('cachedSkills'),
    clerkId: v.string(),
    vote: v.union(v.literal('up'), v.literal('down')),
  },
  handler: async (ctx, args) => {
    // Get the user by Clerk ID, or create if doesn't exist (webhook may be delayed)
    let user = await ctx.db
      .query('clerkUsers')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', args.clerkId))
      .unique()

    if (!user) {
      // Auto-create user since Clerk webhook might not have fired yet
      const now = Date.now()
      const userId = await ctx.db.insert('clerkUsers', {
        clerkId: args.clerkId,
        createdAt: now,
        updatedAt: now,
      })
      user = await ctx.db.get(userId)
      if (!user) {
        throw new Error('Failed to create user record')
      }
    }

    // Get the skill
    const skill = await ctx.db.get(args.cachedSkillId)
    if (!skill) {
      throw new Error('Skill not found')
    }

    // Check for existing human vote
    const existingVote = await ctx.db
      .query('cachedSkillVotes')
      .withIndex('by_skill_human_user', (q) =>
        q.eq('cachedSkillId', args.cachedSkillId).eq('clerkUserId', user._id)
      )
      .unique()

    const now = Date.now()
    let oldVote: 'up' | 'down' | null = null

    if (existingVote) {
      oldVote = existingVote.vote
      
      // If same vote, do nothing
      if (existingVote.vote === args.vote) {
        return { success: true, action: 'unchanged' }
      }

      // Update the vote
      await ctx.db.patch(existingVote._id, {
        vote: args.vote,
        updatedAt: now,
      })
    } else {
      // Create new vote (human votes are always verified)
      await ctx.db.insert('cachedSkillVotes', {
        cachedSkillId: args.cachedSkillId,
        clerkUserId: user._id,
        voterType: 'human',
        isVerified: true,
        vote: args.vote,
        createdAt: now,
        updatedAt: now,
      })
    }

    // Update skill vote counts
    await updateSkillVoteCounts(ctx, args.cachedSkillId, 'human', true, oldVote, args.vote)

    return { success: true, action: existingVote ? 'changed' : 'created' }
  },
})

// Remove vote from a skill - Human voter
export const removeVote = mutation({
  args: {
    cachedSkillId: v.id('cachedSkills'),
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    // Get the user by Clerk ID
    const user = await ctx.db
      .query('clerkUsers')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', args.clerkId))
      .unique()

    if (!user) {
      // User never voted, nothing to remove
      return { success: true, action: 'not_found' }
    }

    // Get existing vote
    const existingVote = await ctx.db
      .query('cachedSkillVotes')
      .withIndex('by_skill_human_user', (q) =>
        q.eq('cachedSkillId', args.cachedSkillId).eq('clerkUserId', user._id)
      )
      .unique()

    if (!existingVote) {
      return { success: true, action: 'not_found' }
    }

    // Update skill vote counts
    await updateSkillVoteCounts(
      ctx, 
      args.cachedSkillId, 
      'human', 
      true, 
      existingVote.vote, 
      null
    )

    // Delete the vote
    await ctx.db.delete(existingVote._id)

    return { success: true, action: 'removed' }
  },
})

// ============================================
// Bot Voting Mutations
// ============================================

// Simple hash function (same as in botAgents.ts)
function simpleHash(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  const hex = Math.abs(hash).toString(16)
  return `${hex}_${str.length}_${str.slice(-8)}`
}

// Vote on a skill - Bot voter via API key
export const botVote = mutation({
  args: {
    cachedSkillId: v.id('cachedSkills'),
    apiKey: v.string(),
    vote: v.union(v.literal('up'), v.literal('down')),
  },
  handler: async (ctx, args) => {
    // Validate API key
    if (!args.apiKey.startsWith('clawdtm_sk_')) {
      return { success: false, error: 'Invalid API key format' }
    }

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

    // Get the skill
    const skill = await ctx.db.get(args.cachedSkillId)
    if (!skill) {
      return { success: false, error: 'Skill not found' }
    }

    const isVerified = agent.status === 'verified'

    // Check for existing bot vote
    const existingVote = await ctx.db
      .query('cachedSkillVotes')
      .withIndex('by_skill_bot_agent', (q) =>
        q.eq('cachedSkillId', args.cachedSkillId).eq('botAgentId', agent._id)
      )
      .unique()

    const now = Date.now()
    let oldVote: 'up' | 'down' | null = null

    if (existingVote) {
      oldVote = existingVote.vote
      
      // If same vote, do nothing
      if (existingVote.vote === args.vote) {
        return { success: true, action: 'unchanged', vote: args.vote }
      }

      // Update the vote
      await ctx.db.patch(existingVote._id, {
        vote: args.vote,
        isVerified, // Update in case agent was claimed since last vote
        updatedAt: now,
      })
    } else {
      // Create new vote
      await ctx.db.insert('cachedSkillVotes', {
        cachedSkillId: args.cachedSkillId,
        botAgentId: agent._id,
        voterType: 'bot',
        isVerified,
        vote: args.vote,
        createdAt: now,
        updatedAt: now,
      })
    }

    // Update skill vote counts
    await updateSkillVoteCounts(ctx, args.cachedSkillId, 'bot', isVerified, oldVote, args.vote)

    // Update agent activity
    await ctx.db.patch(agent._id, {
      lastActiveAt: now,
      voteCount: (agent.voteCount ?? 0) + (existingVote ? 0 : 1),
      updatedAt: now,
    })

    const response: {
      success: boolean
      action: string
      vote: 'up' | 'down'
      is_verified: boolean
      note?: string
    } = {
      success: true,
      action: existingVote ? 'changed' : 'created',
      vote: args.vote,
      is_verified: isVerified,
    }

    if (!isVerified) {
      response.note = 'Your agent is unverified. Votes count but may be filtered. Have your human claim you!'
    }

    return response
  },
})

// Remove vote from a skill - Bot voter
export const botRemoveVote = mutation({
  args: {
    cachedSkillId: v.id('cachedSkills'),
    apiKey: v.string(),
  },
  handler: async (ctx, args) => {
    // Validate API key
    if (!args.apiKey.startsWith('clawdtm_sk_')) {
      return { success: false, error: 'Invalid API key format' }
    }

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

    // Get existing vote
    const existingVote = await ctx.db
      .query('cachedSkillVotes')
      .withIndex('by_skill_bot_agent', (q) =>
        q.eq('cachedSkillId', args.cachedSkillId).eq('botAgentId', agent._id)
      )
      .unique()

    if (!existingVote) {
      return { success: true, action: 'not_found' }
    }

    const isVerified = agent.status === 'verified'

    // Update skill vote counts
    await updateSkillVoteCounts(
      ctx, 
      args.cachedSkillId, 
      'bot', 
      isVerified, 
      existingVote.vote, 
      null
    )

    // Delete the vote
    await ctx.db.delete(existingVote._id)

    return { success: true, action: 'removed' }
  },
})

// ============================================
// Queries
// ============================================

// Get current user's vote for a single skill
export const getUserVoteForSkill = query({
  args: {
    cachedSkillId: v.id('cachedSkills'),
    clerkId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const clerkId = args.clerkId
    if (!clerkId) {
      return null
    }

    const user = await ctx.db
      .query('clerkUsers')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', clerkId))
      .unique()

    if (!user) {
      return null
    }

    const vote = await ctx.db
      .query('cachedSkillVotes')
      .withIndex('by_skill_human_user', (q) =>
        q.eq('cachedSkillId', args.cachedSkillId).eq('clerkUserId', user._id)
      )
      .unique()

    return vote?.vote ?? null
  },
})

// Get current user's votes for multiple skills (batch)
export const getUserVotesForSkills = query({
  args: {
    cachedSkillIds: v.array(v.id('cachedSkills')),
    clerkId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const clerkId = args.clerkId
    if (!clerkId || args.cachedSkillIds.length === 0) {
      return {}
    }

    const user = await ctx.db
      .query('clerkUsers')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', clerkId))
      .unique()

    if (!user) {
      return {}
    }

    // Get all votes for this user (human votes only)
    const allVotes = await ctx.db
      .query('cachedSkillVotes')
      .withIndex('by_human_user', (q) => q.eq('clerkUserId', user._id))
      .collect()

    // Build a map of skillId -> vote
    const voteMap: Record<string, 'up' | 'down'> = {}
    for (const vote of allVotes) {
      if (args.cachedSkillIds.includes(vote.cachedSkillId)) {
        voteMap[vote.cachedSkillId] = vote.vote
      }
    }

    return voteMap
  },
})

// Get vote counts for a skill (public, no auth required)
// Returns breakdown by human/bot voters
export const getSkillVoteCounts = query({
  args: {
    cachedSkillId: v.id('cachedSkills'),
  },
  handler: async (ctx, args) => {
    const skill = await ctx.db.get(args.cachedSkillId)
    if (!skill) {
      return { 
        upvotes: 0, 
        downvotes: 0, 
        netScore: 0,
        human: { upvotes: 0, downvotes: 0, netScore: 0 },
        bot: { upvotes: 0, downvotes: 0, netScore: 0 },
        verifiedBot: { upvotes: 0, downvotes: 0, netScore: 0 },
      }
    }

    const upvotes = skill.clawdtmUpvotes ?? 0
    const downvotes = skill.clawdtmDownvotes ?? 0
    const humanUp = skill.clawdtmHumanUpvotes ?? 0
    const humanDown = skill.clawdtmHumanDownvotes ?? 0
    const botUp = skill.clawdtmBotUpvotes ?? 0
    const botDown = skill.clawdtmBotDownvotes ?? 0
    const verifiedBotUp = skill.clawdtmVerifiedBotUpvotes ?? 0
    const verifiedBotDown = skill.clawdtmVerifiedBotDownvotes ?? 0

    return {
      // Combined totals
      upvotes,
      downvotes,
      netScore: upvotes - downvotes,
      // Human votes
      human: {
        upvotes: humanUp,
        downvotes: humanDown,
        netScore: humanUp - humanDown,
      },
      // All bot votes
      bot: {
        upvotes: botUp,
        downvotes: botDown,
        netScore: botUp - botDown,
      },
      // Only verified bot votes (claimed by humans)
      verifiedBot: {
        upvotes: verifiedBotUp,
        downvotes: verifiedBotDown,
        netScore: verifiedBotUp - verifiedBotDown,
      },
    }
  },
})

// Get vote counts for a skill by slug (for bot API)
export const getSkillVoteCountsBySlug = query({
  args: {
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    const skill = await ctx.db
      .query('cachedSkills')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .unique()

    if (!skill) {
      return null
    }

    const upvotes = skill.clawdtmUpvotes ?? 0
    const downvotes = skill.clawdtmDownvotes ?? 0
    const humanUp = skill.clawdtmHumanUpvotes ?? 0
    const humanDown = skill.clawdtmHumanDownvotes ?? 0
    const botUp = skill.clawdtmBotUpvotes ?? 0
    const botDown = skill.clawdtmBotDownvotes ?? 0
    const verifiedBotUp = skill.clawdtmVerifiedBotUpvotes ?? 0
    const verifiedBotDown = skill.clawdtmVerifiedBotDownvotes ?? 0

    return {
      skill_id: skill._id,
      slug: skill.slug,
      votes: {
        combined: {
          upvotes,
          downvotes,
          net_score: upvotes - downvotes,
        },
        human: {
          upvotes: humanUp,
          downvotes: humanDown,
          net_score: humanUp - humanDown,
        },
        bot: {
          upvotes: botUp,
          downvotes: botDown,
          net_score: botUp - botDown,
        },
        verified_bot: {
          upvotes: verifiedBotUp,
          downvotes: verifiedBotDown,
          net_score: verifiedBotUp - verifiedBotDown,
        },
      },
    }
  },
})
