# Active Task

## Task
Make guide loading and registration feel immediate with one managed guide and continue scaling cleanly as more guides are added.

## Root Cause
- The authenticated guide endpoint listed every Markdown file in `src/content/hacks`.
- It downloaded every file separately from GitHub, including archived demo guides.
- It downloaded the status registry separately.
- Only after all requests finished did it filter down to managed guides.
- A manual refresh repeated the same slow uncached GitHub request chain.

## Fix
- Use `src/data/deal-status.json` as the managed-guide registry.
- Fetch only registered guide IDs during normal Control Center loading.
- Keep a directory scan only as an empty-registry recovery path for older/manual repositories.
- Return the complete saved guide and live status directly from the save endpoint.
- Do not change any guide wording, method content, public layout, or status behavior.

## Validation
- API syntax and repository audit: pending branch build.
- Astro check and production build: pending branch build.
- Vercel production deployment: pending merge.
- Live Control Center load timing: pending deployment.

## Cleanup
- No new polling loop, global fetch patch, duplicate data source, or temporary reload workaround.
- Archived demo files remain excluded from normal guide loading.

## Blockers
- None in code.

## Backlog
- After production passes, verify first unlock, repeat unlock, manual refresh, and save behavior before moving to another task.
