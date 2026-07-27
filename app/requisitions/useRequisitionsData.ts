// app/requisitions/useRequisitionsData.ts — the requisitions page's data-fetching
// layer: the backend<->frontend shape converter, record CRUD, and a hook owning the
// list plus its loading/refreshing flag pair. Split out of page.tsx as part of the
// standing "decompose on touch" convention. One resource, one load cycle — same
// load(quiet) shape as sheq_inspection.
'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/apiClient';
import { toast } from 'sonner';
import type { Requisition } from './types';

function fromBackend(d: Record<string, unknown>): Requisition {
  return {
    id: String(d.id),
    date: String(d.date ?? ''),
    requester: String(d.requester ?? ''),
    section: (d.section as Requisition['section']) ?? 'Mechanical',
    required_for: String(d.required_for ?? ''),
    priority: (d.priority as Requisition['priority']) ?? 'Medium',
    status: (d.status as Requisition['status']) ?? 'Draft',
    requisitionNumber: String(d.requisition_number ?? ''),
    notes: String(d.notes ?? ''),
    items: ((d.requisition_items ?? []) as Record<string, unknown>[]).map(i => ({
      description: String(i.description ?? ''),
      costPerUnit: Number(i.cost_per_unit ?? 0),
      quantity: Number(i.quantity ?? 1),
      reason: String(i.reason ?? ''),
    })),
    lineNumber: Number(d.line_number ?? 0),
    createdAt: String(d.created_at ?? ''),
    updatedAt: String(d.updated_at ?? ''),
  };
}

export async function apiGet(): Promise<Requisition[]> {
  const data = await api.get<unknown[]>('/api/requisitions');
  return (Array.isArray(data) ? data : []).map(d => fromBackend(d as Record<string, unknown>));
}
export async function apiCreate(body: object): Promise<Requisition> {
  return fromBackend(await api.post<Record<string, unknown>>('/api/requisitions', body));
}
export async function apiUpdate(id: string, body: object): Promise<Requisition> {
  return fromBackend(await api.patch<Record<string, unknown>>(`/api/requisitions/${id}`, body));
}
export async function apiDelete(id: string): Promise<void> {
  await api.delete(`/api/requisitions/${id}`);
}

export function useRequisitionsData() {
  const [reqs, setReqs] = useState<Requisition[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true); else setRefreshing(true);
    try { setReqs(await apiGet()); }
    catch (e) { toast.error(`Load failed: ${(e as Error).message}`); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { reqs, setReqs, loading, refreshing, refresh: load };
}
