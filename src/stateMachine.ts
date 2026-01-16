/**
 * State machine for managing application lifecycle
 */
export enum AppState {
  IDLE = 'IDLE',
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED'
}

export class StateMachine {
  private currentState: AppState = AppState.IDLE;
  private listeners: ((state: AppState) => void)[] = [];

  constructor() {
    console.log('StateMachine initialized in IDLE state');
  }

  /**
   * Get the current state
   */
  getState(): AppState {
    return this.currentState;
  }

  /**
   * Transition to a new state
   */
  setState(newState: AppState): void {
    if (this.currentState !== newState) {
      console.log(`State transition: ${this.currentState} -> ${newState}`);
      this.currentState = newState;
      this.notifyListeners();
    }
  }

  /**
   * Handle lifecycle button press
   * IDLE -> ACTIVE (START)
   * ACTIVE -> PAUSED (PAUSE)
   * PAUSED -> ACTIVE (RESUME)
   */
  handleLifecyclePress(): void {
    switch (this.currentState) {
      case AppState.IDLE:
        this.setState(AppState.ACTIVE);
        break;
      case AppState.ACTIVE:
        this.setState(AppState.PAUSED);
        break;
      case AppState.PAUSED:
        this.setState(AppState.ACTIVE);
        break;
    }
  }

  /**
   * Get the label for the lifecycle button based on current state
   */
  getLifecycleLabel(): string {
    switch (this.currentState) {
      case AppState.IDLE:
        return 'START';
      case AppState.ACTIVE:
        return 'PAUSE';
      case AppState.PAUSED:
        return 'RESUME';
    }
  }

  /**
   * Add a listener for state changes
   */
  addListener(listener: (state: AppState) => void): void {
    this.listeners.push(listener);
  }

  /**
   * Notify all listeners of state change
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.currentState));
  }
}
