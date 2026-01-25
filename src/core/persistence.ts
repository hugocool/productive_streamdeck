import fs from 'fs/promises';
import path from 'path';
import { AppState } from '../stateMachine';

const STATE_DIR = path.join(process.cwd(), 'state');
const DEBUG_DIR = path.join(process.cwd(), 'debug');

type Versioned<T> = {
  version: number;
  updatedAt: string;
  data: T;
};

export type GlobalStashData = {
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

export async function loadAppState(): Promise<AppState | null> {
  try {
    const raw = await fs.readFile(path.join(STATE_DIR, 'appState.json'), 'utf8');
    const parsed = JSON.parse(raw) as Versioned<{ state: AppState }>;
    if (parsed?.version !== 1) return null;
    return parsed.data.state;
  } catch {
    return null;
  }
}

export async function saveAppState(state: AppState): Promise<void> {
  const payload: Versioned<{ state: AppState }> = {
    version: 1,
    updatedAt: new Date().toISOString(),
    data: { state }
  };
  await writeJsonAtomic(path.join(STATE_DIR, 'appState.json'), payload);
}

export async function loadGlobalStash(): Promise<GlobalStashData | null> {
  try {
    const raw = await fs.readFile(path.join(STATE_DIR, 'globalStash.json'), 'utf8');
    const parsed = JSON.parse(raw) as Versioned<GlobalStashData>;
    if (parsed?.version !== 1) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

export async function saveGlobalStash(data: GlobalStashData | null): Promise<void> {
  if (!data) {
    await writeJsonAtomic(path.join(STATE_DIR, 'globalStash.json'), {
      version: 1,
      updatedAt: new Date().toISOString(),
      data: null
    });
    return;
  }
  const payload: Versioned<GlobalStashData> = {
    version: 1,
    updatedAt: new Date().toISOString(),
    data
  };
  await writeJsonAtomic(path.join(STATE_DIR, 'globalStash.json'), payload);
}

export async function writeDebugPlan(payload: unknown): Promise<void> {
  await writeJsonAtomic(path.join(DEBUG_DIR, 'last-plan.json'), payload);
}

export async function writeDebugExec(payload: unknown): Promise<void> {
  await writeJsonAtomic(path.join(DEBUG_DIR, 'last-exec-log.json'), payload);
}
