import { authTables } from '@convex-dev/auth/server'
import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'
import { EMBEDDING_DIMENSIONS } from './lib/embeddings'

const users = defineTable({
  name: v.optional(v.string()),
  image: v.optional(v.string()),
  email: v.optional(v.string()),
  emailVerificationTime: v.optional(v.number()),
  phone: v.optional(v.string()),
  phoneVerificationTime: v.optional(v.number()),
  isAnonymous: v.optional(v.boolean()),
  handle: v.optional(v.string()),
  displayName: v.optional(v.string()),
  bio: v.optional(v.string()),
  role: v.optional(v.union(v.literal('admin'), v.literal('moderator'), v.literal('user'))),
  deletedAt: v.optional(v.number()),
  createdAt: v.optional(v.number()),
  updatedAt: v.optional(v.number()),
})
  .index('email', ['email'])
  .index('phone', ['phone'])
  .index('handle', ['handle'])

const skills = defineTable({
  slug: v.string(),
  displayName: v.string(),
  summary: v.optional(v.string()),
  ownerUserId: v.id('users'),
  canonicalSkillId: v.optional(v.id('skills')),
  forkOf: v.optional(
    v.object({
      skillId: v.id('skills'),
      kind: v.union(v.literal('fork'), v.literal('duplicate')),
      version: v.optional(v.string()),
      at: v.number(),
    }),
  ),
  latestVersionId: v.optional(v.id('skillVersions')),
  tags: v.record(v.string(), v.id('skillVersions')),
  softDeletedAt: v.optional(v.number()),
  badges: v.object({
    redactionApproved: v.optional(
      v.object({
        byUserId: v.id('users'),
        at: v.number(),
      }),
    ),
  }),
  batch: v.optional(v.string()),
  statsDownloads: v.optional(v.number()),
  statsStars: v.optional(v.number()),
  statsInstallsCurrent: v.optional(v.number()),
  statsInstallsAllTime: v.optional(v.number()),
  stats: v.object({
    downloads: v.number(),
    installsCurrent: v.optional(v.number()),
    installsAllTime: v.optional(v.number()),
    stars: v.number(),
    upvotes: v.optional(v.number()),
    downvotes: v.optional(v.number()),
    versions: v.number(),
    comments: v.number(),
  }),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index('by_slug', ['slug'])
  .index('by_owner', ['ownerUserId'])
  .index('by_updated', ['updatedAt'])
  .index('by_stats_downloads', ['statsDownloads', 'updatedAt'])
  .index('by_stats_stars', ['statsStars', 'updatedAt'])
  .index('by_stats_installs_current', ['statsInstallsCurrent', 'updatedAt'])
  .index('by_stats_installs_all_time', ['statsInstallsAllTime', 'updatedAt'])
  .index('by_batch', ['batch'])

const souls = defineTable({
  slug: v.string(),
  displayName: v.string(),
  summary: v.optional(v.string()),
  ownerUserId: v.id('users'),
  latestVersionId: v.optional(v.id('soulVersions')),
  tags: v.record(v.string(), v.id('soulVersions')),
  softDeletedAt: v.optional(v.number()),
  stats: v.object({
    downloads: v.number(),
    stars: v.number(),
    versions: v.number(),
    comments: v.number(),
  }),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index('by_slug', ['slug'])
  .index('by_owner', ['ownerUserId'])
  .index('by_updated', ['updatedAt'])

const skillVersions = defineTable({
  skillId: v.id('skills'),
  version: v.string(),
  fingerprint: v.optional(v.string()),
  changelog: v.string(),
  changelogSource: v.optional(v.union(v.literal('auto'), v.literal('user'))),
  files: v.array(
    v.object({
      path: v.string(),
      size: v.number(),
      storageId: v.id('_storage'),
      sha256: v.string(),
      contentType: v.optional(v.string()),
    }),
  ),
  parsed: v.object({
    frontmatter: v.record(v.string(), v.any()),
    metadata: v.optional(v.any()),
    clawdis: v.optional(v.any()),
  }),
  createdBy: v.id('users'),
  createdAt: v.number(),
  softDeletedAt: v.optional(v.number()),
})
  .index('by_skill', ['skillId'])
  .index('by_skill_version', ['skillId', 'version'])

const soulVersions = defineTable({
  soulId: v.id('souls'),
  version: v.string(),
  fingerprint: v.optional(v.string()),
  changelog: v.string(),
  changelogSource: v.optional(v.union(v.literal('auto'), v.literal('user'))),
  files: v.array(
    v.object({
      path: v.string(),
      size: v.number(),
      storageId: v.id('_storage'),
      sha256: v.string(),
      contentType: v.optional(v.string()),
    }),
  ),
  parsed: v.object({
    frontmatter: v.record(v.string(), v.any()),
    metadata: v.optional(v.any()),
  }),
  createdBy: v.id('users'),
  createdAt: v.number(),
  softDeletedAt: v.optional(v.number()),
})
  .index('by_soul', ['soulId'])
  .index('by_soul_version', ['soulId', 'version'])

const skillVersionFingerprints = defineTable({
  skillId: v.id('skills'),
  versionId: v.id('skillVersions'),
  fingerprint: v.string(),
  createdAt: v.number(),
})
  .index('by_version', ['versionId'])
  .index('by_fingerprint', ['fingerprint'])
  .index('by_skill_fingerprint', ['skillId', 'fingerprint'])

const soulVersionFingerprints = defineTable({
  soulId: v.id('souls'),
  versionId: v.id('soulVersions'),
  fingerprint: v.string(),
  createdAt: v.number(),
})
  .index('by_version', ['versionId'])
  .index('by_fingerprint', ['fingerprint'])
  .index('by_soul_fingerprint', ['soulId', 'fingerprint'])

const skillEmbeddings = defineTable({
  skillId: v.id('skills'),
  versionId: v.id('skillVersions'),
  ownerId: v.id('users'),
  embedding: v.array(v.number()),
  isLatest: v.boolean(),
  isApproved: v.boolean(),
  visibility: v.string(),
  updatedAt: v.number(),
})
  .index('by_skill', ['skillId'])
  .index('by_version', ['versionId'])
  .vectorIndex('by_embedding', {
    vectorField: 'embedding',
    dimensions: EMBEDDING_DIMENSIONS,
    filterFields: ['visibility'],
  })

const skillDailyStats = defineTable({
  skillId: v.id('skills'),
  day: v.number(),
  downloads: v.number(),
  installs: v.number(),
  updatedAt: v.number(),
})
  .index('by_skill_day', ['skillId', 'day'])
  .index('by_day', ['day'])

const skillLeaderboards = defineTable({
  kind: v.string(),
  generatedAt: v.number(),
  rangeStartDay: v.number(),
  rangeEndDay: v.number(),
  items: v.array(
    v.object({
      skillId: v.id('skills'),
      score: v.number(),
      installs: v.number(),
      downloads: v.number(),
    }),
  ),
}).index('by_kind', ['kind', 'generatedAt'])

const skillStatBackfillState = defineTable({
  key: v.string(),
  cursor: v.optional(v.string()),
  doneAt: v.optional(v.number()),
  updatedAt: v.number(),
}).index('by_key', ['key'])

const soulEmbeddings = defineTable({
  soulId: v.id('souls'),
  versionId: v.id('soulVersions'),
  ownerId: v.id('users'),
  embedding: v.array(v.number()),
  isLatest: v.boolean(),
  isApproved: v.boolean(),
  visibility: v.string(),
  updatedAt: v.number(),
})
  .index('by_soul', ['soulId'])
  .index('by_version', ['versionId'])
  .vectorIndex('by_embedding', {
    vectorField: 'embedding',
    dimensions: EMBEDDING_DIMENSIONS,
    filterFields: ['visibility'],
  })

const comments = defineTable({
  skillId: v.id('skills'),
  userId: v.id('users'),
  body: v.string(),
  createdAt: v.number(),
  softDeletedAt: v.optional(v.number()),
  deletedBy: v.optional(v.id('users')),
})
  .index('by_skill', ['skillId'])
  .index('by_user', ['userId'])

const soulComments = defineTable({
  soulId: v.id('souls'),
  userId: v.id('users'),
  body: v.string(),
  createdAt: v.number(),
  softDeletedAt: v.optional(v.number()),
  deletedBy: v.optional(v.id('users')),
})
  .index('by_soul', ['soulId'])
  .index('by_user', ['userId'])

const stars = defineTable({
  skillId: v.id('skills'),
  userId: v.id('users'),
  createdAt: v.number(),
})
  .index('by_skill', ['skillId'])
  .index('by_user', ['userId'])
  .index('by_skill_user', ['skillId', 'userId'])

const skillVotes = defineTable({
  skillId: v.id('skills'),
  userId: v.id('users'),
  vote: v.union(v.literal('up'), v.literal('down')),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index('by_skill', ['skillId'])
  .index('by_user', ['userId'])
  .index('by_skill_user', ['skillId', 'userId'])

const soulStars = defineTable({
  soulId: v.id('souls'),
  userId: v.id('users'),
  createdAt: v.number(),
})
  .index('by_soul', ['soulId'])
  .index('by_user', ['userId'])
  .index('by_soul_user', ['soulId', 'userId'])

const auditLogs = defineTable({
  actorUserId: v.id('users'),
  action: v.string(),
  targetType: v.string(),
  targetId: v.string(),
  metadata: v.optional(v.any()),
  createdAt: v.number(),
})
  .index('by_actor', ['actorUserId'])
  .index('by_target', ['targetType', 'targetId'])

const apiTokens = defineTable({
  userId: v.id('users'),
  label: v.string(),
  prefix: v.string(),
  tokenHash: v.string(),
  createdAt: v.number(),
  lastUsedAt: v.optional(v.number()),
  revokedAt: v.optional(v.number()),
})
  .index('by_user', ['userId'])
  .index('by_hash', ['tokenHash'])

const rateLimits = defineTable({
  key: v.string(),
  windowStart: v.number(),
  count: v.number(),
  limit: v.number(),
  updatedAt: v.number(),
})
  .index('by_key_window', ['key', 'windowStart'])
  .index('by_key', ['key'])

const githubBackupSyncState = defineTable({
  key: v.string(),
  cursor: v.optional(v.string()),
  updatedAt: v.number(),
}).index('by_key', ['key'])

const userSyncRoots = defineTable({
  userId: v.id('users'),
  rootId: v.string(),
  label: v.string(),
  firstSeenAt: v.number(),
  lastSeenAt: v.number(),
  expiredAt: v.optional(v.number()),
})
  .index('by_user', ['userId'])
  .index('by_user_root', ['userId', 'rootId'])

const userSkillInstalls = defineTable({
  userId: v.id('users'),
  skillId: v.id('skills'),
  firstSeenAt: v.number(),
  lastSeenAt: v.number(),
  activeRoots: v.number(),
  lastVersion: v.optional(v.string()),
})
  .index('by_user', ['userId'])
  .index('by_user_skill', ['userId', 'skillId'])
  .index('by_skill', ['skillId'])

const userSkillRootInstalls = defineTable({
  userId: v.id('users'),
  rootId: v.string(),
  skillId: v.id('skills'),
  firstSeenAt: v.number(),
  lastSeenAt: v.number(),
  lastVersion: v.optional(v.string()),
  removedAt: v.optional(v.number()),
})
  .index('by_user', ['userId'])
  .index('by_user_root', ['userId', 'rootId'])
  .index('by_user_root_skill', ['userId', 'rootId', 'skillId'])
  .index('by_user_skill', ['userId', 'skillId'])
  .index('by_skill', ['skillId'])

// Cached skills from ClawdHub API (synced via cron)
const cachedSkills = defineTable({
  // External ID from ClawdHub (for deduplication) - may be missing in old data
  externalId: v.optional(v.string()),
  slug: v.string(),
  // Support both old (displayName) and new (name) field names
  name: v.optional(v.string()),
  displayName: v.optional(v.string()),
  description: v.optional(v.string()),
  summary: v.optional(v.string()),
  author: v.optional(v.string()),
  authorHandle: v.optional(v.string()),
  
  // Stats
  downloads: v.number(),
  stars: v.number(),
  installs: v.number(),
  upvotes: v.optional(v.number()),
  downvotes: v.optional(v.number()),
  
  // Metadata - tags can be array or object from different API versions
  tags: v.optional(v.any()),
  category: v.optional(v.string()),
  version: v.optional(v.string()),
  latestVersion: v.optional(v.string()),
  hasNix: v.optional(v.boolean()),
  versions: v.optional(v.number()),
  
  // Timestamps (support both old and new field names)
  externalCreatedAt: v.optional(v.number()),
  externalUpdatedAt: v.optional(v.number()),
  createdAt: v.optional(v.number()),
  updatedAt: v.optional(v.number()),
  lastSyncedAt: v.optional(v.number()),
  cachedAt: v.optional(v.number()),
  
  // Moderation - hide malicious/inappropriate skills
  hidden: v.optional(v.boolean()),
  hiddenReason: v.optional(v.string()),
  hiddenAt: v.optional(v.number()),
  
  // ClawdTM-specific vote counts (separate from ClawdHub stats)
  // Legacy combined counts (kept for backwards compatibility)
  clawdtmUpvotes: v.optional(v.number()),
  clawdtmDownvotes: v.optional(v.number()),
  
  // Separate human/bot vote counts
  clawdtmHumanUpvotes: v.optional(v.number()),
  clawdtmHumanDownvotes: v.optional(v.number()),
  clawdtmBotUpvotes: v.optional(v.number()),
  clawdtmBotDownvotes: v.optional(v.number()),
  // Verified bot votes (bots with claimed owners)
  clawdtmVerifiedBotUpvotes: v.optional(v.number()),
  clawdtmVerifiedBotDownvotes: v.optional(v.number()),
  
  // Review aggregates (ClawdTM-specific)
  reviewCount: v.optional(v.number()),
  humanReviewCount: v.optional(v.number()),
  botReviewCount: v.optional(v.number()),
  avgRating: v.optional(v.number()), // Average rating (all reviews)
  avgRatingHuman: v.optional(v.number()), // Average rating (human only)
  avgRatingBot: v.optional(v.number()), // Average rating (bot only)
})
  .index('by_external_id', ['externalId'])
  .index('by_slug', ['slug'])
  .index('by_downloads', ['downloads'])
  .index('by_stars', ['stars'])
  .index('by_installs', ['installs'])
  .index('by_last_synced', ['lastSyncedAt'])
  .index('by_hidden', ['hidden'])
  // Category filtering indexes (avoids full table scans)
  .index('by_category', ['category'])
  .index('by_category_downloads', ['category', 'downloads'])
  .index('by_category_stars', ['category', 'stars'])
  .index('by_category_installs', ['category', 'installs'])
  // Vote-based sorting (ClawdTM upvotes/downvotes)
  .index('by_clawdtm_votes', ['clawdtmUpvotes', 'clawdtmDownvotes'])
  // Author enrichment index (find skills needing author data)
  .index('by_author', ['author'])
  .searchIndex('search_name_desc', {
    searchField: 'slug',
    filterFields: ['category'],
  })

// Sync state for ClawdHub API
const clawdhubSyncState = defineTable({
  key: v.literal('skills'),
  cursor: v.optional(v.string()),
  lastFullSyncAt: v.optional(v.number()),
  lastIncrementalSyncAt: v.optional(v.number()),
  totalSynced: v.number(),
  status: v.union(
    v.literal('idle'),
    v.literal('running'),
    v.literal('error')
  ),
  lastError: v.optional(v.string()),
  updatedAt: v.number(),
  // Cached counts to avoid full table scans
  categoryCounts: v.optional(v.any()), // { category: count }
  tagCounts: v.optional(v.any()), // [{ tag, count }]
  totalVisible: v.optional(v.number()),
}).index('by_key', ['key'])

// Clerk users (synced from Clerk via webhook)
const clerkUsers = defineTable({
  clerkId: v.string(),
  email: v.optional(v.string()),
  name: v.optional(v.string()),
  imageUrl: v.optional(v.string()),
  // User-chosen display name for public display in reviews
  displayName: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index('by_clerk_id', ['clerkId'])

// Bot agents registered to vote on skills
const botAgents = defineTable({
  // Agent identity
  name: v.string(),
  description: v.optional(v.string()),
  
  // API key (hashed for security, prefix for identification)
  apiKeyHash: v.string(),
  apiKeyPrefix: v.string(), // e.g., "clawdtm_sk_abc..." (first 12 chars for display)
  
  // Ownership - either created by human (verified) or self-registered (needs claim)
  ownerClerkUserId: v.optional(v.id('clerkUsers')), // Set when human creates or claims
  claimCode: v.optional(v.string()), // For self-registered bots to be claimed
  
  // Status
  status: v.union(
    v.literal('verified'),   // Human created or claimed this agent
    v.literal('unverified')  // Self-registered, not yet claimed
  ),
  
  // Activity tracking
  lastActiveAt: v.optional(v.number()),
  voteCount: v.optional(v.number()),
  
  // Timestamps
  createdAt: v.number(),
  updatedAt: v.number(),
  revokedAt: v.optional(v.number()), // Soft delete / revoke access
})
  .index('by_owner', ['ownerClerkUserId'])
  .index('by_api_key_hash', ['apiKeyHash'])
  .index('by_claim_code', ['claimCode'])
  .index('by_status', ['status'])
  .index('by_created_at', ['createdAt']) // For rate limiting queries

// Votes on cached skills (ClawdTM-specific, supports both human and bot voters)
const cachedSkillVotes = defineTable({
  cachedSkillId: v.id('cachedSkills'),
  
  // Voter identity - one of these will be set
  clerkUserId: v.optional(v.id('clerkUsers')), // Human voter
  botAgentId: v.optional(v.id('botAgents')),   // Bot voter
  
  // Voter type for easy filtering (optional for backwards compat with old votes)
  voterType: v.optional(v.union(v.literal('human'), v.literal('bot'))),
  
  // Is this a verified voter? (optional for backwards compat - defaults to true for human votes)
  isVerified: v.optional(v.boolean()),
  
  vote: v.union(v.literal('up'), v.literal('down')),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index('by_skill', ['cachedSkillId'])
  .index('by_human_user', ['clerkUserId'])
  .index('by_bot_agent', ['botAgentId'])
  .index('by_skill_human_user', ['cachedSkillId', 'clerkUserId'])
  .index('by_skill_bot_agent', ['cachedSkillId', 'botAgentId'])
  .index('by_voter_type', ['voterType'])
  .index('by_skill_voter_type', ['cachedSkillId', 'voterType'])

// Skill reviews (supports both human and bot reviewers)
const skillReviews = defineTable({
  cachedSkillId: v.id('cachedSkills'),
  
  // Reviewer identity - one of these will be set
  clerkUserId: v.optional(v.id('clerkUsers')), // Human reviewer
  botAgentId: v.optional(v.id('botAgents')),   // Bot reviewer
  
  // Reviewer type for easy filtering
  reviewerType: v.union(v.literal('human'), v.literal('bot')),
  
  // Is this a verified reviewer? (verified bots have human owners)
  isVerified: v.optional(v.boolean()),
  
  // Review content
  rating: v.number(), // 1-5 stars
  reviewText: v.string(), // 10-1000 chars
  
  // Cached display name for efficient rendering
  reviewerName: v.optional(v.string()),
  
  // Timestamps
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index('by_skill', ['cachedSkillId'])
  .index('by_skill_reviewer_type', ['cachedSkillId', 'reviewerType'])
  .index('by_skill_human_user', ['cachedSkillId', 'clerkUserId'])
  .index('by_skill_bot_agent', ['cachedSkillId', 'botAgentId'])
  .index('by_human_user', ['clerkUserId'])
  .index('by_bot_agent', ['botAgentId'])
  .index('by_created', ['createdAt'])
  .index('by_skill_created', ['cachedSkillId', 'createdAt'])

// AI categorization logs
const categorizationLogs = defineTable({
  skillId: v.id('cachedSkills'),
  skillSlug: v.string(),
  // The AI's decision
  assignedCategory: v.optional(v.string()),
  assignedTags: v.optional(v.array(v.string())),
  // The AI's reasoning
  reasoning: v.string(),
  // Model used
  model: v.string(),
  // Metadata
  inputTokens: v.optional(v.number()),
  outputTokens: v.optional(v.number()),
  durationMs: v.optional(v.number()),
  // Status
  status: v.union(
    v.literal('success'),
    v.literal('error'),
    v.literal('skipped')
  ),
  errorMessage: v.optional(v.string()),
  createdAt: v.number(),
})
  .index('by_skill', ['skillId'])
  .index('by_slug', ['skillSlug'])
  .index('by_created', ['createdAt'])
  .index('by_status', ['status', 'createdAt'])

export default defineSchema({
  ...authTables,
  users,
  skills,
  souls,
  skillVersions,
  soulVersions,
  skillVersionFingerprints,
  soulVersionFingerprints,
  skillEmbeddings,
  soulEmbeddings,
  skillDailyStats,
  skillLeaderboards,
  skillStatBackfillState,
  comments,
  soulComments,
  stars,
  skillVotes,
  soulStars,
  auditLogs,
  apiTokens,
  rateLimits,
  githubBackupSyncState,
  userSyncRoots,
  userSkillInstalls,
  userSkillRootInstalls,
  cachedSkills,
  clawdhubSyncState,
  clerkUsers,
  botAgents,
  cachedSkillVotes,
  skillReviews,
  categorizationLogs,
})
