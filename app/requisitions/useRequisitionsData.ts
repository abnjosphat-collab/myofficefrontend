// app/requisitions/useRequisitionsData.ts — the requisitions page's data-fetching
// layer: the backend<->frontend shape converter, record CRUD, and the list hook. Writes throw so the form dialog can show the reason (for example a duplicate
// requisition number); a failed load is reported through useApiList, never shown as an empty list.
// The list route takes no limit or offset, so it cannot be paged: it returns whatever the database's own
// row cap (1000) allows.
'use client';

import { api } from '@/lib/apiClient';
import { useApiList } from '@/lib/useApiList';
import type { Requisition } from './types';

export function fromBackend(d: Record<string, unknown>): Requisition {
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
  const list = useApiList<Record<string, unknown>, Requisition>('/api/requisitions', fromBackend);
  return { reqs: list.items, loading: list.loading, loaded: list.loaded, error: list.error, errorStatus: list.errorStatus, refetch: list.refetch };
}
