import path from 'path';
import { openStreamDeck, listStreamDecks, StreamDeck } from '@elgato-stream-deck/node';
import { LifecycleStore } from './stateMachine';
import { LifecycleAction } from './lifecycle';
import { AeroSpaceUtils } from './aerospace';
import { RealRunner } from './adapters/aerospaceRunner';
import { executePlan } from './core/executePlan';
import { readVisibleSnapshot } from './core/taskSnapshot';
import { planStashPop, planStashPush } from './core/plans';
import { loadLifecycleState, loadStashStack, StashStackStateV2 } from './core/persistence';
import { runLifecycleAction } from './core/lifecycleActions';
import { createKeySenderClient } from './appShortcuts';
import { EdgeAction, EdgeMode, EDGE_KEYS, getEdgeActions } from './edgeControls';

export function shouldRenderEdgeRow(available: boolean): boolean {
  return available;
}

/**
 * Stream Deck Controller for 15-key device
 * Key Layout (0-indexed):
 * [ 0] [ 1] [ 2] [ 3] [ 4]
 * [ 5] [ 6] [ 7] [ 8] [ 9]
 * [10] [11] [12] [13] [14]
 * 
 * Top-left (0): Lifecycle (START/PAUSE/RESUME)
 * Top-right (4): Agentic AI
 * Bottom-left (10): Cycle icon + Edge Option+W shortcut
 */
export class StreamDeckController {
  private device: StreamDeck | null = null;
  private lifecycleStore: LifecycleStore;
  private agentPulseInterval: NodeJS.Timeout | null = null;
  private agentPulseTimeout: NodeJS.Timeout | null = null;
  private agentPulseActive = false;
  private iconSize = 72;
  private stashStack: StashStackStateV2 = { version: 2, updatedAt: '', stack: [] };
  private edgeShortcutAvailable = false;
  private edgeMode: EdgeMode = 'NAV';
  private holdTimers = new Map<number, NodeJS.Timeout>();
  private holdFired = new Set<number>();
  private edgeRefreshInterval: NodeJS.Timeout | null = null;
  private runner = new RealRunner();
  private dryRun = process.env.DRY_RUN === '1';
  private keySender = createKeySenderClient();

  // Key indices
  private readonly PRIMARY_KEY = 0;
  private readonly STOP_KEY = 1;
  private readonly AI_KEY = 5;
  private readonly EDGE_SHORTCUT_KEY = 10; // Bottom-left
  private readonly FALLBACK_ICON_SIZE = 72;

  constructor(lifecycleStore: LifecycleStore) {
    this.lifecycleStore = lifecycleStore;
    
    // Listen for state changes to update display
    this.lifecycleStore.addListener(() => {
      void this.updateStateButtons();
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
      this.iconSize = (this.device as { ICON_SIZE?: number }).ICON_SIZE ?? this.FALLBACK_ICON_SIZE;
      
      // Clear all keys
      await this.device.clearPanel();
      
      // Setup key handlers
      this.setupKeyHandlers();
      
      // Initialize button displays
      await this.hydratePersistedState();
      await this.updateStateButtons();
      await this.updateAIButton();
      await this.refreshEdgeShortcutAvailability();
      this.startEdgeRefreshLoop();
      
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
    if (!this.device) return;
    
    this.device.on('down', (keyIndex: number) => {
      console.log(`Key ${keyIndex} pressed`);
      this.handleKeyDown(keyIndex);
    });

    this.device.on('up', (keyIndex: number) => {
      this.handleKeyUp(keyIndex);
    });

    this.device.on('error', (error: unknown) => {
      console.error('Stream Deck error:', error);
    });
  }

  /**
   * Handle key press events
   */
  private async handleKeyDown(keyIndex: number): Promise<void> {
    switch (keyIndex) {
      case this.PRIMARY_KEY:
        await this.handlePrimaryAction();
        break;
      case this.STOP_KEY:
        await this.handleStopResumeAction();
        break;
      case this.AI_KEY:
        await this.handleAIPress();
        break;
      default:
        await this.handleEdgeKeyDown(keyIndex);
    }
  }

  private handleKeyUp(keyIndex: number): void {
    if (!this.holdTimers.has(keyIndex)) {
      return;
    }

    const timer = this.holdTimers.get(keyIndex);
    if (timer) {
      clearTimeout(timer);
    }
    this.holdTimers.delete(keyIndex);

    if (this.holdFired.has(keyIndex)) {
      this.holdFired.delete(keyIndex);
      return;
    }

    void this.handleEdgeKeyTap(keyIndex);
  }

  /**
   * Handle lifecycle button press
   */
  private async handlePrimaryAction(): Promise<void> {
    const current = this.lifecycleStore.getState();
    if (current.lifecycle === 'IDLE') {
      await this.handleLifecycleAction('START');
      return;
    }
    if (current.lifecycle === 'RUNNING') {
      await this.handleLifecycleAction('PAUSE');
      return;
    }
    if (current.lifecycle === 'PAUSED') {
      await this.handleLifecycleAction('RESUME');
    }
  }

  private async handleLifecycleAction(action: LifecycleAction): Promise<void> {
    const current = this.lifecycleStore.getState();
    const nextState = await runLifecycleAction(action, current, this.runner, { dryRun: this.dryRun });
    if (!nextState) {
      return;
    }
    this.lifecycleStore.setState(nextState);
    await this.syncStashStateFromDisk();
    await this.updateStateButtons();
  }

  private async handleStopResumeAction(): Promise<void> {
    const current = this.lifecycleStore.getState();
    if (current.lifecycle === 'RUNNING' || current.lifecycle === 'PAUSED') {
      await this.handleLifecycleAction('STOP');
      return;
    }

    if (this.stashStack.stack.length > 0) {
      const { plan } = planStashPop(0, this.stashStack);
      await executePlan(plan, this.runner, { dryRun: this.dryRun });
      await this.syncStashStateFromDisk();
      await this.updateStateButtons();
      return;
    }

    const snapshot = await readVisibleSnapshot(this.runner);
    const { plan } = planStashPush({ kind: 'visible' }, snapshot, this.stashStack, 'STASH', '__blank');
    await executePlan(plan, this.runner, { dryRun: this.dryRun });
    await this.syncStashStateFromDisk();
    await this.updateStateButtons();
  }

  /**
   * Handle AI button press
   */
  private async handleAIPress(): Promise<void> {
    console.log('Agentic AI button pressed');
    // Toggle between stashing and focusing
    const currentState = this.lifecycleStore.getState();
    if (currentState.lifecycle === 'RUNNING') {
      await AeroSpaceUtils.stashWindow();
    } else {
      await AeroSpaceUtils.unstashWindow();
    }
  }

  /**
   * Update the lifecycle button display
   */
  private async updateStateButtons(): Promise<void> {
    const state = this.lifecycleStore.getState();

    let primaryLabel = 'START';
    let primaryColor = '#00FF00';
    if (state.lifecycle === 'RUNNING') {
      primaryLabel = 'PAUSE';
      primaryColor = '#FFA500';
    } else if (state.lifecycle === 'PAUSED') {
      primaryLabel = 'RESUME';
      primaryColor = '#0080FF';
    }

    let stopLabel = 'STOP';
    let stopColor = '#AA3322';
    if (state.lifecycle === 'IDLE') {
      if (this.stashStack.stack.length > 0) {
        stopLabel = 'RESUME';
        stopColor = '#0080FF';
      }
    }

    await this.drawButton(this.PRIMARY_KEY, primaryLabel, primaryColor);
    await this.drawButton(this.STOP_KEY, stopLabel, stopColor);
  }

  private async hydratePersistedState(): Promise<void> {
    const persisted = await loadLifecycleState();
    this.lifecycleStore.setState(persisted);
    await this.syncStashStateFromDisk();
  }

  private async syncStashStateFromDisk(): Promise<void> {
    this.stashStack = await loadStashStack();
  }

  /**
   * Update the AI button display
   */
  private async updateAIButton(): Promise<void> {
    if (this.agentPulseActive) return;
    await this.drawButton(this.AI_KEY, 'AI', '#FF00FF'); // Purple/Magenta
  }

  /**
   * Update the Edge shortcut button display
   */
  private async updateEdgeShortcutButton(): Promise<void> {
    if (shouldRenderEdgeRow(this.edgeShortcutAvailable)) {
      await this.drawEdgeRow();
    } else {
      await this.clearEdgeRow();
    }
  }

  async refreshEdgeShortcutAvailability(): Promise<void> {
    try {
      const parsed = await this.keySender.probeApp({
        bundleId: 'com.microsoft.edgemac',
        requireVisibleOnScreen: true
      });
      this.edgeShortcutAvailable = parsed?.visibleOnScreen ?? false;
    } catch (error) {
      console.error('Failed to probe Edge visibility:', error);
      this.edgeShortcutAvailable = false;
    }

    await this.updateEdgeShortcutButton();
  }

  private startEdgeRefreshLoop(): void {
    if (this.edgeRefreshInterval) return;
    this.edgeRefreshInterval = setInterval(() => {
      void this.refreshEdgeShortcutAvailability();
    }, 3000);
  }

  /**
   * Pulse the AI button to signal agent completion
   */
  async startAgentPulse(durationMs: number): Promise<void> {
    if (!this.device) return;
    this.agentPulseActive = true;

    if (this.agentPulseInterval) clearInterval(this.agentPulseInterval);
    if (this.agentPulseTimeout) clearTimeout(this.agentPulseTimeout);

    let on = false;
    this.agentPulseInterval = setInterval(() => {
      on = !on;
      const color = on ? '#8C00FF' : '#0A0A0A';
      void this.drawSolidColor(this.AI_KEY, color);
    }, 250);

    this.agentPulseTimeout = setTimeout(() => {
      if (this.agentPulseInterval) clearInterval(this.agentPulseInterval);
      this.agentPulseInterval = null;
      this.agentPulseTimeout = null;
      this.agentPulseActive = false;
      void this.updateAIButton();
    }, durationMs);
  }

  /**
   * Trigger the Edge Option+W shortcut via native helper
   */
  private async triggerEdgeShortcut(): Promise<void> {
    try {
      await this.sendEdgeShortcut('opt+w');
    } catch (error) {
      console.error('Failed to trigger Edge shortcut:', error);
      console.error('Build helper: (cd native/keysender && swift build -c release)');
      console.error('If Swift is missing, run: xcode-select --install');
    }
  }

  private async handleEdgeKeyDown(keyIndex: number): Promise<void> {
    if (!this.edgeShortcutAvailable) return;
    const actions = getEdgeActions(this.edgeMode, keyIndex);
    if (!actions) return;

    if (actions.hold) {
      const holdAction = actions.hold;
      const timer = setTimeout(() => {
        this.holdFired.add(keyIndex);
        void this.executeEdgeAction(holdAction);
      }, 500);
      this.holdTimers.set(keyIndex, timer);
      return;
    }

    void this.handleEdgeKeyTap(keyIndex);
  }

  private async handleEdgeKeyTap(keyIndex: number): Promise<void> {
    if (!this.edgeShortcutAvailable) return;
    const actions = getEdgeActions(this.edgeMode, keyIndex);
    if (!actions) return;

    await this.executeEdgeAction(actions.tap);
  }

  private async executeEdgeAction(action: EdgeAction): Promise<void> {
    if (action.type === 'noop') return;
    if (action.type === 'mode') {
      this.edgeMode = action.mode;
      await this.drawEdgeRow();
      return;
    }

    await this.sendEdgeShortcut(action.shortcut);
    if (this.edgeMode === 'TAB_SWITCH' && (action.shortcut === 'enter' || action.shortcut === 'esc')) {
      this.edgeMode = 'NAV';
      await this.drawEdgeRow();
    }
  }

  private async drawEdgeRow(): Promise<void> {
    if (this.edgeMode === 'NAV') {
      await this.drawButton(EDGE_KEYS.K0_TABS, 'TAB', '#2C3E50');
      await this.drawButton(EDGE_KEYS.K1_BACK, 'BACK', '#2C3E50');
      await this.drawButton(EDGE_KEYS.K2_CLOSE, 'CLOSE', '#B23A48');
      await this.drawButton(EDGE_KEYS.K3_NEW, 'NEW', '#2E8B57');
      await this.drawButton(EDGE_KEYS.K4_SEARCH, 'SRCH', '#455A64');
      return;
    }

    await this.drawButton(EDGE_KEYS.K0_TABS, 'TAB', '#37474F');
    await this.drawButton(EDGE_KEYS.K1_BACK, 'UP', '#37474F');
    await this.drawButton(EDGE_KEYS.K2_CLOSE, 'SEL', '#1E88E5');
    await this.drawButton(EDGE_KEYS.K3_NEW, 'DOWN', '#37474F');
    await this.drawButton(EDGE_KEYS.K4_SEARCH, 'ESC', '#6D4C41');
  }

  private async clearEdgeRow(): Promise<void> {
    await this.drawSolidColor(EDGE_KEYS.K0_TABS, '#000000');
    await this.drawSolidColor(EDGE_KEYS.K1_BACK, '#000000');
    await this.drawSolidColor(EDGE_KEYS.K2_CLOSE, '#000000');
    await this.drawSolidColor(EDGE_KEYS.K3_NEW, '#000000');
    await this.drawSolidColor(EDGE_KEYS.K4_SEARCH, '#000000');
  }

  private async sendEdgeShortcut(shortcut: string): Promise<void> {
    if (!this.edgeShortcutAvailable) {
      return;
    }
    await this.keySender.sendShortcutToApp({
      bundleId: 'com.microsoft.edgemac',
      shortcut,
      requireVisibleOnScreen: true,
      restoreFocus: true
    });
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
      
      // Validate color format (hex color or named color)
      const sanitizedColor = /^#[0-9A-Fa-f]{6}$/.test(color) ? color : '#000000';
      
      // Create an SVG with text
      const svg = `
        <svg width="${this.iconSize}" height="${this.iconSize}" xmlns="http://www.w3.org/2000/svg">
          <rect width="${this.iconSize}" height="${this.iconSize}" fill="${sanitizedColor}"/>
          <text x="${this.iconSize / 2}" y="${Math.round(this.iconSize * 0.63)}"
                font-family="Arial, sans-serif" font-size="16" font-weight="bold"
                text-anchor="middle" fill="white">${sanitizedText}</text>
        </svg>
      `;
      
      // Convert SVG to buffer
      const { default: sharp } = await import('sharp');
      const buffer = await sharp(Buffer.from(svg))
        .resize(this.iconSize, this.iconSize)
        .removeAlpha()
        .raw()
        .toBuffer();
      
      // Fill the key with the image
      await this.device!.fillKeyBuffer(keyIndex, buffer);
    } catch (error) {
      console.error(`Failed to draw button ${keyIndex}:`, error);
    }
  }

  /**
   * Draw a solid color fill for a key
   */
  private async drawSolidColor(keyIndex: number, color: string): Promise<void> {
    try {
      const svg = `
        <svg width="${this.iconSize}" height="${this.iconSize}" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="${color}"/>
        </svg>
      `;

      const { default: sharp } = await import('sharp');
      const buffer = await sharp(Buffer.from(svg))
        .resize(this.iconSize, this.iconSize)
        .removeAlpha()
        .raw()
        .toBuffer();

      await this.device!.fillKeyBuffer(keyIndex, buffer);
    } catch (error) {
      console.error(`Failed to draw solid color ${keyIndex}:`, error);
    }
  }

  /**
   * Draw a cycle icon with a background
   */
  private async drawCycleIcon(keyIndex: number, color: string): Promise<void> {
    try {
      const stroke = Math.max(3, Math.round(this.iconSize * 0.08));
      const center = this.iconSize / 2;
      const radius = this.iconSize * 0.28;
      const arrow = this.iconSize * 0.14;

      const svg = `
        <svg width="${this.iconSize}" height="${this.iconSize}" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="${color}"/>
          <g fill="none" stroke="white" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round">
            <path d="M ${center + radius} ${center} A ${radius} ${radius} 0 1 1 ${center - radius} ${center}"/>
            <path d="M ${center - radius} ${center}
                     L ${center - radius + arrow} ${center - arrow * 0.8}
                     M ${center - radius} ${center}
                     L ${center - radius + arrow} ${center + arrow * 0.8}"/>
          </g>
        </svg>
      `;

      const { default: sharp } = await import('sharp');
      const buffer = await sharp(Buffer.from(svg))
        .resize(this.iconSize, this.iconSize)
        .removeAlpha()
        .raw()
        .toBuffer();

      await this.device!.fillKeyBuffer(keyIndex, buffer);
    } catch (error) {
      console.error(`Failed to draw cycle icon ${keyIndex}:`, error);
    }
  }

  /**
   * Close the Stream Deck connection
   */
  async close(): Promise<void> {
    if (this.device) {
      if (this.edgeRefreshInterval) {
        clearInterval(this.edgeRefreshInterval);
        this.edgeRefreshInterval = null;
      }
      await this.device.close();
      console.log('Stream Deck disconnected');
    }
  }
}
