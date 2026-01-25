import test from 'node:test';
import assert from 'node:assert/strict';

import { planPersistAppState, planStashVisibleWindows, planRestoreVisibleWindows } from '../dist/core/plans.js';
import { AppState } from '../dist/stateMachine.js';

const snapshot = {
  visibleWindows: [
    { id: 1, workspace: 'DEV' },
    { id: 2, workspace: 'REF' }
  ],
  visibleWorkspaces: [
    { monitorId: '1', workspace: 'DEV' },
    { monitorId: '2', workspace: 'REF' }
  ]
};

test('planStashVisibleWindows builds move + summon steps', () => {
  const plan = planStashVisibleWindows(snapshot, 'STASH', '__blank');
  assert.equal(plan.steps.length, 6);
  assert.deepEqual(plan.steps[0].args, ['move-node-to-workspace', '--window-id', '1', 'STASH']);
  assert.deepEqual(plan.steps[1].args, ['move-node-to-workspace', '--window-id', '2', 'STASH']);
});

test('planRestoreVisibleWindows restores windows and workspaces', () => {
  const plan = planRestoreVisibleWindows({
    stashWorkspace: 'STASH',
    windows: snapshot.visibleWindows,
    visibleWorkspaces: snapshot.visibleWorkspaces
  }, '__blank');
  assert.ok(plan.steps.length >= 4);
});

test('planPersistAppState stores app state as effect', () => {
  const plan = planPersistAppState(AppState.ACTIVE);
  assert.equal(plan.effects[0].target, 'appState');
});
