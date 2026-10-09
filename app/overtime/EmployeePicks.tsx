// app/overtime/EmployeePicks.tsx — pick several employees from the employee list; the chosen ones show as removable chips.
// Used to scope the register to certain people and to enter the same overtime for a crew.
'use client';

import { useMemo, useState } from 'react';
import { Combobox, Field, Tag } from '@/components/ui-system';
import { useEmployees } from '@/hooks/useLookups';

export interface PickedPerson { employee_id: string; name: string }

export function EmployeePicks({ label, value, onChange, hint }: { label: string; value: PickedPerson[]; onChange: (people: PickedPerson[]) => void; hint?: string }) {
  const employees = useEmployees();
  const [pick, setPick] = useState('');
  const options = useMemo(() => {
    const chosen = new Set(value.map(p => p.employee_id));
    return employees
      .filter(e => e.employee_id && !chosen.has(e.employee_id))
      .map(e => ({ value: String(e.employee_id), label: (e.full_name || e.name || `${e.first_name || ''} ${e.last_name || ''}`).trim() || String(e.employee_id), description: [e.employee_id, e.designation].filter(Boolean).join(' · ') }));
  }, [employees, value]);
  const add = (id: string) => {
    const o = options.find(x => x.value === id);
    if (o) onChange([...value, { employee_id: id, name: o.label }]);
    setPick('');
  };
  return (
    <div className="flex flex-col gap-2">
      <Field label={label} optional description={hint}>
        <Combobox aria-label={`Add to ${label}`} value={pick} onValueChange={add} options={options} placeholder="Search the employee list" />
      </Field>
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
