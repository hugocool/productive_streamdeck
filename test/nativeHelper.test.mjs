import test from './testHarness.mjs';
import assert from 'assert';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

import { ensureKeySenderBuilt, getKeySenderPath, parseKeySenderProbe } from '../dist/nativeHelper.js';

test('ensureKeySenderBuilt skips build when helper exists', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'keysender-'));
  const helperPath = getKeySenderPath(tmpDir);
  await fs.mkdir(path.dirname(helperPath), { recursive: true });
  await fs.writeFile(helperPath, '');

  let called = false;
  await ensureKeySenderBuilt({
    rootDir: tmpDir,
    runBuild: async () => {
      called = true;
    }
  });

  assert.equal(called, false);
});

test('ensureKeySenderBuilt calls build when helper is missing', async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'keysender-'));
  let called = false;

  await ensureKeySenderBuilt({
    rootDir: tmpDir,
    runBuild: async () => {
      called = true;
      const helperPath = getKeySenderPath(tmpDir);
      await fs.mkdir(path.dirname(helperPath), { recursive: true });
      await fs.writeFile(helperPath, '');
    }
  });

  assert.equal(called, true);
});

test('parseKeySenderProbe parses valid JSON', () => {
  const raw = JSON.stringify({
    ok: true,
    code: 0,
    message: 'probe',
    bundleId: 'com.microsoft.edgemac',
    visibleOnActiveDisplay: false,
    visibleOnScreen: true
  });
  const parsed = parseKeySenderProbe(raw);
  assert.equal(parsed?.visibleOnScreen, true);
});

test('parseKeySenderProbe returns null on invalid JSON', () => {
  const parsed = parseKeySenderProbe('not-json');
  assert.equal(parsed, null);
});
