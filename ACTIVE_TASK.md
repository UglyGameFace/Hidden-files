# Active Task

## Task
Make guide loading, publishing, and public-site freshness feel immediate with one managed guide and continue scaling cleanly as more guides are added.

## Root Cause
- The authenticated guide endpoint previously downloaded every Markdown file before filtering to one managed guide.
- Public homepage, guide pages, and navigation previously requested the same live-status data separately.
- Desktop and mobile navigation each loaded the guide collection during every page build.
- Every guide page queried the full collection again for related guides.
- Stable public script URLs could remain stale in an already-open browser tab after a deployment.
- An open homepage could not detect that a newly registered guide had finished publishing, making manual refresh feel necessary.

## Fix
- Use `src/data/deal-status.json` as the managed-guide registry in the Control Center.
- Fetch only registered guide IDs during normal owner loading.
- Share one cached live-status runtime across the whole public site.
- Bootstrap the latest build-time status into the page so guide state is available immediately.
- Load public guide navigation once per rendered page and pass it to desktop and mobile menus.
- Build each guide route and its related guides from one content-collection pass.
- Version public scripts with the deployment commit and force HTML/script revalidation while keeping hashed Astro assets immutable.
- Let an idle homepage tab detect a newly registered active guide and revalidate automatically, with bounded retries.
- Do not change any guide wording, method content, public design, category structure, or status rules.

## Validation
- Repository integrity audit: pending preview build.
- Astro type check: pending preview build.
- Astro production build: pending preview build.
- Vercel production deployment: pending merge.
- Public first load, open-tab freshness, and guide navigation: pending deployment.

## Cleanup
- No duplicate data source, service worker, global fetch patch, or permanent cache bypass.
- Automatic homepage revalidation is bounded, only runs when a registered active guide is missing, and avoids interrupting scrolling or text input.
- Archived demo files remain excluded from normal guide loading and public routes.

## Blockers
- None in code.

## Backlog
- None. Stay on this task until preview, production, and live freshness verification pass.
