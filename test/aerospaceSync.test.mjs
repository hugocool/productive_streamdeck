import test from './testHarness.mjs';
import assert from 'assert';

import { renderAeroSpaceConfig } from '../dist/aerospaceSync.js';

test('renderAeroSpaceConfig swaps the port in the template', () => {
  const template = [
    'exec-on-workspace-change = [',
    '  "/usr/bin/curl", "-s", "http://127.0.0.1:3000/aerospace-event"',
    ']'
  ].join('\n');

  const rendered = renderAeroSpaceConfig(template, 4567);
  assert.equal(
    rendered.includes('http://127.0.0.1:4567/aerospace-event'),
    true
  );
});
