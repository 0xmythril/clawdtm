import { v } from 'convex/values'
import { internalMutation, internalQuery, mutation, query } from './_generated/server'

// ============================================
// Internal Mutations (called by webhook)
// ============================================

// Upsert a user from Clerk webhook
export const upsertFromClerk = internalMutation({
  args: {
    clerkId: v.string(),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('clerkUsers')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', args.clerkId))
      .unique()

    const now = Date.now()

    if (existing) {
      await ctx.db.patch(existing._id, {
        email: args.email,
        name: args.name,
        imageUrl: args.imageUrl,
        updatedAt: now,
      })
      return { id: existing._id, created: false }
    } else {
      const id = await ctx.db.insert('clerkUsers', {
        clerkId: args.clerkId,
        email: args.email,
        name: args.name,
        imageUrl: args.imageUrl,
        createdAt: now,
        updatedAt: now,
      })
      return { id, created: true }
    }
  },
})

// Delete a user by Clerk ID (soft delete not implemented, just removes)
export const deleteByClerkId = internalMutation({
  args: {
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query('clerkUsers')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', args.clerkId))
      .unique()

    if (user) {
      // Also delete their votes
      const votes = await ctx.db
        .query('cachedSkillVotes')
        .withIndex('by_human_user', (q) => q.eq('clerkUserId', user._id))
        .collect()

      for (const vote of votes) {
        await ctx.db.delete(vote._id)
      }

      await ctx.db.delete(user._id)
      return { deleted: true }
    }

    return { deleted: false }
  },
})

// ============================================
// Internal Queries
// ============================================

// Get user by Clerk ID (internal)
export const getByClerkIdInternal = internalQuery({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('clerkUsers')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', args.clerkId))
      .unique()
  },
})

// ============================================
// Public Queries
// ============================================

// Get user by Clerk ID (public)
export const getByClerkId = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('clerkUsers')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', args.clerkId))
      .unique()
  },
})

// Get or create user by Clerk ID (for frontend use)
// This ensures user exists in Convex even if webhook hasn't fired yet
export const ensureUser = internalMutation({
  args: {
    clerkId: v.string(),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('clerkUsers')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', args.clerkId))
      .unique()

    if (existing) {
      return existing
    }

    const now = Date.now()
    const id = await ctx.db.insert('clerkUsers', {
      clerkId: args.clerkId,
      email: args.email,
      name: args.name,
      imageUrl: args.imageUrl,
      createdAt: now,
      updatedAt: now,
    })

    return await ctx.db.get(id)
  },
})

// ============================================
// Display Name Functions
// ============================================

// Get user's display name
export const getDisplayName = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query('clerkUsers')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', args.clerkId))
      .unique()

    if (!user) {
      return null
    }

    return {
      displayName: user.displayName ?? null,
      name: user.name ?? null,
      hasDisplayName: !!user.displayName,
    }
  },
})

// Set user's display name
export const setDisplayName = mutation({
  args: {
    clerkId: v.string(),
    displayName: v.string(),
  },
  handler: async (ctx, args) => {
    // Validate display name
    const trimmed = args.displayName.trim()
    if (trimmed.length < 2) {
      throw new Error('Display name must be at least 2 characters')
    }
    if (trimmed.length > 50) {
      throw new Error('Display name must be 50 characters or less')
    }

    // Check for disallowed characters (basic sanitization)
    if (!/^[\w\s\-'.]+$/u.test(trimmed)) {
      throw new Error('Display name contains invalid characters')
    }

    const user = await ctx.db
      .query('clerkUsers')
      .withIndex('by_clerk_id', (q) => q.eq('clerkId', args.clerkId))
      .unique()

    if (!user) {
      // Create user if not exists
      const now = Date.now()
      await ctx.db.insert('clerkUsers', {
        clerkId: args.clerkId,
        displayName: trimmed,
        createdAt: now,
        updatedAt: now,
      })
    } else {
      await ctx.db.patch(user._id, {
        displayName: trimmed,
        updatedAt: Date.now(),
      })
    }

    return { success: true, displayName: trimmed }
  },
})
