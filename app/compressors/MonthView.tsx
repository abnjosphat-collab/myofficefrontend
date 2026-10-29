// app/compressors/MonthView.tsx — every compressor's month at a glance: one row per unit, one cell per day,
// shaded by that day's running hours, with the month's totals on the right. A missing reading is a dot (never a zero), a
// reading after a gap is marked with the days it covers, and any past day opens that unit's drawer on that date.
'use client';

import { useMemo } from 'react';
import { IconButton, MotionTableBody, MotionTableRow } from '@/components/ui-system';
import { DownloadButton, type DLColumn } from '@/components/shared/DownloadButton';
import { exportFilename } from '@/lib/exportUtils';
import { formatDate } from '@/lib/format';
import type { Compressor, ReadingRow } from './types';
import { buildMonth, daysInMonth, intensity, isoDay, type MonthDay } from './monthLogic';
import s from '@/components/shared/floor/floor.module.css';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAY = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function MonthView({ compressors, history, loading, year, month, today, onMonth, onOpenDay, onOpenUnit }: {
  compressors: Compressor[];
  history: Record<number, ReadingRow[]>;
  loading: boolean;
  year: number; month: number; today: string;
  onMonth: (year: number, month: number) => void;
  onOpenDay: (id: number, date: string) => void;
  onOpenUnit: (id: number) => void;
}) {
  const days = daysInMonth(year, month);
  const rows = useMemo(() => compressors.map(c => ({ c, m: buildMonth(history[c.id] ?? [], year, month, today) })), [compressors, history, year, month, today]);
  const shift = (by: number) => { const d = new Date(year, month - 1 + by, 1); onMonth(d.getFullYear(), d.getMonth() + 1); };
  const label = `${MONTHS[month - 1]} ${year}`;
  const fleetHours = rows.reduce((t, r) => t + r.m.running, 0);

  // Download: one row per unit, one column per day (hours, or "no reading"), then the month's totals.
  const exportColumns: DLColumn[] = [
    { key: 'name', label: 'Compressor', width: 20 },
    ...Array.from({ length: days }, (_, i) => ({ key: `d${i + 1}`, label: String(i + 1), width: 6 })),
    { key: 'running', label: 'Month h', width: 10 },
    { key: 'loaded_pct', label: 'Loaded %', width: 10 },
    { key: 'readings', label: 'Readings', width: 10 },
  ];
  const exportRows = rows.map(({ c, m }) => ({
    name: c.name,
    ...Object.fromEntries(m.days.map((d, i) => [`d${i + 1}`, d.state === 'reading' ? `${d.running?.toFixed(1)}${d.span > 1 ? ` (${d.span}d)` : ''}` : d.state === 'missing' ? '–' : ''])),
    running: m.running.toFixed(1),
    loaded_pct: m.loadedPct == null ? '' : `${m.loadedPct}%`,
    readings: `${m.recorded}/${m.expected}`,
  }));

  return (
    <section aria-label={`Month view, ${label}`} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <IconButton icon="chevron-left" label="Previous month" variant="outline" onClick={() => shift(-1)} />
          <h2 className="min-w-40 text-center font-display text-lg font-normal text-ink">{label}</h2>
          <IconButton icon="chevron-right" label="Next month" variant="outline" onClick={() => shift(1)} />
        </div>
        <div className="flex flex-wrap items-center gap-4 font-sans text-caption text-ink-muted">
          <span className="flex items-center gap-1.5"><span aria-hidden="true" className="size-1.5 rounded-full bg-ink-subtle" />No reading</span>
          <span className="flex items-center gap-1.5"><span aria-hidden="true" className={s.spanMark} />Covers several days</span>
          {compressors.length > 0 && <DownloadButton data={exportRows} columns={exportColumns} filename={exportFilename(`Compressors_${MONTHS[month - 1]}_${year}`)} title={`Compressor running hours, ${label}`} subtitle="Hours since the previous reading; (Nd) marks a reading covering N days" />}
        </div>
      </div>

      <div className={`${s.slab} overflow-x-auto`} data-still="">
        <table className="w-full border-separate border-spacing-0 font-sans text-caption">
          <caption className="sr-only">Daily running hours per compressor for {label}{loading ? ' (loading)' : ''}</caption>
          <thead>
            <tr>
              <th scope="col" className="sticky left-0 z-10 bg-surface-raised px-3 py-2 text-left font-medium text-ink-muted">Compressor</th>
              {Array.from({ length: days }, (_, i) => {
                const iso = isoDay(year, month, i + 1);
                const wd = new Date(year, month - 1, i + 1).getDay();
                return (
                  <th key={iso} scope="col" className={`px-px py-2 text-center font-normal ${iso === today ? 'text-ink' : 'text-ink-muted'}`}>
                    <span className="sr-only">{formatDate(new Date(year, month - 1, i + 1))}</span>
                    <span aria-hidden="true" className={`flex flex-col items-center leading-tight ${iso === today ? 'font-semibold' : ''}`}>
                      <span>{WEEKDAY[wd]}</span><span className="tabular">{i + 1}</span>
                    </span>
                  </th>
                );
              })}
              <th scope="col" className="whitespace-nowrap px-2 py-2 text-right font-medium text-ink-muted">Month</th>
              <th scope="col" className="whitespace-nowrap px-2 py-2 text-right font-medium text-ink-muted">Loaded</th>
              <th scope="col" className="whitespace-nowrap px-2 py-2 text-right font-medium text-ink-muted">Readings</th>
            </tr>
          </thead>
          <MotionTableBody stillKey={`${year}-${month}`}>
            {rows.map(({ c, m }) => (
              <MotionTableRow key={c.id}>
                <th scope="row" className="sticky left-0 z-10 max-w-44 truncate border-t border-line-subtle bg-surface-raised px-3 py-1.5 text-left font-medium text-ink"><button type="button" onClick={() => onOpenUnit(c.id)} aria-label={`${c.name.trim()}: week and month in detail`} className="max-w-full truncate rounded-xs text-left underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus">{c.name}</button></th>
                {m.days.map(d => (
                  <td key={d.date} className={`border-t border-line-subtle px-px py-1.5 text-center ${d.date === today ? 'bg-action-soft' : ''}`}>
                    <DayCell unit={c.name} day={d} onOpen={() => onOpenDay(c.id, d.date)} />
                  </td>
                ))}
                <td className="whitespace-nowrap border-t border-line-subtle px-2 py-1.5 text-right"><span className="floor-meter text-ink">{m.running.toFixed(1)}</span> <span className="text-ink-muted">h</span></td>
                <td className="whitespace-nowrap border-t border-line-subtle px-2 py-1.5 text-right tabular text-ink">{m.loadedPct == null ? <span className="text-ink-muted">—</span> : `${m.loadedPct}%`}</td>
                <td className="whitespace-nowrap border-t border-line-subtle px-2 py-1.5 text-right tabular" style={{ color: m.recorded < m.expected ? 'var(--mo-warning)' : 'var(--mo-ink)' }}>{m.recorded}/{m.expected}</td>
              </MotionTableRow>
            ))}
          </MotionTableBody>
        </table>
      </div>
      {fleetHours === 0 && !loading && <p className="font-sans text-caption text-ink-muted">No readings recorded in {label} yet. Readings saved from the floor appear here day by day.</p>}
    </section>
  );
}

function DayCell({ unit, day, onOpen }: { unit: string; day: MonthDay; onOpen: () => void }) {
  const when = formatDate(new Date(`${day.date}T00:00:00`));
  if (day.state === 'future') return <span aria-hidden="true" className="mx-auto block size-5" />;
  const text = day.state === 'reading'
    ? `${unit}, ${when}: ${day.running?.toFixed(1)} h running, ${day.loaded?.toFixed(1)} h loaded${day.span > 1 ? `, covering ${day.span} days since the previous reading` : ''}. Open this day.`
    : day.state === 'missing' ? `${unit}, ${when}: no reading. Open this day to record one.` : `${unit}, ${when}: before the first reading. Open this day.`;
  const a = intensity(day);
  return (
    <button type="button" onClick={onOpen} aria-label={text} title={text.replace(/ Open this day.*$/, '')}
      className="relative mx-auto grid size-5 place-items-center rounded-xs transition-colors hover:outline hover:outline-1 hover:outline-line-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
      style={day.state === 'reading' ? { background: `color-mix(in srgb, var(--mo-action) ${Math.round(Math.max(0.12, a) * 85)}%, transparent)` } : undefined}>
      {day.state === 'missing' && <span aria-hidden="true" className="size-1.5 rounded-full bg-ink-subtle" />}
      {day.state === 'reading' && day.span > 1 && <span aria-hidden="true" className={`${s.spanMark} absolute right-0.5 top-0.5`} />}
    </button>
  );
}
