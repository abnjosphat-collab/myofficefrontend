// app/overtime/useOvertimeData.ts — the overtime page's data-fetching layer: record CRUD,
// the fast-path/exact-times payload builder, and a hook owning the record list plus its
// loading/refreshing flag pair. Split out of page.tsx as part of the standing "decompose
// on touch" convention. One resource, one load(quiet) cycle — same shape as sheq_inspection.
'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/apiClient';
import { toast } from 'sonner';
import type { OTRecord, OTForm } from './types';

export async function fetchOT(): Promise<OTRecord[]> {
  const data = await api.get<OTRecord[]>('/api/overtime');
  return (Array.isArray(data) ? data : []) as OTRecord[];
}

/** `useHours`: send `hours` and omit start/end (the fast path); otherwise send
 *  start/end and omit hours — never both, matching the backend's either/or validator. */
export function buildOvertimePayload(form: OTForm, useHours: boolean) {
  const { start_time, end_time, hours, ...rest } = form;
  return useHours
    ? { ...rest, hours: parseFloat(hours) || undefined }
    : { ...rest, start_time, end_time };
}

export async function createOT(body: Record<string, unknown>): Promise<OTRecord> {
  return api.post<OTRecord>('/api/overtime', { ...body, status: 'pending', applied_date: new Date().toISOString() });
}
export async function updateOT(id: number | string, body: object): Promise<OTRecord> {
  return api.patch<OTRecord>(`/api/overtime/${id}`, body);
}
export async function deleteOT(id: number | string): Promise<void> {
  await api.delete(`/api/overtime/${id}`);
}

/** On-demand — the frontend sends whatever it currently has filtered, so analysis is
 *  automatically scoped to whatever dates/status/type/employee(s) are selected. Mirrors
 *  app/sheq/useSheqDashboardData.ts's postSafetyAnalysis: a separate export, not part of
 *  the load cycle, since it's a manually-triggered action with its own result/loading
 *  state in the component. */
export async function postOvertimeAnalysis(payload: Record<string, unknown>): Promise<Record<string, any>> {
  return api.post('/api/overtime/analyze', payload);
}

export function useOvertimeData() {
  const [records, setRecords] = useState<OTRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true); else setRefreshing(true);
    try { setRecords(await fetchOT()); }
    catch (e) { toast.error(`Load failed: ${(e as Error).message}`); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { records, setRecords, loading, refreshing, refresh: load };
}
