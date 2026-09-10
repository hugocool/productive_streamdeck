# ADR-0003: Hold changes intensity, a layer changes category

**Status:** Accepted (2026-01)

## Context
Fifteen keys must carry safe daily operations, bulk operations, and destructive ones, plus inspection. Mixing them on one surface makes accidents easy and the layout hard to remember.

## Decision
- **Tap** is the safe form of an intent; **hold** is the same intent at a stronger intensity (bulk or destructive). Example: track focused window (tap) versus track all visible (hold).
- A **layer** switches the deck to a different category of intent: MAIN drives the workflow, VIEW inspects and navigates, a future tools layer does surgery. Layers are entered by an explicit toggle key.
- Destructive operations never sit on a tap in MAIN.

## Consequences
- The MAIN layout stays stable; new capability arrives as holds or new layers.
- "Delete" in VIEW means detach windows to the inbox and forget the task, not close windows.
