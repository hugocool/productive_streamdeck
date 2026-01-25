import { Plan } from './plan';
import { TaskRegistry } from './persistence';
import { INBOX_WS, isInternalWorkspace, isTaskWs, taskWs } from './taskWorkspaces';

export type TrackableWindow = {
  id: number;
  workspace: string;
};

function newPlan(steps: Plan['steps'], effects: Plan['effects']): Plan {
  return {
    id: `plan_${Date.now()}`,
    createdAt: new Date().toISOString(),
    steps,
    effects
  };
}

export function planCheckoutTask(taskId: string, registry: TaskRegistry): Plan {
  const workspace = taskWs(taskId);
  const now = new Date().toISOString();
  const existing = registry.tasks[taskId];
  const nextRegistry: TaskRegistry = {
    ...registry,
    updatedAt: now,
    lastCheckoutTaskId: taskId,
    tasks: {
      ...registry.tasks,
      [taskId]: {
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
        title: existing?.title,
        provider: existing?.provider,
        lastStopStashId: existing?.lastStopStashId
      }
    }
  };

  return newPlan(
    [{ tool: 'aerospace', kind: 'mutate', args: ['summon-workspace', workspace] }],
    [{ type: 'persist', target: 'taskRegistry', payload: nextRegistry }]
  );
}

export function planTrackFocused(taskId: string, windowId: number | null): Plan {
  if (windowId === null) {
    return newPlan([], [{ type: 'log', message: 'No focused window to track.' }]);
  }
  return newPlan(
    [
      {
        tool: 'aerospace',
        kind: 'mutate',
        args: ['move-node-to-workspace', '--window-id', String(windowId), taskWs(taskId)]
      }
    ],
    []
  );
}

export function planUntrackFocused(windowId: number | null): Plan {
  if (windowId === null) {
    return newPlan([], [{ type: 'log', message: 'No focused window to untrack.' }]);
  }
  return newPlan(
    [
      {
        tool: 'aerospace',
        kind: 'mutate',
        args: ['move-node-to-workspace', '--window-id', String(windowId), INBOX_WS]
      }
    ],
    []
  );
}

export function filterTrackVisibleWindows(
  windows: TrackableWindow[],
  targetTaskId: string
): TrackableWindow[] {
  const targetWorkspace = taskWs(targetTaskId);
  const filtered = windows.filter((window) => {
    if (isInternalWorkspace(window.workspace)) return false;
    if (isTaskWs(window.workspace) && window.workspace !== targetWorkspace) return false;
    return true;
  });
  return filtered.sort((a, b) => a.id - b.id);
}

export function planTrackVisible(taskId: string, windows: TrackableWindow[]): Plan {
  const trackable = filterTrackVisibleWindows(windows, taskId);
  const steps = trackable.map((window) => ({
    tool: 'aerospace' as const,
    kind: 'mutate' as const,
    args: ['move-node-to-workspace', '--window-id', String(window.id), taskWs(taskId)]
  }));
  return newPlan(steps, []);
}
