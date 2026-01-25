# Testing Guide: Stage 0.5 Plans + Stash/Resume

This guide walks a tester through validating the new plan/execute plumbing,
stash/restore behavior, and persistence. It ends with a short feedback form.

## Prereqs
- macOS with AeroSpace installed and running
- Stream Deck connected
- This repo built and running (`npm install`, `npm run dev`)

Optional:
- `DRY_RUN=1` for safe, non-mutating plan inspection

## What changed (quick context)
- Stream Deck actions now run: **Snapshot → Plan → Execute**
- Plans are persisted to `debug/last-plan.json`
- Global stash + app state are persisted in `state/`

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
   - Blank workspaces should appear (`__blank{monitorId}`).
4. Press **RESUME** (button 1).
   - Windows return to their original workspaces.
   - Original visible workspaces return.

Expected: windows are moved to `STASH` and restored cleanly.

## Test 3: Pause/Resume (focused workspace only)
1. Ensure you have a focused workspace with windows.
2. Press **START/PAUSE** (button 0).
3. Confirm those windows move to `STASH`.
4. Open a stray window in the focused workspace.
5. Press **RESUME** (button 1 if you are paused).

Expected: straggler windows close, stashed windows restore.

## Test 4: Persistence across restart
1. Press **STOP** to stash visible windows.
2. Kill the app (Ctrl+C).
3. Restart the app.
4. Press **RESUME**.

Expected: windows still restore (state loaded from `state/`).

## Artifacts to inspect
- `debug/last-plan.json`
- `debug/last-exec-log.json`
- `state/globalStash.json`
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
- PAUSE/RESUME focused flow: pass/fail + notes
- Persistence after restart: pass/fail + notes

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
