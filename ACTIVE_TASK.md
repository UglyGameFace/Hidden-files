# Active Task

## Task
Make guide loading, publishing, and public-site freshness feel immediate with one managed guide and continue scaling cleanly as more guides are added.

## Status
Completed and deployed to production.

## Root Cause
- The authenticated guide endpoint previously downloaded every Markdown file before filtering to one managed guide.
- Public homepage, guide pages, and navigation previously requested the same live-status data separately.
- Desktop and mobile navigation each loaded the guide collection during every page build.
- Every guide page queried the full collection again for related guides.
- Stable public script URLs could remain stale in an already-open browser tab after a deployment.
- An open homepage could not detect that a newly registered guide had finished publishing, making manual refresh feel necessary.

## Fix
- `src/data/deal-status.json` is the managed-guide registry in the Control Center.
- Normal owner loading fetches only registered guide IDs.
- Homepage cards, guide pages, desktop navigation, and mobile navigation share one cached live-status runtime.
- Build-time status is bootstrapped into the page for immediate first paint.
- Public guide navigation loads once per rendered page and is passed to desktop and mobile menus.
- Guide routes and related-guide cards build from one content-collection pass.
- Public scripts are versioned with the deployment commit.
- Public HTML and stable scripts revalidate while hashed Astro assets remain immutable.
- An idle homepage can detect a newly registered active guide and revalidate automatically with bounded retries.
- No guide wording, method content, public design, category structure, or status rules changed.

## Validation
- Repository integrity audit: passed.
- Astro type check: passed.
- Astro production build: passed.
- Vercel preview deployment: passed.
- Vercel production deployment: passed.
- Production commit: `fdd61e1e87a936d9ff203df2bfd28399e3846551`.

## Cleanup
- No duplicate data source, service worker, global fetch patch, or permanent cache bypass.
- Automatic homepage revalidation is bounded and avoids interrupting scrolling or text input.
- Archived demo files remain excluded from normal guide loading and public routes.
- Redundant collection loads were removed instead of hidden behind another cache layer.

## Blockers
- None.

## Backlog
- Empty. A new task must be explicitly selected before changing unrelated behavior.
