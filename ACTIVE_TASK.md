# Active Task

## Task
Build an authorized Whop-to-The-420-Lobby-Hacks forum-post importer for `https://the-420-lobby-hacks.vercel.app/` that preserves guide content and formatting exactly, uses the website's canonical category and method rules, prevents duplicates, and provides an easy draft-first approve/disapprove workflow.

## Status
Active on `agent/whop-guide-importer` in reopened draft PR #27. The previous PR closure was based on the incorrect assumption that the target was SniperPlug; the owner confirmed this existing The 420 Lobby Hacks website is the correct target. OAuth, forum discovery, source/post decisions, formatting protection, deduplication, hidden-draft imports, attachment review, and Vercel-function consolidation are implemented. Branding correction and final validation are in progress.

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
- The website target was temporarily misidentified as SniperPlug. The owner confirmed `https://the-420-lobby-hacks.vercel.app/` is the correct production site.

## Changes
- Added shared guide-content integrity validation and exact serialize/parse round-trip verification.
- Added encrypted HttpOnly Whop OAuth sessions, PKCE state protection, refresh-token rotation, disconnect/revoke handling, and forum-only scopes.
- Added cursor-paginated forum-post discovery with exact source IDs and source metadata.
- Added persistent exact-source Approve/Disapprove policy with Black Box and Hidden Files suggestions plus optional additional groups.
- Added individual post Approve, Disapprove, Undo, Approve All, Disapprove All, exact preview, and visible decision counts.
- Made the import endpoint accept only approved source IDs and re-fetch posts from Whop before writing.
- Added attachment verification, review warnings, hidden-draft-only imports, deduplication, and atomic content/status/source-registry writes.
- Consolidated Whop browser routes behind `api/whop.js` and stable Vercel rewrites.
- Added permanent formatting and importer regression audits to every check and production build.
- Reopened PR #27 and corrected the implementation target, production URL, callback documentation, and owner-facing branding to The 420 Lobby Hacks.

## Validation
- Guide-content integrity regression: passed.
- Existing repository audits: passed before the latest branding correction.
- Astro check and production build: passed before the latest branding correction.
- Whop importer audit, full build, API-function inventory, Vercel preview, and changed-file inspection: pending rerun on the corrected target branch.
- Live OAuth/import acceptance: pending Whop app credentials and production callback registration.

## Cleanup
- No second category registry, alternate guide store, or replacement publishing path was added.
- Black Box and Hidden Files are suggestions, not an irreversible hard-coded lock; other exact sources require explicit approval.
- The browser cannot submit trusted content bodies for import.
- Existing guides, categories, status data, Control Center password behavior, and public design remain unchanged.
- Temporary validation workflow must be removed before merge after final Vercel proof is recorded.

## Blockers
- Configure `WHOP_CLIENT_ID`, `WHOP_TOKEN_SECRET`, `WHOP_REDIRECT_URI`, and `WHOP_OAUTH_SCOPES` in the production Vercel project.
- Register `https://the-420-lobby-hacks.vercel.app/api/whop-oauth-callback` in the Whop app.
- Republishing requires ownership or explicit permission for the source posts.

## Backlog
- Empty. Do not switch tasks until the authorized Whop importer, approvals, validation, cleanup, PR preview, and production checks are complete.
