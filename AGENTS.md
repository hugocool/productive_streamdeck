# AGENTS.md

## Overview
This repo contains a Stream Deck controller for macOS built with
`@elgato-stream-deck/node`. It manages a simple lifecycle state machine,
handles Stream Deck button rendering, integrates with AeroSpace, and exposes
an HTTP server for agent callbacks.

## Vision and product goals
This project is a "Productivity OS": a physical dashboard that enforces
state-based computing and context switching on macOS, driven by code rather
than manual window management.

Button philosophy (two lanes):
- Workflow/meta lane: global controls that stay stable across contexts (state, stash/restore, task/branch view, navigation)
- App lane: context-aware shortcuts that change based on the active app (browser, VS Code, etc)

Core philosophy (state-based computing):
- Idle: choose what to do; Stream Deck offers START and project selection
- Active (deep work): three monitors locked to the current project
- Paused (branching): stash work, open fresh workspace, track/clean interruptions

Tech stack:
- Hardware: 15-key Stream Deck (controlled directly via Node.js)
- Window manager: AeroSpace (CLI-driven)
- Intelligence: Raycast + agentic AI
- State machine: Node.js "traffic controller"

Target 15-button layout (3x5):
- Row 1 (lifecycle):
  - [0,0] STATE: START (green) / PAUSE (amber) / RESUME (blue)
  - [0,1] INFO: current project/task
  - [0,2] MONITOR SWAP: rotate monitor content
  - [0,3] LOCK: pin a window across cleanup
  - [0,4] RAYCAST: global search / AI commands
- Row 2 (context layer; dynamic by app + monitor):
  - Input monitor: e.g., VS Code shows [Test], [Lint], [Commit]
  - Reference monitor: e.g., Chrome shows [Clip to Project], [Search Docs]
  - Comms monitor: e.g., Slack quick reply / ticket status
- Row 3 (agentic + navigation):
  - [2,0]-[2,2] Teleport buttons: focus input / reference / comms screens
  - [2,3] CLIPBOARD: Raycast clipboard history
  - [2,4] AI AGENT: start agent (idle), spin while working, pulse when done

Killer feature (branching + cleanup):
- PAUSE: stash current work, open interruption workspace, track stray windows
- RESUME: prompt to trash interruption windows, restore work state
- STOP: scan tabs, optionally archive via agent, then close everything

## Git-inspired workflow model (defaults)
Goal: reuse Git vocabulary to make window/task workflows easy to remember, composable, and hard to accidentally nuke a desktop.

Core mapping (mental model):
- Branch == task context (windows explicitly “tracked” to the task)
- Checkout == focus/switch the visible task context
- Stash push/pop == hide/restore windows (recoverable) via a hidden workspace
- Commit == snapshot (save) the task’s window set + layout metadata for later restore
- Clean == close “stray”/inbox windows after an interruption
- Merge (optional) == bring selected windows from another task into the current task

Key default decisions (important):
- Task identity/branch names: prefer syncing from a task tracker (Notion/TickTick/Toggl/etc). Branch/workspace representation is intentionally parked until sync exists.
- Inbox exists: keep an `INBOX`/untracked zone where new or detached windows can live without being auto-associated to the active task.

### START semantics (checkout + focus)
Default: manual “add window to task” (explicit tracking).
- Why: prevents window theft, makes task boundaries stable, matches `git add` being intentional.
- Hold START: adopt visible → task (bulk “add -A” equivalent; powerful but intentional).
- Future (optional): “auto-track windows created after START” toggle, only after reliable new-window detection exists.

Net: START changes *visibility/focus*; membership/tracking is explicit (with a bulk-adopt behind hold).

### PAUSE semantics (stash WIP + clear desk)
Default: stash all visible workspaces across monitors, then switch to inbox.
- Tap PAUSE: snapshot + stash visible (multi-monitor) + switch to `INBOX`.
- Hold PAUSE: stash focused workspace only (surgical pause; matches current focused-snapshot behavior).

### STOP semantics (recoverable end)
Default: stash + archive (recoverable stop).
- Tap STOP: snapshot + stash task + mark inactive (recoverable).
- Hold STOP: hard stop (close windows) — destructive and intentionally behind a modifier.
- “Detach-but-visible” is not STOP: keep it as a separate tools-layer operation (untrack windows to `INBOX` while staying visible; closer to `git rm --cached` semantics).

### VIEW button (inspect + navigate)
Default: dedicated VIEW mode/layer (keeps the main driving layer clean).
VIEW should expose:
- Status: current task + lifecycle state + counts (task windows vs inbox windows)
- Branch list: today/in-progress tasks (from tracker), checkout
- Stash list: `stash@{0..n}` with apply/pop/drop
- Recovery: restore last snapshot, clean inbox, panic restore

### Layer mechanics (strict rule)
- Hold = alternate intensity on the same intent (safe vs bulk vs destructive).
  - Examples: track focused (tap) vs track visible (hold); stop stash (tap) vs stop close (hold).
- Layer toggle = different category of intent (view/debug/admin).
  - Main layer: drive workflow; View layer: inspect/navigate; Tools/Admin: surgery/settings.

## How the project works
`src/index.ts` is the entry point. It:

- Connects to the Stream Deck via `elgato-stream-deck`
- Maintains lifecycle state (`IDLE`, `RUNNING`, `PAUSED`) plus task + stash refs
- Renders button images via `sharp` (text labels + a cycle icon)
- Starts an HTTP server for agent callbacks (`GET /agent-done`)
- Integrates with AeroSpace (window stash/unstash)
- Triggers macOS keyboard shortcuts via a native Swift helper (`native/keysender`)

### AeroSpace debugging notes
- When you want “all windows in the current workspace”, use `list-windows --workspace focused` (not `list-windows --focused`, which targets a single focused window).
- If AeroSpace actions appear to do nothing, suspect PATH issues (`aerospace` not found) and check the `[AeroSpace FAIL]` log payload for `ENOENT`/stderr.

### Stream Deck button mapping (15-key)
- Key 0 (top-left): START/PAUSE/RESUME (lifecycle over tasks)
- Key 1 (top row): STOP when running/paused, RESUME when a global stash exists
- Key 5 (middle-left): AI pulse indicator
- Keys 10–14 (bottom row): Microsoft Edge shortcut row (when Edge is visible)

If your model or layout differs, remap in `src/streamDeck.ts`.

## Running
```bash
npm install
npm run build
npm start
```

## Live reload (auto rebuild + restart)
For auto-updating the app while editing, use the watch mode:
```bash
npm run dev
```

This runs `tsc -w` to rebuild `dist/` and `nodemon` to restart the app when
compiled output changes. The VS Code launch config runs this script by default.

## Debugging in VS Code
Use the "Stream Deck (Root App)" launch configuration in `.vscode/launch.json`.
It runs `npm run dev`, so changes rebuild and restart automatically.

## Testing
Minimal Node.js test suite lives in `test/`. Use `npm test` (runs `npm run build` + the local test harness).

## OS permissions
The native key sender posts synthetic key events via CoreGraphics. macOS may
prompt for Accessibility / Input Monitoring permissions the first time it runs.

## Instructions vs documentation
- Use `AGENTS.md` for agent instructions, decisions, and rationale.
- Use docstrings and `README.md` for user-facing documentation and usage details.
- When you make a decision or fix an issue, document the "what" and "why" in the
  relevant `AGENTS.md`, not in docstrings or `README.md`.
- If working in a submodule or new subfolder, create or update a local
  `AGENTS.md` in that submodule/folder to record decisions there.

## Testing policy (TDD)
- Always start with tests for the functionality you are about to implement.
- Begin with higher-level tests first, then add lower-level tests as needed.
- Ensure existing behavior is covered so regressions are caught.
- Build, run tests, and iterate until all tests pass (or update tests if they
  no longer match the intended behavior).
- If the current test tooling does not fit the project, refactor or replace it
  to better match the purpose of the project.

## Stage 0.5 development guardrails
- All stateful actions must follow Snapshot → Plan → Execute.
- Plan generation should be pure and deterministic (no side effects).
- `DRY_RUN=1` must skip mutate steps and still write `debug/last-plan.json`.
- Persist to `state/globalStash.json` and `state/appState.json` using atomic writes.
- Avoid `--monitor all` unless explicitly performing a global stash.
- Prefer `--window-id` operations over focus-dependent commands.

## Stage 1.5 stash stack requirements
- `globalStash.json` is a versioned stack (`version: 2`, `stack: []`).
- STOP/RESUME must map to `stash push`/`stash pop` for `stash@{0}`.
- Stash apply must be non-fatal if a window no longer exists (log and continue).
- PAUSE uses global visible scope by default; focused-only is a later opt-in.

## Stage 2 task workspace rules
- Task workspaces are namespaced: `task:<id>`.
- Checkout only summons the workspace; it does not move windows.
- Tracking is explicit: track focused or visible windows into a task workspace.
- trackVisible must not steal from other `task:*` workspaces by default.
- Untrack moves focused window to `inbox`.
- Keep `STAGE2_TESTING.md` updated when task workflows change.

## Stage 3 lifecycle requirements
- App state is `(selectedTaskId, lifecycle, stash refs)` and persisted in `state/appState.json`.
- START/RESUME are no-ops without `selectedTaskId` (selection is explicit).
- START stashes ambient visible windows (excluding the task workspace) and checks out the task.
- PAUSE stashes task windows and restores the ambient stash.
- RESUME stashes the current ambient view, checks out the task, then restores the task stash.
- STOP stashes task windows and restores the ambient view (recoverable stop).
- Stage 3 does not close windows or auto-clean strays.
- Keep `STAGE3_TESTING.md` updated when lifecycle behavior changes.

## Tooling and setup
Build and run:
- Build: `npm run build` (TypeScript -> `dist/`)
- Dev (watch + restart): `npm run dev` (uses `tsc -w` + `nodemon`)
- Start: `npm start`
- Native helper build: `npm run native:build` (builds `native/keysender`)

VS Code:
- Launch config runs `npm run dev` for auto-rebuild + restart.

Packaging/deploy:
- macOS app packaging is not set up yet. If needed, add a packaging step
  (for example `pkg`, `electron`, or `node-macos` based) and document the
  chosen approach + rationale in `AGENTS.md`.

## Decisions and rationale
- Replaced `osascript` keystroke injection with a native Swift helper to avoid
  AppleScript fragility and improve performance. The helper uses AppKit for
  app activation, CGWindow APIs for visibility checks, and CGEvent to post the
  shortcut. This keeps Stream Deck logic in Node while isolating macOS
  permissions in a stable, buildable binary.
- Shortcut delivery still requires Edge to become frontmost, because macOS
  does not reliably deliver synthetic keystrokes to background apps. The helper
  enforces this and can restore focus afterward.
- Added a `checkDeck` diagnostic script to validate end-to-end control of the
  Stream Deck and basic AeroSpace command wiring (keys, colors, and CLI calls)
  before implementing higher-level Productivity OS behaviors.
- Added a minimal `config/aerospace.toml` template to encode always-on window
  routing and workspace persistence, keeping the state machine logic in Node.
- Wired PAUSE/RESUME to AeroSpace: snapshot focused windows, move them to
  `STASH`, close interruption windows on resume, and restore stashed windows
  to their original workspaces.
- Implemented Stage 0.5 plan/execute plumbing: Stream Deck actions now build
  deterministic plans, execute them via an AeroSpace runner, support `DRY_RUN=1`,
  and persist `state/globalStash.json` + `state/appState.json` with atomic writes.
- Implemented Stage 1.5 stash stack: STOP/RESUME now push/pop a `stash@{n}` stack
  (global visible scope), with persistence migration from version 1 snapshots.
- Implemented Stage 3 lifecycle: lifecycle state is persisted with task + stash refs,
  START/PAUSE/RESUME/STOP are built on the stash stack + task checkout, and STOP
  records `lastStopStashId` in the task registry for recoverable sessions.
- Added a macOS install script that builds the Node and Swift components,
  creates a minimal `.app` bundle, and bakes in a selected free port plus a
  matching AeroSpace template so local installs avoid port collisions.
- Packaging roadmap: ship incrementally via (1) Homebrew + LaunchAgent for
  repeatable installs, then (2) a signed menu bar app that manages the Node
  daemon, stores secrets in Keychain, and installs an AeroSpace hook script
  that can discover the current port (instead of hardcoding `:3000`).
- Replaced the `node:test` runner in `test/` with a small local harness to keep
  tests runnable under the repo's current Node 14 environment.
- Added an AeroSpace sync helper that rewrites the local AeroSpace config with
  a free port and stores it in `.streamdeck-port`, plus a dev wrapper that reads
  that port so debug runs stay aligned with the window-manager hook.
- Tightened the native shortcut sender so it only posts key events after the target app is confirmed frontmost (prevents shortcuts leaking to the currently focused app when activation is slow), and added a small reusable Node wrapper (`src/appShortcuts.ts`) so app-targeted shortcuts are composable beyond Edge.
