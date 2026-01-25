import { AerospaceRunner } from '../adapters/aerospaceRunner';
import { LifecycleAction, LifecycleState } from '../lifecycle';
import { loadStashStack, loadTaskRegistry } from './persistence';
import { executePlan } from './executePlan';
import { planPauseLifecycle, planResumeLifecycle, planStartLifecycle, planStopLifecycle } from './lifecyclePlans';
import { readVisibleSnapshot, readWorkspaceSnapshot } from './taskSnapshot';
import { taskWs } from './taskWorkspaces';

export async function runLifecycleAction(
  action: LifecycleAction,
  state: LifecycleState,
  runner: AerospaceRunner,
  options: { dryRun: boolean }
): Promise<LifecycleState | null> {
  const stash = await loadStashStack();
  const registry = await loadTaskRegistry();

  if (action === 'START') {
    if (!state.selectedTaskId) {
      console.warn('No selected task; cannot start.');
      return null;
    }
    const snapshot = await readVisibleSnapshot(runner, {
      excludeWorkspaces: [taskWs(state.selectedTaskId)]
    });
    const result = planStartLifecycle(state, snapshot, stash, registry);
    if (!result) return null;
    await executePlan(result.plan, runner, options);
    return result.nextState;
  }

  if (action === 'PAUSE') {
    if (!state.activeTaskId) {
      console.warn('No active task; cannot pause.');
      return null;
    }
    const taskSnapshot = await readWorkspaceSnapshot(runner, taskWs(state.activeTaskId));
    const result = planPauseLifecycle(state, taskSnapshot, stash);
    if (!result) return null;
    await executePlan(result.plan, runner, options);
    return result.nextState;
  }

  if (action === 'RESUME') {
    if (!state.activeTaskId) {
      console.warn('No active task; cannot resume.');
      return null;
    }
    const snapshot = await readVisibleSnapshot(runner, {
      excludeWorkspaces: [taskWs(state.activeTaskId)]
    });
    const result = planResumeLifecycle(state, snapshot, stash, registry);
    if (!result) return null;
    await executePlan(result.plan, runner, options);
    return result.nextState;
  }

  if (action === 'STOP') {
    if (!state.activeTaskId) {
      console.warn('No active task; cannot stop.');
      return null;
    }
    const taskSnapshot = await readWorkspaceSnapshot(runner, taskWs(state.activeTaskId));
    const result = planStopLifecycle(state, taskSnapshot, stash, registry);
    if (!result) return null;
    await executePlan(result.plan, runner, options);
    return result.nextState;
  }

  return null;
}
