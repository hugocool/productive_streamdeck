import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Wrapper utilities for AeroSpace CLI operations
 * AeroSpace is a tiling window manager for macOS
 */
export class AeroSpaceUtils {
  
  /**
   * Stash (hide) the current window workspace
   */
  static async stashWindow(): Promise<void> {
    try {
      console.log('Stashing current window workspace...');
      // Move current window to a hidden workspace
      await execAsync('aerospace move-node-to-workspace stash');
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
      await execAsync('aerospace workspace stash');
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
      await execAsync(`aerospace workspace ${workspace}`);
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
      const { stdout } = await execAsync('aerospace list-workspaces --all');
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
      const { stdout } = await execAsync('aerospace list-workspaces --focused');
      return stdout.trim();
    } catch (error) {
      console.error('Failed to get current workspace:', error);
      return null;
    }
  }
}
