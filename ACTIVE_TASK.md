# Active Task

## Task
Deploy and verify the new public-page and owner Control Center navigation buttons.

## Scope
- Keep the public desktop/tablet sidebar and mobile drawer connected to the shared navigation registry.
- Keep all eight Control Center section buttons visible.
- Keep inactive guide-page buttons hidden through live method status.
- Pass the repository audit, Astro check, Astro production build, and Vercel production deployment.

## Findings
- Vercel reached `npm run audit`; dependency installation and the Vercel build command started normally.
- The build was blocked by two false positives in `tools/audit-site.mjs`.
- The audit counted responsive rules in the same canonical stylesheet as duplicate backdrop ownership.
- Actual ownership is correct:
  - `.desk-modal-backdrop` is owned by `src/styles/method-manager.css`.
  - `.cc-preview-backdrop` and `.cc-confirm-backdrop` are owned by `src/styles/control-center.css`.
- Mobile media-query overrides in those same owner files are intentional and required.

## Changes
- Replaced raw selector-occurrence counting with cross-file ownership checks.
- Added checks that each owner still contains a fixed, full-viewport canonical base rule.
- Responsive overrides remain allowed only inside the canonical owner stylesheet.
- No navigation, guide content, method content, or layout CSS was changed by this hotfix.

## Validation
- Targeted root-cause inspection: passed.
- Audit logic review against desktop base and mobile override execution paths: passed.
- `npm run audit`: pending branch build.
- `astro check`: pending branch build.
- `astro build`: pending branch build.
- Vercel production deployment: pending merge.
- Live public and owner button verification: pending deployment.

## Cleanup
- No bypass, skipped audit, temporary selector exemption, or duplicate CSS rule added.
- The audit still rejects backdrop selectors owned by multiple stylesheets.

## Blockers
- None in code after the audit correction.

## Backlog
- None. Stay on this task until production deployment and live verification pass.
