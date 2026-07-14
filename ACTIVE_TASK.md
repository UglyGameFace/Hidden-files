# Active Task

## Task
Make every category, method, and site-settings publish propagate through the entire owner application and every public surface without requiring manual refreshes or repeated back-and-forth.

## Status
Implementation is complete on `agent/site-wide-update-propagation`. Preview and production validation are pending.

## Scope
- Keep `src/data/site-settings.json` as the canonical persisted category registry.
- Synchronize category drafts between Categories and New Method in both directions.
- Synchronize categories published by an atomic method save back into the Categories panel without reloading the page.
- Preserve unrelated unpublished Control Center edits when a method save changes the published settings registry.
- Make already-open public pages detect any completed Vercel build and reload safely so navigation, category strips, filters, cards, guide pages, related guides, copy, and styling all move to the same build.
- Preserve authentication, existing methods, content, layout, status controls, category metadata, and atomic saves.

## Root Cause
- The owner application still had two runtime copies of the category registry with one-way synchronization.
- Publishing Categories refreshed New Method, but saving a category through New Method did not update the Categories panel state or its settings SHA.
- Categories created in one owner panel were not available as shared drafts in the other panel before publishing.
- Public freshness logic only detected newly registered guide IDs. A category-only publish, navigation change, homepage change, icon change, or other settings deployment left already-open public pages on old static HTML.
- The production registry currently contains only the three starter categories, confirming the category shown locally in New Method had not reached the canonical persisted registry.

## Changes
- Added native bidirectional category draft events owned by the two editor runtimes.
- Added published-settings consumption and safe draft rebasing in the Categories runtime.
- Made atomic method saves publish the returned full settings object and updated settings SHA through the shared runtime.
- Removed the page-level refresh-click synchronization bridge.
- Added deployed build identity to the public status API.
- Extended the public freshness runtime to detect every new Vercel build and safely reload open public pages while excluding owner editors.
- Added a site-wide propagation regression audit and updated category persistence coverage.

## Validation
- JavaScript syntax: pending Vercel preview.
- Existing repository audits: pending Vercel preview.
- Category persistence audit: pending Vercel preview.
- Category icon audit: pending Vercel preview.
- Site-wide propagation audit: pending Vercel preview.
- Astro check: pending Vercel preview.
- Production build: pending Vercel preview.
- Vercel preview: pending.
- Vercel production: pending merge.

## Cleanup
- The old page-shell refresh bridge was removed.
- No second persisted registry, fallback category list, browser-cache workaround, raw SVG path, or weakened password gate was added.
- Owner pages are excluded from automatic deployment reloads so unsaved forms are never interrupted.

## Blockers
- None known in code. Deployment validation remains.

## Backlog
- Empty. Do not move to another task until preview, merge, production deployment, and live category propagation verification pass.
