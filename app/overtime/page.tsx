// app/overtime/page.tsx — overtime: record requests (singly or for a crew), review and approve them with a signature, look back over
// the pattern of overtime, and roll a week up per person.
'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AppShell } from '@/components/app-shell';
import { Button, useConfirm, DataRegion, DataTable, EmptyState, IconButton, Input, MetricGrid, MetricTile, Notice, PageHeader, Pagination, RecordCard, SearchField, Select, StatusBadge, Tabs, TabsContent, TabsList, TabsTrigger, Toolbar, ViewToggle, VIEW_CARDS_TABLE, deriveDataStatus, isTransientStatus, pageSlice, sortRows, useViewPreference, type Column, type SortState, FilterField, LoadingPulse } from '@/components/ui-system';
import { ApprovalGate, type SignatureResult } from '@/components/shared/ApprovalGate';
import { DownloadButton, type DLColumn } from '@/components/shared/DownloadButton';
import { fmtDate } from '@/components/shared/utils';
import { useEmployees } from '@/hooks/useLookups';
import { exportFilename } from '@/lib/exportUtils';
import { overtimeCostCentre, recordsForEngineeringCostCentreExport } from './calcOvertime';
import { BulkOvertimeForm } from './BulkOvertimeForm';
import { EmployeePicks, type PickedPerson } from './EmployeePicks';
import { InsightsView } from './insights/InsightsView';
import { OTBulkEditDialog } from './OTBulkEditDialog';
import { OvertimeDetail } from './OvertimeDetail';
import { OvertimeForm } from './OvertimeForm';
import { NO_FILTERS, filterRecords, isFiltered, monthOptions, recordHours, similarRecords, summarise, summarisePerson, timeSpan, type OTFilters } from './overtimeLogic';
import { STATUS_LABELS, TYPE_LABELS, payoutMeta, planningMeta, statusMeta, typeMeta } from './overtimeMeta';
import { OT_TYPES, STATUSES, type OTRecord } from './types';
import { WeeklySummary } from './WeeklySummary';
import { TakeLieuLeaveDialog } from './TakeLieuLeaveDialog';
import { bulkUpdateOTStatus, createOT, deleteOT, fetchOTById, fetchTakenLieuLeave, updateOT, useOvertime, type TakeLieuLeaveResult, type TakenLieuLeave } from './useOvertimeData';
import { useConfirmDelete } from '@/lib/useConfirmDelete';
import { summariseNames, useBulkDelete } from '@/lib/useBulkDelete';
import { RegisterFlag, RegisterNotice, useRegisterCheck } from '@/components/shared/RegisterCheck';
import { TotalsStrip } from '@/components/shared/timesheet/TotalsStrip';
import { useAuth } from '@/lib/auth-context';
import { deepSignDecision } from '@/lib/deepSign';
import { useRecordDeepLink } from '@/lib/useRecordDeepLink';
import { readStatusParam } from '@/lib/useDeepLink';

const EXPORT_COLUMNS: DLColumn[] = [
  { key: 'employee_name', label: 'Employee', width: 20 }, { key: 'employee_id', label: 'ID', width: 20 }, { key: 'position', label: 'Position', width: 20 },
  { key: 'cost_centre', label: 'Cost Centre', width: 24, format: (_v, row) => overtimeCostCentre(row as unknown as OTRecord) },
  { key: 'overtime_type', label: 'Type', width: 20, format: v => TYPE_LABELS[v as keyof typeof TYPE_LABELS] ?? String(v) },
  { key: 'date', label: 'Date', width: 20, format: v => fmtDate(v as string) }, { key: 'start_time', label: 'Start', width: 20 }, { key: 'end_time', label: 'End', width: 20 },
  { key: 'reason', label: 'Reason', width: 20 }, { key: 'status', label: 'Status', width: 20 },
];
const ALL = 'all';
const STATUS_OPTIONS = [{ value: ALL, label: 'All statuses' }, ...STATUSES.map(s => ({ value: s, label: STATUS_LABELS[s] }))];
const TYPE_OPTIONS = [{ value: ALL, label: 'All types' }, ...OT_TYPES.map(t => ({ value: t, label: TYPE_LABELS[t] }))];
const ORDER = [{ value: 'desc', label: 'Newest first' }, { value: 'asc', label: 'Oldest first' }];
const SIZES = [{ value: '25', label: '25 per page' }, { value: '50', label: '50 per page' }, { value: '100', label: '100 per page' }];

function PersonStatsStrip({ name, range, summary: s }: { name: string; range: string; summary: import('./overtimeLogic').PersonOvertimeSummary }) {
  const foot = [`${range} · any status`, s.excluded > 0 ? `excludes ${s.excluded} rejected or cancelled` : '', s.unmarked > 0 ? `${s.unmarked} unmarked counted as unplanned` : ''].filter(Boolean).join(' · ');
  const countHours = (count: number, hours: number) => `${count} · ${hours.toFixed(1)}h`;
  return (
    <TotalsStrip
      label={`Quick stats for ${name}`}
      title={name}
      figures={[
        { value: String(s.instances), label: s.instances === 1 ? 'Instance' : 'Instances', dim: s.instances === 0 },
        { value: `${s.hours.toFixed(1)}h`, label: 'Total hours', hero: true },
        { value: countHours(s.planned.count, s.planned.hours), label: 'Planned', dim: s.planned.count === 0 },
        { value: countHours(s.unplanned.count, s.unplanned.hours), label: 'Unplanned', dim: s.unplanned.count === 0 },
        { value: String(s.pending), label: 'Pending', dim: s.pending === 0 },
      ]}
      foot={<p className="font-sans text-caption text-ink-muted">{foot}</p>}
    />
  );
}

function Badges({ r }: { r: OTRecord }) {
  const type = typeMeta(r.overtime_type); const plan = planningMeta(r.planning_status); const pay = payoutMeta(r.payout_method);
  return <>{<StatusBadge tone={type.tone}>{type.label}</StatusBadge>}{plan && <StatusBadge tone={plan.tone}>{plan.label}</StatusBadge>}{pay && <StatusBadge tone={pay.tone}>{pay.label}</StatusBadge>}</>;
}

function OvertimeContent() {
  const confirmDelete = useConfirmDelete();
  const { confirmBulkDelete, deleting } = useBulkDelete();
  const confirm = useConfirm();
  const employees = useEmployees();
  const list = useOvertime();
  const records = list.items;
  const [tab, setTab] = useState('records');
  const [view, setView] = useViewPreference('overtime', VIEW_CARDS_TABLE);
  const [filters, setFilters] = useState<OTFilters>(NO_FILTERS);
  const [people, setPeople] = useState<PickedPerson[]>([]);
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [sort, setSort] = useState<SortState>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [formFor, setFormFor] = useState<{ record: OTRecord | null } | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [takeFor, setTakeFor] = useState<OTRecord | null>(null);
  const [takenLookup, setTakenLookup] = useState<{ id: string; leave: TakenLieuLeave | null } | null>(null);
  const [gate, setGate] = useState<{ kind: 'approve' | 'reject'; ids: string[] } | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const register = useRegisterCheck();
  const [unmatchedOnly, setUnmatchedOnly] = useState(false);
  const set = (patch: Partial<OTFilters>) => { setFilters(f => ({ ...f, ...patch })); setPage(1); };
  // ?status=pending arrives from the bell's "View all" — apply once on mount (an
  // effect, not an initializer, so server and client render the same first HTML).
  useEffect(() => {
    const s = readStatusParam(['all', ...STATUSES]);
    // Mount-once external read (the URL), not a cascading render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (s) setFilters(prev => ({ ...prev, status: s }));
  }, []);
  const employeeIds = useMemo(() => people.map(p => p.employee_id), [people]);
  const effective = useMemo<OTFilters>(() => ({ ...filters, employeeIds }), [filters, employeeIds]);
  const filtered = unmatchedOnly || isFiltered(effective);

  const viewing = useMemo(() => records.find(r => String(r.id) === viewingId) ?? null, [records, viewingId]);
  const takenLeave = viewing && takenLookup && String(viewing.id) === takenLookup.id ? takenLookup.leave : null;
  useEffect(() => {
    if (!viewing || viewing.status !== 'approved' || viewing.payout_method !== 'lieu') return;
    let live = true;
    fetchTakenLieuLeave(viewing.id).then(leave => { if (live) setTakenLookup({ id: String(viewing.id), leave }); }).catch(() => { if (live) setTakenLookup({ id: String(viewing.id), leave: null }); });
    return () => { live = false; };
  }, [viewing]);
  const taken = (result: TakeLieuLeaveResult, record: OTRecord) => {
    setTakenLookup({ id: String(record.id), leave: result.leave });
    toast.success(result.created ? 'Leave recorded in the Leaves module.' : `Leave was already recorded (${fmtDate(result.leave.start_date)}${result.leave.end_date !== result.leave.start_date ? ` → ${fmtDate(result.leave.end_date)}` : ''}).`);
    setTakeFor(null);
  };
  const unmatched = useMemo(() => records.filter(r => register.matchOf(r) !== 'linked'), [records, register]);
  const deletableUnmatched = useMemo(() => unmatched.filter(r => r.status !== 'approved' && r.status !== 'paid'), [unmatched]);
  const matches = useMemo(() => filterRecords(unmatchedOnly ? unmatched : records, effective, order), [records, unmatched, unmatchedOnly, effective, order]);
  const rows = useMemo(() => sortRows(matches, sort, (r, id) => (id === 'hours' ? recordHours(r) : id === 'date' ? r.date : id === 'employee' ? r.employee_name.toLowerCase() : String(r[id as keyof OTRecord] ?? '').toLowerCase())), [matches, sort]);
  const visible = pageSlice(rows, page, pageSize);
  const stats = useMemo(() => summarise(records), [records]);
  const months = useMemo(() => monthOptions(records), [records]);
  const activeMonth = months.find(m => m.from === filters.from && m.to === filters.to)?.key ?? null;
  const engineering = useMemo(() => recordsForEngineeringCostCentreExport(records), [records]);
  const pending = useMemo(() => records.filter(r => r.status === 'pending' && selected.has(String(r.id))), [records, selected]);
  const gateRecords = useMemo(() => (gate ? records.filter(r => gate.ids.includes(String(r.id))) : []), [gate, records]);
  const selectedRecords = useMemo(() => records.filter(r => selected.has(String(r.id))), [records, selected]);
  const selectSimilar = (r: OTRecord) => {
    const same = similarRecords(rows, r);
    setSelected(new Set(same.map(x => String(x.id))));
    toast.success(same.length === 1 ? 'Only this request matches that person and day.' : `Selected ${same.length} requests from ${r.employee_name} on ${fmtDate(r.date)}.`);
  };
  const appliedBulkEdit = (updated: OTRecord[], result: { succeeded: number; failed: number; errors: string[] }) => {
    list.setItems(prev => { const m = new Map(prev.map(r => [String(r.id), r])); updated.forEach(u => m.set(String(u.id), u)); return [...m.values()]; });
    if (result.failed > 0) toast.warning(result.errors[0] ?? `${result.failed} could not be changed.`);
    if (result.succeeded > 0) toast.success(`Updated ${result.succeeded} ${result.succeeded === 1 ? 'request' : 'requests'}.`);
    setSelected(new Set());
  };
  const status = deriveDataStatus({ loaded: list.loaded, loading: list.loading, error: list.error, errorStatus: list.errorStatus, count: matches.length, transient: isTransientStatus(list.errorStatus) });
  const tile = { loading: list.loading && !list.loaded, unavailable: !list.loaded && !list.loading };
  const clear = () => { setFilters(NO_FILTERS); setPeople([]); setUnmatchedOnly(false); setPage(1); };
  const monthChoices = useMemo(() => [{ value: '', label: 'All months' }, ...months.map(m => ({ value: m.key, label: m.label }))], [months]);
  const chooseMonth = (key: string) => { const m = months.find(x => x.key === key); set(m ? { from: m.from, to: m.to } : { from: '', to: '' }); };
  const personStats = useMemo(() => {
    if (people.length !== 1) return null;
    const inRange = filterRecords(records, { ...NO_FILTERS, from: filters.from, to: filters.to, employeeIds: [people[0].employee_id] }, order);
    return { person: people[0], summary: summarisePerson(inRange) };
  }, [people, records, filters.from, filters.to, order]);
  const togglePerson = (id: string, name: string) => { if (!id) return; setPeople(p => (p.some(x => x.employee_id === id) ? [] : [{ employee_id: id, name }])); setPage(1); };

  const replace = (updated: OTRecord) => list.setItems(prev => prev.map(r => (r.id === updated.id ? updated : r)));
  const save = async (payload: Record<string, unknown>, id?: number | string) => {
    if (id) { replace(await updateOT(id, payload)); toast.success('Request updated.'); }
    else { await createOT(payload); toast.success('Overtime request submitted.'); await list.refetch(); }
  };
  const remove = async (r: OTRecord) => {
    if (r.status === 'approved' || r.status === 'paid') { toast.error('An approved request cannot be deleted: it may already have been counted in payroll. Use Cancel request instead; that keeps the history.'); return; }
    await confirmDelete({ title: 'Delete this overtime request?', message: `${r.employee_name}, ${fmtDate(r.date)}. This cannot be undone.`, what: 'The request', run: async () => { await deleteOT(r.id); setViewingId(null); }, done: 'Request deleted.', after: () => list.refetch() });
  };
  const removeUnmatched = () => {
    if (!deletableUnmatched.length) return;
    const n = deletableUnmatched.length;
    const kept = unmatched.length - n;
    void confirmBulkDelete({
      title: `Delete ${n} unmatched overtime ${n === 1 ? 'request' : 'requests'}?`,
      message: `${summariseNames(deletableUnmatched.map(r => r.employee_name))}.${kept > 0 ? ` ${kept} approved ${kept === 1 ? 'request is' : 'requests are'} kept — cancel ${kept === 1 ? 'it' : 'them'} instead.` : ''} This cannot be undone.`,
      ids: deletableUnmatched.map(r => r.id), run: id => deleteOT(id), singular: 'overtime request', plural: 'overtime requests', after: () => list.refetch(),
    });
  };
  const cancelRequest = async (r: OTRecord) => {
    if (!await confirm({ title: 'Cancel this overtime request?', message: `${r.employee_name}, ${fmtDate(r.date)}. It stays in the history as cancelled and no longer counts.`, confirmLabel: 'Cancel request', destructive: true })) return;
    try {
      replace(await updateOT(r.id, { status: 'cancelled' }));
      toast.success('Overtime request cancelled.');
      setViewingId(null);
    } catch (e) {
      toast.error(`The request was not cancelled: ${e instanceof Error ? e.message : 'the server did not accept it.'}`);
    }
  };
  const decide = async (sig: SignatureResult) => {
    if (!gate) return;
    const approve = gate.kind === 'approve';
    // Who approved or rejected, and when, is recorded by the server from the signed-in session; only the drawn signature is sent.
    const body = approve ? { approval_signature: sig.dataUrl } : {};
    if (gate.ids.length === 1) {
      replace(await updateOT(gate.ids[0], { status: approve ? 'approved' : 'rejected', ...body }));
      toast.success(approve ? 'Overtime approved.' : 'Overtime rejected.');
    } else {
      const result = await bulkUpdateOTStatus({ ids: gate.ids, status: approve ? 'approved' : 'rejected', ...body });
      list.setItems(prev => { const m = new Map(prev.map(r => [String(r.id), r])); result.updated.forEach(u => m.set(String(u.id), u)); return [...m.values()]; });
      if (result.failed > 0) toast.warning(`${result.failed} could not be ${approve ? 'approved' : 'rejected'} (already decided or missing).`);
      if (result.succeeded > 0) toast.success(`${approve ? 'Approved' : 'Rejected'} ${result.succeeded} ${result.succeeded === 1 ? 'request' : 'requests'}.`);
      setSelected(new Set());
    }
    setViewingId(null);
  };
  const openGate = (kind: 'approve' | 'reject', rs: OTRecord[]) => { setViewingId(null); setGate({ kind, ids: rs.map(r => String(r.id)) }); };
  // Bell deep link (?open=<id>&sign=approve): land on the record, gate up for a manager.
  const { isAtLeast, loading: authLoading, scope } = useAuth();
  const [deepNotice, setDeepNotice] = useState<string | null>(null);
  useRecordDeepLink({
    records,
    // Auth must be settled too: the sign guard reads the role, and deciding
    // while the profile is still loading would refuse a real manager.
    ready: (list.loaded || !!list.error) && !authLoading,
    listFailed: !list.loaded && !!list.error,
    getId: r => r.id,
    fetchById: fetchOTById,
    merge: row => list.setItems(prev => (prev.some(r => String(r.id) === String(row.id)) ? prev : [...prev, row])),
    flags: ['sign'],
    onOpen: (record, flags) => {
      const decision = deepSignDecision('overtime request', record, flags.sign, isAtLeast('manager'));
      if (decision.gate) openGate('approve', [record]);
      else {
        setViewingId(String(record.id));
        if (decision.notice) setDeepNotice(decision.notice);
      }
    },
    onMissing: (id, reason) => setDeepNotice(reason === 'gone'
      ? `That overtime request (#${id}) no longer exists — it may have been deleted.`
      : `That overtime request (#${id}) could not be loaded — try again from the bell.`),
  });

  const actionsOf = (r: OTRecord) => (
    <span className="inline-flex gap-1">
      {r.status === 'pending' && <>
        <IconButton icon="success" size="sm" variant="ghost" label={`Approve the request from ${r.employee_name}, ${fmtDate(r.date)}`} onClick={() => openGate('approve', [r])} />
        <IconButton icon="close" size="sm" variant="ghost" label={`Reject the request from ${r.employee_name}, ${fmtDate(r.date)}`} onClick={() => openGate('reject', [r])} />
      </>}
      {r.status === 'approved' && r.payout_method === 'lieu' && <IconButton icon="clock" size="sm" variant="ghost" label={`Mark the leave as taken for the request from ${r.employee_name}, ${fmtDate(r.date)}`} onClick={() => setTakeFor(r)} />}
      <IconButton icon="edit" size="sm" variant="ghost" label={`Edit the request from ${r.employee_name}, ${fmtDate(r.date)}`} onClick={() => setFormFor({ record: r })} />
      <IconButton icon="select-similar" size="sm" variant="ghost" label={`Select similar requests to the one from ${r.employee_name}, ${fmtDate(r.date)} (same person, same day)`} onClick={() => selectSimilar(r)} />
      <IconButton icon="delete" size="sm" variant="ghost" label={`Delete the request from ${r.employee_name}, ${fmtDate(r.date)}`} onClick={() => remove(r)} />
    </span>
  );
  const COLUMNS: Column<OTRecord>[] = [
    { id: 'employee', header: 'Employee', sortable: true, sticky: true, cell: r => <div className="min-w-0"><p className="font-medium text-ink">{r.employee_name}</p><p className="text-caption text-ink-muted">{[r.employee_id, r.position].filter(Boolean).join(', ')}</p><RegisterFlag match={register.matchOf(r)} /></div> },
    { id: 'type', header: 'Type', cell: r => <div className="flex flex-wrap gap-1"><Badges r={r} /></div> },
    { id: 'cost', header: 'Cost centre', hideBelow: 'lg', cell: r => <span className="text-ink-muted">{overtimeCostCentre(r)}</span> },
    { id: 'date', header: 'Date', sortable: true, cell: r => <div className="whitespace-nowrap"><p className="tabular">{fmtDate(r.date)}</p><p className="text-caption text-ink-muted tabular">{timeSpan(r)}</p></div> },
    { id: 'hours', header: 'Hours', sortable: true, numeric: true, cell: r => { const h = recordHours(r); return h > 0 ? <span className="font-semibold tabular">{h.toFixed(1)}h</span> : <span className="text-ink-muted">Not set</span>; } },
    { id: 'reason', header: 'Reason', hideBelow: 'lg', cell: r => <span className="line-clamp-2 max-w-[16rem]">{r.reason || <span className="text-ink-muted">None</span>}</span> },
    { id: 'status', header: 'Status', cell: r => { const s = statusMeta(r.status); return <StatusBadge tone={s.tone}>{s.label}</StatusBadge>; } },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        breadcrumbs={[{ label: 'Time & Attendance' }, { label: 'Overtime' }]}
        title="Overtime"
        description={scope ? `Submit overtime, approve it with a signature, and see where the hours go — showing ${scope} only.` : 'Submit overtime, approve it with a signature, and see where the hours go.'}
        actions={(
          <>
            <IconButton icon="refresh" label="Refresh overtime" variant="shell" pending={list.loading && list.loaded} onClick={() => list.refetch()} />
            {engineering.length > 0 && <DownloadButton data={engineering as unknown as Record<string, unknown>[]} columns={EXPORT_COLUMNS} filename={exportFilename('overtime_records')} title="Engineering Cost Centre Overtime Records" subtitle="Overtime charged to other departments is excluded." formats={['excel']} />}
            <Button variant="secondary" icon="employees" disabled={!list.loaded} onClick={() => setBulkOpen(true)}>Bulk entry</Button>
            <Button variant="primary" icon="plus" disabled={!list.loaded} onClick={() => setFormFor({ record: null })}>New request</Button>
          </>
        )}
      />

      {deepNotice && (
        <Notice tone="warning" title={deepNotice} action={<Button size="sm" variant="ghost" aria-label="Dismiss notification message" onClick={() => setDeepNotice(null)}>Dismiss</Button>} />
      )}

      <MetricGrid compact>
        <MetricTile compact label="Requests" value={stats.total} selected={filters.status === ALL} onClick={() => set({ status: ALL })} {...tile} />
        <MetricTile compact label="Pending" tone={stats.pending ? 'warning' : 'default'} value={stats.pending} selected={filters.status === 'pending'} onClick={() => set({ status: filters.status === 'pending' ? ALL : 'pending' })} {...tile} />
        <MetricTile compact label="Approved" tone="success" value={stats.approved} selected={filters.status === 'approved'} onClick={() => set({ status: filters.status === 'approved' ? ALL : 'approved' })} {...tile} />
        <MetricTile compact label="Total hours" value={`${Math.round(stats.hours)}h`} {...tile} />
      </MetricGrid>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList aria-label="Overtime sections">
          <TabsTrigger value="records" icon="documents">Records</TabsTrigger>
          <TabsTrigger value="insights" icon="analytics">Insights</TabsTrigger>
          <TabsTrigger value="weekly" icon="week">Weekly summary</TabsTrigger>
        </TabsList>

        <TabsContent value="records" className="mt-4 flex flex-col gap-4">
          <Toolbar
            filtered={filtered}
            onClear={clear}
            activeCount={[filters.from, filters.to].filter(Boolean).length}
            trailing={(<>
              <Select aria-label="Order" className="w-36" value={order} onValueChange={v => { setOrder(v as 'asc' | 'desc'); setSort(null); }} options={ORDER} />
              <ViewToggle value={view} onValueChange={setView} options={VIEW_CARDS_TABLE} />
            </>)}
            moreFilters={(
              <>
              <FilterField label="From date"><Input type="date" aria-label="From date" value={filters.from} onChange={e => set({ from: e.target.value })} /></FilterField>
              <FilterField label="To date"><Input type="date" aria-label="To date" value={filters.to} onChange={e => set({ to: e.target.value })} /></FilterField>
              </>
            )}
          >
            <SearchField value={filters.search} onValueChange={search => set({ search })} placeholder="Search requests" wrapperClassName="min-w-48 max-w-sm flex-1 max-md:max-w-none max-md:basis-full" />
            <Select aria-label="Status" className="w-36" value={filters.status} onValueChange={v => set({ status: v })} options={STATUS_OPTIONS} />
            <Select aria-label="Type" className="w-36" value={filters.type} onValueChange={v => set({ type: v })} options={TYPE_OPTIONS} />
          </Toolbar>
          <div className="flex flex-wrap items-start gap-3">
            {months.length > 0 && (
              <FilterField label="Month">
                <Select aria-label="Filter by month" className="w-44" value={activeMonth ?? ''} onValueChange={chooseMonth} options={monthChoices} />
              </FilterField>
            )}
            <div className="max-w-md flex-1 basis-64"><EmployeePicks single label="Employee" value={people} onChange={p => { setPeople(p.slice(0, 1)); setPage(1); }} hint="Show only this person's overtime." /></div>
          </div>
          {personStats && (
            <PersonStatsStrip
              name={personStats.person.name}
              range={activeMonth ? months.find(m => m.key === activeMonth)?.label ?? '' : [filters.from, filters.to].filter(Boolean).join(' to ') || 'All dates'}
              summary={personStats.summary}
            />
          )}

          {selected.size > 0 && (
            <div className="flex flex-wrap items-center gap-2 rounded-control border border-line bg-action-soft/50 px-4 py-2.5" role="region" aria-label="Bulk actions">
              <span className="font-sans text-label font-semibold text-ink">{selected.size} selected, {pending.length} pending</span>
              <Button size="sm" icon="success" disabled={pending.length === 0} onClick={() => openGate('approve', pending)}>Approve</Button>
              <Button size="sm" icon="close" disabled={pending.length === 0} onClick={() => openGate('reject', pending)}>Reject</Button>
              <Button size="sm" icon="edit" onClick={() => setBulkEditOpen(true)}>Edit</Button>
              <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setSelected(new Set())}>Clear selection</Button>
            </div>
          )}

          <RegisterNotice count={unmatched.length} noun="overtime request" only={unmatchedOnly} onToggle={() => { setUnmatchedOnly(v => !v); setPage(1); }} onDeleteAll={deletableUnmatched.length > 0 ? { count: deletableUnmatched.length, pending: deleting, run: removeUnmatched } : undefined} />

          <DataRegion
            status={status} subject="overtime requests" error={list.error} onRetry={() => list.refetch()}
            empty={filtered
              ? <EmptyState icon="search" title="No overtime requests match" description="Try different filters." action={<Button onClick={clear}>Clear filters</Button>} />
              : scope ? <EmptyState icon="clock" title={`No ${scope} overtime requests yet`} description="Submit the first request." action={<Button variant="primary" icon="plus" onClick={() => setFormFor({ record: null })}>New request</Button>} /> : <EmptyState icon="clock" title="No overtime requests yet" description="Submit the first request." action={<Button variant="primary" icon="plus" onClick={() => setFormFor({ record: null })}>New request</Button>} />}
          >
            <p className="font-sans text-caption text-ink-muted">{matches.length} {matches.length === 1 ? 'request' : 'requests'}{matches.length !== records.length ? ` of ${records.length}` : ''}</p>
            {view === 'cards' ? (
              <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Overtime requests">
                {visible.map(r => {
                  const s = statusMeta(r.status); const h = recordHours(r);
                  return (
                    <li key={String(r.id)} className="relative">
                      <RecordCard
                        eyebrow={fmtDate(r.date)} title={r.employee_name} subtitle={[r.employee_id, r.position].filter(Boolean).join(', ')} openLabel={`Open the request from ${r.employee_name}, ${fmtDate(r.date)}`} onOpen={() => setViewingId(String(r.id))}
                        status={<><StatusBadge tone={s.tone}>{s.label}</StatusBadge><RegisterFlag match={register.matchOf(r)} /></>}
                        facts={[{ label: 'Type', value: <span className="flex flex-wrap gap-1"><Badges r={r} /></span> }, { label: 'Time', value: <span className="tabular">{timeSpan(r)}{h > 0 && <span className="font-semibold">, {h.toFixed(1)}h</span>}</span> }, { label: 'Cost centre', value: overtimeCostCentre(r) }, ...(r.reason ? [{ label: 'Reason', value: <span className="line-clamp-2">{r.reason}</span> }] : [])]}
                        action={actionsOf(r)}
                      />
                    </li>
                  );
                })}
              </ul>
            ) : (
              <DataTable caption="Overtime requests" rows={visible} columns={COLUMNS} getRowId={r => String(r.id)} sort={sort} onSortChange={setSort} selected={selected} onSelectedChange={setSelected} onRowActivate={r => setViewingId(String(r.id))} rowActions={actionsOf} />
            )}
            {rows.length > 25 && (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Pagination page={page} pageSize={pageSize} total={rows.length} onPageChange={setPage} className="flex-1" />
                <Select aria-label="Requests per page" className="w-36" value={String(pageSize)} onValueChange={v => { setPageSize(Number(v)); setPage(1); }} options={SIZES} />
              </div>
            )}
          </DataRegion>
        </TabsContent>

        <TabsContent value="insights" className="mt-4">
          {list.loaded
            ? <InsightsView records={matches} employees={employees} picked={employeeIds} onToggle={togglePerson} />
            : (list.error ? <p className="font-sans text-body-sm text-ink-muted">The requests could not be loaded; see the Records tab.</p> : <LoadingPulse compact label="Loading requests" />)}
        </TabsContent>

        <TabsContent value="weekly" className="mt-4">
          {list.loaded
            ? <WeeklySummary records={records} employees={employees} />
            : (list.error ? <p className="font-sans text-body-sm text-ink-muted">The requests could not be loaded; see the Records tab.</p> : <LoadingPulse compact label="Loading requests" />)}
        </TabsContent>
      </Tabs>

      <OvertimeDetail record={viewing} takenLeave={takenLeave} onClose={() => setViewingId(null)} onEdit={r => { setViewingId(null); setFormFor({ record: r }); }} onDelete={remove} onApprove={r => openGate('approve', [r])} onReject={r => openGate('reject', [r])} onTakeAsLeave={r => setTakeFor(r)} onCancelRequest={cancelRequest} />
      <TakeLieuLeaveDialog record={takeFor} open={!!takeFor} onOpenChange={o => { if (!o) setTakeFor(null); }} onTaken={taken} />
      <OvertimeForm open={!!formFor} record={formFor?.record ?? null} records={records} onOpenChange={o => { if (!o) setFormFor(null); }} onSave={save} />
      <BulkOvertimeForm open={bulkOpen} initial={people} records={records} onOpenChange={setBulkOpen} onCreated={() => list.refetch()} />
      <OTBulkEditDialog open={bulkEditOpen} records={selectedRecords} onOpenChange={setBulkEditOpen} onApplied={appliedBulkEdit} />
      {gate && (
        <ApprovalGate
          title={gate.ids.length === 1 ? (gate.kind === 'approve' ? 'Approve overtime request' : 'Reject overtime request') : `${gate.kind === 'approve' ? 'Approve' : 'Reject'} ${gate.ids.length} overtime requests`}
          description={gate.ids.length === 1 && gateRecords[0] ? `${gateRecords[0].employee_name}, ${fmtDate(gateRecords[0].date)}` : `${gate.ids.length} pending requests selected`}
          actionLabel={gate.ids.length === 1 ? (gate.kind === 'approve' ? 'Sign and approve' : 'Sign and reject') : (gate.kind === 'approve' ? 'Sign and approve all' : 'Sign and reject all')}
          requiredRole="manager" variant={gate.kind} preferSavedSignature={gate.kind === 'approve'} onConfirm={decide} onCancel={() => setGate(null)}
        />
      )}
    </div>
  );
}

export default function OvertimePage() {
  return <AppShell migrated><Suspense fallback={null}><OvertimeContent /></Suspense></AppShell>;
}
