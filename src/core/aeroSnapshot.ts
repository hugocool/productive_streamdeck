import { AerospaceRunner } from '../adapters/aerospaceRunner';
import { WindowSnapshot, VisibleWorkspace, parseWindowListJson, parseVisibleWorkspaces } from '../aerospace';

export type AeroSnapshot = {
  visibleWindows: WindowSnapshot[];
  visibleWorkspaces: VisibleWorkspace[];
};

export async function readVisibleSnapshot(runner: AerospaceRunner): Promise<AeroSnapshot> {
  const windowsRaw = await runner.run(['list-windows', '--workspace', 'visible', '--json']);
  const workspacesRaw = await runner.run([
    'list-workspaces',
    '--monitor',
    'all',
    '--visible',
    '--format',
    '%{monitor-id}\t%{workspace}'
  ]);

  return {
    visibleWindows: parseWindowListJson(windowsRaw),
    visibleWorkspaces: parseVisibleWorkspaces(workspacesRaw)
  };
}

export async function readFocusedWorkspaceSnapshot(runner: AerospaceRunner): Promise<WindowSnapshot[]> {
  const windowsRaw = await runner.run([
    'list-windows',
    '--monitor',
    'focused',
    '--workspace',
    'focused',
    '--json'
  ]);
  return parseWindowListJson(windowsRaw);
}
