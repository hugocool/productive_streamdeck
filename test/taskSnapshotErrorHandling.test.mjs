import test from './testHarness.mjs';
import assert from 'assert';

import { tryReadVisibleSnapshot, tryReadWorkspaceSnapshot } from '../dist/core/taskSnapshot.js';

class FailingRunner {
  async run() {
    throw new Error('AeroSpace unavailable');
  }
}

test('tryReadVisibleSnapshot returns null on runner errors', async () => {
  const snapshot = await tryReadVisibleSnapshot(new FailingRunner());
  assert.equal(snapshot, null);
});

test('tryReadWorkspaceSnapshot returns null on runner errors', async () => {
  const snapshot = await tryReadWorkspaceSnapshot(new FailingRunner(), 'task:demo');
  assert.equal(snapshot, null);
});
