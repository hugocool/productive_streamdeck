# native/keysender/AGENTS.md

This folder contains a small Swift helper that posts macOS shortcuts reliably (used by the Node controller).

## Build
- `npm run native:build` (or `cd native/keysender && swift build -c release`)

## Usage contract (high level)
- Node calls the built binary in `native/keysender/.build/release/keysender`
- Keep CLI flags stable; update Node wrapper parsing in `src/nativeHelper.ts` if output changes.

## macOS permissions
Synthetic key events may require Accessibility / Input Monitoring permissions.
