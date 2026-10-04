// app/leaves/useLeavesData.ts — the leave register's data layer. The list is loaded honestly (a failed load is an error,
// not an empty register; rows already loaded stay through a failed refresh) and refreshed every 30 seconds while the page
// is visible. Writes throw so the dialog can show the reason and keep what was typed. The server returns every page.
'use client';

import { useEffect, useRef } from 'react';
import { api } from '@/lib/apiClient';
import { useApiList } from '@/lib/useApiList';
import { calcLeaveDays } from '@/lib/calcLeaveDays';
import type { Leave } from './types';

const POLL_MS = 30_000;
// The API returns a numeric id; the page keys, selects and merges by string.
const normalise = (l: Leave): Leave => ({ ...l, id: String(l.id) });

export function useLeaves() {
  const list = useApiList<Leave>('/api/leaves', normalise);
  const refetch = useRef(list.refetch);
  useEffect(() => { refetch.current = list.refetch; });
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    const start = () => { if (!timer) timer = setInterval(() => { if (document.visibilityState === 'visible') refetch.current(); }, POLL_MS); };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') { refetch.current(); start(); }
      else if (timer) { clearInterval(timer); timer = null; }
    };
    start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => { if (timer) clearInterval(timer); document.removeEventListener('visibilitychange', onVisibility); };
  }, []);
  return list;
}

const days = (d: Partial<Leave>) => {
  const exclude = d.exclude_weekends_holidays ?? false;
  return { exclude_weekends_holidays: exclude, total_days: calcLeaveDays(d.start_date, d.end_date, { excludeWeekendsAndHolidays: exclude }) };
};

export const createLeave = (data: Partial<Leave>) => api.post<Leave>('/api/leaves', { ...data, applied_date: new Date().toISOString(), status: 'pending', ...days(data) });
export const updateLeave = (id: string, data: Partial<Leave>) => api.patch<Leave>(`/api/leaves/${id}`, { ...data, ...days(data) });
export const setLeaveStatus = (id: string, status: Leave['status']) => api.patch<Leave>(`/api/leaves/${id}`, { status });
export const deleteLeave = async (id: string) => { await api.delete(`/api/leaves/${id}`); };

export interface BulkResult { succeeded: number; failed: number; updated: Array<Record<string, unknown>> }
/** Approve or reject many pending requests in one call (manager only, enforced by the server). */
export const bulkSetLeaveStatus = (ids: string[], status: 'approved' | 'rejected') =>
  api.post<BulkResult>('/api/leaves/bulk-status', { status, ids: ids.map(i => parseInt(i, 10)).filter(n => !Number.isNaN(n)) });
