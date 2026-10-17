// app/tasks-events/PeoplePicker.tsx — the shared PeoplePicker adapted to this
// module's API, which stores responsible people as plain names: names in and out,
// employee IDs resolved inside for matching.
'use client';

import { useMemo } from 'react';
import { PeoplePicker as SharedPicker, lookupName } from '@/components/ui-system';
import { useEmployees } from '@/hooks/useLookups';

export function PeoplePicker({ value, onChange }: { value: string[]; onChange: (names: string[]) => void }) {
  const employees = useEmployees();
  const picks = useMemo(() => {
    const seen = new Set<string>();
    return value
      .filter(n => n && !seen.has(n) && !!seen.add(n))
      .map(n => ({ employee_id: employees.find(x => lookupName(x) === n)?.employee_id || n, name: n }));
  }, [employees, value]);
  return (
    <SharedPicker label="Responsible people" value={picks} placeholder="Add a person"
      onChange={ps => onChange(ps.map(p => p.name))} />
  );
}
