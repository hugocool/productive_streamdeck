import { AerospaceRunner } from '../adapters/aerospaceRunner';
import {
  WindowSnapshot,
  parseWindowListFormat,
  parseWindowListJson,
  parseVisibleWorkspacesJson,
  parseVisibleWorkspaces
} from '../aerospace';

export type VisibleSnapshot = {
  windows: WindowSnapshot[];
  visibleWorkspacesByMonitor: Record<string, string>;
};

export function extractWorkspaceNames(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    let entries: Record<string, unknown>[] = [];
    if (Array.isArray(parsed)) {
      entries = parsed as Record<string, unknown>[];
    } else if (parsed && typeof parsed === 'object') {
      const record = parsed as Record<string, unknown>;
      const candidate =
        (Array.isArray(record.workspaces) && record.workspaces) ||
        (Array.isArray(record.items) && record.items) ||
        (Array.isArray(record.data) && record.data) ||
        [];
      entries = candidate as Record<string, unknown>[];
    }

    const names = entries
      .map((entry) => {
        if (typeof entry['workspace'] === 'string') return entry['workspace'];
        if (typeof entry['workspace-name'] === 'string') return entry['workspace-name'];
        if (typeof entry['name'] === 'string') return entry['name'];
        return '';
      })
      .filter(Boolean);

    return Array.from(new Set(names));
  } catch {
    return [];
  }
}

export function filterVisibleSnapshot(
  snapshot: VisibleSnapshot,
  excludeWorkspaces: string[]
): VisibleSnapshot {
  if (excludeWorkspaces.length === 0) {
    return snapshot;
  }
  const excludeSet = new Set(excludeWorkspaces);
  const filteredWindows = snapshot.windows.filter((window) => !excludeSet.has(window.workspace));
  const filteredWorkspaces: Record<string, string> = {};
  for (const [monitorId, workspace] of Object.entries(snapshot.visibleWorkspacesByMonitor)) {
    if (!excludeSet.has(workspace)) {
      filteredWorkspaces[monitorId] = workspace;
    }
  }
  return {
    windows: filteredWindows,
    visibleWorkspacesByMonitor: filteredWorkspaces
  };
}

export async function readVisibleSnapshot(
  runner: AerospaceRunner,
  options?: { excludeWorkspaces?: string[] }
): Promise<VisibleSnapshot> {
  const formattedWorkspacesRaw = await runner.run([
    'list-workspaces',
    '--monitor',
    'all',
    '--visible',
    '--format',
    '%{monitor-id}\t%{workspace}'
  ]);
  let formatted = parseVisibleWorkspaces(formattedWorkspacesRaw);
  let visibleWorkspacesByMonitor = Object.fromEntries(
    formatted.map((entry) => [entry.monitorId, entry.workspace])
  );

  if (formatted.length === 0) {
    const workspacesRaw = await runner.run([
      'list-workspaces',
      '--monitor',
      'all',
      '--visible',
      '--json'
    ]);
    const workspaces = parseVisibleWorkspacesJson(workspacesRaw);
    formatted = workspaces;
    visibleWorkspacesByMonitor = Object.fromEntries(
      formatted.map((entry) => [entry.monitorId, entry.workspace])
    );
  }

  let workspaceNames = formatted.map((entry) => entry.workspace);
  if (workspaceNames.length === 0) {
    const jsonRaw = await runner.run([
      'list-workspaces',
      '--monitor',
      'all',
      '--visible',
      '--json'
    ]);
    workspaceNames = extractWorkspaceNames(jsonRaw);
  }
  const windowsRaw =
    workspaceNames.length > 0
      ? await runner.run([
          'list-windows',
          '--workspace',
          ...workspaceNames,
          '--format',
          '%{window-id}\t%{workspace}'
        ])
      : '';

  const snapshot = {
    windows: parseWindowListFormat(windowsRaw),
    visibleWorkspacesByMonitor
  };
  return options?.excludeWorkspaces
    ? filterVisibleSnapshot(snapshot, options.excludeWorkspaces)
    : snapshot;
}

export async function tryReadVisibleSnapshot(
  runner: AerospaceRunner,
  options?: { excludeWorkspaces?: string[] }
): Promise<VisibleSnapshot | null> {
  try {
    return await readVisibleSnapshot(runner, options);
  } catch (error) {
    console.error('Failed to read visible snapshot:', error);
    return null;
  }
}

export async function readWorkspaceSnapshot(
  runner: AerospaceRunner,
  workspace: string
): Promise<VisibleSnapshot> {
  if (!workspace) {
    return { windows: [], visibleWorkspacesByMonitor: {} };
  }
  const windowsRaw = await runner.run([
    'list-windows',
    '--workspace',
    workspace,
    '--format',
    '%{window-id}\t%{workspace}'
  ]);
  return {
    windows: parseWindowListFormat(windowsRaw),
    visibleWorkspacesByMonitor: {}
  };
}

export async function tryReadWorkspaceSnapshot(
  runner: AerospaceRunner,
  workspace: string
): Promise<VisibleSnapshot | null> {
  try {
    return await readWorkspaceSnapshot(runner, workspace);
  } catch (error) {
    console.error('Failed to read workspace snapshot:', error);
    return null;
  }
}

export async function readFocusedWindowId(runner: AerospaceRunner): Promise<number | null> {
  try {
    const raw = await runner.run(['list-windows', '--focused', '--json']);
    const windows = parseWindowListJson(raw);
    if (windows.length > 0) {
      return windows[0]?.id ?? null;
    }
    const parsed = JSON.parse(raw) as unknown;
    const first = Array.isArray(parsed) ? (parsed as Array<Record<string, unknown>>)[0] : null;
    const id =
      typeof first?.['window-id'] === 'number'
        ? first['window-id']
        : typeof first?.['windowId'] === 'number'
          ? first['windowId']
          : undefined;
    return typeof id === 'number' ? id : null;
  } catch {
    return null;
  }
}
