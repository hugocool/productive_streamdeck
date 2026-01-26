import { run } from './testHarness.mjs';

import './aerospace.test.mjs';
import './aerospaceSync.test.mjs';
import './checkDeck.test.mjs';
import './edgeControls.test.mjs';
import './lifecyclePersistence.test.mjs';
import './nativeHelper.test.mjs';
import './taskPlans.test.mjs';
import './taskSnapshot.test.mjs';
import './taskSnapshotErrorHandling.test.mjs';
import './taskSelection.test.mjs';
import './viewPlans.test.mjs';
import './taskWorkspaces.test.mjs';
import './appShortcuts.test.mjs';
import './plans.test.mjs';
import './stateActions.test.mjs';
import './statusServerPortSelection.test.mjs';
import './streamDeckVisibility.test.mjs';

await run();
