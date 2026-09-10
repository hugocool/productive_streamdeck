# ADR-0001: Every stateful action is Snapshot → Plan → Execute

**Status:** Accepted (2026-01)

## Context
Early versions called the AeroSpace CLI directly from key handlers. Failures mid-sequence left windows half-moved with no record of what had been attempted, and nothing could be tested without hardware.

## Decision
A key press reads a snapshot, hands it with persisted state to a pure plan builder, and executes the resulting plan through a runner. Plan builders live in `src/core/` and perform no I/O. The plan is written to `debug/last-plan.json` before execution and the execution log after. `DRY_RUN=1` skips mutate steps and withholds effects.

## Consequences
- Plans are unit-testable with fixtures; the runner is mockable.
- Every mutation is inspectable after the fact.
- Builders must be deterministic given their inputs; ids and timestamps are the only exceptions.
- Adding a new operation means adding a builder plus a test, not a handler.
