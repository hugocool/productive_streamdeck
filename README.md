# Productive Stream Deck

A Node.js TypeScript application for controlling a 15-key Elgato Stream Deck on
macOS, with a lightweight state machine, AeroSpace integration, and an HTTP
status server for external callbacks.

## Features

- **State Machine**: Manages lifecycle with three states: `IDLE`, `ACTIVE`, `PAUSED`
- **Stream Deck Integration**:
  - Key 0 (top-left): Lifecycle control (`START`/`PAUSE`/`RESUME`)
  - Key 1 (top row): Stash/restore all visible windows (“big stash” toggle)
  - Key 5 (middle-left): AI pulse indicator
  - Keys 10–14 (bottom row): Microsoft Edge shortcuts (when Edge is visible)
- **Action Layers**:
  - Meta-actions: global controls that stay consistent across contexts
  - App-specific actions: context-aware shortcuts that change based on active app
- **AeroSpace CLI Integration**: Stash/unstash helpers for window management
- **Native Key Sender**: Swift helper for reliable macOS shortcut delivery (`native/keysender`)
- **Status Server** (defaults to port 3000):
  - `GET /health`
  - `GET /status`
  - `POST /ping`
  - `POST /update`
  - `GET /agent-done` (triggers AI pulse)
  - `GET /aerospace-event` (refreshes context on workspace changes)

## Prerequisites

- Node.js (v18 or higher). If you use `nvm`, this repo includes `.nvmrc` (run `nvm use`).
- Elgato Stream Deck (15-key model)
- macOS (AeroSpace optional, for window stashing)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/hugocool/productive_streamdeck.git
cd productive_streamdeck
```

2. Install dependencies:
```bash
npm install
```

## Shipping roadmap (macOS)

Long-term, this should ship as a signed, installable macOS menu bar app. To get
there incrementally, we plan to do:

### Phase 1: Homebrew + LaunchAgent (option 2)

Goal: repeatable installs + “runs on login” without building toolchains on end-user machines.

Deliverables:
- A `brew` tap/formula that installs `dist/`, production deps, and a prebuilt `native/keysender`.
- A `launchd` LaunchAgent (`~/Library/LaunchAgents/...plist`) that runs the controller on login.
- A `productive-streamdeck setup` command that:
  - Installs/updates an AeroSpace hook script (instead of hardcoding `http://127.0.0.1:3000/...` in `~/.aerospace.toml`).
  - Stores runtime config in `~/Library/Application Support/<bundle-id>/config.json`.
  - Prints a minimal, safe patch to apply to the user’s existing `~/.aerospace.toml` (no blind overwrite).

Notes:
- This phase forces us to define stable paths, logging, and an uninstall story early.
- If the HTTP server port changes, AeroSpace should call a hook script that discovers the current port (preferred) rather than hardcoding `3000`.

### Phase 2: Menu bar app + managed daemon (option 4)

Goal: “download → install → guided setup”, with a UI for state/health and permissions.

Architecture (recommended):
- A lightweight macOS menu bar app (Swift/AppKit) that manages a background daemon.
- The daemon continues to run the Node Stream Deck controller (and shells out to AeroSpace + `native/keysender`).
- The menu bar app provides: start/stop/restart, connection status, port/config display, logs, and “Install AeroSpace hook”.

Work needed to get there:
- Packaging:
  - Bundle a Node runtime (or a single packaged Node executable) + `dist/` + `node_modules` + `keysender`.
  - Code signing + notarization.
- Configuration/secrets:
  - Move API keys into macOS Keychain (menu bar UI for setup/rotation).
  - Keep non-secret preferences in Application Support.
- Networking:
  - Bind the local server to `127.0.0.1` only.
  - Prefer a stable discovery mechanism (hook script + config file) over a fixed port.
- Permissions/onboarding:
  - Guided checklist for Accessibility / Input Monitoring (required for key sending).
  - Health UI for Stream Deck connection and AeroSpace CLI availability.
- Updates:
  - Add auto-update (Sparkle) once signing/notarization is in place.

Rough effort (very approximate):
- Minimal prototype menu bar controller (start/stop + status + logs): ~3–7 days.
- Production-ready (signing/notarization, Keychain, onboarding UX, updater): ~2–4 weeks.

## Usage

1. Build the project:
```bash
npm run build
```

2. Start the application:
```bash
npm start
```

## Hardware handshake (check deck)

Use the minimal Stream Deck + AeroSpace probe:
```bash
npm run check:deck
```

The application will:
- Connect to your Stream Deck
- Start the Express server (defaults to port 3000)
- Initialize the state machine in IDLE state

## Key Layout

```
[ 0 STATE ] [ 1 STASH] [   2   ] [   3   ] [   4   ]
[  5  AI  ] [   6   ] [   7   ] [   8   ] [   9   ]
[10 EDGE* ] [11 EDGE*] [12 EDGE*] [13 EDGE*] [14 EDGE*]
```

`EDGE*` keys render only when Edge is visible (otherwise the bottom row is cleared).

## Action Layers

We design for two complementary modes:

- System-level productivity: global controls that stay consistent across contexts
- App-specific productivity: context-aware shortcuts that adapt to the active app or monitor

## Workflow model (proposal)

The long-term goal is to make the workflow/meta buttons feel like Git:

- Branch == task context (a named set of windows/workspaces)
- Checkout == switch tasks (swap the visible task across monitors)
- Stash push/pop == hide/restore windows (move to/from a hidden workspace)
- Commit == snapshot (save current window set/layout for later restore)
- Clean == close strays (end interruptions by removing unrelated windows)

Defaults we’re building toward (important):
- START: checkout/focus only; windows are tracked explicitly (“add window to task”).
  - Hold START: adopt visible → task (bulk add).
- PAUSE: stash all visible workspaces (multi-monitor) + switch to an `INBOX`/untracked zone.
  - Hold PAUSE: stash focused workspace only.
- STOP: stash + archive (recoverable).
  - Hold STOP: hard stop (close windows).
- VIEW: dedicated layer for status/log/stash list/recovery.
- Hold = intensity on same intent; Layer toggle = different intent category.

Task/branch naming is expected to come from a task tracker (Notion/TickTick/Toggl/etc); the exact workspace representation is intentionally deferred until sync exists.

Current app-specific targets:
- Microsoft Edge (Notion lives here)
- Visual Studio Code
- TickTick
- Slack (or other messaging apps)
- Notion Calendar
- Toggl
- Raycast

## AeroSpace configuration

AeroSpace is the always-on "physics layer" for window routing and workspace
invariants. We keep that logic in a static config, and run state transitions
from Node.

Template config:
- `config/aerospace.toml`

Install (copy and customize app IDs):
```bash
cp config/aerospace.toml ~/.aerospace.toml
```

To find bundle IDs:
```bash
aerospace list-apps
```

Note: avoid force-assigning workspaces you want to "swap" across monitors.
If you want the “INBOX/untracked by default” workflow, adjust the AeroSpace routing so new windows land in `INBOX` (or remove per-app auto-routing).

We use `exec-on-workspace-change` to notify the Node controller so the
Stream Deck can refresh context-aware buttons.

## AeroSpace diagnostics

If window stashing/restoring looks like “nothing happened”, validate AeroSpace behavior directly first:

```bash
aerospace list-windows --monitor focused --workspace focused --format "%{window-id} | %{workspace} | %{app-name} | %{window-title}"
aerospace list-windows --focused --format "%{window-id} | %{workspace} | %{app-name} | %{window-title}"
```

The first command lists windows in the focused workspace; the second lists (at most) the focused window. Also check logs for `ENOENT` if the controller can’t find the `aerospace` binary via `PATH`.

## macOS permissions

The native shortcut helper uses CoreGraphics to post synthetic key events. macOS may prompt for Accessibility / Input Monitoring permissions.

## API Endpoints

Note: the server defaults to port 3000, but may auto-increment if that port is busy. Check the app logs for the active port.

### GET /health
Returns server health status
```bash
curl http://localhost:3000/health
```

### GET /status
Returns current application state
```bash
curl http://localhost:3000/status
```

### GET /agent-done
Trigger an AI pulse on the Stream Deck
```bash
curl http://localhost:3000/agent-done
```

### GET /aerospace-event
Refresh Stream Deck context after AeroSpace workspace changes
```bash
curl http://localhost:3000/aerospace-event
```

### POST /ping
Send a status ping from external agents
```bash
curl -X POST http://localhost:3000/ping \
  -H "Content-Type: application/json" \
  -d '{"source": "raycast", "message": "Task completed"}'
```

### POST /update
Send an action update
```bash
curl -X POST http://localhost:3000/update \
  -H "Content-Type: application/json" \
  -d '{"action": "status_update", "data": {"progress": 50}}'
```

## Project Structure

```
productive_streamdeck/
├── src/
│   ├── index.ts           # Main entry point
│   ├── stateMachine.ts    # State machine implementation
│   ├── streamDeck.ts      # Stream Deck controller + button artwork
│   ├── aerospace.ts       # AeroSpace CLI wrappers
│   └── server.ts          # Express server
├── package.json           # Project dependencies
├── tsconfig.json          # TypeScript configuration
└── README.md              # This file
```

## Development

Key technologies:
- `@elgato-stream-deck/node`: Stream Deck hardware interface
- `sharp`: Image processing for button graphics
- `express`: HTTP server for external integrations

## License

MIT
