import { run } from './testHarness.mjs';

import './aerospace.test.mjs';
import './aerospaceSync.test.mjs';
import './checkDeck.test.mjs';
import './edgeControls.test.mjs';
import './nativeHelper.test.mjs';
import './plans.test.mjs';
import './stateActions.test.mjs';
import './statusServerPortSelection.test.mjs';
import './streamDeckVisibility.test.mjs';

await run();
