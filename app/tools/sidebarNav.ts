export const SIDEBAR_NAV_KEY = 'myoffice.tools.sidebar.v1';
/** The looks the sidebar icons can take; the choice is made in Settings. */
export const ICON_PACKS = [
  { id: 'phosphor-solid', label: 'Phosphor Solid' },
  { id: 'tabler', label: 'Tabler' },
] as const;
export type IconPackId = typeof ICON_PACKS[number]['id'];
export const DEFAULT_ICON_PACK: IconPackId = 'phosphor-solid';
export const isIconPack = (value: unknown): value is IconPackId => ICON_PACKS.some(pack => pack.id === value);

// G3: the sidebar keeps its fixed tab order — recency reordering moved destinations
// under the pointer. A `recent` list left in storage by an older version is ignored.
export type SidebarNavState = { iconsOpen: boolean; iconPack: IconPackId };

export function loadSidebarNav(storage: Pick<Storage, 'getItem'>): SidebarNavState {
  try {
    const raw = storage.getItem(SIDEBAR_NAV_KEY);
    if (!raw) return { iconsOpen: true, iconPack: DEFAULT_ICON_PACK };
    const value = JSON.parse(raw) as Partial<SidebarNavState>;
    return {
      iconsOpen: value.iconsOpen !== false,
      iconPack: isIconPack(value.iconPack) ? value.iconPack : DEFAULT_ICON_PACK,
    };
  } catch {
    return { iconsOpen: true, iconPack: DEFAULT_ICON_PACK };
  }
}

export function saveSidebarNav(storage: Pick<Storage, 'setItem'>, state: SidebarNavState) {
  storage.setItem(SIDEBAR_NAV_KEY, JSON.stringify(state));
}
