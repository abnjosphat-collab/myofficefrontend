// app/breakdowns/page.tsx — equipment breakdowns: log them, track them to resolution, and see where and when machines fail. Records as
// cards or a table with filters that also scope the Analytics tab (the full analytics page is linked from it).
'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { AppShell } from '@/components/app-shell';
import {
  Button, DataRegion, DataTable, EmptyState, IconButton, Input, Menu, MenuContent, MenuItem, MenuTrigger, MetricGrid, MetricTile, Notice, PageHeader, Pagination, RecordCard, SearchField, Select,
  StatusBadge, Tabs, TabsContent, TabsList, TabsTrigger, Toolbar, ViewToggle, VIEW_CARDS_TABLE, deriveDataStatus, isTransientStatus, pageSlice, useConfirm, useViewPreference, type Column,
} from '@/components/ui-system';
import { DownloadButton, type DLColumn } from '@/components/shared/DownloadButton';
import { fmtDate, formatCurrency } from '@/components/shared/utils';
import { exportFilename } from '@/lib/exportUtils';
import { minutesToDisplay } from './calcBreakdowns';
import { BreakdownDetail } from './BreakdownDetail';
import { BreakdownForm } from './BreakdownForm';
import { ALL, NO_FILTERS, OPEN, costOf, distinct, downtimeOf, filterBreakdowns, isFiltered, sortBreakdowns, summarise, type Filters, type SortKey } from './breakdownLogic';
import { PRIORITIES, STATUSES, TYPES, priorityMeta, statusMeta, typeMeta } from './breakdownMeta';
import { InsightsPanel } from './insights/InsightsPanel';
import type { Breakdown, BreakdownFormData } from './types';
import { createBreakdown, deleteBreakdown, insightQuery, updateBreakdown, useBreakdowns } from './useBreakdownsData';

const PAGE_SIZE = 24;
const SORTS: { value: SortKey; label: string }[] = [{ value: 'date', label: 'Date' }, { value: 'machine', label: 'Machine' }, { value: 'priority', label: 'Priority' }, { value: 'status', label: 'Status' }, { value: 'downtime', label: 'Downtime' }, { value: 'cost', label: 'Parts cost' }];
const opts = (any: string, list: { value: string; label: string }[]) => [{ value: ALL, label: any }, ...list.map(m => ({ value: m.value, label: m.label }))];
const EXPORT: DLColumn[] = [
  { key: 'machine_name', label: 'Machine', width: 22 }, { key: 'machine_id', label: 'Machine ID', width: 14 }, { key: 'breakdown_description', label: 'Description', width: 32 },
  { key: 'status', label: 'Status', width: 14, format: v => statusMeta(String(v)).label }, { key: 'priority', label: 'Priority', width: 12, format: v => priorityMeta(String(v)).label },
  { key: 'breakdown_type', label: 'Type', width: 14, format: v => typeMeta(String(v)).label }, { key: 'breakdown_nature', label: 'Nature', width: 18 }, { key: 'location', label: 'Location', width: 18 },
  { key: 'department', label: 'Department', width: 16 }, { key: 'artisan_name', label: 'Artisan', width: 18 }, { key: 'breakdown_date', label: 'Date', width: 14, format: v => (v ? fmtDate(String(v)) : '') },
  { key: 'downtime', label: 'Downtime', width: 12, format: (_v, row) => minutesToDisplay(downtimeOf(row as unknown as Breakdown)) }, { key: 'cost', label: 'Parts cost', width: 12, format: (_v, row) => costOf(row as unknown as Breakdown).toFixed(2) },
];

function BreakdownsContent() {
  const confirm = useConfirm();
  const list = useBreakdowns();
  const rows = list.items;
  const [view, setView] = useViewPreference('breakdowns', VIEW_CARDS_TABLE);
  const [tab, setTab] = useState('records');
  const [f, setF] = useState<Filters>(NO_FILTERS);
  const [sort, setSort] = useState<SortKey>('date');
  const [dir, setDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [formFor, setFormFor] = useState<{ record: Breakdown | null } | null>(null);
  const [viewingId, setViewingId] = useState<number | null>(null);
  const set = (patch: Partial<Filters>) => { setF(prev => ({ ...prev, ...patch })); setPage(1); };
  const clear = () => { setF(NO_FILTERS); setPage(1); };

  const viewing = useMemo(() => rows.find(b => b.id === viewingId) ?? null, [rows, viewingId]);
  const matches = useMemo(() => sortBreakdowns(filterBreakdowns(rows, f), sort, dir), [rows, f, sort, dir]);
  const visible = pageSlice(matches, page, PAGE_SIZE);
  const stats = useMemo(() => summarise(rows), [rows]);
  const departments = useMemo(() => distinct(rows, b => b.department), [rows]);
  const locations = useMemo(() => distinct(rows, b => b.location), [rows]);
  const filtered = isFiltered(f);
  const status = deriveDataStatus({ loaded: list.loaded, loading: list.loading, error: list.error, errorStatus: list.errorStatus, count: matches.length, transient: isTransientStatus(list.errorStatus) });
  const tile = { loading: list.loading && !list.loaded, unavailable: !list.loaded && !list.loading };
  const query = useMemo(() => insightQuery({ from: f.from, to: f.to, department: f.department, status: f.status, type: f.type, priority: f.priority, location: f.location }), [f]);

  const save = async (form: BreakdownFormData, id?: number) => { if (id) await updateBreakdown(id, form); else await createBreakdown(form); await list.refetch(); };
  const remove = async (b: Breakdown) => {
    if (!await confirm({ title: 'Delete this breakdown?', message: `${b.machine_name}, ${b.breakdown_date ? fmtDate(b.breakdown_date) : 'no date'}. This cannot be undone.`, confirmLabel: 'Delete', destructive: true })) return;
    try { await deleteBreakdown(b.id); setViewingId(null); toast.success('Breakdown deleted.'); await list.refetch(); }
    catch (e) { toast.error(`The breakdown was not deleted: ${(e as Error).message}`); }
  };

  const actionsOf = (b: Breakdown) => (
    <Menu>
      <MenuTrigger asChild><IconButton icon="more-vertical" size="sm" variant="ghost" label={`More actions for ${b.machine_name}`} /></MenuTrigger>
      <MenuContent><MenuItem icon="eye" onSelect={() => setViewingId(b.id)}>View</MenuItem><MenuItem icon="edit" onSelect={() => setFormFor({ record: b })}>Edit</MenuItem><MenuItem icon="delete" onSelect={() => remove(b)}>Delete</MenuItem></MenuContent>
    </Menu>
  );
  const badges = (b: Breakdown) => <><StatusBadge tone={statusMeta(b.status).tone}>{statusMeta(b.status).label}</StatusBadge><StatusBadge tone={priorityMeta(b.priority).tone}>{priorityMeta(b.priority).label}</StatusBadge></>;
  const downtimeText = (b: Breakdown) => (downtimeOf(b) > 0 ? minutesToDisplay(downtimeOf(b)) : 'Not recorded');
  const COLUMNS: Column<Breakdown>[] = [
    { id: 'machine', header: 'Machine', sticky: true, cell: b => <div className="min-w-0"><p className="font-medium text-ink [overflow-wrap:anywhere]">{b.machine_name}</p><p className="text-caption text-ink-muted">{b.machine_id}</p></div> },
    { id: 'date', header: 'Date', cell: b => <span className="whitespace-nowrap tabular">{b.breakdown_date ? fmtDate(b.breakdown_date) : 'No date'}</span> },
    { id: 'status', header: 'Status', cell: b => <StatusBadge tone={statusMeta(b.status).tone}>{statusMeta(b.status).label}</StatusBadge> },
    { id: 'priority', header: 'Priority', hideBelow: 'md', cell: b => <StatusBadge tone={priorityMeta(b.priority).tone}>{priorityMeta(b.priority).label}</StatusBadge> },
    { id: 'type', header: 'Kind', hideBelow: 'lg', cell: b => typeMeta(b.breakdown_type).label },
    { id: 'artisan', header: 'Artisan', hideBelow: 'lg', cell: b => b.artisan_name || <span className="text-ink-muted">Not assigned</span> },
    { id: 'down', header: 'Downtime', numeric: true, hideBelow: 'md', cell: b => <span className="tabular">{downtimeText(b)}</span> },
    { id: 'cost', header: 'Parts cost', numeric: true, hideBelow: 'lg', cell: b => <span className="tabular">{costOf(b) > 0 ? formatCurrency(costOf(b)) : ''}</span> },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: 'Operations & Maintenance' }, { label: 'Breakdowns' }]}
        title="Equipment breakdowns"
        description="Log, track and resolve equipment failures."
        actions={(
          <>
            <IconButton icon="refresh" label="Refresh breakdowns" variant="outline" pending={list.loading && list.loaded} onClick={() => list.refetch()} />
            {list.loaded && matches.length > 0 && <DownloadButton data={matches as unknown as Record<string, unknown>[]} columns={EXPORT} filename={exportFilename('breakdowns')} title="Equipment Breakdowns" formats={['excel']} />}
            <Button variant="primary" icon="plus" disabled={!list.loaded} onClick={() => setFormFor({ record: null })}>Log breakdown</Button>
          </>
        )}
      />

      <MetricGrid columns={4}>
        <MetricTile label="Total" icon="breakdown" value={stats.total} selected={!filtered} onClick={clear} {...tile} />
        <MetricTile label="Open" icon="active" tone={stats.open ? 'warning' : 'default'} value={stats.open} detail="Logged or in progress" selected={f.status === OPEN} onClick={() => set({ status: f.status === OPEN ? ALL : OPEN })} {...tile} />
        <MetricTile label="Critical" icon="critical" tone={stats.critical ? 'danger' : 'default'} value={stats.critical} selected={f.priority === 'critical'} onClick={() => set({ priority: f.priority === 'critical' ? ALL : 'critical' })} {...tile} />
        <MetricTile label="Average downtime" icon="clock" value={stats.avgDowntimeMinutes === null ? 'None yet' : minutesToDisplay(stats.avgDowntimeMinutes)} detail={stats.avgDowntimeCount ? `${stats.avgDowntimeCount} finished with times` : 'No finished breakdown has times'} {...tile} />
      </MetricGrid>

      <Toolbar filtered={filtered} trailing={tab === 'records' ? <ViewToggle value={view} onValueChange={setView} options={VIEW_CARDS_TABLE} /> : undefined}>
        <SearchField value={f.search} onValueChange={search => set({ search })} placeholder="Search machine, artisan, place or notes" wrapperClassName="min-w-48 max-w-md flex-1" />
        <Select aria-label="Status" className="w-40" value={f.status} onValueChange={v => set({ status: v })} options={[{ value: ALL, label: 'Any status' }, { value: OPEN, label: 'Open' }, ...STATUSES.map(m => ({ value: m.value, label: m.label }))]} />
        <Select aria-label="Priority" className="w-36" value={f.priority} onValueChange={v => set({ priority: v })} options={opts('Any priority', PRIORITIES)} />
        <Select aria-label="Kind of fault" className="w-36" value={f.type} onValueChange={v => set({ type: v })} options={opts('Any kind', TYPES)} />
        {departments.length > 1 && <Select aria-label="Department" className="w-40" value={f.department} onValueChange={v => set({ department: v })} options={[{ value: ALL, label: 'Any department' }, ...departments.map(d => ({ value: d, label: d }))]} />}
        <Select aria-label="Location" className="w-44" value={f.location} onValueChange={v => set({ location: v })} options={[{ value: ALL, label: 'Any location' }, ...locations.map(l => ({ value: l, label: l }))]} />
        <div role="group" aria-label="Date range" className="flex items-center gap-2"><Input aria-label="From date" type="date" className="w-40" value={f.from} onChange={e => set({ from: e.target.value })} /><span className="font-sans text-body-sm text-ink-muted">to</span><Input aria-label="To date" type="date" className="w-40" value={f.to} onChange={e => set({ to: e.target.value })} /></div>
        {tab === 'records' && <Select aria-label="Sort by" className="w-36" value={sort} onValueChange={v => setSort(v as SortKey)} options={SORTS} />}
        {tab === 'records' && <IconButton icon="sort" variant="outline" label={dir === 'asc' ? 'Ascending, reverse' : 'Descending, reverse'} onClick={() => setDir(d => (d === 'asc' ? 'desc' : 'asc'))} />}
        {filtered && <Button variant="ghost" icon="close" onClick={clear}>Clear filters</Button>}
      </Toolbar>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList aria-label="Breakdown views">
          <TabsTrigger value="records" icon="table-view">Records</TabsTrigger>
          <TabsTrigger value="analytics" icon="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="records" className="mt-4 flex flex-col gap-4">
          <DataRegion
            status={status} subject="breakdowns" error={list.error} onRetry={() => list.refetch()}
            empty={filtered
              ? <EmptyState icon="search" title="No breakdowns match" description="Try fewer filters or a different search." action={<Button onClick={clear}>Clear filters</Button>} />
              : <EmptyState icon="breakdown" title="No breakdowns logged yet" description="Log the first one when a machine fails." action={<Button variant="primary" icon="plus" onClick={() => setFormFor({ record: null })}>Log breakdown</Button>} />}
          >
            <p className="font-sans text-caption text-ink-muted" role="status">{matches.length} {matches.length === 1 ? 'breakdown' : 'breakdowns'}{matches.length !== rows.length ? ` of ${rows.length}` : ''}</p>
            {view === 'cards' ? (
              <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Breakdowns">
                {visible.map(b => (
                  <li key={b.id} className="relative">
                    <RecordCard
                      eyebrow={b.machine_id} title={b.machine_name} subtitle={b.breakdown_description || undefined} openLabel={`Open the breakdown of ${b.machine_name}, ${b.breakdown_date ? fmtDate(b.breakdown_date) : 'no date'}`} onOpen={() => setViewingId(b.id)} status={badges(b)}
                      facts={[{ label: 'Date', value: b.breakdown_date ? fmtDate(b.breakdown_date) : 'No date' }, { label: 'Kind', value: typeMeta(b.breakdown_type).label }, ...(b.location ? [{ label: 'Location', value: b.location }] : []), ...(b.artisan_name ? [{ label: 'Artisan', value: b.artisan_name }] : []), { label: 'Downtime', value: downtimeText(b) }, ...(costOf(b) > 0 ? [{ label: 'Parts', value: formatCurrency(costOf(b)) }] : [])]}
                      action={actionsOf(b)}
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <DataTable caption="Breakdowns" rows={visible} columns={COLUMNS} getRowId={b => String(b.id)} onRowActivate={b => setViewingId(b.id)} rowActions={actionsOf} />
            )}
            {matches.length > PAGE_SIZE && <Pagination page={page} pageSize={PAGE_SIZE} total={matches.length} onPageChange={setPage} />}
          </DataRegion>
        </TabsContent>

        <TabsContent value="analytics" className="mt-4 flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-sans text-body-sm text-ink-muted">Counted from the same records, with the filters above. Search does not apply here.</p>
            <Button asChild icon="external"><Link href="/breakdowns/analytics">Open the full analytics page</Link></Button>
          </div>
          {f.status === OPEN && <Notice tone="info" title="Open is a records filter">The analytics cover every status; choose a single status above to narrow them.</Notice>}
          <InsightsPanel query={query} enabled={tab === 'analytics'} />
        </TabsContent>
      </Tabs>

      <BreakdownDetail record={viewing} onClose={() => setViewingId(null)} onEdit={b => { setViewingId(null); setFormFor({ record: b }); }} onDelete={remove} />
      <BreakdownForm open={!!formFor} record={formFor?.record ?? null} onOpenChange={o => { if (!o) setFormFor(null); }} onSave={save} />
    </div>
  );
}

export default function BreakdownsPage() {
  return <AppShell migrated><BreakdownsContent /></AppShell>;
}
