import test from './testHarness.mjs';
import assert from 'assert';

import { shouldRenderEdgeRow } from '../dist/streamDeck.js';

test('shouldRenderEdgeRow mirrors availability', () => {
  assert.equal(shouldRenderEdgeRow(true), true);
  assert.equal(shouldRenderEdgeRow(false), false);
});
