// app/shifts/useShiftsData.ts — the shifts page's data-fetching layer: the raw API calls
// plus a hook that owns the assignments/employees/leaves state and reload cycle. Split
// out of page.tsx as part of the standing "decompose on touch" convention. Three
// resources behind one Promise.all, one loading flag — the same unified-load-cycle shape
// as app/ppe's usePPEData.
'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/apiClient';
import { toast } from 'sonner';
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

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [aRes, eRes, lRes] = await Promise.all([
        api.get<any[]>('/api/standby').catch(() => null),
        api.get<Record<string, unknown>[]>('/api/employees').catch(() => null),
        api.get<any[]>('/api/leaves').catch(() => null),
      ]);
      if (aRes) setAssignments(aRes);
      if (eRes) {
        setEmployees(eRes.map(e => ({
          id: String(e.id), name: (`${e.first_name || ''} ${e.last_name || ''}`).trim() || String(e.employee_id || 'Employee'),
          designation: (e.designation || e.position || '') as string, department: (e.department || '') as string,
          section: (e.section || '') as string, phone: (e.phone || '') as string,
        })));
      }
      if (lRes) setLeaves(lRes);
    } catch { toast.error('Failed to load shifts data'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  return { assignments, setAssignments, employees, leaves, loading, refresh: fetchAll };
}
