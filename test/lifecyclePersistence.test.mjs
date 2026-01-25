import test from './testHarness.mjs';
import assert from 'assert';

import { normalizeLifecycleState } from '../dist/core/persistence.js';

test('normalizeLifecycleState migrates legacy app state wrapper', () => {
  const legacy = {
    version: 1,
    updatedAt: '2025-01-01T00:00:00Z',
    data: { state: 'ACTIVE' }
  };
  const normalized = normalizeLifecycleState(legacy);
  assert.equal(normalized.lifecycle, 'RUNNING');
});

test('normalizeLifecycleState accepts lifecycle state payload', () => {
  const payload = {
    version: 1,
    lifecycle: 'PAUSED',
    selectedTaskId: 'task-1'
  };
  const normalized = normalizeLifecycleState(payload);
  assert.equal(normalized.lifecycle, 'PAUSED');
  assert.equal(normalized.selectedTaskId, 'task-1');
});
