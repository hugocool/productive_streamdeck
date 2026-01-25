export type EdgeMode = 'NAV' | 'TAB_SWITCH';

export type EdgeAction =
  | { type: 'send'; shortcut: string }
  | { type: 'mode'; mode: EdgeMode }
  | { type: 'noop' };

export type EdgeKeyActions = {
  tap: EdgeAction;
  hold?: EdgeAction;
};

export const EDGE_KEYS = {
  K0_TABS: 10,
  K1_BACK: 11,
  K2_CLOSE: 12,
  K3_NEW: 13,
  K4_SEARCH: 14
} as const;

const NAV_MODE: Record<number, EdgeKeyActions> = {
  [EDGE_KEYS.K0_TABS]: {
    tap: { type: 'send', shortcut: 'opt+w' },
    hold: { type: 'send', shortcut: 'cmd+shift+a' }
  },
  [EDGE_KEYS.K1_BACK]: {
    tap: { type: 'send', shortcut: 'cmd+[' },
    hold: { type: 'send', shortcut: 'cmd+]' }
  },
  [EDGE_KEYS.K2_CLOSE]: {
    tap: { type: 'send', shortcut: 'cmd+w' },
    hold: { type: 'send', shortcut: 'cmd+shift+t' }
  },
  [EDGE_KEYS.K3_NEW]: {
    tap: { type: 'send', shortcut: 'cmd+t' },
    hold: { type: 'send', shortcut: 'cmd+n' }
  },
  [EDGE_KEYS.K4_SEARCH]: {
    tap: { type: 'send', shortcut: 'cmd+l' }
  }
};

const TAB_SWITCH_MODE: Record<number, EdgeKeyActions> = {
  [EDGE_KEYS.K0_TABS]: {
    tap: { type: 'noop' }
  },
  [EDGE_KEYS.K1_BACK]: {
    tap: { type: 'send', shortcut: 'up' }
  },
  [EDGE_KEYS.K2_CLOSE]: {
    tap: { type: 'send', shortcut: 'enter' }
  },
  [EDGE_KEYS.K3_NEW]: {
    tap: { type: 'send', shortcut: 'down' }
  },
  [EDGE_KEYS.K4_SEARCH]: {
    tap: { type: 'send', shortcut: 'esc' }
  }
};

export function getEdgeActions(mode: EdgeMode, keyIndex: number): EdgeKeyActions | null {
  if (mode === 'NAV') return NAV_MODE[keyIndex] ?? null;
  return TAB_SWITCH_MODE[keyIndex] ?? null;
}
