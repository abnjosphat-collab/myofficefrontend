// app/near_miss/useNearMissData.ts — the near-miss register's data layer: record CRUD plus the list hook.
// Every write throws on failure so the form dialog can show the reason and keep the user's input; the list
// hook reports a failed load (never an empty list) through useApiList.
'use client';

import { api } from '@/lib/apiClient';
import { useApiList } from '@/lib/useApiList';
import type { NearMissReport } from './types';

export const createReport = (report: Partial<NearMissReport>) => api.post<NearMissReport>('/api/nearmiss/', report);
export const updateReport = (id: string, report: Partial<NearMissReport>) => api.patch<NearMissReport>(`/api/nearmiss/${id}`, report);
export const deleteReport = (id: string) => api.delete(`/api/nearmiss/${id}`);

export function useNearMissData() {
  const list = useApiList<NearMissReport>('/api/nearmiss/', undefined, { paged: true });
  return { reports: list.items, loading: list.loading, loaded: list.loaded, error: list.error, errorStatus: list.errorStatus, refetch: list.refetch };
}
