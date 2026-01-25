# Stage 2 Testing: Tasks as Branches

This guide validates the Stage 2 task primitives (checkout/track/untrack) that
use task workspaces (`task:<id>`) without changing the current Stream Deck UX.
It ends with a feedback form.

## Prereqs
- macOS with AeroSpace installed and running
- This repo built (`npm install`, `npm run build`)
- Optional: `DRY_RUN=1` for safe plan inspection

## Test 1: DRY_RUN plan generation (safe)
1. Stop the app if it is running.
2. Run:
   ```bash
   DRY_RUN=1 node -e "const { RealRunner } = require('./dist/adapters/aerospaceRunner'); const { checkoutTask, trackFocused, trackVisible, untrackFocused } = require('./dist/core/taskActions'); const runner = new RealRunner(); (async()=>{ await checkoutTask('demo', runner, { dryRun: true }); await trackFocused('demo', runner, { dryRun: true }); await trackVisible('demo', runner, { dryRun: true }); await untrackFocused(runner, { dryRun: true }); })().catch(console.error);"
   ```
3. Inspect `debug/last-plan.json` to confirm:
   - `summon-workspace task:demo`
   - `move-node-to-workspace --window-id <id> task:demo`
   - `move-node-to-workspace --window-id <id> inbox`

Expected: no actual window moves, but plans are created.

## Test 2: Checkout does not move windows
1. Run without DRY_RUN:
   ```bash
   node -e "const { RealRunner } = require('./dist/adapters/aerospaceRunner'); const { checkoutTask } = require('./dist/core/taskActions'); const runner = new RealRunner(); checkoutTask('alpha', runner, { dryRun: false }).catch(console.error);"
   ```
2. Confirm you are viewing `task:alpha`, but existing windows are not moved.

Expected: only the workspace view changes.

## Test 3: trackFocused (explicit add)
1. Focus a window you want to track.
2. Run:
   ```bash
   node -e "const { RealRunner } = require('./dist/adapters/aerospaceRunner'); const { trackFocused } = require('./dist/core/taskActions'); const runner = new RealRunner(); trackFocused('alpha', runner, { dryRun: false }).catch(console.error);"
   ```
3. Confirm the focused window moves to `task:alpha`.

Expected: only the focused window moves.

## Test 4: trackVisible (safe bulk add)
1. Ensure visible windows include:
   - Some in `inbox` or system workspaces
   - Some already in another `task:*` workspace
2. Run:
   ```bash
   node -e "const { RealRunner } = require('./dist/adapters/aerospaceRunner'); const { trackVisible } = require('./dist/core/taskActions'); const runner = new RealRunner(); trackVisible('alpha', runner, { dryRun: false }).catch(console.error);"
   ```
3. Confirm only non-task windows move to `task:alpha`.

Expected: windows from other `task:*` workspaces are not stolen.

## Test 5: untrackFocused (move to inbox)
1. Focus a window currently inside `task:alpha`.
2. Run:
   ```bash
   node -e "const { RealRunner } = require('./dist/adapters/aerospaceRunner'); const { untrackFocused } = require('./dist/core/taskActions'); const runner = new RealRunner(); untrackFocused(runner, { dryRun: false }).catch(console.error);"
   ```
3. Confirm the window moves to `inbox`.

Expected: focused window moves to `inbox`.

## Feedback form
Please fill this out after testing.

### Tester info
- Name:
- Date:
- Environment (macOS version / AeroSpace version):

### Results
- DRY_RUN plan generation: pass/fail + notes
- Checkout behavior (no window moves): pass/fail + notes
- trackFocused: pass/fail + notes
- trackVisible safety filter: pass/fail + notes
- untrackFocused: pass/fail + notes

### Issues
- What broke?
- Repro steps:
- Logs or errors (paste):

### UX feedback
- Does task naming feel understandable?
- Any confusion about where windows “belong”?

### Wishlist
- What’s missing for “tasks as branches” to be usable daily?
- Highest priority next feature:
