// app/ppe/useOrderList.ts — the PPE order list: the due or expiring items someone has flagged to order, shared by everyone who signs in.
// It lives on the server (`/api/ppe-order-list`, table `ppe_order_list`), so a colleague on another computer sees the same list and a
// cleared browser does not lose it. Reads keep loading through a slow service; a failed read is an error, never an empty list. Changes
// show at once and are undone (with the reason) if the server refuses them. A list kept in this browser before the move is added to the
// shared list once, then removed from the browser.
'use client';

import { useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/apiClient';
import { useApiList } from '@/lib/useApiList';
import { orderEntryFulfilled, type OrderListEntry } from './calcPPE';

const PATH = '/api/ppe-order-list';
const LOCAL_KEY = 'oz_ppe_order_list';

function readLocal(): OrderListEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = JSON.parse(localStorage.getItem(LOCAL_KEY) ?? '[]');
    return Array.isArray(raw) ? raw.filter((e): e is OrderListEntry => !!e && typeof e === 'object' && typeof (e as OrderListEntry).record_id === 'string') : [];
  } catch { return []; }
}
const clearLocal = () => { try { localStorage.removeItem(LOCAL_KEY); } catch { /* storage unavailable */ } };

export function useOrderList() {
  const list = useApiList<OrderListEntry>(PATH);
  const entries = list.items;
  const latest = useRef(entries);
  useEffect(() => { latest.current = entries; });
  const { setItems, refetch } = list;

  // Move what this browser held before the list was shared (adding is idempotent, so a second run adds nothing).
  const movedRef = useRef(false);
  useEffect(() => {
    if (!list.loaded || movedRef.current) return;
    movedRef.current = true;
    const local = readLocal();
    if (local.length === 0) { clearLocal(); return; }
    api.post<{ added: number }>(PATH, { entries: local })
      .then(result => { clearLocal(); void refetch(); if (result.added > 0) toast.success(`${result.added} ${result.added === 1 ? 'item' : 'items'} from this browser added to the shared order list.`); })
      .catch(() => { movedRef.current = false; /* kept in the browser; tried again on the next visit */ });
  }, [list.loaded, refetch]);

  /** Apply a change on screen at once, send it, and put the list back as the server has it if the server refuses. */
  const change = useCallback((apply: (prev: OrderListEntry[]) => OrderListEntry[], send: () => Promise<unknown>) => {
    setItems(apply);
    send().catch(error => { toast.error(`The order list was not changed: ${error instanceof Error ? error.message : 'the server did not accept it.'}`); void refetch(); });
  }, [setItems, refetch]);

  // record_id uniqueness: clicking "Add to order list" twice on the same item must not double it up in the exported quantities.
  const addMany = useCallback((toAdd: OrderListEntry[]) => {
    const existing = new Set(latest.current.map(e => e.record_id));
    const now = new Date().toISOString();
    const fresh = toAdd.filter((e, i) => !existing.has(e.record_id) && toAdd.findIndex(x => x.record_id === e.record_id) === i).map(e => ({ ...e, added_at: e.added_at ?? now }));
    if (fresh.length === 0) return;
    change(prev => [...prev, ...fresh], () => api.post(PATH, { entries: fresh }));
  }, [change]);

  const removeMany = useCallback((recordIds: string[]) => {
    const ids = new Set(recordIds);
    if (!latest.current.some(e => ids.has(e.record_id))) return;
    change(prev => prev.filter(e => !ids.has(e.record_id)), () => api.post(`${PATH}/remove`, { record_ids: [...ids] }));
  }, [change]);

  const remove = useCallback((recordId: string) => removeMany([recordId]), [removeMany]);

  /** Drop order lines fulfilled by a newly issued item (same employee + type + size). */
  const removeFulfilled = useCallback((employeeId: string, ppeType: string, size: string) => {
    removeMany(latest.current.filter(e => orderEntryFulfilled(e, employeeId, ppeType, size)).map(e => e.record_id));
  }, [removeMany]);

  const clear = useCallback(() => {
    if (latest.current.length === 0) return;
    change(() => [], () => api.delete(PATH));
  }, [change]);

  const has = useCallback((recordId: string) => entries.some(e => e.record_id === recordId), [entries]);

  return { entries, addMany, remove, removeMany, removeFulfilled, clear, has, loading: list.loading, loaded: list.loaded, error: list.error, errorStatus: list.errorStatus, refetch };
}
