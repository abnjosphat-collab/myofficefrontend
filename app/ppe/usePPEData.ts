// app/ppe/usePPEData.ts — the PPE register's reads (honest load state: a failed load is an error with the rows already shown kept, never
// an empty register) and writes (they throw, so a dialog can show why). The replacement matrix has its own load state because it is
// only ever needed by the issue form and the matrix dialog.
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/apiClient';
import { useApiList } from '@/lib/useApiList';
import { normalizeDesignation } from '@/lib/employeeCatalog';
import { sanitizeDisplayName } from './calcPPE';
import { PPE_MATRIX_DEFAULTS } from './ppeMeta';
import type { EmployeeRow, FormState, PPERecord } from './types';

export { PPE_MATRIX_DEFAULTS };

export const fetchPPERecords = async () => {
  const data = await api.get<unknown>('/api/ppe');
  if (!Array.isArray(data)) throw new Error('PPE records returned an invalid response.');
  return data as PPERecord[];
};
export const fetchAllEmployees = async (): Promise<EmployeeRow[]> => {
  const data = await api.get<unknown>('/api/employees/');
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
    };
  });
};

export const usePPERecords = () => useApiList<PPERecord>('/api/ppe', undefined, { fetcher: fetchPPERecords });
export const useRosterRows = () => useApiList<EmployeeRow>('/api/employees/', undefined, { fetcher: fetchAllEmployees });

export const createPPERecord = async (data: Partial<FormState>) => {
  if (!data.employee_id?.trim()) throw new Error('Employee ID is required');
  if (!data.employee_name?.trim()) throw new Error('Employee name is required');
  return api.post('/api/ppe', { ...data, department: 'MAINTENANCE', expiry_date: data.expiry_date || null });
};
export const updatePPERecord = async (id: string, data: Partial<FormState>) => api.patch(`/api/ppe/${id}`, { ...data, department: 'MAINTENANCE', expiry_date: data.expiry_date || null });
export const deletePPERecord = async (id: string) => api.delete(`/api/ppe/${id}`);
/** Status only: the server changes just what it is sent, so nothing else on the record is touched. */
export const setPPEStatus = async (id: string, status: string) => api.patch(`/api/ppe/${id}`, { status });

export async function setMatrixInterval(ppeType: string, months: number) { return api.put<{ updated: number }>('/api/ppe/matrix', { ppe_type: ppeType, interval_months: months }); }
export async function applyMatrixType(ppeType: string) { return api.post<{ updated: number }>(`/api/ppe/matrix/${ppeType}/apply`, {}); }
export async function applyMatrixAll() { return api.post<{ total_updated: number; failed?: string[] }>('/api/ppe/matrix/apply-all', {}); }

/** The saved replacement matrix over the company defaults, with its own load and error state. */
export function usePPEMatrix() {
  const [matrix, setMatrix] = useState<Record<string, number>>(PPE_MATRIX_DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const latest = useRef(0);
  const refetch = useCallback(async () => {
    const id = ++latest.current;
    setLoading(true); setError(null);
    try {
      const data = await api.get<unknown>('/api/ppe/matrix');
      if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('PPE replacement matrix returned an invalid response.');
      if (id === latest.current) setMatrix({ ...PPE_MATRIX_DEFAULTS, ...(data as Record<string, number>) });
    } catch (e) { if (id === latest.current) setError(e instanceof Error ? e.message : 'The saved replacement matrix could not be loaded.'); }
    finally { if (id === latest.current) setLoading(false); }
  }, []);
  useEffect(() => { void refetch(); }, [refetch]);
  return { matrix, setMatrix, loading, error, refetch };
}
