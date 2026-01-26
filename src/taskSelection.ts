export const DEFAULT_TASK_IDS = ['adhoc', 'scratch', 'misc'];

export function nextTaskId(current: string | undefined, candidates: string[]): string {
  if (candidates.length === 0) {
    return 'adhoc';
  }
  if (!current) {
    return candidates[0];
  }
  const idx = candidates.indexOf(current);
  if (idx === -1) {
    return candidates[0];
  }
  return candidates[(idx + 1) % candidates.length];
}

export function formatTaskLabel(taskId: string | undefined): string {
  if (!taskId) return 'TASK';
  const trimmed = taskId.trim();
  if (!trimmed) return 'TASK';
  const compact = trimmed.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  if (compact.length <= 4) return compact;
  return compact.slice(0, 4);
}

export function generateLocalTaskId(existing: string[], base: string = 'adhoc'): string {
  const safeBase = (base || 'adhoc').trim().replace(/[^a-zA-Z0-9_-]/g, '') || 'adhoc';
  const re = new RegExp(`^${safeBase}-(\\d{3})$`);
  let max = 0;
  for (const id of existing) {
    const match = re.exec(id);
    if (!match) continue;
    const n = Number(match[1]);
    if (Number.isFinite(n) && n > max) max = n;
  }
  const next = String(max + 1).padStart(3, '0');
  return `${safeBase}-${next}`;
}
