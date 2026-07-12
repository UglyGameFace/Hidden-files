# Active Task

## Task
Add an obvious public Post a Method button that remains protected by the existing Control Center owner password.

## Scope
- Show Post a Method in the desktop/tablet sidebar.
- Show Post a Method in the mobile navigation drawer.
- Route through `/control-center?intent=new-method#methods`.
- Use the existing `DEAL_DESK_PASSWORD` session gate without introducing a second password or public save path.
- After authentication and category loading, open the New Method editor automatically.

## Security Rules
- The public button may reveal only the protected Control Center login screen.
- The New Method editor must remain hidden until the existing session endpoint authenticates successfully.
- Public navigation code must never receive, store, forward, or validate the owner password.
- Public navigation code must never call the method-save API directly.
- The deep-link intent is removed after it is consumed so refreshing does not repeatedly reset the editor.

## Changes
- Added one shared `POST_METHOD_LINK` navigation entry.
- Added distinct desktop/tablet and mobile Post a Method buttons.
- Added intent handling that waits for both an authenticated Control Center and loaded categories.
- Added owner-specific login wording explaining that the same password is required.
- Added a dedicated build audit for the complete password-gated posting path.

## Validation
- Repository audit: pending preview build.
- Password-gated posting audit: pending preview build.
- Astro type check: pending preview build.
- Astro production build: pending preview build.
- Vercel preview deployment: pending.
- Vercel production deployment: pending merge.

## Blockers
- None in code.

## Backlog
- Empty. Stay on this task until production deployment passes.
