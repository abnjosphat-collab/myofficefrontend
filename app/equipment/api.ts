// app/equipment/api.ts — the equipment register's data-fetching layer: plain exported
// functions only, no hook. Split out of page.tsx as part of the standing "decompose on
// touch" convention. page.tsx's own `fetchEquipment` orchestration also eagerly
// resyncs the page-local `filtered` list in the same tick as `equipment` (a deliberate,
// slightly unusual coupling to avoid a stale-filter flash) — that orchestration, plus
// all of equipment/filtered/loading/error state, stays in page.tsx exactly as before;
// only the raw API calls move here, matching spares.tsx's "independent load shape"
// precedent rather than a ppe-style hook.
'use client';

import { api } from '@/lib/apiClient';
import type { EquipmentItem } from './types';

export async function fetchEquipmentList(): Promise<EquipmentItem[]> {
  return api.get<EquipmentItem[]>('/api/equipment');
}
export async function createEquipment(body: Record<string, unknown>): Promise<EquipmentItem> {
  return api.post<EquipmentItem>('/api/equipment', body);
}
export async function updateEquipment(id: number | string, body: Record<string, unknown>): Promise<EquipmentItem> {
  return api.put<EquipmentItem>(`/api/equipment/${id}`, body);
}
export async function deleteEquipment(id: number | string): Promise<void> {
  await api.delete(`/api/equipment/${id}`);
}
