// app/shifts/useShiftsData.ts — the shifts page's data layer. The assignments (the page) and the leave register (shown in
// the schedule) load on their own and report their own failure; the employee choices come from the shared employee lookup.
// A failed load is an error, never an empty roster, and rows already loaded stay through a failed refresh. Writes throw so a
// dialog can show the reason and keep what was typed. The server returns every page of both lists.
'use client';

import { api } from '@/lib/apiClient';
import { useApiList } from '@/lib/useApiList';
import type { LeaveRecord, ShiftAssignment } from './types';

export function useShiftsData() {
  const assignments = useApiList<ShiftAssignment>('/api/standby');
  const leaves = useApiList<LeaveRecord>('/api/leaves');
  const refresh = async () => { await Promise.all([assignments.refetch(), leaves.refetch()]); };
  return { assignments, leaves, refresh };
}

export const createAssignment = (payload: Record<string, unknown>) => api.post('/api/standby', payload);
export const updateAssignment = (id: number, payload: Record<string, unknown>) => api.put(`/api/standby/${id}`, payload);
export const deleteAssignment = async (id: number) => { await api.delete(`/api/standby/${id}`); };
