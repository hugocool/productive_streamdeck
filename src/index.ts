import { LifecycleStore } from './stateMachine';
import { StreamDeckController } from './streamDeck';
import { StatusServer } from './server';

/**
 * Main application entry point
 * Initializes the Stream Deck controller, state machine, and status server
 */
async function main() {
  console.log('=== Productive Stream Deck ===');
  console.log('Starting application...\n');

  try {
    // Initialize state machine
    const lifecycleStore = new LifecycleStore();

    // Initialize Express server
    const server = new StatusServer();
    server.setStateGetter(() => lifecycleStore.getState());
    const statusPort = await server.start(Number(process.env.PORT) || 3000);

    // Initialize Stream Deck controller
    let streamDeck: StreamDeckController | null = null;
    try {
      streamDeck = new StreamDeckController(lifecycleStore);
      server.setAgentDoneHandler(() => {
        if (streamDeck) void streamDeck.startAgentPulse(10_000);
      });
      server.setAeroSpaceEventHandler(() => {
        if (streamDeck) void streamDeck.refreshEdgeShortcutAvailability();
      });
      await streamDeck.initialize();
      const activeStreamDeck = streamDeck;
      console.log('\n=== Application Running ===');
      console.log('Stream Deck Controller: Ready');
      console.log(`Status Server: Running on port ${statusPort}`);
      console.log('Press Ctrl+C to exit\n');

      // Graceful shutdown
      process.on('SIGINT', async () => {
        console.log('\n\nShutting down...');
        await activeStreamDeck.close();
        process.exit(0);
      });
    } catch (streamDeckError) {
      server.setAgentDoneHandler(() => {
        console.log('Agent done received (no Stream Deck connected)');
      });
      server.setAeroSpaceEventHandler(() => {
        console.log('AeroSpace event received (no Stream Deck connected)');
      });
      console.log('\n=== Application Running (No Stream Deck) ===');
      console.log('Stream Deck Controller: Not available (no hardware detected)');
      console.log(`Status Server: Running on port ${statusPort}`);
      console.log('Press Ctrl+C to exit\n');

      // Graceful shutdown without Stream Deck
      process.on('SIGINT', () => {
        console.log('\n\nShutting down...');
        process.exit(0);
      });
    }

  } catch (error) {
    console.error('Failed to start application:', error);
    process.exit(1);
  }
}

// Start the application
main();
