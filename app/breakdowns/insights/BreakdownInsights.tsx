// app/breakdowns/insights/BreakdownInsights.tsx — the analytics for a selection of breakdowns, in five views: Overview (totals, the
// monthly trend, kinds of fault and departments), When (hour and weekday), Machines, People and parts, and Mix (priority, status,
// place). Everything comes from the server's analysis of the same records; each chart is in a panel with a written summary and the
// lists print their numbers, so nothing is carried by colour or a hover alone.
'use client';

import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartPanel, Distribution, MetricGrid, MetricTile, Tabs, TabsContent, TabsList, TabsTrigger, chartColor, chartTheme, type Column } from '@/components/ui-system';
import { priorityMeta, statusMeta, typeMeta } from '../breakdownMeta';
import { HourDayHeatmap } from './HourDayHeatmap';
import { DAYS_LONG, busiest, duration, line, money, monthLabel } from './insightsLogic';
import { RankTable } from './RankTable';
import type { HeatmapData } from './types';

type Machine = HeatmapData['top_problem_machines'][number] & { rank: number };
type Person = HeatmapData['artisan_performance'][number] & { rank: number };
type Part = HeatmapData['top_spare_parts'][number] & { rank: number };
const ranked = <T,>(rows: T[] | undefined, n = 10): (T & { rank: number })[] => (rows ?? []).slice(0, n).map((r, i) => ({ ...r, rank: i + 1 }));
const named = <T,>(rows: T[] | undefined, name: (r: T) => string, value: (r: T) => number) => (rows ?? []).map(r => ({ name: name(r), value: value(r) }));

const MACHINES: Column<Machine>[] = [
  { id: 'rank', header: '#', numeric: true, cell: r => <span className="tabular text-ink-muted">{r.rank}</span> },
  { id: 'name', header: 'Machine', sticky: true, cell: r => <div className="min-w-0"><p className="font-medium text-ink [overflow-wrap:anywhere]">{r.name}</p><p className="text-caption text-ink-muted">{r.department}</p></div> },
  { id: 'count', header: 'Breakdowns', numeric: true, cell: r => <span className="font-semibold tabular">{r.count}</span> },
  { id: 'down', header: 'Total downtime', numeric: true, cell: r => <span className="tabular">{duration(r.total_downtime)}</span> },
  { id: 'avgd', header: 'Average downtime', numeric: true, hideBelow: 'md', cell: r => <span className="tabular">{duration(r.avg_downtime)}</span> },
  { id: 'avgr', header: 'Average repair', numeric: true, hideBelow: 'lg', cell: r => <span className="tabular">{duration(r.avg_repair_time)}</span> },
  { id: 'resp', header: 'Average response', numeric: true, hideBelow: 'lg', cell: r => <span className="tabular">{duration(r.avg_response_time)}</span> },
];
const PEOPLE: Column<Person>[] = [
  { id: 'rank', header: '#', numeric: true, cell: r => <span className="tabular text-ink-muted">{r.rank}</span> },
  { id: 'name', header: 'Artisan', sticky: true, cell: r => <span className="font-medium text-ink [overflow-wrap:anywhere]">{r.name}</span> },
  { id: 'count', header: 'Jobs', numeric: true, cell: r => <span className="font-semibold tabular">{r.count}</span> },
  { id: 'total', header: 'Total repair time', numeric: true, hideBelow: 'md', cell: r => <span className="tabular">{duration(r.total_repair_time)}</span> },
  { id: 'avg', header: 'Average repair', numeric: true, cell: r => <span className="tabular">{duration(r.avg_repair_time)}</span> },
];
const PARTS: Column<Part>[] = [
  { id: 'rank', header: '#', numeric: true, cell: r => <span className="tabular text-ink-muted">{r.rank}</span> },
  { id: 'name', header: 'Part', sticky: true, cell: r => <div className="min-w-0"><p className="font-medium text-ink [overflow-wrap:anywhere]">{r.name}</p>{r.part_number && <p className="font-mono text-caption text-ink-muted">{r.part_number}</p>}</div> },
  { id: 'jobs', header: 'Jobs', numeric: true, cell: r => <span className="tabular">{r.count}</span> },
  { id: 'qty', header: 'Quantity', numeric: true, cell: r => <span className="font-semibold tabular">{r.total_quantity}</span> },
  { id: 'cost', header: 'Cost', numeric: true, cell: r => <span className="tabular">{money(r.total_cost)}</span> },
];

function Bars({ data, x }: { data: { name: string; value: number }[]; x: string }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ left: 0, right: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} vertical={false} />
        <XAxis dataKey={x} tick={chartTheme.axisTick} axisLine={false} tickLine={false} interval="preserveStartEnd" />
        <YAxis tick={chartTheme.axisTick} axisLine={false} tickLine={false} width={36} allowDecimals={false} />
        <Tooltip {...chartTheme.tooltip} formatter={(v: unknown) => [String(v), 'Breakdowns']} />
        <Bar dataKey="value" name="Breakdowns" fill={chartColor(1)} radius={[4, 4, 0, 0]} maxBarSize={36} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function BreakdownInsights({ data }: { data: HeatmapData }) {
  const [tab, setTab] = useState('overview');
  const s = data.summary;
  const months = useMemo(() => (data.monthly_trends ?? []).map(m => ({ name: monthLabel(m.month), value: m.count })), [data.monthly_trends]);
  const types = useMemo(() => named(data.breakdown_type_distribution, r => typeMeta(r.type).label, r => r.count), [data.breakdown_type_distribution]);
  const depts = data.department_comparison ?? [];
  const hours = useMemo(() => (data.hourly_distribution ?? []).map(h => ({ name: h.hour, value: h.count })), [data.hourly_distribution]);
  const days = useMemo(() => (data.daily_distribution ?? []).map((d, i) => ({ name: DAYS_LONG[i]?.slice(0, 3) ?? d.day, value: d.count })), [data.daily_distribution]);
  const priorities = useMemo(() => named(data.priority_distribution, r => priorityMeta(r.priority).label, r => r.count), [data.priority_distribution]);
  const statuses = useMemo(() => named(data.status_distribution, r => statusMeta(r.status).label, r => r.count), [data.status_distribution]);
  const places = useMemo(() => named((data.location_distribution ?? []).slice(0, 10), r => r.location || 'Not recorded', r => r.count), [data.location_distribution]);
  const peak = busiest(hours); const peakDay = busiest(days);
  const people = ranked(data.artisan_performance?.length ? data.artisan_performance : data.top_artisans);
  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList aria-label="Analytics views">
        <TabsTrigger value="overview" icon="gauge">Overview</TabsTrigger>
        <TabsTrigger value="when" icon="clock">When</TabsTrigger>
        <TabsTrigger value="machines" icon="breakdown">Machines</TabsTrigger>
        <TabsTrigger value="people" icon="artisans">People and parts</TabsTrigger>
        <TabsTrigger value="mix" icon="analytics">Mix</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="mt-4 flex flex-col gap-5">
        <MetricGrid columns={5}>
          <MetricTile label="Breakdowns" icon="breakdown" value={s.total_breakdowns} detail={`${s.unique_machines} ${s.unique_machines === 1 ? 'machine' : 'machines'}`} />
          <MetricTile label="Downtime" icon="clock" value={duration(s.total_downtime_minutes)} />
          <MetricTile label="Repair time" icon="wrench" value={duration(s.total_repair_time_minutes)} />
          <MetricTile label="Artisans" icon="artisans" value={s.unique_artisans} />
          <MetricTile label="Spares cost" icon="cost" value={money(s.total_spare_cost)} detail={`${s.unique_spares} ${s.unique_spares === 1 ? 'part' : 'parts'}`} />
        </MetricGrid>
        <ChartPanel title="By month" description="Breakdowns logged" summary={`Breakdowns by month: ${line(months)}.`}>
          {months.length ? <Bars data={months} x="name" /> : <p className="py-4 font-sans text-body-sm text-ink-muted">No dated breakdowns.</p>}
        </ChartPanel>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ChartPanel title="By kind of fault" description="Number of breakdowns" summary={`Breakdowns by kind: ${line(types)}.`}><Distribution rows={types} /></ChartPanel>
          <ChartPanel title="By department" description="Breakdowns, and the downtime they caused" summary={`Departments: ${depts.map(d => `${d.department} ${d.count} breakdowns, ${duration(d.downtime)} downtime`).join('; ') || 'none'}.`}>
            {depts.length ? (
              <ResponsiveContainer width="100%" height={240}>
                <ComposedChart data={depts} margin={{ left: 0, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} vertical={false} />
                  <XAxis dataKey="department" tick={chartTheme.axisTick} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="l" tick={chartTheme.axisTick} axisLine={false} tickLine={false} width={36} allowDecimals={false} />
                  <YAxis yAxisId="r" orientation="right" tick={chartTheme.axisTick} axisLine={false} tickLine={false} width={44} />
                  <Tooltip {...chartTheme.tooltip} />
                  <Bar yAxisId="l" dataKey="count" name="Breakdowns" fill={chartColor(1)} radius={[4, 4, 0, 0]} maxBarSize={36} />
                  <Line yAxisId="r" dataKey="downtime" name="Downtime (min)" stroke={chartColor(3)} strokeWidth={2} dot={{ r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
            ) : <p className="py-4 font-sans text-body-sm text-ink-muted">No departments.</p>}
          </ChartPanel>
        </div>
      </TabsContent>

      <TabsContent value="when" className="mt-4 flex flex-col gap-5">
        <HourDayHeatmap grid={data.heatmap?.hour_day ?? []} title="When breakdowns start" description="Hour the breakdown started, by weekday. Breakdowns with no start time are counted at 00." />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ChartPanel title="By hour" description={peak ? `Busiest at ${peak.name}` : undefined} summary={`Breakdowns by hour: ${line(hours.filter(h => h.value > 0))}.`}><Bars data={hours} x="name" /></ChartPanel>
          <ChartPanel title="By weekday" description={peakDay ? `Busiest on ${peakDay.name}` : undefined} summary={`Breakdowns by weekday: ${line(days)}.`}><Bars data={days} x="name" /></ChartPanel>
        </div>
      </TabsContent>

      <TabsContent value="machines" className="mt-4">
        <RankTable title="Machines that break most" description="Top ten by number of breakdowns." caption="Machines ranked by breakdowns" rows={ranked(data.top_problem_machines)} columns={MACHINES} empty="No machines in this selection." />
      </TabsContent>

      <TabsContent value="people" className="mt-4 flex flex-col gap-5">
        <RankTable title="Artisans" description="Top ten by number of jobs." caption="Artisans ranked by jobs" rows={people} columns={PEOPLE} empty="No artisans in this selection." />
        <RankTable title="Spare parts used" description="Top ten by quantity." caption="Spare parts ranked by quantity" rows={ranked(data.top_spare_parts)} columns={PARTS} empty="No parts recorded against these breakdowns." />
      </TabsContent>

      <TabsContent value="mix" className="mt-4">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ChartPanel title="By priority" summary={`Breakdowns by priority: ${line(priorities)}.`}><Distribution rows={priorities} /></ChartPanel>
          <ChartPanel title="By status" summary={`Breakdowns by status: ${line(statuses)}.`}><Distribution rows={statuses} /></ChartPanel>
          <ChartPanel title="By place" description="Top ten locations" className="lg:col-span-2" summary={`Breakdowns by location: ${line(places)}.`}><Distribution rows={places} /></ChartPanel>
        </div>
      </TabsContent>
    </Tabs>
  );
}
