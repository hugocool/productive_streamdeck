export type Lifecycle = 'IDLE' | 'RUNNING' | 'PAUSED';

export type LifecycleAction = 'START' | 'PAUSE' | 'RESUME' | 'STOP';

export type LifecycleState = {
  version: 1;
  selectedTaskId?: string;
  activeTaskId?: string;
  lifecycle: Lifecycle;
  ambientStashId?: string;
  pausedTaskStashId?: string;
};

export function emptyLifecycleState(): LifecycleState {
  return {
    version: 1,
    lifecycle: 'IDLE'
  };
}

export function transitionLifecycle(state: LifecycleState, action: LifecycleAction): Lifecycle | null {
  if (action === 'START') {
    if (!state.selectedTaskId) return null;
    return state.lifecycle === 'IDLE' ? 'RUNNING' : null;
  }
  if (action === 'PAUSE') {
    return state.lifecycle === 'RUNNING' ? 'PAUSED' : null;
  }
  if (action === 'RESUME') {
    return state.lifecycle === 'PAUSED' ? 'RUNNING' : null;
  }
  if (action === 'STOP') {
    return state.lifecycle === 'RUNNING' || state.lifecycle === 'PAUSED' ? 'IDLE' : null;
  }
  return null;
}
