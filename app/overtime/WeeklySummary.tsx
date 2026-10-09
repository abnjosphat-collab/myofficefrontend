// app/overtime/WeeklySummary.tsx — one week (or any range) of Engineering overtime: who worked how many hours each day, split into
// planned and unplanned and into 1.5x and 2.0x, with each person's main reason and every entry behind their total, and the same
// as an Excel download. Defaults to the last completed Monday-to-Sunday week.
'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button, EmptyState, Field, Input, MetricGrid, MetricTile, Notice, Progress, Select, cn } from '@/components/ui-system';
import { cleanReasonText, toISODate } from './calcOvertime';
import { downloadWeeklySummary } from './exportWeeklySummary';
import { lastCompletedWeek, recordHours, weeklyView, type WeeklySort } from './overtimeLogic';
import { formatDate, formatWeekday, formatMonth } from '@/lib/format';
import type { EmployeeLookup } from '@/hooks/useLookups';
import type { OTRecord } from './types';

const SORTS = [{ value: 'total', label: 'Most overtime first' }, { value: 'name', label: 'Name, A to Z' }, { value: 'mineNumber', label: 'Mine number' }];
const hrs = (n: number) => n.toFixed(1);

export function WeeklySummary({ records, employees }: { records: OTRecord[]; employees: EmployeeLookup[] }) {
  const week = useMemo(() => lastCompletedWeek(), []);
  const [from, setFrom] = useState(week.from);
  const [to, setTo] = useState(week.to);
  const [sort, setSort] = useState<WeeklySort>('total');
  const [downloading, setDownloading] = useState(false);
  const invalid = from > to;
  const view = useMemo(() => weeklyView(records, employees, from, to, sort), [records, employees, from, to, sort]);
  const today = toISODate(new Date());
  const maxPerson = Math.max(1, ...view.people.map(p => p.total));

  const download = async () => {
    setDownloading(true);
    try { await downloadWeeklySummary(view, from, to); toast.success('Weekly summary downloaded.'); }
    catch (e) { toast.error(`The download failed: ${(e as Error).message}`); }
    finally { setDownloading(false); }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end gap-3">
        <Field label="From" className="w-40"><Input type="date" value={from} onChange={e => setFrom(e.target.value)} /></Field>
        <Field label="To" className="w-40"><Input type="date" value={to} onChange={e => setTo(e.target.value)} /></Field>
        <Button onClick={() => { setFrom(week.from); setTo(week.to); }} title="The last completed Monday to Sunday">Last week</Button>
        <Select aria-label="Order" className="w-52" value={sort} onValueChange={v => setSort(v as WeeklySort)} options={SORTS} />
        {!invalid && view.rows.length > 0 && <Button variant="primary" icon="download" pending={downloading} className="ml-auto" onClick={download}>Download Excel</Button>}
      </div>

      {view.excluded > 0 && <Notice tone="info" title="Engineering cost centre only">This summary leaves out {view.excluded} {view.excluded === 1 ? 'record' : 'records'} charged to another department.</Notice>}

      {invalid ? (
        <EmptyState icon="calendar" title="Invalid range" description="The end date is before the start date." />
      ) : view.rows.length === 0 ? (
        <EmptyState icon="clock" title="No overtime in this range" description="Try a different date range." />
      ) : (
        <>
          <MetricGrid columns={5}>
            <MetricTile label="Total hours" icon="clock" value={`${hrs(view.totals.all)}h`} detail={`${view.days.length} days, ${view.people.length} people`} />
            <MetricTile label="Planned" icon="calendar" value={`${hrs(view.totals.planned)}h`} />
            <MetricTile label="Unplanned" icon="warning" tone={view.totals.unplanned > 0 ? 'warning' : 'default'} value={`${hrs(view.totals.unplanned)}h`} detail="Includes unclassified" />
            <MetricTile label="At 1.5x" icon="percent" value={`${hrs(view.totals.r15)}h`} />
            <MetricTile label="At 2.0x" icon="percent" value={`${hrs(view.totals.r20)}h`} detail="Weekends and holidays" />
          </MetricGrid>

          {view.people.length > 0 && (
            <section aria-labelledby="ot-main" className="rounded-card border border-line bg-surface shadow-card">
              <h2 id="ot-main" className="border-b border-line px-5 py-3 font-display text-title font-semibold text-ink">Main reason, by person</h2>
              <ul className="divide-y divide-line-subtle">
                {view.people.map(p => (
                  <li key={p.employee_id || p.employee_name} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 px-5 py-2.5 font-sans text-body-sm">
                    <span className="shrink-0 font-semibold text-ink">{p.employee_name}</span>
                    {p.mainCause
                      ? <><span className="min-w-0 flex-1 text-ink-muted [overflow-wrap:anywhere]">“{p.mainCause.label}”</span><span className="shrink-0 text-ink tabular">{p.mainCause.hours.toFixed(1)}h, {p.mainCause.count} {p.mainCause.count === 1 ? 'entry' : 'entries'}</span></>
                      : <span className="italic text-ink-muted">No reason given</span>}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {view.people.length > 0 && (
            <section aria-labelledby="ot-people" className="rounded-card border border-line bg-surface shadow-card">
              <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line px-5 py-3">
                <h2 id="ot-people" className="font-display text-title font-semibold text-ink">Overtime by person</h2>
                <p className="font-sans text-caption text-ink-muted">{view.people[0].employee_name} is {view.topShare}% of the total.</p>
              </div>
              <ul className="divide-y divide-line-subtle">
                {view.people.map(p => (
                  <li key={p.employee_id || p.employee_name} className="flex flex-col gap-2 px-5 py-3">
                    <div className="flex items-baseline justify-between gap-3"><span className="min-w-0 truncate font-sans text-label font-semibold text-ink">{p.employee_name}{p.position && <span className="font-normal text-ink-muted">, {p.position}</span>}</span><span className="shrink-0 font-sans text-body font-semibold text-ink tabular">{p.total.toFixed(1)}h</span></div>
                    <Progress value={(p.total / maxPerson) * 100} label={`${p.employee_name}: ${p.total.toFixed(1)} hours`} />
                    <ul className="flex flex-col gap-1 border-l-2 border-line pl-3">
                      {p.instances.length === 0
                        ? <li className="font-sans text-caption text-ink-muted">No individual entries for these hours.</li>
                        : p.instances.map(i => (
                          <li key={i.id} className="flex flex-wrap items-baseline gap-x-2 font-sans text-caption">
                            <span className="shrink-0 font-medium text-ink">{formatDate(i.date)}</span>
                            <span className="shrink-0 text-ink-muted tabular">{i.start_time && i.end_time ? `${i.start_time} to ${i.end_time}` : 'Hours only'}, {recordHours(i).toFixed(1)}h</span>
                            <span className="min-w-0 text-ink-muted [overflow-wrap:anywhere]">{i.reason ? `“${cleanReasonText(i.reason)}”` : 'No reason given'}</span>
                          </li>
                        ))}
                    </ul>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* A scrollable region must be keyboard-focusable so keyboard users can scroll it. */}
          {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
          <div className="max-w-full overflow-auto rounded-card border border-line bg-surface shadow-card" tabIndex={0} role="region" aria-label="Weekly overtime grid (scrollable)">
            <table className="w-full border-separate border-spacing-0 font-sans text-body-sm text-ink">
              <caption className="sr-only">Overtime hours per person per day, {formatDate(from)} to {formatDate(to)}</caption>
              <thead>
                <tr>
                  <th scope="col" className="sticky left-0 top-0 z-20 min-w-48 border-b border-r border-line bg-surface-subtle px-3 py-2 text-left font-semibold">Employee</th>
                  {view.days.map(d => {
                    const ds = toISODate(d); const weekend = d.getDay() === 0 || d.getDay() === 6;
                    return (
                      <th key={ds} scope="col" className={cn('min-w-14 border-b border-line px-1 py-1 text-center font-normal', ds === today ? 'bg-action-soft text-action' : weekend ? 'bg-surface-muted text-ink-muted' : 'bg-surface-subtle text-ink-muted')}>
                        <span className="block text-caption">{formatWeekday(d)}</span><span className="block font-semibold tabular text-ink">{d.getDate()}</span><span className="block text-caption">{formatMonth(d)}</span>
                      </th>
                    );
                  })}
                  <th scope="col" className="min-w-16 border-b border-line bg-surface-subtle px-2 py-2 text-center font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                {view.rows.map(r => (
                  <tr key={r.employee_id || r.employee_name}>
                    <th scope="row" className="sticky left-0 z-10 border-b border-r border-line bg-surface px-3 py-2 text-left font-normal"><span className="block truncate font-medium">{r.employee_name}</span><span className="block truncate text-caption text-ink-muted">{[r.employee_id, r.position].filter(Boolean).join(', ')}</span></th>
                    {view.days.map(d => {
                      const ds = toISODate(d); const h = r.byDate.get(ds) || 0; const weekend = d.getDay() === 0 || d.getDay() === 6;
                      return <td key={ds} className={cn('border-b border-line-subtle px-1 py-2 text-center tabular', weekend && 'bg-surface-muted', h > 0 ? 'font-semibold text-action' : 'text-ink-muted')}>{h > 0 ? h.toFixed(1) : '–'}</td>;
                    })}
                    <td className="border-b border-line-subtle px-2 py-2 text-center font-semibold tabular">{r.total.toFixed(1)}</td>
                  </tr>
                ))}
                <tr className="bg-surface-subtle">
                  <th scope="row" className="sticky left-0 z-10 border-r border-line bg-surface-subtle px-3 py-2 text-left font-semibold">Total</th>
                  {view.dayTotals.map((t, i) => <td key={i} className="px-1 py-2 text-center font-semibold tabular text-ink-muted">{t > 0 ? t.toFixed(1) : '–'}</td>)}
                  <td className="px-2 py-2 text-center font-semibold tabular text-action">{view.totals.all.toFixed(1)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
