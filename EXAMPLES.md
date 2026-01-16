# Usage Examples

## Starting the Application

```bash
# Build and start the application
npm run dev

# Or separately
npm run build
npm start
```

## Testing API Endpoints

### Health Check
```bash
curl http://localhost:3000/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2026-01-16T14:30:00.000Z"
}
```

### Get Current State
```bash
curl http://localhost:3000/status
```

Response:
```json
{
  "state": "IDLE",
  "timestamp": "2026-01-16T14:30:00.000Z"
}
```

### Send a Ping from Raycast
```bash
curl -X POST http://localhost:3000/ping \
  -H "Content-Type: application/json" \
  -d '{
    "source": "raycast",
    "message": "Task completed successfully"
  }'
```

Response:
```json
{
  "received": true,
  "timestamp": "2026-01-16T14:30:00.000Z"
}
```

### Send an Update from AI Agent
```bash
curl -X POST http://localhost:3000/update \
  -H "Content-Type: application/json" \
  -d '{
    "action": "progress_update",
    "data": {
      "task_id": "task-123",
      "progress": 75,
      "status": "running"
    }
  }'
```

Response:
```json
{
  "received": true,
  "action": "progress_update",
  "timestamp": "2026-01-16T14:30:00.000Z"
}
```

## State Machine Behavior

The state machine manages three states:

1. **IDLE** (Initial State)
   - Lifecycle button shows: "START" (Green)
   - Press to transition to ACTIVE

2. **ACTIVE** (Running State)
   - Lifecycle button shows: "PAUSE" (Orange)
   - Press to transition to PAUSED
   - AI button: Stashes windows to AeroSpace

3. **PAUSED** (Paused State)
   - Lifecycle button shows: "RESUME" (Blue)
   - Press to transition to ACTIVE
   - AI button: Unstashes windows from AeroSpace

## Stream Deck Key Layout

```
┌──────────┬──────────┬──────────┬──────────┬──────────┐
│   [0]    │   [1]    │   [2]    │   [3]    │   [4]    │
│ Lifecycle│          │          │          │    AI    │
│ (Morph)  │          │          │          │ (Purple) │
├──────────┼──────────┼──────────┼──────────┼──────────┤
│   [5]    │   [6]    │   [7]    │   [8]    │   [9]    │
│          │          │          │          │          │
│          │          │          │          │          │
├──────────┼──────────┼──────────┼──────────┼──────────┤
│  [10]    │  [11]    │  [12]    │  [13]    │  [14]    │
│          │          │          │          │          │
│          │          │          │          │          │
└──────────┴──────────┴──────────┴──────────┴──────────┘
```

## AeroSpace Integration

The AI button (top-right) integrates with AeroSpace window manager:

- When in ACTIVE state: Stashes the current window to a hidden workspace
- When in other states: Switches to the stash workspace to restore windows

### Manual AeroSpace Commands

You can also use AeroSpace manually:

```bash
# Stash current window
aerospace move-node-to-workspace stash

# Switch to stash workspace
aerospace workspace stash

# List all workspaces
aerospace list-workspaces --all

# Get current workspace
aerospace list-workspaces --focused
```

## Raycast Integration Example

Create a Raycast script to send status updates:

```javascript
#!/usr/bin/env node

// Send a ping to the Stream Deck server
const http = require('http');

const data = JSON.stringify({
  source: 'raycast',
  message: 'Task completed',
  status: 'success'
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/ping',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
});

req.on('error', (error) => {
  console.error(error);
});

req.write(data);
req.end();
```

## Troubleshooting

### No Stream Deck Found
If you see "No Stream Deck devices found", the application will still run but only the Express server will be active. The Stream Deck features require physical hardware to be connected.

### Port Already in Use
If port 3000 is already in use, you'll need to either:
1. Stop the process using that port
2. Modify `src/server.ts` to use a different port

### AeroSpace Not Found
If AeroSpace CLI commands fail, ensure AeroSpace is installed and in your PATH:
```bash
which aerospace
```

## Development Tips

1. **Hot Reload**: Modifications require rebuilding with `npm run build`
2. **Debugging**: Check console output for state transitions and errors
3. **Testing without Hardware**: The server endpoints work without a Stream Deck connected
4. **Adding More Keys**: Edit `src/streamDeck.ts` to map additional keys (5-14)
