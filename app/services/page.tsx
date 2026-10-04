// app/services/page.tsx — third party services: contractor jobs and where each is in the six-step approval circuit
// (planning, engineering manager, finance, GM, stores/GRV, payment). Cards, table or a one-row-per-job sheet.
'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AppShell } from '@/components/app-shell';
import {
  Button, DataRegion, DataTable, EmptyState, IconButton, Input, MetricGrid, MetricTile, PageHeader, Pagination, Progress, RecordCard, SearchField, Select, StatusBadge,
  Toolbar, ViewToggle, deriveDataStatus, isTransientStatus, pageSlice, useConfirm, useViewPreference, type Column,
} from '@/components/ui-system';
import { fmtDate } from '@/components/shared/utils';
import { useAuth } from '@/lib/auth-context';
import { ImportDialog } from './ImportDialog';
import { ServiceDetail } from './ServiceDetail';
import { ServiceForm } from './ServiceForm';
import { CATEGORIES, STAGES, STAGE_COUNT, STATUS, type StageKey } from './meta';
import { NO_FILTERS, filterRecords, isFiltered, references, sortRecords, statusOf, summarise, isStageDone, withStage, type ServiceFilters, type SortKey, type StageDraft } from './serviceLogic';
import { createService, deleteService, saveStageSignature, updateService, useServices } from './useServicesData';
import type { ServiceRecord } from './types';

const VIEWS = [
  { value: 'cards', label: 'Card view', icon: 'grid-view' }, { value: 'table', label: 'Table view', icon: 'table-view' }, { value: 'sheet', label: 'Sheet view', icon: 'sheet-view' },
] as const;
const SORTS: { value: SortKey; label: string }[] = [
  { value: 'newest', label: 'Recently added' }, { value: 'oldest', label: 'Oldest added' }, { value: 'date_desc', label: 'Service date, newest' }, { value: 'date_asc', label: 'Service date, oldest' },
  { value: 'supplier', label: 'Supplier, A to Z' }, { value: 'progress_desc', label: 'Furthest along' },
];
const ALL = '__all__';
const PAGE_SIZE = 24;

const Tick = ({ done }: { done: boolean }) => (done ? <span className="text-success" role="img" aria-label="Complete">✓</span> : <span className="text-ink-muted" role="img" aria-label="Not complete">–</span>);

function ServicesContent() {
  const confirm = useConfirm();
  const { profile } = useAuth();
  const list = useServices();
  const records = list.items;
  const [view, setView] = useViewPreference('services', VIEWS);
  const [filters, setFilters] = useState<ServiceFilters>(NO_FILTERS);
  const [sort, setSort] = useState<SortKey>('newest');
  const [page, setPage] = useState(1);
  const [formFor, setFormFor] = useState<{ record: ServiceRecord | null } | null>(null);
  const [importing, setImporting] = useState(false);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const set = (patch: Partial<ServiceFilters>) => { setFilters(f => ({ ...f, ...patch })); setPage(1); };

  const viewing = useMemo(() => records.find(r => r.id === viewingId) ?? null, [records, viewingId]);
  const matches = useMemo(() => sortRecords(filterRecords(records, filters), sort), [records, filters, sort]);
  const visible = pageSlice(matches, page, PAGE_SIZE);
  const counts = useMemo(() => summarise(records), [records]);
  const filtered = isFiltered(filters);
  const status = deriveDataStatus({ loaded: list.loaded, loading: list.loading, error: list.error, errorStatus: list.errorStatus, count: matches.length, transient: isTransientStatus(list.errorStatus) });
  const tile = { loading: list.loading && !list.loaded, unavailable: !list.loaded && !list.loading };
  const who = profile?.full_name || profile?.email || '';
  const open = (r: ServiceRecord) => setViewingId(r.id);

  const save = async (r: ServiceRecord) => {
    if (r.id) { const saved = await updateService(r); list.setItems(prev => prev.map(x => (x.id === saved.id ? saved : x))); }
    else { await createService(r); await list.refetch(); }
  };
  const saveStage = async (id: string, key: StageKey, d: StageDraft, signature?: string) => {
    const current = records.find(r => r.id === id);
    if (!current) throw new Error('This job is no longer in the register.');
    // The signature is kept first: if it cannot be stored the stage is not completed, so a signed stage always has its image.
    if (signature) await saveStageSignature(id, key, signature);
    const saved = await updateService(withStage(current, key, d));
    list.setItems(prev => prev.map(x => (x.id === saved.id ? saved : x)));
    toast.success(d.done ? `${STAGES.find(s => s.key === key)!.label} marked complete.` : 'Stage reopened.');
  };
  const remove = async (r: ServiceRecord) => {
    if (!await confirm({ title: 'Delete this job?', message: `${r.description || 'This job'} and its record are removed. This cannot be undone.`, confirmLabel: 'Delete', destructive: true })) return;
    try { await deleteService(r.id); setViewingId(null); toast.success('Job deleted.'); await list.refetch(); }
    catch (e) { toast.error(`The job was not deleted: ${(e as Error).message}`); }
  };

  const rowActions = (r: ServiceRecord) => (
    <span className="inline-flex gap-1">
      <IconButton icon="edit" size="sm" variant="ghost" label={`Edit ${r.description || 'job'}`} onClick={() => setFormFor({ record: r })} />
      <IconButton icon="delete" size="sm" variant="ghost" label={`Delete ${r.description || 'job'}`} onClick={() => remove(r)} />
    </span>
  );
  const TABLE: Column<ServiceRecord>[] = [
    { id: 'date', header: 'Date', sticky: true, cell: r => <span className="whitespace-nowrap tabular">{r.date ? fmtDate(r.date) : <span className="text-ink-muted">No date</span>}</span> },
    { id: 'job', header: 'Job', cell: r => <div className="min-w-0"><p className="font-medium text-ink [overflow-wrap:anywhere]">{r.description || 'No description'}</p>{r.supplier && <p className="text-caption text-ink-muted">{r.supplier}</p>}</div> },
    { id: 'refs', header: 'References', hideBelow: 'md', cell: r => <span className="text-ink-muted">{references(r).join(', ') || 'None'}</span> },
    { id: 'amount', header: 'Amount', numeric: true, hideBelow: 'md', cell: r => r.amount || <span className="text-ink-muted">Not set</span> },
    { id: 'progress', header: 'Approvals', cell: r => { const s = statusOf(r); return <div className="flex min-w-36 flex-col gap-1"><StatusBadge tone={s.tone}>{s.label}</StatusBadge><span className="font-sans text-caption text-ink-muted tabular">{s.done} of {STAGE_COUNT}</span></div>; } },
    { id: 'category', header: 'Category', hideBelow: 'lg', cell: r => r.category || <span className="text-ink-muted">None</span> },
  ];
  const SHEET: Column<ServiceRecord>[] = [
    { id: 'no', header: 'No.', cell: r => <span className="tabular text-ink-muted">{matches.indexOf(r) + 1}</span> },
    { id: 'date', header: 'Date', cell: r => <span className="whitespace-nowrap tabular">{r.date ? fmtDate(r.date) : ''}</span> },
    { id: 'supplier', header: 'Contractor', sticky: true, cell: r => <span className="whitespace-nowrap font-medium">{r.supplier}</span> },
    { id: 'task', header: 'Task description', cell: r => <span className="line-clamp-2 min-w-56 max-w-xs">{r.description}</span> },
    { id: 'pr', header: 'PR#', cell: r => r.requisition_number }, { id: 'po', header: 'PO#', cell: r => r.order_number }, { id: 'inv', header: 'Invoice #', cell: r => r.invoice_number },
    ...(['planning', 'engineering_manager', 'finance', 'gm', 'stores'] as const).map(k => ({ id: k, header: STAGES.find(s => s.key === k)!.short, cell: (r: ServiceRecord) => <Tick done={isStageDone(r, k)} /> })),
    { id: 'grv', header: 'GRV#', cell: r => r.stores.grv_number },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: 'Operations & Maintenance' }, { label: 'Third party services' }]}
        title="Third party services"
        description="Contractor jobs, and where each one is in the approval circuit from planning to payment."
        actions={(
          <>
            <IconButton icon="refresh" label="Refresh services" variant="outline" pending={list.loading && list.loaded} onClick={() => list.refetch()} />
            <Button icon="upload" disabled={!list.loaded} onClick={() => setImporting(true)}>Import or scan</Button>
            <Button variant="primary" icon="plus" disabled={!list.loaded} onClick={() => setFormFor({ record: null })}>New service</Button>
          </>
        )}
      />

      <MetricGrid columns={5}>
        <MetricTile label="Jobs" icon="service" value={counts.total} selected={filters.status === ''} onClick={() => set({ status: '' })} {...tile} />
        <MetricTile label={STATUS.in_progress.label} icon="pending" tone={counts.in_progress ? 'warning' : 'default'} value={counts.in_progress} selected={filters.status === 'in_progress'} onClick={() => set({ status: filters.status === 'in_progress' ? '' : 'in_progress' })} {...tile} />
        <MetricTile label={STATUS.completed.label} icon="success" tone="success" value={counts.completed} selected={filters.status === 'completed'} onClick={() => set({ status: filters.status === 'completed' ? '' : 'completed' })} {...tile} />
        <MetricTile label={STATUS.not_started.label} icon="draft" value={counts.not_started} selected={filters.status === 'not_started'} onClick={() => set({ status: filters.status === 'not_started' ? '' : 'not_started' })} {...tile} />
        <MetricTile label="This month" icon="month" value={counts.thisMonth} detail="By service date" {...tile} />
      </MetricGrid>

      <Toolbar filtered={filtered} trailing={<ViewToggle value={view} onValueChange={setView} options={VIEWS} />}>
        <SearchField value={filters.search} onValueChange={search => set({ search })} placeholder="Search jobs and references" wrapperClassName="min-w-48 max-w-md flex-1" />
        <Select aria-label="Category" className="w-44" value={filters.category || ALL} onValueChange={v => set({ category: v === ALL ? '' : v })} options={[{ value: ALL, label: 'Every category' }, ...CATEGORIES.map(c => ({ value: c, label: c }))]} />
        <Input type="date" aria-label="From date" className="w-40" value={filters.from} onChange={e => set({ from: e.target.value })} />
        <Input type="date" aria-label="To date" className="w-40" value={filters.to} onChange={e => set({ to: e.target.value })} />
        <Select aria-label="Order" className="w-48" value={sort} onValueChange={v => setSort(v as SortKey)} options={SORTS} />
        {filtered && <Button variant="ghost" icon="close" onClick={() => { setFilters(NO_FILTERS); setPage(1); }}>Clear filters</Button>}
      </Toolbar>

      <DataRegion
        status={status} subject="services" error={list.error} onRetry={() => list.refetch()}
        empty={filtered
          ? <EmptyState icon="search" title="No jobs match" description="Try a different search or clear the filters." action={<Button onClick={() => { setFilters(NO_FILTERS); setPage(1); }}>Clear filters</Button>} />
          : <EmptyState icon="service" title="No services recorded yet" description="Add the first job, or import a spreadsheet." action={<Button variant="primary" icon="plus" onClick={() => setFormFor({ record: null })}>New service</Button>} />}
      >
        <p className="font-sans text-caption text-ink-muted">{matches.length} {matches.length === 1 ? 'job' : 'jobs'}{matches.length !== records.length ? ` of ${records.length}` : ''}</p>
        {view === 'cards' ? (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Services">
            {visible.map(r => {
              const s = statusOf(r);
              return (
                <li key={r.id} className="relative">
                  <RecordCard
                    eyebrow={r.date ? fmtDate(r.date) : 'No date'} title={r.description || 'No description'} subtitle={r.supplier || undefined} openLabel={`Open ${r.description || 'job'}`} onOpen={() => open(r)}
                    status={<><StatusBadge tone={s.tone}>{s.label}</StatusBadge>{r.category && <StatusBadge tone="info">{r.category}</StatusBadge>}</>}
                    facts={[...(r.amount ? [{ label: 'Amount', value: r.amount }] : []), ...(references(r).length ? [{ label: 'References', value: references(r).join(', ') }] : [])]}
                    meta={<div className="w-full min-w-40"><Progress value={(s.done / STAGE_COUNT) * 100} label={`${r.description || 'Job'}: ${s.done} of ${STAGE_COUNT} approvals`} /></div>}
                    action={rowActions(r)}
                  />
                </li>
              );
            })}
          </ul>
        ) : (
          <DataTable caption={view === 'sheet' ? 'Services sheet' : 'Services register'} rows={visible} columns={view === 'sheet' ? SHEET : TABLE} getRowId={r => r.id} density={view === 'sheet' ? 'compact' : 'comfortable'} onRowActivate={open} rowActions={view === 'sheet' ? undefined : rowActions} />
        )}
        {matches.length > PAGE_SIZE && <Pagination page={page} pageSize={PAGE_SIZE} total={matches.length} onPageChange={setPage} />}
      </DataRegion>

      <ServiceDetail record={viewing} who={who} onClose={() => setViewingId(null)} onEdit={r => { setViewingId(null); setFormFor({ record: r }); }} onDelete={remove} onSaveStage={saveStage} />
      <ServiceForm open={!!formFor} record={formFor?.record ?? null} onOpenChange={o => { if (!o) setFormFor(null); }} onSave={save} />
      <ImportDialog open={importing} onOpenChange={setImporting} onScanned={r => { toast.success('Document read. Check the details before saving.'); setFormFor({ record: r }); }} onImported={() => list.refetch()} />
    </div>
  );
}

export default function ServicesPage() {
  return <AppShell migrated><ServicesContent /></AppShell>;
}
