export type CommandStep = {
  tool: 'aerospace';
  args: string[];
  kind: 'query' | 'mutate';
  captureAs?: string;
  allowFailure?: boolean;
};

export type Effect =
  | { type: 'persist'; target: 'globalStash' | 'appState' | 'taskRegistry'; payload: unknown }
  | { type: 'log'; message: string };

export type Plan = {
  id: string;
  createdAt: string;
  steps: CommandStep[];
  effects: Effect[];
};
