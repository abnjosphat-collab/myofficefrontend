// app/overtime/useOvertimeData.ts — the overtime page's data layer: the register read (timeout and one retry, honest load state),
// the writes (they throw, so a dialog shows the reason and keeps what was typed), the payload builder and the server analysis.
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api, ApiError } from '@/lib/apiClient';
import { useApiList } from '@/lib/useApiList';
import { timeoutError } from '@/lib/transientRetry';
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
            reject(timeoutError('Overtime records'));
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
/** One request for a `?open=` deep link; null when the server has no such record. */
export async function fetchOTById(id: number | string): Promise<OTRecord | null> {
  try {
    return await api.get<OTRecord>(`/api/overtime/${id}`);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
}

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
  /** The drawn signature. Who approved and when are recorded by the server from the signed-in session. */
  approval_signature?: string;
}): Promise<BulkOTStatusResult> {
  return api.post<BulkOTStatusResult>('/api/overtime/bulk-status', {
    ...body,
    ids: body.ids.map(id => (typeof id === 'number' ? id : parseInt(String(id), 10))).filter(n => !Number.isNaN(n)),
  });
}
export interface BulkOTEditResult {
  succeeded: number;
  failed: number;
  errors: string[];
  updated: OTRecord[];
}

/** Rewrite the same unlocked fields on many records in one API call. */
export async function bulkEditOT(ids: (number | string)[], patch: Record<string, unknown>): Promise<BulkOTEditResult> {
  return api.post<BulkOTEditResult>('/api/overtime/bulk-edit', {
    ids: ids.map(id => (typeof id === 'number' ? id : parseInt(String(id), 10))).filter(n => !Number.isNaN(n)),
    ...patch,
  });
}
export async function deleteOT(id: number | string): Promise<void> {
  await api.delete(`/api/overtime/${id}`);
}

export interface TakenLieuLeave { id: number; start_date: string; end_date: string; status: string }
export interface TakeLieuLeaveResult { created: boolean; leave: TakenLieuLeave }
/** Mark approved lieu overtime as taken: the server creates the approved "Leave in Lieu of Overtime" request linked to this record. Idempotent — a second call returns the existing leave instead of duplicating it. */
export async function takeLieuAsLeave(id: number | string, range: { start_date: string; end_date: string }): Promise<TakeLieuLeaveResult> {
  return api.post<TakeLieuLeaveResult>(`/api/overtime/${id}/take-as-leave`, range);
}
/** The leave a lieu record transferred into, if it has been taken yet. */
export async function fetchTakenLieuLeave(overtimeId: number | string): Promise<TakenLieuLeave | null> {
  const rows = await api.get<TakenLieuLeave[]>(`/api/leaves?overtime_id=${overtimeId}`);
  return Array.isArray(rows) && rows.length ? rows[0] : null;
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
