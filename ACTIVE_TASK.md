# Active Task

## Task
Finish the authorized Whop-to-The-420-Lobby-Hacks importer by replacing the live manual experience-ID-first workflow with automatic joined-group/forum discovery and complete source/post bulk actions, while preserving formatting, security, deduplication, canonical categories, and hidden-draft behavior.

## Status
The original importer from PR #27 is merged and live on `main`. Follow-up draft PR #28 contains the automatic discovery and bulk-action correction. Its full repository audit, Astro check, and production build passed on GitHub Actions run `30380893813`. The temporary validation workflow was removed after the green build. PR #28 remains unmerged pending the Whop/Vercel scope update and live acceptance test.

## Required workflow
- Connect Whop through OAuth 2.1 + PKCE; never collect or store a Whop password.
- Automatically list joined Whop companies and readable forum experiences after connection.
- Recognize and prioritize Black Box and Hidden Files without requiring the owner to find `exp_...` IDs.
- Keep the manual experience-ID field only under an Advanced fallback.
- Allow selecting one forum, a whole group, all Black Box/Hidden Files forums, or any combination.
- Provide source-level Approve Selected, Disapprove Selected, Clear Selection, group Approve All/Disapprove All, and individual forum controls.
- Preserve existing post-level Approve, Disapprove, Undo, Approve All Ready, Disapprove All, and Reset Choices.
- Store every import as a hidden, non-featured draft and never auto-publish.
- Preserve Unicode, emoji, punctuation, paragraphs, Markdown hard breaks, headings, lists, tables, links, blockquotes, and fenced code.
- Use the existing category registry, ordering, status, GitHub write, Vercel publish, and public draft-isolation paths.
- Import only posts the owner created or has explicit permission to republish.

## Implementation
- Added joined-membership discovery and company deduplication.
- Added readable forum discovery per joined company.
- Discards membership user/email fields server-side; only sanitized company, product-count, forum, and approval metadata reaches the browser.
- Added `/api/whop-sources` through the existing consolidated `api/whop.js` Vercel function.
- Added atomic bulk source-decision writes with a maximum of 100 exact forum sources per action.
- Exact `exp_...` IDs still back every approval and server-side enforcement, but are hidden from the normal owner workflow.
- Added responsive discovered-group cards, per-forum controls, group bulk controls, and page-wide selected-source controls.
- Expanded OAuth scopes for automatic membership discovery:
  `openid profile email forum:read member:basic:read member:email:read`
- Existing authoritative post re-fetch, attachment review, formatting checks, deduplication, and hidden-draft writes remain unchanged.

## Validation
- Automatic membership and forum discovery audit: passed.
- Black Box and Hidden Files default-selection audit: passed.
- Source-level individual, group, selected, and default-group bulk-action audits: passed.
- Existing post-level bulk-action audit: passed.
- Manual-ID advanced-fallback audit: passed.
- Membership email non-persistence/non-exposure audit: passed.
- Exact source approval enforcement and crafted-request rejection: passed.
- Formatting integrity, duplicate/update, attachment, and public-draft-isolation audits: passed.
- Every existing repository audit: passed.
- JavaScript syntax validation: passed.
- Astro check: passed.
- Production build: passed on GitHub Actions run `30380893813`.
- Temporary branch-only validation workflow: removed after the green build.

## External steps before merge
- In the Whop app, enable `member:basic:read` and `member:email:read` in addition to the existing identity and `forum:read` permissions.
- Change production Vercel `WHOP_OAUTH_SCOPES` to:
  `openid profile email forum:read member:basic:read member:email:read`
- Redeploy PR #28 or merge it after the preview is ready.
- In Control Center, disconnect Whop and reconnect once so the new OAuth token includes the expanded scopes.
- Confirm Black Box and Hidden Files populate automatically, run one source bulk action, review posts, and create one hidden draft.
- Republishing still requires ownership or explicit permission for the source posts.

## Cleanup
- No alternate category registry, content store, or publishing path was added.
- No temporary workflow, placeholder file, generated inventory, or debug file remains on the branch.
- The seven browser-facing Whop actions remain consolidated in one Vercel function, keeping the deployment below the Hobby direct-function limit.

## Backlog
- Empty. Do not switch tasks until PR #28, expanded scopes, live automatic discovery, bulk actions, and one hidden-draft acceptance test are complete.
