import type { ToolsTab } from './toolSelectors';

export const SIDEBAR_NAV_KEY = 'myoffice.tools.sidebar.v1';
export type SidebarNavState = { recent: ToolsTab[]; iconsOpen: boolean };

/** Tabs other than the current one, most-recently-used first (stable for the rest). */
export function rankTabs<T extends { value: ToolsTab }>(tabs: T[], current: ToolsTab, recent: ToolsTab[]): T[] {
  const order = new Map(recent.map((tab, index) => [tab, index]));
  return tabs.filter(tab => tab.value !== current).sort((a, b) => (order.get(a.value) ?? Infinity) - (order.get(b.value) ?? Infinity));
}

/** Most recent first, de-duplicated, capped. */
export function recordTabUse(recent: ToolsTab[], tab: ToolsTab, limit = 12): ToolsTab[] {
  return [tab, ...recent.filter(item => item !== tab)].slice(0, limit);
}

export function loadSidebarNav(storage: Pick<Storage, 'getItem'>): SidebarNavState {
  try {
    const raw = storage.getItem(SIDEBAR_NAV_KEY);
    if (!raw) return { recent: [], iconsOpen: true };
    const value = JSON.parse(raw) as Partial<SidebarNavState>;
    return {
      recent: Array.isArray(value.recent) ? value.recent.filter((tab): tab is ToolsTab => typeof tab === 'string') : [],
      iconsOpen: value.iconsOpen !== false,
    };
  } catch {
    return { recent: [], iconsOpen: true };
  }
}

export function saveSidebarNav(storage: Pick<Storage, 'setItem'>, state: SidebarNavState) {
  storage.setItem(SIDEBAR_NAV_KEY, JSON.stringify(state));
}
