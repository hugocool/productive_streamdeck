# Productive Stream Deck — agent instructions

A Node/TypeScript controller for a 15-key Elgato Stream Deck that drives the
AeroSpace tiling window manager on macOS (three monitors). The deck is a
physical porcelain over window state, using git vocabulary: workspaces are
branches, checkout shows one, stash hides and restores windows.

## How work happens here

Superpowers sets the process. Announce the skill you are using, then follow it.

- **Building anything new** — `superpowers:brainstorming` first, ending in a
  design under `docs/superpowers/specs/`, then `writing-plans`, then
  `executing-plans`. Do not skip to code because a change looks small.
- **Writing code** — `superpowers:test-driven-development`. The pure plan
  builders in `src/core/` are the easy case: fixtures in, plan out, no hardware
  needed. Anything that cannot be tested that way probably belongs in a builder.
- **A bug or anything surprising** — `superpowers:systematic-debugging` before
  proposing a fix. On this project "it doesn't work" is usually AeroSpace rather
  than TypeScript; the `aerospace-debugging` skill holds the specific traps.
- **Claiming something works** — `superpowers:verification-before-completion`.
  `npm test` must pass, and anything that moves windows needs a run through
  `docs/manual-testing.md` on real hardware. Evidence before assertions.
- **Finishing** — `superpowers:requesting-code-review`, then
  `finishing-a-development-branch`.

Two gaps Superpowers leaves open, filled by the tracker skills:

- **Decisions that outlive a session.** GitHub issue #2 is the wayfinder map;
  its open sub-issues are what is still undecided. Read it before choosing work
  and record the answer there when you settle one. `/grilling` is the tool for
  working one of those questions with the user.
- **Vocabulary and hard-to-reverse choices.** `CONTEXT.md` is the glossary and
  `docs/adr/` the decision records, maintained with `/domain-modeling`. Use the
  glossary's terms in code, tests, and issue titles.

On conflict Superpowers wins. Wayfinder's "plan, don't do" records what is
undecided; it does not stop an agreed build from proceeding.

## Direction as of 2026-09

The task lifecycle (START/PAUSE/RESUME/STOP over a stash stack) is being
replaced by project switching that never moves or closes a window, plus one
lifecycle script for the whole stack. What the keys do today is in
`docs/manual-testing.md`.

## Commands worth knowing
- `npm run dev` rebuilds and restarts on change and reads `PORT` from `.streamdeck-port`; `npm run aerospace:sync` renders `config/aerospace.toml` with a free port and writes that file.
- `npm test` builds, then runs `test/runTests.mjs`, a tiny local harness (not `node:test`). New test files must be registered there.
- `DRY_RUN=1` skips every mutate step but still writes `debug/last-plan.json`.
- `npm run native:build` compiles the Swift key sender in `native/keysender`; macOS asks for Accessibility and Input Monitoring once.

## Non-obvious structure
- `src/core/*Plans.ts` and `plans.ts` are pure: state in, `{ plan, next }` out, no I/O. `src/core/executePlan.ts` runs a plan through an `AerospaceRunner` (real, dry, mock) and applies persist effects afterwards.
- `state/` and `debug/` are gitignored runtime output written atomically by `src/core/persistence.ts`; missing files fall back to defaults.
- `src/aerospace.ts` parses CLI output; `src/core/taskSnapshot.ts` reads state and returns `null` when AeroSpace is unreachable.
- `docs/research/aerospace-guarantees.md` records what AeroSpace does and does not promise, with citations.

## Hard rules
- **Non-destructive.** No plan may close a window. Show workspaces rather than move windows; address windows by `--window-id`, never by focus; no `--monitor all` in a mutate step unless it is an explicit global stash.
- **Snapshot → Plan → Execute** for every stateful action (ADR-0001). Handlers never call AeroSpace directly.
- AeroSpace rejects workspace names starting with `_`; ours are `blank-<monitorId>`, `STASH`, `inbox`, `task:<id>`.
- Keep this file under 200 lines: procedures go in `.claude/skills/`, hard-to-reverse choices in `docs/adr/`, everything else in a ticket comment.

## In this repo
- `.claude/skills/aerospace-debugging` — when an AeroSpace call appears to do nothing or when writing a new plan step.
- `docs/manual-testing.md` — current key map and the hardware acceptance checklist.
- `docs/notes/` — parked material, out of scope for map #2.
