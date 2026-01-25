import { LifecycleState, emptyLifecycleState } from './lifecycle';

export class LifecycleStore {
  private currentState: LifecycleState;
  private listeners: ((state: LifecycleState) => void)[] = [];

  constructor(initialState?: LifecycleState) {
    this.currentState = initialState ?? emptyLifecycleState();
    console.log(`LifecycleStore initialized in ${this.currentState.lifecycle} state`);
  }

  getState(): LifecycleState {
    return this.currentState;
  }

  setState(newState: LifecycleState): void {
    if (this.currentState !== newState) {
      console.log(`Lifecycle transition: ${this.currentState.lifecycle} -> ${newState.lifecycle}`);
      this.currentState = newState;
      this.notifyListeners();
    }
  }

  addListener(listener: (state: LifecycleState) => void): void {
    this.listeners.push(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.currentState));
  }
}
