// app/issues/AnalyticsPanel.tsx — cost statistics, cost over time, top recipients and items, and the period table for the
// issues that were loaded. Every chart has a text alternative that states its key values.
'use client';

import { useMemo, useState } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartPanel, DataTable, EmptyState, MetricGrid, MetricTile, Segmented, chartColor, chartTheme, type Column } from '@/components/ui-system';
import { formatCurrency, formatCurrencyShort } from '@/components/shared/utils';
import { buildTimeSeries, describeCosts, issueCost, topBy } from './analytics';
import type { Period, PeriodPoint, StockIssue } from './types';

const PERIODS = [{ value: 'day', label: 'Daily' }, { value: 'week', label: 'Weekly' }, { value: 'month', label: 'Monthly' }];
const SPAN = { day: 'Last 30 days', week: 'Last 13 weeks', month: 'Last 12 months' } as const;

export function AnalyticsPanel({ issues }: { issues: StockIssue[] }) {
  const [period, setPeriod] = useState<Period>('week');
  const series = useMemo(() => buildTimeSeries(issues, period), [issues, period]);
  const stats = useMemo(() => describeCosts(issues.map(issueCost), issues), [issues]);
  const recipients = useMemo(() => topBy(issues, 'recipient_name'), [issues]);
  const items = useMemo(() => topBy(issues, 'description').filter(i => i.cost > 0), [issues]);
  const peak = series.reduce((best, pt) => (pt.cost > best.cost ? pt : best), { cost: 0, label: '' } as { cost: number; label: string });
  const rows = useMemo(() => [...series].reverse().filter(pt => pt.count > 0 || pt.cost > 0).slice(0, 20), [series]);

  if (issues.length === 0) return <EmptyState icon="analytics" title="Nothing to analyse yet" description="Record an issue and its costs will appear here." />;

  const COLUMNS: Column<PeriodPoint>[] = [
    { id: 'label', header: 'Period', sticky: true, cell: r => r.label },
    { id: 'count', header: 'Issues', numeric: true, cell: r => r.count || '—' },
    { id: 'items', header: 'Items', numeric: true, hideBelow: 'md', cell: r => r.itemCount || '—' },
    { id: 'cost', header: 'Total cost', numeric: true, cell: r => (r.cost > 0 ? <span className="tabular">{formatCurrency(r.cost)}</span> : '—') },
    { id: 'avg', header: 'Avg per issue', numeric: true, hideBelow: 'md', cell: r => (r.count > 0 && r.cost > 0 ? <span className="tabular">{formatCurrency(r.cost / r.count)}</span> : '—') },
  ];
  const barAxis = (data: Array<{ name: string; cost: number }>, color: 1 | 2) => (
    <ResponsiveContainer width="100%" height={Math.max(180, data.length * 38 + 40)}>
      <BarChart accessibilityLayer={false} data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} horizontal={false} />
        <XAxis type="number" tick={chartTheme.axisTick} axisLine={false} tickLine={false} tickFormatter={formatCurrencyShort} />
        <YAxis type="category" dataKey="name" tick={chartTheme.axisTick} axisLine={false} tickLine={false} width={120} />
        <Tooltip {...chartTheme.tooltip} formatter={(v: unknown) => [formatCurrency(Number(v)), 'Total cost']} />
        <Bar dataKey="cost" fill={chartColor(color)} radius={[0, 4, 4, 0]} maxBarSize={22} />
      </BarChart>
    </ResponsiveContainer>
  );

  return (
    <div className="flex flex-col gap-5">
      <MetricGrid columns={3}>
        <MetricTile label="Total cost" icon="cost" value={formatCurrency(stats.total)} detail={`${stats.costed} of ${stats.count} issues have prices`} />
        <MetricTile label="Mean per issue" icon="analytics" value={formatCurrency(stats.mean)} detail={`Median ${formatCurrency(stats.median)}`} />
        <MetricTile label="Range" icon="gauge" value={`${formatCurrencyShort(stats.min)} to ${formatCurrencyShort(stats.max)}`} detail={`Std deviation ${formatCurrency(stats.stdDev)}`} />
      </MetricGrid>

      <ChartPanel
        title="Cost over time"
        description={`${SPAN[period]}${peak.cost > 0 ? `. Peak: ${peak.label} (${formatCurrency(peak.cost)})` : ''}`}
        summary={`Cost and number of issues per ${period}: ${series.filter(p => p.count > 0).map(p => `${p.label} ${formatCurrency(p.cost)}, ${p.count} issues`).join('; ') || 'none in this span'}.`}
        controls={<Segmented label="Group by" value={period} onValueChange={v => setPeriod(v as Period)} options={PERIODS} />}
      >
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart accessibilityLayer={false} data={series} margin={{ left: 8, right: 12 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} vertical={false} />
            <XAxis dataKey="label" tick={chartTheme.axisTick} axisLine={false} tickLine={false} interval="preserveStartEnd" />
            <YAxis yAxisId="cost" tick={chartTheme.axisTick} axisLine={false} tickLine={false} tickFormatter={formatCurrencyShort} width={56} />
            <YAxis yAxisId="count" orientation="right" allowDecimals={false} tick={chartTheme.axisTick} axisLine={false} tickLine={false} width={28} />
            <Tooltip {...chartTheme.tooltip} formatter={(v: unknown, name: unknown) => (name === 'cost' ? [formatCurrency(Number(v)), 'Cost'] : [v as number, 'Issues'])} />
            <Area yAxisId="cost" type="monotone" dataKey="cost" stroke={chartColor(1)} fill={chartColor(1)} fillOpacity={0.18} strokeWidth={2} dot={false} />
            <Area yAxisId="count" type="monotone" dataKey="count" stroke={chartColor(2)} fill="none" strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
        <p className="mt-2 font-sans text-caption text-ink-muted">Solid line: total cost. Dashed line: number of issues.</p>
      </ChartPanel>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartPanel title="Top recipients by cost" summary={`Top recipients by cost: ${recipients.map(r => `${r.name} ${formatCurrency(r.cost)}`).join('; ')}.`}>
          {barAxis(recipients, 1)}
        </ChartPanel>
        <ChartPanel title="Top items by cost" summary={items.length ? `Top items by cost: ${items.map(r => `${r.name} ${formatCurrency(r.cost)}`).join('; ')}.` : 'No costed items yet.'}>
          {items.length ? barAxis(items, 2) : <p className="py-6 font-sans text-body-sm text-ink-muted">No costed items yet. Add unit prices to spares to see this.</p>}
        </ChartPanel>
      </div>

      <section aria-labelledby="period-table" className="flex flex-col gap-2">
        <h2 id="period-table" className="font-display text-section font-semibold text-ink">{PERIODS.find(p => p.value === period)?.label} breakdown</h2>
        <DataTable caption={`Issues by ${period}`} rows={rows} columns={COLUMNS} getRowId={r => r.key} />
      </section>
    </div>
  );
}
