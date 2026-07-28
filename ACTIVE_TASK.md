# Active Task

## Task
Finish the authorized Whop-to-The-420-Lobby-Hacks importer by discovering every Whop company, membership product, and supported content module returned to the connected owner, while preserving bulk approvals, formatting, security, deduplication, canonical categories, and hidden-draft behavior.

## Status
PR #27 delivered the original importer. PR #28 delivered automatic joined-group discovery and source/post bulk actions. PR #29 added product-scoped forum and experience discovery. PR #30 is merged into `main` as `29662e9e6da6f14e3b68aa9286d20063bf4d4bcb` and fixes partial or missing-group discovery caused by the old hard-coded membership-status allowlist. Vercel rejected the PR #30 merge event at the account-level build-rate limit, so this accurate task-state commit also provides a fresh production deployment trigger.

## Required workflow
- Connect Whop through OAuth 2.1 + PKCE; never collect or store a Whop password.
- Automatically list every joined Whop company and every product returned for that company, regardless of membership billing lifecycle status.
- Use product-scoped Whop Forums and Experiences calls as the authority on what content is currently readable.
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
- Added cursor-paginated joined-membership discovery and exact company/product deduplication.
- Discards membership user/email fields server-side; only sanitized company, product, status, experience, and approval metadata reaches the browser.
- Added `/api/whop-sources` through the existing consolidated `api/whop.js` Vercel function.
- Added atomic bulk source-decision writes with a maximum of 100 exact forum sources per action.
- Exact `exp_...` IDs still back every approval and server-side enforcement, but are hidden from the normal owner workflow.
- Added responsive discovered-group cards, per-forum controls, group bulk controls, and page-wide selected-source controls.
- Expanded OAuth scopes for automatic membership discovery:
  `openid profile email forum:read member:basic:read member:email:read`
- Product discovery uses `company_id` plus the exact membership `product_id` instead of attempting company-wide forum enumeration.
- Discovery tries product-scoped native forums first, then product-scoped experiences, deduplicates matching forum experiences, and reports actual installed experience types when a product does not use Whop Forums.
- Membership billing status is now diagnostic metadata only. Active, canceled, expired, unresolved, drafted, and future statuses cannot suppress a company or product before Whop access is checked.
- Multiple memberships under one company are counted and all exact product IDs are retained independently.
- The former silent 100-company slice is replaced by a visible safety error, preventing internal limits from quietly hiding groups.
- Existing authoritative post re-fetch, attachment review, formatting checks, deduplication, and hidden-draft writes remain unchanged.

## Validation
- Automatic membership discovery audit: passed.
- Complete membership-status and multi-product preservation audit: passed.
- Product-scoped forum discovery audit: passed.
- Product-scoped experience fallback audit: passed.
- Company-wide enumeration rejection audit: passed.
- Unsupported experience-type diagnostics audit: passed.
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
- Full production build for PR #30: passed on GitHub Actions run `30384714791`.
- Temporary branch-only validation workflow: removed after the green build.

## Live acceptance
- Wait for Vercel to create and finish a Production deployment from this commit or a later `main` commit containing `29662e9`.
- Open Control Center → Methods and press Refresh groups.
- Expected: every Whop company/product returned by the connected account is checked, including products whose memberships have non-active lifecycle statuses.
- Product-scoped forum experiences should appear, or each group should report the actual Whop experience types attached to that product.
- Run one source bulk action, review posts, and create one hidden draft.
- Republishing still requires ownership or explicit permission for the source posts.

## Cleanup
- No alternate category registry, content store, or publishing path was added.
- No temporary workflow, placeholder file, generated inventory, or debug file remains.
- The seven browser-facing Whop actions remain consolidated in one Vercel function, keeping the deployment below the Hobby direct-function limit.

## Backlog
- Empty. Do not switch tasks until complete membership discovery is deployed and one hidden-draft acceptance test is complete.
