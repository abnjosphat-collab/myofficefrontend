// app/maintenance/MachinePicker.tsx — one or more machines for a job or a schedule. They are kept as a comma-separated list (the
// stored format), shown as removable chips; add one from the equipment register or type a name that is not on it. One work order is
// raised for each machine.
'use client';

import { useMemo, useState } from 'react';
import { Button, Combobox, Field, Icon, Input } from '@/components/ui-system';
import { useEquipment } from '@/hooks/useLookups';
import { machinesOf } from './helpers';

export function MachinePicker({ value, onChange, error }: { value: string; onChange: (value: string) => void; error?: string }) {
  const equipment = useEquipment();
  const [typed, setTyped] = useState('');
  const machines = machinesOf(value);
  const options = useMemo(() => {
    const chosen = new Set(machines.map(m => m.toLowerCase()));
    return equipment.filter(e => !chosen.has((e.name || e.equipment_id || '').toLowerCase())).slice(0, 500)
      .map(e => ({ value: String(e.id), label: e.name || e.equipment_id || 'Equipment', description: [e.equipment_id, e.department, e.location, e.status].filter(Boolean).join(' · ') }));
  }, [equipment, machines]);
  const set = (list: string[]) => onChange(list.join(', '));
  const add = (name: string) => { const n = name.replace(/,/g, ' ').trim(); if (n && !machines.some(m => m.toLowerCase() === n.toLowerCase())) set([...machines, n]); };
  const fromRegister = (id: string) => { const e = equipment.find(x => String(x.id) === id); if (e) add(e.name || e.equipment_id || ''); };
  return (
    <div className="flex flex-col gap-2">
      <Field label="Add a machine from the equipment register" required error={error} description="Add more than one to raise a work order for each.">
        <Combobox aria-label="Add a machine from the equipment register" value="" onValueChange={fromRegister} options={options} placeholder="Search equipment" />
      </Field>
      <div className="flex items-end gap-2">
        <Field label="Or type a machine name" optional className="flex-1"><Input value={typed} onChange={e => setTyped(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(typed); setTyped(''); } }} placeholder="Not on the register" /></Field>
        <Button icon="plus" disabled={!typed.trim()} onClick={() => { add(typed); setTyped(''); }}>Add</Button>
      </div>
      {machines.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="Machines">
          {machines.map(m => (
            <li key={m} className="inline-flex max-w-full items-center gap-1.5 rounded-control border border-line-subtle bg-surface-subtle py-0.5 pl-2 pr-1 font-sans text-caption text-ink">
              <span className="truncate">{m}</span>
              <button type="button" aria-label={`Remove ${m}`} onClick={() => set(machines.filter(x => x !== m))} className="focus-ring inline-flex size-5 items-center justify-center rounded-xs text-ink-muted hover:bg-surface-muted hover:text-ink"><Icon name="close" size="xs" /></button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
