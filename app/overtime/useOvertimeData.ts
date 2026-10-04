// app/overtime/useOvertimeData.ts — the overtime page's data layer: the register read (timeout and one retry, honest load state),
// the writes (they throw, so a dialog shows the reason and keeps what was typed), the payload builder and the server analysis.
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/apiClient';
import { useApiList } from '@/lib/useApiList';
import type { OTAnalysisResult, OTRecord, OTForm } from './types';

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

/** `useHours`: send `hours` and omit start/end (the fast path); otherwise send start/end and omit hours, never both, matching the
 *  backend's either/or validator. When EDITING, the other pair is sent as null: the server only changes what it is sent, so a record
 *  switched from hours to times would otherwise keep its old hours, and those win over the times everywhere. */
export function buildOvertimePayload(form: OTForm, useHours: boolean, editing = false) {
  const { start_time, end_time, hours, ...rest } = form;
  return useHours
    ? { ...rest, hours: parseFloat(hours) || undefined, ...(editing ? { start_time: null, end_time: null } : {}) }
    : { ...rest, start_time, end_time, ...(editing ? { hours: null } : {}) };
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
export async function postOvertimeAnalysis(payload: Record<string, unknown>): Promise<OTAnalysisResult> {
  return api.post<OTAnalysisResult>('/api/overtime/analyze', payload);
}

const fetchRegister = () => fetchOT();
/** The register, with honest load state: a failed load is an error with the rows already shown kept, never an empty list. */
export const useOvertime = () => useApiList<OTRecord>('/api/overtime', undefined, { fetcher: fetchRegister });

/** The server's analysis of whatever is currently filtered, re-run about half a second after the selection settles. */
export function useOvertimeAnalysis(records: OTRecord[], enabled: boolean) {
  const [result, setResult] = useState<OTAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const latest = useRef(0);
  const hadResult = useRef(false);
  const run = useCallback(async (recs: OTRecord[]) => {
    const id = ++latest.current;
    setError(null);
    if (hadResult.current) setUpdating(true); else setLoading(true);
    try {
      const r = await postOvertimeAnalysis({ records: recs, period_label: 'current selection' });
      if (id === latest.current) { setResult(r); hadResult.current = true; }
    } catch (e) { if (id === latest.current) setError(e instanceof Error ? e.message : 'The analysis failed.'); }
    finally { if (id === latest.current) { setLoading(false); setUpdating(false); } }
  }, []);
  useEffect(() => {
    if (!enabled) return;
    const timer = setTimeout(() => { void run(records); }, 500);
    return () => clearTimeout(timer);
  }, [records, enabled, run]);
  return { result, loading, updating, error, refresh: () => run(records) };
}
