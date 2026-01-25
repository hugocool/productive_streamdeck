import fs from 'fs/promises';
import path from 'path';
import { LifecycleState, emptyLifecycleState, Lifecycle } from '../lifecycle';

const STATE_DIR = path.join(process.cwd(), 'state');
const DEBUG_DIR = path.join(process.cwd(), 'debug');

type Versioned<T> = {
  version: number;
  updatedAt: string;
  data: T;
};

export type StashScope =
  | { kind: 'visible' }
  | { kind: 'focused' }
  | { kind: 'task'; taskId: string };

export type StashWindow = {
  id: string;
  fromWorkspace: string;
};

export type VisibleWorkspacesByMonitor = Record<string, string>;

export type StashEntry = {
  id: string;
  createdAt: string;
  scope: StashScope;
  windows: StashWindow[];
  visibleWorkspacesByMonitor: VisibleWorkspacesByMonitor;
};

export type StashStackStateV2 = {
  version: 2;
  updatedAt: string;
  stack: StashEntry[];
};

export type GlobalStashDataV1 = {
  stashWorkspace: string;
  windows: { id: number; workspace: string }[];
  visibleWorkspaces: { monitorId: string; workspace: string }[];
};

export async function ensureDirs(): Promise<void> {
  await fs.mkdir(STATE_DIR, { recursive: true });
  await fs.mkdir(DEBUG_DIR, { recursive: true });
}

async function writeJsonAtomic(filePath: string, payload: unknown): Promise<void> {
  await ensureDirs();
  const tmpPath = `${filePath}.tmp`;
  const data = JSON.stringify(payload, null, 2) + '\n';
  await fs.writeFile(tmpPath, data, 'utf8');
  await fs.rename(tmpPath, filePath);
}

function normalizeLifecycle(value: unknown): Lifecycle {
  if (value === 'RUNNING' || value === 'PAUSED' || value === 'IDLE') return value;
  if (value === 'ACTIVE') return 'RUNNING';
  return 'IDLE';
}

export function normalizeLifecycleState(raw: unknown): LifecycleState {
  const base = emptyLifecycleState();
  if (!raw || typeof raw !== 'object') {
    return base;
  }

  const data = raw as Record<string, unknown>;
  if (data.version === 1 && typeof data.lifecycle === 'string') {
    return {
      version: 1,
      lifecycle: normalizeLifecycle(data.lifecycle),
      selectedTaskId: typeof data.selectedTaskId === 'string' ? data.selectedTaskId : undefined,
      activeTaskId: typeof data.activeTaskId === 'string' ? data.activeTaskId : undefined,
      ambientStashId: typeof data.ambientStashId === 'string' ? data.ambientStashId : undefined,
      pausedTaskStashId: typeof data.pausedTaskStashId === 'string' ? data.pausedTaskStashId : undefined
    };
  }

  if (data.version === 1 && data.data && typeof (data.data as any).state === 'string') {
    const legacyState = (data.data as { state: string }).state;
    return {
      version: 1,
      lifecycle: normalizeLifecycle(legacyState)
    };
  }

  if (typeof data.state === 'string') {
    return {
      version: 1,
      lifecycle: normalizeLifecycle(data.state)
    };
  }

  return base;
}

export async function loadLifecycleState(): Promise<LifecycleState> {
  try {
    const raw = await fs.readFile(path.join(STATE_DIR, 'appState.json'), 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    return normalizeLifecycleState(parsed);
  } catch {
    return emptyLifecycleState();
  }
}

export async function saveLifecycleState(state: LifecycleState): Promise<void> {
  const payload: LifecycleState = {
    version: 1,
    lifecycle: normalizeLifecycle(state.lifecycle),
    selectedTaskId: state.selectedTaskId,
    activeTaskId: state.activeTaskId,
    ambientStashId: state.ambientStashId,
    pausedTaskStashId: state.pausedTaskStashId
  };
  await writeJsonAtomic(path.join(STATE_DIR, 'appState.json'), payload);
}

export function emptyStashStack(): StashStackStateV2 {
  return {
    version: 2,
    updatedAt: new Date().toISOString(),
    stack: []
  };
}

export async function loadStashStack(): Promise<StashStackStateV2> {
  try {
    const raw = await fs.readFile(path.join(STATE_DIR, 'globalStash.json'), 'utf8');
    const parsed = JSON.parse(raw) as any;

    if (parsed?.version === 2) {
      const stack = Array.isArray(parsed.stack) ? parsed.stack : [];
      return {
        version: 2,
        updatedAt: parsed.updatedAt ?? new Date().toISOString(),
        stack
      };
    }

    if (parsed?.version === 1) {
      if (!parsed.data) {
        return emptyStashStack();
      }
      const data = parsed.data as GlobalStashDataV1;
      const entry: StashEntry = {
        id: `stash_migrated_${Date.now()}`,
        createdAt: parsed.updatedAt ?? new Date().toISOString(),
        scope: { kind: 'visible' },
        windows: data.windows.map((window: GlobalStashDataV1['windows'][number]) => ({
          id: String(window.id),
          fromWorkspace: window.workspace
        })),
        visibleWorkspacesByMonitor: Object.fromEntries(
          data.visibleWorkspaces.map((item: GlobalStashDataV1['visibleWorkspaces'][number]) => [
            item.monitorId,
            item.workspace
          ])
        )
      };
      return {
        version: 2,
        updatedAt: new Date().toISOString(),
        stack: [entry]
      };
    }

    return emptyStashStack();
  } catch {
    return emptyStashStack();
  }
}

export async function saveStashStack(state: StashStackStateV2): Promise<void> {
  await writeJsonAtomic(path.join(STATE_DIR, 'globalStash.json'), state);
}

export type TaskRegistry = {
  version: 1;
  updatedAt: string;
  tasks: Record<
    string,
    {
      createdAt: string;
      updatedAt: string;
      title?: string;
      provider?: string;
      lastStopStashId?: string;
    }
  >;
  lastCheckoutTaskId?: string;
};

export function emptyTaskRegistry(): TaskRegistry {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    tasks: {}
  };
}

export async function loadTaskRegistry(): Promise<TaskRegistry> {
  try {
    const raw = await fs.readFile(path.join(STATE_DIR, 'tasks.json'), 'utf8');
    const parsed = JSON.parse(raw) as TaskRegistry;
    if (parsed?.version !== 1) return emptyTaskRegistry();
    const now = new Date().toISOString();
    const normalizedTasks: TaskRegistry['tasks'] = {};
    for (const [taskId, task] of Object.entries(parsed.tasks ?? {})) {
      normalizedTasks[taskId] = {
        createdAt: task.createdAt ?? now,
        updatedAt: task.updatedAt ?? task.createdAt ?? now,
        title: task.title,
        provider: task.provider,
        lastStopStashId: task.lastStopStashId
      };
    }
    return {
      ...parsed,
      updatedAt: parsed.updatedAt ?? now,
      tasks: normalizedTasks
    };
  } catch {
    return emptyTaskRegistry();
  }
}

export async function saveTaskRegistry(registry: TaskRegistry): Promise<void> {
  await writeJsonAtomic(path.join(STATE_DIR, 'tasks.json'), registry);
}

export async function writeDebugPlan(payload: unknown): Promise<void> {
  await writeJsonAtomic(path.join(DEBUG_DIR, 'last-plan.json'), payload);
}

export async function writeDebugExec(payload: unknown): Promise<void> {
  await writeJsonAtomic(path.join(DEBUG_DIR, 'last-exec-log.json'), payload);
}
