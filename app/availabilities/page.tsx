// app/availabilities/page.tsx — availability records: manual entries plus those derived from breakdown downtime.
'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { AppShell } from '@/components/app-shell';
import {
  Button, DataRegion, DataTable, EmptyState, IconButton, Input, MetricGrid, MetricTile, Notice, PageHeader, Panel, Progress, SearchField, Segmented,
  Select, StatusBadge, Tabs, TabsContent, TabsList, TabsTrigger, Toolbar, deriveDataStatus, isTransientStatus, useConfirm,
  type Column, FilterField
} from '@/components/ui-system';
import { DownloadButton, type DLColumn } from '@/components/shared/DownloadButton';
import { fmtDate } from '@/components/shared/utils';
import { toLocalISODate } from '@/lib/dates';
import { RecordDialog } from './RecordDialog';
import { availabilityTone, computePeriodRows, findBestWorstPeriod, type Period } from './calcAvailabilities';
import type { AvailRecord, EqSummaryRow, Equipment } from './types';
import { createAvailabilityRecord, deleteAvailabilityRecord, updateAvailabilityRecord, useAvailabilitiesData } from './useAvailabilitiesData';

const ALL = '__all__';
const TONE_TEXT = { success: 'text-success', warning: 'text-warning', danger: 'text-danger' } as const;
const pct = (n: number | null | undefined) => (n == null || Number.isNaN(Number(n)) ? '—' : `${Number(n).toFixed(1)}%`);
const hrs = (n: number | null | undefined) => (n == null || Number.isNaN(Number(n)) ? '—' : `${Number(n).toFixed(1)} h`);
const num = (n: number | null | undefined) => Number(n) || 0;
const PERIODS = [{ value: 'day', label: 'Day' }, { value: 'week', label: 'Week' }, { value: 'month', label: 'Month' }];

const AvailabilityCell = ({ value, label }: { value: number | null | undefined; label: string }) => (
  <div className="flex items-center gap-2">
    <span className={`w-14 font-semibold tabular ${value == null ? 'text-ink-muted' : TONE_TEXT[availabilityTone(num(value))]}`}>{pct(value)}</span>
    <div className="hidden w-20 sm:block"><Progress value={num(value)} label={label} className="[&>span]:hidden" /></div>
  </div>
);

function AvailabilitiesContent() {
  const confirm = useConfirm();
  const { manual, derived, equipment: eqList, records, refresh } = useAvailabilitiesData();
  const equipment = eqList.items;
  const [search, setSearch] = useState('');
  const [eqFilter, setEqFilter] = useState(ALL);
  const [deptFilter, setDeptFilter] = useState(ALL);
  const [catFilter, setCatFilter] = useState(ALL);
  const [period, setPeriod] = useState<Period>('week');
  const [dateFrom, setDateFrom] = useState(() => { const d = new Date(); d.setDate(d.getDate() - 30); return toLocalISODate(d); });
  const [dateTo, setDateTo] = useState(() => toLocalISODate(new Date()));
  const [tab, setTab] = useState('overview');
  const [editing, setEditing] = useState<AvailRecord | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const eqMap = useMemo(() => new Map(equipment.map(e => [String(e.id), e] as [string, Equipment])), [equipment]);
  const depts = useMemo(() => [...new Set(equipment.map(e => e.department).filter(Boolean) as string[])].sort(), [equipment]);
  const cats = useMemo(() => [...new Set(equipment.map(e => e.category).filter(Boolean) as string[])].sort(), [equipment]);
  const nameOf = (r: AvailRecord) => r.equipment_name ?? eqMap.get(String(r.equipment_id))?.name ?? `Equipment #${r.equipment_id}`;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return records.filter(r => {
      if (dateFrom && r.date < dateFrom) return false;
      if (dateTo && r.date > dateTo) return false;
      if (eqFilter !== ALL && String(r.equipment_id) !== eqFilter) return false;
      const eq = eqMap.get(String(r.equipment_id));
      if (deptFilter !== ALL && eq?.department !== deptFilter) return false;
      if (catFilter !== ALL && eq?.category !== catFilter) return false;
      return !q || (r.equipment_name ?? eq?.name ?? '').toLowerCase().includes(q);
    });
  }, [records, dateFrom, dateTo, eqFilter, deptFilter, catFilter, search, eqMap]);

  // The latest record per machine in the filter, worst first.
  const summary = useMemo((): EqSummaryRow[] => {
    const byEq = new Map<string, EqSummaryRow>();
    for (const r of filtered) {
      const key = String(r.equipment_id); const eq = eqMap.get(key); const cur = byEq.get(key);
      if (!cur || r.date > cur.lastDate) byEq.set(key, { id: key, name: nameOf(r), category: eq?.category ?? '', department: eq?.department ?? '', pct: num(r.availability_percentage), opH: num(r.operational_hours), bdH: num(r.breakdown_hours), lastDate: r.date });
    }
    return [...byEq.values()].sort((a, b) => a.pct - b.pct);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtered, eqMap]);
  const periodRows = useMemo(() => computePeriodRows(filtered, period), [filtered, period]);
  const fleet = useMemo(() => ({
    avg: summary.length ? summary.reduce((s, e) => s + e.pct, 0) / summary.length : null,
    downtime: filtered.reduce((s, r) => s + num(r.breakdown_hours), 0),
    below90: summary.filter(e => e.pct < 90).length,
  }), [summary, filtered]);
  const deptStats = useMemo(() => {
    const m = new Map<string, { sum: number; n: number }>();
    for (const e of summary) { const d = e.department || 'Unknown'; const x = m.get(d) ?? { sum: 0, n: 0 }; m.set(d, { sum: x.sum + e.pct, n: x.n + 1 }); }
    return [...m.entries()].map(([dept, { sum, n }]) => ({ dept, avg: sum / n })).sort((a, b) => b.avg - a.avg);
  }, [summary]);

  // The records are the page: if the manual ones cannot be loaded the register is incomplete, so that is a failure.
  const status = deriveDataStatus({ loaded: manual.loaded, loading: manual.loading, error: manual.error, errorStatus: manual.errorStatus, count: filtered.length, transient: isTransientStatus(manual.errorStatus) });
  const pending = manual.loading && !manual.loaded;
  const unavailable = !manual.loaded && !manual.loading;
  const tile = { loading: pending, unavailable };
  const hasFilters = !!search || eqFilter !== ALL || deptFilter !== ALL || catFilter !== ALL;
  const clearFilters = () => { setSearch(''); setEqFilter(ALL); setDeptFilter(ALL); setCatFilter(ALL); };

  const openNew = () => { setEditing(null); setDialogOpen(true); };
  const openEdit = (r: AvailRecord) => { setEditing(r); setDialogOpen(true); };
  const save = async (id: number | string | null, payload: Record<string, unknown>) => {
    try { if (id === null) await createAvailabilityRecord(payload); else await updateAvailabilityRecord(id, payload); }
    catch (e) { throw new Error(`The record was not saved: ${(e as Error).message}`); }
    await refresh();
  };
  const remove = async (r: AvailRecord) => {
    if (!await confirm({ title: 'Delete this availability record?', message: `${nameOf(r)} on ${r.date}. This cannot be undone.`, confirmLabel: 'Delete', destructive: true })) return;
    try { await deleteAvailabilityRecord(r.id); toast.success('Availability record deleted.'); await refresh(); }
    catch (e) { toast.error(`The record was not deleted: ${(e as Error).message}`); }
  };

  const OVERVIEW: Column<EqSummaryRow>[] = [
    { id: 'name', header: 'Equipment', sticky: true, cell: r => <span className="font-medium text-ink">{r.name}</span> },
    { id: 'category', header: 'Category', hideBelow: 'lg', cell: r => r.category || <span className="text-ink-muted">None</span> },
    { id: 'department', header: 'Department', hideBelow: 'lg', cell: r => r.department || <span className="text-ink-muted">None</span> },
    { id: 'pct', header: 'Availability', cell: r => <AvailabilityCell value={r.pct} label={`${r.name} availability`} /> },
    { id: 'opH', header: 'Operating', numeric: true, hideBelow: 'md', cell: r => <span className="tabular">{hrs(r.opH)}</span> },
    { id: 'bdH', header: 'Downtime', numeric: true, hideBelow: 'md', cell: r => <span className="tabular">{hrs(r.bdH)}</span> },
    { id: 'lastDate', header: 'Last entry', cell: r => <span className="whitespace-nowrap tabular">{fmtDate(r.lastDate)}</span> },
  ];
  const PERIOD_COLS: Column<(typeof periodRows)[number]>[] = [
    { id: 'label', header: period === 'day' ? 'Date' : period === 'week' ? 'Week' : 'Month', sticky: true, cell: r => <span className="font-medium text-ink">{r.label}</span> },
    { id: 'avg', header: 'Avg availability', cell: r => <AvailabilityCell value={r.avgAvailability} label={`${r.label} availability`} /> },
    { id: 'op', header: 'Operating', numeric: true, hideBelow: 'md', cell: r => <span className="tabular">{hrs(r.totalOpHours)}</span> },
    { id: 'bd', header: 'Downtime', numeric: true, hideBelow: 'md', cell: r => <span className="tabular">{hrs(r.totalBdHours)}</span> },
    { id: 'n', header: 'Records', numeric: true, cell: r => r.recordCount },
  ];
  const RECORD_COLS: Column<AvailRecord>[] = [
    { id: 'date', header: 'Date', sticky: true, cell: r => <span className="whitespace-nowrap tabular">{fmtDate(r.date)}</span> },
    { id: 'name', header: 'Equipment', cell: r => <span className="font-medium text-ink">{nameOf(r)}</span> },
    { id: 'pct', header: 'Availability', cell: r => <AvailabilityCell value={r.availability_percentage} label={`${nameOf(r)} availability on ${r.date}`} /> },
    { id: 'op', header: 'Operating', numeric: true, hideBelow: 'md', cell: r => <span className="tabular">{hrs(r.operational_hours)}</span> },
    { id: 'bd', header: 'Downtime', numeric: true, hideBelow: 'md', cell: r => <span className="tabular">{hrs(r.breakdown_hours)}</span> },
    { id: 'src', header: 'Source', hideBelow: 'lg', cell: r => (r.source === 'breakdown' ? <StatusBadge tone="neutral">From breakdowns</StatusBadge> : <span className="text-ink-muted">{r.notes || 'Manual entry'}</span>) },
  ];
  const recordsExport: DLColumn[] = [
    { key: 'date', label: 'Date' }, { key: 'equipment_name', label: 'Equipment', format: (v, row) => String(v ?? row.equipment_id) },
    { key: 'availability_percentage', label: 'Availability %', format: v => pct(v as number) },
    { key: 'operational_hours', label: 'Operating hours' }, { key: 'breakdown_hours', label: 'Downtime hours' }, { key: 'notes', label: 'Notes', format: v => String(v ?? '') },
  ];
  const periodExport: DLColumn[] = [
    { key: 'label', label: period === 'day' ? 'Date' : period === 'week' ? 'Week' : 'Month' },
    { key: 'avgAvailability', label: 'Avg availability %', format: v => pct(v as number) },
    { key: 'totalOpHours', label: 'Operating hours', format: v => Number(v).toFixed(1) }, { key: 'totalBdHours', label: 'Downtime hours', format: v => Number(v).toFixed(1) }, { key: 'recordCount', label: 'Records' },
  ];
  const worst = summary.filter(e => e.pct < 95).slice(0, 6);
  const best = periodRows.length ? findBestWorstPeriod(periodRows) : null;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        breadcrumbs={[{ label: 'Operations and maintenance' }, { label: 'Availability records' }]}
        title="Availability records"
        description="Availability = (operational hours − downtime) ÷ operational hours × 100."
        actions={(
          <>
            <IconButton icon="refresh" label="Refresh availability records" variant="ghost" pending={manual.loading && manual.loaded} onClick={() => refresh()} />
            {filtered.length > 0 && <DownloadButton data={filtered as unknown as Record<string, unknown>[]} columns={recordsExport} filename={`Availability_Records_${dateFrom}_to_${dateTo}`} title="Equipment Availability Records" subtitle={`Period: ${dateFrom} to ${dateTo}`} formats={['excel']} />}
            <Button asChild variant="ghost"><Link href="/breakdowns">Breakdowns</Link></Button>
            <Button variant="primary" icon="plus" disabled={unavailable} onClick={openNew}>Log record</Button>
          </>
        )}
      />

      <MetricGrid compact>
        <MetricTile compact label="Equipment" value={eqList.loaded ? equipment.length : undefined} loading={eqList.loading && !eqList.loaded} unavailable={!eqList.loaded && !eqList.loading} />
        <MetricTile compact label="Avg availability" value={fleet.avg == null ? undefined : pct(fleet.avg)} detail="Latest entry per machine" {...tile} />
        <MetricTile compact label="Below 90%" tone={fleet.below90 ? 'danger' : 'default'} value={fleet.below90} {...tile} />
        <MetricTile compact label="Total downtime" value={hrs(fleet.downtime)} {...tile} />
        <MetricTile compact label="Records in range" value={filtered.length} {...tile} />
      </MetricGrid>

      {derived.error && manual.loaded && <Notice tone="warning" title="Records derived from breakdowns could not be loaded" action={<Button size="sm" icon="refresh" onClick={() => derived.refetch()}>Try again</Button>}>{derived.error} Only manual entries are shown, so some days may be missing.</Notice>}
      {eqList.error && <Notice tone="warning" title="The equipment list could not be loaded" action={<Button size="sm" icon="refresh" onClick={() => eqList.refetch()}>Try again</Button>}>{eqList.error} Department and category filters are limited, and a record cannot be logged until it loads.</Notice>}

      <Toolbar
        filtered={hasFilters} onClear={clearFilters}
        activeCount={(catFilter !== ALL ? 1 : 0) + [dateFrom, dateTo].filter(Boolean).length}
        moreFilters={(
          <>
            {cats.length > 0 && <FilterField label="Category"><Select aria-label="Filter by category" value={catFilter} onValueChange={setCatFilter} options={[{ value: ALL, label: 'All categories' }, ...cats.map(c => ({ value: c, label: c }))]} /></FilterField>}
            <FilterField label="From date"><Input type="date" aria-label="From date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} /></FilterField>
            <FilterField label="To date"><Input type="date" aria-label="To date" value={dateTo} onChange={e => setDateTo(e.target.value)} /></FilterField>
          </>
        )}
      >
        <SearchField value={search} onValueChange={setSearch} placeholder="Search equipment" wrapperClassName="min-w-48 max-w-xs flex-1 max-md:max-w-none max-md:basis-full" />
        <Select className="w-44" aria-label="Filter by equipment" value={eqFilter} onValueChange={setEqFilter} options={[{ value: ALL, label: 'All equipment' }, ...equipment.map(e => ({ value: String(e.id), label: e.name }))]} />
        {depts.length > 0 && <Select className="w-44" aria-label="Filter by department" value={deptFilter} onValueChange={setDeptFilter} options={[{ value: ALL, label: 'All departments' }, ...depts.map(d => ({ value: d, label: d }))]} />}
      </Toolbar>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList aria-label="Availability sections">
          <TabsTrigger value="overview" icon="gauge">Overview</TabsTrigger>
          <TabsTrigger value="period" icon="calendar">By period</TabsTrigger>
          <TabsTrigger value="analytics" icon="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="records" icon="documents">Records</TabsTrigger>
        </TabsList>

        <DataRegion
          className="mt-4"
          status={status}
          subject="availability records"
          error={manual.error}
          onRetry={() => refresh()}
          empty={hasFilters || records.length > 0
            ? <EmptyState icon="search" title="No records in this range" description="Widen the dates or clear the filters." action={<Button onClick={clearFilters}>Clear filters</Button>} />
            : <EmptyState icon="gauge" title="No availability records yet" description="Log the first record, or record breakdowns to have them derived." action={<Button variant="primary" icon="plus" onClick={openNew}>Log record</Button>} />}
        >
          <p className="mb-3 font-sans text-caption text-ink-muted">{filtered.length} {filtered.length === 1 ? 'record' : 'records'} from {fmtDate(dateFrom)} to {fmtDate(dateTo)}</p>
          <TabsContent value="overview">
            <DataTable caption="Latest availability per machine" rows={summary} columns={OVERVIEW} getRowId={r => r.id} />
          </TabsContent>
          <TabsContent value="period">
            <div className="mb-3 flex items-center justify-between gap-3">
              <Segmented label="Group by" value={period} onValueChange={v => setPeriod(v as Period)} options={PERIODS} />
              {periodRows.length > 0 && <DownloadButton data={periodRows as unknown as Record<string, unknown>[]} columns={periodExport} filename={`Availability_by_${period}_${dateFrom}_to_${dateTo}`} title={`Availability by ${period}`} subtitle={`${dateFrom} to ${dateTo}`} formats={['excel']} />}
            </div>
            <DataTable caption={`Availability by ${period}`} rows={periodRows} columns={PERIOD_COLS} getRowId={r => r.periodKey} />
          </TabsContent>
          <TabsContent value="analytics">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Panel title="By department" description="Average of each machine's latest entry.">
                <ul className="flex flex-col gap-3">
                  {deptStats.map(({ dept, avg }) => (
                    <li key={dept} className="flex flex-col gap-1"><div className="flex justify-between font-sans text-body-sm"><span className="text-ink">{dept}</span><span className={`font-semibold tabular ${TONE_TEXT[availabilityTone(avg)]}`}>{pct(avg)}</span></div><Progress value={avg} label={`${dept} availability`} className="[&>span]:hidden" /></li>
                  ))}
                </ul>
              </Panel>
              <Panel title="Needs attention" description="Machines whose latest entry is below 95%.">
                {worst.length === 0 ? <p className="font-sans text-body-sm text-success">All machines are at or above 95%.</p> : (
                  <ul className="flex flex-col gap-3">
                    {worst.map(e => <li key={e.id} className="flex items-center gap-3"><div className="min-w-0 flex-1"><div className="flex justify-between font-sans text-body-sm"><span className="truncate text-ink">{e.name}</span><span className={`ml-2 font-semibold tabular ${TONE_TEXT[availabilityTone(e.pct)]}`}>{pct(e.pct)}</span></div><Progress value={e.pct} label={`${e.name} availability`} className="[&>span]:hidden" /></div><span className="shrink-0 font-sans text-caption text-ink-muted tabular">{hrs(e.bdH)} down</span></li>)}
                  </ul>
                )}
              </Panel>
              <Panel title="Period summary" description={`Grouped by ${period}.`}>
                {best ? (
                  <dl className="flex flex-col gap-2 font-sans text-body-sm">
                    <div className="flex justify-between"><dt className="text-ink-muted">Best {period}</dt><dd className="font-semibold text-ink tabular">{pct(best.best)} <span className="font-normal text-ink-muted">({best.bestLabel})</span></dd></div>
                    <div className="flex justify-between"><dt className="text-ink-muted">Worst {period}</dt><dd className="font-semibold text-ink tabular">{pct(best.worst)} <span className="font-normal text-ink-muted">({best.worstLabel})</span></dd></div>
                    <div className="flex justify-between"><dt className="text-ink-muted">Total downtime</dt><dd className="font-semibold text-ink tabular">{hrs(fleet.downtime)}</dd></div>
                    <div className="flex justify-between"><dt className="text-ink-muted">Total operating</dt><dd className="font-semibold text-ink tabular">{hrs(filtered.reduce((s, r) => s + num(r.operational_hours), 0))}</dd></div>
                  </dl>
                ) : <p className="font-sans text-body-sm text-ink-muted">No data in this range.</p>}
              </Panel>
              <Panel title="Fleet health">
                <dl className="flex flex-col gap-3">
                  <div className="flex items-center gap-3"><dt className="sr-only">Average availability</dt><dd className={`font-display text-metric font-semibold tabular ${fleet.avg == null ? 'text-ink-muted' : TONE_TEXT[availabilityTone(fleet.avg)]}`}>{pct(fleet.avg)}</dd><div className="min-w-0 flex-1"><Progress value={num(fleet.avg)} label="Average availability" className="[&>span]:hidden" /></div></div>
                  <div className="flex justify-between font-sans text-body-sm"><dt className="text-ink-muted">Machines tracked</dt><dd className="font-semibold text-ink tabular">{summary.length}{eqList.loaded ? ` of ${equipment.length}` : ''}</dd></div>
                  <div className="flex justify-between font-sans text-body-sm"><dt className="text-ink-muted">Below 90%</dt><dd className="font-semibold text-ink tabular">{fleet.below90} {fleet.below90 === 1 ? 'machine' : 'machines'}</dd></div>
                </dl>
              </Panel>
            </div>
          </TabsContent>
          <TabsContent value="records">
            <DataTable
              caption="Availability records"
              rows={filtered}
              columns={RECORD_COLS}
              getRowId={r => String(r.id)}
              rowActions={r => r.source === 'breakdown' ? null : (
                <span className="inline-flex gap-1">
                  <IconButton icon="edit" size="sm" label={`Edit the record for ${nameOf(r)} on ${r.date}`} onClick={() => openEdit(r)} />
                  <IconButton icon="delete" variant="danger" size="sm" label={`Delete the record for ${nameOf(r)} on ${r.date}`} onClick={() => remove(r)} />
                </span>
              )}
            />
            <p className="mt-3 font-sans text-caption text-ink-muted">Records derived from breakdowns cannot be edited here; log a manual record for that day to replace one.</p>
          </TabsContent>
        </DataRegion>
      </Tabs>

      <RecordDialog open={dialogOpen} record={editing} equipment={equipment} onOpenChange={setDialogOpen} onSave={save} />
    </div>
  );
}

export default function AvailabilitiesPage() {
  return <AppShell migrated><AvailabilitiesContent /></AppShell>;
}
