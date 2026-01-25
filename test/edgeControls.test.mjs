import test from './testHarness.mjs';
import assert from 'assert';

import { EDGE_KEYS, getEdgeActions } from '../dist/edgeControls.js';

test('edge nav mode mappings', () => {
  assert.equal(getEdgeActions('NAV', EDGE_KEYS.K0_TABS)?.tap.shortcut, 'opt+w');
  assert.equal(getEdgeActions('NAV', EDGE_KEYS.K0_TABS)?.hold?.shortcut, 'cmd+shift+a');
  assert.equal(getEdgeActions('NAV', EDGE_KEYS.K1_BACK)?.tap.shortcut, 'cmd+[');
  assert.equal(getEdgeActions('NAV', EDGE_KEYS.K1_BACK)?.hold?.shortcut, 'cmd+]');
  assert.equal(getEdgeActions('NAV', EDGE_KEYS.K2_CLOSE)?.tap.shortcut, 'cmd+w');
  assert.equal(getEdgeActions('NAV', EDGE_KEYS.K2_CLOSE)?.hold?.shortcut, 'cmd+shift+t');
  assert.equal(getEdgeActions('NAV', EDGE_KEYS.K3_NEW)?.tap.shortcut, 'cmd+t');
  assert.equal(getEdgeActions('NAV', EDGE_KEYS.K3_NEW)?.hold?.shortcut, 'cmd+n');
  assert.equal(getEdgeActions('NAV', EDGE_KEYS.K4_SEARCH)?.tap.shortcut, 'cmd+l');
});

test('edge tab switch mode mappings', () => {
  assert.equal(getEdgeActions('TAB_SWITCH', EDGE_KEYS.K1_BACK)?.tap.shortcut, 'up');
  assert.equal(getEdgeActions('TAB_SWITCH', EDGE_KEYS.K2_CLOSE)?.tap.shortcut, 'enter');
  assert.equal(getEdgeActions('TAB_SWITCH', EDGE_KEYS.K3_NEW)?.tap.shortcut, 'down');
  assert.equal(getEdgeActions('TAB_SWITCH', EDGE_KEYS.K4_SEARCH)?.tap.shortcut, 'esc');
});
