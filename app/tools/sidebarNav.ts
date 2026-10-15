export const SIDEBAR_NAV_KEY = 'myoffice.tools.sidebar.v1';

// The sidebar keeps its fixed tab order and the universal icon set — the old per-device icon-pack choice
// was removed, and a stored `iconPack` (or a `recent` list from an older version) is ignored.
export type SidebarNavState = { iconsOpen: boolean };

export function loadSidebarNav(storage: Pick<Storage, 'getItem'>): SidebarNavState {
  try {
    const raw = storage.getItem(SIDEBAR_NAV_KEY);
    if (!raw) return { iconsOpen: true };
    const value = JSON.parse(raw) as Partial<SidebarNavState>;
    return { iconsOpen: value.iconsOpen !== false };
  } catch {
    return { iconsOpen: true };
  }
}

export function saveSidebarNav(storage: Pick<Storage, 'setItem'>, state: SidebarNavState) {
  storage.setItem(SIDEBAR_NAV_KEY, JSON.stringify(state));
}
