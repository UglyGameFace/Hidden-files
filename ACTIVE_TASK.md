# Active Task

## Task
Add a safe custom-category system that integrates with the method editor and every public website surface.

## Status
Completed and deployed to production.

## Delivered
- Create a category from the Control Center Categories section without editing code.
- Create and select a category directly while adding a method.
- Store one shared category definition: key, full label, short label, description, icon, accent, visibility, and order.
- Use custom categories automatically in the method editor, dedicated picker, homepage strip, counts, filters, search, desktop navigation, mobile navigation, guide cards, guide pages, related guides, and preview.
- Save a new category, its first method, and its live-status registration together in one atomic GitHub commit.
- Preserve categories created from the method editor during concurrent website-settings publishing.
- Keep existing categories and guide content unchanged.

## Safety
- Category keys are validated safe lowercase slugs.
- The three starter categories remain protected defaults but are no longer the only allowed categories.
- Unknown manually edited categories receive safe fallback metadata instead of crashing the build.
- Custom categories are limited to validated icon and accent presets.
- Hidden categories remain available to older methods so archiving a category cannot break guide pages.
- The build audit rejects fixed-category allowlists, unsafe keys, missing metadata, disconnected public surfaces, and non-atomic category/method saves.

## Validation
- Repository audit: passed.
- Astro type check: passed.
- Astro production build: passed.
- Vercel preview deployment: passed.
- Vercel production deployment: passed.
- Production commit: `bb0e7115de5a798fd7188958ef2e5d7c1148aa8a`.

## Blockers
- None.

## Backlog
- Empty. Select the next task explicitly before changing unrelated behavior.
