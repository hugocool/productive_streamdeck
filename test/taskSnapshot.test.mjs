import test from './testHarness.mjs';
import assert from 'assert';

import { extractWorkspaceNames, filterVisibleSnapshot } from '../dist/core/taskSnapshot.js';

test('filterVisibleSnapshot excludes windows and workspaces', () => {
  const snapshot = {
    windows: [
      { id: 1, workspace: 'task:alpha' },
      { id: 2, workspace: 'REF' }
    ],
    visibleWorkspacesByMonitor: {
      '1': 'task:alpha',
      '2': 'REF'
    }
  };

  const filtered = filterVisibleSnapshot(snapshot, ['task:alpha']);
  assert.deepEqual(filtered.windows.map((window) => window.id), [2]);
  assert.deepEqual(filtered.visibleWorkspacesByMonitor, { '2': 'REF' });
});

test('extractWorkspaceNames reads workspace-only JSON', () => {
  const raw = JSON.stringify([
    { workspace: '1' },
    { workspace: '2' },
    { workspace: 'DEV' }
  ]);
  assert.deepEqual(extractWorkspaceNames(raw), ['1', '2', 'DEV']);
});
