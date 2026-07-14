# Active Task

## Task
Expand the category icon system so the Categories panel and New Method creator offer a useful site-matched icon library plus safe custom SVG upload, while every public surface keeps icons flush and consistently sized.

## Status
Implementation is complete on `agent/expand-category-icons`. Repository, Astro, preview, and production validation are pending.

## Scope
- Replace the six-option category icon list with one shared outline icon registry suited to deals, food, gaming, cashback, delivery, retail, and web methods.
- Offer the same choices in Categories and the inline New Method category creator.
- Allow a custom path-based SVG icon without storing arbitrary executable SVG markup.
- Center and scale preset and custom icons into the same fixed square slot on owner previews, the homepage, cards, desktop navigation, mobile navigation, and guide pages.
- Preserve all existing categories, methods, authentication, layout, accents, visibility, and publishing behavior.

## Root Cause
- Category creation exposed only six hard-coded choices.
- The owner interface represented them with rough Unicode glyphs, while the public site used separate SVG path definitions.
- Icon choices therefore looked inconsistent and there was no supported custom icon format or upload path.

## Changes
- Added one shared registry with more than twenty site-matched outline icons.
- Made both owner category creators consume that registry instead of separate option lists.
- Added sanitized custom SVG upload that stores only a validated viewBox and path data.
- Added fixed-size, proportion-preserving SVG rendering across every category surface.
- Added regression audits for registry size, persistence, unsafe SVG rejection, upload hooks, shared rendering, and fixed dimensions.

## Validation
- JavaScript syntax: pending preview execution.
- Existing repository audits: pending preview execution.
- Category persistence audit: pending preview execution.
- Category icon audit: pending preview execution.
- Astro check: pending preview execution.
- Production build: pending preview execution.
- Vercel preview: pending.
- Vercel production: pending merge.

## Cleanup
- No Unicode fallback registry remains in the active owner runtimes.
- No second category registry, raw SVG storage, external icon service, or local-only upload state was added.
- Existing category values remain valid and unchanged.

## Blockers
- None known in code. Deployment validation remains.

## Backlog
- Empty. Do not move to another task until preview, merge, production deployment, and live owner icon verification pass.
