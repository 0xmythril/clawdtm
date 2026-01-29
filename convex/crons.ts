import { cronJobs } from 'convex/server'
import { internal } from './_generated/api'

const crons = cronJobs()

// Sync skills from ClawdHub API every 15 minutes
crons.interval(
  'clawdhub-skill-sync',
  { minutes: 15 },
  internal.clawdhubSync.syncFromClawdHub,
  { maxBatches: 5 },
)

// Categorize uncategorized skills every hour using logic-based rules
crons.interval(
  'logic-skill-categorization',
  { hours: 1 },
  internal.categorization.categorizeSkillsBatch,
  { limit: 200 },
)

// Enrich skills with author info from detail endpoint (runs after sync)
crons.interval(
  'clawdhub-author-enrichment',
  { minutes: 30 },
  internal.clawdhubSync.enrichSkillAuthors,
  { limit: 50 },
)

export default crons
