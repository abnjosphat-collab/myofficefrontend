import { describe, expect, it } from 'vitest';
import { loadSidebarNav, rankTabs, recordTabUse, SIDEBAR_NAV_KEY } from './sidebarNav';
import type { ToolsTab } from './toolSelectors';

const tabs = [
  { value: 'homepage' as ToolsTab, label: 'Homepage' },
  { value: 'register' as ToolsTab, label: 'Equipment' },
  { value: 'loans' as ToolsTab, label: 'In use' },
  { value: 'activity' as ToolsTab, label: 'History' },
];

function storageWith(entries: Record<string, string>) {
  const store = new Map(Object.entries(entries));
  return { getItem: (key: string) => store.get(key) ?? null, setItem: (key: string, value: string) => { store.set(key, value); } };
}

describe('Sidebar navigation', () => {
  it('excludes the current tab and orders the rest by recency', () => {
    expect(rankTabs(tabs, 'register', ['activity', 'homepage']).map(tab => tab.value)).toEqual(['activity', 'homepage', 'loans']);
  });

  it('keeps default order with no history and never drops tabs', () => {
    const ranked = rankTabs(tabs, 'homepage', []);
    expect(ranked.map(tab => tab.value)).toEqual(['register', 'loans', 'activity']);
    expect(new Set(['homepage', ...ranked.map(tab => tab.value)]).size).toBe(tabs.length);
  });

  it('ignores unknown recency entries', () => {
    expect(rankTabs(tabs, 'loans', ['unknown' as ToolsTab, 'register']).map(tab => tab.value)).toEqual(['register', 'homepage', 'activity']);
  });

  it('records use most-recent-first without duplicates', () => {
    expect(recordTabUse(['register', 'loans'], 'loans')).toEqual(['loans', 'register']);
    expect(recordTabUse(['a' as ToolsTab], 'b' as ToolsTab, 1)).toEqual(['b']);
  });

  it('loads valid state and falls back on corrupt storage', () => {
    expect(loadSidebarNav(storageWith({ [SIDEBAR_NAV_KEY]: JSON.stringify({ recent: ['loans'], iconsOpen: false }) }))).toEqual({ recent: ['loans'], iconsOpen: false, iconPack: 'phosphor-solid' });
    expect(loadSidebarNav(storageWith({}))).toEqual({ recent: [], iconsOpen: true, iconPack: 'phosphor-solid' });
    expect(loadSidebarNav(storageWith({ [SIDEBAR_NAV_KEY]: '{broken' }))).toEqual({ recent: [], iconsOpen: true, iconPack: 'phosphor-solid' });
    expect(loadSidebarNav(storageWith({ [SIDEBAR_NAV_KEY]: JSON.stringify({ recent: ['loans', 42], iconsOpen: 'yes' }) }))).toEqual({ recent: ['loans'], iconsOpen: true, iconPack: 'phosphor-solid' });
  });

  it('remembers the chosen icon pack and ignores one it does not know', () => {
    expect(loadSidebarNav(storageWith({ [SIDEBAR_NAV_KEY]: JSON.stringify({ iconPack: 'tabler' }) })).iconPack).toBe('tabler');
    expect(loadSidebarNav(storageWith({ [SIDEBAR_NAV_KEY]: JSON.stringify({ iconPack: 'phosphor-regular' }) })).iconPack).toBe('phosphor-solid');
  });
});
