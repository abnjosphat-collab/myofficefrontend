// app/employees/useEmployeesData.ts — the employees page's data-fetching layer: the raw
// API calls plus a hook that owns the roster/loading/error state and reload cycle. Split
// out of page.tsx as part of the standing "decompose on touch" convention. One resource,
// one loading flag — the simplest shape of the "unified load cycle" the rule calls for.
'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/apiClient';
import { API_BASE } from '@/lib/config';
import { toast } from 'sonner';
import { invalidateEmployeesCache } from '@/hooks/useLookups';
import type { Employee, EmployeeFormData } from './types';

const EMPLOYEES_API = `${API_BASE}/api/employees`;

export async function loadEmployees() { return api.get<Employee[]>(EMPLOYEES_API); }
export async function saveEmployee(data: EmployeeFormData, id?: number) {
  // Every other page's employee picker (leaves, overtime, maintenance, ...) shares
  // one cached fetch (hooks/useLookups.ts) that never expires on its own — without
  // this, a phone/section/name edit here stays invisible everywhere else until a
  // full page reload.
  const saved = id ? await api.put<Employee>(`${EMPLOYEES_API}/${id}`, data) : await api.post<Employee>(EMPLOYEES_API, data);
  invalidateEmployeesCache();
  return saved;
}
export async function removeEmployee(id: number) {
  await api.delete(`${EMPLOYEES_API}/${id}`);
  invalidateEmployeesCache();
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
