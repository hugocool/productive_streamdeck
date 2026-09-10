# Productive Stream Deck

A Node.js/TypeScript controller for a 15-key Elgato Stream Deck on macOS. It drives the [AeroSpace](https://github.com/nikitabobko/AeroSpace) tiling window manager so that switching between projects across several monitors is a key press, and never closes a window. A small HTTP server lets agents and scripts poke the deck.

- Agent and contributor instructions: [AGENTS.md](AGENTS.md) (loaded by Claude Code through [CLAUDE.md](CLAUDE.md))
- Vocabulary: [CONTEXT.md](CONTEXT.md). Decisions: [docs/adr/](docs/adr/)
- Plan and open decisions: [GitHub issue #2](https://github.com/hugocool/productive_streamdeck/issues/2)
- Manual test checklist: [docs/manual-testing.md](docs/manual-testing.md)

## What it does today
- Lifecycle keys (START / PAUSE / RESUME / STOP) over a selected task, built on a recoverable stash stack: windows are parked in a hidden workspace and restored, never closed.
- A VIEW layer that lists task workspaces, creates new ones, and safely detaches windows to an inbox.
- An app row of Microsoft Edge shortcuts that appears only while Edge is visible, delivered through a native Swift key sender.
- Status endpoints on a local port: `GET /health`, `GET /status`, `POST /ping`, `POST /update`, `GET /agent-done` (pulses a key), `GET /aerospace-event` (refreshes app rows).

The next step, tracked on issue #2, replaces the task lifecycle with summon-only project switching and adds one script to boot and maintain the whole stack.

## Requirements
- macOS with AeroSpace installed (`brew install --cask nikitabobko/tap/aerospace`).
- Node 18 or newer (`.nvmrc` provided).
- A 15-key Stream Deck. Without one the HTTP server still runs.
- Xcode command line tools, to build the key sender.

## Install and run
```bash
git clone https://github.com/hugocool/productive_streamdeck.git
cd productive_streamdeck
npm install
npm run native:build      # Swift key sender; macOS will ask for Accessibility + Input Monitoring
npm run aerospace:sync    # renders config/aerospace.toml with a free port, writes .streamdeck-port
npm run build
npm start                 # or: npm run dev (rebuild + restart on change)
```

Copy or merge the rendered AeroSpace config into `~/.aerospace.toml` and reload AeroSpace. The `exec-on-workspace-change` hook in it must point at the port printed on startup.

`DRY_RUN=1 npm run dev` writes plans to `debug/last-plan.json` without moving any window.

## Testing
```bash
npm test            # builds, then runs test/runTests.mjs
npm run check:deck  # lights the deck and checks AeroSpace wiring
```

## Layout of the repo
- `src/` controller, plan builders, AeroSpace adapter, HTTP server
- `native/keysender/` Swift helper for app shortcuts
- `config/aerospace.toml` AeroSpace template; `scripts/` sync, dev, and install helpers
- `test/` unit tests on the pure plan builders
- `docs/` ADRs, manual tests, agent tracker config, parked notes
- `state/`, `debug/` runtime output, gitignored

## License
MIT
