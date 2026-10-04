// app/work_stoppage/useWorkStoppageData.ts — the work stoppage register's data layer: record CRUD plus the list
// hook. Writes throw on failure so the form dialog can show the reason and keep the user's input; a failed load
// is reported (never an empty list) through useApiList.
'use client';

import { api } from '@/lib/apiClient';
import { useApiList } from '@/lib/useApiList';
import type { WorkStoppageReport } from './types';

const BASE = '/api/work-stoppage/';

export const createReport = (data: Partial<WorkStoppageReport>) => api.post<WorkStoppageReport>(BASE, data);
export const updateReport = (id: string, data: Partial<WorkStoppageReport>) => api.patch<WorkStoppageReport>(`${BASE}${id}`, data);
export const deleteReport = (id: string) => api.delete(`${BASE}${id}`);

export function useWorkStoppageData() {
  const list = useApiList<WorkStoppageReport>(BASE, undefined, { paged: true });
  return { reports: list.items, loading: list.loading, loaded: list.loaded, error: list.error, errorStatus: list.errorStatus, refetch: list.refetch };
}
