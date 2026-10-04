// app/employees/useEmployeesData.ts — the personnel register's reads and writes. The read keeps its 20 s limit (a stalled request ends
// with a retryable error); the writes throw, so a dialog can show the reason and keep what was typed.
'use client';

import { api } from '@/lib/apiClient';
import { API_BASE } from '@/lib/config';
import { useApiList } from '@/lib/useApiList';
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

const fetchRoster = () => loadEmployees();
/** The roster, with honest load state: a failed load is an error with the people already shown kept, never an empty roster. */
export const useRoster = () => useApiList<Employee>('/api/employees', undefined, { fetcher: fetchRoster });
