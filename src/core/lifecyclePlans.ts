import { LifecycleState } from '../lifecycle';
import { Plan } from './plan';
import { StashStackStateV2, TaskRegistry } from './persistence';
import { VisibleSnapshot } from './taskSnapshot';
import { planPersistLifecycleState, planStashPop, planStashPush } from './plans';
import { planCheckoutTask } from './taskPlans';
import { BLANK_PREFIX, STASH_WS } from './taskWorkspaces';

type PlanResult = { plan: Plan; nextState: LifecycleState };

function assemblePlan(steps: Plan['steps'], effects: Plan['effects']): Plan {
  return {
    id: `plan_${Date.now()}`,
    createdAt: new Date().toISOString(),
    steps,
    effects
  };
}

function hasStashEntry(stash: StashStackStateV2, stashId?: string): boolean {
  if (!stashId) return false;
  return stash.stack.some((entry) => entry.id === stashId);
}

export function planStartLifecycle(
  state: LifecycleState,
  snapshot: VisibleSnapshot,
  stash: StashStackStateV2,
  registry: TaskRegistry
): PlanResult | null {
  if (state.lifecycle !== 'IDLE' || !state.selectedTaskId) {
    return null;
  }

  const stashPush = planStashPush({ kind: 'visible' }, snapshot, stash, STASH_WS, BLANK_PREFIX);
  const checkoutPlan = planCheckoutTask(state.selectedTaskId, registry);
  const ambientStashId = stashPush.next.stack[0]?.id;
  const nextState: LifecycleState = {
    ...state,
    version: 1,
    lifecycle: 'RUNNING',
    activeTaskId: state.selectedTaskId,
    ambientStashId,
    pausedTaskStashId: undefined
  };

  const persistPlan = planPersistLifecycleState(nextState);
  const plan = assemblePlan(
    [...stashPush.plan.steps, ...checkoutPlan.steps],
    [...stashPush.plan.effects, ...checkoutPlan.effects, ...persistPlan.effects]
  );

  return { plan, nextState };
}

export function planPauseLifecycle(
  state: LifecycleState,
  taskSnapshot: VisibleSnapshot,
  stash: StashStackStateV2
): PlanResult | null {
  if (state.lifecycle !== 'RUNNING' || !state.activeTaskId) {
    return null;
  }

  const taskStash = planStashPush(
    { kind: 'task', taskId: state.activeTaskId },
    taskSnapshot,
    stash,
    STASH_WS,
    BLANK_PREFIX
  );
  const pausedTaskStashId = taskStash.next.stack[0]?.id;
  const steps = [...taskStash.plan.steps];
  let effects: Plan['effects'] = [];

  if (hasStashEntry(taskStash.next, state.ambientStashId)) {
    const popAmbient = planStashPop(state.ambientStashId as string, taskStash.next);
    steps.push(...popAmbient.plan.steps);
    effects = popAmbient.plan.effects;
  } else {
    effects = taskStash.plan.effects;
  }

  const nextState: LifecycleState = {
    ...state,
    version: 1,
    lifecycle: 'PAUSED',
    ambientStashId: undefined,
    pausedTaskStashId
  };

  const persistPlan = planPersistLifecycleState(nextState);
  const plan = assemblePlan(steps, [...effects, ...persistPlan.effects]);
  return { plan, nextState };
}

export function planResumeLifecycle(
  state: LifecycleState,
  snapshot: VisibleSnapshot,
  stash: StashStackStateV2,
  registry: TaskRegistry
): PlanResult | null {
  if (state.lifecycle !== 'PAUSED' || !state.activeTaskId || !state.pausedTaskStashId) {
    return null;
  }

  if (!hasStashEntry(stash, state.pausedTaskStashId)) {
    return null;
  }

  const ambientStash = planStashPush({ kind: 'visible' }, snapshot, stash, STASH_WS, BLANK_PREFIX);
  const checkoutPlan = planCheckoutTask(state.activeTaskId, registry);
  const popTask = planStashPop(state.pausedTaskStashId, ambientStash.next);
  const ambientStashId = ambientStash.next.stack[0]?.id;
  const nextState: LifecycleState = {
    ...state,
    version: 1,
    lifecycle: 'RUNNING',
    ambientStashId,
    pausedTaskStashId: undefined
  };

  const persistPlan = planPersistLifecycleState(nextState);
  const steps = [
    ...ambientStash.plan.steps,
    ...checkoutPlan.steps,
    ...popTask.plan.steps
  ];
  const effects = [
    ...popTask.plan.effects,
    ...checkoutPlan.effects,
    ...persistPlan.effects
  ];
  const plan = assemblePlan(steps, effects);
  return { plan, nextState };
}

function updateRegistryStop(
  registry: TaskRegistry,
  taskId: string,
  stashId: string | undefined
): TaskRegistry {
  const now = new Date().toISOString();
  const existing = registry.tasks[taskId];
  return {
    ...registry,
    updatedAt: now,
    tasks: {
      ...registry.tasks,
      [taskId]: {
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
        title: existing?.title,
        provider: existing?.provider,
        lastStopStashId: stashId
      }
    }
  };
}

export function planStopLifecycle(
  state: LifecycleState,
  taskSnapshot: VisibleSnapshot,
  stash: StashStackStateV2,
  registry: TaskRegistry
): PlanResult | null {
  if (
    (state.lifecycle !== 'RUNNING' && state.lifecycle !== 'PAUSED') ||
    !state.activeTaskId
  ) {
    return null;
  }

  const taskStash = planStashPush(
    { kind: 'task', taskId: state.activeTaskId },
    taskSnapshot,
    stash,
    STASH_WS,
    BLANK_PREFIX
  );
  const stopStashId = taskStash.next.stack[0]?.id;
  const steps = [...taskStash.plan.steps];
  let effects: Plan['effects'] = [];

  if (hasStashEntry(taskStash.next, state.ambientStashId)) {
    const popAmbient = planStashPop(state.ambientStashId as string, taskStash.next);
    steps.push(...popAmbient.plan.steps);
    effects = popAmbient.plan.effects;
  } else {
    effects = taskStash.plan.effects;
  }

  const nextState: LifecycleState = {
    version: 1,
    lifecycle: 'IDLE',
    selectedTaskId: state.selectedTaskId ?? state.activeTaskId,
    activeTaskId: undefined,
    ambientStashId: undefined,
    pausedTaskStashId: undefined
  };

  const persistPlan = planPersistLifecycleState(nextState);
  const nextRegistry = updateRegistryStop(registry, state.activeTaskId, stopStashId);
  const registryPlan: Plan = {
    id: `plan_${Date.now()}`,
    createdAt: new Date().toISOString(),
    steps: [],
    effects: [{ type: 'persist', target: 'taskRegistry', payload: nextRegistry }]
  };

  const plan = assemblePlan(steps, [...effects, ...registryPlan.effects, ...persistPlan.effects]);
  return { plan, nextState };
}
