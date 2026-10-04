// app/overtime/insights/Heatmap.tsx — when overtime happens: hour of day against weekday, weighted by hours. Each cell is a button
// (so it works by keyboard and on touch) named with its day, hour and hours; choosing one lists the entries behind it. Intensity is
// one hue getting darker, and the hours are always in the cell's name and the panel, never only a shade.
'use client';

import { useState } from 'react';
import { Icon, StatusBadge, cn } from '@/components/ui-system';
import { formatDate } from '@/lib/format';
import type { PunchRecord } from '../types';

const LEVEL = ['bg-surface-muted', 'bg-action/20', 'bg-action/40', 'bg-action/65', 'bg-action/90'];

export function Heatmap({ grid, weekdayLabels, entries }: { grid: number[][]; weekdayLabels: string[]; entries: Record<string, PunchRecord[]> }) {
  const [sel, setSel] = useState<{ hour: number; wd: number } | null>(null);
  if (!grid.some(row => row.some(v => v > 0))) return null;
  const max = Math.max(...grid.flat(), 1);
  const level = (h: number) => (h <= 0 ? 0 : h / max <= 0.25 ? 1 : h / max <= 0.5 ? 2 : h / max <= 0.75 ? 3 : 4);
  // Hours with no overtime on any weekday are dropped so the grid stays compact.
  const hours = Array.from({ length: 24 }, (_, h) => h).filter(h => grid[h].some(v => v > 0));
  const picked = sel ? entries[`${sel.hour}-${sel.wd}`] ?? [] : [];
  return (
    <section aria-labelledby="heat" className="flex flex-col gap-3 rounded-card border border-line bg-surface p-5 shadow-card">
      <div><h2 id="heat" className="font-display text-title font-semibold text-ink">When overtime happens</h2><p className="font-sans text-body-sm text-ink-muted">Hour the overtime started, by weekday. Choose a cell to see who worked it.</p></div>
      {/* A scrollable region must be keyboard-focusable so keyboard users can scroll it. */}
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
      <div className="max-w-full overflow-auto" tabIndex={0} role="region" aria-label="Overtime by hour and weekday (scrollable)">
        <table className="border-separate border-spacing-[3px] font-sans text-caption text-ink-muted">
          <caption className="sr-only">Overtime hours by weekday and start hour</caption>
          <thead><tr><th scope="col" className="w-10"><span className="sr-only">Weekday</span></th>{hours.map(h => <th key={h} scope="col" className="w-9 min-w-9 text-center font-normal tabular">{String(h).padStart(2, '0')}</th>)}</tr></thead>
          <tbody>
            {weekdayLabels.map((day, wd) => (
              <tr key={day}>
                <th scope="row" className="pr-1 text-left font-normal">{day}</th>
                {hours.map(h => {
                  const v = grid[h][wd]; const on = sel?.hour === h && sel.wd === wd;
                  return (
                    <td key={h} className="p-0">
                      <button type="button" aria-pressed={on} aria-label={`${day} ${String(h).padStart(2, '0')}:00, ${v > 0 ? `${v.toFixed(1)} hours` : 'no overtime'}`} onClick={() => setSel(on ? null : { hour: h, wd })}
                        className={cn('focus-ring size-9 rounded-xs transition-[filter] hover:brightness-110', LEVEL[level(v)], v > 0 && level(v) >= 3 && 'text-action-ink', on && 'ring-2 ring-ink')}>
                        {v > 0 && <span className="tabular text-[0.6875rem]">{v < 10 ? v.toFixed(1) : Math.round(v)}</span>}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="flex items-center gap-1.5 font-sans text-caption text-ink-muted">Less {LEVEL.map((c, i) => <span key={i} aria-hidden className={cn('inline-block size-3 rounded-xs', c)} />)} More</p>
      {sel && (
        <div role="region" aria-label="Entries for the chosen cell" className="flex flex-col gap-2 border-t border-line pt-3">
          <p className="flex items-center gap-2 font-sans text-label font-semibold text-ink">{weekdayLabels[sel.wd]} {String(sel.hour).padStart(2, '0')}:00 <StatusBadge tone="info">{grid[sel.hour][sel.wd].toFixed(1)}h</StatusBadge><span className="font-normal text-ink-muted">{picked.length} {picked.length === 1 ? 'entry' : 'entries'}</span></p>
          {picked.length === 0
            ? <p className="font-sans text-body-sm text-ink-muted">No overtime started at this hour on this weekday in the current selection.</p>
            : <ul className="flex flex-col gap-1.5">{picked.map((e, i) => <li key={i} className="flex items-baseline justify-between gap-3 rounded-control bg-surface-subtle px-3 py-1.5 font-sans text-body-sm"><span className="min-w-0 [overflow-wrap:anywhere]"><span className="font-medium text-ink">{e.employee_name}</span> <span className="text-ink-muted">{formatDate(e.date)}</span>{e.reason && <span className="block text-caption text-ink-muted">{e.reason}</span>}</span><span className="shrink-0 font-semibold tabular text-ink">{e.hours}h</span></li>)}</ul>}
        </div>
      )}
      <span className="sr-only"><Icon name="info" /></span>
    </section>
  );
}
