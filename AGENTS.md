# Productive Stream Deck — agent instructions

A Node/TypeScript controller for a 15-key Elgato Stream Deck that drives the
AeroSpace tiling window manager on macOS (three monitors). The deck is a
physical porcelain over window state, using git vocabulary: workspaces are
branches, checkout shows one, stash hides and restores windows.

## Orientation
1. **Process comes from Superpowers.** Brainstorm before building, tests before
   implementation, systematic debugging before a fix, verification before any
   claim that something works. Design specs land in `docs/superpowers/specs/`.
2. **The tracker is supplemental.** GitHub issue #2 is the wayfinder map; its
   open sub-issues are the decisions still to make. Read it before choosing
   work and record decisions there. Where the tracker skills and Superpowers
   disagree, Superpowers wins: wayfinder's "plan, don't do" records what is
   still undecided, it does not stop an agreed build from proceeding.
3. **Vocabulary:** `CONTEXT.md`. **Decisions with rationale:** `docs/adr/`.
4. **Direction as of 2026-09:** the task lifecycle (START/PAUSE/RESUME/STOP over
   a stash stack) is being replaced by project switching that never moves or
   closes a window, plus one lifecycle script for the whole stack. What the
   keys do today is in `docs/manual-testing.md`.

## Commands worth knowing
- `npm run dev` rebuilds and restarts on change and reads `PORT` from `.streamdeck-port`; `npm run aerospace:sync` renders `config/aerospace.toml` with a free port and writes that file.
- `npm test` builds, then runs `test/runTests.mjs`, a tiny local harness (not `node:test`). New test files must be registered there.
- `DRY_RUN=1` skips every mutate step but still writes `debug/last-plan.json`.
- `npm run native:build` compiles the Swift key sender in `native/keysender`; macOS asks for Accessibility and Input Monitoring once.

## Non-obvious structure
- `src/core/*Plans.ts` and `plans.ts` are pure: state in, `{ plan, next }` out, no I/O. `src/core/executePlan.ts` runs a plan through an `AerospaceRunner` (real, dry, mock) and applies persist effects afterwards.
- `state/` and `debug/` are gitignored runtime output written atomically by `src/core/persistence.ts`; missing files fall back to defaults.
- `src/aerospace.ts` parses CLI output; `src/core/taskSnapshot.ts` reads state and returns `null` when AeroSpace is unreachable.

## Hard rules
- **Non-destructive.** No plan may close a window. Show workspaces rather than move windows; address windows by `--window-id`, never by focus; no `--monitor all` in a mutate step unless it is an explicit global stash.
- **Snapshot → Plan → Execute** for every stateful action (ADR-0001). Handlers never call AeroSpace directly.
- AeroSpace rejects workspace names starting with `_`; ours are `blank-<monitorId>`, `STASH`, `inbox`, `task:<id>`.
- Keep this file under 200 lines: procedures go in `.claude/skills/`, hard-to-reverse choices in `docs/adr/`, everything else in a ticket comment.

## In this repo
- `.claude/skills/aerospace-debugging` — when an AeroSpace call appears to do nothing or when writing a new plan step.
- `docs/manual-testing.md` — current key map and the hardware acceptance checklist.
- `docs/notes/` — parked material, out of scope for map #2.
