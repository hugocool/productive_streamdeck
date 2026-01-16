import { StateMachine } from './stateMachine';
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
    const stateMachine = new StateMachine();

    // Initialize Express server
    const server = new StatusServer();
    server.setStateGetter(() => stateMachine.getState());
    server.start();

    // Initialize Stream Deck controller
    const streamDeck = new StreamDeckController(stateMachine);
    try {
      await streamDeck.initialize();
      console.log('\n=== Application Running ===');
      console.log('Stream Deck Controller: Ready');
      console.log('Status Server: Running on port 3000');
      console.log('Press Ctrl+C to exit\n');

      // Graceful shutdown
      process.on('SIGINT', async () => {
        console.log('\n\nShutting down...');
        await streamDeck.close();
        process.exit(0);
      });
    } catch (streamDeckError) {
      console.log('\n=== Application Running (No Stream Deck) ===');
      console.log('Stream Deck Controller: Not available (no hardware detected)');
      console.log('Status Server: Running on port 3000');
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
