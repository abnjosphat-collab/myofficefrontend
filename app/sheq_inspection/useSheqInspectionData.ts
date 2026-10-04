// app/sheq_inspection/useSheqInspectionData.ts — the SHEQ inspection register's data layer: record CRUD plus the
// list hook. Writes throw on failure so the form dialog can show the reason and keep the user's input; a failed
// load is reported (never an empty list) through useApiList.
'use client';

import { api } from '@/lib/apiClient';
import { useApiList } from '@/lib/useApiList';
import type { SHEQFormData } from './types';

export const createInspection = (data: Partial<SHEQFormData>) => api.post<SHEQFormData>('/api/sheq/', data);
export const updateInspection = (id: string, data: Partial<SHEQFormData>) => api.patch<SHEQFormData>(`/api/sheq/${id}/`, data);
export const deleteInspection = (id: string) => api.delete(`/api/sheq/${id}/`);

export function useSheqInspectionData() {
  const list = useApiList<SHEQFormData>('/api/sheq/');
  return { inspections: list.items, loading: list.loading, loaded: list.loaded, error: list.error, errorStatus: list.errorStatus, refetch: list.refetch };
}
