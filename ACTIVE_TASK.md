# Active Task

## Task
Add a safe custom-category system that integrates with the method editor and every public website surface.

## Required Behavior
- Create a category from the Control Center without editing code.
- Create and select a category while adding a method.
- Store one shared category definition: key, full label, short label, description, icon, accent, visibility, and order.
- Use the category automatically in the method editor, homepage strip, filters, desktop navigation, mobile navigation, guide cards, guide pages, counts, search, related guides, and preview.
- Save a new category and its first method together so the site never builds a guide that references a missing category.
- Keep existing categories and guide content unchanged.

## Safety
- Category keys must be safe lowercase slugs.
- Existing built-in categories remain available and cannot disappear through malformed input.
- Unknown manually edited categories must receive a safe fallback instead of crashing a build.
- Category creation must not add duplicate data sources or hard-coded follow-up edits.

## Validation
- Repository audit.
- Astro type check.
- Astro production build.
- Vercel preview deployment.
- Production deployment.
- Create-category and create-method workflow verification.

## Blockers
- None.

## Backlog
- Empty. Do not move to unrelated work before this category workflow is deployed and verified.
