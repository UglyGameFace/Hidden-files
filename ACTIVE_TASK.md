# Active Task

## Task
Remove manual sort-order management from normal method posting and assign guide placement automatically on the server.

## Status
Implementation is complete on `agent/automatic-method-order`. Preview and production validation are pending.

## Scope
- Remove the internal Sort order number from the New Method and Edit Method form.
- Automatically place each newly created managed method after the existing managed methods.
- Preserve the current placement when an existing method is edited.
- Keep featured methods ahead of non-featured methods as the homepage already does.
- Keep the internal order in guide frontmatter so public sorting remains deterministic.
- Preserve all existing methods, content, categories, authentication, publishing, status controls, and layout.

## Root Cause
- The method editor exposed the internal `order` frontmatter value as a normal owner input.
- Every blank method was initialized with the arbitrary value `20`, even though the owner did not need or intend to manage numeric ordering.
- The save API trusted the form value instead of owning placement itself.

## Changes
- Removed the visible Sort order field from the normal method form.
- Added a permanent server-side automatic-order helper with ten-point spacing.
- Made the save API ignore client order values, preserve an existing method's order, and calculate the next order from persisted managed guides for new methods.
- Added a regression audit covering hidden UI, automatic append behavior, existing-order preservation, server ownership, and homepage sorting.

## Validation
- JavaScript syntax: pending Vercel preview.
- Existing repository audits: pending Vercel preview.
- Automatic method order audit: pending Vercel preview.
- Astro check: pending Vercel preview.
- Production build: pending Vercel preview.
- Vercel preview: pending.
- Vercel production: pending merge.

## Cleanup
- No alternate order registry, client-only workaround, manual-refresh requirement, or compatibility patch was added.
- The existing public sorting path and guide frontmatter remain the single placement mechanism.

## Blockers
- None known in code. Deployment validation remains.

## Backlog
- Empty. Do not move to another task until preview, merge, and production deployment pass.
