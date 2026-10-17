// app/tools/ToolsAnalytics.tsx — how the workspace is used: totals, the usage trend (daily, weekly, monthly), when people
// work (a weekly pattern), the most used features, captured errors and the latest feedback. Charts use the shared chart
// theme and each has a text summary.
'use client';

import { useMemo, useState } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, Chart, ChartPanel, EmptyState, Icon, MetricGrid, MetricTile, Segmented, chartColor, chartTheme } from '@/components/ui-system';
import { formatDateTime, formatDayMonth, formatMonth } from '@/lib/format';

export type UsageEvent = { id: string; name: string; detail?: string; at: string; by?: string };
export type ClientError = { id: string; message: string; at: string };
export type FeedbackRecord = { id: string; text?: string; audioName?: string; audioUrl?: string; at: string; by: string };
export type TrendRange = 'daily' | 'weekly' | 'monthly';
export type TrendPoint = { key: string; label: string; count: number };
export type TrendSummary = { direction: 'increasing' | 'decreasing' | 'stable'; deltaPercent: number | null; total: number; peak: TrendPoint };

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const TIME_BLOCKS = ['00-04', '04-08', '08-12', '12-16', '16-20', '20-24'];

function dayKey(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
function startOfWeek(date: Date) { const copy = new Date(date); copy.setHours(0, 0, 0, 0); copy.setDate(copy.getDate() - ((copy.getDay() + 6) % 7)); return copy; }
function readableAction(name: string) { return name.replace(/[_-]+/g, ' ').replace(/^./, letter => letter.toUpperCase()); }

export function buildUsageTrend(usage: UsageEvent[], range: TrendRange): TrendPoint[] {
  const now = new Date();
  if (range === 'daily') return Array.from({ length: 14 }, (_, offset) => { const date = new Date(now); date.setHours(0, 0, 0, 0); date.setDate(date.getDate() - (13 - offset)); const key = dayKey(date); return { key, label: formatDayMonth(date), count: usage.filter(event => dayKey(new Date(event.at)) === key).length }; });
  if (range === 'weekly') return Array.from({ length: 12 }, (_, offset) => { const date = startOfWeek(now); date.setDate(date.getDate() - 7 * (11 - offset)); const end = new Date(date); end.setDate(end.getDate() + 7); return { key: dayKey(date), label: formatDayMonth(date), count: usage.filter(event => { const value = new Date(event.at); return value >= date && value < end; }).length }; });
  return Array.from({ length: 12 }, (_, offset) => { const date = new Date(now.getFullYear(), now.getMonth() - (11 - offset), 1); const end = new Date(date.getFullYear(), date.getMonth() + 1, 1); return { key: `${date.getFullYear()}-${date.getMonth()}`, label: formatMonth(date), count: usage.filter(event => { const value = new Date(event.at); return value >= date && value < end; }).length }; });
}

export function summarizeUsageTrend(points: TrendPoint[]): TrendSummary {
  const midpoint = Math.ceil(points.length / 2);
  const earlier = points.slice(0, midpoint).reduce((total, point) => total + point.count, 0);
  const recent = points.slice(midpoint).reduce((total, point) => total + point.count, 0);
  const change = recent - earlier;
  const tolerance = Math.max(1, Math.round((earlier + recent) * 0.05));
  const direction = Math.abs(change) <= tolerance ? 'stable' : change > 0 ? 'increasing' : 'decreasing';
  const deltaPercent = earlier ? Math.round(change / earlier * 100) : recent ? null : 0;
  const peak = points.reduce((highest, point) => point.count > highest.count ? point : highest, points[0] || { key: 'none', label: 'No activity', count: 0 });
  return { direction, deltaPercent, total: earlier + recent, peak };
}

function UsageTrendChart({ points }: { points: TrendPoint[] }) {
  return (
    <Chart height={240}>
      <AreaChart data={points} margin={{ top: 12, right: 12, bottom: 2, left: -6 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} vertical={false} />
        <XAxis dataKey="label" tick={chartTheme.axisTick} axisLine={false} tickLine={false} minTickGap={24} />
        <YAxis tick={chartTheme.axisTick} axisLine={false} tickLine={false} allowDecimals={false} width={34} />
        <Tooltip {...chartTheme.tooltip} formatter={(value: unknown) => [`${value} action${value === 1 ? '' : 's'}`, 'Activity']} />
        <Area type="monotone" dataKey="count" stroke={chartColor(1)} strokeWidth={2} fill={chartColor(1)} fillOpacity={0.14} />
      </AreaChart>
    </Chart>
  );
}

function FeatureUseChart({ features }: { features: Array<[string, number]> }) {
  const data = features.slice(0, 8).map(([name, count]) => ({ name: readableAction(name), count }));
  return (
    <Chart height={Math.max(210, data.length * 38)}>
      <BarChart data={data} layout="vertical" margin={{ top: 8, right: 18, bottom: 2, left: 2 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} horizontal={false} />
        <XAxis type="number" allowDecimals={false} tick={chartTheme.axisTick} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="name" width={130} tick={chartTheme.axisTick} axisLine={false} tickLine={false} tickFormatter={(value: string) => value.length > 18 ? `${value.slice(0, 17)}…` : value} />
        <Tooltip {...chartTheme.tooltip} formatter={(value: unknown) => [`${value} use${value === 1 ? '' : 's'}`, 'Activity']} />
        <Bar dataKey="count" barSize={16} radius={[0, 6, 6, 0]}>{data.map((entry, index) => <Cell key={entry.name} fill={chartColor(((index % 8) + 1) as 1)} />)}</Bar>
      </BarChart>
    </Chart>
  );
}

export function ToolsAnalytics({ usage, errors, feedback }: { usage: UsageEvent[]; errors: ClientError[]; feedback: FeedbackRecord[] }) {
  const [trendRange, setTrendRange] = useState<TrendRange>('daily');
  const counts = useMemo(() => usage.reduce<Record<string, number>>((out, event) => ({ ...out, [event.name]: (out[event.name] || 0) + 1 }), {}), [usage]);
  const features = Object.entries(counts).filter(([name]) => name !== 'theme changed').sort((a, b) => b[1] - a[1]);
  const accounts = new Set(usage.map(event => event.by).filter(Boolean)).size;
  const trendPoints = useMemo(() => buildUsageTrend(usage, trendRange), [usage, trendRange]);
  const trendSummary = useMemo(() => summarizeUsageTrend(trendPoints), [trendPoints]);
  const heat = useMemo(() => Array.from({ length: 7 }, (_, day) => Array.from({ length: 6 }, (_, block) => usage.filter(event => { const date = new Date(event.at); return date.getDay() === day && Math.floor(date.getHours() / 4) === block; }).length)), [usage]);
  const heatMax = Math.max(1, ...heat.flat());
  const peak = heat.flatMap((row, day) => row.map((count, block) => ({ count, day, block }))).sort((a, b) => b.count - a.count)[0];
  const trendPeriod = trendRange === 'daily' ? 'Last 14 days' : trendRange === 'weekly' ? 'Last 12 weeks' : 'Last 12 months';
  const trendInsight = trendSummary.direction === 'stable' ? 'Activity is stable' : trendSummary.deltaPercent === null ? 'Activity started in the latest half' : `${Math.abs(trendSummary.deltaPercent)}% ${trendSummary.direction}`;
  const summary = `${trendPeriod}: ${trendInsight}. Peak ${trendSummary.peak.label}, ${trendSummary.peak.count} actions.`;

  return (
    <div className="flex flex-col gap-5">
      <MetricGrid compact>
        <MetricTile compact label="Recorded actions" value={usage.length} detail="across all accounts" />
        <MetricTile compact label="Active accounts" value={accounts} />
        <MetricTile compact label="Captured errors" value={errors.length} tone={errors.length ? 'danger' : 'default'} />
        <MetricTile compact label="Feedback received" value={feedback.length} />
      </MetricGrid>

      <ChartPanel title="Usage trend" description={`${trendPeriod} · ${trendInsight} · Peak ${trendSummary.peak.label}`} summary={summary}
        controls={<Segmented label="Usage trend period" value={trendRange} onValueChange={setTrendRange} options={(['daily', 'weekly', 'monthly'] as TrendRange[]).map(value => ({ value, label: value[0].toUpperCase() + value.slice(1) }))} />}>
        <UsageTrendChart points={trendPoints} />
      </ChartPanel>

      <div className="grid gap-5 lg:grid-cols-2">
        <ChartPanel title="Usage pattern" description={peak.count ? `Peak: ${DAYS[peak.day]} ${TIME_BLOCKS[peak.block]}` : 'Waiting for activity'}
          summary={peak.count ? `Most activity is on ${DAYS[peak.day]} between ${TIME_BLOCKS[peak.block]}.` : 'No activity recorded yet.'}>
          <div className="flex flex-col gap-1">
            <div className="grid grid-cols-[3rem_repeat(6,1fr)] gap-1 font-sans text-caption text-ink-muted"><span />{TIME_BLOCKS.map(block => <span key={block} className="text-center">{block}</span>)}</div>
            {heat.map((row, day) => (
              <div key={DAYS[day]} className="grid grid-cols-[3rem_repeat(6,1fr)] items-center gap-1">
                <strong className="font-sans text-caption font-medium text-ink-muted">{DAYS[day]}</strong>
                {row.map((count, block) => <span key={block} title={`${DAYS[day]} ${TIME_BLOCKS[block]} · ${count} actions`} className="h-6 rounded-[4px]" style={{ background: `color-mix(in srgb, var(--mo-action) ${Math.round((0.08 + count / heatMax * 0.92) * 100)}%, transparent)` }} />)}
              </div>
            ))}
          </div>
        </ChartPanel>

        <ChartPanel title="Feature use" description="Most frequent actions" summary={features.length ? `Most used: ${readableAction(features[0][0])}, ${features[0][1]} times.` : 'No usage recorded yet.'}>
          {features.length ? <FeatureUseChart features={features} /> : <p className="font-sans text-body-sm text-ink-muted">Usage will appear as people work in the module.</p>}
        </ChartPanel>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card padding="lg" className="flex flex-col gap-3">
          <div><h2 className="font-sans text-body font-semibold text-ink">Errors</h2><p className="font-sans text-caption text-ink-muted">Automatically captured</p></div>
          {errors.length
            ? <ul className="flex flex-col divide-y divide-[var(--mo-line-subtle)]">{errors.map(error => <li key={error.id} className="flex items-start gap-3 py-2"><Icon name="warning" size="sm" /><span><strong className="block font-sans text-body-sm font-medium text-ink">{error.message}</strong><small className="font-sans text-caption text-ink-muted">{formatDateTime(error.at)}</small></span></li>)}</ul>
            : <p className="flex items-center gap-2 font-sans text-body-sm text-ink-muted"><Icon name="success" size="sm" />No errors captured.</p>}
        </Card>
        <Card padding="lg" className="flex flex-col gap-3">
          <div><h2 className="font-sans text-body font-semibold text-ink">Latest feedback</h2><p className="font-sans text-caption text-ink-muted">Text and audio</p></div>
          {feedback.length
            ? <ul className="flex flex-col divide-y divide-[var(--mo-line-subtle)]">{feedback.map(item => <li key={item.id} className="flex items-start gap-3 py-2"><Icon name={item.audioName ? 'attachment' : 'edit'} size="sm" /><span><strong className="block font-sans text-body-sm font-medium text-ink">{item.text || item.audioName}</strong><small className="font-sans text-caption text-ink-muted">{item.by} · {formatDateTime(item.at)}</small></span></li>)}</ul>
            : <EmptyState icon="edit" title="No suggestions yet" description="No suggestions have been sent yet." />}
        </Card>
      </div>
    </div>
  );
}
