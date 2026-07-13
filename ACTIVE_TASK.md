# Active Task

## Task
Restore the eight Control Center section buttons so Methods, Homepage, Branding, Navigation, Categories, Community, Footer & SEO, and Appearance all open reliably on Samsung Internet and other browsers.

## Status
Completed and deployed to production.

## Root Cause
- The Control Center HTML was configured as no-store, but `/deal-desk.js` and `/control-center.js` used stable unversioned URLs.
- Samsung Internet could display the newest HTML and section cards while retaining an older browser script, leaving the visible buttons disconnected from the current page.
- The canonical section switcher also uses `CSS.escape`; a browser missing that API would throw before switching panels.

## Fix
- Version both Control Center scripts with the current deployment identifier.
- Add explicit Vercel revalidation headers for both scripts.
- Add a small `CSS.escape` compatibility guard before the canonical Control Center script executes.
- Keep one section-switch implementation in `public/control-center.js`; no duplicate fallback or monkey patch remains.
- Add a dedicated build audit for script versioning, revalidation, compatibility, section listeners, panel visibility, and duplicate-code prevention.

## Validation
- Repository audit: passed.
- Password-gated posting audit: passed.
- Control Center section audit: passed.
- Astro type check: passed.
- Astro production build: passed.
- Vercel preview deployment: passed.
- Vercel production deployment: passed.
- Production commit: `c20c31c766b4ac66724eb76abd9ff88ca986a7ab`.

## Cleanup
- A temporary duplicate section-switch file was removed before review.
- No guide content, category data, authentication behavior, or owner password was changed.

## Blockers
- None.

## Backlog
- Empty. Select the next task explicitly before changing unrelated behavior.
