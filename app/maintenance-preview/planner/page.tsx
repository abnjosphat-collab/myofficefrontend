// app/maintenance-preview/planner/page.tsx — people against days. Today is marked, leave is a hatched band that refuses a drop and says why,
// and the unassigned jobs sit on a shelf below. Dragging is never the only way: every job also has an Assign button.
'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button, Field, FormDialog, IconButton, Input, Segmented, cn } from '@/components/ui-system';
import { Avatar, Meter, Reveal, StatusDot } from '../cards';
import { PEOPLE, dayOffset, fmt, type Person, type WorkOrder } from '../fixtures';
import { PageFrame } from '../PageFrame';
import { RegisterField, personItems } from '../RegisterField';
import { usePreview } from '../store';

const iso = (offset: number) => dayOffset(offset);
const weekday = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'short' });
const dayNum = (d: string) => new Date(`${d}T00:00:00`).getDate();
const accent = (p: WorkOrder['priority']) => (p === 'urgent' ? 'before:bg-danger' : p === 'high' ? 'before:bg-warning' : 'before:bg-transparent');
const leaveOn = (p: Person, d: string) => (p.leave && d >= p.leave.from && d <= p.leave.to ? p.leave : null);

export default function PlannerPage() {
  const { orders, update } = usePreview();
  const [weekOffset, setWeekOffset] = useState(0);
  const [dragging, setDragging] = useState<number | null>(null);
  const [shake, setShake] = useState<string | null>(null);
  const [published, setPublished] = useState(false);
  const [assigning, setAssigning] = useState<WorkOrder | null>(null);
  const [who, setWho] = useState(''); const [when, setWhen] = useState(iso(0));
  const [dayView, setDayView] = useState(iso(0));
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => iso(weekOffset * 7 + i)), [weekOffset]);
  const today = iso(0);
  const loose = orders.filter(o => o.status !== 'completed' && o.assignees.length === 0);
  const jobsOf = (p: Person, d?: string) => orders.filter(o => o.assignees.includes(p.name) && o.status !== 'completed' && (d ? o.due === d : days.includes(o.due)));

  const place = (job: WorkOrder, person: Person, day: string) => {
    const l = leaveOn(person, day);
    if (l) {
      const key = `${person.id}-${day}`; setShake(key); setTimeout(() => setShake(null), 220);
      toast.error(`${person.name} is on leave (${l.reason}, ${fmt(l.from)} to ${fmt(l.to)}), so ${job.machine} cannot go on ${fmt(day)}.`);
      return false;
    }
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

  const Chip = ({ job }: { job: WorkOrder }) => (
    <span className={cn('relative mb-1 block truncate rounded-control bg-surface py-1 pl-2.5 pr-2 font-sans text-caption text-ink shadow-xs before:absolute before:inset-y-1 before:left-1 before:w-[3px] before:rounded-full', accent(job.priority))} title={`${job.machine}, ${job.title}`}>{job.machine}</span>
  );

  return (
    <PageFrame title="Planner" crumbs={[{ label: 'Planner' }]} action={<Button variant="primary" onClick={() => { setPublished(true); toast.success('Week published (preview only).'); }}>{published ? 'Published' : 'Publish week'}</Button>}>
      <div className="flex flex-wrap items-center gap-2">
        <IconButton icon="chevron-left" label="Previous week" onClick={() => setWeekOffset(w => w - 1)} />
        <p className="min-w-40 text-center font-display text-title tabular text-ink">{fmt(days[0])} to {fmt(days[6])}</p>
        <IconButton icon="chevron-right" label="Next week" onClick={() => setWeekOffset(w => w + 1)} />
        {weekOffset !== 0 && <Button variant="ghost" size="sm" onClick={() => setWeekOffset(0)}>Today</Button>}
      </div>

      {/* Week grid, from lg up */}
      <div className="mp-card hidden overflow-x-auto rounded-panel border border-line-subtle bg-surface lg:block">
        <table className="w-full min-w-[56rem] table-fixed border-collapse font-sans">
          <caption className="sr-only">People against days. Drop a job on a person and a day to assign it.</caption>
          <colgroup><col className="w-48" />{days.map(d => <col key={d} />)}</colgroup>
          <thead>
            <tr>
              <th scope="col" className="px-4 py-3 text-left text-caption font-medium text-ink-muted">Person</th>
              {days.map(d => <th key={d} scope="col" className="px-1 py-3 text-center"><span className="block text-caption font-medium text-ink-muted">{weekday(d)}</span><span className={cn('mx-auto mt-0.5 flex size-7 items-center justify-center rounded-full font-display text-body tabular', d === today ? 'bg-action text-action-ink' : 'text-ink')}>{dayNum(d)}</span></th>)}
            </tr>
          </thead>
          <tbody>
            {PEOPLE.map((p, r) => {
              const load = jobsOf(p).length;
              return (
                <tr key={p.id} className="mp-rise border-t border-line-subtle align-top" style={{ ['--mp-i' as string]: r }}>
                  <th scope="row" className="px-4 py-3 text-left font-normal">
                    <span className="flex items-center gap-2.5"><Avatar name={p.name} /><span className="min-w-0"><span className="block truncate text-body-sm font-medium text-ink">{p.name}</span><span className="block truncate text-caption text-ink-muted">{p.trade}</span></span></span>
                    <span className="mt-2 block"><Meter value={load * 20} label={`${p.name} load this week`} /></span>
                    <span className="mt-1 block text-caption text-ink-muted tabular">{load} job{load === 1 ? '' : 's'} this week</span>
                  </th>
                  {days.map(d => {
                    const l = leaveOn(p, d);
                    const refused = dragging !== null && !!l;
                    return (
                      <td key={d} onDragOver={e => e.preventDefault()} onDrop={() => onDrop(p, d)}
                        className={cn('h-24 border-l border-line-subtle p-1 transition-colors duration-[var(--mo-duration-fast)]', l && 'mp-hatch', dragging !== null && !l && 'bg-action-soft/60', refused && 'outline outline-1 -outline-offset-2 outline-danger', shake === `${p.id}-${d}` && 'mp-shake', d === today && !l && 'bg-surface-subtle')}>
                        {l ? <span className="block text-caption text-ink-muted"><span className="font-medium">Leave</span><span className="block truncate">{l.reason}</span></span> : jobsOf(p, d).map(j => <Chip key={j.id} job={j} />)}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Day list, below lg: the same people and the same refusals, one day at a time */}
      <div className="flex flex-col gap-3 lg:hidden">
        <div className="-mx-1 overflow-x-auto px-1"><Segmented label="Day" value={days.includes(dayView) ? dayView : days[0]} onValueChange={setDayView} options={days.map(d => ({ value: d, label: `${weekday(d)} ${dayNum(d)}` }))} className="flex-nowrap" /></div>
        <ul className="flex flex-col gap-3">
          {PEOPLE.map((p, i) => {
            const d = days.includes(dayView) ? dayView : days[0]; const l = leaveOn(p, d); const jobs = jobsOf(p, d);
            return <li key={p.id}><Reveal index={i}><div className={cn('mp-card flex items-center gap-3 rounded-card border border-line-subtle p-3', l ? 'mp-hatch' : 'bg-surface')}><Avatar name={p.name} /><div className="min-w-0 flex-1"><p className="font-sans text-body-sm font-medium text-ink">{p.name}<span className="ml-2 text-caption font-normal text-ink-muted">{p.trade}</span></p><p className="font-sans text-caption text-ink-muted">{l ? `On leave: ${l.reason}, ${fmt(l.from)} to ${fmt(l.to)}` : jobs.length ? jobs.map(j => j.machine).join(', ') : 'Free'}</p></div></div></Reveal></li>;
          })}
        </ul>
      </div>

      <section aria-label="Unassigned jobs" className="rounded-panel border border-line-subtle bg-surface-subtle p-4">
        <div className="mb-3 flex items-baseline justify-between"><h2 className="font-display text-section text-ink">Unassigned<span className="ml-2 font-sans text-body-sm font-normal text-ink-muted tabular">{loose.length}</span></h2><span className="hidden font-sans text-caption text-ink-muted lg:inline">Drag a job onto a person and day, or press Assign.</span></div>
        {loose.length === 0 ? <p className="font-sans text-body-sm text-ink-muted">Everything open has someone.</p> : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {loose.map(o => (
              <li key={o.id} draggable onDragStart={() => setDragging(o.id)} onDragEnd={() => setDragging(null)} className={cn('mp-card relative flex cursor-grab items-center justify-between gap-3 rounded-card border border-line-subtle bg-surface p-3 before:absolute before:inset-y-2.5 before:left-0 before:w-[3px] before:rounded-full active:cursor-grabbing', accent(o.priority), dragging === o.id && 'opacity-60')}>
                <div className="min-w-0"><p className="truncate font-display text-title text-ink">{o.machine}</p><p className="truncate font-sans text-body-sm text-ink-muted">{o.title}</p></div>
                <Button size="sm" onClick={() => { setAssigning(o); setWhen(o.due); }}>Assign</Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <FormDialog open={!!assigning} onOpenChange={o => { if (!o) setAssigning(null); }} size="sm" title="Assign job" description={assigning ? `${assigning.machine}, ${assigning.title}` : undefined} submitLabel="Assign" onSubmit={submitAssign}>
        <div className="flex flex-col gap-4">
          <RegisterField label="Assign to" register="employees" required items={personItems(PEOPLE, fmt)} value={who} onChange={setWho} placeholder="Type to search people" hint="People on leave are shown but cannot be chosen." />
          <Field label="Day"><Input type="date" value={when} onChange={e => setWhen(e.target.value)} /></Field>
        </div>
      </FormDialog>
      <StatusDot tone="neutral">Preview: the load bar counts jobs against five a week.</StatusDot>
    </PageFrame>
  );
}
