import test from './testHarness.mjs';
import assert from 'assert';

import { planPersistLifecycleState, planStashPop, planStashPush } from '../dist/core/plans.js';
import { emptyStashStack } from '../dist/core/persistence.js';
import { emptyLifecycleState } from '../dist/lifecycle.js';

const snapshot = {
  windows: [
    { id: 2, workspace: 'REF' },
    { id: 1, workspace: 'DEV' }
  ],
  visibleWorkspacesByMonitor: {
    '2': 'REF',
    '1': 'DEV'
  }
};

test('planStashPush adds a stack entry and builds steps', () => {
  const prev = emptyStashStack();
  const { plan, next } = planStashPush({ kind: 'visible' }, snapshot, prev, 'STASH', '__blank');
  assert.equal(next.stack.length, 1);
  assert.equal(plan.steps.length, 6);
  assert.deepEqual(plan.steps[0].args, ['move-node-to-workspace', '--window-id', '1', 'STASH']);
  assert.deepEqual(plan.steps[1].args, ['move-node-to-workspace', '--window-id', '2', 'STASH']);
  assert.deepEqual(plan.steps[2].args, ['focus-monitor', '1']);
  assert.deepEqual(plan.steps[3].args, ['summon-workspace', '__blank1']);
});

test('planStashPop applies and drops the top entry', () => {
  const prev = emptyStashStack();
  const pushed = planStashPush({ kind: 'visible' }, snapshot, prev, 'STASH', '__blank').next;
  const { plan, next } = planStashPop(0, pushed);
  assert.ok(plan.steps.length > 0);
  assert.equal(next.stack.length, 0);
});

test('planPersistLifecycleState stores lifecycle state as effect', () => {
  const plan = planPersistLifecycleState({ ...emptyLifecycleState(), lifecycle: 'RUNNING' });
  assert.equal(plan.effects[0].target, 'appState');
});

test('planStashPop marks move steps as allowFailure', () => {
  const prev = emptyStashStack();
  const pushed = planStashPush({ kind: 'visible' }, snapshot, prev, 'STASH', '__blank').next;
  const { plan } = planStashPop(0, pushed);
  const moveStep = plan.steps.find((step) => step.args[0] === 'move-node-to-workspace');
  assert.equal(moveStep.allowFailure, true);
});
