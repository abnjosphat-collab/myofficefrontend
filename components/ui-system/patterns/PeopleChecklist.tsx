// components/ui-system/patterns/PeopleChecklist.tsx — tick names from a searchable
// list: for crewing a bulk entry where one-at-a-time picking is the slow part.
// Same PickedPerson shape as PeoplePicker, so callers swap freely. The list, search
// and chips are the shared OptionChecklist; only the employee source, the section
// pre-filter and recent-recording are people-specific.
'use client';

import { useMemo, useState } from 'react';
import { useEmployees, type EmployeeLookup } from '@/hooks/useLookups';
import { recordRecentPerson } from '@/lib/peopleHistory';
import { Field } from '../primitives/Field';
import { Select } from '../overlays/Select';
import { OptionChecklist, type ChecklistOption } from './OptionChecklist';
import { lookupName, type PickedPerson } from './PeoplePicker';
import { NameTypeahead } from './NameTypeahead';

const toPicked = (e: EmployeeLookup): PickedPerson => ({ employee_id: String(e.employee_id), name: lookupName(e) });
const toOption = (e: EmployeeLookup): ChecklistOption => ({ value: String(e.employee_id), label: lookupName(e), description: [e.employee_id, e.designation].filter(Boolean).join(' · ') });

export function PeopleChecklist({ label, value, onChange, hint, placeholder, department, autocomplete = false, keepFocusOnPick = false }: {
  label: string;
  value: PickedPerson[];
  onChange: (people: PickedPerson[]) => void;
  hint?: string;
  placeholder?: string;
  department?: string | null;
  /** Suggest unselected people inline; Tab adds one and advances, Enter adds and stays. */
  autocomplete?: boolean;
  /** Keep autocomplete focused for the next person; empty Tab still advances. */
  keepFocusOnPick?: boolean;
}) {
  const employees = useEmployees(department);
  const [section, setSection] = useState('');
  const sections = useMemo(() => [...new Set(employees.map(e => e.section).filter((s): s is string => !!s))].sort(), [employees]);
  const filtered = useMemo(() => employees.filter(e => e.employee_id && (section === '' || e.section === section)), [employees, section]);
  const options = useMemo(() => filtered.map(toOption), [filtered]);
  const ids = useMemo(() => value.map(p => p.employee_id), [value]);
  const onIds = (next: string[]) => {
    const prev = new Set(ids);
    const added = next.filter(id => !prev.has(id));
    added.forEach(id => { const e = employees.find(x => String(x.employee_id) === id); if (e) recordRecentPerson(String(e.id)); });
    onChange(next.flatMap(id => {
      const kept = value.find(p => p.employee_id === id);
      if (kept) return [kept];
      const e = employees.find(x => String(x.employee_id) === id);
      return e ? [toPicked(e)] : [];
    }));
  };
  return (
    <div className="flex flex-col gap-2">
      <Field label={label} optional description={hint}>
        <OptionChecklist
          label={label} options={options} value={ids} onChange={onIds}
          searchPlaceholder={placeholder || 'Search by name, ID or job'} emptyText="No employee matches."
          renderSearch={autocomplete ? ({ value: text, onValueChange }) => (
            <NameTypeahead aria-label={label} text={text} onTextChange={onValueChange} keepFocusOnPick={keepFocusOnPick}
              options={options.filter(o => !ids.includes(o.value)).map(o => ({ ...o, keywords: [o.value, o.description ?? ''] }))}
              onChoose={choice => { onIds([...ids, choice.value]); onValueChange(''); }}
              placeholder={placeholder || 'Type a name or ID; Tab adds the suggestion'} />
          ) : undefined}
          labelOf={id => value.find(p => p.employee_id === id)?.name ?? id}
          searchAside={sections.length > 0 && (
            <Field label="Section" optional className="sm:w-44 sm:shrink-0">
              <Select value={section} onValueChange={setSection}
                options={[{ value: '', label: 'All sections' }, ...sections.map(s => ({ value: s, label: s }))]} />
            </Field>
          )}
        />
      </Field>
    </div>
  );
}
