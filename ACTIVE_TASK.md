# Active Task

## Task
Run a full production-readiness audit of The 420 Lobby website, fix every verified blocker found within that audit, remove conflicting or obsolete implementations, and deploy only after preview and production validation pass.

## Status
Verified production-readiness blockers have been implemented on `audit/production-readiness`. Repository audits, Astro validation, Vercel preview, merge, production deployment, and final live checks remain.

## Scope
- Trace the real public and password-gated execution paths instead of adding surface-level patches.
- Verify create, edit, publish, hide, pause, expire, reload, and deployment-refresh behavior across methods, categories, settings, navigation, cards, guide pages, and related guides.
- Inspect authentication, session handling, same-origin protection, GitHub writes, Vercel deployment state, concurrent edits, local draft recovery, API failure states, and public fallbacks.
- Verify phone, tablet, desktop, keyboard, reduced-motion, accessibility semantics, and slow/failing network behavior from code and available live endpoints.
- Preserve all existing guide content, categories, owner password behavior, visual identity, and unrelated features.
- Add regression audits for every verified issue fixed.

## Findings
- Owner authentication used constant-time password comparison and secure cookies, but repeated failed unlock attempts were not throttled.
- Browser-to-owner writes had same-origin and authentication checks, but server-to-GitHub requests could wait without a bounded timeout.
- Immediate live-status writes did not verify that the requested slug still belonged to a managed guide and did not retry a safe SHA conflict.
- The Control Center reported that Vercel started but never checked or displayed the real deployment result, allowing overlapping publishes while a build was pending.
- Owner dialogs and the mobile navigation drawer moved initial focus but did not contain keyboard focus or reliably restore the opener.
- Public live-status refreshes kept static fallbacks but could remain pending indefinitely on a stalled network.
- Production response headers did not define a CSP, frame protection, transport security, browser permissions policy, or private-route indexing header.
- Canonical URLs could fall back to a placeholder domain, and the site had no generated sitemap or public health endpoint.

## Changes
- Added bounded GitHub request timeouts and clearer upstream conflict/error mapping.
- Added repeated-login throttling without changing the existing password, cookie, or session model.
- Required live-status targets to be existing managed guides, validated timestamps, and retried one safe registry conflict.
- Added authenticated GitHub/Vercel deployment-status monitoring, a visible pending/success/failure state, and protection against overlapping content publishes.
- Added a shared focus-scope utility for the mobile drawer and owner dialogs, including Tab containment, Escape, and return focus.
- Added a timeout to public status refreshes while retaining cached/static outage behavior.
- Added security and privacy headers, owner-route noindex response headers, a real production canonical fallback, robots rules, a generated sitemap, and a public health endpoint.
- Added a production-readiness regression audit to every check and production build.

## Validation
- Repository audits: pending Vercel preview.
- Production-readiness regression audit: pending Vercel preview.
- JavaScript/static validation: pending Vercel preview.
- Astro check: pending Vercel preview.
- Production build: pending Vercel preview.
- Vercel preview: pending.
- Vercel production: pending merge.
- Live public verification: pending production.

## Cleanup
- New deployment ownership is isolated in one compiled owner runtime and one dedicated status API; no duplicate settings/category registry or alternate publishing path was added.
- Security, accessibility, and deployment styles use dedicated selectors without `!important` or redesigning existing surfaces.
- Existing guide content, category data, status registry, authentication secret, and public layout remain unchanged.
- Final stale-code and conflict inspection remains before merge.

## Blockers
- Password-gated interactions cannot be exercised from unauthenticated public tooling; their real code paths and API contracts are covered directly, while live public verification will cover all accessible production surfaces.

## Backlog
- Empty. Do not switch tasks until the audit, verified fixes, cleanup, preview, merge, production deployment, and final live checks are complete.
