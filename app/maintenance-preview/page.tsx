// app/maintenance-preview/page.tsx — Overview: what needs attention today. Two plain lists and one line of figures.
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui-system';
import { fmt, isOverdue } from './fixtures';
import { NewWorkOrderDialog } from './NewWorkOrderDialog';
import { PageFrame } from './PageFrame';
import { usePreview } from './store';

const link = 'focus-ring rounded-xs text-action underline-offset-2 hover:underline';

export default function OverviewPage() {
  const { orders, requests } = usePreview();
  const [creating, setCreating] = useState(false);
  const overdue = orders.filter(isOverdue);
  const signoff = orders.filter(o => o.status === 'awaiting-signoff');
  const waiting = requests.filter(r => r.status === 'waiting');
  const unassigned = orders.filter(o => o.status !== 'completed' && o.assignees.length === 0);
  const mine = orders.filter(o => o.assignees.includes('A. Moyo') && o.status !== 'completed');
  return (
    <PageFrame title="Overview" crumbs={[{ label: 'Overview' }]} action={<Button variant="primary" icon="plus" onClick={() => setCreating(true)}>New work order</Button>}>
      <section aria-labelledby="needs" className="flex flex-col gap-2">
        <h2 id="needs" className="font-sans text-label font-semibold text-ink">Needs attention</h2>
        <p className="font-sans text-body text-ink-muted">
          <Link className={link} href="/maintenance-preview/work-orders">{overdue.length} overdue</Link> · <Link className={link} href="/maintenance-preview/work-orders">{signoff.length} awaiting sign-off</Link> · <Link className={link} href="/maintenance-preview/requests">{waiting.length} requests waiting</Link> · <Link className={link} href="/maintenance-preview/work-orders">{unassigned.length} unassigned</Link>
        </p>
      </section>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <section aria-labelledby="mine" className="flex flex-col">
          <h2 id="mine" className="mb-1 font-sans text-label font-semibold text-ink">Mine today</h2>
          {mine.length ? <ul>{mine.map(o => <li key={o.id} className="border-t border-line-subtle first:border-0"><Link href={`/maintenance-preview/work-orders/${o.id}`} className="focus-ring flex items-baseline justify-between gap-3 py-2.5 font-sans text-body text-ink hover:text-action"><span className="min-w-0 [overflow-wrap:anywhere]">{o.machine}, {o.title}</span><span className={isOverdue(o) ? 'shrink-0 text-body-sm font-semibold text-danger' : 'shrink-0 text-body-sm text-ink-muted'}>{isOverdue(o) ? 'Overdue' : fmt(o.due)}</span></Link></li>)}</ul> : <p className="py-2 font-sans text-body-sm text-ink-muted">Nothing assigned to you.</p>}
        </section>
        <section aria-labelledby="wait" className="flex flex-col">
          <h2 id="wait" className="mb-1 font-sans text-label font-semibold text-ink">Waiting for you</h2>
          {waiting.length ? <ul>{waiting.map(r => <li key={r.id} className="border-t border-line-subtle first:border-0"><Link href="/maintenance-preview/requests" className="focus-ring flex items-baseline justify-between gap-3 py-2.5 font-sans text-body text-ink hover:text-action"><span className="min-w-0 [overflow-wrap:anywhere]">{r.machine}, {r.title}</span><span className="shrink-0 text-body-sm text-ink-muted">{r.number}</span></Link></li>)}</ul> : <p className="py-2 font-sans text-body-sm text-ink-muted">No requests are waiting.</p>}
        </section>
      </div>

      <p className="border-t border-line-subtle pt-3 font-sans text-body-sm text-ink-muted">Last 30 days: completed on time 82% · breakdowns 6 · mean time to repair 4.2 h. <span className="text-caption">(Example figures. Targets show “not set” until you provide them.)</span></p>
      <NewWorkOrderDialog open={creating} onOpenChange={setCreating} />
    </PageFrame>
  );
}
