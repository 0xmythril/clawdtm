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

// Categorize uncategorized skills every hour using AI
crons.interval(
  'ai-skill-categorization',
  { hours: 1 },
  internal.categorization.categorizeSkillsBatch,
  { limit: 20 },
)

export default crons
