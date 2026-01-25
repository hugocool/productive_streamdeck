import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

// Configuration constants
const STASH_WORKSPACE = 'STASH';

export type WindowSnapshot = {
  id: number;
  workspace: string;
  appName?: string;
  title?: string;
};

export type VisibleWorkspace = {
  monitorId: string;
  workspace: string;
};

type WindowListEntry = Record<string, unknown>;
type WorkspaceListEntry = Record<string, unknown>;

/**
 * Wrapper utilities for AeroSpace CLI operations
 * AeroSpace is a tiling window manager for macOS
 */
export class AeroSpaceUtils {
  static buildListWindowsArgs(scope: 'focused' | 'all'): string[] {
    if (scope === 'focused') {
      return ['list-windows', '--monitor', 'focused', '--workspace', 'focused', '--json'];
    }
    return ['list-windows', '--all', '--json'];
  }

  static buildMoveToWorkspaceArgs(windowId: number, workspace: string): string[] {
    return ['move-node-to-workspace', '--window-id', String(windowId), workspace];
  }

  static buildCloseWindowArgs(windowId: number): string[] {
    return ['close', '--window-id', String(windowId)];
  }

  private static async runAeroSpace(args: string[]): Promise<{ stdout: string; stderr: string }> {
    try {
      const { stdout, stderr } = await execFileAsync('aerospace', args, { encoding: 'utf8', env: process.env });
      if (stderr?.trim()) {
        console.error('[AeroSpace stderr]', stderr.trim());
      }
      return { stdout, stderr };
    } catch (error) {
      const err = error as { code?: number; message?: string; stderr?: string; stdout?: string };
      console.error('[AeroSpace FAIL]', {
        args,
        code: err?.code,
        message: err?.message,
        stderr: err?.stderr,
        stdout: err?.stdout
      });
      throw error;
    }
  }

  static parseWindowListJson(raw: string): WindowSnapshot[] {
    try {
      const parsed = JSON.parse(raw) as WindowListEntry[];
      if (!Array.isArray(parsed)) return [];
      const results: WindowSnapshot[] = [];

      for (const entry of parsed) {
        const id =
          typeof entry['window-id'] === 'number'
            ? entry['window-id']
            : typeof entry['windowId'] === 'number'
              ? entry['windowId']
              : typeof entry['id'] === 'number'
                ? entry['id']
                : undefined;

        const workspace =
          typeof entry['workspace'] === 'string'
            ? entry['workspace']
            : typeof entry['workspace-name'] === 'string'
              ? entry['workspace-name']
              : typeof entry['workspaceName'] === 'string'
                ? entry['workspaceName']
                : '';

        if (typeof id !== 'number' || !workspace) continue;

        results.push({
          id,
          workspace,
          appName: typeof entry['app-name'] === 'string' ? entry['app-name'] : undefined,
          title: typeof entry['window-title'] === 'string' ? entry['window-title'] : undefined
        });
      }

      return results;
    } catch {
      return [];
    }
  }

  static parseVisibleWorkspaces(raw: string): VisibleWorkspace[] {
    const lines = raw
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    const results: VisibleWorkspace[] = [];
    for (const line of lines) {
      const [monitorId, workspace] = line.split(/\s+/);
      if (!monitorId || !workspace) continue;
      results.push({ monitorId, workspace });
    }
    return results;
  }

  static parseVisibleWorkspacesJson(raw: string): VisibleWorkspace[] {
    try {
      const parsed = JSON.parse(raw) as WorkspaceListEntry[];
      if (!Array.isArray(parsed)) return [];
      const results: VisibleWorkspace[] = [];

      for (const entry of parsed) {
        const monitorId =
          typeof entry['monitor-id'] === 'string'
            ? entry['monitor-id']
            : typeof entry['monitorId'] === 'string'
              ? entry['monitorId']
              : typeof entry['monitor-id'] === 'number'
                ? String(entry['monitor-id'])
                : typeof entry['monitorId'] === 'number'
                  ? String(entry['monitorId'])
                  : undefined;

        const workspace =
          typeof entry['workspace'] === 'string'
            ? entry['workspace']
            : typeof entry['workspace-name'] === 'string'
              ? entry['workspace-name']
              : typeof entry['name'] === 'string'
                ? entry['name']
                : '';

        if (!monitorId || !workspace) continue;
        results.push({ monitorId, workspace });
      }

      return results;
    } catch {
      return [];
    }
  }

  static diffWindowIds(before: number[], after: number[]): number[] {
    const beforeSet = new Set(before);
    return after.filter((id) => !beforeSet.has(id));
  }
  
  /**
   * Stash (hide) the current window workspace
   */
  static async stashWindow(): Promise<void> {
    try {
      console.log('Stashing current window workspace...');
      // Move current window to a hidden workspace
      await AeroSpaceUtils.runAeroSpace(['move-node-to-workspace', STASH_WORKSPACE]);
      console.log('Window stashed successfully');
    } catch (error) {
      console.error('Failed to stash window:', error);
    }
  }

  /**
   * Unstash (restore) windows from the stash workspace
   */
  static async unstashWindow(): Promise<void> {
    try {
      console.log('Unstashing windows...');
      // Switch to stash workspace
      await AeroSpaceUtils.runAeroSpace(['workspace', STASH_WORKSPACE]);
      console.log('Switched to stash workspace');
    } catch (error) {
      console.error('Failed to unstash window:', error);
    }
  }

  /**
   * Focus on a specific workspace
   */
  static async focusWorkspace(workspace: string): Promise<void> {
    try {
      // Validate workspace name to prevent command injection
      if (!/^[a-zA-Z0-9_-]+$/.test(workspace)) {
        console.error('Invalid workspace name:', workspace);
        return;
      }
      
      console.log(`Focusing on workspace: ${workspace}`);
      await AeroSpaceUtils.runAeroSpace(['workspace', workspace]);
      console.log(`Focused on workspace: ${workspace}`);
    } catch (error) {
      console.error(`Failed to focus workspace ${workspace}:`, error);
    }
  }

  /**
   * List all workspaces
   */
  static async listWorkspaces(): Promise<string[]> {
    try {
      const { stdout } = await AeroSpaceUtils.runAeroSpace(['list-workspaces', '--all']);
      return stdout.trim().split('\n').filter(w => w.length > 0);
    } catch (error) {
      console.error('Failed to list workspaces:', error);
      return [];
    }
  }

  /**
   * Get the currently focused workspace
   */
  static async getCurrentWorkspace(): Promise<string | null> {
    try {
      const { stdout } = await AeroSpaceUtils.runAeroSpace(['list-workspaces', '--focused']);
      return stdout.trim();
    } catch (error) {
      console.error('Failed to get current workspace:', error);
      return null;
    }
  }

  static async listWindowsFocused(): Promise<WindowSnapshot[]> {
    try {
      const { stdout } = await AeroSpaceUtils.runAeroSpace(AeroSpaceUtils.buildListWindowsArgs('focused'));
      return AeroSpaceUtils.parseWindowListJson(stdout);
    } catch (error) {
      console.error('Failed to list focused windows:', error);
      return [];
    }
  }

  static async listWindowsAll(): Promise<WindowSnapshot[]> {
    try {
      const { stdout } = await AeroSpaceUtils.runAeroSpace(AeroSpaceUtils.buildListWindowsArgs('all'));
      return AeroSpaceUtils.parseWindowListJson(stdout);
    } catch (error) {
      console.error('Failed to list windows:', error);
      return [];
    }
  }

  static async listWindowIdsFocused(): Promise<number[]> {
    const windows = await AeroSpaceUtils.listWindowsFocused();
    return windows.map((window) => window.id);
  }

  static async listVisibleWindows(): Promise<WindowSnapshot[]> {
    try {
      const { stdout } = await AeroSpaceUtils.runAeroSpace(['list-windows', '--workspace', 'visible', '--json']);
      return AeroSpaceUtils.parseWindowListJson(stdout);
    } catch (error) {
      console.error('Failed to list visible windows:', error);
      return [];
    }
  }

  static async listVisibleWorkspaces(): Promise<VisibleWorkspace[]> {
    try {
      const { stdout } = await AeroSpaceUtils.runAeroSpace([
        'list-workspaces',
        '--monitor',
        'all',
        '--visible',
        '--json'
      ]);
      const parsed = AeroSpaceUtils.parseVisibleWorkspacesJson(stdout);
      if (parsed.length > 0) return parsed;
      return AeroSpaceUtils.parseVisibleWorkspaces(stdout);
    } catch (error) {
      console.error('Failed to list visible workspaces:', error);
      return [];
    }
  }

  static async moveWindowsToWorkspace(windowIds: number[], workspace: string): Promise<void> {
    if (!/^[a-zA-Z0-9_-]+$/.test(workspace)) {
      console.error('Invalid workspace name:', workspace);
      return;
    }

    for (const id of windowIds) {
      try {
        await AeroSpaceUtils.runAeroSpace(AeroSpaceUtils.buildMoveToWorkspaceArgs(id, workspace));
      } catch (error) {
        console.error(`Failed to move window ${id} to ${workspace}:`, error);
      }
    }
  }

  static async closeWindows(windowIds: number[]): Promise<void> {
    for (const id of windowIds) {
      try {
        await AeroSpaceUtils.runAeroSpace(AeroSpaceUtils.buildCloseWindowArgs(id));
      } catch (error) {
        console.error(`Failed to close window ${id}:`, error);
      }
    }
  }

  static async stashFocusedWindows(): Promise<WindowSnapshot[]> {
    const windows = await AeroSpaceUtils.listWindowsFocused();
    await AeroSpaceUtils.moveWindowsToWorkspace(
      windows.map((window) => window.id),
      STASH_WORKSPACE
    );
    return windows;
  }

  static async restoreSnapshot(snapshot: WindowSnapshot[]): Promise<void> {
    for (const window of snapshot) {
      try {
        await AeroSpaceUtils.runAeroSpace(AeroSpaceUtils.buildMoveToWorkspaceArgs(window.id, window.workspace));
      } catch (error) {
        console.error(`Failed to restore window ${window.id} to ${window.workspace}:`, error);
      }
    }

    const targetWorkspace = snapshot[0]?.workspace;
    if (targetWorkspace) {
      await AeroSpaceUtils.focusWorkspace(targetWorkspace);
    }
  }

  static async stashVisibleWindows(stashWorkspace: string): Promise<WindowSnapshot[]> {
    const windows = await AeroSpaceUtils.listVisibleWindows();
    await AeroSpaceUtils.moveWindowsToWorkspace(
      windows.map((window) => window.id),
      stashWorkspace
    );
    return windows;
  }

  static async restoreVisibleSnapshot(snapshot: WindowSnapshot[]): Promise<void> {
    await AeroSpaceUtils.restoreSnapshot(snapshot);
  }

  static async summonWorkspace(workspace: string): Promise<void> {
    await AeroSpaceUtils.runAeroSpace(['summon-workspace', workspace]);
  }

  static async focusMonitor(monitorId: string): Promise<void> {
    await AeroSpaceUtils.runAeroSpace(['focus-monitor', monitorId]);
  }
}

export const parseWindowListJson = AeroSpaceUtils.parseWindowListJson;
export const diffWindowIds = AeroSpaceUtils.diffWindowIds;
export const buildListWindowsArgs = AeroSpaceUtils.buildListWindowsArgs;
export const buildMoveToWorkspaceArgs = AeroSpaceUtils.buildMoveToWorkspaceArgs;
export const parseVisibleWorkspaces = AeroSpaceUtils.parseVisibleWorkspaces;
export const parseVisibleWorkspacesJson = AeroSpaceUtils.parseVisibleWorkspacesJson;
