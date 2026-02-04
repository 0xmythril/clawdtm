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
  hiddenBy: v.optional(v.string()), // clerkId or botAgentId
  
  // Curation - featured and verified status (managed by admins)
  isFeatured: v.optional(v.boolean()),
  featuredAt: v.optional(v.number()),
  featuredBy: v.optional(v.string()), // clerkId or botAgentId
  isVerified: v.optional(v.boolean()),
  verifiedAt: v.optional(v.number()),
  verifiedBy: v.optional(v.string()), // clerkId or botAgentId
  
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
  
  // Combined search field for full-text search (slug + name + description + author)
  searchText: v.optional(v.string()),
  // Normalized tags for efficient filtering
  normalizedTags: v.optional(v.array(v.string())),
  
  // Security scanning results
  securityScore: v.optional(v.number()),        // 0-100 (100 = safe)
  securityRisk: v.optional(v.union(
    v.literal('safe'),
    v.literal('low'),
    v.literal('medium'),
    v.literal('high'),
    v.literal('critical')
  )),
  securityFlags: v.optional(v.array(v.string())), // ["remote_execution", "obfuscated_code", etc.]
  lastSecurityScanAt: v.optional(v.number()),
  vtAnalysisUrl: v.optional(v.string()),         // Link to VirusTotal report (if scanned)
})
  .index('by_external_id', ['externalId'])
  .index('by_slug', ['slug'])
  .index('by_downloads', ['downloads'])
  .index('by_stars', ['stars'])
  .index('by_installs', ['installs'])
  .index('by_last_synced', ['lastSyncedAt'])
  .index('by_hidden', ['hidden'])
  .index('by_featured', ['isFeatured'])
  .index('by_verified', ['isVerified'])
  // Category filtering indexes (avoids full table scans)
  .index('by_category', ['category'])
  .index('by_category_downloads', ['category', 'downloads'])
  .index('by_category_stars', ['category', 'stars'])
  .index('by_category_installs', ['category', 'installs'])
  // Vote-based sorting (ClawdTM upvotes/downvotes)
  .index('by_clawdtm_votes', ['clawdtmUpvotes', 'clawdtmDownvotes'])
  // Rating-based sorting (for skills with reviews)
  .index('by_review_count', ['reviewCount'])
  // Author enrichment index (find skills needing author data)
  .index('by_author', ['author'])
  // Full-text search on combined searchText field
  .searchIndex('search_skills', {
    searchField: 'searchText',
    filterFields: ['category', 'hidden'],
  })
  // Security scanning indexes
  .index('by_security_risk', ['securityRisk'])
  .index('by_last_security_scan', ['lastSecurityScanAt'])

// Pre-computed sorted skill lists for fast queries
const skillSortCache = defineTable({
  // Sort key: "downloads", "stars", "rating", "reviews", "category:tools:downloads"
  sortKey: v.string(),
  // Pre-sorted array of skill IDs
  skillIds: v.array(v.id('cachedSkills')),
  // When this cache was last updated
  updatedAt: v.number(),
}).index('by_sort_key', ['sortKey'])

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
  // Role for access control
  role: v.optional(v.union(
    v.literal('user'),
    v.literal('moderator'),
    v.literal('admin')
  )),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index('by_clerk_id', ['clerkId'])
  .index('by_role', ['role'])

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
  
  // Role for access control (privileged bots can moderate)
  role: v.optional(v.union(
    v.literal('agent'),      // Regular bot (default)
    v.literal('moderator'),  // Can hide/unhide skills, set featured/verified
    v.literal('admin')       // Full access including user/bot management
  )),
  
  // Attribution - how the agent discovered ClawdTM
  // Common values: cli, clawdhub, other_bot, x_me, x_owner, friend, search
  source: v.optional(v.string()),
  
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

// Admin audit logs (tracks moderator/admin actions)
const adminAuditLogs = defineTable({
  // Actor identity - one of these will be set
  actorClerkId: v.optional(v.string()),     // Human moderator/admin
  actorBotAgentId: v.optional(v.id('botAgents')), // Bot moderator/admin
  actorType: v.union(v.literal('human'), v.literal('bot'), v.literal('system')),
  actorName: v.optional(v.string()),        // Cached name for display
  
  // Action performed
  action: v.union(
    v.literal('hide_skill'),
    v.literal('unhide_skill'),
    v.literal('hide_skills_by_author'),
    v.literal('unhide_skills_by_author'),
    v.literal('auto_block_author'),
    v.literal('set_featured'),
    v.literal('set_verified'),
    v.literal('set_user_role'),
    v.literal('set_bot_role'),
    v.literal('create_bot'),
    v.literal('revoke_bot')
  ),
  
  // Target of the action
  targetType: v.union(
    v.literal('skill'),
    v.literal('user'),
    v.literal('bot'),
    v.literal('author')
  ),
  targetId: v.string(),                     // slug for skills, clerkId for users, botAgentId for bots
  targetName: v.optional(v.string()),       // Cached name for display
  
  // Action-specific details
  details: v.optional(v.object({
    reason: v.optional(v.string()),         // For hide actions
    oldValue: v.optional(v.any()),          // Previous state
    newValue: v.optional(v.any()),          // New state
    count: v.optional(v.number()),          // For bulk operations
    triggerSkill: v.optional(v.string()),   // For auto-block: skill that triggered the action
    riskLevel: v.optional(v.string()),      // For auto-block: risk level that triggered the action
  })),
  
  createdAt: v.number(),
})
  .index('by_actor_human', ['actorClerkId', 'createdAt'])
  .index('by_actor_bot', ['actorBotAgentId', 'createdAt'])
  .index('by_action', ['action', 'createdAt'])
  .index('by_target', ['targetType', 'targetId', 'createdAt'])
  .index('by_created', ['createdAt'])

// Security scan logs (AI and VirusTotal analysis results)
const securityScanLogs = defineTable({
  skillId: v.id('cachedSkills'),
  skillSlug: v.string(),
  scanType: v.union(v.literal('ai'), v.literal('virustotal')),
  
  // Scan results
  securityScore: v.number(),                  // 0-100 (100 = safe)
  riskLevel: v.union(
    v.literal('safe'),
    v.literal('low'),
    v.literal('medium'),
    v.literal('high'),
    v.literal('critical')
  ),
  flags: v.array(v.string()),                 // ["remote_execution", "obfuscated_code", etc.]
  summary: v.string(),                        // Brief human-readable summary
  reasoning: v.string(),                      // Detailed AI reasoning
  
  // VirusTotal results (if scanType === 'virustotal')
  vtPositives: v.optional(v.number()),        // Number of engines flagging as malicious
  vtTotal: v.optional(v.number()),            // Total number of engines
  vtPermalink: v.optional(v.string()),        // Link to VT report
  vtScannedUrls: v.optional(v.array(v.string())), // URLs that were scanned
  
  // Metadata
  model: v.optional(v.string()),              // AI model used (e.g., "google/gemini-2.0-flash-001")
  durationMs: v.optional(v.number()),         // How long the scan took
  status: v.union(v.literal('success'), v.literal('error')),
  errorMessage: v.optional(v.string()),
  createdAt: v.number(),
})
  .index('by_skill', ['skillId', 'createdAt'])
  .index('by_slug', ['skillSlug', 'createdAt'])
  .index('by_scan_type', ['scanType', 'createdAt'])
  .index('by_risk_level', ['riskLevel', 'createdAt'])
  .index('by_created', ['createdAt'])

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
  skillSortCache,
  clawdhubSyncState,
  clerkUsers,
  botAgents,
  cachedSkillVotes,
  skillReviews,
  categorizationLogs,
  adminAuditLogs,
  securityScanLogs,
})
