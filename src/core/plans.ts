import { AeroSnapshot } from './aeroSnapshot';
import { Plan } from './plan';
import { GlobalStashData } from './persistence';
import { WindowSnapshot } from '../aerospace';
import { AppState } from '../stateMachine';

function newPlan(steps: Plan['steps'], effects: Plan['effects']): Plan {
  return {
    id: `plan_${Date.now()}`,
    createdAt: new Date().toISOString(),
    steps,
    effects
  };
}

export function planStashVisibleWindows(
  snapshot: AeroSnapshot,
  stashWorkspace: string,
  blankPrefix: string
): Plan {
  const steps: Plan['steps'] = [];

  for (const window of snapshot.visibleWindows) {
    steps.push({
      tool: 'aerospace',
      kind: 'mutate',
      args: ['move-node-to-workspace', '--window-id', String(window.id), stashWorkspace]
    });
  }

  const monitors = Array.from(new Set(snapshot.visibleWorkspaces.map((item) => item.monitorId)));
  for (const monitorId of monitors) {
    steps.push({
      tool: 'aerospace',
      kind: 'mutate',
      args: ['focus-monitor', monitorId]
    });
    steps.push({
      tool: 'aerospace',
      kind: 'mutate',
      args: ['summon-workspace', `${blankPrefix}${monitorId}`]
    });
  }

  const payload: GlobalStashData = {
    stashWorkspace,
    windows: snapshot.visibleWindows.map((window) => ({ id: window.id, workspace: window.workspace })),
    visibleWorkspaces: snapshot.visibleWorkspaces
  };

  return newPlan(steps, [{ type: 'persist', target: 'globalStash', payload }]);
}

export function planRestoreVisibleWindows(stash: GlobalStashData, blankPrefix: string): Plan {
  const steps: Plan['steps'] = [];

  for (const window of stash.windows) {
    steps.push({
      tool: 'aerospace',
      kind: 'mutate',
      args: ['move-node-to-workspace', '--window-id', String(window.id), window.workspace]
    });
  }

  for (const entry of stash.visibleWorkspaces) {
    steps.push({
      tool: 'aerospace',
      kind: 'mutate',
      args: ['focus-monitor', entry.monitorId]
    });
    steps.push({
      tool: 'aerospace',
      kind: 'mutate',
      args: ['summon-workspace', entry.workspace]
    });
  }

  return newPlan(steps, [{ type: 'persist', target: 'globalStash', payload: null }]);
}

export function planPauseFocusedWindows(windows: WindowSnapshot[], stashWorkspace: string): Plan {
  const steps: Plan['steps'] = windows.map((window) => ({
    tool: 'aerospace',
    kind: 'mutate',
    args: ['move-node-to-workspace', '--window-id', String(window.id), stashWorkspace]
  }));

  return newPlan(steps, []);
}

export function planPersistAppState(state: AppState): Plan {
  return newPlan([], [{ type: 'persist', target: 'appState', payload: state }]);
}

export function planResumeFocusedWindows(snapshot: WindowSnapshot[], strayWindowIds: number[]): Plan {
  const steps: Plan['steps'] = [];

  for (const id of strayWindowIds) {
    steps.push({
      tool: 'aerospace',
      kind: 'mutate',
      args: ['close', '--window-id', String(id)]
    });
  }

  for (const window of snapshot) {
    steps.push({
      tool: 'aerospace',
      kind: 'mutate',
      args: ['move-node-to-workspace', '--window-id', String(window.id), window.workspace]
    });
  }

  return newPlan(steps, []);
}
