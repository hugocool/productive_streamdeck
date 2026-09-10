# ADR-0004: Stash hides windows by moving them to a STASH workspace

**Status:** Accepted (2026-01). **Under review** in map #2, ticket "What becomes of the stash stack and task lifecycle grammar?" (#10).

## Context
AeroSpace has no native "hide this set of windows and bring it back" primitive. Windows can be moved between workspaces by id, and a workspace can be summoned to a monitor.

## Decision
Stash push moves each window in scope to the `STASH` workspace by `--window-id`, records the origin workspace per window and the visible workspace per monitor, and summons `blank-<monitorId>` workspaces so monitors look empty. Stash pop reverses it, skipping windows that no longer exist. AeroSpace reserves names starting with `_`, hence `blank-` not `__blank`.

## Consequences
- Fully recoverable: nothing is closed.
- Every switch touches every window, so stale ids and partial failures are possible; pops are `allowFailure`.
- Summon-only project switching (one workspace per project per monitor) would not need this at all; that is the open question in #5 and #10.
