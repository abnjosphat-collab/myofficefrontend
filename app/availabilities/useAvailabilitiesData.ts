// app/availabilities/useAvailabilitiesData.ts — the availability tracker's data layer. Three sources load on their own
// and report their own failure (they used to be swallowed into empty lists): the manual records (required: without them
// the register would be incomplete), the breakdown-derived records and the equipment list (each degrades with a notice).
// A manual entry wins over a breakdown-derived one for the same equipment and date.
'use client';

import { useCallback, useMemo } from 'react';
import { api } from '@/lib/apiClient';
import { useApiList } from '@/lib/useApiList';
import type { AvailRecord, Equipment } from './types';

/** `query` scopes the breakdown-derived records (the form's prefill lookup). */
export async function fetchBreakdownRecords(query?: string): Promise<AvailRecord[]> {
  return api.get<AvailRecord[]>(`/api/availability-records/from-breakdowns${query ? `?${query}` : ''}`);
}
export const createAvailabilityRecord = (payload: Record<string, unknown>) => api.post<AvailRecord>('/api/availability-records', payload);
export const updateAvailabilityRecord = (id: number | string, payload: Record<string, unknown>) => api.put<AvailRecord>(`/api/availability-records/${id}`, payload);
export const deleteAvailabilityRecord = async (id: number | string) => { await api.delete(`/api/availability-records/${id}`); };

/** Derived records only for equipment+date pairs with no manual record; newest day first. */
export function mergeRecords(manual: AvailRecord[], derived: AvailRecord[]): AvailRecord[] {
  const keys = new Set(manual.map(r => `${r.equipment_id}_${r.date}`));
  return [...manual, ...derived.filter(r => !keys.has(`${r.equipment_id}_${r.date}`))].sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

export function useAvailabilitiesData() {
  const manual = useApiList<AvailRecord>('/api/availability-records');
  const derived = useApiList<AvailRecord>('/api/availability-records/from-breakdowns');
  const equipment = useApiList<Equipment>('/api/equipment');
  const records = useMemo(() => mergeRecords(manual.items, derived.items), [manual.items, derived.items]);
  const refresh = useCallback(async () => { await Promise.all([manual.refetch(), derived.refetch(), equipment.refetch()]); }, [manual, derived, equipment]);
  return { manual, derived, equipment, records, refresh };
}
