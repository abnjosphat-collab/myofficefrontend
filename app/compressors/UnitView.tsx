// app/compressors/UnitView.tsx — one compressor over time, by week or by month: the figures for the period, a
// bar for each day (running hours, with the loaded part inside), and a day-by-day table whose rows open that day for
// recording. A missing reading is a dot and "No reading", never a zero; a reading after a gap is shaded as the average
// of the days it covers and marked.
'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button, IconButton, MetricGrid, MetricTile, useIsReducedMotion } from '@/components/ui-system';
import { DownloadButton, type DLColumn } from '@/components/shared/DownloadButton';
import { exportFilename } from '@/lib/exportUtils';
import { formatDate, formatWeekday } from '@/lib/format';
import { STATUS_META } from './meta';
import type { Compressor, ReadingRow } from './types';
import { addDays, buildRange, daysInMonth, isoDay, weekStart } from './monthLogic';
import { statusAccent } from './floorLogic';
import s from '@/components/shared/floor/floor.module.css';

type Period = 'week' | 'month';
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const parse = (iso: string) => { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); };
const h1 = (n: number | null | undefined) => (n == null ? '' : n.toFixed(1));

function bounds(period: Period, anchor: string): { start: string; end: string; label: string } {
  if (period === 'week') {
    const start = weekStart(anchor); const end = addDays(start, 6);
    return { start, end, label: `${formatDate(parse(start))} – ${formatDate(parse(end))}` };
  }
  const [y, m] = anchor.split('-').map(Number);
  return { start: isoDay(y, m, 1), end: isoDay(y, m, daysInMonth(y, m)), label: `${MONTHS[m - 1]} ${y}` };
}

export function UnitView({ compressor, history, loading, today, onBack, onOpenDay }: {
  compressor: Compressor;
  history: ReadingRow[];
  loading: boolean;
  today: string;
  onBack: () => void;
  onOpenDay: (date: string) => void;
}) {
  const reduced = useIsReducedMotion();
  const [barsShown, setBarsShown] = useState(false);
  useEffect(() => { const f = requestAnimationFrame(() => setBarsShown(true)); return () => cancelAnimationFrame(f); }, []);
  const [period, setPeriod] = useState<Period>('week');
  const [anchor, setAnchor] = useState(today);
  const { start, end, label } = bounds(period, anchor);
  const range = useMemo(() => buildRange(history, start, end, today), [history, start, end, today]);
  const accent = statusAccent(compressor.status);
  const covered = range.days.reduce((t, d) => t + (d.state === 'reading' ? d.span : 0), 0);
  const perDay = covered ? range.running / covered : null;
  const shift = (by: number) => {
    if (period === 'week') { setAnchor(addDays(anchor, by * 7)); return; }
    const [y, m] = anchor.split('-').map(Number);
    const d = new Date(y, m - 1 + by, 1);
    setAnchor(isoDay(d.getFullYear(), d.getMonth() + 1, 1));
  };
  const current = bounds(period, today).start === start;
  const n = range.days.length;

  // The day-by-day table and the download share these rows (future days are left out).
  const table = range.days.map((d, i) => ({ d, row: range.rows[i] })).filter(x => x.d.state !== 'future');
  const columns: DLColumn[] = [
    { key: 'date', label: 'Date', width: 16 }, { key: 'running', label: 'Running h', width: 12 }, { key: 'loaded', label: 'Loaded h', width: 12 },
    { key: 'pct', label: 'Loaded %', width: 11 }, { key: 'pressure', label: 'Pressure', width: 10 }, { key: 'temperature', label: 'Temperature', width: 12 },
    { key: 'covers', label: 'Days covered', width: 13 }, { key: 'notes', label: 'Notes', width: 30 },
  ];
  const exportRows = table.map(({ d, row }) => ({
    date: `${formatWeekday(parse(d.date))} ${formatDate(parse(d.date))}`,
    running: d.state === 'reading' ? h1(d.running) : '', loaded: d.state === 'reading' ? h1(d.loaded) : '',
    pct: d.state === 'reading' && d.running ? `${Math.round(((d.loaded ?? 0) / d.running) * 100)}%` : '',
    pressure: row?.pressure ?? '', temperature: row?.temperature ?? '', covers: d.state === 'reading' && d.span > 1 ? d.span : '',
    notes: row?.notes ?? (d.state === 'missing' ? 'No reading' : ''),
  }));

  return (
    <section aria-label={`${compressor.name}, ${label}`} className="flex flex-col gap-5" style={{ ['--accent' as string]: accent }}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Button variant="ghost" icon="back" onClick={onBack}>All compressors</Button>
          <h2 className="truncate font-display text-readout font-normal text-ink">{compressor.name}</h2>
          <span className="flex items-center gap-1.5 font-sans text-caption text-ink-muted"><span className={s.lamp} />{STATUS_META[compressor.status]?.label ?? compressor.status}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex gap-1 rounded-lg bg-surface-muted p-1" role="group" aria-label="Period">
            {(['week', 'month'] as const).map(p => (
              <button key={p} type="button" aria-pressed={period === p} onClick={() => { setPeriod(p); setAnchor(today); }}
                className="rounded-control px-3 py-1 font-sans text-body-sm font-medium text-ink-muted transition-colors aria-pressed:bg-surface-raised aria-pressed:text-ink aria-pressed:shadow-[0_1px_2px_color-mix(in_srgb,var(--mo-ink)_12%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus">
                {p === 'week' ? 'Week' : 'Month'}
              </button>
            ))}
          </div>
          <IconButton icon="chevron-left" label={`Previous ${period}`} variant="outline" onClick={() => shift(-1)} />
          <span className="min-w-44 text-center font-sans text-body-sm text-ink">{label}</span>
          <IconButton icon="chevron-right" label={`Next ${period}`} variant="outline" onClick={() => shift(1)} />
          {!current && <Button onClick={() => setAnchor(today)}>{period === 'week' ? 'This week' : 'This month'}</Button>}
          <DownloadButton data={exportRows} columns={columns} filename={exportFilename(`${compressor.name.trim().replace(/\s+/g, '_')}_${start}`)} title={`${compressor.name.trim()}, ${label}`} subtitle="Hours since the previous reading" />
        </div>
      </div>

      <MetricGrid compact>
        <MetricTile compact label="Running" value={`${range.running.toFixed(1)} h`} loading={loading} />
        <MetricTile compact label="Loaded" value={range.loadedPct == null ? '—' : `${range.loadedPct}%`} loading={loading} />
        <MetricTile compact label="Per day" value={perDay == null ? '—' : `${perDay.toFixed(1)} h`} loading={loading} />
        <MetricTile compact label="Readings" tone={range.recorded < range.expected ? 'warning' : 'default'} value={`${range.recorded} / ${range.expected}`} loading={loading} />
      </MetricGrid>

      {/* The bars. Decoration for the figures in the table below, so hidden from assistive technology. */}
      <div className={`${s.slab} p-4`} data-still="" aria-hidden="true">
        <div className="relative pl-8">
          <span className="absolute left-0 top-0 font-sans text-tip text-ink-muted">24 h</span>
          <span className="absolute left-0 top-1/2 -translate-y-1/2 font-sans text-tip text-ink-muted">12 h</span>
          <span className="absolute bottom-0 left-0 font-sans text-tip text-ink-muted">0</span>
          <div className="relative grid h-40 items-end border-b border-line" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))`, columnGap: n > 14 ? 3 : 10 }}>
            <span className="pointer-events-none absolute inset-x-0 top-1/2 border-t border-dashed border-line-subtle" />
            {range.days.map((d, i) => {
              const run = d.state === 'reading' ? (d.running ?? 0) / d.span : 0;
              const height = Math.min(100, (run / 24) * 100);
              const share = d.state === 'reading' && d.running ? Math.min(1, (d.loaded ?? 0) / d.running) : 0;
              const when = `${formatWeekday(parse(d.date))} ${formatDate(parse(d.date))}`;
              const tip = d.state === 'reading' ? `${when}: ${h1(d.running)} h running, ${h1(d.loaded)} h loaded${d.span > 1 ? ` (covers ${d.span} days)` : ''}` : d.state === 'missing' ? `${when}: no reading` : when;
              return (
                <div key={d.date} title={tip} className="relative flex h-full items-end justify-center">
                  {d.state === 'reading' && (
                    <div className="relative w-full overflow-hidden rounded-t-xs" style={{ background: 'color-mix(in srgb, var(--mo-action) 30%, transparent)', height: `${Math.max(2, height)}%` }}>
                      <div className="absolute inset-0 origin-bottom" style={{ transform: reduced || barsShown ? 'scaleY(1)' : 'scaleY(0)', transition: reduced ? undefined : 'transform var(--mo-spring-smooth-duration) var(--mo-spring-smooth)', transitionDelay: reduced ? undefined : `${i * 0.015}s` }}>
                      <span className="absolute inset-x-0 bottom-0" style={{ height: `${share * 100}%`, background: 'var(--mo-action)' }} />
                      {d.span > 1 && <span className={`${s.spanMark} absolute right-0.5 top-0.5`} />}
                      </div>
                    </div>
                  )}
                  {d.state === 'missing' && <span className="mb-1 size-1.5 rounded-full bg-ink-subtle" />}
                  {d.date === today && <span className="absolute inset-x-0 -bottom-5 mx-auto h-0.5 w-3/4 rounded bg-ink" />}
                </div>
              );
            })}
          </div>
          <div className="mt-1.5 grid" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))`, columnGap: n > 14 ? 3 : 10 }}>
            {range.days.map(d => (
              <span key={d.date} className={`text-center font-sans text-tip leading-tight ${d.date === today ? 'font-semibold text-ink' : 'text-ink-muted'}`}>
                {period === 'week' ? <>{formatWeekday(parse(d.date)).slice(0, 3)}<br />{parse(d.date).getDate()}</> : parse(d.date).getDate()}
              </span>
            ))}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-4 pl-8 font-sans text-caption text-ink-muted">
          <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-xs bg-action" />Loaded</span>
          <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-xs" style={{ background: 'color-mix(in srgb, var(--mo-action) 30%, transparent)' }} />Running, not loaded</span>
          <span className="flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-ink-subtle" />No reading</span>
          <span className="flex items-center gap-1.5"><span className={s.spanMark} />Covers several days (shown as the daily average)</span>
        </div>
      </div>

      <div className={`${s.slab} overflow-x-auto`} data-still="">
        <table className="w-full border-separate border-spacing-0 font-sans text-body-sm">
          <caption className="sr-only">{compressor.name} by day, {label}</caption>
          <thead>
            <tr className="text-left text-caption text-ink-muted">
              <th scope="col" className="px-4 py-2 font-medium">Day</th>
              <th scope="col" className="px-3 py-2 text-right font-medium">Running</th>
              <th scope="col" className="px-3 py-2 text-right font-medium">Loaded</th>
              <th scope="col" className="px-3 py-2 text-right font-medium">Loaded %</th>
              <th scope="col" className="hidden px-3 py-2 text-right font-medium md:table-cell">Pressure</th>
              <th scope="col" className="hidden px-3 py-2 text-right font-medium md:table-cell">Temp</th>
              <th scope="col" className="hidden px-4 py-2 font-medium lg:table-cell">Notes</th>
            </tr>
          </thead>
          <tbody>
            {table.length === 0 && <tr><td colSpan={7} className="border-t border-line-subtle px-4 py-6 text-center text-ink-muted">Nothing to show for {label} yet.</td></tr>}
            {table.map(({ d, row }) => {
              const when = `${formatWeekday(parse(d.date))} ${formatDate(parse(d.date))}`;
              return (
                <tr key={d.date} className={d.date === today ? 'bg-action-soft' : undefined}>
                  <th scope="row" className="border-t border-line-subtle px-4 py-1.5 text-left font-normal">
                    <button type="button" onClick={() => onOpenDay(d.date)} aria-label={`${when}: ${d.state === 'reading' ? 'open this day' : 'record a reading for this day'}`}
                      className="rounded-xs text-left text-ink underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus">{when}</button>
                  </th>
                  {d.state === 'reading' ? (
                    <>
                      <td className="border-t border-line-subtle px-3 py-1.5 text-right"><span className="floor-meter text-ink">{h1(d.running)}</span>{d.span > 1 && <span className="ml-1.5 text-caption text-ink-muted">over {d.span} days</span>}</td>
                      <td className="floor-meter border-t border-line-subtle px-3 py-1.5 text-right text-ink">{h1(d.loaded)}</td>
                      <td className="border-t border-line-subtle px-3 py-1.5 text-right tabular text-ink">{d.running ? `${Math.round(((d.loaded ?? 0) / d.running) * 100)}%` : '—'}</td>
                      <td className="hidden border-t border-line-subtle px-3 py-1.5 text-right tabular text-ink md:table-cell">{row?.pressure ? row.pressure : '—'}</td>
                      <td className="hidden border-t border-line-subtle px-3 py-1.5 text-right tabular text-ink md:table-cell">{row?.temperature ? row.temperature : '—'}</td>
                      <td className="hidden max-w-64 truncate border-t border-line-subtle px-4 py-1.5 text-ink-muted lg:table-cell">{row?.notes || ''}</td>
                    </>
                  ) : (
                    <td colSpan={6} className="border-t border-line-subtle px-3 py-1.5 text-ink-muted">{d.state === 'before' ? 'Before the first reading' : 'No reading'}</td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
