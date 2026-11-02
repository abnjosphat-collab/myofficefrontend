// app/ppe/usePPEData.ts — the PPE register's reads (honest load state: a failed load is an error with the rows already shown kept, never
// an empty register) and writes (they throw, so a dialog can show why). The replacement matrix has its own load state because it is
// only ever needed by the issue form and the matrix dialog.
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/apiClient';
import { retryTransient } from '@/lib/transientRetry';
import { useApiList } from '@/lib/useApiList';
import { withDepartment } from '@/lib/api';
import { normalizeDesignation } from '@/lib/employeeCatalog';
import { sanitizeDisplayName } from './calcPPE';
import { PPE_MATRIX_DEFAULTS } from './ppeMeta';
import type { EmployeeRow, FormState, PPEEvent, PPERecord, PPERequirement } from './types';

export { PPE_MATRIX_DEFAULTS };

export const fetchPPERecords = async (department?: string | null) => {
  const data = await api.get<unknown>(withDepartment('/api/ppe', department));
  if (!Array.isArray(data)) throw new Error('PPE records returned an invalid response.');
  return data as PPERecord[];
};
export const fetchPPERequirements = async (department?: string | null) => {
  const data = await api.get<unknown>(withDepartment('/api/ppe/requirements', department));
  if (!Array.isArray(data)) throw new Error('PPE requirements returned an invalid response.');
  return data as PPERequirement[];
};

/** Size requirements with derived fulfilment. Only requested where shown, so Engineering makes no new request on the Mining register. */
export function usePPERequirements(department?: string | null, enabled = true) {
  const fetcher = useCallback(() => fetchPPERequirements(department), [department]);
  return useApiList<PPERequirement>(withDepartment('/api/ppe/requirements', department), undefined, { fetcher, enabled });
}

export const fetchPPEEvents = async (department?: string | null) => {
  const data = await api.get<unknown>(withDepartment('/api/ppe/events', department));
  if (!Array.isArray(data)) throw new Error('PPE events returned an invalid response.');
  return data as PPEEvent[];
};
/** One Mining issue as the single atomic server write: the event projects the register row, so cards, the log and
 * summaries all update from the same write and a retried tap returns the stored result instead of a second row. */
export const toEventBody = (form: Pick<FormState, 'employee_id' | 'ppe_type' | 'issue_date'> & { quantity?: number }) => ({
  kind: 'issue' as const,
  employee_id: form.employee_id.trim(),
  ppe_type: form.ppe_type,
  quantity: form.quantity ?? 1,
  issue_date: form.issue_date,
  idempotency_key: typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
});
export const postPPEEvent = async (body: ReturnType<typeof toEventBody>, department?: string | null) =>
  api.post(withDepartment('/api/ppe/events', department), body);

export function usePPEEvents(department?: string | null, enabled = true) {
  const fetcher = useCallback(() => fetchPPEEvents(department), [department]);
  return useApiList<PPEEvent>(withDepartment('/api/ppe/events', department), undefined, { fetcher, enabled });
}

export const fetchAllEmployees = async (department?: string | null): Promise<EmployeeRow[]> => {
  const data = await api.get<unknown>(withDepartment('/api/employees/', department));
  if (!Array.isArray(data)) throw new Error('Personnel returned an invalid response.');
  return data.map((value: unknown) => {
    const e = value && typeof value === 'object' ? value as Record<string, unknown> : {};
    const designation = typeof e.designation === 'string' ? e.designation : '';
    return {
      employee_id: typeof e.employee_id === 'string' ? e.employee_id : '',
      employee_name: sanitizeDisplayName(`${e.first_name || ''} ${e.last_name || ''}`.trim()),
      position: normalizeDesignation(designation) || designation,
      department: typeof e.department === 'string' ? e.department : '',
      section: typeof e.section === 'string' ? e.section : '',
      archived: e.archived === true,
    };
  });
};

export function usePPERecords(department?: string | null) {
  const fetcher = useCallback(() => fetchPPERecords(department), [department]);
  return useApiList<PPERecord>(withDepartment('/api/ppe', department), undefined, { fetcher });
}
export function useRosterRows(department?: string | null) {
  const fetcher = useCallback(() => fetchAllEmployees(department), [department]);
  return useApiList<EmployeeRow>(withDepartment('/api/employees/', department), undefined, { fetcher });
}

export const createPPERecord = async (data: Partial<FormState>) => {
  if (!data.employee_id?.trim()) throw new Error('Employee ID is required');
  if (!data.employee_name?.trim()) throw new Error('Employee name is required');
  return api.post('/api/ppe', { ...data, expiry_date: data.expiry_date || null });
};
/** The server stamps the person's details from the register on create and on a move; the client sends no department. */
export const updatePPERecord = async (id: string, data: Partial<FormState>) => api.patch(`/api/ppe/${id}`, { ...data, expiry_date: data.expiry_date || null });
export const deletePPERecord = async (id: string) => api.delete(`/api/ppe/${id}`);
/** Status only: the server changes just what it is sent, so nothing else on the record is touched. */
export const setPPEStatus = async (id: string, status: string) => api.patch(`/api/ppe/${id}`, { status });

export async function setMatrixInterval(ppeType: string, months: number, department?: string) { return api.put<{ updated: number }>('/api/ppe/matrix', { ppe_type: ppeType, interval_months: months, department: department ?? null }); }
export async function applyMatrixType(ppeType: string, department?: string) { return api.post<{ updated: number }>(withDepartment(`/api/ppe/matrix/${ppeType}/apply`, department), {}); }
export async function applyMatrixAll(department?: string) { return api.post<{ total_updated: number; failed?: string[] }>(withDepartment('/api/ppe/matrix/apply-all', department), {}); }

/** The saved replacement matrix over the company defaults, with its own load and error state. Contract (D8): the merge
 * is key-exact (server vocabulary wins); anything counted against these keys stays exact, loose matching is browsing-only. */
export function usePPEMatrix(department?: string) {
  const [matrix, setMatrix] = useState<Record<string, number>>(PPE_MATRIX_DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const latest = useRef(0);
  const refetch = useCallback(async () => {
    const id = ++latest.current;
    setLoading(true); setError(null);
    try {
      const data = await retryTransient(() => api.get<unknown>(withDepartment('/api/ppe/matrix', department)));
      if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('PPE replacement matrix returned an invalid response.');
      if (id === latest.current) setMatrix({ ...PPE_MATRIX_DEFAULTS, ...(data as Record<string, number>) });
    } catch (e) { if (id === latest.current) setError(e instanceof Error ? e.message : 'The saved replacement matrix could not be loaded.'); }
    finally { if (id === latest.current) setLoading(false); }
  }, [department]);
  useEffect(() => { void refetch(); }, [refetch]);
  return { matrix, setMatrix, loading, error, refetch };
}
