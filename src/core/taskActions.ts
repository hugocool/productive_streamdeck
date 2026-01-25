import { AerospaceRunner } from '../adapters/aerospaceRunner';
import { executePlan } from './executePlan';
import { readFocusedWindowId, readVisibleSnapshot } from './taskSnapshot';
import { loadTaskRegistry } from './persistence';
import { planCheckoutTask, planTrackFocused, planTrackVisible, planUntrackFocused } from './taskPlans';

export async function checkoutTask(
  taskId: string,
  runner: AerospaceRunner,
  options: { dryRun: boolean }
): Promise<void> {
  const registry = await loadTaskRegistry();
  const plan = planCheckoutTask(taskId, registry);
  await executePlan(plan, runner, options);
}

export async function trackFocused(
  taskId: string,
  runner: AerospaceRunner,
  options: { dryRun: boolean }
): Promise<void> {
  const windowId = await readFocusedWindowId(runner);
  const plan = planTrackFocused(taskId, windowId);
  await executePlan(plan, runner, options);
}

export async function untrackFocused(
  runner: AerospaceRunner,
  options: { dryRun: boolean }
): Promise<void> {
  const windowId = await readFocusedWindowId(runner);
  const plan = planUntrackFocused(windowId);
  await executePlan(plan, runner, options);
}

export async function trackVisible(
  taskId: string,
  runner: AerospaceRunner,
  options: { dryRun: boolean }
): Promise<void> {
  const snapshot = await readVisibleSnapshot(runner);
  const plan = planTrackVisible(taskId, snapshot.windows);
  await executePlan(plan, runner, options);
}
