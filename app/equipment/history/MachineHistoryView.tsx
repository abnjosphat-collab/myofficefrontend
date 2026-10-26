// app/equipment/history/MachineHistoryView.tsx — one machine's history (M6): its jobs,
// breakdowns, planned work, spares, hours and its measures, as the server counts
// them. Lists and totals cover everything ever recorded; the measures reuse the
// M5 definitions over the trailing window. Definitions live in docs/WORK_ORDERS.md.
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button, DataTable, EmptyState, Fact, FactList, IconButton, LoadingPulse, MetricGrid, MetricTile, Notice, PageHeader, Pagination, Panel, StatusBadge, pageSlice, type Column } from '@/components/ui-system';
import { formatCurrency, fmtDate } from '@/components/shared/utils';
import { ApiError } from '@/lib/apiClient';
import { priorityTone, statusTone } from '@/lib/status';
import { minutesToDisplay } from '../../breakdowns/calcBreakdowns';
import { priorityMeta as bdPriorityMeta, statusMeta as bdStatusMeta, typeMeta as bdTypeMeta } from '../../breakdowns/breakdownMeta';
import { RECURRENCES, classificationLabel, priorityMeta as woPriorityMeta, statusMeta as woStatusMeta } from '../../maintenance/meta';
import type { MaintenanceSchedule, WorkOrder } from '../../maintenance/types';
import { fetchMachineHistory } from '../api';
import { STATUS_LABELS, calcAge } from '../equipmentLogic';
import type { HistoryBreakdown, MachineHistoryPayload } from '../historyTypes';
import type { EquipmentItem } from '../types';

const dash = (v: number | null, unit: string) => (v === null ? 'No data' : `${v}${unit}`);
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** One machine's history from the server. A failed read is flagged with a retry, never zeros. */
export function useMachineHistory(equipmentId: string) {
  const [tick, setTick] = useState(0);
  const [settled, setSettled] = useState<{ payload: MachineHistoryPayload | null; failed: boolean; notFound: boolean }>(
    { payload: null, failed: false, notFound: false },
  );
  useEffect(() => {
    let current = true;
    fetchMachineHistory(equipmentId).then(
      payload => { if (current) setSettled({ payload, failed: false, notFound: false }); },
      (e: unknown) => { if (current) setSettled({ payload: null, failed: true, notFound: e instanceof ApiError && e.status === 404 }); },
    );
    return () => { current = false; };
  }, [equipmentId, tick]);
  const refetch = () => { setSettled({ payload: null, failed: false, notFound: false }); setTick(t => t + 1); };
  const [seen, setSeen] = useState(equipmentId);
  if (seen !== equipmentId) { setSeen(equipmentId); setSettled({ payload: null, failed: false, notFound: false }); }
  const mine = seen === equipmentId;
  return { payload: mine ? settled.payload : null, loading: !mine || (!settled.payload && !settled.failed), failed: mine && settled.failed, notFound: mine && settled.notFound, refetch };
}

const recurrenceLabel = (value?: string | null) => RECURRENCES.find(r => r.value === value)?.label ?? (value || 'Not set');

function EquipmentFacts({ item }: { item: EquipmentItem }) {
  const s = (item.status || '').toLowerCase();
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <StatusBadge tone={statusTone(s)}>{STATUS_LABELS[s] ?? (item.status || 'Unknown')}</StatusBadge>
        {item.criticality && <StatusBadge tone={priorityTone(item.criticality)}>{item.criticality} criticality</StatusBadge>}
      </div>
      <FactList columns={3}>
        <Fact label="Category">{item.category}</Fact>
        <Fact label="Location">{item.location}</Fact>
        <Fact label="Department">{item.department}</Fact>
        <Fact label="Model">{[item.manufacturer, item.model].filter(Boolean).join(' ')}</Fact>
        <Fact label="Serial number">{item.serial_number}</Fact>
        <Fact label="Age">{calcAge(item.commission_date)}</Fact>
      </FactList>
    </div>
  );
}

const breakdownDowntime = (b: HistoryBreakdown): number | null => {
  if (b.downtime_minutes !== null && b.downtime_minutes !== undefined && Number.isFinite(Number(b.downtime_minutes))) {
    return Number(b.downtime_minutes);
  }
  return null;
};

const downtimeText = (b: HistoryBreakdown): string => {
  const measured = breakdownDowntime(b);
  return measured === null ? 'Not recorded' : minutesToDisplay(Math.round(measured));
};

function JobsPanel({ jobs, openJobs }: { jobs: WorkOrder[]; openJobs: number }) {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const columns: Column<WorkOrder>[] = [
    {
      id: 'job', header: 'Job', sticky: true,
      cell: w => (
        <div className="min-w-0">
          <p className="font-medium text-ink tabular">#{w.work_order_number}</p>
          <p className="max-w-72 truncate text-caption text-ink-muted">{w.job_request_details || classificationLabel(w) || ''}</p>
        </div>
      ),
    },
    { id: 'status', header: 'Status', cell: w => { const m = woStatusMeta(w.status); return <StatusBadge tone={m.tone}>{m.label}</StatusBadge>; } },
    { id: 'priority', header: 'Priority', hideBelow: 'md', cell: w => { const m = woPriorityMeta(w.priority); return <StatusBadge tone={m.tone}>{m.label}</StatusBadge>; } },
    { id: 'raised', header: 'Raised', hideBelow: 'md', cell: w => <span className="whitespace-nowrap tabular">{w.date_raised ? fmtDate(w.date_raised) : 'No date'}</span> },
    { id: 'hours', header: 'Hours', numeric: true, hideBelow: 'lg', cell: w => <span className="tabular">{w.total_time_worked || '–'}</span> },
  ];
  return (
    <Panel title={`Jobs (${plural(jobs.length, 'job', 'jobs')}, ${openJobs} open)`} description="Every job for this machine, newest first.">
      {jobs.length === 0 ? (
        <p className="py-4 font-sans text-body-sm text-ink-muted">No jobs recorded for this machine yet.</p>
      ) : (
        <div className="flex flex-col gap-3">
          <DataTable
            caption="Jobs for this machine" rows={pageSlice(jobs, page, pageSize)} columns={columns} getRowId={w => String(w.id)}
            onRowActivate={w => router.push(`/maintenance?open=${encodeURIComponent(String(w.id))}`)}
          />
          {jobs.length > pageSize && <Pagination page={page} pageSize={pageSize} total={jobs.length} onPageChange={setPage} />}
        </div>
      )}
    </Panel>
  );
}

function BreakdownsPanel({ rows }: { rows: HistoryBreakdown[] }) {
  const router = useRouter();
  const columns: Column<HistoryBreakdown>[] = [
    { id: 'date', header: 'Date', cell: b => <span className="whitespace-nowrap tabular">{b.breakdown_date ? fmtDate(b.breakdown_date) : 'No date'}</span> },
    {
      id: 'kind', header: 'Kind', sticky: true,
      cell: b => (
        <div className="min-w-0">
          <p className="font-medium text-ink">{bdTypeMeta(b.breakdown_type).label}</p>
          {b.breakdown_nature && <p className="max-w-56 truncate text-caption text-ink-muted">{b.breakdown_nature}</p>}
        </div>
      ),
    },
    { id: 'downtime', header: 'Downtime', numeric: true, hideBelow: 'md', cell: b => <span className="tabular">{downtimeText(b)}</span> },
    { id: 'status', header: 'Status', cell: b => { const m = bdStatusMeta(b.status); return <StatusBadge tone={m.tone}>{m.label}</StatusBadge>; } },
    { id: 'priority', header: 'Priority', hideBelow: 'md', cell: b => { const m = bdPriorityMeta(b.priority); return <StatusBadge tone={m.tone}>{m.label}</StatusBadge>; } },
    { id: 'artisan', header: 'Artisan', hideBelow: 'lg', cell: b => b.artisan_name || <span className="text-ink-muted">Not assigned</span> },
  ];
  return (
    <Panel title={`Breakdowns (${plural(rows.length, 'breakdown', 'breakdowns')})`} description="Every breakdown logged for this machine, newest first.">
      {rows.length === 0 ? (
        <p className="py-4 font-sans text-body-sm text-ink-muted">No breakdowns recorded for this machine yet.</p>
      ) : (
        <DataTable
          caption="Breakdowns for this machine" rows={rows} columns={columns} getRowId={b => String(b.id)}
          onRowActivate={b => router.push(`/breakdowns?open=${encodeURIComponent(String(b.id))}`)}
        />
      )}
    </Panel>
  );
}

function SchedulesPanel({ rows }: { rows: MaintenanceSchedule[] }) {
  const columns: Column<MaintenanceSchedule>[] = [
    {
      id: 'schedule', header: 'Schedule', sticky: true,
      cell: s => (
        <div className="min-w-0">
          <p className="font-medium text-ink [overflow-wrap:anywhere]">{s.name}</p>
          <p className="text-caption text-ink-muted">{recurrenceLabel(s.recurrence_type)}</p>
        </div>
      ),
    },
    { id: 'due', header: 'Next due', cell: s => <span className="whitespace-nowrap tabular">{s.next_due_date ? fmtDate(s.next_due_date) : 'Not set'}</span> },
    { id: 'state', header: 'State', cell: s => (s.active ? <StatusBadge tone="success">Active</StatusBadge> : <StatusBadge tone="neutral">Paused</StatusBadge>) },
  ];
  return (
    <Panel title={`Planned work (${plural(rows.length, 'schedule', 'schedules')})`} description="The routines that raise jobs for this machine.">
      {rows.length === 0 ? (
        <p className="py-4 font-sans text-body-sm text-ink-muted">No planned work for this machine yet.</p>
      ) : (
        <DataTable caption="Planned work for this machine" rows={rows} columns={columns} getRowId={s => String(s.id)} />
      )}
    </Panel>
  );
}

function SparesPanel({ rows, total }: { rows: MachineHistoryPayload['spares']; total: number }) {
  const usedOn = (s: MachineHistoryPayload['spares'][number]) => {
    const parts = [];
    if (s.jobs > 0) parts.push(plural(s.jobs, 'job', 'jobs'));
    if (s.breakdowns > 0) parts.push(plural(s.breakdowns, 'breakdown', 'breakdowns'));
    return parts.join(' · ') || '–';
  };
  const columns: Column<MachineHistoryPayload['spares'][number]>[] = [
    { id: 'part', header: 'Part', sticky: true, cell: s => <span className="font-medium text-ink [overflow-wrap:anywhere]">{s.name}</span> },
    { id: 'quantity', header: 'Quantity', numeric: true, cell: s => <span className="tabular">{s.quantity}</span> },
    { id: 'cost', header: 'Cost', numeric: true, cell: s => <span className="tabular">{formatCurrency(s.cost)}</span> },
    { id: 'used', header: 'Used on', hideBelow: 'md', cell: s => <span className="text-caption text-ink-muted">{usedOn(s)}</span> },
  ];
  return (
    <Panel title={`Spares (${plural(rows.length, 'part', 'parts')} · ${formatCurrency(total)})`} description="Parts used on this machine's jobs and breakdowns.">
      {rows.length === 0 ? (
        <p className="py-4 font-sans text-body-sm text-ink-muted">No spares recorded on this machine yet.</p>
      ) : (
        <DataTable caption="Spares used on this machine" rows={rows} columns={columns} getRowId={s => s.name} />
      )}
    </Panel>
  );
}

function MeasuresPanel({ h }: { h: MachineHistoryPayload }) {
  const pm = h.measures.pm_on_time;
  const dt = h.measures.downtime;
  const repeats = h.measures.repeat_failures;
  const repeatCount = repeats.groups_30d + repeats.groups_90d;
  const statuses = Object.entries(h.totals.counts_by_status);
  return (
    <Panel title={`Measures (last ${h.period.days} days)`} description="PM done on time, downtime, and repeat failures, counted the M5 way.">
      <ul className="flex flex-col gap-2">
        <li className="flex flex-wrap items-baseline justify-between gap-3 rounded-control border border-line-subtle px-3 py-2 font-sans text-body-sm">
          <span className="text-ink">PM done on time</span>
          <span className="shrink-0 text-caption text-ink-muted tabular">
            {pm.percent === null ? 'No data' : `${pm.percent}% (${pm.on_time} of ${pm.total})`}
          </span>
        </li>
        <li className="flex flex-wrap items-baseline justify-between gap-3 rounded-control border border-line-subtle px-3 py-2 font-sans text-body-sm">
          <span className="text-ink">Downtime, MTTR and MTBF</span>
          <span className="shrink-0 text-caption text-ink-muted tabular">
            {dt === null
              ? `No breakdowns in the last ${h.period.days} days`
              : `${plural(dt.breakdowns, 'breakdown', 'breakdowns')} · ${dt.downtime_hours}h down · MTTR ${dash(dt.mttr_hours, 'h')} · MTBF ${dash(dt.mtbf_days, ' days')}`}
          </span>
        </li>
        <li className="flex flex-wrap items-baseline justify-between gap-3 rounded-control border border-line-subtle px-3 py-2 font-sans text-body-sm">
          <span className="text-ink">Repeat failures</span>
          <span className="shrink-0 text-caption text-ink-muted tabular">
            {repeatCount === 0 ? `None in ${h.period.days} days` : plural(repeatCount, 'repeat group', 'repeat groups')}
          </span>
        </li>
      </ul>
      {repeats.groups.length > 0 && (
        <ul className="mt-2 flex flex-col gap-2">
          {repeats.groups.map((g, i) => (
            <li key={`${g.code}|${i}`} className="flex flex-wrap items-baseline justify-between gap-3 rounded-control border border-line-subtle px-3 py-2 font-sans text-body-sm">
              <span className="min-w-0 flex-1 truncate text-ink">{g.code}</span>
              <span className="shrink-0 text-caption text-ink-muted tabular">{g.count} times in {g.window_days} days · {fmtDate(g.first)} – {fmtDate(g.last)}</span>
            </li>
          ))}
        </ul>
      )}
      {statuses.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="font-sans text-caption text-ink-muted">Jobs by status:</span>
          {statuses.map(([status, count]) => { const m = woStatusMeta(status); return <StatusBadge key={status} tone={m.tone}>{m.label} · {count}</StatusBadge>; })}
        </div>
      )}
    </Panel>
  );
}

function MachineHistoryLoaded({ h }: { h: MachineHistoryPayload }) {
  const t = h.totals;
  return (
    <div className="flex flex-col gap-4">
      <EquipmentFacts item={h.equipment} />
      <div>
        <p className="font-sans text-caption text-ink-muted" role="status">
          Counted on the server · {fmtDate(h.period.start)} – {fmtDate(h.period.end)} ({h.period.days} days) · Lists and totals cover all time.
        </p>
        {!h.links_active && (
          <p className="font-sans text-caption text-ink-muted">Jobs are matched by machine name until the register links are live.</p>
        )}
      </div>
      <MetricGrid>
        <MetricTile label="Open jobs" icon="pending" tone={t.open_jobs ? 'warning' : 'default'} value={t.open_jobs} detail={`${t.jobs} ${t.jobs === 1 ? 'job' : 'jobs'} all time`} />
        <MetricTile label="Breakdowns" icon="breakdown" value={t.breakdowns} detail="All time" />
        <MetricTile label="Downtime" icon="clock" value={`${t.downtime_hours}h`} detail="All time" />
        <MetricTile label="Labour" icon="wrench" value={`${t.labour_hours}h`} detail="Recorded time" />
        <MetricTile label="Spares cost" icon="spares" value={formatCurrency(t.spares_cost)} detail={`${h.spares.length} ${h.spares.length === 1 ? 'part' : 'parts'}`} />
      </MetricGrid>
      <JobsPanel jobs={h.jobs} openJobs={t.open_jobs} />
      <BreakdownsPanel rows={h.breakdowns} />
      <SchedulesPanel rows={h.schedules} />
      <SparesPanel rows={h.spares} total={t.spares_cost} />
      <MeasuresPanel h={h} />
    </div>
  );
}

export function MachineHistoryView({ equipmentId }: { equipmentId: string }) {
  const { payload, loading, failed, notFound, refetch } = useMachineHistory(equipmentId);
  const name = payload?.equipment.name;
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        breadcrumbs={[{ label: 'Equipment', href: '/equipment' }, { label: name ?? 'History' }]}
        title={name ?? 'Machine history'}
        description={payload ? `History for ${payload.equipment.equipment_id ?? payload.equipment.name}.` : 'One machine: its jobs, breakdowns, planned work, spares, hours and measures.'}
        actions={(
          <>
            <Button variant="ghost" icon="back" asChild><Link href="/equipment">Register</Link></Button>
            <IconButton icon="refresh" label="Refresh machine history" variant="shell" pending={loading} onClick={() => refetch()} />
          </>
        )}
      />
      {loading && <LoadingPulse compact label="Loading machine history" />}
      {!loading && notFound && (
        <EmptyState
          icon="equipment" title="This machine is not on the register"
          description="It may have been removed, or you may not be able to see it."
          action={(
            <span className="inline-flex flex-wrap justify-center gap-2">
              <Button variant="primary" icon="back" asChild><Link href="/equipment">Back to the register</Link></Button>
              <Button variant="secondary" onClick={refetch}>Try again</Button>
            </span>
          )}
        />
      )}
      {!loading && failed && !notFound && (
        <Notice
          tone="danger"
          title="The machine history could not be loaded."
          action={<Button size="sm" variant="secondary" onClick={refetch}>Try again</Button>}
        />
      )}
      {!loading && !failed && payload && <MachineHistoryLoaded h={payload} />}
    </div>
  );
}

