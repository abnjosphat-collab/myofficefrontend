// app/breakdowns/insights/HourDayHeatmap.tsx — when breakdowns start: hour of day against weekday. One hue getting darker, with the
// count printed in every cell, so the number is never carried by a shade alone. Hours with nothing on any weekday are dropped.
'use client';

import { cn } from '@/components/ui-system';
import { DAYS, DAYS_LONG, busyHours, gridTotal, heatLevel } from './insightsLogic';

const LEVEL = ['bg-surface-muted', 'bg-action/20', 'bg-action/40', 'bg-action/65', 'bg-action/90'];

export function HourDayHeatmap({ grid, title, description, unit = 'breakdown' }: { grid: number[][]; title: string; description: string; unit?: string }) {
  const total = gridTotal(grid);
  if (total <= 0) return null;
  const max = Math.max(...grid.flat(), 1);
  const hours = busyHours(grid);
  return (
    <section aria-labelledby={`hm-${unit}`} className="flex flex-col gap-3 rounded-card border border-line bg-surface p-5 shadow-card">
      <div><h2 id={`hm-${unit}`} className="font-display text-title font-semibold text-ink">{title}</h2><p className="font-sans text-body-sm text-ink-muted">{description}</p></div>
      {/* A scrollable region must be keyboard-focusable so keyboard users can scroll it. */}
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
      <div className="max-w-full overflow-auto" tabIndex={0} role="region" aria-label={`${title} (scrollable)`}>
        <table className="border-separate border-spacing-[3px] font-sans text-caption text-ink-muted">
          <caption className="sr-only">{title}, {total} in all</caption>
          <thead><tr><th scope="col" className="w-10"><span className="sr-only">Weekday</span></th>{hours.map(h => <th key={h} scope="col" className="w-9 min-w-9 text-center font-normal tabular">{String(h).padStart(2, '0')}</th>)}</tr></thead>
          <tbody>
            {DAYS.map((day, d) => (
              <tr key={day}>
                <th scope="row" className="pr-1 text-left font-normal"><abbr title={DAYS_LONG[d]} className="no-underline">{day}</abbr></th>
                {hours.map(h => {
                  const v = grid[h]?.[d] ?? 0; const level = heatLevel(v, max);
                  return <td key={h} className={cn('size-9 rounded-xs text-center tabular', LEVEL[level], level >= 3 && 'text-action-ink')} title={`${DAYS_LONG[d]} ${String(h).padStart(2, '0')}:00, ${v} ${unit}${v === 1 ? '' : 's'}`}>{v > 0 ? v : ''}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="flex items-center gap-1.5 font-sans text-caption text-ink-muted">Fewer {LEVEL.map((c, i) => <span key={i} aria-hidden className={cn('inline-block size-3 rounded-xs', c)} />)} More</p>
    </section>
  );
}
