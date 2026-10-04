// app/overtime/insights/OverviewTab.tsx — the headline numbers for the filtered overtime (from the records themselves, so they move the
// moment a filter does) and the weekly trend and top reason (from the server's analysis, which follows a moment later).
'use client';

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartPanel, MetricGrid, MetricTile, chartColor, chartTheme } from '@/components/ui-system';
import { formatCurrencyShort } from '@/components/shared/utils';
import type { tally } from '../overtimeLogic';
import type { OTAnalysisResult } from '../types';
import { TopPeople } from './TopPeople';

export function OverviewTab({ stats, people, count, result, analysing, picked, onToggle }: {
  stats: ReturnType<typeof tally>['stats']; people: ReturnType<typeof tally>['byArtisan']; count: number; result: OTAnalysisResult | null; analysing: boolean; picked: string[]; onToggle: (id: string, name: string) => void;
}) {
  const topReason = result?.top_reasons[0];
  const trend = result?.weekly_series ?? [];
  return (
    <div className="flex flex-col gap-5">
      <MetricGrid columns={4}>
        <MetricTile label="Total hours" icon="clock" value={`${stats.totalHours}h`} />
        <MetricTile label="Instances" icon="documents" value={count} />
        <MetricTile label="Employees" icon="employees" value={stats.employees} />
        <MetricTile label="Average per instance" icon="gauge" value={`${stats.avgHours}h`} />
        <MetricTile label="Busiest day" icon="calendar" value={stats.busiestDay || 'None'} />
        <MetricTile label="Top reason" icon="notice" value={analysing && !result ? undefined : topReason ? <span className="line-clamp-2 text-title" title={topReason.phrase}>“{topReason.phrase}”</span> : 'None'} loading={analysing && !result} />
        <MetricTile label="Machines involved" icon="wrench" value={result?.top_machines.length ?? undefined} loading={analysing && !result} />
        <MetricTile label="Spares cost" icon="cost" value={formatCurrencyShort(stats.spareCost)} />
      </MetricGrid>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartPanel title="Weekly trend" description="Overtime hours per week" summary={trend.length >= 2 ? `Weekly overtime hours: ${trend.map(t => `${t.week} ${t.hours}`).join('; ')}.` : 'Not enough weeks of data for a trend.'}>
          {trend.length < 2 ? <p className="py-12 text-center font-sans text-body-sm text-ink-muted">{analysing ? 'Loading the trend…' : 'Not enough data for a trend yet.'}</p> : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={trend} margin={{ left: 0, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} vertical={false} />
                <XAxis dataKey="week" tick={chartTheme.axisTick} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={chartTheme.axisTick} axisLine={false} tickLine={false} width={36} />
                <Tooltip {...chartTheme.tooltip} formatter={(v: unknown) => [`${v}h`, 'Hours']} />
                <Area type="monotone" dataKey="hours" stroke={chartColor(1)} fill={chartColor(1)} fillOpacity={0.18} strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </ChartPanel>
        <section aria-labelledby="top-people" className="flex flex-col gap-3 rounded-card border border-line bg-surface p-5 shadow-card">
          <div><h2 id="top-people" className="font-display text-title font-semibold text-ink">Top employees</h2><p className="font-sans text-body-sm text-ink-muted">Choose a name to show only their overtime.</p></div>
          <TopPeople people={people.slice(0, 6)} active={picked} onToggle={onToggle} />
        </section>
      </div>
    </div>
  );
}
