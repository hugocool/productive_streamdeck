---
name: aerospace-debugging
description: Use when an AeroSpace command run by this controller appears to do nothing, moves the wrong window, errors with ENOENT, or when writing a new plan step that queries or mutates AeroSpace state.
---

# Debugging AeroSpace calls from this controller

## First checks
1. **PATH.** The runner calls `aerospace` from `process.env.PATH`. Under nodemon or launchd that PATH may lack Homebrew. Look for `ENOENT` in the `[AeroSpace FAIL]` payload; confirm with `which aerospace` in the same environment.
2. **Read the plan and log.** `debug/last-plan.json` is what was attempted, `debug/last-exec-log.json` is what ran, with `skipped` and `allowFailure` per step. A step that is present but skipped means `DRY_RUN=1` was set.
3. **Port.** AeroSpace's `exec-on-workspace-change` hook calls the controller on the port in `.streamdeck-port`. If the controller fell back to another port it prints a warning at startup; run `npm run aerospace:sync`.

## Query the right thing
- Windows in the focused workspace: `aerospace list-windows --workspace focused`. `--focused` alone returns the single focused window.
- Visible workspace per monitor: `aerospace list-workspaces --monitor all --visible --format '%{monitor-id}\t%{workspace}'`.
- Window ids per workspace: `aerospace list-windows --workspace <a> <b> --format '%{window-id}\t%{workspace}'`.
- Snapshot helpers (`tryReadVisibleSnapshot`, `tryReadWorkspaceSnapshot`) return `null` when AeroSpace is unreachable; callers must no-op, never throw.

## Mutate safely
- Target by id: `move-node-to-workspace --window-id <id> <workspace>`. Argument order matters.
- Focus-dependent commands (`move-node-to-workspace <ws>` without an id, `focus`) silently no-op when nothing is focused. Avoid them in plans.
- `summon-workspace <ws>` drags a workspace to the focused monitor and fails for workspaces pinned with `workspace-to-monitor-force-assignment`; `workspace <ws>` shows it where it lives. See `docs/research/aerospace-guarantees.md`.

## When a window is gone
Stash pops mark moves `allowFailure`; a missing window logs `[AeroSpace non-fatal]` and the plan continues. If that happens often, the window ids in `state/globalStash.json` are stale, which is expected after the app that owned them quit.

## Reproduce without hardware
`npm test` runs the plan builders against `MockRunner` fixtures. For a live query without pressing keys: `DRY_RUN=1 node -e "..."` against `dist/` as in `docs/manual-testing.md`.
