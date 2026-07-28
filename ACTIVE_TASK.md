# Active Task

## Task
Build an authorized Whop-to-SniperPlug guide importer that uses Whop OAuth, preserves guide content and formatting exactly, maps imports through SniperPlug's canonical category and method publishing rules, prevents duplicates, and publishes through a draft-first review flow.

## Status
Active on `agent/whop-guide-importer` in draft PR #27. The shared guide-format integrity boundary, save-path integration, regression audit, compatibility cleanup, and full Vercel preview validation have passed; OAuth, Whop discovery/import, category mapping, draft review UI, duplicate tracking, and final end-to-end acceptance remain.

## Scope
- Use Whop OAuth 2.1 with PKCE; never collect or store a Whop password.
- Read only content the authenticated Whop user is authorized to access through official Whop API endpoints.
- Import Whop course lessons and forum guide posts with cursor pagination, stable source identifiers, attachments, dates, and source metadata.
- Preserve Unicode, emoji, punctuation, paragraph spacing, Markdown hard breaks, headings, lists, tables, links, blockquotes, and fenced code without accidental rewriting.
- Repair only transport-level defects that can be corrected deterministically; block ambiguous corruption, unsafe publishable HTML, dangerous links, or malformed code fences for review.
- Read categories from `src/data/site-settings.json`; do not create a duplicate or hard-coded category registry.
- Use the existing guide validation, automatic ordering, atomic repository write, status, Vercel publish, and responsive rendering paths.
- Store imported items as drafts first, show exact previews and integrity diagnostics, and require explicit approval before public publishing.
- Track Whop source IDs and content fingerprints so reruns update changed guides without creating duplicates.
- Import only guides the owner created or has explicit permission to republish.

## Findings
- The current method save path used a hand-written frontmatter parser and body trimming without explicit Unicode corruption, dangerous-link, code-fence balance, or exact round-trip verification.
- Existing JSON-quoted frontmatter preserves valid Unicode correctly, but there was no regression proof for ZWJ emoji, combining accents, curly punctuation, non-Latin scripts, or Unicode keywords.
- Existing Markdown saves preserve internal paragraphs in normal cases, but there was no structural fingerprint to detect accidental paragraph collapse or formatting changes.
- Unsafe-content scanning must ignore literal examples inside fenced, indented, and inline code or legitimate technical guides would be rejected.
- The first preview failure came from a stale automatic-order regression assertion that required the old one-line `validateGuide` call verbatim. The save implementation still preserved automatic ordering; the audit needed to verify the new prepared-body and server-owned-order guarantees together.
- Whop's official API exposes course lessons and forum posts, and its OAuth flow requires OAuth 2.1 with PKCE. Access tokens expire and refresh tokens rotate, so token handling must update credentials atomically.

## Changes
- Added `server/guide-content-integrity.js` as the shared content boundary.
- Added Unicode scalar validation and rejection of null/control corruption and replacement-character decoding failures.
- Added deterministic repair reporting for UTF-8 BOMs, CRLF/CR line endings, Unicode line separators, and boundary-only blank lines.
- Preserved all internal blank-line runs, two-space Markdown hard breaks, punctuation, Unicode sequences, and code content exactly.
- Added balanced fenced-code validation and content fingerprints.
- Added dangerous raw HTML and link rejection outside fenced, indented, and inline code examples.
- Wired the real `api/deal-desk-save.js` path through preparation and exact serialize/parse round-trip verification before repository writes.
- Added integrity diagnostics to successful save responses.
- Added `tools/audit-guide-content-integrity.mjs` and required it in every audit, check, and production build.
- Updated the automatic-order regression audit to verify content preparation and server-owned order together instead of matching obsolete source formatting.

## Validation
- Static source inspection: passed for the existing save, frontmatter, category, ordering, and atomic write paths.
- Official Whop OAuth/course/forum API documentation verification: passed.
- Branch creation and changed-file conflict isolation: passed.
- Reconstructed local JavaScript syntax validation: passed.
- Reconstructed targeted guide-content integrity audit: passed.
- Existing repository audits through Vercel: passed.
- Automatic method order regression through Vercel: passed after compatibility cleanup.
- Guide-content integrity regression through Vercel: passed.
- Astro check: passed through Vercel preview.
- Production build: passed through Vercel preview.
- Vercel preview for draft PR #27 at commit `77a25dba52e4fa0b0c01d6f469d129b3c1a1573a`: passed.
- End-to-end Whop OAuth/import and physical-device preview: pending implementation and owner credentials.

## Cleanup
- No second category registry, alternate guide store, or replacement publishing path has been added.
- Format protection is isolated in one server module and consumed by the existing save endpoint.
- Literal code examples remain exempt from publishable HTML scanning; unsafe rendered content remains blocked.
- The stale source-string assertion was integrated with the new execution path rather than bypassed or weakened.
- Existing guide content, categories, password behavior, public copy, and visual design have not been changed.

## Blockers
- Whop OAuth app credentials and registered callback URL will be required for live OAuth acceptance testing after implementation.
- Republishing requires ownership or explicit permission for the source guides.

## Backlog
- Empty. Do not switch tasks until the authorized Whop importer, draft review flow, validations, cleanup, PR preview, and production checks are complete.
