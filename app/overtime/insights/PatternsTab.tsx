// app/overtime/insights/PatternsTab.tsx — what the server's analysis found in the filtered records: the summary, the reasons that recur,
// the machines named, the weekly trend, the recurring-reason table and when overtime happens. These are tallies, not conclusions;
// the Causes tab holds the interpretation.
'use client';

import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartPanel, Distribution, MetricGrid, MetricTile, StatusBadge, chartColor, chartTheme } from '@/components/ui-system';
import type { OTAnalysisResult } from '../types';
import { CategoryTable } from './CategoryTable';
import { Heatmap } from './Heatmap';

const DIRECTION = { worsening: { label: 'Worsening', tone: 'warning' }, improving: { label: 'Improving', tone: 'success' }, stable: { label: 'Stable', tone: 'neutral' } } as const;

export function PatternsTab({ r }: { r: OTAnalysisResult }) {
  const dir = DIRECTION[r.trend_direction] ?? DIRECTION.stable;
  return (
    <div className="flex flex-col gap-5">
      <section aria-labelledby="sum" className="flex flex-col gap-3 rounded-card border border-line bg-surface p-5 shadow-card">
        <h2 id="sum" className="font-display text-title font-semibold text-ink">Summary</h2>
        <p className="font-sans text-body text-ink">{r.summary}</p>
        <MetricGrid columns={3}>
          <MetricTile label="At 2.0x" icon="percent" value={`${r.double_time_pct}%`} detail="Share of hours paid double" />
          <MetricTile label="Sections involved" icon="departments" value={r.sections_involved} />
          <MetricTile label="Average per employee" icon="gauge" value={`${r.avg_hours_per_employee}h`} />
        </MetricGrid>
      </section>

      {r.top_reasons.length > 0 && (
        <ChartPanel title="Most common reasons" description="Hours by reason" summary={`Hours by reason: ${r.top_reasons.map(x => `${x.phrase} ${x.hours} hours, ${x.count} times`).join('; ')}.`}>
          <ResponsiveContainer width="100%" height={Math.max(200, r.top_reasons.length * 36 + 40)}>
            <BarChart data={r.top_reasons} layout="vertical" margin={{ left: 8, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} horizontal={false} />
              <XAxis type="number" tick={chartTheme.axisTick} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="phrase" tick={chartTheme.axisTick} axisLine={false} tickLine={false} width={150} tickFormatter={(v: string) => (v.length > 22 ? `${v.slice(0, 21)}…` : v)} />
              <Tooltip {...chartTheme.tooltip} formatter={(v: unknown, _n: unknown, e: { payload?: { count?: number } }) => [`${v}h, ${e.payload?.count}×`, 'Hours']} />
              <Bar dataKey="hours" fill={chartColor(1)} radius={[0, 4, 4, 0]} maxBarSize={22} />
            </BarChart>
          </ResponsiveContainer>
        </ChartPanel>
      )}

      {r.top_machines.length > 0 && (
        <ChartPanel title="Machines named" description="Hours on machines mentioned in the reasons" summary={`Machines named: ${r.top_machines.map(m => `${m.name} ${m.hours} hours, ${m.count} times`).join('; ')}.`}>
          <Distribution rows={r.top_machines.map(m => ({ name: m.name, value: m.hours }))} />
        </ChartPanel>
      )}

      {r.weekly_series.length > 1 && (
        <ChartPanel title="Weekly trend" description={r.trends[0]?.insight} summary={`Weekly overtime hours, ${dir.label.toLowerCase()}: ${r.weekly_series.map(t => `${t.week} ${t.hours}`).join('; ')}.`}>
          <div className="mb-2"><StatusBadge tone={dir.tone}>{dir.label}</StatusBadge></div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={r.weekly_series} margin={{ left: 0, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} vertical={false} />
              <XAxis dataKey="week" tick={chartTheme.axisTick} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis tick={chartTheme.axisTick} axisLine={false} tickLine={false} width={36} />
              <Tooltip {...chartTheme.tooltip} formatter={(v: unknown) => [`${v}h`, 'Hours']} />
              <Area type="monotone" dataKey="hours" stroke={chartColor(1)} fill={chartColor(1)} fillOpacity={0.18} strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartPanel>
      )}

      <CategoryTable categories={r.category_detail} />
      <Heatmap grid={r.hour_weekday_hours} weekdayLabels={r.weekday_labels} entries={r.punch_records} />
    </div>
  );
}
