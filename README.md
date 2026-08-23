# ClawdTM

> [!IMPORTANT]
> ## 🗄️ This project is archived
>
> **ClawdTM was sunset in August 2026 and is no longer running.** The Convex
> backend has been decommissioned and the paid plan cancelled, so the catalog
> sync, security scanner, and public API are all gone. clawdtm.com now serves a
> static archive notice.
>
> The repository is preserved read-only as a reference. The code will not build
> into a working app without standing up a fresh Convex deployment first — see
> [Reviving this project](#reviving-this-project) below.


**Built by [@0xmythril](https://x.com/0xmythril)** · Based on [OpenClaw](https://openclaw.ai/) · [Clawdhub](https://clawdhub.com)

---

**Vetted skills for your OpenClaw** — a web app to browse, search, and install community skills from [Clawdhub](https://clawdhub.com) for [OpenClaw](https://openclaw.ai/).

**What it is:** A curated skill directory and installer for OpenClaw. Skills are community-built add-ons (tools, workflows, integrations). This app syncs the catalog from Clawdhub, adds security scanning and moderation, and lets users search and filter by category, tags, ratings, and security level. Think "npm for OpenClaw" with a safety layer on top.

- **Stack:** Next.js 16 (App Router), React 19, Convex, Tailwind 4
- **Data:** Skills synced from Clawdhub API into Convex; categories/tags; full-text search; security scores and risk levels
- **UI:** Sidebar filters (ratings, security, tags), search bar, card/list view, install modal, mobile bottom nav, About (learn) section
- **API:** Public HTTP API at `/api/v1/skills/search` and `/api/v1/skills/install` for the Skill Advisor; search excludes high/critical risk by default; install blocks low-score skills unless `acknowledge_risk=true`

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
  app/           # Next App Router: pages, layouts, API routes (v1 skills, advisor, review)
  components/   # Sidebar, SearchBar, SkillCard, InstallModal, mobile nav, UI primitives
  lib/          # analytics (GA4), utils
convex/
  clawdhubSync.ts   # Clawdhub API sync, GitHub author sync, removed-skill detection, cached skills CRUD
  categorization.ts # Logic-based category/tag assignment (cron)
  security.ts      # AI security scanning, risk scoring, auto-hide low-score skills, rescan state
  crons.ts         # Sync (2h), categorization (4h), GitHub author sync (2h), security scan (5m), commit check (15m)
  schema.ts        # Convex schema (cachedSkills, clawdhubSyncState, securityRescanState, etc.)
  lib/             # openrouter (AI scan), virustotal, embeddings
public/         # Favicons, logo, static assets
```

## Architecture

- **Frontend:** Main skills page with URL state for `q`, `category`, `sort`, `tags`, `security`; Convex `useQuery` for categories, tags, sync status, paginated skill list, and search. About (learn) section for docs; admin panel for security dashboard, authors, moderation.
- **Backend:** Convex tables `cachedSkills`, `clawdhubSyncState`, `securityRescanState`, `securityScanLogs`, etc. Skills are synced from Clawdhub; authors are enriched from the OpenClaw GitHub skills tree; skills removed from that tree are auto-hidden. Security scanning (AI + optional VirusTotal) scores each skill 0–100; skills below 50 are auto-hidden. Public Convex API: `getCategories`, `getTags`, `getSyncStatus`, `listCachedSkillsWithFilters`, `searchCachedSkills` (see [convex/README.md](convex/README.md)). Public HTTP API: `/api/v1/skills/search`, `/api/v1/skills/install` (default: exclude high/critical risk; install blocks low-score unless `acknowledge_risk=true`).

## Analytics

GA4 via `@next/third-parties` and `src/lib/analytics.ts`. Events: search, category/tag filters, sort, view mode, load more, skill install, external links. Set `NEXT_PUBLIC_GA_MEASUREMENT_ID` if you use GA4.

## Deploy

- **Frontend:** Vercel (or any Next.js host). Point to your Convex deployment.
- **Backend:** Convex (`npx convex deploy`). Crons and env are configured in the Convex dashboard.

Do not commit `.env*`; `.notes/` is gitignored for local/private notes.

---

**Author / Credits** — Built by [@0xmythril](https://x.com/0xmythril)

## Reviving this project

Everything needed to bring ClawdTM back is still in this repo. What is *not* in
the repo is the data — the Convex deployment held ~36 tables of synced skills,
security scores, votes, and reviews. If a final `npx convex export` zip was
kept before shutdown, restore from that; otherwise a revived instance starts
empty and repopulates from the ClawdHub sync.

1. Create a new Convex project and run `npx convex deploy`.
2. Set `NEXT_PUBLIC_CONVEX_URL` and `CONVEX_DEPLOYMENT` in `.env.local`.
3. Set `OPENROUTER_API_KEY`, `GITHUB_TOKEN`, and `SECURITY_SCAN_MODEL` in the
   Convex dashboard (Settings → Environment Variables).
4. Restore the commented-out jobs in `convex/crons.ts` to resume catalog sync,
   categorization, and security scanning.
5. Add Clerk keys if you want voting and reviews.
6. Restore data with `npx convex import` from the export zip, or let the
   ClawdHub sync cron repopulate from scratch.

Be aware that the crons are what generate ongoing cost: the security scanner
calls OpenRouter and the commit checker polls the GitHub API, both on 15-minute
intervals by default.

## The sunset page

`sunset/` holds the static page now served at clawdtm.com — a single
`index.html` with no build step and no backend, deployed as its own Vercel
project so it never rebuilds against the dead Convex deployment.

