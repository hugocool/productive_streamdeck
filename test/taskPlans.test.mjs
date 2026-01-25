import test from './testHarness.mjs';
import assert from 'assert';

import { filterTrackVisibleWindows, planTrackVisible } from '../dist/core/taskPlans.js';

const windows = [
  { id: 3, workspace: 'task:other' },
  { id: 2, workspace: 'DEV' },
  { id: 4, workspace: 'task:mine' },
  { id: 5, workspace: 'STASH' },
  { id: 1, workspace: 'inbox' }
];

test('filterTrackVisibleWindows skips other task and internal workspaces', () => {
  const filtered = filterTrackVisibleWindows(windows, 'mine');
  assert.deepEqual(filtered.map((w) => w.id), [1, 2, 4]);
});

test('planTrackVisible builds move steps for filtered windows', () => {
  const plan = planTrackVisible('mine', windows);
  assert.equal(plan.steps.length, 3);
  assert.deepEqual(plan.steps[0].args, ['move-node-to-workspace', '--window-id', '1', 'task:mine']);
});
