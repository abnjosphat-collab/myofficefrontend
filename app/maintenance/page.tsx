// app/maintenance/page.tsx — work orders: raise them, follow them through the artisan's report and the foreman's sign-off, plan the
// recurring ones as schedules, and look back over the numbers.
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { AppShell } from '@/components/app-shell';
import {
  Button, DataRegion, DataTable, EmptyState, IconButton, MetricGrid, MetricTile, PageHeader, Pagination, Progress, RecordCard, SearchField, Select, StatusBadge, Tabs, TabsContent, TabsList, TabsTrigger,
  Toolbar, ViewToggle, VIEW_CARDS_TABLE, deriveDataStatus, isTransientStatus, pageSlice, useConfirm, useViewPreference, type Column,
} from '@/components/ui-system';
import { DownloadButton, type DLColumn } from '@/components/shared/DownloadButton';
import { fmtDate } from '@/components/shared/utils';
import { exportFilename } from '@/lib/exportUtils';
import { formatDate } from '@/lib/format';
import { deleteWorkOrder, uploadStrandedLocalFields, uploadStrandedSchedules } from './api';
import { AnalyticsView } from './AnalyticsView';
import { NO_FILTERS, countByStatus, filterOrders, isFiltered, isOverdue, type OrderFilters, type SortKey } from './helpers';
import { PRIORITY, classificationLabel, priorityMeta, statusMeta } from './meta';
import { ScheduleForm } from './ScheduleForm';
import { SchedulesView } from './SchedulesView';
import { useSchedules, useWorkOrders } from './useMaintenanceData';
import { WorkOrderDetail } from './WorkOrderDetail';
import { WorkOrderForm } from './WorkOrderForm';
import type { MaintenanceSchedule, WorkOrder, WorkOrderPriority } from './types';

const SORTS: { value: SortKey; label: string }[] = [
  { value: 'date-desc', label: 'Newest first' }, { value: 'date-asc', label: 'Oldest first' }, { value: 'priority', label: 'Priority' }, { value: 'status', label: 'Status' }, { value: 'machine', label: 'Machine, A to Z' },
];
const STATUS_HEX: Record<string, string> = { pending: 'FBBF24', 'in-progress': '60A5FA', completed: '34D399', 'on-hold': 'FB923C', cancelled: 'F87171' };
const EXPORT_COLUMNS: DLColumn[] = [
  { key: 'work_order_number', label: 'WO #', width: 14 }, { key: 'equipment_info', label: 'Equipment', width: 24 }, { key: 'classification', label: 'Classification', width: 18 }, { key: 'discipline', label: 'Discipline', width: 14 },
  { key: 'trade', label: 'Trade', width: 14 }, { key: 'status', label: 'Status', width: 14, format: v => statusMeta(String(v)).label }, { key: 'priority', label: 'Priority', width: 12, format: v => priorityMeta(String(v)).label },
  { key: 'allocated_to', label: 'Allocated To', width: 18 }, { key: 'authorising_foreman', label: 'Foreman', width: 18 }, { key: 'to_department', label: 'Department', width: 18 },
  { key: 'date_raised', label: 'Date Raised', width: 14, format: v => (v ? formatDate(v as string) : '') }, { key: 'due_date', label: 'Due Date', width: 14, format: v => (v ? formatDate(v as string) : '') },
  { key: 'progress', label: 'Progress', width: 10, format: v => `${v ?? 0}%` }, { key: 'estimated_hours', label: 'Est. Hours', width: 12 }, { key: 'total_time_worked', label: 'Time Worked', width: 12 },
  { key: 'work_done_details', label: 'Work Done', width: 30 }, { key: 'cause_of_failure', label: 'Cause of Failure', width: 26 },
];
const PAGE_SIZE = 25;

function MaintenanceContent() {
  const confirm = useConfirm();
  const orders = useWorkOrders();
  const schedules = useSchedules();
  const items = orders.items;
  const [tab, setTab] = useState('orders');
  const [view, setView] = useViewPreference('maintenance', VIEW_CARDS_TABLE);
  const [f, setF] = useState<OrderFilters>(NO_FILTERS);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [formFor, setFormFor] = useState<{ order: WorkOrder | null } | null>(null);
  const [schedFor, setSchedFor] = useState<{ schedule: MaintenanceSchedule | null } | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const set = (patch: Partial<OrderFilters>) => { setF(prev => ({ ...prev, ...patch })); setPage(1); };

  // Work done in an older version of this page was kept only in this browser; send it to the server once, then reload.
  const rescued = useRef({ orders: false, schedules: false });
  useEffect(() => {
    if (!orders.loaded || rescued.current.orders) return;
    rescued.current.orders = true;
    uploadStrandedLocalFields(items).then(n => { if (n > 0) { toast.success(`Saved classification data from this browser to ${n} work ${n === 1 ? 'order' : 'orders'}.`); void orders.refetch(); } }).catch(() => {});
  }, [orders, items]);
  useEffect(() => {
    if (rescued.current.schedules) return;
    rescued.current.schedules = true;
    uploadStrandedSchedules().then(n => { if (n > 0) { toast.success(`Moved ${n} ${n === 1 ? 'schedule' : 'schedules'} from this browser to the server.`); void schedules.refetch(); } }).catch(() => {});
  }, [schedules]);

  const viewing = useMemo(() => items.find(w => String(w.id) === viewingId) ?? null, [items, viewingId]);
  const rows = useMemo(() => filterOrders(items, f), [items, f]);
  const visible = pageSlice(rows, page, PAGE_SIZE);
  const counts = useMemo(() => countByStatus(items), [items]);
  const filtered = isFiltered(f);
  const status = deriveDataStatus({ loaded: orders.loaded, loading: orders.loading, error: orders.error, errorStatus: orders.errorStatus, count: rows.length, transient: isTransientStatus(orders.errorStatus) });
  const tile = { loading: orders.loading && !orders.loaded, unavailable: !orders.loaded && !orders.loading };
  const clear = () => { setF(NO_FILTERS); setPage(1); };
  const chosen = useMemo(() => items.filter(w => selected.has(String(w.id))), [items, selected]);
  const merge = (updated?: WorkOrder) => { if (updated) orders.setItems(prev => prev.map(w => (String(w.id) === String(updated.id) ? { ...w, ...updated } : w))); else void orders.refetch(); };

  const remove = async (w: WorkOrder) => {
    if (!await confirm({ title: 'Delete this work order?', message: `${w.work_order_number}, ${w.equipment_info}. This cannot be undone.`, confirmLabel: 'Delete', destructive: true })) return;
    try { await deleteWorkOrder(w.id); setViewingId(null); toast.success('Work order deleted.'); await orders.refetch(); }
    catch (e) { toast.error(`The work order was not deleted: ${(e as Error).message}`); }
  };
  const removeMany = async () => {
    if (!await confirm({ title: `Delete ${chosen.length} work ${chosen.length === 1 ? 'order' : 'orders'}?`, message: 'This cannot be undone.', confirmLabel: `Delete ${chosen.length}`, destructive: true })) return;
    let ok = 0; let first = '';
    for (const w of chosen) { try { await deleteWorkOrder(w.id); ok += 1; } catch (e) { first ||= (e as Error).message; } }
    if (ok) toast.success(`${ok} deleted.`);
    if (ok < chosen.length) toast.error(`${chosen.length - ok} could not be deleted: ${first}`);
    setSelected(new Set());
    await orders.refetch();
  };

  const actionsOf = (w: WorkOrder) => (
    <span className="inline-flex gap-1">
      <IconButton icon="edit" size="sm" variant="ghost" label={`Edit work order ${w.work_order_number}`} onClick={() => setFormFor({ order: w })} />
    </span>
  );
  const badges = (w: WorkOrder) => { const s = statusMeta(w.status); return <><StatusBadge tone={s.tone}>{s.label}</StatusBadge>{isOverdue(w) && <StatusBadge tone="danger">Overdue</StatusBadge>}</>; };
  const COLUMNS: Column<WorkOrder>[] = [
    { id: 'wo', header: 'Work order', sticky: true, cell: w => <div className="min-w-0"><p className="font-medium text-ink [overflow-wrap:anywhere]">{w.equipment_info}</p><p className="text-caption text-ink-muted tabular">{[`#${w.work_order_number}`, classificationLabel(w), w.trade || w.discipline].filter(Boolean).join(', ')}</p></div> },
    { id: 'status', header: 'Status', cell: w => <div className="flex flex-col items-start gap-1"><span className="flex flex-wrap gap-1">{badges(w)}</span><span className="text-caption text-ink-muted">{priorityMeta(w.priority).label} priority</span></div> },
    { id: 'who', header: 'Assigned', hideBelow: 'md', cell: w => <div><p>{w.allocated_to || w.artisan_name || <span className="text-ink-muted">Unassigned</span>}</p><p className="text-caption text-ink-muted">{w.to_department || 'No department'}</p></div> },
    { id: 'due', header: 'Due', hideBelow: 'md', cell: w => (w.due_date ? <span className={isOverdue(w) ? 'font-semibold text-danger tabular' : 'tabular'}>{fmtDate(w.due_date)}</span> : <span className="text-ink-muted">No deadline</span>) },
    { id: 'progress', header: 'Progress', cell: w => <div className="min-w-32"><Progress value={w.progress ?? 0} label={`${w.equipment_info} progress`} /></div> },
  ];
  const headerAction = tab === 'schedules'
    ? <Button variant="primary" icon="plus" disabled={!schedules.loaded} onClick={() => setSchedFor({ schedule: null })}>New schedule</Button>
    : tab === 'orders' ? <Button variant="primary" icon="plus" disabled={!orders.loaded} onClick={() => setFormFor({ order: null })}>New work order</Button> : null;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        breadcrumbs={[{ label: 'Operations & Maintenance' }, { label: 'Work orders' }]}
        title="Work orders"
        description="Raise a job, follow it to completion, and plan the recurring ones."
        actions={(
          <>
            <IconButton icon="refresh" label={tab === 'schedules' ? 'Refresh schedules' : 'Refresh work orders'} variant="ghost" pending={tab === 'schedules' ? schedules.loading && schedules.loaded : orders.loading && orders.loaded} onClick={() => (tab === 'schedules' ? schedules.refetch() : orders.refetch())} />
            {tab === 'orders' && rows.length > 0 && <DownloadButton data={rows as unknown as Record<string, unknown>[]} columns={EXPORT_COLUMNS} filename={exportFilename('Work_Orders')} title="Work Orders" statusColumn="status" statusColor={(_v, row) => STATUS_HEX[String(row.status)] ?? '94A3B8'} />}
            {headerAction}
          </>
        )}
      />

      <MetricGrid compact>
        <MetricTile compact label="Work orders" value={counts.all} selected={tab === 'orders' && f.status === 'all'} onClick={() => { setTab('orders'); set({ status: 'all' }); }} {...tile} />
        <MetricTile compact label="Pending" tone={counts.pending ? 'warning' : 'default'} value={counts.pending} selected={tab === 'orders' && f.status === 'pending'} onClick={() => { setTab('orders'); set({ status: f.status === 'pending' ? 'all' : 'pending' }); }} {...tile} />
        <MetricTile compact label="In progress" value={counts['in-progress']} selected={tab === 'orders' && f.status === 'in-progress'} onClick={() => { setTab('orders'); set({ status: f.status === 'in-progress' ? 'all' : 'in-progress' }); }} {...tile} />
        <MetricTile compact label="Completed" tone="success" value={counts.completed} selected={tab === 'orders' && f.status === 'completed'} onClick={() => { setTab('orders'); set({ status: f.status === 'completed' ? 'all' : 'completed' }); }} {...tile} />
        <MetricTile compact label="Overdue" tone={counts.overdue ? 'danger' : 'default'} value={counts.overdue} detail={`${counts['on-hold']} on hold`} selected={tab === 'orders' && f.status === 'overdue'} onClick={() => { setTab('orders'); set({ status: f.status === 'overdue' ? 'all' : 'overdue' }); }} {...tile} />
      </MetricGrid>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList aria-label="Maintenance sections">
          <TabsTrigger value="orders" icon="wrench">Work orders</TabsTrigger>
          <TabsTrigger value="schedules" icon="clock">Schedules{schedules.loaded && schedules.items.some(s => s.active) ? ` (${schedules.items.filter(s => s.active).length})` : ''}</TabsTrigger>
          <TabsTrigger value="analytics" icon="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="mt-4 flex flex-col gap-4">
          <Toolbar
            filtered={filtered}
            onClear={clear}
            trailing={(<>
              <Select aria-label="Order" className="w-36" value={f.sort} onValueChange={v => set({ sort: v as SortKey })} options={SORTS} />
              <ViewToggle value={view} onValueChange={setView} options={VIEW_CARDS_TABLE} />
            </>)}
          >
            <SearchField value={f.search} onValueChange={search => set({ search })} placeholder="Search machine, artisan or WO number" wrapperClassName="min-w-48 max-w-sm flex-1 max-md:max-w-none max-md:basis-full" />
          </Toolbar>
          <div role="group" aria-label="Filter by priority" className="flex flex-wrap items-center gap-1.5">
            <span className="font-sans text-caption text-ink-muted">Priority:</span>
            {(Object.keys(PRIORITY) as WorkOrderPriority[]).map(p => { const on = f.priorities.includes(p); return <Button key={p} size="sm" variant={on ? 'primary' : 'secondary'} aria-pressed={on} onClick={() => set({ priorities: on ? f.priorities.filter(x => x !== p) : [...f.priorities, p] })}>{PRIORITY[p].label}</Button>; })}
          </div>
          {view === 'table' && selected.size > 0 && (
            <div className="flex flex-wrap items-center gap-2 rounded-control border border-line bg-action-soft/50 px-4 py-2.5" role="region" aria-label="Bulk actions">
              <span className="font-sans text-label font-semibold text-ink">{selected.size} selected</span>
              <Button size="sm" variant="danger" icon="delete" onClick={removeMany}>Delete selected</Button>
              <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setSelected(new Set())}>Clear selection</Button>
            </div>
          )}
          <DataRegion
            status={status} subject="work orders" error={orders.error} onRetry={() => orders.refetch()}
            empty={filtered
              ? <EmptyState icon="search" title="No work orders match" description="Try fewer filters or a different search." action={<Button onClick={clear}>Clear filters</Button>} />
              : <EmptyState icon="wrench" title="No work orders yet" description="Raise the first one." action={<Button variant="primary" icon="plus" onClick={() => setFormFor({ order: null })}>New work order</Button>} />}
          >
            <p className="font-sans text-caption text-ink-muted">{rows.length} {rows.length === 1 ? 'work order' : 'work orders'}{rows.length !== items.length ? ` of ${items.length}` : ''}</p>
            {view === 'cards' ? (
              <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Work orders">
                {visible.map(w => {
                  const p = priorityMeta(w.priority);
                  return (
                    <li key={String(w.id)} className="relative">
                      <RecordCard
                        eyebrow={`#${w.work_order_number}`} title={w.equipment_info} subtitle={w.job_request_details || undefined} openLabel={`Open work order ${w.work_order_number}, ${w.equipment_info}`} onOpen={() => setViewingId(String(w.id))}
                        status={badges(w)}
                        facts={[{ label: 'Assigned', value: w.allocated_to || w.artisan_name || 'Unassigned' }, { label: 'Priority', value: p.label }, ...(w.due_date ? [{ label: 'Due', value: <span className={isOverdue(w) ? 'font-semibold text-danger' : ''}>{fmtDate(w.due_date)}</span> }] : []), ...(classificationLabel(w) ? [{ label: 'Class', value: classificationLabel(w) }] : [])]}
                        meta={<div className="w-full min-w-40"><Progress value={w.progress ?? 0} label={`${w.equipment_info} progress`} /></div>}
                        action={actionsOf(w)}
                      />
                    </li>
                  );
                })}
              </ul>
            ) : (
              <DataTable caption="Work orders" rows={visible} columns={COLUMNS} getRowId={w => String(w.id)} selected={selected} onSelectedChange={setSelected} onRowActivate={w => setViewingId(String(w.id))} rowActions={actionsOf} />
            )}
            {rows.length > PAGE_SIZE && <Pagination page={page} pageSize={PAGE_SIZE} total={rows.length} onPageChange={setPage} />}
          </DataRegion>
        </TabsContent>

        <TabsContent value="schedules" className="mt-4">
          <SchedulesView list={schedules} orders={items} onEdit={s => setSchedFor({ schedule: s })} onNew={() => setSchedFor({ schedule: null })} onRaised={() => void orders.refetch()} />
        </TabsContent>

        <TabsContent value="analytics" className="mt-4">
          {orders.loaded
            ? <AnalyticsView orders={items} />
            : <p className="font-sans text-body-sm text-ink-muted">{orders.error ? 'The work orders could not be loaded; see the Work orders tab.' : 'Loading…'}</p>}
        </TabsContent>
      </Tabs>

      <WorkOrderDetail order={viewing} onClose={() => setViewingId(null)} onEdit={w => { setViewingId(null); setFormFor({ order: w }); }} onDelete={remove} onSaved={merge} />
      <WorkOrderForm open={!!formFor} order={formFor?.order ?? null} allOrders={items} onOpenChange={o => { if (!o) setFormFor(null); }} onChanged={merge} />
      <ScheduleForm open={!!schedFor} schedule={schedFor?.schedule ?? null} onOpenChange={o => { if (!o) setSchedFor(null); }} onSaved={() => void schedules.refetch()} />
    </div>
  );
}

export default function MaintenancePage() {
  return <AppShell migrated><MaintenanceContent /></AppShell>;
}
