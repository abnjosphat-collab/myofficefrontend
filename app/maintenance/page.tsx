// app/maintenance/page.tsx — Maintenance overview (pattern D, docs/PAGE_PATTERNS.md): what needs attention across work orders and schedules, and the
// numbers looked back over. Every figure is counted from the real work order and schedule lists; a failed read says so and is never shown as zero.
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo } from 'react';
import { AppShell } from '@/components/app-shell';
import {
  Button, EmptyState, IconButton, MetricGrid, MetricTile, Notice, PageHeader, Panel, RecordCard, StatusBadge, Tabs, TabsContent, TabsList, TabsTrigger,
  deriveDataStatus, isTransientStatus,
} from '@/components/ui-system';
import { fmtDate } from '@/components/shared/utils';
import { AnalyticsView } from './AnalyticsView';
import { isOverdue } from './helpers';
import { statusMeta } from './meta';
import { useSchedules, useWorkOrders } from './useMaintenanceData';
import type { WorkOrder } from './types';

const OPEN = (w: WorkOrder) => w.status !== 'completed' && w.status !== 'cancelled';

function OverviewContent() {
  const orders = useWorkOrders();
  const schedules = useSchedules();
  const items = orders.items;
  const status = deriveDataStatus({ loaded: orders.loaded, loading: orders.loading, error: orders.error, errorStatus: orders.errorStatus, count: items.length, transient: isTransientStatus(orders.errorStatus) });
  const tile = { loading: orders.loading && !orders.loaded, unavailable: !orders.loaded && !orders.loading };
  const open = useMemo(() => items.filter(OPEN), [items]);
  const overdue = useMemo(() => open.filter(w => isOverdue(w)), [open]);
  const unassigned = useMemo(() => open.filter(w => !(w.allocated_to || w.artisan_name)), [open]);
  const dueSoon = useMemo(() => { const week = new Date(); week.setDate(week.getDate() + 7); return open.filter(w => w.due_date && !isOverdue(w) && new Date(w.due_date) <= week).sort((a, b) => String(a.due_date).localeCompare(String(b.due_date))); }, [open]);
  const activeSchedules = schedules.items.filter(s => s.active).length;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        breadcrumbs={[{ label: 'Operations & Maintenance' }, { label: 'Overview' }]}
        title="Maintenance overview"
        description="What needs attention across work orders and schedules."
        actions={(
          <>
            <IconButton icon="refresh" label="Refresh" variant="ghost" pending={orders.loading && orders.loaded} onClick={() => { void orders.refetch(); void schedules.refetch(); }} />
            <Button variant="primary" icon="plus" asChild><Link href="/maintenance/work-orders?new=1">New work order</Link></Button>
          </>
        )}
      />

      <MetricGrid>
        <MetricTile label="Open work orders" icon="wrench" value={open.length} detail="Not completed or cancelled" href="/maintenance/work-orders" {...tile} />
        <MetricTile label="Overdue" icon="overdue" tone={overdue.length ? 'danger' : 'default'} value={overdue.length} detail="Past their due date" href="/maintenance/work-orders" {...tile} />
        <MetricTile label="Unassigned" icon="employees" value={unassigned.length} detail="Nobody on the job yet" href="/maintenance/work-orders" {...tile} />
        <MetricTile label="Active schedules" icon="clock" value={schedules.loaded ? activeSchedules : undefined} detail="Raise work orders on a date" href="/maintenance/schedules" loading={schedules.loading && !schedules.loaded} unavailable={!schedules.loaded && !schedules.loading} />
      </MetricGrid>

      <Tabs defaultValue="today">
        <TabsList aria-label="Overview sections">
          <TabsTrigger value="today" icon="today">Today</TabsTrigger>
          <TabsTrigger value="analytics" icon="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="mt-4 flex flex-col gap-4">
          {status === 'error' || status === 'unauthorized' ? <Notice tone="danger" title="The work orders could not be loaded." action={<Button size="sm" onClick={() => void orders.refetch()}>Try again</Button>}>{orders.error}</Notice> : null}
          {overdue.length > 0 && <Notice tone="danger" title={`${overdue.length} work ${overdue.length === 1 ? 'order is' : 'orders are'} overdue.`} action={<Button size="sm" asChild><Link href="/maintenance/work-orders">Review</Link></Button>} />}
          {unassigned.length > 0 && <Notice tone="warning" title={`${unassigned.length} open work ${unassigned.length === 1 ? 'order has' : 'orders have'} nobody assigned.`} action={<Button size="sm" asChild><Link href="/maintenance/work-orders">Review</Link></Button>} />}
          {orders.loaded && open.length === 0 && <EmptyState icon="success" title="Nothing is open" description="Every work order is completed or cancelled." />}
          {orders.loaded && (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Panel title="Overdue" description="Open work orders past their due date" bodyClassName="flex flex-col gap-3">
                {overdue.length === 0 ? <p className="font-sans text-body-sm text-ink-muted">None are overdue.</p> : overdue.slice(0, 5).map(w => <WorkOrderCard key={String(w.id)} w={w} />)}
              </Panel>
              <Panel title="Due in the next 7 days" description="Open work orders, soonest first" bodyClassName="flex flex-col gap-3">
                {dueSoon.length === 0 ? <p className="font-sans text-body-sm text-ink-muted">Nothing is due this week.</p> : dueSoon.slice(0, 5).map(w => <WorkOrderCard key={String(w.id)} w={w} />)}
              </Panel>
            </div>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="mt-4">
          {orders.loaded
            ? <AnalyticsView orders={items} />
            : <p className="font-sans text-body-sm text-ink-muted">{orders.error ? 'The work orders could not be loaded.' : 'Loading…'}</p>}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function WorkOrderCard({ w }: { w: WorkOrder }) {
  const router = useRouter();
  const s = statusMeta(w.status);
  return (
    <RecordCard
      eyebrow={`#${w.work_order_number}`} title={w.equipment_info} subtitle={w.job_request_details || undefined} openLabel={`Open work orders, ${w.work_order_number}`}
      onOpen={() => router.push('/maintenance/work-orders')}
      status={<><StatusBadge tone={s.tone}>{s.label}</StatusBadge>{isOverdue(w) && <StatusBadge tone="danger">Overdue</StatusBadge>}</>}
      facts={[{ label: 'Assigned', value: w.allocated_to || w.artisan_name || 'Unassigned' }, ...(w.due_date ? [{ label: 'Due', value: <span className={isOverdue(w) ? 'font-semibold text-danger' : ''}>{fmtDate(w.due_date)}</span> }] : [])]}
    />
  );
}

export default function MaintenanceOverviewPage() {
  return <AppShell migrated><OverviewContent /></AppShell>;
}
