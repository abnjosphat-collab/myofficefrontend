// FILE: app/engineering_report/page.tsx
'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AppShell } from '@/components/app-shell';
import {
  Button, Card, ChartPanel, DataRegion, EmptyState, IconButton, MetricGrid, MetricTile, PageHeader, Progress, Select, chartColor, chartTheme, deriveDataStatus,
  isTransientStatus, type DataStatus,
} from '@/components/ui-system';
import type { ApiListState } from '@/lib/useApiList';
import { REPORT_TARGETS, maintenanceFigures, periodLabel, periodKey, periodOptions, productionFigures, statusCounts, type AnyRecord } from '@/lib/engineeringReport';
import { useEngineeringReportData } from './useEngineeringReportData';
import { formatLongDate } from '@/lib/format';

type Source = ApiListState<AnyRecord>;
const regionStatus = (s: Source): DataStatus => deriveDataStatus({ loaded: s.loaded, loading: s.loading, error: s.error, errorStatus: s.errorStatus, count: 1, transient: isTransientStatus(s.errorStatus) });
const unavailable = (s: Source) => !s.loaded && !s.loading;
const pending = (s: Source) => s.loading && !s.loaded;
type Tone = 'default' | 'success' | 'warning';
/** success when the value meets its target, warning when it does not; default when there is nothing to judge. */
const vsTarget = (value: number | null, target: number, goodHigh: boolean): Tone => (value === null ? 'default' : (goodHigh ? value >= target : value <= target) ? 'success' : 'warning');
/** Summary cell text: never a zero while a source is still loading or has failed. */
const cell = (source: Source, value: string | number) => (pending(source) ? 'Loading…' : unavailable(source) ? 'Unavailable' : value);
const fixed = (n: number | null, digits = 1) => (n === null ? 'No data' : n.toFixed(digits));

function Section({ title, source, subject, children }: { title: string; source: Source; subject: string; children: ReactNode }) {
  return (
    <section aria-labelledby={`sec-${title}`} className="flex flex-col gap-3">
      <h2 id={`sec-${title}`} className="font-display text-section font-semibold text-ink">{title}</h2>
      <DataRegion status={regionStatus(source)} subject={subject} error={source.error} onRetry={() => source.refetch()}>{children}</DataRegion>
    </section>
  );
}

function StatusBars({ title, subject, source, counts, icon }: { title: string; subject: string; source: Source; counts: ReturnType<typeof statusCounts>; icon: 'compliance' | 'service' }) {
  const rows = [{ label: 'Current', n: counts.current }, { label: 'Due soon', n: counts.dueSoon }, { label: 'Overdue', n: counts.overdue }];
  return (
    <Card padding="lg" className="flex flex-col gap-4">
      <h2 className="font-display text-title font-semibold text-ink">{title}</h2>
      <DataRegion status={regionStatus(source)} subject={subject} error={source.error} onRetry={() => source.refetch()} empty={undefined}>
        {counts.total === 0 ? <EmptyState icon={icon} title={`No ${subject} yet`} className="py-6" /> : (
          <ul className="flex flex-col gap-3">
            {rows.map(r => (
              <li key={r.label} className="flex items-center gap-3 font-sans text-body-sm">
                <span className="w-20 shrink-0 text-ink-muted">{r.label}</span>
                <Progress value={(r.n / counts.total) * 100} label={`${r.label}: ${r.n} of ${counts.total}`} className="flex-1" />
                <span className="w-8 shrink-0 text-right font-semibold text-ink tabular">{r.n}</span>
              </li>
            ))}
          </ul>
        )}
      </DataRegion>
    </Card>
  );
}

function EngineeringReportContent() {
  const { breakdowns, jobCards, production, compliance, lube, refreshing, refetchAll } = useEngineeringReportData();
  const now = useMemo(() => new Date(), []);
  const [period, setPeriod] = useState(() => periodKey(new Date()));
  const options = useMemo(() => periodOptions(now), [now]);

  const maint = useMemo(() => maintenanceFigures(breakdowns.items, jobCards.items, period, now), [breakdowns.items, jobCards.items, period, now]);
  const prod = useMemo(() => productionFigures(production.items, period), [production.items, period]);
  const comp = useMemo(() => statusCounts(compliance.items), [compliance.items]);
  const lub = useMemo(() => statusCounts(lube.items), [lube.items]);
  const totalStatus = Math.max(1, maint.statusDistribution.reduce((sum, s) => sum + s.count, 0));
  const label = periodLabel(period);
  const bdUnavailable = unavailable(breakdowns);
  const jcUnavailable = unavailable(jobCards);
  const trendSummary = `Breakdowns per month over the last six months: ${maint.trend.map(t => `${t.month} ${t.count}`).join(', ')}.`;
  const dailySummary = `Daily tonnes milled against the ${REPORT_TARGETS.tonnesPerDay} tonne target: ${prod.daily.map(d => `${d.date} ${d.tonnes}`).join(', ')}.`;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        breadcrumbs={[{ label: 'Engineering' }, { label: 'Monthly report' }]}
        title="Engineering report"
        description={`${label}. Calculated from the breakdown, job card, production, compliance and lubrication records in MyOffice.`}
        actions={(
          <>
            <Select className="w-40" aria-label="Report period" value={period} onValueChange={setPeriod} options={options} />
            <IconButton icon="refresh" label="Refresh report" variant="shell" pending={refreshing} onClick={() => refetchAll()} />
            <Button variant="primary" icon="print" onClick={() => window.print()}>Print or save as PDF</Button>
          </>
        )}
      />

      <Section title="Maintenance performance" source={breakdowns} subject="breakdown records">
        <div className="flex flex-col gap-3">
          <MetricGrid compact>
            <MetricTile compact label="Breakdowns" tone={vsTarget(maint.breakdowns, REPORT_TARGETS.breakdownsPerMonth, false)} value={maint.breakdowns} detail={`Target ${REPORT_TARGETS.breakdownsPerMonth} or fewer`} loading={pending(breakdowns)} unavailable={bdUnavailable} />
            <MetricTile compact label="Mean time to repair" tone={vsTarget(maint.mttrHours, REPORT_TARGETS.mttrHours, false)} value={maint.mttrHours === null ? 'No data' : `${fixed(maint.mttrHours)} h`} detail={`Target ${REPORT_TARGETS.mttrHours} h or less`} loading={pending(breakdowns)} unavailable={bdUnavailable} />
            <MetricTile compact label="Work orders completed" tone={vsTarget(maint.completionPct, REPORT_TARGETS.workOrderCompletionPct, true)} value={maint.completionPct === null ? 'No data' : `${maint.completionPct}%`} detail={`Of ${maint.workOrdersRaised} raised this month. Target ${REPORT_TARGETS.workOrderCompletionPct}%`} loading={pending(jobCards)} unavailable={jcUnavailable} />
            <MetricTile compact label="Open work orders" value={maint.openWorkOrders} detail="Open or in progress, all dates" loading={pending(jobCards)} unavailable={jcUnavailable} />
          </MetricGrid>
          <MetricGrid compact>
            <MetricTile compact label="Total downtime" value={`${maint.downtimeHours.toFixed(0)} h`} loading={pending(breakdowns)} unavailable={bdUnavailable} />
            <MetricTile compact label="Work orders closed" tone="success" value={maint.workOrdersCompleted} loading={pending(jobCards)} unavailable={jcUnavailable} />
            <MetricTile compact label="Compliance overdue" tone={comp.overdue === 0 ? 'success' : 'danger'} value={comp.overdue} loading={pending(compliance)} unavailable={unavailable(compliance)} />
          </MetricGrid>
        </div>
      </Section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartPanel title="Breakdown trend" description="Last six months" summary={trendSummary}>
          <DataRegion status={regionStatus(breakdowns)} subject="breakdown records" error={breakdowns.error} onRetry={() => breakdowns.refetch()}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={maint.trend} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} vertical={false} />
                <XAxis dataKey="month" tick={chartTheme.axisTick} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={chartTheme.axisTick} axisLine={false} tickLine={false} />
                <Tooltip {...chartTheme.tooltip} />
                <Bar dataKey="count" name="Breakdowns" fill={chartColor(1)} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </DataRegion>
        </ChartPanel>
        <Card padding="lg" className="flex flex-col gap-4">
          <h2 className="font-display text-title font-semibold text-ink">Work order status</h2>
          <DataRegion status={regionStatus(jobCards)} subject="job cards" error={jobCards.error} onRetry={() => jobCards.refetch()}>
            {maint.statusDistribution.length === 0 ? <EmptyState icon="task" title="No job cards yet" className="py-6" /> : (
              <ul className="flex flex-col gap-3">
                {maint.statusDistribution.map(({ status, count }) => (
                  <li key={status} className="flex items-center gap-3 font-sans text-body-sm">
                    <span className="w-24 shrink-0 capitalize text-ink-muted">{status.replace('_', ' ')}</span>
                    <Progress value={(count / totalStatus) * 100} label={`${status.replace('_', ' ')}: ${count} of ${totalStatus}`} className="flex-1" />
                    <span className="w-8 shrink-0 text-right font-semibold text-ink tabular">{count}</span>
                  </li>
                ))}
              </ul>
            )}
          </DataRegion>
        </Card>
      </div>

      <Section title="Production performance" source={production} subject="production records">
        <MetricGrid compact>
          <MetricTile compact label="Tonnes milled" tone={vsTarget(prod.records ? prod.tonnes : null, REPORT_TARGETS.tonnesPerDay * (prod.records || 1), true)} value={`${prod.tonnes.toLocaleString()} t`} detail={`Target ${REPORT_TARGETS.tonnesPerDay.toLocaleString()} t per record`} loading={pending(production)} unavailable={unavailable(production)} />
          <MetricTile compact label="Average recovery" tone={vsTarget(prod.recoveryPct, REPORT_TARGETS.recoveryPct, true)} value={prod.recoveryPct === null ? 'No data' : `${fixed(prod.recoveryPct)}%`} detail={`Target ${REPORT_TARGETS.recoveryPct}%`} loading={pending(production)} unavailable={unavailable(production)} />
          <MetricTile compact label="Gold produced" value={`${prod.goldOz.toFixed(1)} oz`} loading={pending(production)} unavailable={unavailable(production)} />
          <MetricTile compact label="Shift records" value={prod.records} loading={pending(production)} unavailable={unavailable(production)} />
        </MetricGrid>
      </Section>

      {prod.daily.length > 0 && (
        <ChartPanel title="Daily tonnes milled against target" summary={dailySummary}>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={prod.daily}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} vertical={false} />
              <XAxis dataKey="date" tick={chartTheme.axisTick} axisLine={false} tickLine={false} />
              <YAxis tick={chartTheme.axisTick} axisLine={false} tickLine={false} />
              <Tooltip {...chartTheme.tooltip} />
              <Legend wrapperStyle={chartTheme.legend} />
              <Line type="monotone" dataKey="target" name="Target" stroke="var(--mo-ink-subtle)" strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
              <Line type="monotone" dataKey="tonnes" name="Tonnes milled" stroke={chartColor(1)} strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartPanel>
      )}

      {maint.topFailures.length > 0 && (
        <Card padding="lg" className="flex flex-col gap-4">
          <h2 className="font-display text-title font-semibold text-ink">Repeat failures in {label}</h2>
          <ol className="flex flex-col gap-3">
            {maint.topFailures.map(({ equipment, count }, i) => (
              <li key={equipment} className="flex items-center gap-3">
                <span className="w-4 shrink-0 font-sans text-caption text-ink-muted tabular">{i + 1}</span>
                <div className="min-w-0 flex-1"><p className="truncate font-sans text-label font-medium text-ink">{equipment}</p><div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-muted"><div className="h-full rounded-full bg-danger" style={{ width: `${(count / maint.topFailures[0].count) * 100}%` }} /></div></div>
                <span className="shrink-0 font-sans text-label font-semibold text-ink tabular">{count}×</span>
              </li>
            ))}
          </ol>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <StatusBars title="Statutory compliance" subject="compliance items" source={compliance} counts={comp} icon="compliance" />
        <StatusBars title="Lubrication" subject="lubrication records" source={lube} counts={lub} icon="service" />
      </div>

      <Card padding="lg" className="flex flex-col gap-4">
        <h2 className="font-display text-title font-semibold text-ink">Report summary: {label}</h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {[
            { heading: 'Maintenance', rows: [['Total breakdowns', cell(breakdowns, maint.breakdowns)], ['Total downtime', cell(breakdowns, `${maint.downtimeHours.toFixed(1)} h`)], ['Mean time to repair', cell(breakdowns, maint.mttrHours === null ? 'No data' : `${fixed(maint.mttrHours)} h`)], ['Work orders closed', cell(jobCards, maint.workOrdersCompleted)], ['Work orders open', cell(jobCards, maint.openWorkOrders)]] },
            { heading: 'Production', rows: [['Tonnes milled', cell(production, `${prod.tonnes.toLocaleString()} t`)], ['Recovery rate', cell(production, prod.recoveryPct === null ? 'No data' : `${fixed(prod.recoveryPct)}%`)], ['Gold produced', cell(production, `${prod.goldOz.toFixed(1)} oz`)], ['Shift records', cell(production, prod.records)]] },
            { heading: 'Compliance and safety', rows: [['Compliance overdue', cell(compliance, comp.overdue)], ['Compliance due soon', cell(compliance, comp.dueSoon)], ['Lubrication overdue', cell(lube, lub.overdue)], ['Work orders completed', cell(jobCards, maint.completionPct === null ? 'No data' : `${maint.completionPct}%`)]] },
          ].map(group => (
            <div key={group.heading}>
              <h3 className="mb-2 font-sans text-label font-semibold text-ink-muted">{group.heading}</h3>
              <dl className="flex flex-col gap-1.5 font-sans text-body-sm">
                {group.rows.map(([k, v]) => <div key={k as string} className="flex justify-between gap-3"><dt className="text-ink-muted">{k}</dt><dd className="font-semibold text-ink tabular">{v}</dd></div>)}
              </dl>
            </div>
          ))}
        </div>
      </Card>

      <p className="pb-2 text-center font-sans text-caption text-ink-muted">Generated {formatLongDate(now)}. Targets used: breakdowns {REPORT_TARGETS.breakdownsPerMonth} or fewer, mean time to repair {REPORT_TARGETS.mttrHours} h or less, work order completion {REPORT_TARGETS.workOrderCompletionPct}%, recovery {REPORT_TARGETS.recoveryPct}%, {REPORT_TARGETS.tonnesPerDay} t per record.</p>
    </div>
  );
}

export default function EngineeringReportPage() {
  return <AppShell migrated><EngineeringReportContent /></AppShell>;
}
