// app/maintenance-preview/planner/page.tsx — Planner, pattern G (planning grid, as /shifts and /timesheets): period navigation, a bordered grid with a sticky
// first column, today and weekends tinted, leave shown in the cell (and refused as a drop, with the reason). Dragging is never the only way: Assign works too.
'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button, Field, FormDialog, IconButton, Input, Panel, RecordCard, StatusBadge, cn } from '@/components/ui-system';
import { TONE_CELL } from '@/app/shifts/shiftMeta';
import { PEOPLE, PRIORITY_LABEL, dayOffset, fmt, type Person, type WorkOrder } from '../fixtures';
import { PageFrame, PriorityBadge } from '../parts';
import { RegisterField, personItems } from '../RegisterField';
import { usePreview } from '../store';

const DAYS = 14;
const WD = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const dow = (d: string) => new Date(`${d}T00:00:00`).getDay();
const dnum = (d: string) => new Date(`${d}T00:00:00`).getDate();
const leaveOn = (p: Person, d: string) => (p.leave && d >= p.leave.from && d <= p.leave.to ? p.leave : null);
const jobTone = (p: WorkOrder['priority']) => (p === 'urgent' ? 'danger' : p === 'high' ? 'warning' : 'info') as 'danger' | 'warning' | 'info';

export default function PlannerPage() {
  const { orders, update } = usePreview();
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState<number | null>(null);
  const [published, setPublished] = useState(false);
  const [assigning, setAssigning] = useState<WorkOrder | null>(null);
  const [who, setWho] = useState(''); const [when, setWhen] = useState(dayOffset(0));
  const today = dayOffset(0);
  const days = useMemo(() => Array.from({ length: DAYS }, (_, i) => dayOffset(offset * 7 + i)), [offset]);
  const range = `${fmt(days[0])} to ${fmt(days[DAYS - 1])}`;
  const loose = orders.filter(o => o.status !== 'completed' && o.assignees.length === 0);
  const jobsOf = (p: Person, d: string) => orders.filter(o => o.assignees.includes(p.name) && o.status !== 'completed' && o.due === d);
  const weekLoad = (p: Person) => orders.filter(o => o.assignees.includes(p.name) && o.status !== 'completed' && days.slice(0, 7).includes(o.due)).length;

  const place = (job: WorkOrder, person: Person, day: string) => {
    const l = leaveOn(person, day);
    if (l) { toast.error(`${person.name} is on leave (${l.reason}, ${fmt(l.from)} to ${fmt(l.to)}), so ${job.machine} cannot go on ${fmt(day)}.`); return false; }
    update(job.id, { assignees: [person.name], due: day }); setPublished(false);
    toast.success(`${job.machine} to ${person.name}, ${fmt(day)}.`);
    return true;
  };
  const onDrop = (person: Person, day: string) => { const j = orders.find(o => o.id === dragging); setDragging(null); if (j) place(j, person, day); };
  const submitAssign = async () => {
    const person = PEOPLE.find(p => p.name.toLowerCase() === who.trim().toLowerCase());
    if (!assigning) return;
    if (!person) throw new Error('Choose someone from the employee register.');
    if (!place(assigning, person, when)) throw new Error('That day is not possible. Choose another.');
    setWho('');
  };

  return (
    <PageFrame crumb="Planner" title="Maintenance planner" description="Who is doing what, day by day. Leave is shown, and a job cannot be placed on it." action={<Button variant="primary" onClick={() => { setPublished(true); toast.success('Plan published (preview only).'); }}>{published ? 'Published' : 'Publish plan'}</Button>}>
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <IconButton icon="chevron-left" label="Previous week" variant="outline" onClick={() => setOffset(o => o - 1)} />
          <span className="min-w-52 text-center font-sans text-label font-medium text-ink tabular" aria-live="polite">{range}</span>
          <IconButton icon="chevron-right" label="Next week" variant="outline" onClick={() => setOffset(o => o + 1)} />
          {offset !== 0 && <Button onClick={() => setOffset(0)}>Today</Button>}
        </div>

        <div className="max-w-full overflow-auto rounded-card border border-line bg-surface shadow-card" tabIndex={0} role="region" aria-label="Planner (scrollable)">
          <table className="border-separate border-spacing-0 font-sans text-caption text-ink">
            <caption className="sr-only">Jobs by person and day for {range}. Drop a job on a person and a day to assign it.</caption>
            <thead>
              <tr>
                <th scope="col" className="sticky left-0 top-0 z-20 min-w-48 border-b border-r border-line bg-surface-subtle px-3 py-2 text-left font-sans text-label font-semibold text-ink">Person</th>
                {days.map(d => {
                  const wknd = dow(d) === 0 || dow(d) === 6;
                  return (
                    <th key={d} scope="col" className={cn('min-w-28 border-b border-line px-1 py-1 text-center font-normal', d === today ? 'bg-action-soft text-action' : wknd ? 'bg-surface-muted text-ink-muted' : 'bg-surface-subtle text-ink-muted')}>
                      <span className="block">{WD[dow(d)]}</span><span className="block font-sans text-label font-semibold tabular">{dnum(d)}</span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {PEOPLE.map(p => (
                <tr key={p.id}>
                  <th scope="row" className="sticky left-0 z-10 border-b border-r border-line bg-surface px-3 py-2 text-left font-normal">
                    <span className="block max-w-44 truncate font-sans text-label font-medium text-ink">{p.name}</span>
                    <span className="mt-0.5 flex items-center gap-1.5 text-ink-muted"><StatusBadge tone="neutral">{p.trade}</StatusBadge></span>
                    <span className="mt-0.5 block text-ink-muted tabular">{weekLoad(p)} job{weekLoad(p) === 1 ? '' : 's'} this week</span>
                  </th>
                  {days.map(d => {
                    const l = leaveOn(p, d); const jobs = jobsOf(p, d);
                    return (
                      <td key={d} onDragOver={e => e.preventDefault()} onDrop={() => onDrop(p, d)} className={cn('border-b border-line p-0.5 align-top', d === today && 'bg-action-soft/40', dragging !== null && !l && 'bg-action-soft/60', dragging !== null && l && 'outline outline-1 -outline-offset-2 outline-danger')}>
                        {l ? (
                          <span title={`${l.reason}, ${fmt(l.from)} to ${fmt(l.to)}`} className={cn('flex min-h-11 w-full flex-col items-center justify-center rounded-control border border-dashed px-0.5 py-1 font-semibold leading-none', TONE_CELL.neutral)}>
                            <span>{l.reason.startsWith('Sick') ? 'SL' : 'AL'}</span><span className="mt-0.5 text-[0.625rem] font-normal">Leave</span>
                          </span>
                        ) : jobs.length ? jobs.map(j => (
                          <span key={j.id} title={`${j.machine}, ${j.title} (${PRIORITY_LABEL[j.priority]} priority)`} className={cn('mb-0.5 flex min-h-11 w-full flex-col items-center justify-center rounded-control border px-1 py-1 font-semibold leading-tight', TONE_CELL[jobTone(j.priority)])}>
                            <span className="max-w-full truncate">{j.machine}</span>{(j.priority === 'high' || j.priority === 'urgent') && <span className="text-[0.625rem] font-normal">{PRIORITY_LABEL[j.priority]}</span>}
                          </span>
                        )) : <span className="block min-h-11" />}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <details className="rounded-card border border-line bg-surface px-4 py-3 font-sans text-caption text-ink-muted">
          <summary className="cursor-pointer font-sans text-label font-medium text-ink">Key to the planner</summary>
          <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
            {([['info', 'Job'], ['warning', 'High priority job'], ['danger', 'Urgent job']] as const).map(([t, label]) => <li key={t} className="flex items-center gap-1.5"><span className={cn('inline-flex min-w-9 justify-center rounded-control border px-1 py-0.5 font-semibold', TONE_CELL[t])}>Job</span>{label}</li>)}
            <li className="flex items-center gap-1.5"><span className={cn('inline-flex min-w-9 justify-center rounded-control border border-dashed px-1 py-0.5 font-semibold', TONE_CELL.neutral)}>AL</span>Annual or sick leave (SL): a job cannot be placed here</li>
          </ul>
        </details>
      </div>

      <Panel title="Unassigned jobs" description="Drag a job onto a person and day, or press Assign." bodyClassName="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {loose.length === 0 ? <p className="font-sans text-body-sm text-ink-muted">Everything open has someone.</p> : loose.map(o => (
          <div key={o.id} draggable onDragStart={() => setDragging(o.id)} onDragEnd={() => setDragging(null)} className={cn('cursor-grab active:cursor-grabbing', dragging === o.id && 'opacity-60')}>
            <RecordCard eyebrow={`#${o.number}`} title={o.machine} subtitle={o.title} openLabel={`Assign ${o.machine}, ${o.title}`} onOpen={() => { setAssigning(o); setWhen(o.due); }} status={<PriorityBadge p={o.priority} />} action={<Button size="sm" onClick={() => { setAssigning(o); setWhen(o.due); }}>Assign</Button>} />
          </div>
        ))}
      </Panel>

      <FormDialog open={!!assigning} onOpenChange={o => { if (!o) setAssigning(null); }} size="sm" title="Assign job" description={assigning ? `${assigning.machine}, ${assigning.title}` : undefined} submitLabel="Assign" onSubmit={submitAssign}>
        <div className="flex flex-col gap-4">
          <RegisterField label="Assign to" register="employees" required items={personItems(PEOPLE, fmt)} value={who} onChange={setWho} placeholder="Type to search people" hint="People on leave are shown but cannot be chosen." />
          <Field label="Day"><Input type="date" value={when} onChange={e => setWhen(e.target.value)} /></Field>
        </div>
      </FormDialog>
    </PageFrame>
  );
}
