import test from './testHarness.mjs';
import assert from 'assert';

import {
  diffWindowIds,
  parseWindowListJson,
  parseWindowListFormat,
  buildListWindowsArgs,
  buildMoveToWorkspaceArgs,
  parseVisibleWorkspaces,
  parseVisibleWorkspacesJson
} from '../dist/aerospace.js';

test('diffWindowIds returns items in after not present in before', () => {
  assert.deepEqual(diffWindowIds([1, 2], [2, 3, 4]), [3, 4]);
  assert.deepEqual(diffWindowIds([], [5]), [5]);
  assert.deepEqual(diffWindowIds([1, 2], [1, 2]), []);
});

test('parseWindowListJson parses window snapshots', () => {
  const raw = JSON.stringify([
    {
      "window-id": 10,
      "workspace": "DEV",
      "app-name": "Code",
      "window-title": "main.ts"
    },
    {
      "windowId": 11,
      "workspace-name": "REF",
      "app-name": "Edge",
      "window-title": "Docs"
    }
  ]);

  const parsed = parseWindowListJson(raw);
  assert.equal(parsed.length, 2);
  assert.deepEqual(parsed[0], {
    id: 10,
    workspace: 'DEV',
    appName: 'Code',
    title: 'main.ts'
  });
  assert.deepEqual(parsed[1], {
    id: 11,
    workspace: 'REF',
    appName: 'Edge',
    title: 'Docs'
  });
});

test('parseWindowListFormat parses id/workspace pairs', () => {
  const raw = '24048\tDEV\n39576\tREF\n';
  assert.deepEqual(parseWindowListFormat(raw), [
    { id: 24048, workspace: 'DEV' },
    { id: 39576, workspace: 'REF' }
  ]);
});

test('buildListWindowsArgs uses focused workspace and monitor', () => {
  assert.deepEqual(buildListWindowsArgs('focused'), ['list-windows', '--monitor', 'focused', '--workspace', 'focused', '--json']);
  assert.deepEqual(buildListWindowsArgs('all'), ['list-windows', '--all', '--json']);
});

test('buildMoveToWorkspaceArgs orders window-id before workspace', () => {
  assert.deepEqual(buildMoveToWorkspaceArgs(42, 'STASH'), ['move-node-to-workspace', '--window-id', '42', 'STASH']);
});

test('parseVisibleWorkspaces parses monitor/workspace pairs', () => {
  const raw = '1\tDEV\n2\tREF\n';
  assert.deepEqual(parseVisibleWorkspaces(raw), [
    { monitorId: '1', workspace: 'DEV' },
    { monitorId: '2', workspace: 'REF' }
  ]);
});

test('parseVisibleWorkspacesJson handles wrapped arrays', () => {
  const raw = JSON.stringify({
    workspaces: [
      { 'monitor-id': 1, workspace: 'DEV' },
      { monitorId: '2', workspace: 'REF' }
    ]
  });
  assert.deepEqual(parseVisibleWorkspacesJson(raw), [
    { monitorId: '1', workspace: 'DEV' },
    { monitorId: '2', workspace: 'REF' }
  ]);
});
