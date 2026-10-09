// app/overtime/insights/AnalyticsTab.tsx — the filtered overtime counted by type, status, section, person and weekday. Every chart
// is in a panel with a written summary, and the lists print their numbers, so no value is carried by colour or a hover alone.
'use client';

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChartPanel, Distribution, chartColor, chartTheme } from '@/components/ui-system';
import { STATUS_LABELS, TYPE_LABELS } from '../overtimeMeta';
import type { tally } from '../overtimeLogic';
import { TopPeople } from './TopPeople';

type Tally = ReturnType<typeof tally>;

export function AnalyticsTab({ t, picked, onToggle }: { t: Tally; picked: string[]; onToggle: (id: string, name: string) => void }) {
  const line = (rows: { name: string; value: number }[], unit: string) => rows.map(r => `${r.name} ${r.value}${unit}`).join('; ') || 'none';
  const types = t.byType.map(x => ({ name: TYPE_LABELS[x.type] ?? x.type, value: x.count }));
  const statuses = t.byStatus.map(x => ({ name: STATUS_LABELS[x.status] ?? x.status, value: x.count }));
  const sections = t.bySection.map(x => ({ name: x.section, value: x.hours }));
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartPanel title="By overtime type" description="Number of requests" summary={`Requests by type: ${line(types, '')}.`}><Distribution rows={types} /></ChartPanel>
        <ChartPanel title="By status" description="Number of requests" summary={`Requests by status: ${line(statuses, '')}.`}><Distribution rows={statuses} /></ChartPanel>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartPanel title="By section" description="Hours, from the employee's section on the roster" summary={`Hours by section: ${line(sections, ' hours')}.`}><Distribution rows={sections} /></ChartPanel>
        <section aria-labelledby="art" className="flex flex-col gap-3 rounded-card border border-line bg-surface p-5 shadow-card">
          <div><h2 id="art" className="font-display text-title font-semibold text-ink">Top artisans</h2><p className="font-sans text-body-sm text-ink-muted">Choose a name to show only their overtime.</p></div>
          <TopPeople people={t.byArtisan} active={picked} onToggle={onToggle} />
        </section>
      </div>
      <ChartPanel title="By weekday" description="Overtime hours" summary={`Hours by weekday: ${t.byWeekday.map(d => `${d.day} ${d.hours}`).join('; ')}.`}>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart accessibilityLayer={false} data={t.byWeekday} margin={{ left: 0, right: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} vertical={false} />
            <XAxis dataKey="day" tick={chartTheme.axisTick} axisLine={false} tickLine={false} />
            <YAxis tick={chartTheme.axisTick} axisLine={false} tickLine={false} width={36} />
            <Tooltip {...chartTheme.tooltip} formatter={(v: unknown) => [`${v}h`, 'Hours']} />
            <Bar dataKey="hours" fill={chartColor(1)} radius={[4, 4, 0, 0]} maxBarSize={36} />
          </BarChart>
        </ResponsiveContainer>
      </ChartPanel>
    </div>
  );
}
