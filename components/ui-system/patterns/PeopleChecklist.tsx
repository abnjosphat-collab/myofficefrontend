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




export function PeopleChecklist({ label, value, onChange, hint, placeholder, department, autocomplete = false, keepFocusOnPick = false, includeWithoutMineNumber = false }: {
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
  includeWithoutMineNumber?: boolean;
}) {
  const employees = useEmployees(department);
  const keyOf = (e: EmployeeLookup) => e.employee_id || (includeWithoutMineNumber && e.id != null ? `row:${e.id}` : '');
  const personOf = (e: EmployeeLookup): PickedPerson => ({ employee_id: keyOf(e), name: lookupName(e) });
  const optionOf = (e: EmployeeLookup): ChecklistOption => ({
    value: keyOf(e), label: lookupName(e), description: [e.employee_id || 'No mine number', e.designation].filter(Boolean).join(' · '),
  });
  const [section, setSection] = useState('');
  const sections = useMemo(() => [...new Set(employees.map(e => e.section).filter((s): s is string => !!s))].sort(), [employees]);
  const options = employees.filter(e => keyOf(e) && (section === '' || e.section === section)).map(optionOf);
  const ids = useMemo(() => value.map(p => p.employee_id), [value]);
  const onIds = (next: string[]) => {
    const prev = new Set(ids);
    const added = next.filter(id => !prev.has(id));
    added.forEach(id => { const e = employees.find(x => keyOf(x) === id); if (e) recordRecentPerson(String(e.id)); });
    onChange(next.flatMap(id => {
      const kept = value.find(p => p.employee_id === id);
      if (kept) return [kept];
      const e = employees.find(x => keyOf(x) === id);
      return e ? [personOf(e)] : [];
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
