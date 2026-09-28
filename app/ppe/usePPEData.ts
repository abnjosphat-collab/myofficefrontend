// app/ppe/usePPEData.ts — the PPE page's data-fetching layer: the raw API calls plus
// a hook that owns records/stats/employees/matrix state and the load/refresh cycle.
// Split out of page.tsx as part of the standing "decompose on touch" convention
// (roadmap Phase 7) — page.tsx now composes this hook instead of managing five
// separate useState/useEffect pairs itself.
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/apiClient';
import { toast } from 'sonner';
import { sanitizeDisplayName } from './calcPPE';
import { normalizeDesignation } from '@/lib/employeeCatalog';
import type { EmployeeRow, FormState, PPERecord, PPEStats } from './types';

// PPE replacement matrix — default months-until-expiry per item type, calculated from the
// issue date. These are the company defaults; the backend /api/ppe/matrix overrides them
// (and persists edits) once the ppe_matrix table exists. Users change an interval and hit
// Recalculate to reset every item of that type. See supabase_migration_ppe_matrix.sql.
// interval 0 = no expiry (item doesn't expire / isn't replaced on a schedule).
export const PPE_MATRIX_DEFAULTS: Record<string, number> = {
  worksuit: 6, gumboots: 6, safety_shoes: 6,
  helmet: 24, Cap_lamp_belt: 24, pneumo_jacket: 24, harness: 24, safety_chain_belt: 24,
  vest: 3, glasses: 3, respirator: 1, rainsuit: 6,
  gloves: 0, overall: 6,
};

const errorMessage = (error: unknown, fallback: string) => error instanceof Error ? error.message : fallback;

export const fetchPPERecords = async () => {
  const data = await api.get<unknown>('/api/ppe');
  if (!Array.isArray(data)) throw new Error('PPE records returned an invalid response.');
  return data as PPERecord[];
};
export const fetchPPEStats = async () => {
  const data = await api.get<unknown>('/api/ppe/stats/summary');
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('PPE statistics returned an invalid response.');
  return data as PPEStats;
};
export const fetchAllEmployees = async (): Promise<EmployeeRow[]> => {
  const data = await api.get<unknown>('/api/employees/');
  if (!Array.isArray(data)) throw new Error('Personnel returned an invalid response.');
  return data.map((value: unknown) => {
    const employee = value && typeof value === 'object' ? value as Record<string, unknown> : {};
    const designation = typeof employee.designation === 'string' ? employee.designation : '';
    return {
      employee_id: typeof employee.employee_id === 'string' ? employee.employee_id : '',
      employee_name: sanitizeDisplayName(`${employee.first_name || ''} ${employee.last_name || ''}`.trim()),
      position: normalizeDesignation(designation) || designation,
      department: typeof employee.department === 'string' ? employee.department : '',
      section: typeof employee.section === 'string' ? employee.section : '',
    };
  });
};
export const createPPERecord = async (data: Partial<FormState>) => {
  if (!data.employee_id?.trim()) throw new Error('Employee ID is required');
  if (!data.employee_name?.trim()) throw new Error('Employee name is required');
  return api.post('/api/ppe', { ...data, department: 'MAINTENANCE', expiry_date: data.expiry_date || null });
};
export const updatePPERecord = async (id: string, data: Partial<FormState>) =>
  api.patch(`/api/ppe/${id}`, { ...data, department: 'MAINTENANCE', expiry_date: data.expiry_date || null });
export const deletePPERecord = async (id: string) => api.delete(`/api/ppe/${id}`);

export function usePPEData() {
  const [records, setRecords] = useState<PPERecord[]>([]);
  const [apiEmployees, setApiEmployees] = useState<EmployeeRow[]>([]);
  const [stats, setStats] = useState<PPEStats | null>(null);
  const [statsError, setStatsError] = useState('');
  const [employeesError, setEmployeesError] = useState('');
  // Same gap, but worse: `records` starts at [] and fetchPPERecords doesn't swallow
  // its own errors, so a failed load (a Render cold-start timeout, a dropped
  // connection, anything) leaves records at its default empty array — indistinguishable
  // from a genuinely empty table. The page rendered "No PPE records yet — Issue PPE to
  // an employee to get started" either way, which read as real data-loss instead of a
  // transient fetch failure (found live, 2026-08-29, reported as "database fetching
  // failing" — root cause was a Render free-tier cold start, but the empty-state copy
  // would have hidden ANY fetch failure the same way).
  const [recordsError, setRecordsError] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const hasLoadedOnce = useRef(false);
  const requestRef = useRef(0);
  // Effective PPE replacement matrix (company defaults, overridden by the backend once
  // the ppe_matrix table exists). Drives expiry auto-calc + the Recalculate control.
  const [matrix, setMatrix] = useState<Record<string, number>>(PPE_MATRIX_DEFAULTS);
  const [matrixLoading, setMatrixLoading] = useState(true);
  const [matrixError, setMatrixError] = useState('');
  const matrixRequestRef = useRef(0);

  const load = useCallback(async (quiet = false) => {
    const requestId = ++requestRef.current;
    // Only block the Records panel with a full spinner on the very first load.
    // Quiet refreshes (and later reloads) keep existing rows visible so tabs
    // don't flash blank while data is re-fetched.
    if (!quiet && !hasLoadedOnce.current) setLoading(true);
    setRefreshing(true);
    setRecordsError('');
    setStatsError('');
    setEmployeesError('');
    try {
      const [recordsResult, statsResult, employeesResult] = await Promise.allSettled([
        fetchPPERecords(), fetchPPEStats(), fetchAllEmployees(),
      ]);
      if (requestId !== requestRef.current) return;

      if (recordsResult.status === 'fulfilled') {
        setRecords(recordsResult.value);
        hasLoadedOnce.current = true;
      } else {
        const message = errorMessage(recordsResult.reason, 'Could not load PPE records.');
        setRecordsError(message);
        toast.error(`Failed to load PPE records: ${message}`);
      }

      if (statsResult.status === 'fulfilled') setStats(statsResult.value);
      else {
        const message = errorMessage(statsResult.reason, 'Could not load PPE statistics.');
        setStatsError(message);
        toast.error(`Failed to load PPE statistics: ${message}`);
      }

      if (employeesResult.status === 'fulfilled') setApiEmployees(employeesResult.value);
      else {
        const message = errorMessage(employeesResult.reason, 'Could not load personnel.');
        setEmployeesError(message);
        toast.error(`Failed to load personnel: ${message}`);
      }
    }
    finally {
      if (requestId === requestRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const refreshMatrix = useCallback(async () => {
    const requestId = ++matrixRequestRef.current;
    setMatrixLoading(true);
    setMatrixError('');
    try {
      const data = await api.get<unknown>('/api/ppe/matrix');
      if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('PPE replacement matrix returned an invalid response.');
      if (requestId !== matrixRequestRef.current) return;
      setMatrix({ ...PPE_MATRIX_DEFAULTS, ...data as Record<string, number> });
    } catch (error) {
      if (requestId !== matrixRequestRef.current) return;
      setMatrixError(errorMessage(error, 'Could not load the saved PPE replacement matrix.'));
    } finally {
      if (requestId === matrixRequestRef.current) setMatrixLoading(false);
    }
  }, []);

  useEffect(() => { void refreshMatrix(); }, [refreshMatrix]);

  return {
    records, setRecords,
    apiEmployees,
    stats, statsError, employeesError,
    recordsError,
    loading, refreshing,
    matrix, setMatrix, matrixLoading, matrixError, refreshMatrix,
    refresh: load,
  };
}
