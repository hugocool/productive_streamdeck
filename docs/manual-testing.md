# Manual testing on real hardware

Checklist for validating the deck end to end. Automated coverage lives in `test/`; this is the part that needs AeroSpace, three monitors, and the Stream Deck. Record failures as evidence on the relevant tracker ticket (see map #2, ticket #4 for the current "what breaks" pass).

## Key map today (MAIN layer)
- Key 0: START (IDLE) / PAUSE (RUNNING) / RESUME (PAUSED). Needs `selectedTaskId`; the deck assigns one if missing.
- Key 1: STOP while RUNNING or PAUSED; RESUME (pop `stash@{0}`) when a global stash exists.
- Key 2: toggle the VIEW layer (ignored while RUNNING).
- Key 5: AI pulse indicator (`GET /agent-done`).
- Keys 10–14: Microsoft Edge shortcut row, shown only while Edge is visible.

VIEW layer: key 0 NEW (`adhoc-NNN`, checked out), key 1 PREV, key 3 NEXT, key 4 ESC, key 2 page indicator, keys 5–14 tasks. Tap a task = select + checkout, back to MAIN. Hold = detach its windows to `inbox` and drop it from the registry.

Lifecycle semantics: START stashes ambient windows and checks out `task:<id>`; PAUSE stashes task windows and pops ambient; RESUME stashes ambient, checks out, pops the task stash; STOP stashes task windows, pops ambient, records `lastStopStashId`. Hold is the same intent at a stronger intensity; a layer is a different category of intent (ADR-0003).

## Prerequisites
- AeroSpace running with the rendered config (`npm run aerospace:sync`, then reload AeroSpace).
- Stream Deck connected; `npm run check:deck` lights keys and lists workspaces.
- `native/keysender` built (`npm run native:build`) and granted Accessibility + Input Monitoring.
- Controller running: `npm run dev`. Note the port it prints; it must match `.streamdeck-port`.

## 1. Dry run produces plans
1. Start with `DRY_RUN=1 npm run dev`.
2. Press STOP (key 1), then RESUME (key 1).
3. `debug/last-plan.json` contains `move-node-to-workspace` and `summon-workspace` steps; `debug/last-exec-log.json` shows every mutate step `skipped: true`. No window moved.

## 2. Global stash and restore
1. Run without DRY_RUN. Spread windows over all monitors.
2. STOP: windows disappear, each monitor shows `blank-<monitorId>`.
3. RESUME: windows return to their original workspaces and the original visible workspaces return.
4. STOP twice with different layouts, then RESUME once: the newer layout restores first (`stash@{0}`).

## 3. Task lifecycle
Requires `selectedTaskId` in `state/appState.json` (the deck assigns one on first run; VIEW layer can pick another).
1. START (key 0): non-task windows go to `STASH`, `task:<id>` is summoned, `appState.json` shows `RUNNING` with `ambientStashId`.
2. PAUSE (key 0): task windows go to `STASH`, ambient view returns, state `PAUSED` with `pausedTaskStashId`.
3. RESUME (key 0): ambient stashed, task summoned, task windows restored, state `RUNNING`.
4. STOP (key 1): task stashed, ambient restored, state `IDLE`, `tasks.json` has `lastStopStashId`.
5. Persistence: START, PAUSE, quit the controller, restart, RESUME. Task windows restore.

## 4. Task primitives without the deck
Against `dist/` after `npm run build`:
```bash
node -e "const {RealRunner}=require('./dist/adapters/aerospaceRunner');const a=require('./dist/core/taskActions');const r=new RealRunner();(async()=>{await a.checkoutTask('demo',r,{dryRun:true});await a.trackFocused('demo',r,{dryRun:true});await a.trackVisible('demo',r,{dryRun:true});await a.untrackFocused(r,{dryRun:true});})().catch(console.error)"
```
Expect `summon-workspace task:demo`, `move-node-to-workspace --window-id <id> task:demo`, and `... inbox` in the plan. With `dryRun:false`: checkout moves no windows; trackFocused moves only the focused window; trackVisible never steals from another `task:*` workspace; untrackFocused lands the window in `inbox`.

## 5. VIEW layer
1. While IDLE press key 2. Keys 5–14 list tasks; key 0 NEW creates `adhoc-NNN` and checks it out; keys 1 and 3 page; key 4 exits.
2. Tap a task: it is selected and checked out, and the deck returns to MAIN.
3. Hold a task: its windows move to `inbox` and it disappears from the list. No window closes.
4. While RUNNING, key 2 does nothing.

## 6. App row and callbacks
1. With Edge visible, keys 10–14 show the Edge row; pressing one sends the shortcut to Edge and focus does not leak elsewhere. Hide Edge; the row disappears on the next `/aerospace-event`.
2. `curl localhost:<port>/agent-done` pulses key 5 for ten seconds.

## Artifacts to attach to a failure
`debug/last-plan.json`, `debug/last-exec-log.json`, the controller's console output around the press, `aerospace list-windows --all --format '%{window-id}\t%{workspace}\t%{app-name}'`, and macOS + AeroSpace versions.
