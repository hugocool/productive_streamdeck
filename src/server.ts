import express, { Request, Response } from 'express';
import type { Server } from 'http';
import { AppState } from './stateMachine';

/**
 * Express server to receive status pings from Raycast/AI agents
 */
export class StatusServer {
  private app: express.Application;
  private port: number = 3000;
  private server: Server | null = null;
  private stateGetter: (() => AppState) | null = null;
  private agentDoneHandler: (() => void) | null = null;
  private aeroSpaceEventHandler: (() => void) | null = null;

  constructor() {
    this.app = express();
    this.app.use(express.json());
    this.setupRoutes();
  }

  /**
   * Set the function to get current state
   */
  setStateGetter(getter: () => AppState): void {
    this.stateGetter = getter;
  }

  /**
   * Set the handler for agent completion
   */
  setAgentDoneHandler(handler: () => void): void {
    this.agentDoneHandler = handler;
  }

  /**
   * Set the handler for AeroSpace events
   */
  setAeroSpaceEventHandler(handler: () => void): void {
    this.aeroSpaceEventHandler = handler;
  }

  /**
   * Setup API routes
   */
  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (req: Request, res: Response) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    // Status endpoint - returns current state
    this.app.get('/status', (req: Request, res: Response) => {
      const currentState = this.stateGetter ? this.stateGetter() : AppState.IDLE;
      res.json({
        state: currentState,
        timestamp: new Date().toISOString()
      });
    });

    // Agent done endpoint - triggers a pulse on the AI key
    this.app.get('/agent-done', (req: Request, res: Response) => {
      if (this.agentDoneHandler) {
        this.agentDoneHandler();
      }
      res.json({ ok: true });
    });

    // AeroSpace event endpoint - refreshes Stream Deck state
    this.app.get('/aerospace-event', (req: Request, res: Response) => {
      if (this.aeroSpaceEventHandler) {
        this.aeroSpaceEventHandler();
      }
      res.json({ ok: true });
    });

    // Ping endpoint - accepts status updates from external agents
    this.app.post('/ping', (req: Request, res: Response) => {
      const { source, message, status } = req.body;
      
      // Sanitize and validate input before logging
      const sanitizedSource = typeof source === 'string' ? source.substring(0, 100) : 'unknown';
      const sanitizedMessage = typeof message === 'string' ? message.substring(0, 500) : 
                               typeof status === 'string' ? status.substring(0, 500) : '';
      
      console.log(`Received ping from ${sanitizedSource}:`, sanitizedMessage);
      res.json({
        received: true,
        timestamp: new Date().toISOString()
      });
    });

    // Update endpoint - allows external agents to trigger state changes
    this.app.post('/update', (req: Request, res: Response) => {
      const { action, data } = req.body;
      
      // Sanitize action before logging
      const sanitizedAction = typeof action === 'string' ? action.substring(0, 100) : 'unknown';
      
      console.log(`Received update action: ${sanitizedAction}`, data);
      res.json({
        received: true,
        action: sanitizedAction,
        timestamp: new Date().toISOString()
      });
    });
  }

  /**
   * Start the server
   */
  async start(preferredPort: number = 3000): Promise<number> {
    if (this.server) {
      return this.port;
    }
    const maxAttempts = 10;
    let port = preferredPort;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      try {
        await new Promise<void>((resolve, reject) => {
          const server = this.app.listen(port, () => {
            this.server = server;
            resolve();
          });
          server.on('error', (error: NodeJS.ErrnoException) => {
            server.close();
            reject(error);
          });
        });
        this.port = port;
        this.printEndpoints();
        if (this.port !== preferredPort) {
          console.warn(
            `AeroSpace hook uses port ${preferredPort}; update it to ${this.port} if needed.`
          );
        }
        return this.port;
      } catch (error) {
        const err = error as NodeJS.ErrnoException;
        if (err.code === 'EADDRINUSE') {
          port += 1;
          continue;
        }
        throw error;
      }
    }

    throw new Error(`No free port found after ${maxAttempts} attempts starting at ${preferredPort}`);
  }

  async stop(): Promise<void> {
    if (!this.server) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      this.server?.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
    this.server = null;
  }

  private printEndpoints(): void {
    console.log(`Status server listening on port ${this.port}`);
    console.log(`Endpoints available:`);
    console.log(`  GET  http://localhost:${this.port}/health`);
    console.log(`  GET  http://localhost:${this.port}/status`);
    console.log(`  GET  http://localhost:${this.port}/agent-done`);
    console.log(`  GET  http://localhost:${this.port}/aerospace-event`);
    console.log(`  POST http://localhost:${this.port}/ping`);
    console.log(`  POST http://localhost:${this.port}/update`);
  }
}
