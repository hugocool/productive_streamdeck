# Productive Stream Deck

A Node.js TypeScript application for controlling a 15-key Elgato Stream Deck with state machine management, AeroSpace window management integration, and a local Express server for receiving status updates from Raycast/AI agents.

## Features

- **State Machine**: Manages application lifecycle with three states:
  - `IDLE`: Initial state, ready to start
  - `ACTIVE`: Application is running
  - `PAUSED`: Application is temporarily paused

- **Stream Deck Integration**: 
  - Top-left key (0): Lifecycle control with morphing labels
    - `START` (IDLE → ACTIVE) - Green
    - `PAUSE` (ACTIVE → PAUSED) - Orange
    - `RESUME` (PAUSED → ACTIVE) - Blue
  - Top-right key (4): Agentic AI - Purple
    - Integrates with AeroSpace for window management

- **AeroSpace CLI Integration**: Wrapper utilities for window "stashing" (hiding/showing workspaces)

- **Express Server**: HTTP server on port 3000 for receiving status pings from external tools
  - `GET /health` - Health check endpoint
  - `GET /status` - Get current application state
  - `POST /ping` - Receive status pings from Raycast/AI agents
  - `POST /update` - Receive action updates from external agents

## Prerequisites

- Node.js (v18 or higher)
- Elgato Stream Deck (15-key model)
- macOS with AeroSpace window manager (optional, for window stashing features)

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

## Usage

1. Build the project:
```bash
npm run build
```

2. Start the application:
```bash
npm start
```

Or use the combined dev command:
```bash
npm run dev
```

The application will:
- Connect to your Stream Deck
- Start the Express server on port 3000
- Initialize the state machine in IDLE state

## Key Layout

```
[Lifecycle] [ 1 ] [ 2 ] [ 3 ] [  AI   ]
[    5    ] [ 6 ] [ 7 ] [ 8 ] [  9    ]
[   10    ] [11 ] [12 ] [13 ] [ 14    ]
```

## API Endpoints

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
│   ├── streamDeck.ts      # Stream Deck controller
│   ├── aerospace.ts       # AeroSpace CLI wrappers
│   └── server.ts          # Express server
├── package.json           # Project dependencies
├── tsconfig.json          # TypeScript configuration
└── README.md             # This file
```

## Development

The project uses TypeScript with strict type checking. Key technologies:
- `@elgato-stream-deck/node`: Stream Deck hardware interface
- `sharp`: Image processing for button graphics
- `express`: HTTP server for external integrations

## License

MIT