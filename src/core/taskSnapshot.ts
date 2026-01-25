import { AerospaceRunner } from '../adapters/aerospaceRunner';
import { WindowSnapshot, parseWindowListJson, parseVisibleWorkspacesJson, parseVisibleWorkspaces } from '../aerospace';

export type VisibleSnapshot = {
  windows: WindowSnapshot[];
  visibleWorkspacesByMonitor: Record<string, string>;
};

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
  const workspacesRaw = await runner.run([
    'list-workspaces',
    '--monitor',
    'all',
    '--visible',
    '--json'
  ]);
  const workspaces = parseVisibleWorkspacesJson(workspacesRaw);
  const fallback = workspaces.length > 0 ? workspaces : parseVisibleWorkspaces(workspacesRaw);
  const visibleWorkspacesByMonitor = Object.fromEntries(
    fallback.map((entry) => [entry.monitorId, entry.workspace])
  );

  const workspaceNames = fallback.map((entry) => entry.workspace);
  const windowsRaw =
    workspaceNames.length > 0
      ? await runner.run(['list-windows', '--workspace', ...workspaceNames, '--json'])
      : '[]';

  const snapshot = {
    windows: parseWindowListJson(windowsRaw),
    visibleWorkspacesByMonitor
  };
  return options?.excludeWorkspaces
    ? filterVisibleSnapshot(snapshot, options.excludeWorkspaces)
    : snapshot;
}

export async function readWorkspaceSnapshot(
  runner: AerospaceRunner,
  workspace: string
): Promise<VisibleSnapshot> {
  if (!workspace) {
    return { windows: [], visibleWorkspacesByMonitor: {} };
  }
  const windowsRaw = await runner.run(['list-windows', '--workspace', workspace, '--json']);
  return {
    windows: parseWindowListJson(windowsRaw),
    visibleWorkspacesByMonitor: {}
  };
}

export async function readFocusedWindowId(runner: AerospaceRunner): Promise<number | null> {
  try {
    const raw = await runner.run(['list-windows', '--focused', '--json']);
    const windows = parseWindowListJson(raw);
    return windows[0]?.id ?? null;
  } catch {
    return null;
  }
}
