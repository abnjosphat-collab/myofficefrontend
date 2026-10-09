// app/compressors/page.tsx — compressor tracking: daily cumulative-hour readings, services, analytics, fleet management.
'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AppShell } from '@/components/app-shell';
import {
  Button, Checkbox, DataRegion, DataTable, Dialog, EmptyState, IconButton, Input, MetricGrid, MetricTile, Notice, PageHeader, SearchField, Select,
  StatusBadge, Tabs, TabsContent, TabsList, TabsTrigger, Toolbar, ViewToggle, VIEW_CARDS_TABLE, deriveDataStatus, isTransientStatus, useViewPreference,
  type Column,
} from '@/components/ui-system';
import { DownloadButton, type DLColumn } from '@/components/shared/DownloadButton';
import { useLookupList } from '@/hooks/useLookups';
import { exportFilename } from '@/lib/exportUtils';
import { AddCompressorDialog, StatusDialog } from './dialogs';
import { AnalyticsTab } from './AnalyticsTab';
import { ManagementTab } from './ManagementTab';
import { ReadingCard } from './ReadingCard';
import { ServicesTab } from './ServicesTab';
import { calculateNextService, localDateString } from './calcCompressors';
import { STATUS_KEYS, STATUS_META, URGENCY_TONE, hours, statusLabel } from './meta';
import type { Compressor } from './types';
import { useCompressorsData } from './useCompressorsData';
import { formatDate, formatWeekday } from '@/lib/format';

const ALL = '__all__';

const parseDay = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const shiftDay = (s: string, by: number) => { const d = parseDay(s); d.setDate(d.getDate() + by); return localDateString(d); };
const dayLabel = (s: string) => `${formatWeekday(parseDay(s))} ${formatDate(parseDay(s))}`;

const EXPORT_COLUMNS: DLColumn[] = [
  { key: 'name', label: 'Name', width: 20 }, { key: 'model', label: 'Model', width: 20 }, { key: 'capacity', label: 'Capacity', width: 14 },
  { key: 'location', label: 'Location', width: 16 }, { key: 'status', label: 'Status', width: 14, format: v => statusLabel(v as string) },
  { key: 'total_running_hours', label: 'Running hours', width: 16, format: v => hours(v as number) },
  { key: 'total_loaded_hours', label: 'Loaded hours', width: 16, format: v => hours(v as number) },
];

function CompressorsContent() {
  const [date, setDate] = useState(() => localDateString(new Date()));
  const d = useCompressorsData(date);
  const { register, compressors, stats, previous } = d;
  const lookupLocations = useLookupList('location');
  const [view, setView] = useViewPreference('compressors', VIEW_CARDS_TABLE);
  const [tab, setTab] = useState('daily');
  const [search, setSearch] = useState('');
  const [locationF, setLocationF] = useState(ALL);
  const [statusF, setStatusF] = useState(ALL);
  const [includeOffline, setIncludeOffline] = useState(true);
  const [showDaily, setShowDaily] = useState(true);
  const [dueSoon, setDueSoon] = useState(false);
  const [adding, setAdding] = useState(false);
  const [statusId, setStatusId] = useState<number | null>(null);
  const [readingId, setReadingId] = useState<number | null>(null);

  const locations = useMemo(() => [...new Set([...lookupLocations, ...compressors.map(c => c.location).filter(Boolean)])].sort(), [lookupLocations, compressors]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return compressors.filter(c =>
      (!q || [c.name, c.model, c.location].some(s => s?.toLowerCase().includes(q)))
      && (locationF === ALL || c.location === locationF) && (statusF === ALL || c.status === statusF)
      && (includeOffline || c.status !== 'offline') && (!dueSoon || calculateNextService(c.total_running_hours)?.isUrgent));
  }, [compressors, search, locationF, statusF, includeOffline, dueSoon]);
  const statusCompressor = compressors.find(c => c.id === statusId) ?? null;
  const readingCompressor = compressors.find(c => c.id === readingId) ?? null;

  const status = deriveDataStatus({ loaded: register.loaded, loading: register.loading, error: register.error, errorStatus: register.errorStatus, count: filtered.length, transient: isTransientStatus(register.errorStatus) });
  const unavailable = !register.loaded && !register.loading;
  const hasFilters = !!search || locationF !== ALL || statusF !== ALL || !includeOffline || dueSoon;
  const clearFilters = () => { setSearch(''); setLocationF(ALL); setStatusF(ALL); setIncludeOffline(true); setDueSoon(false); };
  const s = stats.data;
  const tileState = { loading: stats.loading && !stats.loaded, unavailable: !stats.loaded && !!stats.error };

  const card = (c: Compressor) => (
    <ReadingCard
      key={`${c.id}-${c.total_running_hours}-${c.total_loaded_hours}-${date}`}
      compressor={c}
      previous={previous.byId[c.id]}
      previousUnavailable={previous.failed.includes(c.id)}
      previousLoading={previous.loading}
      nextService={calculateNextService(c.total_running_hours)}
      dateLabel={dayLabel(date)}
      showDaily={showDaily}
      onSave={v => d.saveReading(c.id, v)}
      onChangeStatus={() => setStatusId(c.id)}
    />
  );

  const COLUMNS: Column<Compressor>[] = [
    { id: 'name', header: 'Compressor', sortable: false, sticky: true, cell: c => <div><p className="font-medium text-ink">{c.name}</p><p className="text-caption text-ink-muted">{c.model}</p></div> },
    { id: 'status', header: 'Status', cell: c => <StatusBadge tone={STATUS_META[c.status]?.tone ?? 'neutral'} icon={STATUS_META[c.status]?.icon}>{statusLabel(c.status)}</StatusBadge> },
    { id: 'location', header: 'Location', hideBelow: 'md', cell: c => c.location },
    { id: 'running', header: 'Total running', hideBelow: 'md', cell: c => <div className="tabular"><p className="font-medium text-ink">{hours(c.total_running_hours)}</p><p className="text-caption text-ink-muted">{previous.failed.includes(c.id) ? 'Previous unavailable' : `Previous ${hours(previous.byId[c.id]?.total_running_hours)}`}</p></div> },
    { id: 'loaded', header: 'Total loaded', hideBelow: 'lg', cell: c => <div className="tabular"><p className="font-medium text-ink">{hours(c.total_loaded_hours)}</p><p className="text-caption text-ink-muted">{previous.failed.includes(c.id) ? 'Previous unavailable' : `Previous ${hours(previous.byId[c.id]?.total_loaded_hours)}`}</p></div> },
    { id: 'next', header: 'Next service', hideBelow: 'md', cell: c => { const si = calculateNextService(c.total_running_hours); return si ? <StatusBadge tone={URGENCY_TONE[si.urgency] ?? 'neutral'} icon={si.isUrgent ? 'warning' : undefined}>{`${si.interval} h in ${si.daysRemaining} d`}</StatusBadge> : <span className="text-ink-muted">All passed</span>; } },
  ];

  const backup = () => {
    const data = { compressors, stats: stats.data, upcomingServices: d.services.data, performanceMetrics: d.metrics.data, trends: d.trends.data, comparison: d.comparison.data, management: d.summary.data, exportDate: new Date().toISOString() };
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = `compressors-backup-${localDateString(new Date())}.json`; a.click();
    URL.revokeObjectURL(url);
    toast.success('Backup downloaded.');
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumbs={[{ label: 'Operations and maintenance' }, { label: 'Compressors' }]}
        title="Compressors"
        description="Daily readings, service scheduling and efficiency."
        actions={(
          <>
            <IconButton icon="refresh" label="Refresh compressors" variant="shell" pending={register.loading && register.loaded} onClick={() => d.refresh()} />
            {compressors.length > 0 && <DownloadButton data={compressors as unknown as Record<string, unknown>[]} columns={EXPORT_COLUMNS} filename={exportFilename('compressors')} title="Compressor Tracking" formats={['excel']} />}
            <Button variant="primary" icon="plus" disabled={unavailable} onClick={() => setAdding(true)}>Add compressor</Button>
          </>
        )}
      />

      <div className="flex flex-col gap-3">
        <MetricGrid compact>
          <MetricTile compact label="Total units" value={s?.total_compressors} {...tileState} />
          <MetricTile compact label="Running hours" value={s ? hours(s.total_running_hours) : undefined} {...tileState} />
          <MetricTile compact label="Avg efficiency" value={s ? `${s.avg_efficiency ?? 0}%` : undefined} {...tileState} />
          <MetricTile compact label="Upcoming services" value={s?.upcoming_services} tone={s?.upcoming_services ? 'warning' : 'default'} {...tileState} />
          <MetricTile compact label="Urgent alerts" value={s?.urgent_alerts} tone={s?.urgent_alerts ? 'danger' : 'default'} {...tileState} />
          <MetricTile compact label="Active" value={s?.active_compressors} {...tileState} />
        </MetricGrid>
        {stats.error && <Notice tone={stats.loaded ? 'warning' : 'danger'} title={stats.loaded ? 'Summary figures may be out of date' : 'Summary figures could not be loaded'} action={<Button size="sm" icon="refresh" onClick={() => d.refresh()}>Try again</Button>}>{stats.error}</Notice>}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList aria-label="Compressor sections">
          <TabsTrigger value="daily" icon="calendar">Daily readings</TabsTrigger>
          <TabsTrigger value="services" icon="service">Services</TabsTrigger>
          <TabsTrigger value="analytics" icon="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="management" icon="maintenance">Management</TabsTrigger>
        </TabsList>

        <TabsContent value="daily" className="mt-4 flex flex-col gap-4">
          <Toolbar inline={2} filtered={hasFilters} trailing={<ViewToggle value={view} onValueChange={setView} options={VIEW_CARDS_TABLE} />}>
            <div className="flex items-center gap-2">
              <IconButton icon="chevron-left" label="Previous day" variant="outline" onClick={() => setDate(shiftDay(date, -1))} />
              <Input type="date" aria-label="Reading date" className="w-44" value={date} onChange={e => e.target.value && setDate(e.target.value)} />
              <IconButton icon="chevron-right" label="Next day" variant="outline" onClick={() => setDate(shiftDay(date, 1))} />
              <Button onClick={() => setDate(localDateString(new Date()))}>Today</Button>
            </div>
            <SearchField value={search} onValueChange={setSearch} placeholder="Search compressors" wrapperClassName="min-w-48 max-w-xs flex-1" />
            <Select className="w-44" aria-label="Filter by location" value={locationF} onValueChange={setLocationF} options={[{ value: ALL, label: 'All locations' }, ...locations.map(l => ({ value: l, label: l }))]} />
            <Select className="w-40" aria-label="Filter by status" value={statusF} onValueChange={setStatusF} options={[{ value: ALL, label: 'All statuses' }, ...STATUS_KEYS.map(k => ({ value: k, label: STATUS_META[k].label }))]} />
            {hasFilters && <Button variant="ghost" icon="close" onClick={clearFilters}>Clear filters</Button>}
          </Toolbar>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <Checkbox label="Include offline" checked={includeOffline} onChange={e => setIncludeOffline(e.target.checked)} />
            <Checkbox label="Show daily figures" checked={showDaily} onChange={e => setShowDaily(e.target.checked)} />
            <Checkbox label="Service due soon only" checked={dueSoon} onChange={e => setDueSoon(e.target.checked)} />
          </div>

          <DataRegion
            status={status}
            subject="compressors"
            error={register.error}
            onRetry={() => d.refresh()}
            empty={hasFilters
              ? <EmptyState icon="search" title="No compressors match" description="Try a different search or filter." action={<Button onClick={clearFilters}>Clear filters</Button>} />
              : <EmptyState icon="compressor" title="No compressors registered" description="Add the first compressor to start recording readings." action={<Button variant="primary" icon="plus" onClick={() => setAdding(true)}>Add compressor</Button>} />}
          >
            {previous.failed.length > 0 && <Notice tone="warning" title="Some previous readings could not be loaded">{previous.failed.length === 1 ? 'One compressor shows' : `${previous.failed.length} compressors show`} no previous totals. Its daily figures are left blank rather than guessed.</Notice>}
            <p className="font-sans text-caption text-ink-muted">{filtered.length} {filtered.length === 1 ? 'compressor' : 'compressors'}{filtered.length !== compressors.length ? ` of ${compressors.length}` : ''} · readings for {dayLabel(date)}</p>
            {view === 'cards' ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">{filtered.map(card)}</div>
            ) : (
              <DataTable
                caption="Compressors"
                rows={filtered}
                columns={COLUMNS}
                getRowId={c => String(c.id)}
                onRowActivate={c => setReadingId(c.id)}
                rowActions={c => (
                  <span className="inline-flex gap-1">
                    <IconButton icon="edit" size="sm" label={`Enter a reading for ${c.name}`} onClick={() => setReadingId(c.id)} />
                    <IconButton icon="settings" size="sm" label={`Change status of ${c.name}`} onClick={() => setStatusId(c.id)} />
                  </span>
                )}
              />
            )}
          </DataRegion>
        </TabsContent>

        <TabsContent value="services" className="mt-4">
          <ServicesTab services={d.services} compressors={compressors} registerLoaded={register.loaded} onRetry={() => d.refresh()} onComplete={d.completeService} onExport={d.exportCsv} onImport={d.importCsv} />
        </TabsContent>
        <TabsContent value="analytics" className="mt-4">
          <AnalyticsTab metrics={d.metrics} trends={d.trends} comparison={d.comparison} period={d.period} onPeriod={d.setPeriod} metric={d.metric} onMetric={d.setMetric} onRetry={() => d.refresh()} />
        </TabsContent>
        <TabsContent value="management" className="mt-4">
          <ManagementTab summary={d.summary} onRetry={() => d.refresh()} onExport={d.exportCsv} onBackup={backup} backupReady={register.loaded} />
        </TabsContent>
      </Tabs>

      <AddCompressorDialog open={adding} onOpenChange={setAdding} locations={locations} onAdd={d.addCompressor} />
      <StatusDialog compressor={statusCompressor} onClose={() => setStatusId(null)} onChange={d.changeStatus} />
      <Dialog open={!!readingCompressor} onOpenChange={o => { if (!o) setReadingId(null); }} title={readingCompressor ? `Reading for ${readingCompressor.name}` : 'Reading'} size="md">
        {readingCompressor && card(readingCompressor)}
      </Dialog>
    </div>
  );
}

export default function CompressorsPage() {
  return <AppShell migrated><CompressorsContent /></AppShell>;
}
