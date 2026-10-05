// FILE: app/reliability/page.tsx
'use client';

import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AppShell } from '@/components/app-shell';
import {
  ChartPanel, DataRegion, DataTable, EmptyState, IconButton, MetricGrid, MetricTile, PageHeader, StatusBadge, chartColor, chartTheme,
  deriveDataStatus, isTransientStatus, sortRows, type Column, type SortState, type Tone,
} from '@/components/ui-system';
import { useReliabilityData } from './useReliabilityData';
import { fleetFigures, type EquipReliability } from '@/lib/reliability';

const rpnLevel = (n: number): { tone: Tone; label: string; icon: 'critical' | 'warning' | 'valid' } =>
  n > 100 ? { tone: 'danger', label: 'High', icon: 'critical' } : n >= 50 ? { tone: 'warning', label: 'Medium', icon: 'warning' } : { tone: 'success', label: 'Low', icon: 'valid' };
const availabilityTone = (n: number): Tone => (n >= 95 ? 'success' : n >= 90 ? 'warning' : 'danger');

const COLUMNS: Column<EquipReliability>[] = [
  { id: 'equipment', header: 'Equipment', sortable: true, sticky: true, cell: e => e.equipment },
  { id: 'section', header: 'Section', sortable: true, hideBelow: 'md', cell: e => e.section },
  { id: 'mtbf', header: 'MTBF (days)', numeric: true, sortable: true, cell: e => e.mtbf },
  { id: 'mttr', header: 'MTTR (hours)', numeric: true, sortable: true, cell: e => e.mttr },
  { id: 'failures', header: 'Failures', numeric: true, sortable: true, hideBelow: 'md', cell: e => e.failures },
  { id: 'availability', header: 'Availability', numeric: true, sortable: true, cell: e => <span className="inline-flex items-center justify-end gap-2"><StatusBadge tone={availabilityTone(e.availability)}>{e.availability}%</StatusBadge></span> },
  { id: 'rpn', header: 'RPN', numeric: true, sortable: true, cell: e => <span className="inline-flex items-center justify-end gap-2"><span className="font-semibold">{e.rpn}</span><StatusBadge tone={rpnLevel(e.rpn).tone} icon={rpnLevel(e.rpn).icon}>{rpnLevel(e.rpn).label}</StatusBadge></span> },
];

function ReliabilityContent() {
  const { table, sections, monthly, recordCount, loading, loaded, error, errorStatus, refresh } = useReliabilityData();
  const [sort, setSort] = useState<SortState>({ id: 'rpn', direction: 'desc' });

  const rows = sortRows(table, sort, (e, id) => e[id as keyof EquipReliability]);
  const fleet = fleetFigures(table);
  const status = deriveDataStatus({ loaded, loading, error, errorStatus, count: table.length, transient: isTransientStatus(errorStatus) });
  const ready = status === 'ready' || status === 'refreshing' || status === 'stale-error';
  const pending = loading && !loaded;
  const unavailable = !ready && !pending;

  const monthlySummary = `Breakdowns per month over the last six months: ${monthly.map(m => `${m.month} ${m.failures}`).join(', ')}.`;
  const sectionSummary = sections.length ? `Mean time to repair by section, in hours: ${sections.map(s => `${s.section} ${s.mttr}`).join(', ')}.` : 'No section data.';

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        breadcrumbs={[{ label: 'Safety and compliance' }, { label: 'Reliability' }]}
        title="MTBF and MTTR analytics"
        description="Fleet reliability and availability, calculated from the breakdowns recorded in MyOffice."
        meta={loaded ? `Based on ${recordCount} recorded ${recordCount === 1 ? 'breakdown' : 'breakdowns'}.` : undefined}
        actions={<IconButton icon="refresh" label="Refresh analytics" variant="ghost" pending={loading && loaded} onClick={refresh} />}
      />

      <DataRegion
        status={status}
        subject="reliability data"
        error={error}
        onRetry={refresh}
        empty={<EmptyState icon="analytics" title="No breakdowns recorded yet" description="Reliability figures are calculated from breakdown records. They appear here as soon as breakdowns are logged." />}
      >
        <div className="flex flex-col gap-6">
          <MetricGrid compact>
            <MetricTile compact label="Fleet MTBF" value={`${fleet.mtbf} days`} detail="Mean time between failures" loading={pending} unavailable={unavailable} />
            <MetricTile compact label="Fleet MTTR" value={`${fleet.mttr} h`} detail="Mean time to repair" loading={pending} unavailable={unavailable} />
            <MetricTile compact label="Availability" tone="success" value={`${fleet.availability}%`} loading={pending} unavailable={unavailable} />
            <MetricTile compact label="High RPN items" tone="danger" value={fleet.highRpn} detail="Risk priority number above 100" loading={pending} unavailable={unavailable} />
          </MetricGrid>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ChartPanel title="Breakdowns per month" description="Last six months" summary={monthlySummary}>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={monthly} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} vertical={false} />
                  <XAxis dataKey="month" tick={chartTheme.axisTick} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={chartTheme.axisTick} axisLine={false} tickLine={false} />
                  <Tooltip {...chartTheme.tooltip} />
                  <Bar dataKey="failures" name="Breakdowns" fill={chartColor(1)} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartPanel>
            <ChartPanel title="MTTR by section" description="Mean hours to repair" summary={sectionSummary}>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={sections} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} vertical={false} />
                  <XAxis dataKey="section" tick={chartTheme.axisTick} axisLine={false} tickLine={false} />
                  <YAxis tick={chartTheme.axisTick} axisLine={false} tickLine={false} />
                  <Tooltip {...chartTheme.tooltip} />
                  <Bar dataKey="mttr" name="MTTR (hours)" fill={chartColor(2)} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartPanel>
          </div>

          <section aria-labelledby="equipment-metrics">
            <h2 id="equipment-metrics" className="mb-3 font-display text-section font-semibold text-ink">Equipment reliability metrics</h2>
            <DataTable caption="Equipment reliability metrics" rows={rows} columns={COLUMNS} getRowId={e => e.equipment} sort={sort} onSortChange={setSort} />
          </section>
        </div>
      </DataRegion>
    </div>
  );
}

export default function ReliabilityPage() {
  return (
    <AppShell migrated>
      <ReliabilityContent />
    </AppShell>
  );
}
