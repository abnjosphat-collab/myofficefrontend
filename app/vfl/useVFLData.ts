// app/vfl/useVFLData.ts — the VFL register's data layer: record CRUD plus the list hook. Writes throw on failure so
// the form dialog can show the reason and keep the user's input; a failed load is reported (never an empty list)
// through useApiList. `setItems` is exposed for the optimistic status change in the detail dialog.
'use client';

import { api } from '@/lib/apiClient';
import { useApiList } from '@/lib/useApiList';
import type { VFLReport } from './types';

export const createVFLReport = (report: Partial<VFLReport>) => api.post<VFLReport>('/api/vfl/', report);
export const updateVFLReport = (id: string, report: Partial<VFLReport>) => api.patch<VFLReport>(`/api/vfl/${id}/`, report);
export const deleteVFLReport = (id: string) => api.delete<void>(`/api/vfl/${id}/`);

export function useVFLData() {
  const list = useApiList<VFLReport>('/api/vfl/', undefined, { paged: true });
  return { reports: list.items, setReports: list.setItems, loading: list.loading, loaded: list.loaded, error: list.error, errorStatus: list.errorStatus, refetch: list.refetch };
}
