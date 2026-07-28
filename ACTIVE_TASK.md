# Active Task

## Task
Build an authorized Whop-to-The-420-Lobby-Hacks forum-post importer for `https://the-420-lobby-hacks.vercel.app/` that preserves guide content and formatting exactly, uses the website's canonical category and method rules, prevents duplicates, and provides an easy draft-first approve/disapprove workflow.

## Status
Implementation is complete on `agent/whop-guide-importer` in draft PR #27. OAuth, forum discovery, exact-source and per-post decisions, formatting protection, deduplication, attachment review, hidden-draft imports, canonical category mapping, and Vercel-function consolidation are implemented and pass the full repository production build. Live OAuth acceptance and the Vercel preview remain blocked by external configuration and the current Vercel build-rate limit, so the PR must remain unmerged.

## Scope
- Use Whop OAuth 2.1 with PKCE; never collect or store a Whop password.
- Read only forum posts the authenticated Whop user can access through official Whop API endpoints.
- Suggest Black Box and Hidden Files by default, while allowing another exact group only after explicit owner approval.
- Provide clear, reversible Approve and Disapprove controls for exact group sources and individual posts.
- Preserve Unicode, emoji, punctuation, paragraph spacing, Markdown hard breaks, headings, lists, tables, links, blockquotes, and fenced code without accidental rewriting.
- Repair only deterministic transport defects; block ambiguous corruption, unsafe publishable HTML, dangerous links, or malformed code fences for review.
- Read categories from `src/data/site-settings.json`; do not create a duplicate or hard-coded category registry.
- Use the existing guide validation, automatic ordering, atomic GitHub write, status, Vercel publish, and responsive rendering paths.
- Store every import as a hidden draft first and never feature or publish it automatically.
- Track Whop source IDs and content fingerprints so reruns update changed drafts without creating duplicates.
- Import only posts the owner created or has explicit permission to republish.

## Findings
- The original method save path lacked explicit Unicode-corruption, dangerous-link, code-fence-balance, and exact round-trip verification.
- Existing Markdown normally preserved paragraphs, but there was no structural fingerprint to detect accidental paragraph collapse.
- Unsafe-content scanning must ignore literal examples inside fenced, indented, and inline code.
- Browser-submitted post bodies cannot be trusted; import requests must send IDs while the server re-fetches authoritative Whop posts.
- Whop attachment URLs may be private or temporary, so attachments require verification and unsafe files must remain flagged inside hidden drafts.
- Vercel Hobby direct-function limits required consolidating six browser-facing Whop routes into one function while keeping internal service modules separated.
- The website target was temporarily misidentified as another project. The owner confirmed `https://the-420-lobby-hacks.vercel.app/` is the correct production site.
- A hidden imported draft must be excluded at collection-load time on every public guide route, not merely hidden by client-side filtering.

## Changes
- Added shared guide-content integrity validation and exact serialize/parse round-trip verification.
- Added encrypted HttpOnly Whop OAuth sessions, PKCE state protection, refresh-token rotation, disconnect/revoke handling, and forum-only scopes.
- Added cursor-paginated forum-post discovery with exact source IDs and source metadata.
- Added persistent exact-source Approve/Disapprove policy with Black Box and Hidden Files suggestions plus optional additional groups.
- Added individual post Approve, Disapprove, Undo, Approve All, Disapprove All, exact preview, and visible decision counts.
- Made the import endpoint accept only approved source IDs and re-fetch posts from Whop before writing.
- Added attachment verification, review warnings, hidden-draft-only imports, deduplication, and atomic content/status/source-registry writes.
- Consolidated Whop browser routes behind `api/whop.js` and stable Vercel rewrites.
- Added permanent formatting, importer, and public-draft-isolation regressions to every check and production build.
- Corrected the implementation target, production URL, callback documentation, attachment warnings, browser storage namespace, and owner-facing branding to The 420 Lobby Hacks.

## Validation
- Official Whop OAuth, forum-post, experience, pagination, scope, and file-visibility contract check: passed against current Whop documentation.
- Guide-content integrity regression: passed.
- Source approval/disapproval and optional additional-group policy regression: passed.
- Individual post Approve/Disapprove/Undo/bulk-decision regression: passed.
- Authoritative server re-fetch and crafted-request rejection regression: passed.
- Duplicate/update fingerprint and atomic draft-write regression: passed.
- Public draft-isolation regression: passed for every Astro page loading the guide collection.
- Existing repository audits: passed.
- JavaScript syntax validation: passed.
- Astro check: passed.
- Production build: passed on GitHub Actions run `30376295296` at commit `2db121fdb968c58b30cecff111f3288b33cee1f6`.
- Direct Vercel API inventory: passed with 9 functions, below the 12-function Hobby limit.
- Pull-request mergeability/conflict check: passed; PR #27 is currently mergeable.
- Vercel preview: externally blocked because the account returned its build-rate-limit response; no preview deployment was created for the final commit.
- Live OAuth/import acceptance: pending production Whop credentials and exact callback registration.

## Cleanup
- No second category registry, alternate guide store, or replacement publishing path was added.
- Black Box and Hidden Files are suggestions, not an irreversible hard-coded lock; other exact sources require explicit approval.
- The browser cannot submit trusted content bodies for import.
- Existing guides, categories, status data, Control Center password behavior, and public design remain unchanged.
- Redundant Whop API functions were removed; six browser routes share one permanent `api/whop.js` function.
- Temporary validation workflow removal is the only remaining repository cleanup step.

## Blockers
- Configure `WHOP_CLIENT_ID`, `WHOP_TOKEN_SECRET`, `WHOP_REDIRECT_URI`, and `WHOP_OAUTH_SCOPES` in the production Vercel project.
- Register `https://the-420-lobby-hacks.vercel.app/api/whop-oauth-callback` in the Whop app.
- Wait for the Vercel account build-rate limit to clear, then require a successful preview before merge.
- Republishing requires ownership or explicit permission for the source posts.

## Backlog
- Empty. Do not switch tasks or merge until cleanup, production credentials, live OAuth acceptance, and a successful Vercel preview are complete.
