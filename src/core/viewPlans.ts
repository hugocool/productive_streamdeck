import { LifecycleState } from '../lifecycle';
import { Plan } from './plan';
import { TaskRegistry } from './persistence';
import { planPersistLifecycleState } from './plans';
import { planCheckoutTask } from './taskPlans';
import { INBOX_WS, taskWs } from './taskWorkspaces';

function newPlan(steps: Plan['steps'], effects: Plan['effects']): Plan {
  return {
    id: `plan_${Date.now()}`,
    createdAt: new Date().toISOString(),
    steps,
    effects
  };
}

function removeTaskFromRegistry(registry: TaskRegistry, taskId: string): TaskRegistry {
  const nextTasks = { ...registry.tasks };
  delete nextTasks[taskId];
  const nextLastCheckout =
    registry.lastCheckoutTaskId === taskId ? undefined : registry.lastCheckoutTaskId;
  return {
    ...registry,
    updatedAt: new Date().toISOString(),
    lastCheckoutTaskId: nextLastCheckout,
    tasks: nextTasks
  };
}

export function planSelectTaskAndCheckout(
  taskId: string,
  state: LifecycleState,
  registry: TaskRegistry
): Plan {
  const checkout = planCheckoutTask(taskId, registry);
  const nextState: LifecycleState = {
    ...state,
    version: 1,
    selectedTaskId: taskId
  };
  const persist = planPersistLifecycleState(nextState);
  return newPlan(
    [...checkout.steps],
    [...checkout.effects, ...persist.effects]
  );
}

export function planDetachTaskToInbox(
  taskId: string,
  windowIds: number[],
  state: LifecycleState,
  registry: TaskRegistry,
  fallbackSelectedTaskId?: string
): Plan {
  const sorted = [...windowIds].sort((a, b) => a - b);
  const steps: Plan['steps'] = sorted.map((id) => ({
    tool: 'aerospace',
    kind: 'mutate',
    allowFailure: true,
    args: ['move-node-to-workspace', '--window-id', String(id), INBOX_WS]
  }));

  const nextRegistry = removeTaskFromRegistry(registry, taskId);

  const nextState: LifecycleState = {
    ...state,
    version: 1,
    selectedTaskId:
      state.selectedTaskId === taskId ? fallbackSelectedTaskId ?? state.selectedTaskId : state.selectedTaskId,
    activeTaskId: state.activeTaskId === taskId ? undefined : state.activeTaskId
  };

  return newPlan(
    steps,
    [
      { type: 'persist', target: 'taskRegistry', payload: nextRegistry },
      ...planPersistLifecycleState(nextState).effects
    ]
  );
}

export function toTaskWorkspace(taskId: string): string {
  return taskWs(taskId);
}
