// app/timesheets/useTimesheetsData.ts — the timesheets page's data-fetching layer: the
// raw API calls plus a hook that owns the employees/timesheets/approved-leave/approved-
// overtime state and reload cycle for one payroll period. Split out of page.tsx as part
// of the standing "decompose on touch" convention. Unlike app/ppe's usePPEData (which
// loads once on mount), this hook's load cycle is parameterized by the active period and
// re-fires whenever it changes — timesheets are period-scoped, not a flat global record set.
'use client';

import { useCallback, useEffect, useState } from 'react';
import { api as apiClient } from '@/lib/apiClient';
import { toast } from 'sonner';
import { toLocalISODate } from '@/lib/dates';
import type { ShiftAssignment } from '@/app/shifts/types';
import type { ApprovedLeaveRecord, ApprovedOvertimeRecord, Employee, Period, TimesheetEntry } from './types';
import { periodUsesUnsignedModuleRecords } from './necModuleBatch';

export const api = {
  async employees(): Promise<Employee[]> {
    const data = await apiClient.get<Record<string, unknown>[]>('/api/employees');
    return (data || []).map(d => ({
      id: String(d.id || Math.random().toString(36).slice(2)),
      employeeId: (() => { const v = String(d.employee_id || '').trim(); return (v === '' || v.toUpperCase() === 'TBA') ? '' : v; })(),
      name: (`${d.first_name || ''} ${d.last_name || ''}`).trim() || 'Employee',
      position: (d.position || d.job_title || d.designation || 'Staff') as string,
      department: (d.department || 'General') as string,
      email: (d.email || '') as string,
      is_active: d.is_active !== false,
      employmentType: ((d.employment_type as string) === 'NEC' || (d.employment_type as string) === 'SALARIED') ? (d.employment_type as 'NEC' | 'SALARIED') : '',
    }));
  },
  // Throws on failure — the `catch { return [] }` this replaces made a server
  // outage indistinguishable from "nobody logged time this period".
  async timesheets(startDate: string, endDate: string): Promise<TimesheetEntry[]> {
    const p = new URLSearchParams({ start_date: startDate, end_date: endDate });
    return (await apiClient.get<TimesheetEntry[]>(`/api/timesheets?${p}`)) || [];
  },
  async create(data: Omit<TimesheetEntry, 'id'>): Promise<TimesheetEntry> {
    const res = await apiClient.post<{ action?: string; data?: TimesheetEntry } | TimesheetEntry>('/api/timesheets', data);
    if (res && typeof res === 'object' && 'data' in res && res.data) return res.data;
    return res as TimesheetEntry;
  },
  async update(id: number, data: Partial<TimesheetEntry>): Promise<TimesheetEntry> {
    const res = await apiClient.patch<{ data?: TimesheetEntry } | TimesheetEntry>(`/api/timesheets/${id}`, data);
    return (res as { data?: TimesheetEntry }).data || (res as TimesheetEntry);
  },
  async delete(id: number): Promise<void> {
    await apiClient.delete(`/api/timesheets/${id}`);
  },
  /** Leaves for grid merge — approved only, except the scoped NEC Aug–Sep 2026 batch. */
  async moduleLeaves(period: Period): Promise<ApprovedLeaveRecord[]> {
    const all = periodUsesUnsignedModuleRecords(period)
      ? ((await apiClient.get<ApprovedLeaveRecord[]>('/api/leaves')) || [])
      : ((await apiClient.get<ApprovedLeaveRecord[]>('/api/leaves?status=approved')) || []);
    return all.filter(l => l.status !== 'rejected');
  },
  /** Overtime for grid merge — approved only, except the scoped NEC Aug–Sep 2026 batch. */
  async moduleOvertime(period: Period): Promise<ApprovedOvertimeRecord[]> {
    const all = periodUsesUnsignedModuleRecords(period)
      ? ((await apiClient.get<ApprovedOvertimeRecord[]>('/api/overtime')) || [])
      : ((await apiClient.get<ApprovedOvertimeRecord[]>('/api/overtime?status=approved')) || []);
    return all.filter(o => o.status !== 'rejected');
  },
  async shiftAssignments(): Promise<ShiftAssignment[]> {
    return (await apiClient.get<ShiftAssignment[]>('/api/standby')) || [];
  },
};

export function useTimesheetsData(activePeriod: Period) {
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [timesheets, setTimesheets] = useState<TimesheetEntry[]>([]);
  const [approvedLeaves, setApprovedLeaves] = useState<ApprovedLeaveRecord[]>([]);
  const [approvedOvertime, setApprovedOvertime] = useState<ApprovedOvertimeRecord[]>([]);
  const [shiftAssignments, setShiftAssignments] = useState<ShiftAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [emps, sheets, leaves, ot, shifts] = await Promise.all([
        api.employees(), api.timesheets(toLocalISODate(activePeriod.start), toLocalISODate(activePeriod.end)),
        api.moduleLeaves(activePeriod), api.moduleOvertime(activePeriod), api.shiftAssignments(),
      ]);
      setAllEmployees(emps);
      setTimesheets(sheets);
      setApprovedLeaves(leaves);
      setApprovedOvertime(ot);
      setShiftAssignments(shifts);
    } catch (e) { toast.error('Failed to load: ' + (e as Error).message); }
    finally { setLoading(false); }
  }, [activePeriod]);

  useEffect(() => { load(); }, [load]);

  return {
    allEmployees, timesheets, setTimesheets, approvedLeaves, approvedOvertime, shiftAssignments,
    loading, refresh: load,
  };
}
