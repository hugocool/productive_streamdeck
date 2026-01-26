export const TASK_PREFIX = 'task:';
export const INBOX_WS = 'inbox';
export const STASH_WS = 'STASH';
// AeroSpace reserves workspace names starting with "_" for future use.
// Use a safe prefix for our temporary "blank" workspaces used during stash.
export const BLANK_PREFIX = 'blank-';
export const INTERNAL_WS_PREFIXES = [BLANK_PREFIX, '__stash'];

export function taskWs(taskId: string): string {
  const trimmed = taskId.trim();
  if (!trimmed) {
    throw new Error('taskId is empty');
  }
  return `${TASK_PREFIX}${trimmed}`;
}

export function isTaskWs(workspace: string): boolean {
  return workspace.startsWith(TASK_PREFIX);
}

export function isInternalWorkspace(workspace: string): boolean {
  if (workspace === STASH_WS) return true;
  return INTERNAL_WS_PREFIXES.some((prefix) => workspace.startsWith(prefix));
}
