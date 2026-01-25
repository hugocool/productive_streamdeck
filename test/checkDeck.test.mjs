import test from './testHarness.mjs';
import assert from 'assert';

import { colorForState, nextState, formatInfoLines } from '../dist/checkDeck.js';

test('colorForState returns expected RGB values', () => {
  assert.deepEqual(colorForState('IDLE'), { r: 0, g: 180, b: 0 });
  assert.deepEqual(colorForState('ACTIVE'), { r: 255, g: 160, b: 0 });
  assert.deepEqual(colorForState('PAUSED'), { r: 0, g: 120, b: 255 });
});

test('nextState cycles through IDLE -> ACTIVE -> PAUSED -> IDLE', () => {
  assert.equal(nextState('IDLE'), 'ACTIVE');
  assert.equal(nextState('ACTIVE'), 'PAUSED');
  assert.equal(nextState('PAUSED'), 'IDLE');
});

test('formatInfoLines returns state + workspace label', () => {
  assert.deepEqual(formatInfoLines('ACTIVE', 'DEV'), ['ACTIVE', 'DEV']);
  assert.deepEqual(formatInfoLines('PAUSED', ''), ['PAUSED', 'NO WS']);
  assert.deepEqual(formatInfoLines('IDLE', null), ['IDLE', 'NO WS']);
});
