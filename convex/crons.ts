import { cronJobs } from 'convex/server'

// ─────────────────────────────────────────────────────────────────────────────
// ClawdTM is archived (August 2026). All scheduled jobs are disabled.
//
// These crons drove ongoing spend — ClawdHub catalog sync, GitHub author +
// commit polling, and AI security scanning via OpenRouter. They are left here,
// commented out, as a record of what ran and to make revival straightforward.
//
// To revive: restore the block below, re-provision a Convex deployment, and set
// OPENROUTER_API_KEY / GITHUB_TOKEN / SECURITY_SCAN_MODEL in the Convex dashboard.
// ─────────────────────────────────────────────────────────────────────────────

const crons = cronJobs()

// import { internal } from './_generated/api'
//
// // Sync skills from ClawdHub API every 2 hours
// crons.interval(
//   'clawdhub-skill-sync',
//   { hours: 2 },
//   internal.clawdhubSync.syncFromClawdHub,
//   { maxBatches: 5 },
// )
//
// // Categorize uncategorized skills every 4 hours
// crons.interval(
//   'logic-skill-categorization',
//   { hours: 4 },
//   internal.categorization.categorizeSkillsBatch,
//   { limit: 100 },
// )
//
// // Sync authors from GitHub tree (bulk match)
// crons.interval(
//   'github-author-sync',
//   { hours: 2 },
//   internal.clawdhubSync.syncAuthorsFromGitHub,
// )
//
// // Security scan unscanned skills every 15 minutes
// crons.interval(
//   'security-scan-batch',
//   { minutes: 15 },
//   internal.security.scanBatch,
// )
//
// // Check GitHub commits for skill updates every 15 minutes
// crons.interval(
//   'github-commit-check',
//   { minutes: 15 },
//   internal.security.checkGitHubCommits,
// )

export default crons
