// app/ppe/useOrderList.ts — a browser-local "cart" of due/expiring PPE items someone
// has flagged to actually order. Deliberately not a backend record: this is a staging
// list for building one purchase-order summary/export, matching how PredictiveInput's
// history persists per-browser rather than server-side (see components/shared/
// PredictiveInput.tsx). Split out of page.tsx to keep the persistence + add/remove/
// dedupe logic testable and out of the render tree.
'use client';

import { useCallback, useEffect, useState } from 'react';
import type { OrderListEntry } from './calcPPE';

const STORAGE_KEY = 'oz_ppe_order_list';

function load(): OrderListEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    return Array.isArray(raw) ? raw : [];
  } catch { return []; }
}

export function useOrderList() {
  const [entries, setEntries] = useState<OrderListEntry[]>([]);

  // Read once on mount — see the SSR-safe-hydration note pattern already established
  // for this kind of localStorage-backed state elsewhere in the app (e.g.
  // PredictiveInput's loadHistory effect); can't read localStorage during render.
  useEffect(() => { setEntries(load()); }, []);

  const persist = useCallback((next: OrderListEntry[]) => {
    setEntries(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* storage unavailable — list still works for this session */ }
  }, []);

  // record_id uniqueness is enforced here, not in groupOrderList — clicking "Add to
  // order list" twice on the same item (or adding it from both tabs) must not double
  // it up in the exported quantities.
  const addMany = useCallback((toAdd: OrderListEntry[]) => {
    setEntries(prev => {
      const existingIds = new Set(prev.map(e => e.record_id));
      const fresh = toAdd.filter(e => !existingIds.has(e.record_id));
      const next = [...prev, ...fresh];
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* storage unavailable */ }
      return next;
    });
  }, []);

  const remove = useCallback((recordId: string) => {
    persist(entries.filter(e => e.record_id !== recordId));
  }, [entries, persist]);

  const clear = useCallback(() => persist([]), [persist]);

  const has = useCallback((recordId: string) => entries.some(e => e.record_id === recordId), [entries]);

  return { entries, addMany, remove, clear, has };
}
