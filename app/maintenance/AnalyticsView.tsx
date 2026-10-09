// app/maintenance/AnalyticsView.tsx — the work orders counted: how many of each class, status and discipline, who has put in the hours
// on breakdowns (recorded time, with estimates marked as such), which failure modes recur, and when in the day breakdowns are raised.
// Filter it by date, department, machine, artisan, classification, discipline, trade or failure mode. Every chart has a written
// summary and the lists print their numbers.
'use client';

import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Button, ChartPanel, Distribution, EmptyState, Field, Input, MetricGrid, MetricTile, Select, chartColor, chartTheme } from '@/components/ui-system';
import { formatCurrency } from '@/components/shared/utils';
import { NO_ANALYTICS_FILTERS, analyticsFilterCount, calcStats, distinct, filterAnalytics, type AnalyticsFilters } from './helpers';
import { CLASSIFICATIONS, DISCIPLINES } from './meta';
import type { WorkOrder } from './types';

const ALL = '__all__';
const choices = (label: string, values: string[]) => [{ value: ALL, label }, ...values.map(v => ({ value: v, label: v }))];
const line = (rows: { name: string; value: number }[], unit = '') => rows.map(r => `${r.name} ${r.value}${unit}`).join('; ') || 'none';

export function AnalyticsView({ orders }: { orders: WorkOrder[] }) {
  const [f, setF] = useState<AnalyticsFilters>(NO_ANALYTICS_FILTERS);
  const set = (patch: Partial<AnalyticsFilters>) => setF(prev => ({ ...prev, ...patch }));
  const active = analyticsFilterCount(f);
  const scoped = useMemo(() => filterAnalytics(orders, f), [orders, f]);
  const all = useMemo(() => calcStats(orders), [orders]);
  const st = useMemo(() => calcStats(scoped), [scoped]);
  const opt = useMemo(() => ({
    departments: distinct(orders.map(w => w.to_department)), artisans: distinct(orders.map(w => w.allocated_to || w.artisan_name)), machines: distinct(orders.map(w => w.equipment_info)),
    trades: distinct(orders.map(w => w.trade)), failureModes: distinct(orders.map(w => w.failure_mode)),
  }), [orders]);

  const classes = [{ name: 'Planned maintenance', value: st.plannedMaintenance }, { name: 'Projects', value: st.projects }, { name: 'Breakdowns', value: st.breakdowns }, { name: 'Other', value: st.customClass }].filter(r => r.value > 0);
  const statuses = [{ name: 'Pending', value: st.pending }, { name: 'In progress', value: st.inProgress }, { name: 'Completed', value: st.completed }, { name: 'On hold', value: st.onHold }].filter(r => r.value > 0);
  const disciplines = [{ name: 'Mechanical', value: st.mechanical }, { name: 'Electrical', value: st.electrical }].filter(r => r.value > 0);
  const artisans = st.artisanCost.slice(0, 6).map(a => ({ name: `${a.estimated > 0 ? '~' : ''}${a.name}`, value: Math.round(a.hours * 10) / 10 }));
  const failures = st.failureModes.map(([name, value]) => ({ name, value }));
  const hours = st.hourBuckets.map((count, h) => ({ hour: String(h).padStart(2, '0'), count }));
  const peak = hours.reduce((b, x) => (x.count > b.count ? x : b), hours[0]);
  const breakdownHours = st.artisanCost.reduce((a, x) => a + x.hours, 0);

  if (orders.length === 0) return <EmptyState icon="analytics" title="Nothing to analyse yet" description="Raise a work order and its numbers will appear here." />;
  return (
    <div className="flex flex-col gap-5">
      <section aria-labelledby="an-f" className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="an-f" className="font-sans text-label font-semibold text-ink">Filter the analytics</h2>
          <span className="font-sans text-caption text-ink-muted" role="status">{active > 0 ? `Showing ${scoped.length} of ${orders.length} work orders` : `${orders.length} work orders`}</span>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-5">
          <Field label="From date"><Input type="date" value={f.dateFrom} onChange={e => set({ dateFrom: e.target.value })} /></Field>
          <Field label="To date"><Input type="date" value={f.dateTo} onChange={e => set({ dateTo: e.target.value })} /></Field>
          <Field label="Department"><Select aria-label="Department" value={f.department || ALL} onValueChange={v => set({ department: v === ALL ? '' : v })} options={choices('All departments', opt.departments)} /></Field>
          <Field label="Classification"><Select aria-label="Classification" value={f.classification || ALL} onValueChange={v => set({ classification: v === ALL ? '' : v })} options={[{ value: ALL, label: 'All classes' }, ...CLASSIFICATIONS.map(c => ({ value: c.value as string, label: c.label }))]} /></Field>
          <Field label="Discipline"><Select aria-label="Discipline" value={f.discipline || ALL} onValueChange={v => set({ discipline: v === ALL ? '' : v })} options={[{ value: ALL, label: 'All disciplines' }, ...DISCIPLINES.map(d => ({ value: d as string, label: d }))]} /></Field>
          <Field label="Artisan"><Select aria-label="Artisan" value={f.artisan || ALL} onValueChange={v => set({ artisan: v === ALL ? '' : v })} options={choices('All artisans', opt.artisans)} /></Field>
          <Field label="Machine"><Select aria-label="Machine" value={f.machine || ALL} onValueChange={v => set({ machine: v === ALL ? '' : v })} options={choices('All machines', opt.machines)} /></Field>
          <Field label="Trade"><Select aria-label="Trade" value={f.trade || ALL} onValueChange={v => set({ trade: v === ALL ? '' : v })} options={choices('All trades', opt.trades)} /></Field>
          <Field label="Failure mode"><Select aria-label="Failure mode" value={f.failureMode || ALL} onValueChange={v => set({ failureMode: v === ALL ? '' : v })} options={choices('All failure modes', opt.failureModes)} /></Field>
        </div>
        {active > 0 && <div><Button variant="ghost" icon="close" onClick={() => setF(NO_ANALYTICS_FILTERS)}>Clear filters</Button></div>}
      </section>

      {scoped.length === 0 ? <EmptyState icon="search" title="No work orders match" description="Try fewer filters." action={<Button onClick={() => setF(NO_ANALYTICS_FILTERS)}>Clear filters</Button>} /> : (
        <>
          <MetricGrid columns={5}>
            <MetricTile label="Work orders" icon="wrench" value={st.total} detail={active > 0 ? `of ${all.total}` : undefined} />
            <MetricTile label="Breakdowns" icon="breakdown" tone={st.breakdowns ? 'warning' : 'default'} value={st.breakdowns} detail={st.total ? `${Math.round((st.breakdowns / st.total) * 100)}% of the total` : undefined} />
            <MetricTile label="Planned maintenance" icon="maintenance" value={st.plannedMaintenance} />
            <MetricTile label="Breakdown hours" icon="clock" value={`${breakdownHours.toFixed(1)}h`} detail={st.artisanCost.some(a => a.estimated > 0) ? 'Includes estimates' : 'Recorded time'} />
            <MetricTile label="Completion" icon="success" tone={st.efficiency >= 70 ? 'success' : st.efficiency >= 40 ? 'warning' : 'danger'} value={`${st.efficiency}%`} detail={`${st.completed} of ${st.total}`} />
          </MetricGrid>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <ChartPanel title="By classification" summary={`Work orders by classification: ${line(classes)}.`}><Distribution rows={classes} empty="No work orders are classified yet." /></ChartPanel>
            <ChartPanel title="By status" summary={`Work orders by status: ${line(statuses)}.`}><Distribution rows={statuses} /></ChartPanel>
            <ChartPanel title="By discipline" description={st.sparesTotalCost > 0 ? `Spares cost ${formatCurrency(st.sparesTotalCost)}` : undefined} summary={`Work orders by discipline: ${line(disciplines)}.`}><Distribution rows={disciplines} empty="No discipline recorded yet." /></ChartPanel>
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ChartPanel title="Artisan hours on breakdowns" description="Recorded time. A name marked ~ includes the supervisor's estimate where no time was recorded." summary={`Hours on breakdowns by artisan: ${line(artisans, ' hours')}.`}><Distribution rows={artisans} empty="No breakdown data yet." /></ChartPanel>
            <ChartPanel title="Failure modes" description="Most common eight" summary={`Failure modes: ${line(failures)}.`}><Distribution rows={failures} empty="No failure modes recorded yet." /></ChartPanel>
          </div>
          <ChartPanel title="When breakdowns are raised" description={st.breakdowns > 0 ? `Busiest hour: ${peak.hour}:00 (${peak.count})` : undefined} summary={`Breakdowns raised per hour of the day: ${hours.filter(h => h.count > 0).map(h => `${h.hour}:00 ${h.count}`).join('; ') || 'none'}.`}>
            {st.breakdowns === 0 ? <p className="py-6 font-sans text-body-sm text-ink-muted">No breakdown times recorded yet.</p> : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart accessibilityLayer={false} data={hours} margin={{ left: 0, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} vertical={false} />
                  <XAxis dataKey="hour" tick={chartTheme.axisTick} axisLine={false} tickLine={false} interval={1} />
                  <YAxis allowDecimals={false} tick={chartTheme.axisTick} axisLine={false} tickLine={false} width={28} />
                  <Tooltip {...chartTheme.tooltip} labelFormatter={(l: unknown) => `${l}:00`} formatter={(v: unknown) => [`${v}`, 'Breakdowns']} />
                  <Bar dataKey="count" fill={chartColor(1)} radius={[3, 3, 0, 0]} maxBarSize={22} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartPanel>
        </>
      )}
    </div>
  );
}
