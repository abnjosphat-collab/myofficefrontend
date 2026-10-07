// app/maintenance-preview/schedules/page.tsx — recurring work: what, which machines, how often, and the next dates before saving.
'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button, EmptyState, Field, FormDialog, Input, Select, StatusBadge } from '@/components/ui-system';
import { MACHINES, dayOffset, fmt } from '../fixtures';
import { PageFrame } from '../PageFrame';
import { RegisterField } from '../RegisterField';
import { usePreview } from '../store';

const RULES = [{ value: '7', label: 'Every week' }, { value: '14', label: 'Every 2 weeks' }, { value: '30', label: 'Every month' }, { value: '90', label: 'Every 3 months' }];

export default function SchedulesPage() {
  const { schedules, toggleSchedule } = usePreview();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState(''); const [machine, setMachine] = useState(''); const [rule, setRule] = useState('7');
  const preview = [1, 2, 3].map(n => fmt(dayOffset(Number(rule) * n)));
  return (
    <PageFrame title="Schedules" crumbs={[{ label: 'Schedules' }]} action={<Button variant="primary" icon="plus" onClick={() => setCreating(true)}>New schedule</Button>}>
      {schedules.length === 0 ? <EmptyState icon="calendar" title="No recurring schedules yet" description="A schedule raises a work order on its dates." /> : (
        <ul>
          {schedules.map(s => (
            <li key={s.id} className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-line-subtle py-3 first:border-0">
              <div className="min-w-0"><p className="font-sans text-body font-medium text-ink">{s.name}</p><p className="font-sans text-caption text-ink-muted">{s.machines.join(', ')} · {s.rule}</p></div>
              <div className="flex items-center gap-4"><span className="font-sans text-body-sm text-ink-muted tabular">Next {fmt(s.next)}</span>{s.active ? <StatusBadge tone="success">Active</StatusBadge> : <StatusBadge tone="neutral">Paused</StatusBadge>}<Button variant="ghost" size="sm" onClick={() => toggleSchedule(s.id)}>{s.active ? 'Pause' : 'Resume'}</Button></div>
            </li>
          ))}
        </ul>
      )}
      <FormDialog open={creating} onOpenChange={setCreating} size="md" title="New schedule" description="It raises a work order on each date." submitLabel="Save schedule"
        onSubmit={async () => { if (!name.trim() || !machine.trim()) throw new Error('Name the schedule and choose a machine.'); toast.success('Schedule saved (preview only).'); setName(''); setMachine(''); }}>
        <div className="flex flex-col gap-4">
          <Field label="Name" required><Input value={name} onChange={e => setName(e.target.value)} placeholder="Weekly pump inspection" /></Field>
          <RegisterField label="Machine" register="equipment" required items={MACHINES.map(m => ({ key: m.id, label: m.name, meta: `${m.code}, ${m.section}` }))} value={machine} onChange={setMachine} placeholder="Type to search equipment" />
          <Field label="How often"><Select aria-label="How often" value={rule} onValueChange={setRule} options={RULES} /></Field>
          <p className="font-sans text-body-sm text-ink-muted" aria-live="polite">Next dates: <span className="text-ink tabular">{preview.join(', ')}</span></p>
        </div>
      </FormDialog>
    </PageFrame>
  );
}
