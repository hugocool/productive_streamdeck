import test from './testHarness.mjs';
import assert from 'assert';

import { transitionState } from '../dist/streamDeck.js';
import { AppState } from '../dist/stateMachine.js';

test('transitionState handles start/pause/resume', () => {
  assert.equal(transitionState(AppState.IDLE, 'START'), AppState.ACTIVE);
  assert.equal(transitionState(AppState.ACTIVE, 'PAUSE'), AppState.PAUSED);
  assert.equal(transitionState(AppState.PAUSED, 'RESUME'), AppState.ACTIVE);
});

test('transitionState ignores invalid actions for current state', () => {
  assert.equal(transitionState(AppState.IDLE, 'PAUSE'), null);
  assert.equal(transitionState(AppState.IDLE, 'RESUME'), null);
  assert.equal(transitionState(AppState.ACTIVE, 'RESUME'), null);
});
