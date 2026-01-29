import { v } from 'convex/values'
import { action, mutation, query, internalAction, internalMutation, internalQuery } from './_generated/server'
import { internal } from './_generated/api'

const CLAWDHUB_API = 'https://clawdhub.com/api/v1'
const BATCH_SIZE = 50
const MAX_RETRIES = 3
const RETRY_DELAY_MS = 1000

// ============================================
// Internal Queries
// ============================================

export const getSyncState = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query('clawdhubSyncState')
      .withIndex('by_key', (q) => q.eq('key', 'skills'))
      .unique()
  },
})

export const getCachedSkillByExternalId = internalQuery({
  args: { externalId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('cachedSkills')
      .withIndex('by_external_id', (q) => q.eq('externalId', args.externalId))
      .unique()
  },
})

// ============================================
// Internal Mutations
// ============================================

export const initSyncState = internalMutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db
      .query('clawdhubSyncState')
      .withIndex('by_key', (q) => q.eq('key', 'skills'))
      .unique()
    
    if (!existing) {
      await ctx.db.insert('clawdhubSyncState', {
        key: 'skills',
        cursor: undefined,
        lastFullSyncAt: undefined,
        lastIncrementalSyncAt: undefined,
        totalSynced: 0,
        status: 'idle',
        lastError: undefined,
        updatedAt: Date.now(),
      })
    }
  },
})

export const updateSyncState = internalMutation({
  args: {
    cursor: v.optional(v.string()),
    status: v.union(v.literal('idle'), v.literal('running'), v.literal('error')),
    lastError: v.optional(v.string()),
    incrementTotal: v.optional(v.number()),
    markFullSync: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const state = await ctx.db
      .query('clawdhubSyncState')
      .withIndex('by_key', (q) => q.eq('key', 'skills'))
      .unique()
    
    if (!state) {
      throw new Error('Sync state not initialized')
    }
    
    const updates: Partial<typeof state> = {
      status: args.status,
      updatedAt: Date.now(),
    }
    
    if (args.cursor !== undefined) {
      updates.cursor = args.cursor
    }
    if (args.lastError !== undefined) {
      updates.lastError = args.lastError
    }
    if (args.incrementTotal) {
      updates.totalSynced = state.totalSynced + args.incrementTotal
    }
    if (args.markFullSync) {
      updates.lastFullSyncAt = Date.now()
      updates.cursor = undefined // Reset cursor after full sync
    }
    
    await ctx.db.patch(state._id, updates)
  },
})

export const upsertCachedSkill = internalMutation({
  args: {
    externalId: v.optional(v.string()),
    slug: v.string(),
    name: v.optional(v.string()),
    displayName: v.optional(v.string()),
    description: v.optional(v.string()),
    summary: v.optional(v.string()),
    author: v.optional(v.string()),
    authorHandle: v.optional(v.string()),
    downloads: v.number(),
    stars: v.number(),
    installs: v.number(),
    tags: v.optional(v.any()),
    category: v.optional(v.string()),
    version: v.optional(v.string()),
    externalCreatedAt: v.optional(v.number()),
    externalUpdatedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Try to find by slug first (more reliable)
    const existing = await ctx.db
      .query('cachedSkills')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .unique()
    
    const now = Date.now()
    
    if (existing) {
      // Check if data actually changed to avoid unnecessary writes
      const hasChanges = 
        existing.externalId !== args.externalId ||
        existing.name !== args.name ||
        existing.displayName !== args.displayName ||
        existing.description !== args.description ||
        existing.summary !== args.summary ||
        existing.author !== args.author ||
        existing.authorHandle !== args.authorHandle ||
        existing.downloads !== args.downloads ||
        existing.stars !== args.stars ||
        existing.installs !== args.installs ||
        JSON.stringify(existing.tags) !== JSON.stringify(args.tags) ||
        existing.category !== args.category ||
        existing.version !== args.version ||
        existing.externalCreatedAt !== args.externalCreatedAt ||
        existing.externalUpdatedAt !== args.externalUpdatedAt
      
      // Only update if something changed
      if (hasChanges) {
        await ctx.db.patch(existing._id, {
          externalId: args.externalId,
          name: args.name,
          displayName: args.displayName,
          description: args.description,
          summary: args.summary,
          author: args.author,
          authorHandle: args.authorHandle,
          downloads: args.downloads,
          stars: args.stars,
          installs: args.installs,
          tags: args.tags,
          category: args.category,
          version: args.version,
          externalCreatedAt: args.externalCreatedAt,
          externalUpdatedAt: args.externalUpdatedAt,
          lastSyncedAt: now,
        })
        return { updated: true, id: existing._id, changed: true }
      } else {
        // Data unchanged, just update lastSyncedAt (but less frequently)
        // Only update lastSyncedAt if it's been more than 1 hour since last sync
        const oneHourAgo = now - (60 * 60 * 1000)
        if (!existing.lastSyncedAt || existing.lastSyncedAt < oneHourAgo) {
          await ctx.db.patch(existing._id, {
            lastSyncedAt: now,
          })
          return { updated: true, id: existing._id, changed: false }
        }
        return { updated: false, id: existing._id, changed: false }
      }
    } else {
      const id = await ctx.db.insert('cachedSkills', {
        ...args,
        lastSyncedAt: now,
      })
      return { updated: false, id }
    }
  },
})

// Internal mutation to update cached counts (reduces full table scans)
export const updateCachedCounts = internalMutation({
  args: {},
  handler: async (ctx) => {
    const allSkills = await ctx.db.query('cachedSkills').collect()
    const skills = allSkills.filter(s => !s.hidden)
    
    // Build category counts
    const categoryCounts: Record<string, number> = {}
    for (const skill of skills) {
      const cat = skill.category ?? 'uncategorized'
      categoryCounts[cat] = (categoryCounts[cat] ?? 0) + 1
    }
    
    // Build tag counts with validation
    const EXCLUDED_TAGS = new Set(['latest', 'stable', 'beta', 'alpha', 'dev', 'main', 'master'])
    const isVersionTag = (tag: string) => /^v?\d+\.\d+(\.\d+)?(-.*)?$/.test(tag)
    const isValidTag = (tag: string) => {
      if (!tag || typeof tag !== 'string') return false
      const normalized = tag.toLowerCase().trim()
      if (normalized.length < 2 || normalized.length > 30) return false
      if (EXCLUDED_TAGS.has(normalized)) return false
      if (isVersionTag(normalized)) return false
      return true
    }
    
    const tagCounts: Record<string, number> = {}
    for (const skill of skills) {
      const tags = skill.tags
      if (Array.isArray(tags)) {
        for (const tag of tags) {
          if (isValidTag(tag)) {
            const normalized = tag.toLowerCase().trim()
            tagCounts[normalized] = (tagCounts[normalized] ?? 0) + 1
          }
        }
      } else if (tags && typeof tags === 'object') {
        for (const key of Object.keys(tags)) {
          if (isValidTag(key)) {
            const normalized = key.toLowerCase().trim()
            tagCounts[normalized] = (tagCounts[normalized] ?? 0) + 1
          }
        }
      }
    }
    
    const sortedTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([tag, count]) => ({ tag, count }))
    
    // Update sync state with cached counts
    const state = await ctx.db
      .query('clawdhubSyncState')
      .withIndex('by_key', (q) => q.eq('key', 'skills'))
      .unique()
    
    if (state) {
      await ctx.db.patch(state._id, {
        categoryCounts,
        tagCounts: sortedTags,
        totalVisible: skills.length,
      })
    }
    
    return { categories: Object.keys(categoryCounts).length, tags: sortedTags.length, total: skills.length }
  },
})

// ============================================
// Internal Action (called by cron)
// ============================================

async function fetchWithRetry(url: string): Promise<Response> {
  let lastError: Error | null = null
  
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'ClawdTM-Sync/1.0',
        },
      })
      
      if (response.ok) {
        return response
      }
      
      // Retry on 5xx errors
      if (response.status >= 500 && attempt < MAX_RETRIES - 1) {
        console.log(`Retry ${attempt + 1}/${MAX_RETRIES} after ${response.status}`)
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * (attempt + 1)))
        continue
      }
      
      return response
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
      if (attempt < MAX_RETRIES - 1) {
        console.log(`Retry ${attempt + 1}/${MAX_RETRIES} after error: ${lastError.message}`)
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * (attempt + 1)))
      }
    }
  }
  
  throw lastError ?? new Error('Failed after retries')
}

interface ClawdHubSkill {
  id?: string
  _id?: string
  slug: string
  displayName?: string
  name?: string
  summary?: string
  description?: string
  ownerHandle?: string
  author?: string
  stats?: {
    downloads?: number
    stars?: number
    installs?: number
    installsAllTime?: number
    installsCurrent?: number
  }
  tags?: string[]
  category?: string
  latestVersion?: string | { version: string; changelog?: string; createdAt?: number }
  version?: string
  createdAt?: number | string
  updatedAt?: number | string
}

interface ClawdHubResponse {
  skills?: ClawdHubSkill[]
  data?: ClawdHubSkill[]
  items?: ClawdHubSkill[]
  cursor?: string
  nextCursor?: string
  hasMore?: boolean
}

function parseTimestamp(value: number | string | undefined): number | undefined {
  if (!value) return undefined
  if (typeof value === 'number') return value
  const parsed = Date.parse(value)
  return isNaN(parsed) ? undefined : parsed
}

export const syncSkillsBatch = internalAction({
  args: {
    cursor: v.optional(v.string()),
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const batchSize = args.batchSize ?? BATCH_SIZE
    
    // Initialize sync state if needed
    await ctx.runMutation(internal.clawdhubSync.initSyncState, {})
    
    // Mark as running
    await ctx.runMutation(internal.clawdhubSync.updateSyncState, {
      status: 'running',
    })
    
    try {
      // Build URL
      const url = new URL(`${CLAWDHUB_API}/skills`)
      url.searchParams.set('limit', String(batchSize))
      if (args.cursor) {
        url.searchParams.set('cursor', args.cursor)
      }
      
      console.log(`Fetching skills from: ${url.toString()}`)
      
      const response = await fetchWithRetry(url.toString())
      
      if (!response.ok) {
        throw new Error(`API returned ${response.status}`)
      }
      
      const data: ClawdHubResponse = await response.json()
      
      // Handle different response formats
      const skills = data.skills ?? data.data ?? data.items ?? []
      const nextCursor = data.cursor ?? data.nextCursor
      const hasMore = data.hasMore ?? (nextCursor !== undefined && nextCursor !== null)
      
      console.log(`Received ${skills.length} skills, hasMore: ${hasMore}`)
      
      // Upsert each skill
      let synced = 0
      for (const skill of skills) {
        const externalId = skill.id ?? skill._id ?? skill.slug
        
        // Extract version string (might be string or object with version property)
        let versionStr: string | undefined
        if (typeof skill.latestVersion === 'string') {
          versionStr = skill.latestVersion
        } else if (typeof skill.version === 'string') {
          versionStr = skill.version
        } else if (skill.latestVersion && typeof skill.latestVersion === 'object' && 'version' in skill.latestVersion) {
          versionStr = (skill.latestVersion as { version: string }).version
        }
        
        await ctx.runMutation(internal.clawdhubSync.upsertCachedSkill, {
          externalId,
          slug: skill.slug,
          name: skill.displayName ?? skill.name ?? skill.slug,
          description: skill.summary ?? skill.description,
          author: skill.ownerHandle ?? skill.author ?? 'unknown',
          authorHandle: skill.ownerHandle,
          downloads: skill.stats?.downloads ?? 0,
          stars: skill.stats?.stars ?? 0,
          installs: skill.stats?.installsAllTime ?? skill.stats?.installs ?? skill.stats?.installsCurrent ?? 0,
          tags: skill.tags,
          category: skill.category,
          version: versionStr,
          externalCreatedAt: parseTimestamp(skill.createdAt),
          externalUpdatedAt: parseTimestamp(skill.updatedAt),
        })
        synced++
      }
      
      // Update state
      if (hasMore && nextCursor) {
        // More pages to fetch - schedule next batch
        await ctx.runMutation(internal.clawdhubSync.updateSyncState, {
          cursor: nextCursor,
          status: 'running',
          incrementTotal: synced,
        })
        
        // Schedule next batch (Convex will handle this in the cron)
        return { synced, hasMore: true, nextCursor }
      } else {
        // Done with full sync
        await ctx.runMutation(internal.clawdhubSync.updateSyncState, {
          status: 'idle',
          incrementTotal: synced,
          markFullSync: true,
        })
        
        // Update cached counts to avoid full table scans on queries
        await ctx.runMutation(internal.clawdhubSync.updateCachedCounts, {})
        
        return { synced, hasMore: false }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      console.error('Sync error:', errorMessage)
      
      await ctx.runMutation(internal.clawdhubSync.updateSyncState, {
        status: 'error',
        lastError: errorMessage,
      })
      
      throw err
    }
  },
})

// Main sync action called by cron
export const syncFromClawdHub = internalAction({
  args: {
    maxBatches: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const maxBatches = args.maxBatches ?? 5
    
    // Get current sync state
    const state = await ctx.runQuery(internal.clawdhubSync.getSyncState, {})
    
    // Check for stale running state (stuck for > 30 minutes = likely crashed)
    const thirtyMinutesAgo = Date.now() - (30 * 60 * 1000)
    if (state?.status === 'running' && state.updatedAt && state.updatedAt < thirtyMinutesAgo) {
      console.log('Stale running state detected, resetting to idle...')
      await ctx.runMutation(internal.clawdhubSync.updateSyncState, {
        status: 'idle',
        lastError: 'Reset from stale running state',
      })
    } else if (state?.status === 'running') {
      console.log('Sync already in progress, skipping...')
      return { totalSynced: 0, batchCount: 0, complete: false, skipped: true }
    }
    
    // Skip if we just synced recently (within last 10 minutes) - reduces unnecessary syncs
    const tenMinutesAgo = Date.now() - (10 * 60 * 1000)
    if (state?.lastFullSyncAt && state.lastFullSyncAt > tenMinutesAgo && !state.cursor) {
      console.log('Recent sync detected, skipping incremental sync...')
      return { totalSynced: 0, batchCount: 0, complete: false, skipped: true }
    }
    
    // Start from cursor if we have one (continuing a previous sync)
    let cursor = state?.cursor
    let totalSynced = 0
    let batchCount = 0
    
    try {
      while (batchCount < maxBatches) {
        const result = await ctx.runAction(internal.clawdhubSync.syncSkillsBatch, {
          cursor,
          batchSize: BATCH_SIZE,
        })
        
        totalSynced += result.synced
        batchCount++
        
        if (!result.hasMore) {
          console.log(`Sync complete: ${totalSynced} skills synced in ${batchCount} batches`)
          return { totalSynced, batchCount, complete: true }
        }
        
        cursor = result.nextCursor
      }
      
      // Pausing after maxBatches - set status to idle so next cron can continue
      await ctx.runMutation(internal.clawdhubSync.updateSyncState, {
        status: 'idle',
        cursor, // Preserve cursor to continue from where we left off
      })
      
      console.log(`Sync paused: ${totalSynced} skills synced in ${batchCount} batches, will continue next cron`)
      return { totalSynced, batchCount, complete: false }
    } catch (err) {
      // Ensure we reset to idle on any error so we don't get stuck
      const errorMessage = err instanceof Error ? err.message : String(err)
      console.error('syncFromClawdHub error:', errorMessage)
      
      await ctx.runMutation(internal.clawdhubSync.updateSyncState, {
        status: 'idle',
        lastError: errorMessage,
      })
      
      throw err
    }
  },
})

// Full sync - fetches ALL skills from ClawdHub (no batch limit)
export const fullSyncFromClawdHub = internalAction({
  args: {},
  handler: async (ctx) => {
    // Get current sync state
    const state = await ctx.runQuery(internal.clawdhubSync.getSyncState, {})
    
    // Skip if sync is already running (prevents write conflicts)
    if (state?.status === 'running') {
      console.log('Sync already in progress, skipping full sync...')
      return { totalSynced: 0, batchCount: 0, complete: false, aborted: true }
    }
    
    console.log('Starting full sync from ClawdHub...')
    
    // Reset sync state
    await ctx.runMutation(internal.clawdhubSync.initSyncState, {})
    
    let cursor: string | undefined
    let totalSynced = 0
    let batchCount = 0
    let consecutiveErrors = 0
    const maxBatches = 100 // Safety limit (100 * 50 = 5000 skills max)
    const maxConsecutiveErrors = 3
    
    while (batchCount < maxBatches) {
      try {
        const result = await ctx.runAction(internal.clawdhubSync.syncSkillsBatch, {
          cursor,
          batchSize: 50,
        })
        
        totalSynced += result.synced
        batchCount++
        consecutiveErrors = 0 // Reset error counter on success
        
        console.log(`Batch ${batchCount}: synced ${result.synced} skills (total: ${totalSynced})`)
        
        if (!result.hasMore) {
          console.log(`Full sync complete: ${totalSynced} skills in ${batchCount} batches`)
          await ctx.runMutation(internal.clawdhubSync.updateSyncState, {
            status: 'idle',
            markFullSync: true,
          })
          // Update cached counts to avoid full table scans on queries
          await ctx.runMutation(internal.clawdhubSync.updateCachedCounts, {})
          return { totalSynced, batchCount, complete: true }
        }
        
        cursor = result.nextCursor
        
        // Small delay between batches to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500))
      } catch (err) {
        console.error(`Batch ${batchCount + 1} failed:`, err)
        consecutiveErrors++
        batchCount++
        
        // If we keep failing on same cursor, abort
        if (consecutiveErrors >= maxConsecutiveErrors) {
          console.log(`Aborting after ${maxConsecutiveErrors} consecutive errors. Synced ${totalSynced} skills.`)
          await ctx.runMutation(internal.clawdhubSync.updateSyncState, {
            status: 'error',
            lastError: `Aborted after ${maxConsecutiveErrors} consecutive failures at cursor`,
          })
          return { totalSynced, batchCount, complete: false, aborted: true }
        }
        
        // Wait longer before retrying
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }
    
    console.log(`Full sync reached batch limit: ${totalSynced} skills in ${batchCount} batches`)
    return { totalSynced, batchCount, complete: false }
  },
})

// ============================================
// Public Queries (for frontend)
// ============================================

export const listCachedSkills = query({
  args: {
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
    sortBy: v.optional(v.union(
      v.literal('downloads'),
      v.literal('stars'),
      v.literal('installs'),
      v.literal('recent')
    )),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50
    
    // Get skills sorted by the requested field
    let skills = await ctx.db
      .query('cachedSkills')
      .order('desc')
      .take(limit + 1)
    
    // Sort in memory based on sortBy
    if (args.sortBy === 'downloads') {
      skills = skills.sort((a, b) => b.downloads - a.downloads)
    } else if (args.sortBy === 'stars') {
      skills = skills.sort((a, b) => b.stars - a.stars)
    } else if (args.sortBy === 'installs') {
      skills = skills.sort((a, b) => b.installs - a.installs)
    }
    
    // Filter by category if specified
    if (args.category && args.category !== 'all') {
      skills = skills.filter(s => s.category === args.category)
    }
    
    const hasMore = skills.length > limit
    if (hasMore) {
      skills = skills.slice(0, limit)
    }
    
    // Normalize the skills for the frontend
    const normalizedSkills = skills.map(s => ({
      ...s,
      // Handle both old and new field names
      name: s.name ?? s.displayName ?? s.slug,
      description: s.description ?? s.summary,
      author: s.author ?? s.authorHandle ?? 'unknown',
    }))
    
    return {
      skills: normalizedSkills,
      hasMore,
      nextCursor: hasMore ? skills[skills.length - 1]?._id : undefined,
    }
  },
})

export const searchCachedSkills = query({
  args: {
    query: v.string(),
    limit: v.optional(v.number()),
    sortBy: v.optional(v.union(
      v.literal('relevance'),
      v.literal('downloads'),
      v.literal('stars'),
      v.literal('installs'),
    )),
  },
  handler: async (ctx, args) => {
    const searchTerm = args.query.trim().toLowerCase()
    if (!searchTerm) {
      return { skills: [] }
    }
    
    const limit = args.limit ?? 30
    const sortBy = args.sortBy ?? 'relevance'
    
    // Get all skills and filter in memory for comprehensive search
    // This works well for < 10k skills; for larger datasets, use proper search index
    const allSkills = await ctx.db.query('cachedSkills').collect()
    
    // Filter out hidden skills
    const visibleSkills = allSkills.filter(s => !s.hidden)
    
    // Score and filter matching results
    const scored = visibleSkills
      .map(skill => {
        const name = (skill.name ?? skill.displayName ?? skill.slug).toLowerCase()
        const slug = skill.slug.toLowerCase()
        const description = (skill.description ?? skill.summary ?? '').toLowerCase()
        const author = (skill.author ?? '').toLowerCase()
        
        let score = 0
        
        // Exact slug match (highest priority)
        if (slug === searchTerm) score += 100
        // Slug starts with search term
        else if (slug.startsWith(searchTerm)) score += 50
        // Slug contains search term
        else if (slug.includes(searchTerm)) score += 30
        
        // Name exact match
        if (name === searchTerm) score += 80
        // Name starts with
        else if (name.startsWith(searchTerm)) score += 40
        // Name contains
        else if (name.includes(searchTerm)) score += 20
        
        // Description contains
        if (description.includes(searchTerm)) score += 10
        
        // Author match
        if (author.includes(searchTerm)) score += 15
        
        // Only add popularity boost for relevance sorting
        if (sortBy === 'relevance') {
          score += Math.min(skill.stars * 2, 20)
          score += Math.min(skill.downloads / 10, 10)
        }
        
        return { skill, score }
      })
      .filter(({ score }) => score > 0)
    
    // Sort based on sortBy parameter
    let sorted: typeof scored
    switch (sortBy) {
      case 'downloads':
        sorted = scored.sort((a, b) => b.skill.downloads - a.skill.downloads)
        break
      case 'stars':
        sorted = scored.sort((a, b) => b.skill.stars - a.skill.stars)
        break
      case 'installs':
        sorted = scored.sort((a, b) => b.skill.installs - a.skill.installs)
        break
      case 'relevance':
      default:
        sorted = scored.sort((a, b) => b.score - a.score)
        break
    }
    
    const results = sorted
      .slice(0, limit)
      .map(({ skill }) => ({
        ...skill,
        name: skill.name ?? skill.displayName ?? skill.slug,
        description: skill.description ?? skill.summary,
        author: skill.author ?? skill.authorHandle ?? 'unknown',
      }))
    
    return { skills: results }
  },
})

export const getSyncStatus = query({
  args: {},
  handler: async (ctx) => {
    const state = await ctx.db
      .query('clawdhubSyncState')
      .withIndex('by_key', (q) => q.eq('key', 'skills'))
      .unique()
    
    // Use cached totalVisible if available (avoids full table scan)
    if (state?.totalVisible !== undefined) {
      // Get hidden count from index (efficient)
      const hiddenSkills = await ctx.db
        .query('cachedSkills')
        .withIndex('by_hidden', (q) => q.eq('hidden', true))
        .collect()
      
      return {
        status: state?.status ?? 'idle',
        totalSynced: state?.totalSynced ?? 0,
        totalCached: state.totalVisible,
        totalHidden: hiddenSkills.length,
        lastFullSyncAt: state?.lastFullSyncAt,
        lastError: state?.lastError,
      }
    }
    
    // Fallback: use index for hidden count (more efficient than full scan)
    const hiddenSkills = await ctx.db
      .query('cachedSkills')
      .withIndex('by_hidden', (q) => q.eq('hidden', true))
      .collect()
    
    // Get total count from another approach - just count all
    const allCached = await ctx.db.query('cachedSkills').collect()
    
    return {
      status: state?.status ?? 'not_initialized',
      totalSynced: state?.totalSynced ?? 0,
      totalCached: allCached.length - hiddenSkills.length,
      totalHidden: hiddenSkills.length,
      lastFullSyncAt: state?.lastFullSyncAt,
      lastError: state?.lastError,
    }
  },
})

// Get all unique categories from cached skills (uses cached data)
export const getCategories = query({
  args: {},
  handler: async (ctx) => {
    // Try to use cached counts first (avoids full table scan)
    const state = await ctx.db
      .query('clawdhubSyncState')
      .withIndex('by_key', (q) => q.eq('key', 'skills'))
      .unique()
    
    if (state?.categoryCounts && state?.totalVisible !== undefined) {
      const counts = state.categoryCounts as Record<string, number>
      return {
        categories: Object.keys(counts).filter(c => c !== 'uncategorized').sort(),
        counts,
        total: state.totalVisible,
      }
    }
    
    // Fallback: compute from skills (only if cache missing)
    const allSkills = await ctx.db.query('cachedSkills').collect()
    const skills = allSkills.filter(s => !s.hidden)
    
    const categoryCounts: Record<string, number> = {}
    for (const skill of skills) {
      const cat = skill.category ?? 'uncategorized'
      categoryCounts[cat] = (categoryCounts[cat] ?? 0) + 1
    }
    
    return {
      categories: Object.keys(categoryCounts).filter(c => c !== 'uncategorized').sort(),
      counts: categoryCounts,
      total: skills.length,
    }
  },
})

// Get all unique tags from cached skills
// Tags to exclude (version info, not real tags)
const EXCLUDED_TAGS = new Set(['latest', 'stable', 'beta', 'alpha', 'dev', 'main', 'master'])

function isVersionTag(tag: string): boolean {
  // Match version patterns like "1.0.0", "v1.0.0", "0.1.0"
  return /^v?\d+\.\d+(\.\d+)?(-.*)?$/.test(tag)
}

function isValidTag(tag: string): boolean {
  if (!tag || typeof tag !== 'string') return false
  const normalized = tag.toLowerCase().trim()
  if (normalized.length < 2 || normalized.length > 30) return false
  if (EXCLUDED_TAGS.has(normalized)) return false
  if (isVersionTag(normalized)) return false
  return true
}

export const getTags = query({
  args: {},
  handler: async (ctx) => {
    // Try to use cached counts first (avoids full table scan)
    const state = await ctx.db
      .query('clawdhubSyncState')
      .withIndex('by_key', (q) => q.eq('key', 'skills'))
      .unique()
    
    if (state?.tagCounts && Array.isArray(state.tagCounts)) {
      return { tags: state.tagCounts as Array<{ tag: string; count: number }> }
    }
    
    // Fallback: compute from skills (only if cache missing)
    const allSkills = await ctx.db.query('cachedSkills').collect()
    const skills = allSkills.filter(s => !s.hidden)
    
    const tagCounts: Record<string, number> = {}
    
    for (const skill of skills) {
      const tags = skill.tags
      if (Array.isArray(tags)) {
        for (const tag of tags) {
          if (isValidTag(tag)) {
            const normalized = tag.toLowerCase().trim()
            tagCounts[normalized] = (tagCounts[normalized] ?? 0) + 1
          }
        }
      } else if (tags && typeof tags === 'object') {
        for (const key of Object.keys(tags)) {
          if (isValidTag(key)) {
            const normalized = key.toLowerCase().trim()
            tagCounts[normalized] = (tagCounts[normalized] ?? 0) + 1
          }
        }
      }
    }
    
    const sortedTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([tag, count]) => ({ tag, count }))
    
    return { tags: sortedTags }
  },
})

// List skills with tag filtering and pagination
export const listCachedSkillsWithFilters = query({
  args: {
    limit: v.optional(v.number()),
    cursor: v.optional(v.number()), // Use offset for simplicity
    sortBy: v.optional(v.union(
      v.literal('downloads'),
      v.literal('stars'),
      v.literal('installs'),
      v.literal('recent')
    )),
    category: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    hasNix: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50
    const offset = args.cursor ?? 0
    
    // Get all skills for filtering (we'll paginate after filtering)
    let skills = await ctx.db
      .query('cachedSkills')
      .order('desc')
      .collect()
    
    // Filter out hidden skills first
    skills = skills.filter(s => !s.hidden)
    
    // Curated featured skills list (align with clawdhub install / getting-started example)
    const FEATURED_SLUGS = [
      'web-search',       // Getting-started example: clawdhub install web-search
      'gog',              // Google Workspace (Gmail, Calendar, Tasks, Drive, Sheets, Docs)
      'notion',           // Notion pages, databases, blocks
      'bird',             // X/Twitter CLI (feed, mentions, DMs)
      'perplexity',       // AI web search with citations
      'nano-banana-pro',  // Image generation
      'weather',          // Current weather & forecasts
      'gifgrep',          // GIF search & download
      'goplaces',         // Google Places API
      'github',           // GitHub CLI (issues, PRs, runs)
      'summarize',        // URL/file summarization
    ]
    
    // Verified skills list (curated/tested)
    const VERIFIED_SLUGS = [
      'gog',              // Google Workspace - tested and verified
    ]
    
    // Filter by category
    if (args.category && args.category !== 'all') {
      if (args.category === 'featured') {
        skills = skills.filter(s => FEATURED_SLUGS.includes(s.slug))
      } else if (args.category === 'verified') {
        skills = skills.filter(s => VERIFIED_SLUGS.includes(s.slug))
      } else if (args.category === 'latest') {
        // Latest = skills updated in last 24 hours
        const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000)
        skills = skills.filter(s => {
          const updatedAt = s.externalUpdatedAt ?? s.lastSyncedAt ?? 0
          return updatedAt >= twentyFourHoursAgo
        })
      } else {
        skills = skills.filter(s => s.category === args.category)
      }
    }
    
    // Filter by tags
    if (args.tags && args.tags.length > 0) {
      skills = skills.filter(s => {
        const skillTags = s.tags
        if (Array.isArray(skillTags)) {
          return args.tags!.some(t => skillTags.includes(t))
        } else if (skillTags && typeof skillTags === 'object') {
          const keys = Object.keys(skillTags)
          return args.tags!.some(t => keys.includes(t))
        }
        return false
      })
    }
    
    // Filter by hasNix
    if (args.hasNix !== undefined) {
      skills = skills.filter(s => s.hasNix === args.hasNix)
    }
    
    // Sort
    if (args.category === 'latest') {
      // Latest category: sort by most recently updated
      skills = skills.sort((a, b) => {
        const updatedA = a.externalUpdatedAt ?? a.lastSyncedAt ?? 0
        const updatedB = b.externalUpdatedAt ?? b.lastSyncedAt ?? 0
        return updatedB - updatedA
      })
    } else if (args.sortBy === 'downloads') {
      skills = skills.sort((a, b) => b.downloads - a.downloads)
    } else if (args.sortBy === 'stars') {
      skills = skills.sort((a, b) => b.stars - a.stars)
    } else if (args.sortBy === 'installs') {
      skills = skills.sort((a, b) => b.installs - a.installs)
    }
    
    // Total count before pagination
    const totalCount = skills.length
    
    // Paginate
    const paginatedSkills = skills.slice(offset, offset + limit)
    const hasMore = offset + limit < totalCount
    const nextCursor = hasMore ? offset + limit : undefined
    
    // Normalize
    const normalizedSkills = paginatedSkills.map(s => ({
      ...s,
      name: s.name ?? s.displayName ?? s.slug,
      description: s.description ?? s.summary,
      author: s.author ?? s.authorHandle ?? 'unknown',
      // Normalize tags to array
      normalizedTags: Array.isArray(s.tags) 
        ? s.tags.filter((t): t is string => typeof t === 'string')
        : s.tags && typeof s.tags === 'object' 
          ? Object.keys(s.tags)
          : [],
    }))
    
    return {
      skills: normalizedSkills,
      totalCount,
      hasMore,
      nextCursor,
    }
  },
})

// Manual trigger for testing
export const triggerSync = action({
  args: {
    full: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<{ totalSynced: number; batchCount: number; complete: boolean; aborted?: boolean }> => {
    if (args.full) {
      return await ctx.runAction(internal.clawdhubSync.fullSyncFromClawdHub, {})
    }
    return await ctx.runAction(internal.clawdhubSync.syncFromClawdHub, {
      maxBatches: 10,
    })
  },
})

// Manual trigger to refresh cached counts (reduces bandwidth on category/tag queries)
export const refreshCachedCounts = action({
  args: {},
  handler: async (ctx): Promise<{ categories: number; tags: number; total: number }> => {
    return await ctx.runMutation(internal.clawdhubSync.updateCachedCounts, {})
  },
})

// Reset stuck sync state (for recovery from errors)
export const resetSyncStatus = mutation({
  args: {},
  handler: async (ctx) => {
    const state = await ctx.db
      .query('clawdhubSyncState')
      .withIndex('by_key', (q) => q.eq('key', 'skills'))
      .unique()
    
    if (state) {
      await ctx.db.patch(state._id, {
        status: 'idle',
        lastError: undefined,
      })
      return { success: true, previousStatus: state.status }
    }
    
    return { success: false, message: 'No sync state found' }
  },
})

// ============================================
// Moderation - Hide/Unhide Skills
// ============================================

// Hide a skill (prevent it from showing in the UI)
export const hideSkill = mutation({
  args: {
    slug: v.string(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
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
    })
    
    return { success: true, slug: args.slug }
  },
})

// Unhide a skill
export const unhideSkill = mutation({
  args: {
    slug: v.string(),
  },
  handler: async (ctx, args) => {
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
    })
    
    return { success: true, slug: args.slug }
  },
})

// List all hidden skills
export const listHiddenSkills = query({
  args: {},
  handler: async (ctx) => {
    const skills = await ctx.db
      .query('cachedSkills')
      .withIndex('by_hidden', (q) => q.eq('hidden', true))
      .collect()
    
    return skills.map((s) => ({
      slug: s.slug,
      name: s.name ?? s.displayName ?? s.slug,
      hiddenReason: s.hiddenReason,
      hiddenAt: s.hiddenAt,
    }))
  },
})

// ============================================
// Manual Reset (unstick sync state)
// ============================================

// Force reset sync state to idle (use when stuck)
export const resetSyncState = internalMutation({
  args: {},
  handler: async (ctx) => {
    const state = await ctx.db
      .query('clawdhubSyncState')
      .withIndex('by_key', (q) => q.eq('key', 'skills'))
      .unique()
    
    if (state) {
      await ctx.db.patch(state._id, {
        status: 'idle',
        cursor: undefined,
        lastError: 'Manual reset',
        updatedAt: Date.now(),
      })
      console.log('Sync state reset to idle')
      return { success: true, previousStatus: state.status }
    }
    
    return { success: false, error: 'No sync state found' }
  },
})

// ============================================
// Author Enrichment (fetches owner from detail endpoint)
// ============================================

// Get skills that need author enrichment (author is 'unknown' or missing)
export const getSkillsNeedingAuthorEnrichment = internalQuery({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50
    
    // Get all skills and filter for unknown/missing authors
    const allSkills = await ctx.db
      .query('cachedSkills')
      .collect()
    
    return allSkills
      .filter(s => !s.author || s.author === 'unknown')
      .slice(0, limit)
      .map(s => ({ _id: s._id, slug: s.slug }))
  },
})

// Update a skill's author info
export const updateSkillAuthor = internalMutation({
  args: {
    skillId: v.id('cachedSkills'),
    author: v.string(),
    authorHandle: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.skillId, {
      author: args.author,
      authorHandle: args.authorHandle,
    })
  },
})

// Fetch author info from detail endpoint and update skill
export const enrichSkillAuthors = internalAction({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50
    
    // Get skills needing enrichment
    const skills = await ctx.runQuery(internal.clawdhubSync.getSkillsNeedingAuthorEnrichment, { limit })
    
    if (skills.length === 0) {
      console.log('No skills need author enrichment')
      return { enriched: 0, failed: 0 }
    }
    
    console.log(`Enriching author info for ${skills.length} skills`)
    
    let enriched = 0
    let failed = 0
    
    for (const skill of skills) {
      try {
        // Fetch detail endpoint
        const response = await fetch(`${CLAWDHUB_API}/skills/${skill.slug}`)
        
        if (!response.ok) {
          console.warn(`Failed to fetch detail for ${skill.slug}: ${response.status}`)
          failed++
          continue
        }
        
        const data = await response.json()
        const owner = data.owner
        
        if (owner && (owner.handle || owner.displayName)) {
          // Update the skill with author info
          await ctx.runMutation(internal.clawdhubSync.updateSkillAuthor, {
            skillId: skill._id,
            author: owner.displayName ?? owner.handle,
            authorHandle: owner.handle,
          })
          enriched++
        } else {
          // No owner data, mark as 'community' to avoid re-fetching
          await ctx.runMutation(internal.clawdhubSync.updateSkillAuthor, {
            skillId: skill._id,
            author: 'community',
            authorHandle: undefined,
          })
          enriched++
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100))
        
      } catch (err) {
        console.error(`Error enriching ${skill.slug}:`, err)
        failed++
      }
    }
    
    console.log(`Author enrichment complete: ${enriched} enriched, ${failed} failed`)
    return { enriched, failed }
  },
})
