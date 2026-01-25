# Stage 3 Testing Guide: Lifecycle Over Tasks

This guide validates the Stage 3 lifecycle flow (START → PAUSE → RESUME → STOP)
over task workspaces. It includes a feedback form at the end.

## Prereqs
- macOS with AeroSpace running
- Stream Deck connected
- This repo built and running (`npm install`, `npm run dev`)

Optional:
- `DRY_RUN=1` for safe plan inspection (no window moves)

## One-time setup (selected task)

Stage 3 requires a selected task ID. Set it in `state/appState.json`:

```json
{
  "version": 1,
  "selectedTaskId": "demo-task",
  "lifecycle": "IDLE"
}
```

Tip: any string works for now. The workspace name will be `task:demo-task`.

## Test 1: START creates an ambient stash and focuses the task
1. Ensure multiple windows are visible across monitors.
2. Press **START** (button 0).
3. Expected:
   - Non-task windows are stashed to `STASH`.
   - The task workspace (`task:demo-task`) is summoned to the focused monitor.
   - `state/appState.json` shows `lifecycle: "RUNNING"` and `ambientStashId` set.

## Test 2: PAUSE stashes the task and restores ambient
1. With the task visible, press **PAUSE** (button 0).
2. Expected:
   - Task windows move to `STASH`.
   - The ambient view returns (previous visible workspaces reappear).
   - `state/appState.json` shows `lifecycle: "PAUSED"` and `pausedTaskStashId` set.

## Test 3: RESUME restores the task and hides ambient
1. Press **RESUME** (button 0).
2. Expected:
   - Current ambient windows are stashed.
   - Task workspace is summoned.
   - Task windows restore from `pausedTaskStashId`.
   - `state/appState.json` shows `lifecycle: "RUNNING"` and `ambientStashId` set.

## Test 4: STOP ends the task session (recoverable)
1. Press **STOP** (button 1).
2. Expected:
   - Task windows are stashed.
   - Ambient workspace returns.
   - `state/appState.json` shows `lifecycle: "IDLE"`.
   - `state/tasks.json` task entry has `lastStopStashId`.

## Test 5: Persistence across restart
1. Press **START**, then **PAUSE**.
2. Quit the app (Ctrl+C), then restart `npm run dev`.
3. Press **RESUME**.
4. Expected: task windows restore and lifecycle returns to `RUNNING`.

## Artifacts to inspect
- `debug/last-plan.json`
- `debug/last-exec-log.json`
- `state/appState.json`
- `state/globalStash.json`
- `state/tasks.json`

## Feedback form

### Tester info
- Name:
- Date:
- macOS version:
- AeroSpace version:
- Stream Deck model:

### Results (check one)
- START flow: [ ] pass [ ] fail
- PAUSE flow: [ ] pass [ ] fail
- RESUME flow: [ ] pass [ ] fail
- STOP flow: [ ] pass [ ] fail
- Persistence after restart: [ ] pass [ ] fail

### Notes per step
- START:
- PAUSE:
- RESUME:
- STOP:
- Restart/persistence:

### Issues
- What broke?
- Repro steps:
- Logs/errors (paste):

### UX feedback
- Were labels/colors clear?
- Any surprising behavior?

### Wishlist
- Most important missing capability:
- Next feature you want:
