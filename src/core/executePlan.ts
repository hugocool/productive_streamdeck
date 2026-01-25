import { AerospaceRunner } from '../adapters/aerospaceRunner';
import { Effect, Plan } from './plan';
import { saveLifecycleState, saveStashStack, saveTaskRegistry, writeDebugExec, writeDebugPlan } from './persistence';

type ExecutionLog = {
  planId: string;
  startedAt: string;
  dryRun: boolean;
  steps: { args: string[]; skipped: boolean; allowFailure?: boolean }[];
  effectsApplied: boolean;
  captures: Record<string, string>;
};

async function applyEffect(effect: Effect): Promise<void> {
  if (effect.type === 'log') {
    console.log(effect.message);
    return;
  }
  if (effect.target === 'globalStash') {
    await saveStashStack(effect.payload as any);
    return;
  }
  if (effect.target === 'appState') {
    await saveLifecycleState(effect.payload as any);
    return;
  }
  if (effect.target === 'taskRegistry') {
    await saveTaskRegistry(effect.payload as any);
  }
}

export async function executePlan(
  plan: Plan,
  runner: AerospaceRunner,
  options: { dryRun: boolean }
): Promise<void> {
  await writeDebugPlan(plan);

  const log: ExecutionLog = {
    planId: plan.id,
    startedAt: new Date().toISOString(),
    dryRun: options.dryRun,
    steps: [],
    effectsApplied: false,
    captures: {}
  };

  for (const step of plan.steps) {
    const skip = options.dryRun && step.kind === 'mutate';
    log.steps.push({ args: step.args, skipped: skip, allowFailure: step.allowFailure });
    if (skip) continue;
    try {
      const output = await runner.run(step.args);
      if (step.captureAs) {
        log.captures[step.captureAs] = output;
      }
    } catch (error) {
      if (step.allowFailure) {
        console.warn('[AeroSpace non-fatal]', { args: step.args, error });
        continue;
      }
      throw error;
    }
  }

  if (!options.dryRun) {
    for (const effect of plan.effects) {
      await applyEffect(effect);
    }
    log.effectsApplied = true;
  }

  await writeDebugExec(log);
}
