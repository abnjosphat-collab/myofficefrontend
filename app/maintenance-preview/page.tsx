// app/maintenance-preview/page.tsx — Overview, pattern D (dashboard, docs/PAGE_PATTERNS.md): tiles that link, tabs, tinted notices, panels.
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button, ChartPanel, Distribution, MetricGrid, MetricTile, Notice, Panel, RecordCard, Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui-system';
import { ApprovalDialog } from './ApprovalDialog';
import { STATUS_LABEL, fmt, isOverdue, progressOf, rel, type Request } from './fixtures';
import { NewWorkOrderDialog } from './NewWorkOrderDialog';
import { PageFrame, PriorityBadge, StatusBadges } from './parts';
import { usePreview } from './store';

export default function OverviewPage() {
  const { orders, requests } = usePreview();
  const [creating, setCreating] = useState(false);
  const [approving, setApproving] = useState<Request | null>(null);
  const open = orders.filter(o => o.status !== 'completed');
  const overdue = orders.filter(isOverdue);
  const signoff = orders.filter(o => o.status === 'awaiting-signoff');
  const waiting = requests.filter(r => r.status === 'waiting');
  const unassigned = open.filter(o => o.assignees.length === 0);
  const mine = open.filter(o => o.assignees.includes('A. Moyo'));
  const byStatus = Object.entries(STATUS_LABEL).map(([k, name]) => ({ name, value: orders.filter(o => o.status === k).length })).filter(r => r.value > 0);

  return (
    <PageFrame crumb="Overview" title="Maintenance overview" description="What needs attention across work orders, requests and schedules." action={<Button variant="primary" icon="plus" onClick={() => setCreating(true)}>New work order</Button>}>
      <MetricGrid>
        <MetricTile label="Overdue" icon="overdue" tone={overdue.length ? 'danger' : 'default'} value={overdue.length} detail="Past their due date" href="/maintenance-preview/work-orders" />
        <MetricTile label="Awaiting sign-off" icon="pending" tone={signoff.length ? 'warning' : 'default'} value={signoff.length} detail="Ready for the foreman" href="/maintenance-preview/work-orders" />
        <MetricTile label="Requests waiting" icon="submitted" value={waiting.length} detail="For approval" href="/maintenance-preview/requests" />
        <MetricTile label="Unassigned" icon="employees" value={unassigned.length} detail="Nobody on the job yet" href="/maintenance-preview/planner" />
      </MetricGrid>

      <Tabs defaultValue="today">
        <TabsList aria-label="Overview sections">
          <TabsTrigger value="today" icon="today">Today</TabsTrigger>
          <TabsTrigger value="month" icon="analytics">Last 30 days</TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="mt-4 flex flex-col gap-4">
          {overdue.length > 0 && <Notice tone="danger" title={`${overdue.length} work ${overdue.length === 1 ? 'order is' : 'orders are'} overdue.`} action={<Button size="sm" asChild><Link href="/maintenance-preview/work-orders">Review</Link></Button>} />}
          {waiting.length > 0 && <Notice tone="warning" title={`${waiting.length} ${waiting.length === 1 ? 'request is' : 'requests are'} waiting for approval.`} action={<Button size="sm" asChild><Link href="/maintenance-preview/requests">Review</Link></Button>} />}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Panel title="Your day" description="Open work orders assigned to you" bodyClassName="flex flex-col gap-3">
              {mine.length === 0 ? <p className="font-sans text-body-sm text-ink-muted">Nothing is assigned to you.</p> : mine.map(w => (
                <RecordCard key={w.id} eyebrow={`#${w.number}`} title={w.machine} subtitle={w.title} openLabel={`Open work order ${w.number}`} onOpen={() => undefined} status={<StatusBadges w={w} />}
                  facts={[{ label: 'Due', value: <span className={isOverdue(w) ? 'font-semibold text-danger' : ''}>{rel(w.due)}</span> }, { label: 'Priority', value: <PriorityBadge p={w.priority} /> }]} />
              ))}
            </Panel>
            <Panel title="Waiting for approval" description="Requests that need a foreman's signature" bodyClassName="flex flex-col gap-3">
              {waiting.length === 0 ? <p className="font-sans text-body-sm text-ink-muted">No requests are waiting.</p> : waiting.map(r => (
                <RecordCard key={r.id} eyebrow={`#${r.number}`} title={r.machine} subtitle={r.title} openLabel={`Open request ${r.number}`} onOpen={() => setApproving(r)} status={<PriorityBadge p={r.priority} />}
                  facts={[{ label: 'Requested by', value: r.by }, { label: 'When', value: r.when }]} action={<Button size="sm" variant="primary" onClick={() => setApproving(r)}>Approve</Button>} />
              ))}
            </Panel>
          </div>
        </TabsContent>

        <TabsContent value="month" className="mt-4 flex flex-col gap-4">
          <MetricGrid compact>
            <MetricTile compact label="Completed on time" value="82%" detail="74% the 30 days before" />
            <MetricTile compact label="Breakdowns" value="6" detail="9 the 30 days before" />
            <MetricTile compact label="Mean time to repair" value="4.2 h" detail="5.1 h the 30 days before" />
          </MetricGrid>
          <p className="font-sans text-caption text-ink-muted">Example figures. Targets read “not set” until the owner provides them.</p>
          <ChartPanel title="Work orders by status" description="All work orders in the list" summary={`Work orders by status: ${byStatus.map(r => `${r.name} ${r.value}`).join(', ')}.`}><Distribution rows={byStatus} /></ChartPanel>
        </TabsContent>
      </Tabs>
      <NewWorkOrderDialog open={creating} onOpenChange={setCreating} />
      <ApprovalDialog request={approving} onClose={() => setApproving(null)} />
    </PageFrame>
  );
}
