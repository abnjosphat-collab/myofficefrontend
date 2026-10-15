import { describe, expect, it } from 'vitest';
import { loadSidebarNav, SIDEBAR_NAV_KEY } from './sidebarNav';

function storageWith(entries: Record<string, string>) {
  const store = new Map(Object.entries(entries));
  return { getItem: (key: string) => store.get(key) ?? null, setItem: (key: string, value: string) => { store.set(key, value); } };
}

describe('Sidebar navigation', () => {
  it('loads valid state and falls back on corrupt storage', () => {
    expect(loadSidebarNav(storageWith({ [SIDEBAR_NAV_KEY]: JSON.stringify({ iconsOpen: false }) }))).toEqual({ iconsOpen: false });
    expect(loadSidebarNav(storageWith({}))).toEqual({ iconsOpen: true });
    expect(loadSidebarNav(storageWith({ [SIDEBAR_NAV_KEY]: '{broken' }))).toEqual({ iconsOpen: true });
    expect(loadSidebarNav(storageWith({ [SIDEBAR_NAV_KEY]: JSON.stringify({ iconsOpen: 'yes' }) }))).toEqual({ iconsOpen: true });
  });

  it('ignores a recency list and an icon pack left by older versions', () => {
    expect(loadSidebarNav(storageWith({ [SIDEBAR_NAV_KEY]: JSON.stringify({ recent: ['loans'], iconsOpen: false }) }))).toEqual({ iconsOpen: false });
    expect(loadSidebarNav(storageWith({ [SIDEBAR_NAV_KEY]: JSON.stringify({ iconsOpen: true, iconPack: 'tabler' }) }))).toEqual({ iconsOpen: true });
  });
});
