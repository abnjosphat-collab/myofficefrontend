// app/maintenance-preview/schedules/page.tsx — recurring work as cards: the next date is the focal point, with the following dates on a line.
'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button, EmptyState, Field, FormDialog, Input, Select } from '@/components/ui-system';
import { Reveal, StatusDot } from '../cards';
import { MACHINES, dayOffset, fmt, fmtLong, rel, type Schedule } from '../fixtures';
import { PageFrame } from '../PageFrame';
import { RegisterField } from '../RegisterField';
import { usePreview } from '../store';

const RULES = [{ value: '7', label: 'Every week' }, { value: '14', label: 'Every 2 weeks' }, { value: '30', label: 'Every month' }, { value: '90', label: 'Every 3 months' }];

/** The next dates on a proportional line, so a weekly job and a quarterly one look different at a glance. */
function DateLine({ dates, muted }: { dates: string[]; muted?: boolean }) {
  const t = dates.map(d => new Date(`${d}T00:00:00`).getTime());
  const span = Math.max(1, t[t.length - 1] - t[0]);
  return (
    <div role="img" aria-label={`Next dates: ${dates.map(fmt).join(', ')}`} className="relative mt-1 h-3">
      <span aria-hidden className="absolute inset-x-1 top-1/2 h-px bg-line" />
      {t.map((x, i) => <span key={i} aria-hidden className={`absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border ${muted ? 'border-line-strong bg-surface' : i === 0 ? 'border-action bg-action' : 'border-action bg-surface'}`} style={{ left: `calc(${((x - t[0]) / span) * 100}% * 0.96 + 2%)` }} />)}
    </div>
  );
}

function ScheduleCard({ s, index, onToggle }: { s: Schedule; index: number; onToggle: () => void }) {
  return (
    <Reveal index={index}>
      <article className={`mp-card flex h-full flex-col gap-4 rounded-card border border-line-subtle bg-surface p-5 ${s.active ? '' : 'opacity-80'}`}>
        <div className="flex items-center justify-between"><StatusDot tone={s.active ? 'success' : 'neutral'}>{s.active ? 'Active' : 'Paused'}</StatusDot><Button variant="ghost" size="sm" onClick={onToggle}>{s.active ? 'Pause' : 'Resume'}</Button></div>
        <div>
          <h3 className="font-display text-title text-ink">{s.name}</h3>
          <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Machines">{s.machines.map(m => <li key={m} className="rounded-full bg-surface-muted px-2.5 py-0.5 font-sans text-caption text-ink">{m}</li>)}</ul>
          <p className="mt-2 font-sans text-body-sm text-ink-muted">{s.rule}</p>
        </div>
        <div className="mt-auto flex flex-col gap-1.5">
          <span className="font-sans text-caption text-ink-muted">Next</span>
          <p className="flex flex-wrap items-baseline gap-x-2"><span className="font-display text-metric tabular text-ink">{fmtLong(s.next)}</span><span className="font-sans text-body-sm text-ink-muted">{rel(s.next)}</span></p>
          <DateLine dates={s.dates} muted={!s.active} />
          <p className="mt-1 font-sans text-caption text-ink-muted">Raises {s.machines.length} work order{s.machines.length === 1 ? '' : 's'} each time</p>
        </div>
      </article>
    </Reveal>
  );
}

export default function SchedulesPage() {
  const { schedules, toggleSchedule } = usePreview();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState(''); const [machine, setMachine] = useState(''); const [rule, setRule] = useState('7');
  const preview = [1, 2, 3].map(n => dayOffset(Number(rule) * n));
  return (
    <PageFrame title="Schedules" crumbs={[{ label: 'Schedules' }]} action={<Button variant="primary" icon="plus" onClick={() => setCreating(true)}>New schedule</Button>}>
      {schedules.length === 0 ? <EmptyState icon="calendar" title="No recurring schedules yet" description="A schedule raises a work order on its dates." /> : (
        <ul aria-label="Schedules" className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">{schedules.map((s, i) => <li key={s.id}><ScheduleCard s={s} index={i} onToggle={() => toggleSchedule(s.id)} /></li>)}</ul>
      )}
      <FormDialog open={creating} onOpenChange={setCreating} size="md" title="New schedule" description="It raises a work order on each date." submitLabel="Save schedule"
        onSubmit={async () => { if (!name.trim() || !machine.trim()) throw new Error('Name the schedule and choose a machine.'); toast.success('Schedule saved (preview only).'); setName(''); setMachine(''); }}>
        <div className="flex flex-col gap-4">
          <Field label="Name" required><Input value={name} onChange={e => setName(e.target.value)} placeholder="Weekly pump inspection" /></Field>
          <RegisterField label="Machine" register="equipment" required items={MACHINES.map(m => ({ key: m.id, label: m.name, meta: `${m.code}, ${m.section}` }))} value={machine} onChange={setMachine} placeholder="Type to search equipment" />
          <Field label="How often"><Select aria-label="How often" value={rule} onValueChange={setRule} options={RULES} /></Field>
          <div className="rounded-card bg-surface-subtle p-3" aria-live="polite"><p className="font-sans text-caption text-ink-muted">Next dates</p><p className="font-display text-title tabular text-ink">{preview.map(fmtLong).join(' · ')}</p><DateLine dates={preview} /></div>
        </div>
      </FormDialog>
    </PageFrame>
  );
}
