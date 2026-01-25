import test from './testHarness.mjs';
import assert from 'assert';

import { INBOX_WS, isInternalWorkspace, isTaskWs, taskWs } from '../dist/core/taskWorkspaces.js';


test('taskWs prefixes task ids', () => {
  assert.equal(taskWs('abc'), 'task:abc');
});

test('isTaskWs detects task workspaces', () => {
  assert.equal(isTaskWs('task:123'), true);
  assert.equal(isTaskWs('DEV'), false);
});

test('isInternalWorkspace detects stash and blank workspaces', () => {
  assert.equal(isInternalWorkspace('STASH'), true);
  assert.equal(isInternalWorkspace('__blank1'), true);
  assert.equal(isInternalWorkspace(INBOX_WS), false);
});
