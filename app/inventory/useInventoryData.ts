// app/inventory/useInventoryData.ts — the inventory register's storage layer. There is no inventory
// service behind this page: items live in this browser's localStorage only (the page says so). No sample
// items are seeded; an empty register is shown as empty. Stored via useSyncExternalStore so every tab and
// component sees the same list.
'use client';

import { useCallback, useMemo, useSyncExternalStore } from 'react';
import type { InventoryItem } from './types';

export const INVENTORY_STORAGE_KEY = 'inventory-items';
const CHANGE_EVENT = 'mo-inventory-changed';

const subscribe = (notify: () => void) => {
  window.addEventListener(CHANGE_EVENT, notify);
  window.addEventListener('storage', notify);
  return () => { window.removeEventListener(CHANGE_EVENT, notify); window.removeEventListener('storage', notify); };
};
const readRaw = () => { try { return window.localStorage.getItem(INVENTORY_STORAGE_KEY) ?? ''; } catch { return ''; } };

export function parseInventory(raw: string): InventoryItem[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(item => item && typeof item === 'object' && typeof item.id === 'string') : [];
  } catch { return []; }
}

export const stockStatus = (item: Pick<InventoryItem, 'currentStock' | 'minStock'>): 'in-stock' | 'low-stock' | 'out-of-stock' =>
  item.currentStock <= 0 ? 'out-of-stock' : item.currentStock <= item.minStock ? 'low-stock' : 'in-stock';

export function useInventoryData() {
  const raw = useSyncExternalStore(subscribe, readRaw, () => '');
  const inventory = useMemo(() => parseInventory(raw), [raw]);

  /** Persist the list. Throws when the browser refuses to store it, so callers can tell the user instead of losing the change. */
  const save = useCallback((items: InventoryItem[]) => {
    try { window.localStorage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify(items)); }
    catch { throw new Error('This browser could not save the inventory (storage is full or blocked).'); }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  const upsertItem = useCallback((item: InventoryItem) => {
    const current = parseInventory(readRaw());
    save(current.some(i => i.id === item.id) ? current.map(i => (i.id === item.id ? item : i)) : [...current, item]);
  }, [save]);

  const deleteItem = useCallback((id: string) => save(parseInventory(readRaw()).filter(i => i.id !== id)), [save]);

  return { inventory, upsertItem, deleteItem };
}
