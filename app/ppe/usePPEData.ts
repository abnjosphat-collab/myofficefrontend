// app/ppe/usePPEData.ts — the PPE page's data-fetching layer: the raw API calls plus
// a hook that owns records/stats/employees/matrix state and the load/refresh cycle.
// Split out of page.tsx as part of the standing "decompose on touch" convention
// (roadmap Phase 7) — page.tsx now composes this hook instead of managing five
// separate useState/useEffect pairs itself.
'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/apiClient';
import { toast } from 'sonner';
import type { EmployeeRow, FormState, PPERecord, PPEStats } from './types';

// PPE replacement matrix — default months-until-expiry per item type, calculated from the
// issue date. These are the company defaults; the backend /api/ppe/matrix overrides them
// (and persists edits) once the ppe_matrix table exists. Users change an interval and hit
// Recalculate to reset every item of that type. See supabase_migration_ppe_matrix.sql.
// interval 0 = no expiry (item doesn't expire / isn't replaced on a schedule).
export const PPE_MATRIX_DEFAULTS: Record<string, number> = {
  worksuit: 6, gumboots: 6, safety_shoes: 6,
  helmet: 24, Cap_lamp_belt: 24, pneumo_jacket: 24, harness: 24,
  vest: 3, glasses: 3, respirator: 1, rainsuit: 6,
  gloves: 0, overall: 6,
};

export const fetchPPERecords = async () => api.get<PPERecord[]>('/api/ppe');
export const fetchPPEStats = async () => { try { return await api.get<PPEStats>('/api/ppe/stats/summary'); } catch { return null; } };
export const fetchAllEmployees = async (): Promise<EmployeeRow[]> => {
  try {
    const data = await api.get<any[]>('/api/employees/');
    return data.map(e => ({
      employee_id: e.employee_id,
      employee_name: `${e.first_name || ''} ${e.last_name || ''}`.trim(),
      position: e.designation || '',
      department: e.department || '',
      section: e.section || '',
    }));
  } catch { return []; }
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
  // fetchPPEStats swallows its own error and resolves to null either way — this tracks
  // specifically "the stats fetch failed" as distinct from "stats just hasn't loaded
  // yet," so the hero-stats section can show a real error instead of silently
  // rendering nothing (which read exactly like the user having collapsed it).
  const [statsError, setStatsError] = useState(false);
  // Same gap, but worse: `records` starts at [] and fetchPPERecords doesn't swallow
  // its own errors, so a failed load (a Render cold-start timeout, a dropped
  // connection, anything) leaves records at its default empty array — indistinguishable
  // from a genuinely empty table. The page rendered "No PPE records yet — Issue PPE to
  // an employee to get started" either way, which read as real data-loss instead of a
  // transient fetch failure (found live, 2026-08-29, reported as "database fetching
  // failing" — root cause was a Render free-tier cold start, but the empty-state copy
  // would have hidden ANY fetch failure the same way).
  const [recordsError, setRecordsError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  // Effective PPE replacement matrix (company defaults, overridden by the backend once
  // the ppe_matrix table exists). Drives expiry auto-calc + the Recalculate control.
  const [matrix, setMatrix] = useState<Record<string, number>>(PPE_MATRIX_DEFAULTS);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    setRefreshing(true);
    try {
      const [rec, st, emp] = await Promise.all([fetchPPERecords(), fetchPPEStats(), fetchAllEmployees()]);
      setRecords(rec);
      setRecordsError(false);
      setStats(st);
      setStatsError(st === null);
      if (st === null) toast.error('Failed to load PPE stats');
      if (emp.length > 0) setApiEmployees(emp);
    } catch (err: any) {
      // fetchPPERecords threw, so Promise.all never reached setRecords — records
      // stays whatever it was (the [] default on first load, or the last-good list
      // on a failed refresh, which is the right call: a transient failure shouldn't
      // wipe out data already on screen). This flag is what lets the page tell the
      // difference from a genuinely empty table.
      setRecordsError(true);
      toast.error(`Failed to load: ${err.message}`);
    }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Load the shared PPE matrix (defaults merged with backend overrides). Falls back to
  // the code defaults already in state if the endpoint/table isn't available.
  useEffect(() => {
    api.get<Record<string, number>>('/api/ppe/matrix')
      .then(m => { if (m && typeof m === 'object') setMatrix({ ...PPE_MATRIX_DEFAULTS, ...m }); })
      .catch(() => { /* keep defaults */ });
  }, []);

  return {
    records, setRecords,
    apiEmployees,
    stats, statsError,
    recordsError,
    loading, refreshing,
    matrix, setMatrix,
    refresh: load,
  };
}
