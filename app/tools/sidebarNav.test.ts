import { describe, expect, it } from 'vitest';
import { loadSidebarNav, SIDEBAR_NAV_KEY } from './sidebarNav';

function storageWith(entries: Record<string, string>) {
  const store = new Map(Object.entries(entries));
  return { getItem: (key: string) => store.get(key) ?? null, setItem: (key: string, value: string) => { store.set(key, value); } };
}

describe('Sidebar navigation', () => {
  it('loads valid state and falls back on corrupt storage', () => {
    expect(loadSidebarNav(storageWith({ [SIDEBAR_NAV_KEY]: JSON.stringify({ iconsOpen: false }) }))).toEqual({ iconsOpen: false, iconPack: 'phosphor-solid' });
    expect(loadSidebarNav(storageWith({}))).toEqual({ iconsOpen: true, iconPack: 'phosphor-solid' });
    expect(loadSidebarNav(storageWith({ [SIDEBAR_NAV_KEY]: '{broken' }))).toEqual({ iconsOpen: true, iconPack: 'phosphor-solid' });
    expect(loadSidebarNav(storageWith({ [SIDEBAR_NAV_KEY]: JSON.stringify({ iconsOpen: 'yes' }) }))).toEqual({ iconsOpen: true, iconPack: 'phosphor-solid' });
  });

  it('ignores a recency list left by an older version (order is fixed now)', () => {
    expect(loadSidebarNav(storageWith({ [SIDEBAR_NAV_KEY]: JSON.stringify({ recent: ['loans'], iconsOpen: false }) }))).toEqual({ iconsOpen: false, iconPack: 'phosphor-solid' });
  });

  it('remembers the chosen icon pack and ignores one it does not know', () => {
    expect(loadSidebarNav(storageWith({ [SIDEBAR_NAV_KEY]: JSON.stringify({ iconPack: 'tabler' }) })).iconPack).toBe('tabler');
    expect(loadSidebarNav(storageWith({ [SIDEBAR_NAV_KEY]: JSON.stringify({ iconPack: 'phosphor-regular' }) })).iconPack).toBe('phosphor-solid');
  });
});
