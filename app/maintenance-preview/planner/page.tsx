// app/maintenance-preview/planner/page.tsx — people against days. Leave is a quiet grey band; a job cannot be dropped there.
'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button, cn } from '@/components/ui-system';
import { PEOPLE, dayOffset, fmt, type WorkOrder } from '../fixtures';
import { PageFrame } from '../PageFrame';
import { usePreview } from '../store';

const days = Array.from({ length: 7 }, (_, i) => dayOffset(i));
const weekday = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'short' });

export default function PlannerPage() {
  const { orders, update } = usePreview();
  const [dragging, setDragging] = useState<number | null>(null);
  const [published, setPublished] = useState(false);
  const loose = orders.filter(o => o.status !== 'completed' && o.assignees.length === 0);
  const onLeave = (name: string, day: string) => { const l = PEOPLE.find(p => p.name === name)?.leave; return !!l && day >= l.from && day <= l.to; };
  const drop = (name: string, day: string) => {
    const o = orders.find(x => x.id === dragging); setDragging(null);
    if (!o) return;
    if (onLeave(name, day)) { const l = PEOPLE.find(p => p.name === name)!.leave!; toast.error(`${name} is on leave (${l.reason}, ${fmt(l.from)} to ${fmt(l.to)}).`); return; }
    update(o.id, { assignees: [name], due: day }); setPublished(false);
  };
  return (
    <PageFrame title="Planner" crumbs={[{ label: 'Planner' }]} action={<Button variant="primary" onClick={() => { setPublished(true); toast.success('Week published (preview only).'); }}>{published ? 'Published' : 'Publish week'}</Button>}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[44rem] border-collapse font-sans text-body-sm">
          <caption className="sr-only">People against days. Drop a job on a person and day to assign it.</caption>
          <thead><tr><th className="w-32 py-2 text-left text-caption font-medium text-ink-muted">Person</th>{days.map(d => <th key={d} className="py-2 text-left text-caption font-medium text-ink-muted">{weekday(d)} <span className="tabular">{fmt(d)}</span></th>)}</tr></thead>
          <tbody>
            {PEOPLE.map(p => (
              <tr key={p.id} className="border-t border-line-subtle align-top">
                <th scope="row" className="py-2 pr-3 text-left font-medium text-ink">{p.name}<span className="block text-caption font-normal text-ink-muted">{p.trade}</span></th>
                {days.map(d => {
                  const leave = onLeave(p.name, d);
                  const jobs = orders.filter(o => o.assignees.includes(p.name) && o.due === d && o.status !== 'completed');
                  return (
                    <td key={d} onDragOver={e => e.preventDefault()} onDrop={() => drop(p.name, d)} className={cn('h-14 min-w-24 px-1 py-1', leave && 'bg-surface-muted')}>
                      {leave ? <span className="text-caption text-ink-muted">Leave</span> : jobs.map(j => <span key={j.id} className="mb-1 block truncate rounded-xs bg-soft px-1.5 py-1 text-caption text-ink">{j.machine}</span>)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <section aria-labelledby="loose" className="border-t border-line-subtle pt-4">
        <h2 id="loose" className="mb-2 font-sans text-label font-semibold text-ink">Unassigned ({loose.length})</h2>
        {loose.length === 0 ? <p className="font-sans text-body-sm text-ink-muted">Everything open has someone.</p> : (
          <ul className="flex flex-wrap gap-2">{loose.map((o: WorkOrder) => <li key={o.id} draggable onDragStart={() => setDragging(o.id)} className="cursor-grab rounded-control border border-line px-2.5 py-1.5 font-sans text-body-sm text-ink active:cursor-grabbing">{o.machine}, {o.title}</li>)}</ul>
        )}
        <p className="mt-2 font-sans text-caption text-ink-muted">Drag a job onto a person and day. Days on leave cannot take a job.</p>
      </section>
    </PageFrame>
  );
}
