export type CommandStep = {
  tool: 'aerospace';
  args: string[];
  kind: 'query' | 'mutate';
};

export type Effect =
  | { type: 'persist'; target: 'globalStash' | 'appState'; payload: unknown }
  | { type: 'log'; message: string };

export type Plan = {
  id: string;
  createdAt: string;
  steps: CommandStep[];
  effects: Effect[];
};
