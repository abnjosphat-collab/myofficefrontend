// app/artisan-timesheets/useArtisanTimesheetsData.ts — the artisan timesheet page's data layer: the personnel list (artisans and the
// people who can sign are both read from it), the saved timesheets, the approved leave, overtime and standby the month is filled
// from, and the writes. Every read reports its own failure: a source that could not be loaded is named, never treated as "no leave".
'use client';

import { api } from '@/lib/apiClient';
import { retryTransient } from '@/lib/transientRetry';
import { useApiList } from '@/lib/useApiList';
import type { ShiftAssignment } from '@/app/shifts/types';
import type { ApprovedLeaveRecord, ApprovedOvertimeRecord } from '@/app/timesheets/types';
import { staffFrom, type Sources, type Staff } from './artisanLogic';
import type { ArtisanTimesheetRecord, ArtisanTimesheetSummary } from './types';

export interface ArtisanTimesheetFilters { employee_id?: string; year?: number; month?: number }

export const useStaff = () => useApiList<unknown, Staff>('/api/employees', staffFrom);

export function useSavedTimesheets(filters: ArtisanTimesheetFilters) {
  const q = new URLSearchParams({ summary: 'true' });
  if (filters.employee_id) q.set('employee_id', filters.employee_id);
  if (filters.year != null) q.set('year', String(filters.year));
  if (filters.month != null) q.set('month', String(filters.month));
  return useApiList<ArtisanTimesheetSummary>(`/api/artisan-timesheets?${q.toString()}`);
}

/** One saved timesheet in full (days and signatures), for opening it from the list. */
export const fetchTimesheet = (id: number) => retryTransient(() => api.get<ArtisanTimesheetRecord>(`/api/artisan-timesheets/${id}`));

/** The saved timesheet for one artisan and month, read fresh (the list on screen may be filtered). */
export const fetchMonth = (employeeId: string, year: number, month: number) => retryTransient(() => api.get<ArtisanTimesheetRecord[]>(`/api/artisan-timesheets?employee_id=${encodeURIComponent(employeeId)}&year=${year}&month=${month}`));

export interface Reference { sources: Sources; settled: boolean; failed: string[]; refetch: () => void }
/** The approved leave, overtime and standby a blank month is filled from. `settled` is true once each has answered, successfully or not. */
export function useReference(): Reference {
  const leaves = useApiList<ApprovedLeaveRecord>('/api/leaves?status=approved');
  const overtime = useApiList<ApprovedOvertimeRecord>('/api/overtime?status=approved');
  const standby = useApiList<ShiftAssignment>('/api/standby');
  const all = [['approved leave', leaves], ['approved overtime', overtime], ['standby', standby]] as const;
  return {
    sources: { leaves: leaves.items, overtime: overtime.items, standbyAssignments: standby.items },
    settled: all.every(([, r]) => r.loaded || !!r.error),
    failed: all.filter(([, r]) => !!r.error).map(([name]) => name),
    refetch: () => { void leaves.refetch(); void overtime.refetch(); void standby.refetch(); },
  };
}

export const createArtisanTimesheet = (body: Omit<ArtisanTimesheetRecord, 'id' | 'created_at' | 'updated_at'>) => api.post<ArtisanTimesheetRecord>('/api/artisan-timesheets', body);
export const updateArtisanTimesheet = (id: number, body: Partial<ArtisanTimesheetRecord>) => api.patch<ArtisanTimesheetRecord>(`/api/artisan-timesheets/${id}`, body);
export const deleteArtisanTimesheet = (id: number) => api.delete(`/api/artisan-timesheets/${id}`);
