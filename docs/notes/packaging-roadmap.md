# Parked: shipping as a macOS app

Out of scope for wayfinder map #2 (the lifecycle script comes first). Kept as the intended path once the deck is useful day to day.

## Phase 1: Homebrew + LaunchAgent
- A brew formula that installs `dist/`, production deps, and a prebuilt `native/keysender`.
- A LaunchAgent plist that runs the controller on login.
- A `setup` command that installs an AeroSpace hook script (which discovers the current port instead of hardcoding it), stores runtime config under `~/Library/Application Support/<bundle-id>/`, and prints a minimal patch for the user's `~/.aerospace.toml` rather than overwriting it.
- Forces stable paths, logging, and an uninstall story early.

## Phase 2: menu bar app + managed daemon
- Swift/AppKit menu bar app managing the Node daemon: start/stop/restart, connection status, port, logs, "install AeroSpace hook".
- Bundle a Node runtime with `dist/`, `node_modules`, and the key sender; sign and notarize.
- Secrets in Keychain, preferences in Application Support, server bound to `127.0.0.1`.
- Guided permissions checklist (Accessibility, Input Monitoring), health UI for deck and AeroSpace CLI.
- Sparkle auto-update once signing is in place.

Rough effort: minimal menu bar controller 3–7 days; production-ready 2–4 weeks.

`scripts/install-mac.sh` is an early stab at a local `.app` bundle with a baked-in port.
