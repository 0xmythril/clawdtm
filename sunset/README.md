# ClawdTM — sunset page

Static replacement for what used to run at clawdtm.com. No build step, no backend,
no Convex. One `index.html` plus favicons.

Deployed as its own Vercel project so it never rebuilds against the decommissioned
Convex deployment:

```bash
cd sunset
vercel deploy --prod
```

Then point the `clawdtm.com` domain at this project in the Vercel dashboard and
delete (or disconnect) the old `clawdtm` Next.js project.
