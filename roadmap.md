# Roadmap: Task Provider Integration (TickTick + Notion)

This roadmap defines how to integrate task providers with the existing
Productivity OS workflow. It assumes tasks live in a Notion "Sprints" database
and are synced to TickTick, so we can use either provider as source of truth.

Scope: planning only. No implementation in this document.

## Goals
- Provide a stable list of tasks to select as branches (`task:<id>`).
- Keep window control independent of provider uptime.
- Start read-only, then add opt-in writeback.
- Preserve the current Stream Deck UX until a dedicated task layer is added.

## Source-of-truth options
We should pick one of these strategies and document the choice in `AGENTS.md`.

### Option A: TickTick is source-of-truth (fastest)
- Read tasks from TickTick API.
- Treat Notion fields as optional metadata later.
- Pros: simpler, fewer APIs, faster to ship.
- Cons: loses Notion-only metadata unless we later enrich from Notion.

### Option B: Notion is source-of-truth (more complete)
- Read tasks from Notion Sprints DB.
- Use TickTick only as a writeback mirror (optional).
- Pros: aligns with your Notion workflow.
- Cons: Notion API work, heavier auth + pagination.

### Option C: Dual-source with reconciliation (best long-term, most work)
- Read from Notion, reconcile with TickTick IDs.
- Requires stable mapping (Notion page property with TickTick taskId).
- Pros: rich data + reliable task IDs.
- Cons: requires careful conflict handling.

## Task identity (git-like branches)
We should map tasks to stable branch keys:
- TickTick: `ticktick:<taskId>`
- Notion: `notion:<pageId>`
- Dual-source: `task:<uuid>` with provider metadata referencing both.

Every branch key must be stable across restarts and safe to store in
`state/appState.json` as `selectedTaskId`.

## Data model additions
New file: `src/core/taskModel.ts`

```ts
export type TaskProvider = "ticktick" | "notion";

export type TaskRef = {
  provider: TaskProvider;
  providerId: string;
  projectId?: string;
};

export type TodoTask = {
  id: string;           // internal id (branch key)
  title: string;
  provider: TaskProvider;
  providerRef: TaskRef;
  dueDate?: string;
  startDate?: string;
  isAllDay?: boolean;
  timeZone?: string;
  sprint?: string;
  status?: string;
};
```

Persist cached tasks in `state/tasksCache.json` (read-only snapshot with
`updatedAt` + provider metadata).

## Provider adapters (module list)
Add adapters that return `TodoTask[]` with stable IDs:

### TickTick
- `src/providers/ticktick/ticktickClient.ts`
  - `listProjects()`
  - `getProjectData(projectId)`
  - (stage 4b) `completeTask(projectId, taskId)`
  - (stage 4b) `updateTask(taskId, payload)`
- `src/providers/ticktick/ticktickProvider.ts`
  - `listToday()`
  - `listInProgress()` (project name convention, default `__INPROGRESS`)
  - `listSprints()` (optional later)

### Notion
- `src/providers/notion/notionClient.ts`
  - `queryDatabase(databaseId, filter, sorts, cursor)`
  - `retrievePage(pageId)`
- `src/providers/notion/notionProvider.ts`
  - `listToday()`
  - `listInProgress()` (based on Notion status property)
  - `listSprints()` (based on Sprint property or relation)

## Auth + secrets
- Store provider tokens in `state/` with atomic writes:
  - `state/ticktickAuth.json`
  - `state/notionAuth.json`
- Never embed tokens in code or logs.
- Add `/oauth/<provider>/start` and `/oauth/<provider>/callback` endpoints
  once we need interactive auth.

## Button mapping (Task Picker layer)
We will need a dedicated Task Picker layer. Suggested mapping:

Entry:
- Long-press Key 0 (START) or a new VIEW layer key when available.

Layout (3x5 grid):
- Row 1: Today tasks (top 5).
- Row 2: In Progress tasks (top 5).
- Row 3:
  - K10/K11: Next/Prev page
  - K12: Refresh
  - K13: Back to main layer
  - K14: Provider status (auth/sync)

Actions:
- Tap task: `selectTask(taskKey)` (updates `selectedTaskId` only).
- Hold task: `select + start` (optional, gated).

Visual cues:
- Selected task: green outline or badge.
- Needs auth: red status on K14.
- Sync pending: amber on K14.

## Functions to develop
Core functions (no UI):
- `selectTask(taskKey)` -> update `state/appState.json`.
- `fetchTasks(provider)` -> update `state/tasksCache.json`.
- `listTasks(view)` -> filtered subset for UI (Today/In Progress).

Lifecycle integration:
- `startSelectedTask()` -> uses Stage 3 lifecycle (already exists).
- `resumeSelectedTask()` -> uses Stage 3 lifecycle.

Provider helpers:
- `deriveToday(tasks, tz)` -> date filtering logic.
- `deriveInProgress(tasks, rule)` -> TickTick project or Notion status filter.

Writeback (Stage 4b, opt-in):
- `enqueueSync(op)` -> append to `state/syncQueue.json`.
- `syncWorkerTick()` -> run queued operations with backoff.
- `completeTask(taskKey)` -> mapped to provider API via sync queue.

## Phased delivery

### Stage 4a: Read-only task listing
- TickTick provider + cached tasks.
- Task Picker layer with selection.
- No writeback, no window moves.

### Stage 4b: Writeback (opt-in)
- Sync queue + backoff.
- Hold STOP to complete a task (TickTick first).
- Visual feedback on sync status key.

### Stage 4c: Notion integration
- Read from Sprints DB (source-of-truth decision).
- Optional: maintain `TickTick taskId` property on Notion pages.
- If dual-source: reconcile via stored mapping.

## Testing plan
- Unit tests:
  - `deriveToday` and `deriveInProgress`
  - mapping to `task:<id>` branch keys
- Integration tests:
  - mocked provider responses
  - auth failure handling
- Manual:
  - refresh tasks offline (uses cached list)
  - select task then START

## Open questions
- Which system is source-of-truth (Notion vs TickTick)?
- How to represent sprint boundaries in task selection?
- Which Stream Deck key should open Task Picker (VIEW key vs long-press)?
