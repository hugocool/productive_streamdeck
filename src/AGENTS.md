# src/AGENTS.md

Keep this folder’s `AGENTS.md` short: it’s for agent-facing instructions and decisions. User-facing docs live in the root `README.md`.

## Index (quick pointers)
- Stream Deck UI + layers: `src/streamDeck.ts`
- VIEW layer plans: `src/core/viewPlans.ts`
- Local task id generation: `src/taskSelection.ts`
- Lifecycle: `src/lifecycle.ts`, `src/core/lifecyclePlans.ts`, `src/core/lifecycleActions.ts`
- AeroSpace snapshots: `src/core/taskSnapshot.ts`

## Scope
This folder holds the controller logic (Stream Deck rendering + button handlers), AeroSpace CLI wrappers, and the HTTP server wiring.

## Where to change what
- Button mapping + press/hold behavior: `src/streamDeck.ts`
- App-specific rows/layers: small modules like `src/edgeControls.ts`
- AeroSpace commands + snapshot/stash helpers: `src/aerospace.ts`
- Lifecycle plan builders: `src/core/lifecyclePlans.ts`
- Lifecycle execution (snapshot → plan → execute): `src/core/lifecycleActions.ts`
- Callback endpoints: `src/server.ts`

## Conventions
- Prefer “progressive disclosure”: keep the default key layout stable; add layers/modes via explicit toggles or hold-actions.
- Keep workflow/meta actions separate from app actions (meta is stable; app rows can be conditional on visibility).
- Document rationale in `AGENTS.md` (here or deeper), not in docstrings.

## Workflow defaults (do not drift)
- START: stash ambient visible windows (excluding the task workspace) + checkout task.
  - Tracking stays explicit (“add window to task”); START does not move windows into the task.
- PAUSE: stash task windows + restore ambient.
- RESUME: stash ambient + checkout task + restore task stash.
- STOP: stash task windows + restore ambient (recoverable stop).
- Lifecycle actions require `selectedTaskId` in `state/appState.json`.
- If no `selectedTaskId` exists, the Stream Deck auto-assigns the default task.
- Key 2 is a VIEW layer toggle; keep task/workspace management actions in that layer (paging, create, safe detach-to-inbox on hold).
  - In the VIEW layer, key 2 becomes a passive page indicator; key 4 is the single ESC/exit key.
  - Selecting a task in VIEW exits back to MAIN after checkout (the deck is a "picker", not a modal you stay in).

## Recent decisions (keep updated)
- VIEW layer replaces the old "task cycle" on key 2 to align with the repo's layer mechanics (layer toggle = different category of intent).
- Safe delete is implemented as "detach windows to inbox + remove task registry entry", not closing windows.
- “Detach-but-visible” is a separate tools-layer operation (not STOP).
- VIEW is a dedicated layer (status/branch list/stash list/recovery).
- Hold = intensity; Layer toggle = category.

## AeroSpace gotchas (debugging)
- Prefer “windows in the focused workspace” (`list-windows --workspace focused`) over “the focused window” (`list-windows --focused`) when implementing stash/cleanup logic.
- Use the documented argument order for targeted moves: `move-node-to-workspace --window-id <id> <workspace>`.
- Some operations rely on a focused node/window; when nothing is focused they can no-op or error. Avoid focus-dependent commands for core workflows.
- If “nothing happens”, suspect PATH (`aerospace` not found) and confirm via logs (our wrapper prints stderr + exit code).
- Snapshot helpers (`tryReadVisibleSnapshot`, `tryReadWorkspaceSnapshot`) return null when AeroSpace is unavailable; callers should no-op instead of throwing.
