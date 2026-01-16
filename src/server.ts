import express, { Request, Response } from 'express';
import { AppState } from './stateMachine';

/**
 * Express server to receive status pings from Raycast/AI agents
 */
export class StatusServer {
  private app: express.Application;
  private port: number = 3000;
  private stateGetter: (() => AppState) | null = null;

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
  start(): void {
    this.app.listen(this.port, () => {
      console.log(`Status server listening on port ${this.port}`);
      console.log(`Endpoints available:`);
      console.log(`  GET  http://localhost:${this.port}/health`);
      console.log(`  GET  http://localhost:${this.port}/status`);
      console.log(`  POST http://localhost:${this.port}/ping`);
      console.log(`  POST http://localhost:${this.port}/update`);
    });
  }
}
