import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { isHumanAdmin } from './admin'

// ============================================
// Public mutations
// ============================================

/**
 * Submit feedback (requires signed-in Clerk user)
 */
export const submitFeedback = mutation({
  args: {
    clerkId: v.string(),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    type: v.union(
      v.literal('bug'),
      v.literal('feature'),
      v.literal('security'),
      v.literal('general')
    ),
    subject: v.optional(v.string()),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    // Validate message length
    if (args.message.trim().length < 5) {
      throw new Error('Message must be at least 5 characters')
    }
    if (args.message.length > 5000) {
      throw new Error('Message must be under 5000 characters')
    }

    // Simple rate limiting: max 5 feedback per user per hour
    const oneHourAgo = Date.now() - 60 * 60 * 1000
    const recentFeedback = await ctx.db
      .query('feedback')
      .withIndex('by_user', (q) => q.eq('clerkUserId', args.clerkId))
      .filter((q) => q.gte(q.field('createdAt'), oneHourAgo))
      .collect()

    if (recentFeedback.length >= 5) {
      throw new Error('Rate limit exceeded. Please wait before submitting more feedback.')
    }

    return await ctx.db.insert('feedback', {
      clerkUserId: args.clerkId,
      submitterEmail: args.email,
      submitterName: args.name,
      type: args.type,
      subject: args.subject?.trim() || undefined,
      message: args.message.trim(),
      status: 'new',
      createdAt: Date.now(),
    })
  },
})

// ============================================
// Admin queries
// ============================================

/**
 * List feedback (admin only)
 */
export const listFeedback = query({
  args: {
    clerkId: v.string(),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
    statusFilter: v.optional(v.union(
      v.literal('new'),
      v.literal('reviewed'),
      v.literal('resolved'),
      v.literal('dismissed')
    )),
    typeFilter: v.optional(v.union(
      v.literal('bug'),
      v.literal('feature'),
      v.literal('security'),
      v.literal('general')
    )),
  },
  handler: async (ctx, args) => {
    // Check admin/moderator access
    const { isModerator } = await isHumanAdmin(ctx, args.clerkId)
    if (!isModerator) {
      return { items: [], total: 0 }
    }

    const limit = Math.min(args.limit ?? 25, 100)
    const offset = args.offset ?? 0

    const allItems = args.statusFilter
      ? await ctx.db
          .query('feedback')
          .withIndex('by_status', (q) => q.eq('status', args.statusFilter!))
          .order('desc')
          .collect()
      : await ctx.db
          .query('feedback')
          .withIndex('by_created')
          .order('desc')
          .collect()

    // Apply type filter in memory if needed
    const filtered = args.typeFilter
      ? allItems.filter((item) => item.type === args.typeFilter)
      : allItems

    const total = filtered.length
    const items = filtered.slice(offset, offset + limit)

    return { items, total }
  },
})

/**
 * Get feedback counts by status (admin only)
 */
export const getFeedbackCounts = query({
  args: {
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    const { isModerator } = await isHumanAdmin(ctx, args.clerkId)
    if (!isModerator) {
      return { new: 0, reviewed: 0, resolved: 0, dismissed: 0, total: 0 }
    }

    const all = await ctx.db.query('feedback').collect()

    const counts = { new: 0, reviewed: 0, resolved: 0, dismissed: 0, total: all.length }
    for (const item of all) {
      counts[item.status]++
    }
    return counts
  },
})

// ============================================
// Admin mutations
// ============================================

/**
 * Update feedback status (admin only)
 */
export const updateFeedbackStatus = mutation({
  args: {
    clerkId: v.string(),
    feedbackId: v.id('feedback'),
    status: v.union(
      v.literal('new'),
      v.literal('reviewed'),
      v.literal('resolved'),
      v.literal('dismissed')
    ),
    adminNote: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { isModerator } = await isHumanAdmin(ctx, args.clerkId)
    if (!isModerator) {
      throw new Error('Not authorized')
    }

    const feedback = await ctx.db.get(args.feedbackId)
    if (!feedback) {
      throw new Error('Feedback not found')
    }

    const updates: Record<string, unknown> = {
      status: args.status,
    }

    if (args.adminNote !== undefined) {
      updates.adminNote = args.adminNote
    }

    if (args.status === 'resolved' || args.status === 'dismissed') {
      updates.resolvedBy = args.clerkId
      updates.resolvedAt = Date.now()
    }

    await ctx.db.patch(args.feedbackId, updates)
  },
})
