# Convex backend (clawdtm)

Convex functions and schema for the Superskill app. Data lives in Convex; skills are synced from [Clawdhub](https://clawdhub.com) and served via queries.

## Tables used by this app

- **cachedSkills** — Skills synced from Clawdhub API. Fields: `slug`, `name`/`displayName`, `description`, `author`, `downloads`, `stars`, `installs`, `tags`, `category`, `lastSyncedAt`, `hidden` (moderation). Search index: `search_name_desc` on `slug` with filter `category`.
- **clawdhubSyncState** — Single row `key: 'skills'`. Tracks `cursor`, `status` (idle/running/error), `lastFullSyncAt`, `totalSynced`, `categoryCounts`, `tagCounts`, `totalVisible` (cached counts for fast UI).
- **categorizationLogs** — Logs for AI/logic categorization (skillId, assignedCategory, assignedTags, reasoning, model, status).

Other tables in `schema.ts` (users, skills, souls, embeddings, etc.) are for a larger Convex product; this app only reads/writes the above.

## Public API (used by the frontend)

All from `api.clawdhubSync`:

| Function | Type | Purpose |
|----------|------|---------|
| `getCategories` | query | Returns `{ categories: string[] }` (with counts from sync state). |
| `getTags` | query | Returns `{ tags: { tag: string; count: number }[] }`. |
| `getSyncStatus` | query | Returns sync state: `status`, `totalCached`, `lastFullSyncAt`, etc. |
| `listCachedSkillsWithFilters` | query | Paginated list. Args: `limit`, `cursor`, `sortBy` (downloads/stars/installs), `category`, `tags[]`. Returns `{ skills, nextCursor, hasMore, totalCount }`. |
| `searchCachedSkills` | query | Full-text search on cached skills. Args: `query`, `limit`, `sortBy`. Returns `{ skills }`. |

Use in React: `useQuery(api.clawdhubSync.getCategories, {})`, etc.

## Clawdhub sync (`clawdhubSync.ts`)

- **Source:** `https://clawdhub.com/api/v1/skills` (paginated, cursor-based).
- **Cron:** `clawdhub-skill-sync` runs every **15 minutes** (see `crons.ts`), calls `syncFromClawdHub` with `maxBatches: 5`.
- **Flow:** Cron triggers internal action → fetches batch → upserts into `cachedSkills` via `upsertCachedSkill` → updates `clawdhubSyncState`. When a full sync completes, `updateCachedCounts` recomputes category/tag counts and stores them in sync state so `getCategories`/`getTags` avoid full table scans.
- **Internal pieces:** `initSyncState`, `updateSyncState`, `upsertCachedSkill`, `getSyncState`, `getCachedSkillByExternalId`, `syncSkillsBatch`, `syncFromClawdHub`, `updateCachedCounts`.

## Categorization (`categorization.ts`)

- **Cron:** `logic-skill-categorization` runs every **1 hour** (see `crons.ts`), calls `categorizeSkillsBatch` with `limit: 200`.
- **Logic:** Keyword-based rules in `CATEGORY_KEYWORDS` map terms to categories (e.g. `dev-tools`, `automation`, `ai-ml`). Uncategorized skills get a pass over name/description/summary/tags; first matching category wins. Writes back to `cachedSkills.category` and logs to `categorizationLogs`.

## Crons (`crons.ts`)

| Cron name | Schedule | Function | Args |
|-----------|----------|----------|------|
| `clawdhub-skill-sync` | Every 15 min | `internal.clawdhubSync.syncFromClawdHub` | `{ maxBatches: 5 }` |
| `logic-skill-categorization` | Every 1 hour | `internal.categorization.categorizeSkillsBatch` | `{ limit: 200 }` |

## Convex CLI

From project root:

- `npx convex dev` — Run Convex in dev (syncs functions + data).
- `npx convex deploy` — Deploy to production.
- `npx convex dashboard` — Open dashboard.
- `npx convex -h` — List commands.
- `npx convex docs` — Open Convex docs.

See also: [Convex functions](https://docs.convex.dev/functions), [Convex database](https://docs.convex.dev/database).
