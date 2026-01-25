import test from './testHarness.mjs';
import assert from 'assert';

import { transitionLifecycle, emptyLifecycleState } from '../dist/lifecycle.js';

test('transitionLifecycle handles start/pause/resume/stop', () => {
  const base = { ...emptyLifecycleState(), selectedTaskId: 'task-1' };
  assert.equal(transitionLifecycle({ ...base, lifecycle: 'IDLE' }, 'START'), 'RUNNING');
  assert.equal(transitionLifecycle({ ...base, lifecycle: 'RUNNING' }, 'PAUSE'), 'PAUSED');
  assert.equal(transitionLifecycle({ ...base, lifecycle: 'PAUSED' }, 'RESUME'), 'RUNNING');
  assert.equal(transitionLifecycle({ ...base, lifecycle: 'RUNNING' }, 'STOP'), 'IDLE');
});

test('transitionLifecycle ignores invalid actions for current state', () => {
  const base = { ...emptyLifecycleState(), selectedTaskId: 'task-1' };
  assert.equal(transitionLifecycle({ ...base, lifecycle: 'IDLE' }, 'PAUSE'), null);
  assert.equal(transitionLifecycle({ ...base, lifecycle: 'IDLE' }, 'RESUME'), null);
  assert.equal(transitionLifecycle({ ...base, lifecycle: 'RUNNING' }, 'RESUME'), null);
});

test('transitionLifecycle requires a selected task for start', () => {
  const base = emptyLifecycleState();
  assert.equal(transitionLifecycle({ ...base, lifecycle: 'IDLE' }, 'START'), null);
});
