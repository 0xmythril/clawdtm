import { cronJobs } from 'convex/server'
import { internal } from './_generated/api'

const crons = cronJobs()

// Sync skills from ClawdHub API every 2 hours (reduced from 15 min to save bandwidth)
// Each sync triggers reactive re-fetches for all connected clients
crons.interval(
  'clawdhub-skill-sync',
  { hours: 2 },
  internal.clawdhubSync.syncFromClawdHub,
  { maxBatches: 5 },
)

// Categorize uncategorized skills every 4 hours (reduced from 1 hour)
crons.interval(
  'logic-skill-categorization',
  { hours: 4 },
  internal.categorization.categorizeSkillsBatch,
  { limit: 100 },
)

// Enrich skills with author info every 6 hours (new skills are rare)
crons.interval(
  'clawdhub-author-enrichment',
  { hours: 6 },
  internal.clawdhubSync.enrichSkillAuthors,
  { limit: 50 },
)

// Security scan unscanned skills every 15 minutes (batch of 10)
crons.interval(
  'security-scan-batch',
  { minutes: 15 },
  internal.security.scanBatch,
)

// Rescan skills with old security scans every Sunday at 3am UTC
crons.weekly(
  'security-rescan-weekly',
  { dayOfWeek: 'sunday', hourUTC: 3, minuteUTC: 0 },
  internal.security.rescanOldSkills,
)

export default crons
