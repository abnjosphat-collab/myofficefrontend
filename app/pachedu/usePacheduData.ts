// app/pachedu/usePacheduData.ts — the Pachedu register's data layer: record CRUD plus the list hook. The list is
// paged (the route returns only 100 rows by default), writes throw so the form dialog can show the reason, and a
// failed load is reported through useApiList, never shown as an empty register. Summary figures are computed from
// the full list by the page; the server's /stats/overview endpoint is no longer read, so there is one failure mode.
'use client';

import { api } from '@/lib/apiClient';
import { useApiList } from '@/lib/useApiList';
import type { PacheduReport } from './types';

export const createPacheduReport = (report: Partial<PacheduReport>) => api.post<PacheduReport>('/api/pachedu/', report);
export const updatePacheduReport = (id: string, report: Partial<PacheduReport>) => api.patch<PacheduReport>(`/api/pachedu/${id}`, report);
export const deletePacheduReport = (id: string) => api.delete(`/api/pachedu/${id}`);

export function usePacheduData() {
  const list = useApiList<PacheduReport>('/api/pachedu/', undefined, { paged: true });
  return { reports: list.items, setReports: list.setItems, loading: list.loading, loaded: list.loaded, error: list.error, errorStatus: list.errorStatus, refetch: list.refetch };
}
