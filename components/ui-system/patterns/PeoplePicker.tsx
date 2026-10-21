// components/ui-system/patterns/PeoplePicker.tsx — the one employee picker. Every
// employee search in the app (forms, filters, crew lists) goes through this file so
// the matching, labelling and empty states stay identical everywhere.
//
// Two shapes, one option list:
// - PersonPicker: one person. The caller owns the Field (label, required, error) and
//   fills its own form fields from the picked employee record.
// - PeoplePicker: several people as removable chips. The caller owns nothing but the
//   value; the label, hint and chips render here.
'use client';

import { useMemo, useState } from 'react';
import { Tag } from '../primitives/Badge';
import { Field } from '../primitives/Field';
import { Combobox } from '../overlays/Combobox';
import { useEmployees, type EmployeeLookup } from '@/hooks/useLookups';
import { readRecentPeople, recordRecentPerson } from '@/lib/peopleHistory';

/** How one employee reads in every picker: full name, then first + last, then the ID. */
export function lookupName(e: EmployeeLookup): string {
  return ((e.full_name || (e.name as string) || `${e.first_name || ''} ${e.last_name || ''}`).trim()
    || String(e.employee_id || e.id || 'Employee'));
}

/** A register segment worth showing: blank and dot-only numbers (junk typed on the register) read as missing. */
function cleanSegment(raw: string | null | undefined): string {
  const text = (raw ?? '').trim();
  return /^\.+$/.test(text) ? '' : text;
}

/** One description line under the name: ID and designation, skipping blanks. */
function lookupDescription(e: EmployeeLookup): string {
  return [cleanSegment(e.employee_id), cleanSegment(e.designation || e.position)].filter(s => s !== '').join(' · ');
}

export interface EmployeeOption {
  /** The register row id — stable even when two people share a name. */
  id: string;
  label: string;
  description: string;
  employee: EmployeeLookup;
}

/**
 * The employee register as picker options, with the lookups every picker needs.
 * `exclude` hides row ids already chosen elsewhere (the second picker in a pair).
 */
export function useEmployeeOptions(exclude?: string[]): { options: EmployeeOption[]; find: (id: string) => EmployeeLookup | null } {
  const employees = useEmployees();
  const options = useMemo(() => {
    const hidden = new Set(exclude ?? []);
    return employees
      .filter(e => !hidden.has(String(e.id)))
      .map(e => ({ id: String(e.id), label: lookupName(e), description: lookupDescription(e), employee: e }));
  }, [employees, exclude]);
  const find = (id: string): EmployeeLookup | null =>
    employees.find(x => String(x.id) === id) ?? null;
  return { options, find };
}

const SEARCH_PLACEHOLDER = 'Name or employee ID';
const EMPTY_MESSAGE = 'No employee matches.';

/**
 * Which option row a stored form value re-selects: the stored employee ID pins it
 * when two people share a name (matched against the personnel number or, for forms
 * that file the register row id, the row id), otherwise the stored name matches by
 * label.
 */
export function resolvePersonId(options: EmployeeOption[], name: string, employeeId?: string): string {
  if (employeeId) return options.find(o => o.employee.employee_id === employeeId || o.id === employeeId)?.id ?? options.find(o => o.label === name)?.id ?? '';
  return options.find(o => o.label === name)?.id ?? '';
}

/**
 * Pick one person. `name` is what the caller's form already holds (it shows as the
 * placeholder and re-selects the matching row); `employeeId` pins the match when
 * two people share a name. The caller fills its own fields from `onPick`.
 */
export function PersonPicker({ name, employeeId, onPick, label, placeholder, disabled, excludeIds, className, clearLabel, autoFocusSearch }: {
  name?: string;
  employeeId?: string;
  onPick: (employee: EmployeeLookup | null) => void;
  label: string;
  placeholder?: string;
  disabled?: boolean;
  excludeIds?: string[];
  className?: string;
  clearLabel?: string;
  /** Open on mount with the caret in the search box. The dialog leaves focus alone while this is set. */
  autoFocusSearch?: boolean;
}) {
  const { options, find } = useEmployeeOptions(excludeIds);
  const shown = name ?? '';
  const value = resolvePersonId(options, shown, employeeId);
  const combo = useMemo(() => options.map(o => ({ value: o.id, label: o.label, description: o.description })), [options]);
  // Recently picked people first, resolved against the live options so archived or
  // departed people never resurface.
  const recent = useMemo(() => {
    const order = new Map(readRecentPeople(8).map((id, i) => [id, i] as const));
    return combo.filter(o => order.has(o.value)).sort((a, b) => order.get(a.value)! - order.get(b.value)!);
  }, [combo]);
  return (
    <Combobox aria-label={label} value={value} onValueChange={id => {
        const picked = id ? find(id) : null;
        if (picked) recordRecentPerson(String(picked.id));
        onPick(picked);
      }}
      options={combo} recentOptions={recent} placeholder={shown || placeholder || 'Search employees'} autoFocusSearch={autoFocusSearch}
      searchPlaceholder={SEARCH_PLACEHOLDER} emptyMessage={EMPTY_MESSAGE} disabled={disabled} className={className} clearLabel={clearLabel} />
  );
}

export interface PickedPerson { employee_id: string; name: string }

/**
 * Pick several people; the chosen ones show as removable chips. `single` hides the
 * search once one person is chosen (a filter scoped to one person).
 */
export function PeoplePicker({ label, value, onChange, hint, single = false, placeholder }: {
  label: string;
  value: PickedPerson[];
  onChange: (people: PickedPerson[]) => void;
  hint?: string;
  single?: boolean;
  placeholder?: string;
}) {
  const employees = useEmployees();
  const [pick, setPick] = useState('');
  const options = useMemo(() => {
    const chosen = new Set(value.map(p => p.employee_id));
    return employees
      .filter(e => e.employee_id && !chosen.has(e.employee_id))
      .map(e => ({ value: String(e.employee_id), label: lookupName(e), description: lookupDescription(e) }));
  }, [employees, value]);
  const recent = useMemo(() => {
    const order = new Map(readRecentPeople(8).map((id, i) => [id, i] as const));
    const byRow = new Map(employees.map(e => [String(e.id), e] as const));
    return [...order.keys()]
      .map(id => byRow.get(id))
      .filter((e): e is EmployeeLookup => !!e?.employee_id)
      .filter(e => options.some(o => o.value === String(e.employee_id)))
      .map(e => ({ value: String(e.employee_id), label: lookupName(e), description: lookupDescription(e) }));
  }, [employees, options]);
  const add = (id: string) => {
    const o = options.find(x => x.value === id);
    if (o) {
      const emp = employees.find(e => String(e.employee_id) === id);
      if (emp) recordRecentPerson(String(emp.id));
      onChange(single ? [{ employee_id: id, name: o.label }] : [...value, { employee_id: id, name: o.label }]);
    }
    setPick('');
  };
  return (
    <div className="flex flex-col gap-2">
      {!(single && value.length > 0) && (
      <Field label={label} optional description={hint}>
        <Combobox aria-label={single ? label : `Add to ${label}`} value={pick} onValueChange={add}
          options={options} recentOptions={recent} placeholder={placeholder || 'Search the employee list'}
          searchPlaceholder={SEARCH_PLACEHOLDER} emptyMessage={EMPTY_MESSAGE} />
      </Field>
      )}
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label={label}>
          {value.map(p => (
            <li key={p.employee_id}><Tag onRemove={() => onChange(value.filter(x => x.employee_id !== p.employee_id))}>{p.name}</Tag></li>
          ))}
        </ul>
      )}
    </div>
  );
}
