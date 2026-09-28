// app/shifts/useShiftsData.ts — the shifts page's data-fetching layer: the raw API calls
// plus a hook that owns the assignments/employees/leaves state and reload cycle. Split
// out of page.tsx as part of the standing "decompose on touch" convention. Three
// resources behind one Promise.all, one loading flag — the same unified-load-cycle shape
// as app/ppe's usePPEData.
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/apiClient';
import type { Employee, LeaveRecord, ShiftAssignment } from './types';

export async function createAssignment(payload: Record<string, unknown>) {
  return api.post('/api/standby', payload);
}
export async function updateAssignment(id: number, payload: Record<string, unknown>) {
  return api.put(`/api/standby/${id}`, payload);
}
export async function deleteAssignment(id: number) {
  await api.delete(`/api/standby/${id}`);
}

export function useShiftsData() {
  const [assignments, setAssignments] = useState<ShiftAssignment[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [leaves, setLeaves] = useState<LeaveRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [employeeError, setEmployeeError] = useState('');
  const [leaveError, setLeaveError] = useState('');
  const requestRef = useRef(0);

  const fetchAll = useCallback(async (quiet = false) => {
    const requestId=++requestRef.current;
    if(quiet)setRefreshing(true);else setLoading(true);
    setLoadError('');setEmployeeError('');setLeaveError('');
    const [assignmentsResult,employeesResult,leavesResult]=await Promise.allSettled([
      api.get<ShiftAssignment[]>('/api/standby'),
      api.get<Record<string, unknown>[]>('/api/employees'),
      api.get<LeaveRecord[]>('/api/leaves'),
    ]);
    if(requestId!==requestRef.current)return;
    if(assignmentsResult.status==='fulfilled'&&Array.isArray(assignmentsResult.value))setAssignments(assignmentsResult.value);
    else setLoadError(assignmentsResult.status==='rejected'&&assignmentsResult.reason instanceof Error?assignmentsResult.reason.message:'Shift assignments returned an unexpected response.');
    if(employeesResult.status==='fulfilled'&&Array.isArray(employeesResult.value)) {
        const eRes=employeesResult.value;
        setEmployees(eRes.map(e => ({
          id: String(e.id), name: (`${e.first_name || ''} ${e.last_name || ''}`).trim() || String(e.employee_id || 'Employee'),
          designation: (e.designation || e.position || '') as string, department: (e.department || '') as string,
          section: (e.section || '') as string, phone: (e.phone || '') as string,
        })));
    } else setEmployeeError(employeesResult.status==='rejected'&&employeesResult.reason instanceof Error?employeesResult.reason.message:'Employee options returned an unexpected response.');
    if(leavesResult.status==='fulfilled'&&Array.isArray(leavesResult.value))setLeaves(leavesResult.value);
    else setLeaveError(leavesResult.status==='rejected'&&leavesResult.reason instanceof Error?leavesResult.reason.message:'Leave records returned an unexpected response.');
    if(requestId===requestRef.current){setLoading(false);setRefreshing(false);}
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  return { assignments, setAssignments, employees, leaves, loading, refreshing, loadError, employeeError, leaveError, refresh: fetchAll };
}
