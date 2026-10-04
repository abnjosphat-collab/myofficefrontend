// app/leaves/page.tsx — leave requests: apply, review, approve or reject (singly or in bulk), and summaries.
'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AppShell } from '@/components/app-shell';
import {
  Button, DataRegion, DataTable, Distribution, EmptyState, IconButton, Input, MetricGrid, MetricTile, PageHeader, Panel, RecordCard, SearchField, Select, StatusBadge,
  Tabs, TabsContent, TabsList, TabsTrigger, Toolbar, ViewToggle, VIEW_CARDS_TABLE, deriveDataStatus, isTransientStatus, useConfirm, useViewPreference,
  type Column,
} from '@/components/ui-system';
import { ApprovalGate } from '@/components/shared/ApprovalGate';
import { DownloadButton, type DLColumn } from '@/components/shared/DownloadButton';
import { fmtDate, fmtDateTime } from '@/components/shared/utils';
import { todayLocal } from '@/lib/dates';
import { LeaveDetails } from './LeaveDetails';
import { LeaveForm } from './LeaveForm';
import { NO_FILTERS, filterLeaves, statsFromLeaves, summariseByEmployee, summariseByType, type LeaveFilters } from './leaveLogic';
import { daysText, statusMeta } from './leaveMeta';
import { LEAVE_TYPES, typeOf } from './leaveTypes';
import type { Leave } from './types';
import { bulkSetLeaveStatus, createLeave, deleteLeave, setLeaveStatus, updateLeave, useLeaves } from './useLeavesData';

const SORTS = [
  { value: 'date-desc', label: 'Newest first' }, { value: 'date-asc', label: 'Oldest first' }, { value: 'days-desc', label: 'Most days' },
  { value: 'days-asc', label: 'Fewest days' }, { value: 'name-asc', label: 'Name A to Z' }, { value: 'name-desc', label: 'Name Z to A' },
];
const EXPORT: DLColumn[] = [
  { key: 'employee_name', label: 'Employee', width: 18 }, { key: 'employee_id', label: 'Employee ID', width: 14 }, { key: 'department', label: 'Department', width: 18, format: v => (v as string) ?? '' },
  { key: 'position', label: 'Position', width: 18, format: v => (v as string) ?? '' }, { key: 'leave_type', label: 'Leave type', width: 18, format: v => typeOf(v as string).name },
  { key: 'start_date', label: 'Start date', width: 14 }, { key: 'end_date', label: 'End date', width: 14 }, { key: 'total_days', label: 'Days', width: 8, format: v => daysText(v as number) },
  { key: 'status', label: 'Status', width: 12, format: v => statusMeta(v as string).label }, { key: 'reason', label: 'Reason', width: 30 }, { key: 'contact_number', label: 'Contact', width: 16 },
  { key: 'handover_to', label: 'Handover to', width: 18 }, { key: 'applied_date', label: 'Applied', width: 14, format: v => (v ? new Date(v as string).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '') },
];

const StatusTag = ({ status }: { status: string }) => { const m = statusMeta(status); return <StatusBadge tone={m.tone} icon={m.icon}>{m.label}</StatusBadge>; };
const TypeTag = ({ type }: { type: string }) => { const t = typeOf(type); return <StatusBadge tone={t.tone} icon={t.icon}>{t.shortName}</StatusBadge>; };

function LeavesContent() {
  const confirm = useConfirm();
  const list = useLeaves();
  const leaves = list.items;
  const [view, setView] = useViewPreference('leaves', VIEW_CARDS_TABLE);
  const [tab, setTab] = useState('requests');
  const [f, setF] = useState<LeaveFilters>(NO_FILTERS);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Leave | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulk, setBulk] = useState<'approved' | 'rejected' | null>(null);
  const set = (patch: Partial<LeaveFilters>) => setF(p => ({ ...p, ...patch }));

  const viewing = useMemo(() => leaves.find(l => l.id === viewingId) ?? null, [leaves, viewingId]);
  const filtered = useMemo(() => filterLeaves(leaves, f), [leaves, f]);
  const stats = useMemo(() => statsFromLeaves(leaves, todayLocal()), [leaves]);
  const byType = useMemo(() => summariseByType(leaves, Object.keys(LEAVE_TYPES)), [leaves]);
  const byEmployee = useMemo(() => summariseByEmployee(leaves), [leaves]);
  // Only pending requests can be approved or rejected; a stale selection is cut down again at submit time.
  const selectedPending = useMemo(() => leaves.filter(l => l.status === 'pending' && selected.has(l.id)), [leaves, selected]);

  const status = deriveDataStatus({ loaded: list.loaded, loading: list.loading, error: list.error, errorStatus: list.errorStatus, count: filtered.length, transient: isTransientStatus(list.errorStatus) });
  const pending = list.loading && !list.loaded;
  const unavailable = !list.loaded && !list.loading;
  const tile = { loading: pending, unavailable };
  const hasFilters = JSON.stringify({ ...f, sort: '' }) !== JSON.stringify({ ...NO_FILTERS, sort: '' });
  const clear = () => setF(NO_FILTERS);

  const openForm = (l: Leave | null) => { setViewingId(null); setEditing(l); setFormOpen(true); };
  const save = async (id: string | null, data: Partial<Leave>) => {
    try { if (id === null) await createLeave(data); else await updateLeave(id, data); }
    catch (e) { throw new Error(`The request was not saved: ${(e as Error).message}`); }
    await list.refetch();
  };
  const changeStatus = async (l: Leave, next: Leave['status']) => {
    if (next === 'pending' && !await confirm({ title: 'Set this request back to pending?', message: `${l.employee_name}'s decision will be undone and it will need approving again.`, confirmLabel: 'Set to pending' })) return;
    try { await setLeaveStatus(l.id, next); toast.success(`Status changed to ${statusMeta(next).label.toLowerCase()}.`); setViewingId(null); await list.refetch(); }
    catch (e) { toast.error(`The status was not changed: ${(e as Error).message}`); throw e; }
  };
  const remove = async (l: Leave) => {
    if (!await confirm({ title: 'Delete this leave request?', message: `${l.employee_name}, ${fmtDate(l.start_date)} to ${fmtDate(l.end_date)}. This cannot be undone.`, confirmLabel: 'Delete', destructive: true })) return;
    try { await deleteLeave(l.id); setViewingId(null); toast.success('Leave request deleted.'); await list.refetch(); }
    catch (e) { toast.error(`The request was not deleted: ${(e as Error).message}`); }
  };
  const runBulk = async () => {
    if (!bulk) return;
    try {
      const r = await bulkSetLeaveStatus(selectedPending.map(l => l.id), bulk);
      if (r.failed > 0) toast.warning(`${r.failed} could not be updated (already processed or missing).`);
      if (r.succeeded > 0) toast.success(`${bulk === 'approved' ? 'Approved' : 'Rejected'} ${r.succeeded} ${r.succeeded === 1 ? 'request' : 'requests'}.`);
      setSelected(new Set()); setBulk(null); await list.refetch();
    } catch (e) { toast.error(`The bulk update failed: ${(e as Error).message}`); throw e; }
  };

  const COLUMNS: Column<Leave>[] = [
    { id: 'employee_name', header: 'Employee', sticky: true, cell: l => <div><p className="font-medium text-ink">{l.employee_name}</p><p className="text-caption text-ink-muted">{l.employee_id}</p></div> },
    { id: 'type', header: 'Type', hideBelow: 'md', cell: l => <TypeTag type={l.leave_type} /> },
    { id: 'dates', header: 'Dates', cell: l => <span className="whitespace-nowrap tabular">{fmtDate(l.start_date)} to {fmtDate(l.end_date)}</span> },
    { id: 'days', header: 'Days', numeric: true, hideBelow: 'md', cell: l => <span className="tabular">{daysText(l.total_days)}</span> },
    { id: 'status', header: 'Status', cell: l => <StatusTag status={l.status} /> },
    { id: 'applied', header: 'Applied', hideBelow: 'lg', cell: l => <span className="whitespace-nowrap tabular text-ink-muted">{fmtDateTime(l.applied_date)}</span> },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: 'Time and attendance' }, { label: 'Leaves' }]}
        title="Leave management"
        description="Apply for leave, review requests and record decisions."
        actions={(
          <>
            <IconButton icon="refresh" label="Refresh leave requests" variant="outline" pending={list.loading && list.loaded} onClick={() => list.refetch()} />
            {filtered.length > 0 && <DownloadButton data={filtered as unknown as Record<string, unknown>[]} columns={EXPORT} filename={['Leaves', f.search || null, f.status !== 'all' ? f.status : null, f.type !== 'all' ? f.type : null].filter(Boolean).join('_')} title="Leave Records" subtitle={[f.search && `Employee: ${f.search}`, f.status !== 'all' && `Status: ${f.status}`].filter(Boolean).join(' | ') || 'All records'} formats={['excel']} />}
            <Button variant="primary" icon="plus" disabled={unavailable} onClick={() => openForm(null)}>New leave request</Button>
          </>
        )}
      />

      <MetricGrid columns={5}>
        <MetricTile label="Requests" icon="calendar" value={stats.total} selected={f.status === 'all'} onClick={() => set({ status: 'all' })} {...tile} />
        <MetricTile label="Pending" icon="pending" tone={stats.pending ? 'warning' : 'default'} value={stats.pending} selected={f.status === 'pending'} onClick={() => set({ status: f.status === 'pending' ? 'all' : 'pending' })} {...tile} />
        <MetricTile label="Approved" icon="success" tone="success" value={stats.approved} detail={`${stats.approvalRate}% of decided`} selected={f.status === 'approved'} onClick={() => set({ status: f.status === 'approved' ? 'all' : 'approved' })} {...tile} />
        <MetricTile label="On leave now" icon="employees" value={stats.on_leave_now} {...tile} />
        <MetricTile label="Days requested" icon="clock" value={stats.total_days_requested} detail={`${stats.average_days} on average`} {...tile} />
      </MetricGrid>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList aria-label="Leave sections">
          <TabsTrigger value="requests" icon="calendar">Requests</TabsTrigger>
          <TabsTrigger value="summary" icon="analytics">Summary</TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="mt-4 flex flex-col gap-4">
          <Toolbar filtered={hasFilters} trailing={<ViewToggle value={view} onValueChange={setView} options={VIEW_CARDS_TABLE} />}>
            <SearchField value={f.search} onValueChange={v => set({ search: v })} placeholder="Search employee, ID, position or department" wrapperClassName="min-w-56 max-w-md flex-1" />
            <Select className="w-44" aria-label="Filter by leave type" value={f.type} onValueChange={v => set({ type: v })} options={[{ value: 'all', label: 'All leave types' }, ...Object.entries(LEAVE_TYPES).map(([k, t]) => ({ value: k, label: t.name }))]} />
            <Select className="w-36" aria-label="Filter by status" value={f.status} onValueChange={v => set({ status: v })} options={[{ value: 'all', label: 'All statuses' }, { value: 'pending', label: 'Pending' }, { value: 'approved', label: 'Approved' }, { value: 'rejected', label: 'Rejected' }]} />
            <Input type="date" aria-label="Leave on or after" className="w-40" value={f.from} onChange={e => set({ from: e.target.value })} />
            <Input type="date" aria-label="Leave on or before" className="w-40" value={f.to} onChange={e => set({ to: e.target.value })} />
            <Select className="w-40" aria-label="Sort order" value={f.sort} onValueChange={v => set({ sort: v })} options={SORTS} />
            {hasFilters && <Button variant="ghost" icon="close" onClick={clear}>Clear filters</Button>}
          </Toolbar>

          {view === 'table' && selected.size > 0 && (
            <div className="flex flex-wrap items-center gap-2 rounded-control border border-line bg-action-soft/50 px-4 py-2.5" role="region" aria-label="Bulk actions">
              <span className="font-sans text-label font-semibold text-ink">{selected.size} selected, {selectedPending.length} pending</span>
              <Button size="sm" icon="success" disabled={selectedPending.length === 0} onClick={() => setBulk('approved')}>Approve</Button>
              <Button size="sm" icon="close" disabled={selectedPending.length === 0} onClick={() => setBulk('rejected')}>Reject</Button>
              <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setSelected(new Set())}>Clear selection</Button>
            </div>
          )}

          <DataRegion
            status={status} subject="leave requests" error={list.error} onRetry={() => list.refetch()}
            empty={hasFilters
              ? <EmptyState icon="search" title="No leave requests match" description="Try different filters." action={<Button onClick={clear}>Clear filters</Button>} />
              : <EmptyState icon="calendar" title="No leave requests yet" description="Create the first request." action={<Button variant="primary" icon="plus" onClick={() => openForm(null)}>New leave request</Button>} />}
          >
            <p className="font-sans text-caption text-ink-muted">{filtered.length} of {leaves.length} requests</p>
            {view === 'cards' ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {filtered.map(l => (
                  <RecordCard
                    key={l.id}
                    eyebrow={`${fmtDate(l.start_date)} to ${fmtDate(l.end_date)}`}
                    title={l.employee_name}
                    subtitle={[l.position, l.employee_id].filter(Boolean).join(' · ')}
                    status={<StatusTag status={l.status} />}
                    facts={[
                      { label: 'Type', value: <TypeTag type={l.leave_type} /> },
                      { label: 'Duration', value: <span className="font-semibold tabular">{daysText(l.total_days)}</span> },
                      { label: 'Applied', value: fmtDateTime(l.applied_date) },
                      ...(l.reason ? [{ label: 'Reason', value: <span className="line-clamp-2">{l.reason}</span> }] : []),
                    ]}
                    action={<IconButton icon="delete" variant="danger" size="sm" label={`Delete the leave request for ${l.employee_name}`} onClick={() => remove(l)} />}
                    onOpen={() => setViewingId(l.id)}
                    openLabel={`View the leave request for ${l.employee_name}, ${fmtDate(l.start_date)}`}
                  />
                ))}
              </div>
            ) : (
              <DataTable
                caption="Leave requests" rows={filtered} columns={COLUMNS} getRowId={l => l.id}
                selected={selected} onSelectedChange={setSelected} onRowActivate={l => setViewingId(l.id)}
                rowActions={l => (
                  <span className="inline-flex gap-1">
                    <IconButton icon="edit" size="sm" label={`Edit the leave request for ${l.employee_name}`} onClick={() => openForm(l)} />
                    <IconButton icon="delete" variant="danger" size="sm" label={`Delete the leave request for ${l.employee_name}`} onClick={() => remove(l)} />
                  </span>
                )}
              />
            )}
          </DataRegion>
        </TabsContent>

        <TabsContent value="summary" className="mt-4">
          {!list.loaded ? <p className="font-sans text-body-sm text-ink-muted">{list.error ? 'The requests could not be loaded; see the Requests tab.' : 'Loading…'}</p> : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Panel title="By leave type" description="Select a type to see its requests.">
                <Distribution rows={byType.map(t => ({ name: typeOf(t.key).shortName, value: t.count }))} empty="No requests yet." />
                <div className="mt-3 flex flex-wrap gap-2">
                  {byType.map(t => <Button key={t.key} size="sm" onClick={() => { set({ type: t.key }); setTab('requests'); }}>{typeOf(t.key).shortName}: {t.totalDays} days</Button>)}
                </div>
              </Panel>
              <Panel title="By employee" description={`${byEmployee.length} ${byEmployee.length === 1 ? 'employee' : 'employees'}, most days first.`}>
                <ul className="flex max-h-80 flex-col gap-1 overflow-y-auto">
                  {byEmployee.map(e => (
                    <li key={e.id}>
                      <button type="button" aria-label={`Show leave requests for ${e.name}`} onClick={() => { set({ search: e.name, status: 'all' }); setTab('requests'); }} className="focus-ring flex w-full items-center gap-3 rounded-control px-3 py-2 text-left hover:bg-surface-subtle">
                        <span className="min-w-0 flex-1 truncate font-sans text-label font-medium text-ink">{e.name}</span>
                        <span className="font-sans text-caption text-ink-muted tabular">{e.total_days} days</span>
                        <span className="flex gap-1">{e.pending > 0 && <StatusBadge tone="warning">{e.pending} pending</StatusBadge>}{e.approved > 0 && <StatusBadge tone="success">{e.approved} approved</StatusBadge>}{e.rejected > 0 && <StatusBadge tone="danger">{e.rejected} rejected</StatusBadge>}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </Panel>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <LeaveDetails leave={viewing} onClose={() => setViewingId(null)} onEdit={openForm} onDelete={remove} onStatus={changeStatus} />
      <LeaveForm open={formOpen} leave={editing} leaves={leaves} onOpenChange={o => { setFormOpen(o); if (!o) setEditing(null); }} onSave={save} />
      {bulk && (
        <ApprovalGate
          title={`${bulk === 'approved' ? 'Approve' : 'Reject'} ${selectedPending.length} leave ${selectedPending.length === 1 ? 'request' : 'requests'}`}
          description={`${selectedPending.length} pending ${selectedPending.length === 1 ? 'request' : 'requests'} selected`}
          actionLabel={bulk === 'approved' ? 'Sign and approve all' : 'Sign and reject all'} requiredRole="manager"
          variant={bulk === 'approved' ? 'approve' : 'reject'} preferSavedSignature={bulk === 'approved'}
          onConfirm={runBulk} onCancel={() => setBulk(null)}
        />
      )}
    </div>
  );
}

export default function LeavesPage() {
  return <AppShell migrated><LeavesContent /></AppShell>;
}
