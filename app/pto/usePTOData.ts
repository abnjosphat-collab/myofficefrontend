// app/pto/usePTOData.ts — the PTO register's data layer: record CRUD plus the list hook. Writes throw on failure so
// the form dialog can show the reason and keep the user's input; a failed load is reported (never an empty list)
// through useApiList. `setItems` is exposed for the optimistic status change in the detail dialog.
'use client';

import { api } from '@/lib/apiClient';
import { useApiList } from '@/lib/useApiList';
import type { PTOReport } from './types';

export const createPTOReport = (report: Partial<PTOReport>) => api.post<PTOReport>('/api/pto/', report);
export const updatePTOReport = (id: string, report: Partial<PTOReport>) => api.patch<PTOReport>(`/api/pto/${id}/`, report);
export const deletePTOReport = (id: string) => api.delete<void>(`/api/pto/${id}/`);

export function usePTOData() {
  const list = useApiList<PTOReport>('/api/pto/', undefined, { paged: true });
  return { reports: list.items, setReports: list.setItems, loading: list.loading, loaded: list.loaded, error: list.error, errorStatus: list.errorStatus, refetch: list.refetch };
}
