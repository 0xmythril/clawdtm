# Convex backend (clawdtm)

Convex functions and schema for the Superskill app. Data lives in Convex; skills are synced from [Clawdhub](https://clawdhub.com) and served via queries.

## Tables used by this app

- **cachedSkills** — Skills synced from Clawdhub API. Fields: `slug`, `name`/`displayName`, `description`, `author`, `downloads`, `stars`, `installs`, `tags`, `category`, `lastSyncedAt`; moderation: `hidden`, `hiddenReason`, `hiddenAt`, `hiddenBy` (e.g. `system:security-scanner`, `system:registry-removal`, or moderator id); security: `securityScore` (0–100), `securityRisk`, `securityFlags`, `lastSecurityScanAt`, `vtAnalysisUrl`. Search index includes `category` and `hidden` filter.
- **clawdhubSyncState** — Single row `key: 'skills'`. Tracks `cursor`, `status` (idle/running/error), `lastFullSyncAt`, `totalSynced`, `categoryCounts`, `tagCounts`, `totalVisible` (cached counts for fast UI).
- **categorizationLogs** — Logs for logic-based categorization (skillId, assignedCategory, assignedTags, reasoning, model, status).
- **securityRescanState** — Single row `key: 'full_rescan'`. Tracks full security rescan progress: `status`, `scannedCount`, `totalSkills`, `triggeredBy`, `lastError`.
- **securityScanLogs** — Per-skill scan results: `securityScore`, `riskLevel`, `flags`, `summary`, `reasoning`, VirusTotal fields, `model`, `status`.
- **gitHubCommitSyncState** — Tracks last processed GitHub commit for detecting skill repo changes and triggering rescans.
- **adminAuditLogs** — Moderation audit trail: hide/unhide, set featured/verified, role changes, etc.

Other tables in `schema.ts` (users, skills, souls, embeddings, etc.) are for a larger Convex product; this app only reads/writes the above.

## Public API (used by the frontend)

**Clawdhub sync** (`api.clawdhubSync`):

| Function | Type | Purpose |
|----------|------|---------|
| `getCategories` | query | Returns `{ categories: string[] }` (with counts from sync state). |
| `getTags` | query | Returns `{ tags: { tag: string; count: number }[] }`. |
| `getSyncStatus` | query | Returns sync state: `status`, `totalCached`, `totalHidden`, `lastFullSyncAt`, etc. |
| `listCachedSkillsWithFilters` | query | Paginated list. Args: `limit`, `cursor`, `sortBy`, `category`, `tags[]`, etc. Excludes hidden skills by default. |
| `searchCachedSkills` | query | Full-text search. Args: `query`, `limit`, `sortBy`, `minSecurityScore` (optional). Returns `{ skills }`. Excludes hidden and, by default, high/critical risk. |

**Security** (`api.security`): `getSecurityStats` (admin dashboard: total, visible, hidden, risk breakdown), `getRescanStatus`, `getSkillsByRiskLevel`, `getSkillsByScoreRange`, `triggerFullRescan`, etc. Admin-only mutations for manual scan and hide/unhide.

Use in React: `useQuery(api.clawdhubSync.getCategories, {})`, etc.

## Clawdhub sync (`clawdhubSync.ts`)

- **Source:** `https://clawdhub.com/api/v1/skills` (paginated, cursor-based).
- **Cron:** `clawdhub-skill-sync` runs every **2 hours**, calls `syncFromClawdHub` with `maxBatches: 5`.
- **Flow:** Cron triggers internal action → fetches batch → upserts into `cachedSkills` via `upsertCachedSkill` → updates `clawdhubSyncState`. When a full sync completes, `updateCachedCounts` recomputes category/tag counts and `totalVisible` so `getCategories`/`getTags`/`getSyncStatus` avoid full table scans.
- **GitHub author sync:** Cron `github-author-sync` runs every 2 hours and calls `syncAuthorsFromGitHub`, which fetches the OpenClaw skills tree from GitHub, matches slugs to cached skills, and updates `author`. It also runs **removed-skill detection**: skills no longer present in the GitHub tree are auto-hidden with `hiddenBy: 'system:registry-removal'` and `hiddenReason` set (with a safety threshold to avoid mass-hiding on bad data).
- **Internal pieces:** `initSyncState`, `updateSyncState`, `upsertCachedSkill`, `getSyncState`, `getCachedSkillByExternalId`, `syncSkillsBatch`, `syncFromClawdHub`, `updateCachedCounts`, `syncAuthorsFromGitHub`, `detectRemovedSkills`.

## Categorization (`categorization.ts`)

- **Cron:** `logic-skill-categorization` runs every **4 hours**, calls `categorizeSkillsBatch` with `limit: 100`.
- **Logic:** Keyword-based rules in `CATEGORY_KEYWORDS` map terms to categories (e.g. `dev-tools`, `automation`, `ai-ml`). Uncategorized skills get a pass over name/description/summary/tags; first matching category wins. Writes back to `cachedSkills.category` and logs to `categorizationLogs`.

## Security (`security.ts`)

- **Scanning:** AI (OpenRouter, model configurable via `SECURITY_SCAN_MODEL`) analyzes skill content; optional VirusTotal for URLs. Results stored in `securityScanLogs` and on `cachedSkills` (`securityScore`, `securityRisk`, `securityFlags`, `lastSecurityScanAt`). Skills with score below 50 are auto-hidden (`hiddenBy: 'system:security-scanner'`).
- **Crons:** `security-scan-batch` runs every 5 minutes and scans a batch of unscanned skills; `github-commit-check` runs every 15 minutes and rescans skills whose GitHub repo has new commits.
- **Full rescan:** Admins can trigger a full rescan via `triggerFullRescan`; progress is tracked in `securityRescanState` and advanced by a cron that runs `runFullRescanBatch`.
- **Queries:** `getSecurityStats` (total, visible, hidden, risk breakdown, hidden-by-reason), `getRescanStatus`, `getSkillsByRiskLevel`, `getSkillsByScoreRange`. Admin dashboard uses these to show the full picture including hidden skills.

## Crons (`crons.ts`)

| Cron name | Schedule | Function | Args |
|-----------|----------|----------|------|
| `clawdhub-skill-sync` | Every 2 hours | `internal.clawdhubSync.syncFromClawdHub` | `{ maxBatches: 5 }` |
| `logic-skill-categorization` | Every 4 hours | `internal.categorization.categorizeSkillsBatch` | `{ limit: 100 }` |
| `github-author-sync` | Every 2 hours | `internal.clawdhubSync.syncAuthorsFromGitHub` | — |
| `security-scan-batch` | Every 5 min | `internal.security.scanBatch` | — |
| `github-commit-check` | Every 15 min | `internal.security.checkGitHubCommits` | — |

## Convex CLI

From project root:

- `npx convex dev` — Run Convex in dev (syncs functions + data).
- `npx convex deploy` — Deploy to production.
- `npx convex dashboard` — Open dashboard.
- `npx convex -h` — List commands.
- `npx convex docs` — Open Convex docs.

See also: [Convex functions](https://docs.convex.dev/functions), [Convex database](https://docs.convex.dev/database).
