import test from './testHarness.mjs';
import assert from 'assert';

import { buildKeySenderArgs, createKeySenderClient } from '../dist/appShortcuts.js';

test('buildKeySenderArgs builds send args deterministically', () => {
  assert.deepEqual(
    buildKeySenderArgs({
      bundleId: 'com.microsoft.edgemac',
      shortcut: 'opt+w',
      requireVisibleOnActiveDisplay: false,
      requireVisibleOnScreen: true,
      restoreFocus: true,
      probeOnly: false
    }),
    ['--bundle-id', 'com.microsoft.edgemac', '--shortcut', 'opt+w', '--require-visible']
  );
});

test('buildKeySenderArgs includes no-restore-focus when requested', () => {
  assert.deepEqual(
    buildKeySenderArgs({
      bundleId: 'com.microsoft.edgemac',
      shortcut: 'cmd+l',
      requireVisibleOnActiveDisplay: false,
      requireVisibleOnScreen: true,
      restoreFocus: false,
      probeOnly: false
    }),
    [
      '--bundle-id',
      'com.microsoft.edgemac',
      '--shortcut',
      'cmd+l',
      '--require-visible',
      '--no-restore-focus'
    ]
  );
});

test('createKeySenderClient probe invokes helper with --probe', async () => {
  const calls = [];
  const client = createKeySenderClient({
    ensureKeySenderBuilt: async () => '/tmp/keysender',
    execFile: (file, args, options, cb) => {
      calls.push({ file, args, options });
      cb(
        null,
        JSON.stringify({
          ok: true,
          code: 0,
          message: 'probe',
          bundleId: 'com.microsoft.edgemac',
          visibleOnActiveDisplay: false,
          visibleOnScreen: true
        }),
        ''
      );
    }
  });

  const result = await client.probeApp({
    bundleId: 'com.microsoft.edgemac',
    requireVisibleOnScreen: true
  });

  assert.equal(result?.visibleOnScreen, true);
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].args, ['--bundle-id', 'com.microsoft.edgemac', '--probe', '--require-visible']);
});

test('createKeySenderClient send invokes helper with --shortcut', async () => {
  const calls = [];
  const client = createKeySenderClient({
    ensureKeySenderBuilt: async () => '/tmp/keysender',
    execFile: (file, args, options, cb) => {
      calls.push({ file, args, options });
      cb(null, '{"ok":true}', '');
    }
  });

  await client.sendShortcutToApp({
    bundleId: 'com.microsoft.edgemac',
    shortcut: 'opt+w',
    requireVisibleOnScreen: true,
    restoreFocus: true
  });

  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].args, ['--bundle-id', 'com.microsoft.edgemac', '--shortcut', 'opt+w', '--require-visible']);
});

