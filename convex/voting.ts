import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

// ============================================
// Mutations (require authentication)
// ============================================

// Vote on a skill (up or down)
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

    // Check for existing vote
    const existingVote = await ctx.db
      .query('cachedSkillVotes')
      .withIndex('by_skill_user', (q) =>
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
      // Create new vote
      await ctx.db.insert('cachedSkillVotes', {
        cachedSkillId: args.cachedSkillId,
        clerkUserId: user._id,
        vote: args.vote,
        createdAt: now,
        updatedAt: now,
      })
    }

    // Update skill vote counts
    let upvotes = skill.clawdtmUpvotes ?? 0
    let downvotes = skill.clawdtmDownvotes ?? 0

    // Adjust for old vote if changing
    if (oldVote === 'up') upvotes--
    if (oldVote === 'down') downvotes--

    // Apply new vote
    if (args.vote === 'up') upvotes++
    if (args.vote === 'down') downvotes++

    await ctx.db.patch(args.cachedSkillId, {
      clawdtmUpvotes: upvotes,
      clawdtmDownvotes: downvotes,
    })

    return { success: true, action: existingVote ? 'changed' : 'created' }
  },
})

// Remove vote from a skill
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
      .withIndex('by_skill_user', (q) =>
        q.eq('cachedSkillId', args.cachedSkillId).eq('clerkUserId', user._id)
      )
      .unique()

    if (!existingVote) {
      return { success: true, action: 'not_found' }
    }

    // Get the skill and update counts
    const skill = await ctx.db.get(args.cachedSkillId)
    if (skill) {
      let upvotes = skill.clawdtmUpvotes ?? 0
      let downvotes = skill.clawdtmDownvotes ?? 0

      if (existingVote.vote === 'up') upvotes = Math.max(0, upvotes - 1)
      if (existingVote.vote === 'down') downvotes = Math.max(0, downvotes - 1)

      await ctx.db.patch(args.cachedSkillId, {
        clawdtmUpvotes: upvotes,
        clawdtmDownvotes: downvotes,
      })
    }

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
      .withIndex('by_skill_user', (q) =>
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

    // Get all votes for this user
    const allVotes = await ctx.db
      .query('cachedSkillVotes')
      .withIndex('by_user', (q) => q.eq('clerkUserId', user._id))
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
export const getSkillVoteCounts = query({
  args: {
    cachedSkillId: v.id('cachedSkills'),
  },
  handler: async (ctx, args) => {
    const skill = await ctx.db.get(args.cachedSkillId)
    if (!skill) {
      return { upvotes: 0, downvotes: 0, netScore: 0 }
    }

    const upvotes = skill.clawdtmUpvotes ?? 0
    const downvotes = skill.clawdtmDownvotes ?? 0

    return {
      upvotes,
      downvotes,
      netScore: upvotes - downvotes,
    }
  },
})
