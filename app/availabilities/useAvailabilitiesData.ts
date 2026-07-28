// app/availabilities/useAvailabilitiesData.ts — the availability tracker's data-fetching
// layer. Split out of page.tsx as part of the standing "decompose on touch" convention.
// One unified load cycle: equipment + breakdown-derived records + manual records fetch
// together under one loading/refreshing flag pair, then merge (manual entries win over
// an auto-derived breakdown entry for the same equipment+date) — ppe-shaped hook.
'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/apiClient';
import type { Equipment, AvailRecord } from './types';

export async function fetchEquipment(): Promise<Equipment[]> {
  return api.get<Equipment[]>('/api/equipment');
}
/** `query` scopes the breakdown-derived records (used by the form's prefill lookup);
 *  omitted, it returns every breakdown-derived record (used by the page's main load). */
export async function fetchBreakdownRecords(query?: string): Promise<AvailRecord[]> {
  return api.get<AvailRecord[]>(`/api/availability-records/from-breakdowns${query ? `?${query}` : ''}`);
}
export async function fetchManualRecords(): Promise<AvailRecord[]> {
  return api.get<AvailRecord[]>('/api/availability-records');
}
export async function createAvailabilityRecord(payload: Record<string, unknown>): Promise<AvailRecord> {
  return api.post<AvailRecord>('/api/availability-records', payload);
}
export async function updateAvailabilityRecord(id: number | string, payload: Record<string, unknown>): Promise<AvailRecord> {
  return api.put<AvailRecord>(`/api/availability-records/${id}`, payload);
}
export async function deleteAvailabilityRecord(id: number | string): Promise<void> {
  await api.delete(`/api/availability-records/${id}`);
}

export function useAvailabilitiesData() {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [records, setRecords] = useState<AvailRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAll = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    setRefreshing(true);
    try {
      const [eqData, bdRecords, manualRecords] = await Promise.all([
        fetchEquipment().catch(() => null),
        fetchBreakdownRecords().catch(() => [] as AvailRecord[]),
        fetchManualRecords().catch(() => [] as AvailRecord[]),
      ]);
      if (eqData) setEquipment(eqData);

      const manualKeys = new Set(manualRecords.map(r => `${r.equipment_id}_${r.date}`));
      const merged = [
        ...manualRecords,
        ...bdRecords.filter(r => !manualKeys.has(`${r.equipment_id}_${r.date}`)),
      ];
      setRecords(merged);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  return { equipment, records, loading, refreshing, refresh: fetchAll };
}
