# Productive Stream Deck

A physical control surface for window state on macOS. The deck presents git-shaped operations over AeroSpace workspaces so that switching what you are working on never destroys anything.

## Planning grammar

**Snapshot**:
A read-only capture of AeroSpace state: the visible workspace on each monitor and the window ids in a set of workspaces.
_Avoid_: state dump, scan

**Plan**:
A deterministic list of steps and effects built from a snapshot and persisted state by a pure function. Plans are written to `debug/` before execution.
_Avoid_: action, command list

**Step**:
One AeroSpace CLI invocation inside a plan, marked `query` or `mutate`; a mutate step may be `allowFailure`.

**Effect**:
A persistence or log side effect that a plan applies after its steps succeed.

**Runner**:
The thing that executes steps: real, dry-run, or mock.

**Dry run**:
Executing a plan with mutate steps skipped and effects withheld. Always available through `DRY_RUN=1`.

## Window model

**Workspace**:
An AeroSpace workspace, the unit that is shown on a monitor. Named, persistent, never closed by us.
_Avoid_: space, desktop

**Monitor**:
A physical display, identified by AeroSpace's monitor id. Exactly one workspace is visible per monitor.
_Avoid_: screen, display

**Task workspace**:
A workspace named `task:<id>` holding the windows tracked to that task.
_Avoid_: branch workspace

**Inbox**:
The workspace named `inbox` where untracked and detached windows live.
_Avoid_: untracked, scratch

**Stash workspace**:
The hidden workspace named `STASH` where stashed windows are parked.

**Blank workspace**:
A temporary workspace `blank-<monitorId>` summoned to a monitor so nothing is visible there during a global stash.

**Stash entry**:
A record of windows moved to the stash workspace and the visible-workspace-per-monitor layout at that moment, so both can be restored.

**Stash stack**:
The ordered list of stash entries, newest first, addressed as `stash@{n}`. Persisted in `state/globalStash.json`.

## Operations

**Checkout**:
Make a workspace visible on a monitor. Moves no windows.
_Avoid_: switch, open

**Track**:
Move a window into a task workspace explicitly. Never happens implicitly.
_Avoid_: adopt, capture, add

**Untrack**:
Move a window from a task workspace to the inbox. Never closes it.
_Avoid_: remove, delete

**Stash push**:
Move a scope's windows to the stash workspace and record a stash entry.

**Stash pop**:
Restore a stash entry's windows and layout, then drop the entry. Missing windows are logged and skipped.

## Deck interaction

**Layer**:
A whole-deck mode with its own key map: MAIN drives the workflow, VIEW inspects and navigates.
_Avoid_: page, mode

**Tap / Hold**:
Two intensities of the same intent on one key. Tap is the safe form; hold is the bulk or destructive form.

**Lifecycle**:
The persisted state `IDLE`, `RUNNING`, or `PAUSED` of the selected task, with its ambient and task stash references. Under revision (map #2).

**Ambient**:
Whatever was visible before a task was started; stashed on START, restored on PAUSE and STOP.
