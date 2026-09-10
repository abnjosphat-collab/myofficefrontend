// app/employees/calcNormalizeRoster.ts — pure logic for bulk-normalizing designation,
// section, phone, and archive flags across the full personnel roster.

import type { Employee, EmployeeFormData } from './types';
import {
  isHoistDriverDesignation,
  normalizeEmployeeRoleFields,
  shouldArchiveEmployee,
} from '@/lib/employeeCatalog';
import { normalizePhoneField } from '@/lib/phone';

export type NormalizableField = 'designation' | 'section' | 'phone' | 'archived';

export interface FieldChange {
  field: NormalizableField;
  from: string;
  to: string;
}

export interface EmployeeNormalization {
  id: number;
  employee_id: string;
  name: string;
  changes: FieldChange[];
}

export interface NormalizationPlan {
  total: number;
  affected: number;
  unchanged: number;
  byField: Record<NormalizableField, number>;
  items: EmployeeNormalization[];
}

export function employeeToFormData(e: Employee): EmployeeFormData {
  return {
    employee_id: e.employee_id || '',
    first_name: e.first_name || '',
    last_name: e.last_name || '',
    id_number: e.id_number || '',
    email: e.email || '',
    phone: e.phone || '',
    address: e.address || '',
    date_of_engagement: e.date_of_engagement || '',
    designation: e.designation || '',
    employee_class: e.employee_class || '',
    employment_type: e.employment_type || '',
    supervisor: e.supervisor || '',
    section: e.section || '',
    department: e.department || '',
    grade: e.grade || '',
    qualifications: e.qualifications || [],
    drivers_license_class: e.drivers_license_class || '',
    offences: e.offences || [],
    awards_recognition: e.awards_recognition || [],
    other_positions: e.other_positions || [],
    previous_employer: e.previous_employer || '',
    archived: !!e.archived,
  };
}

/** Normalized values for the fields this bulk action touches. */
export function normalizedEmployeeFields(e: Employee): Pick<EmployeeFormData, 'designation' | 'section' | 'phone' | 'archived'> {
  const role = normalizeEmployeeRoleFields(e.designation, e.section, e.first_name, e.last_name);
  return {
    designation: role.designation,
    section: role.section,
    phone: normalizePhoneField(e.phone),
    archived: shouldArchiveEmployee(e.designation, e.archived),
  };
}

function pushChange(changes: FieldChange[], field: NormalizableField, from: string, to: string) {
  if (from === to) return;
  changes.push({ field, from, to });
}

function boolLabel(v?: boolean | null): string {
  return v ? 'Yes' : 'No';
}

export function planRosterNormalization(employees: Employee[]): NormalizationPlan {
  const byField: Record<NormalizableField, number> = {
    designation: 0, section: 0, phone: 0, archived: 0,
  };
  const items: EmployeeNormalization[] = [];

  for (const e of employees) {
    const norm = normalizedEmployeeFields(e);
    const changes: FieldChange[] = [];

    pushChange(changes, 'designation', (e.designation || '').trim(), norm.designation);
    pushChange(changes, 'section', (e.section || '').trim(), norm.section);
    pushChange(changes, 'phone', (e.phone || '').trim(), norm.phone);
    pushChange(changes, 'archived', boolLabel(e.archived), boolLabel(norm.archived));

    if (changes.length === 0) continue;

    for (const c of changes) byField[c.field]++;
    items.push({
      id: e.id,
      employee_id: e.employee_id,
      name: `${e.first_name} ${e.last_name}`.trim(),
      changes,
    });
  }

  items.sort((a, b) => a.name.localeCompare(b.name));

  return {
    total: employees.length,
    affected: items.length,
    unchanged: employees.length - items.length,
    byField,
    items,
  };
}
