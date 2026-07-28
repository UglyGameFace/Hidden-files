# Active Task

## Task
Finish the authorized Whop-to-The-420-Lobby-Hacks importer by automatically discovering the exact Whop content modules attached to the connected owner’s Black Box and Hidden Files membership products, while preserving bulk approvals, formatting, security, deduplication, canonical categories, and hidden-draft behavior.

## Status
PR #27 delivered the original importer. PR #28 delivered automatic joined-group discovery and source/post bulk actions. PR #29 is merged into `main` as `9f800a3842690be7e4937a11116836a8222978ba` and fixes the live zero-forum result by scoping Whop forum and experience discovery to the exact product ID returned by each membership. Vercel did not create a deployment for the PR #29 merge because the account-level build-rate limit dropped that Git event. This status commit intentionally provides a fresh production deployment trigger without changing product behavior.

## Required workflow
- Connect Whop through OAuth 2.1 + PKCE; never collect or store a Whop password.
- Automatically list joined Whop companies and the readable content experiences attached to the owner’s exact membership products.
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
- Discards membership user/email fields server-side; only sanitized company, product, experience, and approval metadata reaches the browser.
- Added `/api/whop-sources` through the existing consolidated `api/whop.js` Vercel function.
- Added atomic bulk source-decision writes with a maximum of 100 exact forum sources per action.
- Exact `exp_...` IDs still back every approval and server-side enforcement, but are hidden from the normal owner workflow.
- Added responsive discovered-group cards, per-forum controls, group bulk controls, and page-wide selected-source controls.
- Expanded OAuth scopes for automatic membership discovery:
  `openid profile email forum:read member:basic:read member:email:read`
- Product discovery now uses `company_id` plus the exact membership `product_id` instead of attempting company-wide forum enumeration.
- Discovery tries product-scoped native forums first, then product-scoped experiences, deduplicates matching forum experiences, and reports actual installed experience types when a product does not use Whop Forums.
- Existing authoritative post re-fetch, attachment review, formatting checks, deduplication, and hidden-draft writes remain unchanged.

## Validation
- Automatic membership discovery audit: passed.
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
- Full production build for PR #29: passed on GitHub Actions run `30382828042`.
- Temporary branch-only validation workflow: removed after the green build.

## Live acceptance
- Wait for Vercel to create and finish a Production deployment from this commit or a later `main` commit containing `9f800a3`.
- Open Control Center → Methods and press Refresh groups.
- Expected: product-scoped forum experiences appear, or each group reports the actual Whop experience types attached to its membership product.
- Run one source bulk action, review posts, and create one hidden draft.
- Republishing still requires ownership or explicit permission for the source posts.

## Cleanup
- No alternate category registry, content store, or publishing path was added.
- No temporary workflow, placeholder file, generated inventory, or debug file remains.
- The seven browser-facing Whop actions remain consolidated in one Vercel function, keeping the deployment below the Hobby direct-function limit.

## Backlog
- Empty. Do not switch tasks until the product-scoped discovery deployment and one hidden-draft acceptance test are complete.
