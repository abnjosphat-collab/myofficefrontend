// app/employees/useEmployeesData.ts — the employees page's data-fetching layer: the raw
// API calls plus a hook that owns the roster/loading/error state and reload cycle. Split
// out of page.tsx as part of the standing "decompose on touch" convention. One resource,
// one loading flag — the simplest shape of the "unified load cycle" the rule calls for.
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/apiClient';
import { API_BASE } from '@/lib/config';
import { toast } from 'sonner';
import { invalidateEmployeesCache } from '@/hooks/useLookups';
import { normalizeEmployeeRoleFields, resolveDriverLicense } from '@/lib/employeeCatalog';
import { normalizePhoneField } from '@/lib/phone';
import {
  normalizedEmployeeFields, type NormalizationPlan,
} from './calcNormalizeRoster';
import type { Employee, EmployeeFormData } from './types';

const EMPLOYEES_API = `${API_BASE}/api/employees`;

export interface BulkNormalizeResult {
  succeeded: number;
  failed: number;
  errors?: string[];
}

export async function loadEmployees(timeoutMs = 20_000) {
  const controller = new AbortController();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    const rows = await Promise.race([
      api.get<unknown>(EMPLOYEES_API, { signal: controller.signal }),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => {
          controller.abort();
          reject(new Error('Personnel records are taking too long to load. Please retry.'));
        }, timeoutMs);
      }),
    ]);
    if (!Array.isArray(rows)) throw new Error('Personnel records returned an unexpected response.');
    return rows as Employee[];
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
export async function saveEmployee(data: EmployeeFormData, id?: number) {
  const role = normalizeEmployeeRoleFields(data.designation, data.section, data.first_name, data.last_name);
  const payload = {
    ...data,
    designation: role.designation,
    section: role.section,
    phone: normalizePhoneField(data.phone),
    drivers_license_class: resolveDriverLicense(data.drivers_license_class),
    date_of_engagement: data.date_of_engagement?.trim() ? data.date_of_engagement : null,
  };
  const saved = id ? await api.put<Employee>(`${EMPLOYEES_API}/${id}`, payload) : await api.post<Employee>(EMPLOYEES_API, payload);
  invalidateEmployeesCache();
  return saved;
}

export async function bulkNormalizeEmployees(
  plan: NormalizationPlan,
  employees: Employee[],
): Promise<BulkNormalizeResult> {
  const affectedIds = new Set(plan.items.map(i => i.id));
  const updates = employees
    .filter(e => affectedIds.has(e.id))
    .map(e => {
      const norm = normalizedEmployeeFields(e);
      return {
        id: e.id,
        designation: norm.designation,
        section: norm.section,
        phone: norm.phone,
        archived: norm.archived,
      };
    });

  const result = await api.post<BulkNormalizeResult>(
    `${EMPLOYEES_API}/bulk-normalize`,
    { updates },
  );
  invalidateEmployeesCache();
  return result;
}
export async function removeEmployee(id: number) {
  await api.delete(`${EMPLOYEES_API}/${id}`);
  invalidateEmployeesCache();
}

export function useEmployeesData() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const latestLoad = useRef(0);

  const reload = useCallback(async (quiet = false) => {
    const loadId = ++latestLoad.current;
    if (quiet) setRefreshing(true); else setIsLoading(true);
    setError(null);
    try {
      const rows = await loadEmployees();
      if (loadId === latestLoad.current) setEmployees(rows);
    } catch (e) {
      if (loadId === latestLoad.current) {
        const m = e instanceof Error ? e.message : 'Failed to load';
        setError(m); toast.error(m);
      }
    } finally {
      if (loadId === latestLoad.current) { setIsLoading(false); setRefreshing(false); }
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  return { employees, setEmployees, isLoading, refreshing, error, setError, reload };
}
