// app/employees/useEmployeesData.ts — the employees page's data-fetching layer: the raw
// API calls plus a hook that owns the roster/loading/error state and reload cycle. Split
// out of page.tsx as part of the standing "decompose on touch" convention. One resource,
// one loading flag — the simplest shape of the "unified load cycle" the rule calls for.
'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/apiClient';
import { API_BASE } from '@/lib/config';
import { toast } from 'sonner';
import type { Employee, EmployeeFormData } from './types';

const EMPLOYEES_API = `${API_BASE}/api/employees`;

export async function loadEmployees() { return api.get<Employee[]>(EMPLOYEES_API); }
export async function saveEmployee(data: EmployeeFormData, id?: number) {
  if (id) return api.put<Employee>(`${EMPLOYEES_API}/${id}`, data);
  return api.post<Employee>(EMPLOYEES_API, data);
}
export async function removeEmployee(id: number) {
  await api.delete(`${EMPLOYEES_API}/${id}`);
}
export async function bulkSetDiscipline(ids: number[], discipline: 'mechanical' | 'electrical' | null) {
  return api.post<{ updated: number; discipline: string | null }>(`${EMPLOYEES_API}/bulk-discipline`, { ids, discipline });
}

export function useEmployeesData() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setIsLoading(true); setError(null);
    try { setEmployees(await loadEmployees()); }
    catch (e) { const m = e instanceof Error ? e.message : 'Failed to load'; setError(m); toast.error(m); }
    finally { setIsLoading(false); }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  return { employees, setEmployees, isLoading, error, setError, reload };
}
