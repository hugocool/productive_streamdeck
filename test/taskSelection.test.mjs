import test from './testHarness.mjs';
import assert from 'assert';

import { DEFAULT_TASK_IDS, nextTaskId, formatTaskLabel, generateLocalTaskId } from '../dist/taskSelection.js';

test('nextTaskId cycles through candidates', () => {
  assert.equal(nextTaskId(undefined, DEFAULT_TASK_IDS), 'adhoc');
  assert.equal(nextTaskId('adhoc', DEFAULT_TASK_IDS), 'scratch');
  assert.equal(nextTaskId('scratch', DEFAULT_TASK_IDS), 'misc');
  assert.equal(nextTaskId('misc', DEFAULT_TASK_IDS), 'adhoc');
});

test('nextTaskId falls back to first when current is missing', () => {
  assert.equal(nextTaskId('unknown', DEFAULT_TASK_IDS), 'adhoc');
});

test('formatTaskLabel normalizes and truncates', () => {
  assert.equal(formatTaskLabel(undefined), 'TASK');
  assert.equal(formatTaskLabel('demo-task'), 'DEMO');
  assert.equal(formatTaskLabel('ab'), 'AB');
});

test('generateLocalTaskId increments a numeric suffix', () => {
  assert.equal(generateLocalTaskId(['adhoc-001', 'adhoc-002'], 'adhoc'), 'adhoc-003');
  assert.equal(generateLocalTaskId([], 'adhoc'), 'adhoc-001');
});
