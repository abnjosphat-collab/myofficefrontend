// app/maintenance/savedViews.ts — the work order list's filters, the built-in views (Mine, Overdue, Unassigned, Open breakdowns) and
// the views a person saves. Saved views live in this browser only (a per-viewer convenience: storage can be missing or blocked, so every
// read and write is guarded and the page works without it). Shared views would need a table; see the plan, question Q9.
'use client';

import { useCallback, useEffect, useState } from 'react';
import type { WOClassification, WorkOrderPriority, WorkOrderStatus } from './types';

export interface FlowFilters {
  search: string;
  status: 'all' | WorkOrderStatus | 'overdue' | 'awaiting-signoff';
  priorities: WorkOrderPriority[];
  classification: 'all' | WOClassification;
  section: string;
  assignee: 'all' | 'me' | 'unassigned';
  sort: 'due' | 'priority' | 'number';
}
export const NO_FLOW_FILTERS: FlowFilters = { search: '', status: 'all', priorities: [], classification: 'all', section: '', assignee: 'all', sort: 'due' };

export interface SavedView { id: string; name: string; filters: FlowFilters; builtin?: boolean }
export const PRESET_VIEWS: SavedView[] = [
  { id: 'mine', name: 'Mine', builtin: true, filters: { ...NO_FLOW_FILTERS, assignee: 'me' } },
  { id: 'overdue', name: 'Overdue', builtin: true, filters: { ...NO_FLOW_FILTERS, status: 'overdue' } },
  { id: 'unassigned', name: 'Unassigned', builtin: true, filters: { ...NO_FLOW_FILTERS, assignee: 'unassigned' } },
  { id: 'breakdowns', name: 'Open breakdowns', builtin: true, filters: { ...NO_FLOW_FILTERS, classification: 'breakdown', status: 'in-progress' } },
];

const KEY = 'maintenance_saved_views_v1';
const read = (): SavedView[] => {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(raw) ? raw.filter((v): v is SavedView => !!v && typeof v.id === 'string' && typeof v.name === 'string' && !!v.filters) : [];
  } catch { return []; }
};
const write = (views: SavedView[]) => { try { localStorage.setItem(KEY, JSON.stringify(views)); } catch { /* a convenience: the view lasts until reload */ } };

export function useSavedViews() {
  const [saved, setSaved] = useState<SavedView[]>([]);
  // Read after mount: storage does not exist on the server, so reading during render would not match the first client render.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setSaved(read()); }, []);
  const save = useCallback((name: string, filters: FlowFilters) => {
    setSaved(prev => { const next = [...prev.filter(v => v.name.toLowerCase() !== name.toLowerCase()), { id: `v${Date.now()}`, name, filters }]; write(next); return next; });
  }, []);
  const remove = useCallback((id: string) => { setSaved(prev => { const next = prev.filter(v => v.id !== id); write(next); return next; }); }, []);
  return { views: [...PRESET_VIEWS, ...saved], save, remove };
}
