# Active Task

## Task
Make the public website and private Control Center use one consistent layout system across phones, tablets, laptops, and desktops while preserving the terminal style and all existing method content.

## Scope
- Align gutters, surface radii, control heights, panel padding, and section spacing across the public homepage, guide pages, navigation, footer, and owner application.
- Remove repeated owner headings and redundant unlocked hero content.
- Keep command actions, section cards, forms, categories, and appearance choices balanced at tablet and mobile widths.
- Preserve all method wording, category data, authentication, live status, publishing, terminal styling, and public content.

## Findings
- The unlocked Control Center still displayed a marketing hero above its real command header.
- Command links and buttons followed different flex sizing, leaving Lock alone on a full-width row.
- Section navigation geometry was owned by both `control-center.css` and `navigation-buttons.css`.
- Tablet layouts showed eight owner sections as four tall two-column rows.
- Methods used a different outer surface than the other seven sections.
- Panel kickers repeated the selected section name already displayed in the command bar.
- Appearance density controls produced an orphaned final card.
- Public sections used several different horizontal gutters, control radii, and card radii.
- Select controls did not share the same styling as text fields.

## Fix
- Add `src/styles/layout-system.css` as the final canonical layout owner.
- Use shared gutter, radius, control-height, and surface-padding tokens.
- Hide the marketing hero only after the owner application is unlocked.
- Use a two-row command header with equal action cells.
- Use 8/4/2/1 section grids for desktop/tablet/mobile/tiny-phone widths.
- Give Methods and settings panels the same surface geometry.
- Preserve two-column forms on tablets and move to one column on phones.
- Keep color choices balanced and density choices in a three-column row on tablets.
- Replace repeated panel kickers with descriptive hierarchy labels.
- Remove Control Center geometry from navigation-only CSS.
- Add a build audit that rejects competing layout ownership.

## Validation
- Layout consistency audit: pending Vercel preview.
- Existing repository audit: pending Vercel preview.
- Password-gated posting audit: pending Vercel preview.
- Control Center section audit: pending Vercel preview.
- Astro type check: pending Vercel preview.
- Astro production build: pending Vercel preview.
- Vercel production deployment: pending merge.
- Tablet screenshot comparison and live interaction verification: pending deployment.

## Cleanup
- No method body, title, category, status, authentication, or publishing behavior changed.
- No `!important`, monkey patch, duplicate tab runtime, or additional raw browser script added.
- Terminal styling remains intact.

## Blockers
- None in code.

## Backlog
- Empty. Stay on this task until preview, production, and live layout verification pass.
