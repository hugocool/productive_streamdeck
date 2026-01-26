import test from './testHarness.mjs';
import assert from 'assert';

import { emptyLifecycleState } from '../dist/lifecycle.js';
import { emptyTaskRegistry } from '../dist/core/persistence.js';
import { planDetachTaskToInbox, planSelectTaskAndCheckout } from '../dist/core/viewPlans.js';

test('planSelectTaskAndCheckout summons task workspace and persists selection', () => {
  const state = { ...emptyLifecycleState(), lifecycle: 'IDLE' };
  const registry = emptyTaskRegistry();
  const plan = planSelectTaskAndCheckout('adhoc', state, registry);
  assert.ok(plan.steps.some((s) => s.args[0] === 'summon-workspace'));
  assert.ok(plan.effects.some((e) => e.target === 'appState'));
  assert.ok(plan.effects.some((e) => e.target === 'taskRegistry'));
});

test('planDetachTaskToInbox moves windows to inbox and removes registry entry', () => {
  const state = { ...emptyLifecycleState(), lifecycle: 'IDLE', selectedTaskId: 'adhoc' };
  const registry = {
    ...emptyTaskRegistry(),
    tasks: {
      adhoc: { createdAt: 'now', updatedAt: 'now' }
    },
    lastCheckoutTaskId: 'adhoc'
  };
  const plan = planDetachTaskToInbox('adhoc', [2, 1], state, registry, 'scratch');
  assert.deepEqual(plan.steps[0].args, ['move-node-to-workspace', '--window-id', '1', 'inbox']);
  const regEffect = plan.effects.find((e) => e.target === 'taskRegistry');
  assert.ok(regEffect);
  assert.equal(Object.keys(regEffect.payload.tasks).length, 0);
  const stateEffect = plan.effects.find((e) => e.target === 'appState');
  assert.ok(stateEffect);
  assert.equal(stateEffect.payload.selectedTaskId, 'scratch');
});

