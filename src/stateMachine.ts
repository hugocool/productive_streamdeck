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

  private isSameState(a: LifecycleState, b: LifecycleState): boolean {
    return (
      a.lifecycle === b.lifecycle &&
      a.selectedTaskId === b.selectedTaskId &&
      a.activeTaskId === b.activeTaskId &&
      a.ambientStashId === b.ambientStashId &&
      a.pausedTaskStashId === b.pausedTaskStashId
    );
  }

  setState(newState: LifecycleState): void {
    if (!this.isSameState(this.currentState, newState)) {
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
