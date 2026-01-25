import { VisibleSnapshot } from './taskSnapshot';
import { Plan } from './plan';
import {
  StashEntry,
  StashScope,
  StashStackStateV2,
  VisibleWorkspacesByMonitor,
  emptyStashStack
} from './persistence';
import { LifecycleState } from '../lifecycle';

function newPlan(steps: Plan['steps'], effects: Plan['effects']): Plan {
  return {
    id: `plan_${Date.now()}`,
    createdAt: new Date().toISOString(),
    steps,
    effects
  };
}

function sortedMonitorIds(visibleWorkspaces: VisibleWorkspacesByMonitor): string[] {
  return Object.keys(visibleWorkspaces).sort((a, b) => a.localeCompare(b));
}

function sortedWindows(windows: { id: number; workspace: string }[]): { id: number; workspace: string }[] {
  return [...windows].sort((a, b) => a.id - b.id);
}

function resolveEntry(
  stashIdOrIndex: string | number,
  prev: StashStackStateV2
): StashEntry | null {
  if (typeof stashIdOrIndex === 'number') {
    return prev.stack[stashIdOrIndex] ?? null;
  }
  return prev.stack.find((entry) => entry.id === stashIdOrIndex) ?? null;
}

function nextStack(prev: StashStackStateV2, stack: StashEntry[]): StashStackStateV2 {
  return {
    version: 2,
    updatedAt: new Date().toISOString(),
    stack
  };
}

export function planPersistLifecycleState(state: LifecycleState): Plan {
  return newPlan([], [{ type: 'persist', target: 'appState', payload: state }]);
}

export function planStashPush(
  scope: StashScope,
  snapshot: VisibleSnapshot,
  prev: StashStackStateV2,
  stashWorkspace: string,
  blankPrefix: string
): { plan: Plan; next: StashStackStateV2 } {
  const windows = sortedWindows(snapshot.windows);
  const visibleWorkspacesByMonitor = snapshot.visibleWorkspacesByMonitor;

  const entry: StashEntry = {
    id: `stash_${Date.now()}`,
    createdAt: new Date().toISOString(),
    scope,
    windows: windows.map((window) => ({
      id: String(window.id),
      fromWorkspace: window.workspace
    })),
    visibleWorkspacesByMonitor
  };

  const steps: Plan['steps'] = windows.map((window) => ({
    tool: 'aerospace',
    kind: 'mutate',
    args: ['move-node-to-workspace', '--window-id', String(window.id), stashWorkspace]
  }));

  if (scope.kind === 'visible') {
    for (const monitorId of sortedMonitorIds(visibleWorkspacesByMonitor)) {
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
  }

  const nextState = nextStack(prev, [entry, ...prev.stack]);
  const plan = newPlan(steps, [{ type: 'persist', target: 'globalStash', payload: nextState }]);
  return { plan, next: nextState };
}

export function planStashApply(
  stashIdOrIndex: string | number,
  prev: StashStackStateV2
): { plan: Plan } {
  const entry = resolveEntry(stashIdOrIndex, prev);
  if (!entry) {
    return { plan: newPlan([], []) };
  }

  const steps: Plan['steps'] = [];
  const windows = [...entry.windows].sort((a, b) => a.id.localeCompare(b.id));

  for (const window of windows) {
    steps.push({
      tool: 'aerospace',
      kind: 'mutate',
      allowFailure: true,
      args: ['move-node-to-workspace', '--window-id', window.id, window.fromWorkspace]
    });
  }

  for (const monitorId of sortedMonitorIds(entry.visibleWorkspacesByMonitor)) {
    steps.push({
      tool: 'aerospace',
      kind: 'mutate',
      args: ['focus-monitor', monitorId]
    });
    steps.push({
      tool: 'aerospace',
      kind: 'mutate',
      args: ['summon-workspace', entry.visibleWorkspacesByMonitor[monitorId]]
    });
  }

  return { plan: newPlan(steps, []) };
}

export function planStashDrop(
  stashIdOrIndex: string | number,
  prev: StashStackStateV2
): { plan: Plan; next: StashStackStateV2 } {
  const stack = [...prev.stack];
  if (typeof stashIdOrIndex === 'number') {
    stack.splice(stashIdOrIndex, 1);
  } else {
    const idx = stack.findIndex((entry) => entry.id === stashIdOrIndex);
    if (idx >= 0) stack.splice(idx, 1);
  }

  const nextState = nextStack(prev, stack);
  const plan = newPlan([], [{ type: 'persist', target: 'globalStash', payload: nextState }]);
  return { plan, next: nextState };
}

export function planStashPop(
  stashIdOrIndex: string | number = 0,
  prev: StashStackStateV2
): { plan: Plan; next: StashStackStateV2 } {
  const entry = resolveEntry(stashIdOrIndex, prev);
  if (!entry) {
    return { plan: newPlan([], []), next: prev ?? emptyStashStack() };
  }

  const applyPlan = planStashApply(stashIdOrIndex, prev).plan;
  const stack = [...prev.stack];
  if (typeof stashIdOrIndex === 'number') {
    stack.splice(stashIdOrIndex, 1);
  } else {
    const idx = stack.findIndex((item) => item.id === stashIdOrIndex);
    if (idx >= 0) stack.splice(idx, 1);
  }

  const nextState = nextStack(prev, stack);
  const plan = newPlan(
    applyPlan.steps,
    [{ type: 'persist', target: 'globalStash', payload: nextState }]
  );
  return { plan, next: nextState };
}
