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

// Enrich skills with author info every 2 hours (reduced from 30 min)
crons.interval(
  'clawdhub-author-enrichment',
  { hours: 2 },
  internal.clawdhubSync.enrichSkillAuthors,
  { limit: 50 },
)

export default crons
