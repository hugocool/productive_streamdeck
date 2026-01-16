import { openStreamDeck, listStreamDecks } from '@elgato-stream-deck/node';
import sharp from 'sharp';
import { StateMachine, AppState } from './stateMachine';
import { AeroSpaceUtils } from './aerospace';

/**
 * Stream Deck Controller for 15-key device
 * Key Layout (0-indexed):
 * [ 0] [ 1] [ 2] [ 3] [ 4]
 * [ 5] [ 6] [ 7] [ 8] [ 9]
 * [10] [11] [12] [13] [14]
 * 
 * Top-left (0): Lifecycle (START/PAUSE/RESUME)
 * Top-right (4): Agentic AI
 */
export class StreamDeckController {
  private device: any;
  private stateMachine: StateMachine;

  // Key indices
  private readonly LIFECYCLE_KEY = 0; // Top-left
  private readonly AI_KEY = 4; // Top-right

  constructor(stateMachine: StateMachine) {
    this.stateMachine = stateMachine;
    
    // Listen for state changes to update display
    this.stateMachine.addListener((state: AppState) => {
      this.updateLifecycleButton();
    });
  }

  /**
   * Initialize and connect to Stream Deck
   */
  async initialize(): Promise<void> {
    try {
      console.log('Connecting to Stream Deck...');
      
      // List available Stream Decks
      const devices = await listStreamDecks();
      if (devices.length === 0) {
        throw new Error('No Stream Deck devices found');
      }
      
      console.log(`Found ${devices.length} Stream Deck(s)`);
      
      // Open the first available device
      this.device = await openStreamDeck(devices[0].path);
      
      console.log(`Connected to: ${this.device.MODEL}`);
      console.log(`Key count: ${this.device.NUM_KEYS}`);
      
      // Clear all keys
      await this.device.clearPanel();
      
      // Setup key handlers
      this.setupKeyHandlers();
      
      // Initialize button displays
      await this.updateLifecycleButton();
      await this.updateAIButton();
      
      console.log('Stream Deck initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Stream Deck:', error);
      throw error;
    }
  }

  /**
   * Setup key press handlers
   */
  private setupKeyHandlers(): void {
    this.device.on('down', (keyIndex: number) => {
      console.log(`Key ${keyIndex} pressed`);
      this.handleKeyPress(keyIndex);
    });

    this.device.on('error', (error: Error) => {
      console.error('Stream Deck error:', error);
    });
  }

  /**
   * Handle key press events
   */
  private async handleKeyPress(keyIndex: number): Promise<void> {
    switch (keyIndex) {
      case this.LIFECYCLE_KEY:
        await this.handleLifecyclePress();
        break;
      case this.AI_KEY:
        await this.handleAIPress();
        break;
      default:
        console.log(`Key ${keyIndex} not mapped`);
    }
  }

  /**
   * Handle lifecycle button press
   */
  private async handleLifecyclePress(): Promise<void> {
    const oldLabel = this.stateMachine.getLifecycleLabel();
    this.stateMachine.handleLifecyclePress();
    const newLabel = this.stateMachine.getLifecycleLabel();
    
    console.log(`Lifecycle: ${oldLabel} pressed, now showing ${newLabel}`);
    await this.updateLifecycleButton();
  }

  /**
   * Handle AI button press
   */
  private async handleAIPress(): Promise<void> {
    console.log('Agentic AI button pressed');
    // Toggle between stashing and focusing
    const currentState = this.stateMachine.getState();
    if (currentState === AppState.ACTIVE) {
      await AeroSpaceUtils.stashWindow();
    } else {
      await AeroSpaceUtils.unstashWindow();
    }
  }

  /**
   * Update the lifecycle button display
   */
  private async updateLifecycleButton(): Promise<void> {
    const label = this.stateMachine.getLifecycleLabel();
    const state = this.stateMachine.getState();
    
    // Choose color based on state
    let color: string;
    switch (state) {
      case AppState.IDLE:
        color = '#00FF00'; // Green for START
        break;
      case AppState.ACTIVE:
        color = '#FFA500'; // Orange for PAUSE
        break;
      case AppState.PAUSED:
        color = '#0080FF'; // Blue for RESUME
        break;
    }
    
    await this.drawButton(this.LIFECYCLE_KEY, label, color);
  }

  /**
   * Update the AI button display
   */
  private async updateAIButton(): Promise<void> {
    await this.drawButton(this.AI_KEY, 'AI', '#FF00FF'); // Purple/Magenta
  }

  /**
   * Draw a button with text and background color
   */
  private async drawButton(keyIndex: number, text: string, color: string): Promise<void> {
    try {
      // Sanitize text to prevent XML injection
      const sanitizedText = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
      
      // Create an SVG with text
      const svg = `
        <svg width="72" height="72" xmlns="http://www.w3.org/2000/svg">
          <rect width="72" height="72" fill="${color}"/>
          <text x="36" y="45" font-family="Arial, sans-serif" font-size="16" font-weight="bold" 
                text-anchor="middle" fill="white">${sanitizedText}</text>
        </svg>
      `;
      
      // Convert SVG to buffer
      const buffer = await sharp(Buffer.from(svg))
        .resize(72, 72)
        .raw()
        .toBuffer();
      
      // Fill the key with the image
      await this.device.fillKeyBuffer(keyIndex, buffer);
    } catch (error) {
      console.error(`Failed to draw button ${keyIndex}:`, error);
    }
  }

  /**
   * Close the Stream Deck connection
   */
  async close(): Promise<void> {
    if (this.device) {
      await this.device.close();
      console.log('Stream Deck disconnected');
    }
  }
}
