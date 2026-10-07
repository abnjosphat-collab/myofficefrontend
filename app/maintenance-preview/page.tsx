// app/maintenance-preview/page.tsx — Overview: what needs me today. Four linked figures, two short card lists, and a last-30-days row.
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui-system';
import { InfoCard, Meter, Person, Reveal, Section, StatCard, StatusDot, WorkStatus } from './cards';
import { isOverdue, progressOf, rel, PRIORITY_LABEL, type Request } from './fixtures';
import { ApprovalDialog } from './ApprovalDialog';
import { NewWorkOrderDialog } from './NewWorkOrderDialog';
import { PageFrame } from './PageFrame';
import { usePreview } from './store';

const seeAll = 'focus-ring rounded-xs font-sans text-body-sm text-action underline-offset-2 hover:underline';

export default function OverviewPage() {
  const { orders, requests } = usePreview();
  const [creating, setCreating] = useState(false);
  const [approving, setApproving] = useState<Request | null>(null);
  const open = orders.filter(o => o.status !== 'completed');
  const overdue = orders.filter(isOverdue);
  const signoff = orders.filter(o => o.status === 'awaiting-signoff');
  const waiting = requests.filter(r => r.status === 'waiting');
  const unassigned = open.filter(o => o.assignees.length === 0);
  const oldest = (list: typeof orders) => { const days = Math.max(0, ...list.map(o => Math.round((Date.now() - new Date(`${o.due}T00:00:00`).getTime()) / 86_400_000))); return days > 0 ? `Oldest ${days} days` : 'None late'; };
  const mine = open.filter(o => o.assignees.includes('A. Moyo')).slice(0, 3);

  return (
    <PageFrame title="Overview" crumbs={[{ label: 'Overview' }]} action={<Button variant="primary" icon="plus" onClick={() => setCreating(true)}>New work order</Button>}>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard index={0} value={overdue.length} label="Overdue" context={oldest(overdue)} href="/maintenance-preview/work-orders" tone="danger" />
        <StatCard index={1} value={signoff.length} label="Awaiting sign-off" context="Ready for the foreman" href="/maintenance-preview/work-orders" />
        <StatCard index={2} value={waiting.length} label="Requests waiting" context={waiting.length ? `Oldest ${waiting[waiting.length - 1].when.split(',')[0].toLowerCase()}` : 'All decided'} href="/maintenance-preview/requests" />
        <StatCard index={3} value={unassigned.length} label="Unassigned" context="Nobody on the job yet" href="/maintenance-preview/work-orders" />
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <Section title="Your day" action={<Link className={seeAll} href="/maintenance-preview/work-orders">See all</Link>}>
          {mine.length === 0 ? <p className="font-sans text-body-sm text-ink-muted">Nothing is assigned to you today.</p> : (
            <div className="grid grid-cols-1 gap-3">
              {mine.map((o, i) => (
                <Reveal key={o.id} index={i + 4}>
                  <InfoCard priority={o.priority} eyebrow={<WorkStatus status={o.status} overdue={isOverdue(o)} />} aside={o.number} title={o.machine} subtitle={o.title} href={`/maintenance-preview/work-orders/${o.id}`} openLabel={`Open work order ${o.number}`}
                    facts={<><Person name={o.assignees[0]} size="sm" /><span className={isOverdue(o) ? 'font-sans text-body-sm font-semibold text-danger' : 'font-sans text-body-sm text-ink-muted'}>Due {rel(o.due).toLowerCase()}</span></>}
                    meter={<Meter value={progressOf(o)} label={`${o.machine} progress`} />} />
                </Reveal>
              ))}
            </div>
          )}
        </Section>
        <Section title="Waiting for you" action={<Link className={seeAll} href="/maintenance-preview/requests">See all</Link>}>
          {waiting.length === 0 ? <p className="font-sans text-body-sm text-ink-muted">No requests are waiting.</p> : (
            <div className="grid grid-cols-1 gap-3">
              {waiting.slice(0, 3).map((r, i) => (
                <Reveal key={r.id} index={i + 4}>
                  <InfoCard priority={r.priority} eyebrow={<StatusDot tone={r.priority === 'high' || r.priority === 'urgent' ? 'warning' : 'neutral'}>{PRIORITY_LABEL[r.priority]} priority</StatusDot>} aside={r.number} title={r.machine} subtitle={r.title} href="/maintenance-preview/requests" openLabel={`Open request ${r.number}`}
                    facts={<><Person name={r.by} size="sm" /><span className="font-sans text-body-sm text-ink-muted">{r.when.split(',')[0]}</span></>}
                    action={<Button size="sm" variant="primary" onClick={() => setApproving(r)}>Approve</Button>} />
                </Reveal>
              ))}
            </div>
          )}
        </Section>
      </div>

      <Section title="Last 30 days" action={<span className="font-sans text-caption text-ink-muted">Example figures. Targets read “not set” until you provide them.</span>}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[{ label: 'Completed on time', value: '82%', meter: 82, note: '74% in the 30 days before' }, { label: 'Breakdowns', value: '6', note: '9 in the 30 days before' }, { label: 'Mean time to repair', value: '4.2 h', note: '5.1 h in the 30 days before' }].map((m, i) => (
            <Reveal key={m.label} index={i + 8}><div className="mp-card flex flex-col gap-2 rounded-card border border-line-subtle bg-surface p-4"><span className="font-sans text-label font-semibold text-ink">{m.label}</span><span className="font-display text-metric tabular text-ink">{m.value}</span>{m.meter !== undefined && <Meter value={m.meter} label={m.label} />}<span className="font-sans text-caption text-ink-muted">{m.note}</span></div></Reveal>
          ))}
        </div>
      </Section>
      <NewWorkOrderDialog open={creating} onOpenChange={setCreating} />
      <ApprovalDialog request={approving} onClose={() => setApproving(null)} />
    </PageFrame>
  );
}
