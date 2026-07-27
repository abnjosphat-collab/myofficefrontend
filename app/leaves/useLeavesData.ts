// app/leaves/useLeavesData.ts — the leave-management page's data-fetching layer: the
// record CRUD calls, the employee-search lookup, and a hook that owns the leave list +
// derived stats + 30s visibility-aware polling cycle. Split out of page.tsx as part of
// the standing "decompose on touch" convention. Single resource (the leave list) with
// stats computed client-side from it — the polling/visibility logic moved in with the
// load cycle since it's inherently about *when* this same fetch re-runs, not a UI concern.
'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/apiClient';
import { toast } from 'sonner';
import type { EmployeeSearchResult, Leave, Stats } from './types';

export function calcDays(start?: string, end?: string): number {
  if (!start || !end) return 0;
  const days = Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / 86400000) + 1;
  return Math.max(0, days);
}

export const fetchLeaves = async (): Promise<Leave[]> => {
  try {
    const data = await api.get<Leave[]>('/api/leaves');
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Error fetching leaves:', error);
    toast.error('Could not load leave requests');
    return [];
  }
};

export const createLeave = async (leaveData: Partial<Leave>): Promise<Leave> => {
  return api.post<Leave>('/api/leaves', { ...leaveData, applied_date: new Date().toISOString(), status: 'pending', total_days: calcDays(leaveData.start_date, leaveData.end_date) });
};

export const updateLeave = async (leaveId: string, leaveData: Partial<Leave>): Promise<Leave> => {
  const saved = await api.patch<Leave>(`/api/leaves/${leaveId}`, { ...leaveData, total_days: calcDays(leaveData.start_date, leaveData.end_date) });
  return saved ?? ({ ...leaveData, id: leaveId, total_days: calcDays(leaveData.start_date, leaveData.end_date) } as Leave);
};

export const updateLeaveStatus = async (leaveId: string, status: Leave['status'], notes?: string): Promise<Leave> => {
  return api.patch<Leave>(`/api/leaves/${leaveId}`, { status, ...(notes ? { notes } : {}) });
};

export const deleteLeave = async (leaveId: string): Promise<{ success: boolean; message: string }> => {
  return (await api.delete<{ success: boolean; message: string }>(`/api/leaves/${leaveId}`)) ?? { success: true, message: 'Deleted' };
};

export const fetchEmployeeSearchResults = async (): Promise<EmployeeSearchResult[]> => {
  const data = await api.get<Record<string, unknown>[]>('/api/employees');
  const employeeList = Array.isArray(data) ? data : [];
  return employeeList.map((emp: Record<string, unknown>) => {
    const id = typeof emp.id === 'number' ? emp.id : parseInt(String(emp.id)) || 0;
    const employeeId = String(emp.employee_id || '');
    let fullName = '';
    if (emp.first_name && emp.last_name) fullName = `${emp.first_name} ${emp.last_name}`;
    else fullName = String(emp.name || emp.employee_name || emp.full_name || emp.Name || '');
    return {
      id, employee_id: employeeId, name: fullName,
      designation: String(emp.designation || emp.position || emp.job_title || ''),
      phone: String(emp.phone || emp.contact_number || emp.mobile || ''),
      supervisor: String(emp.supervisor || emp.manager_name || emp.manager || ''),
      department: String(emp.department || emp.dept || ''),
    };
  });
};

export function useLeavesData() {
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({ total: 0, pending: 0, approved: 0, rejected: 0, on_leave_now: 0, approvalRate: 0, total_days_requested: 0, average_days: 0 });

  const fetchAllData = useCallback(async () => {
    try {
      setLoading(true);
      const leavesData = await fetchLeaves();
      setLeaves(leavesData);
      const today = new Date().toISOString().split('T')[0];
      const approvedLeaves = leavesData.filter(l => l.status === 'approved');
      const rejectedLeaves = leavesData.filter(l => l.status === 'rejected');
      const decided = approvedLeaves.length + rejectedLeaves.length;
      const approvalRate = decided > 0 ? Math.round((approvedLeaves.length / decided) * 100) : 0;
      const totalDays = leavesData.reduce((sum, l) => sum + (l.total_days || 0), 0);
      const avgDays = leavesData.length > 0 ? Math.round(totalDays / leavesData.length) : 0;
      setStats({
        total: leavesData.length, pending: leavesData.filter(l => l.status === 'pending').length,
        approved: approvedLeaves.length, rejected: rejectedLeaves.length,
        on_leave_now: approvedLeaves.filter(l => l.start_date <= today && l.end_date >= today).length,
        approvalRate, total_days_requested: totalDays, average_days: avgDays,
      });
      setLoading(false);
    } catch (err) { toast.error((err as Error).message || 'Failed to fetch data'); setLoading(false); }
  }, []);

  useEffect(() => {
    fetchAllData();
    let interval: ReturnType<typeof setInterval> | null = null;
    function startPolling() { interval = setInterval(() => { if (document.visibilityState === 'visible') fetchAllData(); }, 30000); }
    function handleVisibility() {
      if (document.visibilityState === 'visible') { fetchAllData(); if (!interval) startPolling(); }
      else if (interval) { clearInterval(interval); interval = null; }
    }
    startPolling();
    document.addEventListener('visibilitychange', handleVisibility);
    return () => { if (interval) clearInterval(interval); document.removeEventListener('visibilitychange', handleVisibility); };
  }, [fetchAllData]);

  return { leaves, stats, loading, refresh: fetchAllData };
}
