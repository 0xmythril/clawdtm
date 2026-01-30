# ClawdTM

**Built by [@0xmythril](https://x.com/0xmythril)** · Based on [OpenClaw](https://openclaw.ai/) · [Clawdhub](https://clawdhub.com)

---

**Superskill your ~~Clawdbot~~ OpenClaw** — a web app to browse, search, and install community skills from [Clawdhub](https://clawdhub.com) for [OpenClaw](https://openclaw.ai/).

**What it is:** A public skill catalog and installer for OpenClaw. Skills are community-built add-ons (tools, workflows, integrations). This app syncs the catalog from Clawdhub, lets users search and filter by category/tags, and provides install instructions. Think “npm for OpenClaw” or “skill store.”

- **Stack:** Next.js 16 (App Router), React 19, Convex, Tailwind 4
- **Data:** Skills synced from Clawdhub API into Convex; categories/tags; full-text search
- **UI:** Sidebar filters (category, tags), search bar, card/list view, install modal, mobile bottom nav

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Convex (required)

1. [Convex](https://convex.dev) account and project
2. `npx convex dev` in a separate terminal (or `npx convex deploy` for prod)
3. Env: `.env.local` with `NEXT_PUBLIC_CONVEX_URL` (and any Convex env vars you need)

The app reads from Convex only; no Convex = no skills data. Sync from Clawdhub runs on Convex crons.

## Scripts

| Command        | Description                    |
|----------------|--------------------------------|
| `npm run dev`  | Next.js dev server             |
| `npm run build`| Production build               |
| `npm run start`| Run production server          |
| `npm run lint` | ESLint                         |

Run Convex CLI from project root: `npx convex dev`, `npx convex deploy`, `npx convex dashboard`, etc.

## Project layout

```
src/
  app/           # Next App Router: page, layout, providers, meta images
  components/    # Sidebar, SearchBar, SkillCard, InstallModal, mobile nav, UI primitives
  lib/           # analytics (GA4), utils
convex/
  clawdhubSync.ts   # Clawdhub API sync, cached skills CRUD, public queries
  categorization.ts # Logic-based category/tag assignment (cron)
  crons.ts          # Cron definitions (sync every 15m, categorization every 1h)
  schema.ts         # Convex schema (cachedSkills, clawdhubSyncState, etc.)
  lib/embeddings.ts # Embedding config (for future semantic search)
public/         # Favicons, logo, static assets
```

## Architecture

- **Frontend:** Single main page; URL state for `q`, `category`, `sort`, `tags`; Convex `useQuery` for categories, tags, sync status, paginated skill list, and search.
- **Backend:** Convex tables `cachedSkills` and `clawdhubSyncState`. Cron `clawdhub-skill-sync` runs every 15 minutes and pulls from `https://clawdhub.com/api/v1/skills` (paginated); another cron runs logic-based categorization hourly. Public API: `getCategories`, `getTags`, `getSyncStatus`, `listCachedSkillsWithFilters`, `searchCachedSkills` (see [convex/README.md](convex/README.md)).

## Analytics

GA4 via `@next/third-parties` and `src/lib/analytics.ts`. Events: search, category/tag filters, sort, view mode, load more, skill install, external links. Set `NEXT_PUBLIC_GA_MEASUREMENT_ID` if you use GA4.

## Deploy

- **Frontend:** Vercel (or any Next.js host). Point to your Convex deployment.
- **Backend:** Convex (`npx convex deploy`). Crons and env are configured in the Convex dashboard.

Do not commit `.env*`; `.notes/` is gitignored for local/private notes.

---

**Author / Credits** — Built by [@0xmythril](https://x.com/0xmythril)
