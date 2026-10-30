// components/ui-system/patterns/PeoplePicker.tsx — the one employee picker. Every
// employee search in the app (forms, filters, crew lists) goes through this file so
// the matching, labelling and empty states stay identical everywhere.
//
// Every shape is typed straight into the box (NameTypeahead): the rest of the
// matching name is written in after the caret and Tab takes it.
// - PersonPicker: one person from the register. The caller owns the Field (label,
//   required, error) and fills its own form fields from the picked employee record.
//   Typed text that names nobody is put back when the box is left.
// - PeoplePicker: several people as removable chips. The caller owns nothing but the
//   value; the label, hint and chips render here.
// - PersonNameInput: a name as text, suggested from the register, so someone not on
//   it (a contractor, a visitor) can still be written in. `multiple` takes a comma list.
//
// Each picker takes an optional `department` to suggest from that register (Mining)
// instead of Engineering.
'use client';

import { useMemo, useState } from 'react';
import { Tag } from '../primitives/Badge';
import { Field } from '../primitives/Field';
import { NameTypeahead } from './NameTypeahead';
import type { NameSuggestion } from './nameMatch';
import { useEmployees, type EmployeeLookup } from '@/hooks/useLookups';
import { readRecentPeople, recordRecentPerson } from '@/lib/peopleHistory';
import { formatMineNumber } from '@/lib/registerMatch';

/** How one employee reads in every picker: full name, then first + last, then the ID. */
export function lookupName(e: EmployeeLookup): string {
  const named = (e.full_name || (e.name as string) || `${e.first_name || ''} ${e.last_name || ''}`).trim();
  if (named) return named;
  if (String(e.employee_id ?? '').trim()) return formatMineNumber(e.employee_id);
  return String(e.id || 'Employee');
}

/** A register segment worth showing: blank and dot-only numbers (junk typed on the register) read as missing. */
function cleanSegment(raw: string | null | undefined): string {
  const text = (raw ?? '').trim();
  return /^\.+$/.test(text) ? '' : text;
}

/** One description line under the name: ID and designation, skipping blanks. */
function lookupDescription(e: EmployeeLookup): string {
  const id = String(e.employee_id ?? '').trim();
  return [id ? formatMineNumber(e.employee_id) : '', cleanSegment(e.designation || e.position)].filter(s => s !== '').join(' · ');
}

/** The register row as a typed-name suggestion: found by name or mine number. */
function suggestionOf(e: EmployeeLookup, value = String(e.id)): NameSuggestion {
  const id = cleanSegment(String(e.employee_id ?? ''));
  return { value, label: lookupName(e), description: lookupDescription(e), keywords: id ? [id] : undefined };
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
 * `department` reads that register (Mining) instead of Engineering.
 */
export function useEmployeeOptions(exclude?: string[], department?: string | null): { options: EmployeeOption[]; find: (id: string) => EmployeeLookup | null } {
  const employees = useEmployees(department);
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

const EMPTY_MESSAGE = 'No employee matches.';

/** Recently picked register rows, newest first; re-read after each pick. */
function useRecentPeople(): [string[], () => void] {
  const [recent, setRecent] = useState<string[]>(() => readRecentPeople(8));
  return [recent, () => setRecent(readRecentPeople(8))];
}

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
 * Pick one person. `name` is what the caller's form already holds (the box shows it);
 * the caller fills its own fields from `onPick`. Emptying the box and leaving it
 * picks nobody (onPick(null)); text that names nobody is put back on leaving.
 * `department` reads that register (Mining) instead of Engineering.
 */
export function PersonPicker({ name, onPick, label, placeholder, disabled, excludeIds, className, autoFocusSearch, department }: {
  name?: string;
  /** Kept for callers that pin a duplicate name; the box shows the name, so it no longer changes what is drawn. */
  employeeId?: string;
  onPick: (employee: EmployeeLookup | null) => void;
  label: string;
  placeholder?: string;
  disabled?: boolean;
  excludeIds?: string[];
  className?: string;
  /** Kept for callers; an emptied box always means nobody. */
  clearLabel?: string;
  /** Start with the caret in the box. The dialog leaves focus alone while this is set. */
  autoFocusSearch?: boolean;
  /** Read that register (Mining) instead of Engineering. */
  department?: string | null;
}) {
  const { options, find } = useEmployeeOptions(excludeIds, department);
  const suggestions = useMemo(() => options.map(o => suggestionOf(o.employee)), [options]);
  const [recent, refreshRecent] = useRecentPeople();
  const [draft, setDraft] = useState<string | null>(null);
  const shown = name ?? '';
  const pick = (picked: EmployeeLookup | null) => {
    if (picked) { recordRecentPerson(String(picked.id)); refreshRecent(); }
    setDraft(null);
    onPick(picked);
  };
  const leave = () => {
    if (draft === null) return;
    const typed = draft.trim().toLowerCase();
    if (typed === '') { if (shown) pick(null); else setDraft(null); return; }
    // Typed out in full: the one person with exactly that name counts as picked.
    const exact = suggestions.filter(s => s.label.toLowerCase() === typed);
    if (exact.length === 1) pick(find(exact[0].value));
    else setDraft(null);
  };
  return (
    <NameTypeahead aria-label={label} text={draft ?? shown} onTextChange={setDraft} options={suggestions} recent={recent}
      onChoose={s => pick(find(s.value))} onBlur={leave} emptyMessage={EMPTY_MESSAGE}
      placeholder={placeholder || 'Type a name or employee ID'} disabled={disabled} autoFocusSearch={autoFocusSearch} className={className} />
  );
}

export interface PickedPerson { employee_id: string; name: string }

/**
 * Pick several people; the chosen ones show as removable chips. `single` hides the
 * box once one person is chosen (a filter scoped to one person).
 * `department` reads that register (Mining) instead of Engineering.
 */
export function PeoplePicker({ label, value, onChange, hint, single = false, placeholder, department }: {
  label: string;
  value: PickedPerson[];
  onChange: (people: PickedPerson[]) => void;
  hint?: string;
  single?: boolean;
  placeholder?: string;
  /** Read that register (Mining) instead of Engineering. */
  department?: string | null;
}) {
  const employees = useEmployees(department);
  const [text, setText] = useState('');
  const [recent, refreshRecent] = useRecentPeople();
  const options = useMemo(() => {
    const chosen = new Set(value.map(p => p.employee_id));
    return employees.filter(e => e.employee_id && !chosen.has(e.employee_id)).map(e => suggestionOf(e));
  }, [employees, value]);
  const add = (rowId: string) => {
    const emp = employees.find(e => String(e.id) === rowId);
    if (emp?.employee_id) {
      recordRecentPerson(rowId); refreshRecent();
      const person = { employee_id: String(emp.employee_id), name: lookupName(emp) };
      onChange(single ? [person] : [...value, person]);
    }
    setText('');
  };
  return (
    <div className="flex flex-col gap-2">
      {!(single && value.length > 0) && (
      <Field label={label} optional description={hint}>
        <NameTypeahead aria-label={single ? label : `Add to ${label}`} text={text} onTextChange={setText} options={options} recent={recent}
          onChoose={s => add(s.value)} emptyMessage={EMPTY_MESSAGE} placeholder={placeholder || 'Type a name or employee ID'} />
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

/**
 * A name as text, suggested from the register as it is typed. `onPick` also hands
 * over the register record when a suggestion is taken (to fill an ID beside it).
 * `multiple` takes a comma-separated list and completes the last name.
 * `department` reads that register (Mining) instead of Engineering.
 */
export function PersonNameInput({ value, onChange, onPick, placeholder, disabled, multiple, className, department, 'aria-label': ariaLabel }: {
  value: string;
  onChange: (name: string) => void;
  onPick?: (employee: EmployeeLookup) => void;
  placeholder?: string;
  disabled?: boolean;
  multiple?: boolean;
  className?: string;
  /** Read that register (Mining) instead of Engineering. */
  department?: string | null;
  'aria-label'?: string;
}) {
  const employees = useEmployees(department);
  const options = useMemo(() => employees.map(e => suggestionOf(e)), [employees]);
  const [recent, refreshRecent] = useRecentPeople();
  return (
    <NameTypeahead aria-label={ariaLabel} text={value} onTextChange={onChange} options={options} recent={recent} multiple={multiple}
      onChoose={(s, next) => {
        onChange(next);
        recordRecentPerson(s.value); refreshRecent();
        const emp = employees.find(e => String(e.id) === s.value);
        if (emp) onPick?.(emp);
      }}
      placeholder={placeholder || 'Type a name'} disabled={disabled} className={className} />
  );
}
