import { AerospaceRunner } from '../adapters/aerospaceRunner';
import { Effect, Plan } from './plan';
import { saveAppState, saveGlobalStash, writeDebugExec, writeDebugPlan } from './persistence';

type ExecutionLog = {
  planId: string;
  startedAt: string;
  dryRun: boolean;
  steps: { args: string[]; skipped: boolean }[];
  effectsApplied: boolean;
};

async function applyEffect(effect: Effect): Promise<void> {
  if (effect.type === 'log') {
    console.log(effect.message);
    return;
  }
  if (effect.target === 'globalStash') {
    await saveGlobalStash(effect.payload as any);
    return;
  }
  if (effect.target === 'appState') {
    await saveAppState(effect.payload as any);
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
    effectsApplied: false
  };

  for (const step of plan.steps) {
    const skip = options.dryRun && step.kind === 'mutate';
    log.steps.push({ args: step.args, skipped: skip });
    if (skip) continue;
    await runner.run(step.args);
  }

  if (!options.dryRun) {
    for (const effect of plan.effects) {
      await applyEffect(effect);
    }
    log.effectsApplied = true;
  }

  await writeDebugExec(log);
}
