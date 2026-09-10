# ADR-0002: App shortcuts go through a native Swift helper

**Status:** Accepted (2026-01)

## Context
Sending keyboard shortcuts to apps via `osascript` was slow and fragile, and macOS does not reliably deliver synthetic keystrokes to background apps.

## Decision
`native/keysender` is a small Swift binary that activates the target app with AppKit, confirms it is frontmost, posts the shortcut with CGEvent, and optionally restores focus. Node calls it through `src/nativeHelper.ts` and `src/appShortcuts.ts`.

## Consequences
- macOS Accessibility and Input Monitoring permissions are needed once, for the helper only.
- Shortcuts only fire after the target app is confirmed frontmost, so they cannot leak into another app.
- The helper must be rebuilt (`npm run native:build`) on a fresh machine; the lifecycle script should own that.
