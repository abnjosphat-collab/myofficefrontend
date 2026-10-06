// FILE: app/engineering-dashboard/page.tsx
'use client';

import Link from 'next/link';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AppShell } from '@/components/app-shell';
import {
  Button, ChartPanel, DataRegion, DataTable, EmptyState, IconButton, MetricGrid, MetricTile, PageHeader, StatusBadge, chartColor, chartTheme,
  deriveDataStatus, isTransientStatus, type Column, type Tone,
} from '@/components/ui-system';
import { useEngineeringDashboardData, type OpenJobCard } from './useEngineeringDashboardData';

const PRIORITY: Record<string, { tone: Tone; label: string }> = {
  critical: { tone: 'danger', label: 'Critical' }, high: { tone: 'warning', label: 'High' }, medium: { tone: 'info', label: 'Medium' }, low: { tone: 'neutral', label: 'Low' },
};

const COLUMNS: Column<OpenJobCard>[] = [
  { id: 'id', header: 'Job card', sticky: true, cell: j => <span className="font-mono text-caption">{j.id}</span> },
  { id: 'title', header: 'Title', cell: j => j.title },
  { id: 'priority', header: 'Priority', cell: j => { const p = PRIORITY[j.priority] ?? { tone: 'neutral' as Tone, label: j.priority }; return <StatusBadge tone={p.tone}>{p.label}</StatusBadge>; } },
  { id: 'assigned', header: 'Assigned to', hideBelow: 'md', cell: j => j.assigned },
  { id: 'age', header: 'Scheduled', numeric: true, cell: j => (j.daysSinceScheduled === null ? <span className="text-ink-muted">Not scheduled</span> : j.daysSinceScheduled > 0 ? <span className="font-medium text-warning">{j.daysSinceScheduled} {j.daysSinceScheduled === 1 ? 'day' : 'days'} ago</span> : <span className="text-ink-muted">Upcoming</span>) },
];

function EngineeringDashboardContent() {
  const { jobCards, breakdowns, monthly, month, topFailures } = useEngineeringDashboardData();
  const jcStatus = deriveDataStatus({ loaded: jobCards.loaded, loading: jobCards.loading, error: jobCards.error, errorStatus: jobCards.errorStatus, count: jobCards.items.length, transient: isTransientStatus(jobCards.errorStatus) });
  const bdStatus = deriveDataStatus({ loaded: breakdowns.loaded, loading: breakdowns.loading, error: breakdowns.error, errorStatus: breakdowns.errorStatus, count: breakdowns.items.length, transient: isTransientStatus(breakdowns.errorStatus) });
  const jcPending = jobCards.loading && !jobCards.loaded;
  const bdPending = breakdowns.loading && !breakdowns.loaded;
  const overdue = jobCards.items.filter(j => j.overdue).length;
  const refreshAll = () => { jobCards.refetch(); breakdowns.refetch(); };
  const monthName = new Date().toLocaleString('en-ZA', { month: 'long', year: 'numeric' });
  const monthlySummary = `Breakdowns per month over the last six months: ${monthly.map(m => `${m.month} ${m.failures}`).join(', ')}.`;
  const topSummary = topFailures.length ? `Equipment with the most breakdowns in the last six months: ${topFailures.map(f => `${f.equipment} ${f.failures}`).join(', ')}.` : 'No breakdowns in the last six months.';
  const maxFailures = Math.max(1, ...topFailures.map(f => f.failures));

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        breadcrumbs={[{ label: 'Engineering' }, { label: 'Dashboard' }]}
        title="Engineering dashboard"
        description="Open job cards and breakdown activity, taken from the records in MyOffice."
        meta={monthName}
        actions={<IconButton icon="refresh" label="Refresh dashboard" variant="ghost" pending={(jobCards.loading && jobCards.loaded) || (breakdowns.loading && breakdowns.loaded)} onClick={refreshAll} />}
      />

      <MetricGrid compact>
        <MetricTile compact label="Open job cards" value={jobCards.items.length} loading={jcPending} unavailable={!jobCards.loaded && !jcPending} />
        <MetricTile compact label="Overdue job cards" tone="warning" value={overdue} detail="Scheduled date has passed" loading={jcPending} unavailable={!jobCards.loaded && !jcPending} />
        <MetricTile compact label="Breakdowns this month" tone={month.failures > 0 ? 'danger' : 'default'} value={month.failures} loading={bdPending} unavailable={!breakdowns.loaded && !bdPending} />
        <MetricTile compact label="Mean time to repair" value={month.mttr === null ? 'No data' : `${month.mttr} h`} detail="Breakdowns this month" loading={bdPending} unavailable={!breakdowns.loaded && !bdPending} />
      </MetricGrid>

      <DataRegion status={bdStatus} subject="breakdown activity" error={breakdowns.error} onRetry={() => breakdowns.refetch()} empty={<EmptyState icon="analytics" title="No breakdowns recorded yet" description="Breakdown charts appear as soon as breakdowns are logged." />}>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ChartPanel title="Breakdowns per month" description="Last six months" summary={monthlySummary}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthly} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} vertical={false} />
                <XAxis dataKey="month" tick={chartTheme.axisTick} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={chartTheme.axisTick} axisLine={false} tickLine={false} />
                <Tooltip {...chartTheme.tooltip} />
                <Bar dataKey="failures" name="Breakdowns" fill={chartColor(1)} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartPanel>
          <ChartPanel title="Repeat failures" description="Equipment with the most breakdowns, last six months" summary={topSummary}>
            {topFailures.length === 0 ? (
              <p className="py-8 text-center font-sans text-body-sm text-ink-muted">No breakdowns in the last six months.</p>
            ) : (
              <ol className="flex flex-col gap-3">
                {topFailures.map((failure, index) => (
                  <li key={failure.equipment} className="flex items-center gap-3">
                    <span className="w-4 shrink-0 font-sans text-caption text-ink-muted tabular">{index + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-sans text-label font-medium text-ink">{failure.equipment}</p>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-muted"><div className="h-full rounded-full bg-danger" style={{ width: `${(failure.failures / maxFailures) * 100}%` }} /></div>
                    </div>
                    <div className="shrink-0 text-right font-sans tabular">
                      <p className="text-label font-semibold text-ink">{failure.failures}×</p>
                      <p className="text-caption text-ink-muted">{failure.downtimeHours} h</p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </ChartPanel>
        </div>
      </DataRegion>

      <section aria-labelledby="open-job-cards" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="open-job-cards" className="font-display text-section font-semibold text-ink">Open job cards</h2>
          <Button asChild variant="ghost" iconAfter="chevron-right"><Link href="/job-cards">View all job cards</Link></Button>
        </div>
        <DataRegion status={jcStatus} subject="open job cards" error={jobCards.error} onRetry={() => jobCards.refetch()} empty={<EmptyState icon="task" title="No open job cards" description="Every job card is closed." />}>
          <DataTable caption="Open job cards" rows={jobCards.items.slice(0, 10)} columns={COLUMNS} getRowId={j => j.id} />
          {jobCards.items.length > 10 && <p className="font-sans text-caption text-ink-muted">Showing 10 of {jobCards.items.length}. Open the job cards register to see them all.</p>}
        </DataRegion>
      </section>
    </div>
  );
}

export default function EngineeringDashboard() {
  return <AppShell migrated><EngineeringDashboardContent /></AppShell>;
}
