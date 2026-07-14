# Active Task

## Task
Run a full production-readiness audit of The 420 Lobby website, fix every verified blocker found within that audit, remove conflicting or obsolete implementations, and deploy only after preview and production validation pass.

## Status
Active on `audit/production-readiness`. Repository, live public behavior, owner workflows, failure handling, accessibility, security boundaries, responsive behavior, and deployment recovery are being traced before implementation.

## Scope
- Trace the real public and password-gated execution paths instead of adding surface-level patches.
- Verify create, edit, publish, hide, pause, expire, reload, and deployment-refresh behavior across methods, categories, settings, navigation, cards, guide pages, and related guides.
- Inspect authentication, session handling, same-origin protection, GitHub writes, Vercel deployment state, concurrent edits, local draft recovery, API failure states, and public fallbacks.
- Verify phone, tablet, desktop, keyboard, reduced-motion, accessibility semantics, and slow/failing network behavior from code and available live endpoints.
- Preserve all existing guide content, categories, owner password behavior, visual identity, and unrelated features.
- Add regression audits for every verified issue fixed.

## Findings
- Pending full trace.

## Changes
- Active-task lock established. No production code changed yet.

## Validation
- Repository audits: pending.
- Targeted regression audits: pending findings.
- JavaScript/static validation: pending.
- Astro check: pending.
- Production build: pending.
- Vercel preview: pending.
- Vercel production: pending.
- Live public verification: pending.

## Cleanup
- Pending implementation and conflict inspection.

## Blockers
- Password-gated interactions cannot be exercised from unauthenticated public tooling; their real code paths and API contracts will be validated directly, with live public verification covering all accessible surfaces.

## Backlog
- Empty. Do not switch tasks until the audit, verified fixes, cleanup, preview, merge, production deployment, and final live checks are complete.
