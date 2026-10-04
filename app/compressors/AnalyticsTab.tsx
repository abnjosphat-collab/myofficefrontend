// app/compressors/AnalyticsTab.tsx — performance metrics, trend analysis, comparison and key insights.
'use client';

import { DataTable, EmptyState, Icon, Panel, Progress, Select, StatusBadge, type Column } from '@/components/ui-system';
import { efficiencyTone } from './calcCompressors';
import { RATING_TONE, TREND_META, hours } from './meta';
import { SectionView } from './SectionView';
import type { ComparisonResult, PerformanceMetric, TrendsResult } from './types';
import type { Section } from './useCompressorsData';

const PERIODS = [{ value: 'weekly', label: 'Last 7 days' }, { value: 'monthly', label: 'Last 30 days' }, { value: 'quarterly', label: 'Last 90 days' }];
const METRICS = [{ value: 'efficiency', label: 'Efficiency' }, { value: 'running_hours', label: 'Running hours' }, { value: 'loaded_hours', label: 'Loaded hours' }];

const COLUMNS: Column<PerformanceMetric>[] = [
  { id: 'compressor_name', header: 'Compressor', sticky: true, cell: m => m.compressor_name },
  { id: 'avg_efficiency', header: 'Avg efficiency', cell: m => <StatusBadge tone={efficiencyTone(m.avg_efficiency)}>{m.avg_efficiency}%</StatusBadge> },
  { id: 'avg_daily', header: 'Avg per day', hideBelow: 'md', cell: m => <span className="tabular">{hours(m.avg_daily_running_hours)} run / {hours(m.avg_daily_loaded_hours)} loaded</span> },
  { id: 'total', header: 'Total hours', hideBelow: 'lg', cell: m => <span className="tabular">{hours(m.total_running_hours)} run / {hours(m.total_loaded_hours)} loaded</span> },
  { id: 'downtime', header: 'Downtime', cell: m => <div className="w-32"><Progress value={m.downtime_percentage} label={`${m.compressor_name} downtime`} /></div> },
  { id: 'service_count', header: 'Services', hideBelow: 'md', cell: m => m.service_count },
];

export function AnalyticsTab({ metrics, trends, comparison, period, onPeriod, metric, onMetric, onRetry }: {
  metrics: Section<PerformanceMetric[]>;
  trends: Section<TrendsResult | null>;
  comparison: Section<ComparisonResult | null>;
  period: string; onPeriod: (v: string) => void;
  metric: string; onMetric: (v: string) => void;
  onRetry: () => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <div className="flex flex-col gap-4 lg:col-span-2">
        <Panel title="Performance metrics" actions={<Select className="w-40" aria-label="Period" value={period} onValueChange={onPeriod} options={PERIODS} />}>
          <SectionView section={metrics} subject="performance metrics" onRetry={onRetry}>
            {rows => rows.length === 0
              ? <EmptyState icon="analytics" title="No performance data yet" description="Readings in this period will appear here." />
              : <DataTable caption="Performance metrics" rows={rows} columns={COLUMNS} getRowId={m => String(m.compressor_id)} />}
          </SectionView>
        </Panel>

        <Panel title="Trend analysis">
          <SectionView section={trends} subject="trend analysis" onRetry={onRetry}>
            {t => !t || !t.success || t.data.length === 0
              ? <EmptyState icon="efficiency" title="No trend yet" description={t?.message || 'Add 7 days of readings to see trends.'} />
              : (
                <ul className="flex flex-col gap-3">
                  {t.data.slice(0, 5).map(item => {
                    const meta = TREND_META[item.efficiency_trend] ?? TREND_META.stable;
                    return (
                      <li key={item.compressor_name} className="flex flex-col gap-2 rounded-control bg-surface-subtle p-3">
                        <div className="flex items-center justify-between gap-2"><span className="font-sans text-label font-medium text-ink">{item.compressor_name}</span><StatusBadge tone={meta.tone}>{meta.label}</StatusBadge></div>
                        <dl className="grid grid-cols-3 gap-3">
                          <div><dt className="font-sans text-caption text-ink-muted">Efficiency</dt><dd className="font-sans text-body font-semibold text-ink tabular">{item.avg_efficiency}%</dd></div>
                          <div><dt className="font-sans text-caption text-ink-muted">Running</dt><dd className="font-sans text-body font-semibold text-ink tabular">{hours(item.total_running_hours)}</dd></div>
                          <div><dt className="font-sans text-caption text-ink-muted">Loaded</dt><dd className="font-sans text-body font-semibold text-ink tabular">{hours(item.total_loaded_hours)}</dd></div>
                        </dl>
                      </li>
                    );
                  })}
                </ul>
              )}
          </SectionView>
        </Panel>
      </div>

      <div className="flex flex-col gap-4">
        <Panel title="Comparison" actions={<Select className="w-40" aria-label="Metric" value={metric} onValueChange={onMetric} options={METRICS} />}>
          <SectionView section={comparison} subject="the comparison" onRetry={onRetry}>
            {c => !c || !c.success || c.data.length === 0
              ? <p className="font-sans text-body-sm text-ink-muted">{c?.message || 'No comparison data yet.'}</p>
              : (
                <ul className="flex flex-col gap-2">
                  {c.data.slice(0, 5).map(item => (
                    <li key={item.compressor_id} className="flex items-center justify-between gap-3 rounded-control bg-surface-subtle px-3 py-2">
                      <div className="min-w-0"><p className="font-sans text-label font-medium text-ink [overflow-wrap:anywhere]">{item.compressor_name}</p><p className="font-sans text-caption text-ink-muted">{item.location}</p></div>
                      <div className="flex shrink-0 flex-col items-end gap-1"><span className="font-sans text-body font-semibold text-ink tabular">{item.value}{metric === 'efficiency' ? '%' : ' h'}</span><StatusBadge tone={RATING_TONE[item.rating] ?? 'neutral'}>{item.rating}</StatusBadge></div>
                    </li>
                  ))}
                </ul>
              )}
          </SectionView>
        </Panel>

        {metrics.loaded && metrics.data.length > 0 && <Insights rows={metrics.data} />}
      </div>
    </div>
  );
}

function Insights({ rows }: { rows: PerformanceMetric[] }) {
  const best = [...rows].sort((a, b) => b.avg_efficiency - a.avg_efficiency)[0];
  const active = [...rows].sort((a, b) => b.total_running_hours - a.total_running_hours)[0];
  const attention = rows.filter(m => m.downtime_percentage > 20 || m.avg_efficiency < 40);
  const items = [
    { icon: 'efficiency' as const, title: 'Best performer', text: `${best.compressor_name} (${best.avg_efficiency}%)`, tone: 'text-success' },
    { icon: 'activity' as const, title: 'Most active', text: `${active.compressor_name} (${hours(active.total_running_hours)})`, tone: 'text-action' },
    ...(attention.length ? [{ icon: 'warning' as const, title: 'Needs attention', text: `${attention.length} ${attention.length === 1 ? 'compressor' : 'compressors'}: downtime over 20% or efficiency under 40%`, tone: 'text-warning' }] : []),
  ];
  return (
    <Panel title="Key insights">
      <ul className="flex flex-col gap-2">
        {items.map(i => (
          <li key={i.title} className="flex items-start gap-3 rounded-control bg-surface-subtle p-3">
            <span className={i.tone}><Icon name={i.icon} size="md" weight="emphasis" /></span>
            <div><p className="font-sans text-label font-semibold text-ink">{i.title}</p><p className="font-sans text-body-sm text-ink-muted">{i.text}</p></div>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
