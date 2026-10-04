// app/tasks-events/PeoplePicker.tsx — pick the responsible people from the employee list; chosen people show as removable chips.
'use client';

import { useMemo, useState } from 'react';
import { Combobox, Field, Icon } from '@/components/ui-system';
import { useEmployees } from '@/hooks/useLookups';

export function PeoplePicker({ value, onChange }: { value: string[]; onChange: (names: string[]) => void }) {
  const employees = useEmployees();
  const [pick, setPick] = useState('');
  const options = useMemo(() => {
    const seen = new Set<string>();
    return employees
      .map(e => (e.full_name || (e as { name?: string }).name || `${e.first_name || ''} ${e.last_name || ''}`).trim())
      .filter(n => n && !seen.has(n) && !!seen.add(n))
      .sort()
      .map(n => ({ value: n, label: n }));
  }, [employees]);

  return (
    <div className="flex flex-col gap-2">
      <Field label="Responsible people" optional>
        <Combobox aria-label="Add a responsible person" value={pick} onValueChange={n => { if (n && !value.includes(n)) onChange([...value, n]); setPick(''); }} options={options.filter(o => !value.includes(o.value))} placeholder="Add a person" searchPlaceholder="Search employees" emptyMessage="No employee matches." />
      </Field>
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="Responsible people">
          {value.map(n => (
            <li key={n} className="inline-flex max-w-full items-center gap-1.5 rounded-control border border-line-subtle bg-surface-subtle py-0.5 pl-2 pr-1 font-sans text-caption text-ink"><span className="truncate">{n}</span><button type="button" aria-label={`Remove ${n}`} className="focus-ring inline-flex size-5 items-center justify-center rounded-full text-ink-muted hover:bg-surface-muted hover:text-ink" onClick={() => onChange(value.filter(x => x !== n))}><Icon name="close" size="xs" /></button></li>
          ))}
        </ul>
      )}
    </div>
  );
}
