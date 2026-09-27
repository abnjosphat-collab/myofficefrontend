// app/overtime/useOvertimeData.ts — the overtime page's data-fetching layer: record CRUD,
// the fast-path/exact-times payload builder, and a hook owning the record list plus its
// loading/refreshing flag pair. Split out of page.tsx as part of the standing "decompose
// on touch" convention. One resource, one load(quiet) cycle — same shape as sheq_inspection.
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/apiClient';
import { toast } from 'sonner';
import type { OTRecord, OTForm } from './types';

export async function fetchOT(timeoutMs = 20_000): Promise<OTRecord[]> {
  const requestOnce = async () => {
    const controller = new AbortController();
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      const data = await Promise.race([
        api.get<OTRecord[]>('/api/overtime', { signal: controller.signal }),
        new Promise<never>((_, reject) => {
          timeout = setTimeout(() => {
            controller.abort();
            reject(new Error('Overtime records are taking too long to load. Please retry.'));
          }, timeoutMs);
        }),
      ]);
      if (!Array.isArray(data)) throw new Error('The overtime response was invalid. Please retry.');
      return data;
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  };

  try {
    return await requestOnce();
  } catch (error) {
    const status = error && typeof error === 'object' && 'status' in error ? Number(error.status) : 0;
    const timedOut = error instanceof Error && error.message.includes('taking too long');
    if (status < 500 && !(error instanceof TypeError) && !timedOut) throw error;
    return requestOnce();
  }
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

export interface BulkOTStatusResult {
  succeeded: number;
  failed: number;
  updated: OTRecord[];
}

/** Approve or reject many pending records in one API call. */
export async function bulkUpdateOTStatus(body: {
  ids: (number | string)[];
  status: 'approved' | 'rejected';
  approved_by?: string;
  approved_at?: string;
  approval_signature?: string;
  rejected_by?: string;
  rejected_at?: string;
}): Promise<BulkOTStatusResult> {
  return api.post<BulkOTStatusResult>('/api/overtime/bulk-status', {
    ...body,
    ids: body.ids.map(id => (typeof id === 'number' ? id : parseInt(String(id), 10))).filter(n => !Number.isNaN(n)),
  });
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
  const [error, setError] = useState<string | null>(null);
  const latestLoad = useRef(0);

  const load = useCallback(async (quiet = false) => {
    const loadId = ++latestLoad.current;
    if (!quiet) setLoading(true); else setRefreshing(true);
    setError(null);
    try {
      const rows = await fetchOT();
      if (loadId === latestLoad.current) setRecords(rows);
    } catch (e) {
      if (loadId === latestLoad.current) {
        const message = e instanceof Error ? e.message : 'Could not load overtime records';
        setError(message);
        toast.error(`Load failed: ${message}`);
      }
    } finally {
      if (loadId === latestLoad.current) { setLoading(false); setRefreshing(false); }
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { records, setRecords, loading, refreshing, error, refresh: load };
}
