# Active Task

## Task
Fix custom-category persistence from the password-gated Categories panel through publishing, reload, New Method, method saving, and every public category surface.

## Status
Implementation complete on `agent/fix-custom-category-persistence`. Preview and production validation are pending.

## Scope
- Preserve one canonical category registry in `src/data/site-settings.json`.
- Preserve all existing methods, category metadata, visibility behavior, authentication, and public layout.
- Make a published custom category immediately available to New Method without requiring a manual browser refresh.
- Validate sanitizer round trips, method validation, Astro content validation, atomic saves, and public registry consumers.

## Findings
- The server sanitizer already preserved valid unknown category keys and all supported metadata.
- The settings POST endpoint already wrote the complete sanitized registry to `src/data/site-settings.json`.
- The settings GET endpoint already returned the persisted registry.
- The method editor copied categories into its private `state.categories` only during its initial `loadGuides()` call.
- Publishing from the Categories panel updated `window.LobbySettingsRuntime`, but the method editor did not consume the resulting `lobby-settings-loaded` event.
- New Method therefore continued rendering the stale boot-time category copy even after a successful category publish.

## Changes
- Added a page-level synchronization bridge that detects a changed published category registry and invokes the existing canonical method/settings reload path.
- Kept the API-backed settings registry as the only source of truth; no fallback category list or second registry was added.
- Added `tools/audit-category-persistence.mjs` with the `gaming-deals` regression case.
- Added the category persistence audit to every repository audit/check/build.

## Validation
- Custom sanitizer preservation: implemented; pending Vercel execution.
- Serialize/save/reload round trip: implemented; pending Vercel execution.
- New Method picker synchronization: implemented; pending Vercel execution.
- Method validation and atomic category/method/status save: covered; pending Vercel execution.
- Temporary Astro guide using `gaming-deals`: covered; pending Vercel execution.
- Existing repository audits: pending Vercel preview.
- Astro check: pending Vercel preview.
- Production build: pending Vercel preview.
- Vercel preview: pending.
- Vercel production: pending merge.

## Cleanup
- No submitted method title, description, body, or existing category data changed.
- No authentication, password, layout, or unrelated feature changed.
- No monkey patch, duplicate registry, fallback array, or local-only persistence path added.

## Blockers
- None in code. Deployment checks remain.

## Backlog
- Empty. Do not move to another task until preview, merge, production deployment, and live category workflow verification pass.
