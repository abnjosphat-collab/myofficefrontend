// components/ui-system/patterns/PeopleChecklist.tsx — tick names from a searchable
// list: for crewing a bulk entry where one-at-a-time picking is the slow part.
// Same PickedPerson shape as PeoplePicker, so callers swap freely.
'use client';

import { useMemo, useState } from 'react';
import { useEmployees, type EmployeeLookup } from '@/hooks/useLookups';
import { recordRecentPerson } from '@/lib/peopleHistory';
import { Checkbox } from '../primitives/Checkbox';
import { Field } from '../primitives/Field';
import { SearchField } from '../primitives/SearchField';
import { Select } from '../overlays/Select';
import { Tag } from '../primitives/Badge';
import { lookupName, type PickedPerson } from './PeoplePicker';

const toPicked = (e: EmployeeLookup): PickedPerson => ({ employee_id: String(e.employee_id), name: lookupName(e) });

export function PeopleChecklist({ label, value, onChange, hint, placeholder }: {
  label: string;
  value: PickedPerson[];
  onChange: (people: PickedPerson[]) => void;
  hint?: string;
  placeholder?: string;
}) {
  const employees = useEmployees();
  const [query, setQuery] = useState('');
  const [section, setSection] = useState('');
  const sections = useMemo(() => [...new Set(employees.map(e => e.section).filter((s): s is string => !!s))].sort(), [employees]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return employees.filter(e =>
      e.employee_id
      && (section === '' || e.section === section)
      && (q === '' || lookupName(e).toLowerCase().includes(q) || String(e.employee_id).toLowerCase().includes(q) || (e.designation ?? '').toLowerCase().includes(q)),
    );
  }, [employees, query, section]);
  const chosen = useMemo(() => new Set(value.map(p => p.employee_id)), [value]);
  const toggle = (e: EmployeeLookup) => {
    const id = String(e.employee_id);
    if (chosen.has(id)) {
      onChange(value.filter(p => p.employee_id !== id));
    } else {
      recordRecentPerson(String(e.id));
      onChange([...value, toPicked(e)]);
    }
  };
  const unchosen = filtered.filter(e => !chosen.has(String(e.employee_id)));
  return (
    <div className="flex flex-col gap-2">
      <Field label={label} optional description={hint}>
        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="min-w-0 flex-1">
              <SearchField label={`Search ${label}`} value={query} onValueChange={setQuery} placeholder={placeholder || 'Search by name, ID or job'} />
            </div>
            {sections.length > 0 && (
              <Field label="Section" optional className="sm:w-44 sm:shrink-0">
                <Select value={section} onValueChange={setSection}
                  options={[{ value: '', label: 'All sections' }, ...sections.map(s => ({ value: s, label: s }))]} />
              </Field>
            )}
          </div>
          <p className="font-sans text-caption text-ink-muted" aria-live="polite">
            {value.length === 0 ? 'Nobody picked yet.' : `${value.length} picked.`}{' '}
            {filtered.length} shown.
            {unchosen.length > 0 && (
              <> <button type="button" className="font-medium text-action underline" onClick={() => {
                unchosen.forEach(e => recordRecentPerson(String(e.id)));
                onChange([...value, ...unchosen.map(toPicked)]);
              }}>Select all {unchosen.length}</button></>
            )}
          </p>
          {value.length > 0 && (
            <ul className="flex flex-wrap gap-1.5" aria-label={`${label}, picked`}>
              {value.map(p => (
                <li key={p.employee_id}><Tag onRemove={() => onChange(value.filter(x => x.employee_id !== p.employee_id))}>{p.name}</Tag></li>
              ))}
            </ul>
          )}
          {filtered.length === 0 ? (
            <p className="font-sans text-body-sm text-ink-muted">No employee matches.</p>
          ) : (
            <ul className="flex max-h-64 flex-col gap-1 overflow-y-auto" aria-label={`${label}, choices`}>
              {filtered.map(e => (
                <li key={e.employee_id}>
                  <Checkbox
                    label={lookupName(e)}
                    description={[e.employee_id, e.designation].filter(Boolean).join(' · ')}
                    checked={chosen.has(String(e.employee_id))}
                    onChange={() => toggle(e)}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </Field>
    </div>
  );
}
