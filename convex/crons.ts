import { cronJobs } from 'convex/server'
import { internal } from './_generated/api'

const crons = cronJobs()

crons.interval(
  'github-backup-sync',
  { minutes: 30 },
  internal.githubBackupsNode.syncGitHubBackupsInternal,
  { batchSize: 50, maxBatches: 5 },
)

crons.interval(
  'trending-leaderboard',
  { minutes: 60 },
  internal.leaderboards.rebuildTrendingLeaderboardInternal,
  { limit: 200 },
)

crons.interval(
  'skill-stats-backfill',
  { minutes: 10 },
  internal.statsMaintenance.runSkillStatBackfillInternal,
  { batchSize: 200, maxBatches: 5 },
)

crons.interval(
  'generate-static-index',
  { hours: 1 },
  internal.staticIndex.generateStaticIndex,
  {},
)

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
