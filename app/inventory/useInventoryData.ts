// app/inventory/useInventoryData.ts — the inventory register's data layer: the `inventory_items` table through
// /api/inventory/items, shared by everyone. Until 2026-10-09 items lived only in each browser's localStorage;
// on its first load after that change a browser moves its local items up once (oldest browser data is kept
// intact until each item has been saved on the server), then forgets them.
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/apiClient';
import { useApiList } from '@/lib/useApiList';
import type { InventoryItem } from './types';

export const INVENTORY_STORAGE_KEY = 'inventory-items';
const API = '/api/inventory/items';

/** The fields a person edits; id, status and timestamps come from the server. */
export type InventoryDraft = Pick<InventoryItem, 'name' | 'sku' | 'category' | 'description' | 'currentStock' | 'minStock' | 'maxStock' | 'unit' | 'cost' | 'supplier' | 'location'>;

/** Reads a browser's old local list (for the one-time move up); anything malformed is ignored. */
export function parseInventory(raw: string): InventoryItem[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(item => item && typeof item === 'object' && typeof item.id === 'string') : [];
  } catch { return []; }
}

export const stockStatus = (item: Pick<InventoryItem, 'currentStock' | 'minStock'>): 'in-stock' | 'low-stock' | 'out-of-stock' =>
  item.currentStock <= 0 ? 'out-of-stock' : item.currentStock <= item.minStock ? 'low-stock' : 'in-stock';

const draftOf = (item: InventoryItem): InventoryDraft & { lastRestocked?: string } => ({
  name: item.name ?? '', sku: item.sku ?? '', category: item.category ?? '', description: item.description ?? '',
  currentStock: Number(item.currentStock) || 0, minStock: Number(item.minStock) || 0, maxStock: Number(item.maxStock) || 0,
  unit: item.unit ?? '', cost: Number(item.cost) || 0, supplier: item.supplier ?? '', location: item.location ?? '',
  ...(item.lastRestocked ? { lastRestocked: item.lastRestocked } : {}),
});

const readLocal = () => { try { return parseInventory(window.localStorage.getItem(INVENTORY_STORAGE_KEY) ?? ''); } catch { return []; } };
const writeLocal = (items: InventoryItem[]) => {
  try { if (items.length) window.localStorage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify(items)); else window.localStorage.removeItem(INVENTORY_STORAGE_KEY); } catch { /* blocked storage: nothing to move */ }
};

export function useInventoryData() {
  const list = useApiList<InventoryItem>(API);
  const [moving, setMoving] = useState(false);
  const moved = useRef(false);

  // One-time move of this browser's old local items to the shared register. Each item is removed from the
  // browser only after the server has saved it, so a failure part-way loses nothing and retries next visit.
  useEffect(() => {
    if (!list.loaded || moved.current) return;
    moved.current = true;
    const local = readLocal();
    if (!local.length) return;
    let cancelled = false;
    (async () => {
      setMoving(true);
      let left = [...local];
      for (const item of local) {
        if (cancelled) break;
        try { await api.post(API, draftOf(item)); left = left.filter(i => i.id !== item.id); writeLocal(left); }
        catch { break; }
      }
      const done = local.length - left.length;
      if (done > 0) toast.success(`${done} ${done === 1 ? 'item' : 'items'} from this browser ${done === 1 ? 'was' : 'were'} added to the shared inventory.`);
      if (left.length) toast.error(`${left.length} ${left.length === 1 ? 'item' : 'items'} from this browser could not be moved yet; they will be tried again next visit.`);
      setMoving(false);
      if (done > 0) await list.refetch();
    })();
    return () => { cancelled = true; };
  }, [list.loaded]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Creates or updates an item; throws with the server's reason so the form can show it. */
  const saveItem = useCallback(async (draft: InventoryDraft, id?: string) => {
    if (id) await api.put(`${API}/${encodeURIComponent(id)}`, draft);
    else await api.post(API, draft);
    await list.refetch();
  }, [list]);

  const deleteItem = useCallback(async (id: string) => { await api.delete(`${API}/${encodeURIComponent(id)}`); }, []);

  return { list, inventory: list.items, moving, saveItem, deleteItem };
}
