// app/timesheets/useTimesheetsData.ts — the timesheets page's data-fetching layer: the
// raw API calls plus a hook that owns the employees/timesheets/approved-leave/approved-
// overtime state and reload cycle for one payroll period. Split out of page.tsx as part
// of the standing "decompose on touch" convention. Unlike app/ppe's usePPEData (which
// loads once on mount), this hook's load cycle is parameterized by the active period and
// re-fires whenever it changes — timesheets are period-scoped, not a flat global record set.
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api as apiClient } from '@/lib/apiClient';
import { toast } from 'sonner';
import { toLocalISODate } from '@/lib/dates';
import type { ShiftAssignment } from '@/app/shifts/types';
import type { ApprovedLeaveRecord, ApprovedOvertimeRecord, Employee, Period, TimesheetEntry } from './types';
import { periodUsesUnsignedModuleRecords } from './necModuleBatch';
import { moduleRecordIncluded } from './moduleApproval';
import { retryTimesheetRead } from './retryTimesheetRead';

function requireArray<T>(value: unknown, label: string): T[] {
  if (!Array.isArray(value)) throw new Error(`${label} returned an unexpected response.`);
  return value as T[];
}

export const api = {
  async employees(signal?: AbortSignal): Promise<Employee[]> {
    const data = requireArray<Record<string, unknown>>(await apiClient.get<unknown>('/api/employees', { signal }), 'Personnel records');
    return data.map(d => ({
      id: String(d.id || Math.random().toString(36).slice(2)),
      employeeId: String(d.employee_id || '').trim(),
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
  async timesheets(startDate: string, endDate: string, signal?: AbortSignal): Promise<TimesheetEntry[]> {
    const p = new URLSearchParams({ start_date: startDate, end_date: endDate });
    return requireArray<TimesheetEntry>(await apiClient.get<unknown>(`/api/timesheets?${p}`, { signal }), 'Timesheets');
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
  /** NEC includes all non-rejected source records without changing their approval state. */
  async moduleLeaves(period: Period, includePending = false, signal?: AbortSignal): Promise<ApprovedLeaveRecord[]> {
    const all = requireArray<ApprovedLeaveRecord>(includePending || periodUsesUnsignedModuleRecords(period)
      ? await apiClient.get<unknown>('/api/leaves', { signal })
      : await apiClient.get<unknown>('/api/leaves?status=approved', { signal }), 'Leave records');
    return all.filter(l => moduleRecordIncluded(l.status));
  },
  async moduleOvertime(period: Period, includePending = false, signal?: AbortSignal): Promise<ApprovedOvertimeRecord[]> {
    const all = requireArray<ApprovedOvertimeRecord>(includePending || periodUsesUnsignedModuleRecords(period)
      ? await apiClient.get<unknown>('/api/overtime', { signal })
      : await apiClient.get<unknown>('/api/overtime?status=approved', { signal }), 'Overtime records');
    return all.filter(o => moduleRecordIncluded(o.status));
  },
  async shiftAssignments(signal?: AbortSignal): Promise<ShiftAssignment[]> {
    return requireArray<ShiftAssignment>(await apiClient.get<unknown>('/api/standby', { signal }), 'Shift assignments');
  },
};

export function useTimesheetsData(activePeriod: Period) {
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [timesheets, setTimesheets] = useState<TimesheetEntry[]>([]);
  const [approvedLeaves, setApprovedLeaves] = useState<ApprovedLeaveRecord[]>([]);
  const [approvedOvertime, setApprovedOvertime] = useState<ApprovedOvertimeRecord[]>([]);
  const [shiftAssignments, setShiftAssignments] = useState<ShiftAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const requestId = useRef(0);
  const activeLoad = useRef<AbortController | null>(null);

  const load = useCallback(async (quiet = false) => {
    const currentRequest = ++requestId.current;
    activeLoad.current?.abort();
    const controller = new AbortController();
    activeLoad.current = controller;
    if (quiet) setRefreshing(true); else setLoading(true);
    if (!quiet) {
      setAllEmployees([]);
      setTimesheets([]);
      setApprovedLeaves([]);
      setApprovedOvertime([]);
      setShiftAssignments([]);
    }
    setLoadError(null);
    setRetrying(false);
    const read = <T,>(operation: (signal: AbortSignal) => Promise<T>) => retryTimesheetRead(operation, controller.signal, () => {
      if (currentRequest === requestId.current) setRetrying(true);
    });
    try {
      const [emps, sheets, leaves, ot, shifts] = await Promise.all([
        read(signal => api.employees(signal)),
        read(signal => api.timesheets(toLocalISODate(activePeriod.start), toLocalISODate(activePeriod.end), signal)),
        read(signal => api.moduleLeaves(activePeriod, true, signal)),
        read(signal => api.moduleOvertime(activePeriod, true, signal)),
        read(signal => api.shiftAssignments(signal)),
      ]);
      if (currentRequest !== requestId.current || controller.signal.aborted) return;
      controller.abort();
      setAllEmployees(emps);
      setTimesheets(sheets);
      setApprovedLeaves(leaves);
      setApprovedOvertime(ot);
      setShiftAssignments(shifts);
    } catch (e) {
      if (currentRequest !== requestId.current || controller.signal.aborted) return;
      controller.abort();
      const msg = (e as Error).message || 'Unknown error';
      if (!quiet) {
        setAllEmployees([]);
        setTimesheets([]);
        setApprovedLeaves([]);
        setApprovedOvertime([]);
        setShiftAssignments([]);
      }
      setLoadError(msg);
      toast.error('Failed to load: ' + msg);
    }
    finally { if (currentRequest === requestId.current) { setLoading(false); setRefreshing(false); setRetrying(false); } }
  }, [activePeriod]);

  useEffect(() => {
    const activeRequest = requestId;
    void load();
    return () => { ++activeRequest.current; activeLoad.current?.abort(); };
  }, [load]);

  return {
    allEmployees, timesheets, setTimesheets, approvedLeaves, approvedOvertime, shiftAssignments,
    loading, refreshing, retrying, loadError, refresh: load,
  };
}
