# Testing Guide: Stage 1.5 Stash Stack

This guide walks a tester through validating the stash stack (stash@{n}),
plan/execute plumbing, and persistence. It ends with a short feedback form.
For lifecycle-over-task testing, use `STAGE3_TESTING.md`.

## Prereqs
- macOS with AeroSpace installed and running
- Stream Deck connected
- This repo built and running (`npm install`, `npm run dev`)

Optional:
- `DRY_RUN=1` for safe, non-mutating plan inspection

## What changed (quick context)
- Stream Deck actions run: **Snapshot → Plan → Execute**
- STOP/RESUME now use a **stash stack** (`stash@{0}`, `stash@{1}`, ...)
- Plans are persisted to `debug/last-plan.json`
- Stash stack + app state are persisted in `state/`

## Test 1: DRY_RUN plan output (safe)
1. Stop the app if running.
2. Run:
   ```bash
   DRY_RUN=1 npm run dev
   ```
3. Press **STOP** (button 1).
4. Confirm `debug/last-plan.json` exists and contains `move-node-to-workspace`
   and `summon-workspace` steps.
5. Press **RESUME** (button 1).
6. Confirm another plan is written (restore steps).

Expected: no actual window moves (dry run), but plans are created.

## Test 2: Live stash/restore (visible windows)
1. Quit any old app instance and run normally:
   ```bash
   npm run dev
   ```
2. Open a few windows across monitors.
3. Press **STOP** (button 1).
   - Visible windows should disappear.
   - Blank workspaces should appear (`blank-{monitorId}`).
4. Press **RESUME** (button 1).
   - Windows return to their original workspaces.
   - Original visible workspaces return.

Expected: windows are moved to `STASH` and restored cleanly.

## Test 3: PAUSE/RESUME (global visible stash)
1. Ensure multiple windows are visible across monitors.
2. Press **START/PAUSE** (button 0).
3. Confirm visible windows move to `STASH` and blank workspaces appear.
4. Press **START/PAUSE** again to resume (button 0).

Expected: windows restore; no windows are closed.

## Test 4: Persistence across restart
1. Press **STOP** to stash visible windows.
2. Kill the app (Ctrl+C).
3. Restart the app.
4. Press **RESUME**.

Expected: windows still restore (state loaded from `state/`).

## Test 5: Stash stack (stash@{n})
1. With a visible workspace set A, press **STOP** (button 1).
2. Switch to a different visible workspace set B.
3. Press **STOP** again.
4. Press **RESUME** once.
5. Confirm set B restores first and set A remains stashed.

Expected: multiple stashes unwind in LIFO order.

## Test 6: Task primitives (Stage 2)
1. Use `DRY_RUN=1 npm run dev`.
2. In a Node REPL (or temporary script), call:
   - `checkoutTask("demo", runner, { dryRun: true })`
   - `trackFocused("demo", runner, { dryRun: true })`
   - `trackVisible("demo", runner, { dryRun: true })`
3. Inspect `debug/last-plan.json` for:
   - `summon-workspace task:demo`
   - `move-node-to-workspace --window-id <id> task:demo`

Expected: plans are generated without mutating windows in dry run.

## Artifacts to inspect
- `debug/last-plan.json`
- `debug/last-exec-log.json`
- `state/globalStash.json` (version 2 stash stack)
- `state/appState.json`

## Feedback form
Please fill this out after testing.

### Tester info
- Name:
- Date:
- Environment (macOS version / AeroSpace version):

### Results
- DRY_RUN plan generation: pass/fail + notes
- STOP/RESUME stash/restore: pass/fail + notes
- PAUSE/RESUME visible flow: pass/fail + notes
- Persistence after restart: pass/fail + notes
- Stash stack LIFO behavior: pass/fail + notes

### Issues
- What broke?
- Repro steps:
- Logs or errors (paste):

### UX feedback
- Did the button labels/colors make sense?
- Was any behavior surprising?

### Wishlist
- What’s missing for “usable daily driver”?
- Highest priority next feature:
