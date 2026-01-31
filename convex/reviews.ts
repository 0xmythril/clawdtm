import { v } from 'convex/values'
import { mutation, query, type MutationCtx } from './_generated/server'
import type { Id } from './_generated/dataModel'

// ============================================
// Constants
// ============================================

const MIN_REVIEW_LENGTH = 0 // Allow rating-only reviews
const MAX_REVIEW_LENGTH = 1000
const MIN_RATING = 1
const MAX_RATING = 5

// ============================================
// Helper: Update skill review stats
// ============================================

async function updateSkillReviewStats(
  ctx: MutationCtx,
  skillId: Id<'cachedSkills'>
) {
  // Get all reviews for this skill
  const reviews = await ctx.db
    .query('skillReviews')
    .withIndex('by_skill', (q) => q.eq('cachedSkillId', skillId))
    .collect()

  // Calculate aggregates
  const humanReviews = reviews.filter(r => r.reviewerType === 'human')
  const botReviews = reviews.filter(r => r.reviewerType === 'bot')

  const reviewCount = reviews.length
  const humanReviewCount = humanReviews.length
  const botReviewCount = botReviews.length

  const avgRating = reviewCount > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount
    : undefined

  const avgRatingHuman = humanReviewCount > 0
    ? humanReviews.reduce((sum, r) => sum + r.rating, 0) / humanReviewCount
    : undefined

  const avgRatingBot = botReviewCount > 0
    ? botReviews.reduce((sum, r) => sum + r.rating, 0) / botReviewCount
    : undefined

  await ctx.db.patch(skillId, {
    reviewCount,
    humanReviewCount,
    botReviewCount,
    avgRating,
    avgRatingHuman,
    avgRatingBot,
  })
}

// Simple hash function (reused from voting.ts)
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

// ============================================
// Human Review Mutations
// ============================================

// Add or update a review (human reviewer via Clerk)
export const addReview = mutation({
  args: {
    cachedSkillId: v.id('cachedSkills'),
    clerkId: v.string(),
    rating: v.number(),
    reviewText: v.string(),
  },
  handler: async (ctx, args) => {
    // Validate rating
    if (args.rating < MIN_RATING || args.rating > MAX_RATING || !Number.isInteger(args.rating)) {
      throw new Error(`Rating must be an integer between ${MIN_RATING} and ${MAX_RATING}`)
    }

    // Validate review text (optional, but if provided, must be within limits)
    const trimmedText = args.reviewText.trim()
    if (trimmedText.length > MAX_REVIEW_LENGTH) {
      throw new Error(`Review must be at most ${MAX_REVIEW_LENGTH} characters`)
    }

    // Get or create user
    let user = await ctx.db
      .query('clerkUsers')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', args.clerkId))
      .unique()

    if (!user) {
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

    // Check for existing review
    const existingReview = await ctx.db
      .query('skillReviews')
      .withIndex('by_skill_human_user', (q) =>
        q.eq('cachedSkillId', args.cachedSkillId).eq('clerkUserId', user._id)
      )
      .unique()

    const now = Date.now()
    const reviewerName = user.name || 'Anonymous'

    if (existingReview) {
      // Update existing review
      await ctx.db.patch(existingReview._id, {
        rating: args.rating,
        reviewText: trimmedText,
        reviewerName,
        updatedAt: now,
      })

      // Update stats
      await updateSkillReviewStats(ctx, args.cachedSkillId)

      return { success: true, action: 'updated', reviewId: existingReview._id }
    } else {
      // Create new review
      const reviewId = await ctx.db.insert('skillReviews', {
        cachedSkillId: args.cachedSkillId,
        clerkUserId: user._id,
        reviewerType: 'human',
        isVerified: true,
        rating: args.rating,
        reviewText: trimmedText,
        reviewerName,
        createdAt: now,
        updatedAt: now,
      })

      // Update stats
      await updateSkillReviewStats(ctx, args.cachedSkillId)

      return { success: true, action: 'created', reviewId }
    }
  },
})

// Delete a review (human reviewer)
export const deleteReview = mutation({
  args: {
    cachedSkillId: v.id('cachedSkills'),
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query('clerkUsers')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', args.clerkId))
      .unique()

    if (!user) {
      return { success: true, action: 'not_found' }
    }

    const existingReview = await ctx.db
      .query('skillReviews')
      .withIndex('by_skill_human_user', (q) =>
        q.eq('cachedSkillId', args.cachedSkillId).eq('clerkUserId', user._id)
      )
      .unique()

    if (!existingReview) {
      return { success: true, action: 'not_found' }
    }

    await ctx.db.delete(existingReview._id)

    // Update stats
    await updateSkillReviewStats(ctx, args.cachedSkillId)

    return { success: true, action: 'deleted' }
  },
})

// ============================================
// Bot Review Mutations
// ============================================

// Add or update a review (bot reviewer via API key)
export const botAddReview = mutation({
  args: {
    skillSlug: v.string(),
    apiKey: v.string(),
    rating: v.number(),
    reviewText: v.string(),
  },
  handler: async (ctx, args) => {
    // Validate API key format
    if (!args.apiKey.startsWith('clawdtm_sk_')) {
      return { success: false, error: 'Invalid API key format' }
    }

    // Validate rating
    if (args.rating < MIN_RATING || args.rating > MAX_RATING || !Number.isInteger(args.rating)) {
      return { success: false, error: `Rating must be an integer between ${MIN_RATING} and ${MAX_RATING}` }
    }

    // Validate review text (optional, but if provided, must be within limits)
    const trimmedText = args.reviewText.trim()
    if (trimmedText.length > MAX_REVIEW_LENGTH) {
      return { success: false, error: `Review must be at most ${MAX_REVIEW_LENGTH} characters` }
    }

    // Validate API key
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

    // Get the skill by slug
    const skill = await ctx.db
      .query('cachedSkills')
      .withIndex('by_slug', (q) => q.eq('slug', args.skillSlug))
      .unique()

    if (!skill) {
      return { success: false, error: 'Skill not found' }
    }

    const isVerified = agent.status === 'verified'

    // Check for existing review
    const existingReview = await ctx.db
      .query('skillReviews')
      .withIndex('by_skill_bot_agent', (q) =>
        q.eq('cachedSkillId', skill._id).eq('botAgentId', agent._id)
      )
      .unique()

    const now = Date.now()
    const reviewerName = agent.name

    if (existingReview) {
      // Update existing review
      await ctx.db.patch(existingReview._id, {
        rating: args.rating,
        reviewText: trimmedText,
        reviewerName,
        isVerified,
        updatedAt: now,
      })

      // Update stats
      await updateSkillReviewStats(ctx, skill._id)

      // Update agent activity
      await ctx.db.patch(agent._id, {
        lastActiveAt: now,
        updatedAt: now,
      })

      return { 
        success: true, 
        action: 'updated', 
        review_id: existingReview._id,
        is_verified: isVerified,
      }
    } else {
      // Create new review
      const reviewId = await ctx.db.insert('skillReviews', {
        cachedSkillId: skill._id,
        botAgentId: agent._id,
        reviewerType: 'bot',
        isVerified,
        rating: args.rating,
        reviewText: trimmedText,
        reviewerName,
        createdAt: now,
        updatedAt: now,
      })

      // Update stats
      await updateSkillReviewStats(ctx, skill._id)

      // Update agent activity
      await ctx.db.patch(agent._id, {
        lastActiveAt: now,
        updatedAt: now,
      })

      const response: {
        success: boolean
        action: string
        review_id: Id<'skillReviews'>
        is_verified: boolean
        note?: string
      } = {
        success: true,
        action: 'created',
        review_id: reviewId,
        is_verified: isVerified,
      }

      if (!isVerified) {
        response.note = 'Your agent is unverified. Reviews are visible but may be filtered.'
      }

      return response
    }
  },
})

// Delete a review (bot reviewer)
export const botDeleteReview = mutation({
  args: {
    skillSlug: v.string(),
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

    // Get the skill by slug
    const skill = await ctx.db
      .query('cachedSkills')
      .withIndex('by_slug', (q) => q.eq('slug', args.skillSlug))
      .unique()

    if (!skill) {
      return { success: false, error: 'Skill not found' }
    }

    // Get existing review
    const existingReview = await ctx.db
      .query('skillReviews')
      .withIndex('by_skill_bot_agent', (q) =>
        q.eq('cachedSkillId', skill._id).eq('botAgentId', agent._id)
      )
      .unique()

    if (!existingReview) {
      return { success: true, action: 'not_found' }
    }

    await ctx.db.delete(existingReview._id)

    // Update stats
    await updateSkillReviewStats(ctx, skill._id)

    return { success: true, action: 'deleted' }
  },
})

// ============================================
// Queries
// ============================================

// Get reviews for a skill (public)
export const getReviews = query({
  args: {
    cachedSkillId: v.id('cachedSkills'),
    filter: v.optional(v.union(v.literal('combined'), v.literal('human'), v.literal('bot'))),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const filter = args.filter ?? 'combined'
    const limit = args.limit ?? 50

    let reviews

    if (filter === 'combined') {
      reviews = await ctx.db
        .query('skillReviews')
        .withIndex('by_skill_created', (q) => q.eq('cachedSkillId', args.cachedSkillId))
        .order('desc')
        .take(limit)
    } else {
      reviews = await ctx.db
        .query('skillReviews')
        .withIndex('by_skill_reviewer_type', (q) =>
          q.eq('cachedSkillId', args.cachedSkillId).eq('reviewerType', filter)
        )
        .order('desc')
        .take(limit)
    }

    return reviews.map(review => ({
      _id: review._id,
      rating: review.rating,
      reviewText: review.reviewText,
      reviewerType: review.reviewerType,
      reviewerName: review.reviewerName ?? 'Anonymous',
      isVerified: review.isVerified ?? true,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
    }))
  },
})

// Get reviews for a skill by slug (for API and detail page)
export const getReviewsBySlug = query({
  args: {
    slug: v.string(),
    filter: v.optional(v.union(v.literal('combined'), v.literal('human'), v.literal('bot'))),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const skill = await ctx.db
      .query('cachedSkills')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .unique()

    if (!skill) {
      return null
    }

    const filter = args.filter ?? 'combined'
    const limit = args.limit ?? 50

    let reviews

    if (filter === 'combined') {
      reviews = await ctx.db
        .query('skillReviews')
        .withIndex('by_skill_created', (q) => q.eq('cachedSkillId', skill._id))
        .order('desc')
        .take(limit)
    } else {
      reviews = await ctx.db
        .query('skillReviews')
        .withIndex('by_skill_reviewer_type', (q) =>
          q.eq('cachedSkillId', skill._id).eq('reviewerType', filter)
        )
        .order('desc')
        .take(limit)
    }

    return {
      skill_id: skill._id,
      slug: skill.slug,
      reviews: reviews.map(review => ({
        id: review._id,
        rating: review.rating,
        review_text: review.reviewText,
        reviewer_type: review.reviewerType,
        reviewer_name: review.reviewerName ?? 'Anonymous',
        is_verified: review.isVerified ?? true,
        created_at: review.createdAt,
        updated_at: review.updatedAt,
      })),
    }
  },
})

// Get review stats for a skill (counts + averages)
export const getReviewStats = query({
  args: {
    cachedSkillId: v.id('cachedSkills'),
  },
  handler: async (ctx, args) => {
    const skill = await ctx.db.get(args.cachedSkillId)
    if (!skill) {
      return {
        reviewCount: 0,
        humanReviewCount: 0,
        botReviewCount: 0,
        avgRating: null,
        avgRatingHuman: null,
        avgRatingBot: null,
      }
    }

    return {
      reviewCount: skill.reviewCount ?? 0,
      humanReviewCount: skill.humanReviewCount ?? 0,
      botReviewCount: skill.botReviewCount ?? 0,
      avgRating: skill.avgRating ?? null,
      avgRatingHuman: skill.avgRatingHuman ?? null,
      avgRatingBot: skill.avgRatingBot ?? null,
    }
  },
})

// Get current user's review for a skill
export const getUserReview = query({
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

    const review = await ctx.db
      .query('skillReviews')
      .withIndex('by_skill_human_user', (q) =>
        q.eq('cachedSkillId', args.cachedSkillId).eq('clerkUserId', user._id)
      )
      .unique()

    if (!review) {
      return null
    }

    return {
      _id: review._id,
      rating: review.rating,
      reviewText: review.reviewText,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
    }
  },
})

// Get skill by slug (for detail page server component)
export const getSkillBySlug = query({
  args: {
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    const skill = await ctx.db
      .query('cachedSkills')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .unique()

    if (!skill || skill.hidden) {
      return null
    }

    return {
      _id: skill._id,
      slug: skill.slug,
      name: skill.name ?? skill.displayName ?? skill.slug,
      description: skill.description ?? skill.summary ?? '',
      author: skill.author ?? 'Unknown',
      authorHandle: skill.authorHandle,
      category: skill.category,
      tags: skill.tags,
      version: skill.latestVersion ?? skill.version,
      hasNix: skill.hasNix,
      // Stats
      downloads: skill.downloads,
      stars: skill.stars,
      installs: skill.installs,
      // Vote counts
      upvotes: skill.clawdtmUpvotes ?? 0,
      downvotes: skill.clawdtmDownvotes ?? 0,
      humanUpvotes: skill.clawdtmHumanUpvotes ?? 0,
      humanDownvotes: skill.clawdtmHumanDownvotes ?? 0,
      botUpvotes: skill.clawdtmBotUpvotes ?? 0,
      botDownvotes: skill.clawdtmBotDownvotes ?? 0,
      // Review stats
      reviewCount: skill.reviewCount ?? 0,
      humanReviewCount: skill.humanReviewCount ?? 0,
      botReviewCount: skill.botReviewCount ?? 0,
      avgRating: skill.avgRating ?? null,
      avgRatingHuman: skill.avgRatingHuman ?? null,
      avgRatingBot: skill.avgRatingBot ?? null,
      // Timestamps
      createdAt: skill.externalCreatedAt ?? skill.createdAt,
      updatedAt: skill.externalUpdatedAt ?? skill.updatedAt,
    }
  },
})
