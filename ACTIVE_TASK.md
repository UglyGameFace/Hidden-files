# Active Task

## Task
Fix custom-category persistence from the password-gated Categories panel through publishing, reload, New Method, method saving, and every public category surface.

## Status
Completed, merged through PR #21, and deployed to production.

## Scope
- Preserve one canonical category registry in `src/data/site-settings.json`.
- Preserve all existing methods, category metadata, visibility behavior, authentication, and public layout.
- Make a published custom category immediately available to New Method without requiring a manual browser refresh.
- Validate sanitizer round trips, method validation, Astro content validation, atomic saves, and public registry consumers.

## Root Cause
- The server sanitizer already preserved valid unknown category keys and all supported metadata.
- The settings POST endpoint already wrote the complete sanitized registry to `src/data/site-settings.json`.
- The settings GET endpoint already returned the persisted registry.
- The method editor copied categories into its private `state.categories` only during its initial `loadGuides()` call.
- Publishing from the Categories panel updated `window.LobbySettingsRuntime`, but the method editor did not consume the resulting `lobby-settings-loaded` event.
- New Method therefore continued rendering the stale boot-time category copy even after a successful category publish.

## Fix
- Added a page-level synchronization bridge that detects a changed published category registry and invokes the existing authenticated method/settings reload path.
- Kept the API-backed settings registry as the only source of truth; no fallback category list or second registry was added.
- Added `tools/audit-category-persistence.mjs` with the `gaming-deals` regression case.
- Added a non-public Astro content fixture using `gaming-deals` so Astro check and production build validate the non-default category path.
- Added the category persistence audit to every repository audit/check/build.

## Validation
- Custom sanitizer preservation: passed.
- Serialize/save/reload round trip: passed.
- New Method picker synchronization audit: passed.
- Method validation and atomic category/method/status save audit: passed.
- Astro guide using `gaming-deals`: passed Astro validation and production build.
- Existing repository audits: passed.
- Astro check: passed.
- Production build: passed.
- Vercel preview deployment: passed on PR #21.
- PR #21 merged with production commit `0fef5d757b884f52b425c96344631613a5c4d2ab`.
- Vercel production deployment for the merged commit: passed.

## Cleanup
- No submitted method title, description, body, or existing category data changed.
- No authentication, password, layout, or unrelated feature changed.
- No monkey patch, duplicate registry, fallback array, or local-only persistence path added.
- The regression guide remains non-managed and draft-only, so it cannot appear on public routes or in owner-managed methods.

## Blockers
- None.

## Backlog
- Empty. A new task must be explicitly selected before changing unrelated behavior.
