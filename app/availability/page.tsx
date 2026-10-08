// app/availability/page.tsx — equipment availability: how much of its operating time each unit was available.
'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/app-shell';
import {
  Button, DataRegion, DataTable, EmptyState, FilterField, IconButton, MetricGrid, MetricTile, Notice, PageHeader, Panel, Progress, SearchField, Select, StatusBadge,
  Tabs, TabsContent, TabsList, TabsTrigger, Toolbar, deriveDataStatus, isTransientStatus, sortRows,
  type Column, type IconMeaning, type SortState, type Tone,
} from '@/components/ui-system';
import { DownloadButton, type DLColumn } from '@/components/shared/DownloadButton';
import { fmtDate as formatDate } from '@/components/shared/utils';
import { exportFilename } from '@/lib/exportUtils';
import type { Equipment } from './types';
import { averageAvailability, figureText, hasFigure } from './figures';
import { useAvailabilityData } from './useAvailabilityData';

const ALL = '__all__';
const STATUS_META: Record<Equipment['status'], { label: string; tone: Tone; icon: IconMeaning; hex: string }> = {
  operational: { label: 'Operational', tone: 'success', icon: 'active', hex: '34d399' },
  maintenance: { label: 'Maintenance', tone: 'warning', icon: 'maintenance', hex: 'fbbf24' },
  breakdown: { label: 'Breakdown', tone: 'danger', icon: 'breakdown', hex: 'f87171' },
  idle: { label: 'Idle', tone: 'neutral', icon: 'inactive', hex: '94a3b8' },
};
const meta = (s: Equipment['status']) => STATUS_META[s] ?? { label: String(s), tone: 'neutral' as Tone, icon: 'inactive' as IconMeaning, hex: '94a3b8' };
/** 95% and above is good, 90% and above needs watching, below that is poor. */
const availabilityTone = (pct: number): 'success' | 'warning' | 'danger' => (pct >= 95 ? 'success' : pct >= 90 ? 'warning' : 'danger');
const TONE_TEXT = { success: 'text-success', warning: 'text-warning', danger: 'text-danger' } as const;
/** A missing figure is a dash, never a made-up 0. */
const missing = (n: number | null | undefined) => n == null || Number.isNaN(Number(n));
const pctText = (n: number | null | undefined) => (missing(n) ? '—' : `${Number(n).toFixed(1)}%`);
const hrs = (n: number | null | undefined) => (missing(n) ? '—' : `${Number(n).toFixed(1)} h`);
const when = (d: string | null | undefined) => (d ? formatDate(d) : 'Not scheduled');
const num = (n: number | null | undefined) => Number(n) || 0;
const pctOrNoData = (n: number | null | undefined) => figureText(n, v => `${v.toFixed(1)}%`);
const hrsOrNoData = (n: number | null | undefined) => figureText(n, v => `${v.toFixed(1)} h`);

const EXPORT_COLUMNS: DLColumn[] = [
  { key: 'name', label: 'Equipment', width: 24 }, { key: 'category', label: 'Category', width: 18 },
  { key: 'department', label: 'Department', width: 18, format: v => (v as string) ?? '' },
  { key: 'status', label: 'Status', width: 14, format: v => meta(v as Equipment['status']).label },
  { key: 'operational_hours', label: 'Operating hours', width: 14 }, { key: 'breakdown_hours', label: 'Breakdown hours', width: 16 },
  { key: 'availability', label: 'Availability %', width: 14, format: v => figureText(v as number | null, n => `${n.toFixed(1)}%`) },
  { key: 'uptime', label: 'Uptime', width: 12 }, { key: 'downtime', label: 'Downtime', width: 12 },
  { key: 'mtbf', label: 'MTBF (h)', width: 12, format: v => figureText(v as number | null, String) },
  { key: 'mttr', label: 'MTTR (h)', width: 12, format: v => figureText(v as number | null, String) },
  { key: 'last_maintenance', label: 'Last maintenance', width: 16, format: v => when(v as string | null) },
  { key: 'next_maintenance', label: 'Next maintenance', width: 16, format: v => when(v as string | null) },
];

function AvailabilityContent() {
  const { equipment: list, stats, refetch } = useAvailabilityData();
  const equipment = list.items;
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState(ALL);
  const [statusF, setStatusF] = useState(ALL);
  const [tab, setTab] = useState('overview');
  const [sort, setSort] = useState<SortState>(null);

  const categories = useMemo(() => [...new Set(equipment.map(e => e.category).filter(Boolean))].sort(), [equipment]);
  const departments = useMemo(() => [...new Set(equipment.map(e => e.department).filter((d): d is string => !!d))].sort(), [equipment]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return equipment.filter(e =>
      (!q || [e.name, e.category, e.department].some(s => s?.toLowerCase().includes(q)))
      && (category === ALL || e.category === category) && (statusF === ALL || e.status === statusF));
  }, [equipment, search, category, statusF]);
  const rows = useMemo(() => sortRows(filtered, sort, (e, id) => {
    const v = e[id as keyof Equipment];
    return typeof v === 'string' ? v.toLowerCase() : v ?? '';
  }), [filtered, sort]);

  const status = deriveDataStatus({ loaded: list.loaded, loading: list.loading, error: list.error, errorStatus: list.errorStatus, count: filtered.length, transient: isTransientStatus(list.errorStatus) });
  const unavailable = !stats.loaded && !stats.loading;
  const pending = stats.loading && !stats.loaded;
  const s = stats.data;
  const tile = { loading: pending, unavailable };
  const hasFilters = !!search || category !== ALL || statusF !== ALL;
  const clearFilters = () => { setSearch(''); setCategory(ALL); setStatusF(ALL); };

  const OVERVIEW: Column<Equipment>[] = [
    { id: 'name', header: 'Equipment', sortable: true, sticky: true, cell: e => <span className="font-medium text-ink">{e.name}</span> },
    { id: 'category', header: 'Category', sortable: true, hideBelow: 'lg', cell: e => e.category },
    { id: 'department', header: 'Department', sortable: true, hideBelow: 'lg', cell: e => e.department ?? <span className="text-ink-muted">None</span> },
    { id: 'status', header: 'Status', sortable: true, cell: e => <StatusBadge tone={meta(e.status).tone} icon={meta(e.status).icon}>{meta(e.status).label}</StatusBadge> },
    { id: 'operational_hours', header: 'Operating', sortable: true, hideBelow: 'md', numeric: true, cell: e => <span className="tabular">{hrs(e.operational_hours)}</span> },
    { id: 'breakdown_hours', header: 'Breakdown', sortable: true, hideBelow: 'md', numeric: true, cell: e => <span className="tabular">{hrs(e.breakdown_hours)}</span> },
    { id: 'availability', header: 'Availability', sortable: true, cell: e => <div className="flex items-center gap-2"><span className={`${hasFigure(e.availability) ? 'w-14 text-right font-semibold' : 'text-caption'} tabular ${hasFigure(e.availability) ? TONE_TEXT[availabilityTone(Number(e.availability))] : 'text-ink-muted'}`}>{pctOrNoData(e.availability)}</span>{hasFigure(e.availability) && <div className="hidden w-24 sm:block"><Progress value={Number(e.availability)} label={`${e.name} availability`} className="[&>span]:hidden" /></div>}</div> },
  ];
  const DETAIL: Column<Equipment>[] = [
    { id: 'name', header: 'Equipment', sortable: true, sticky: true, cell: e => <span className="font-medium text-ink">{e.name}</span> },
    { id: 'mtbf', header: 'MTBF', sortable: true, cell: e => <StatusBadge tone={!hasFigure(e.mtbf) ? 'neutral' : num(e.mtbf) > 200 ? 'success' : num(e.mtbf) > 100 ? 'neutral' : 'danger'}>{hrsOrNoData(e.mtbf)}</StatusBadge> },
    { id: 'mttr', header: 'MTTR', sortable: true, cell: e => <StatusBadge tone={!hasFigure(e.mttr) ? 'neutral' : num(e.mttr) < 5 ? 'success' : num(e.mttr) < 10 ? 'neutral' : 'danger'}>{hrsOrNoData(e.mttr)}</StatusBadge> },
    { id: 'last_maintenance', header: 'Last maintenance', sortable: true, hideBelow: 'md', cell: e => when(e.last_maintenance) },
    { id: 'next_maintenance', header: 'Next maintenance', sortable: true, hideBelow: 'md', cell: e => when(e.next_maintenance) },
    { id: 'share', header: 'Downtime share', hideBelow: 'lg', numeric: true, cell: e => <span className="tabular">{num(e.operational_hours) > 0 ? pctText((num(e.breakdown_hours) / num(e.operational_hours)) * 100) : '—'}</span> },
    { id: 'downtime', header: 'Downtime', sortable: true, numeric: true, cell: e => <span className="tabular">{hrs(e.downtime)}</span> },
  ];

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        breadcrumbs={[{ label: 'Operations and maintenance' }, { label: 'Availability' }]}
        title="Equipment availability"
        description="Availability = (operating hours − breakdown hours) ÷ operating hours × 100."
        actions={(
          <>
            <IconButton icon="refresh" label="Refresh availability" variant="ghost" pending={(list.loading && list.loaded) || (stats.loading && stats.loaded)} onClick={() => refetch()} />
            {filtered.length > 0 && <DownloadButton data={filtered as unknown as Record<string, unknown>[]} columns={EXPORT_COLUMNS} filename={exportFilename('Equipment_Availability')} title="Equipment Availability" statusColumn="status" statusColor={(_v, row) => meta(row.status as Equipment['status']).hex} />}
            <Button asChild><Link href="/breakdowns">Breakdowns</Link></Button>
          </>
        )}
      />

      <div className="flex flex-col gap-3">
        <MetricGrid compact>
          <MetricTile compact label="Total equipment" value={s?.totalEquipment} {...tile} />
          <MetricTile compact label="Operational" value={s?.operational} {...tile} />
          <MetricTile compact label="Maintenance" tone={s?.inMaintenance ? 'warning' : 'default'} value={s?.inMaintenance} {...tile} />
          <MetricTile compact label="Breakdown" tone={s?.inBreakdown ? 'danger' : 'default'} value={s?.inBreakdown} {...tile} />
          <MetricTile compact label="Availability" value={s ? pctText(s.overallAvailability) : undefined} detail={s ? 'All equipment, lifetime' : undefined} {...tile} />
        </MetricGrid>
        {stats.error && <Notice tone={stats.loaded ? 'warning' : 'danger'} title={stats.loaded ? 'Summary figures may be out of date' : 'Summary figures could not be loaded'} action={<Button size="sm" icon="refresh" onClick={() => stats.refetch()}>Try again</Button>}>{stats.error}</Notice>}
      </div>

      <Toolbar
        filtered={hasFilters} onClear={clearFilters} activeCount={category !== ALL ? 1 : 0}
        moreFilters={(
          <FilterField label="Category"><Select aria-label="Filter by category" value={category} onValueChange={setCategory} options={[{ value: ALL, label: 'All categories' }, ...categories.map(c => ({ value: c, label: c }))]} /></FilterField>
        )}
      >
        <SearchField value={search} onValueChange={setSearch} placeholder="Search name, category or department" wrapperClassName="min-w-56 max-w-md flex-1 max-md:max-w-none max-md:basis-full" />
        <Select className="w-44" aria-label="Filter by status" value={statusF} onValueChange={setStatusF} options={[{ value: ALL, label: 'All statuses' }, ...Object.entries(STATUS_META).map(([k, m]) => ({ value: k, label: m.label }))]} />
      </Toolbar>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList aria-label="Availability sections">
          <TabsTrigger value="overview" icon="gauge">Overview</TabsTrigger>
          <TabsTrigger value="detailed" icon="analytics">Detailed analysis</TabsTrigger>
          <TabsTrigger value="trends" icon="efficiency">Metrics</TabsTrigger>
        </TabsList>

        <DataRegion
          className="mt-4"
          status={status}
          subject="equipment availability"
          error={list.error}
          onRetry={() => refetch()}
          empty={hasFilters
            ? <EmptyState icon="search" title="No equipment matches" description="Try a different search or filter." action={<Button onClick={clearFilters}>Clear filters</Button>} />
            : <EmptyState icon="equipment" title="No equipment yet" description="Add equipment and record breakdowns to start tracking availability." action={<Button asChild variant="primary"><Link href="/equipment">Manage equipment</Link></Button>} />}
        >
          <p className="mb-3 font-sans text-caption text-ink-muted">{filtered.length} of {equipment.length} equipment</p>
          <TabsContent value="overview">
            <DataTable caption="Equipment availability" rows={rows} columns={OVERVIEW} getRowId={e => String(e.id)} sort={sort} onSortChange={setSort}
              rowActions={e => (
                <span className="inline-flex gap-1">
                  <Button asChild size="sm"><Link href={`/breakdowns?equipment=${e.id}`} aria-label={`View breakdowns for ${e.name}`}>Breakdowns</Link></Button>
                  <Button asChild size="sm"><Link href="/maintenance/work-orders" aria-label={`View maintenance for ${e.name}`}>Maintenance</Link></Button>
                </span>
              )} />
          </TabsContent>
          <TabsContent value="detailed">
            <DataTable caption="Detailed availability analysis" rows={rows} columns={DETAIL} getRowId={e => String(e.id)} sort={sort} onSortChange={setSort} />
            <p className="mt-3 font-sans text-caption text-ink-muted">Equipment with no availability record shows No data for availability, MTBF and MTTR, because nothing has been measured. It is left out of the department averages.</p>
          </TabsContent>
          <TabsContent value="trends">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Panel title="Availability">
                {s ? (
                  <dl className="flex flex-col gap-4">
                    <Reading label="Lifetime, all equipment" pct={s.overallAvailability} />
                    <Reading label="Last 7 days (from breakdown downtime)" pct={s.weekAvailability} />
                    <div className="grid grid-cols-3 gap-3 border-t border-line pt-3">
                      <div><dt className="font-sans text-caption text-ink-muted">Avg uptime</dt><dd className="font-display text-title font-semibold text-ink tabular">{hrs(s.avgUptime)}</dd></div>
                      <div><dt className="font-sans text-caption text-ink-muted">Avg downtime</dt><dd className="font-display text-title font-semibold text-ink tabular">{hrs(s.avgDowntime)}</dd></div>
                      <div><dt className="font-sans text-caption text-ink-muted">Total downtime</dt><dd className="font-display text-title font-semibold text-ink tabular">{hrs(s.totalBreakdownHours)}</dd></div>
                    </div>
                  </dl>
                ) : <p className="font-sans text-body-sm text-ink-muted">{stats.error ? 'The summary could not be loaded; see the notice above.' : 'Loading…'}</p>}
              </Panel>
              <Panel title="By department" description="Average availability of the equipment shown that has a measured figure.">
                {departments.length === 0 ? <p className="font-sans text-body-sm text-ink-muted">No department data.</p> : (
                  <ul className="flex flex-col gap-3">
                    {departments.map(dept => {
                      const eq = filtered.filter(e => e.department === dept);
                      const { average: avg, measured } = averageAvailability(eq);
                      return (
                        <li key={dept} className="flex flex-col gap-1">
                          <div className="flex justify-between font-sans text-body-sm"><span className="text-ink">{dept} <span className="text-ink-muted">({measured === eq.length ? eq.length : `${measured} of ${eq.length} measured`})</span></span><span className={`font-semibold tabular ${avg === null ? 'text-ink-muted' : TONE_TEXT[availabilityTone(avg)]}`}>{pctOrNoData(avg)}</span></div>
                          {avg !== null && <Progress value={avg} label={`${dept} availability`} className="[&>span]:hidden" />}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </Panel>
            </div>
          </TabsContent>
        </DataRegion>
      </Tabs>

      <div className="flex flex-wrap justify-end gap-2">
        <Button asChild><Link href="/equipment">Manage equipment</Link></Button>
        <Button asChild variant="primary"><Link href="/breakdowns/new">Report breakdown</Link></Button>
        <Button asChild><Link href="/reports/availability">Generate report</Link></Button>
      </div>
    </div>
  );
}

function Reading({ label, pct }: { label: string; pct: number }) {
  return (
    <div className="flex flex-col gap-1.5">
      <dt className="font-sans text-label font-medium text-ink">{label}</dt>
      <dd className="flex items-center gap-3"><span className={`font-display text-metric font-semibold tabular ${TONE_TEXT[availabilityTone(num(pct))]}`}>{pctText(pct)}</span><div className="min-w-0 flex-1"><Progress value={num(pct)} label={label} className="[&>span]:hidden" /></div></dd>
    </div>
  );
}

export default function AvailabilityPage() {
  return <AppShell migrated><AvailabilityContent /></AppShell>;
}
