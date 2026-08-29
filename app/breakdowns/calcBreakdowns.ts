// app/breakdowns/calcBreakdowns.ts — the pure downtime/cost calculations behind the
// breakdowns page, split out of page.tsx per the "extract + test business logic"
// standard (app/timesheets/calcTotals.ts precedent). Previously inline in page.tsx
// with no test coverage at all.
//
// Flagged during a quality pass because this duplicates backend/app/routers/
// breakdowns.py's own time_to_minutes/calculate_time_metrics calc — the two aren't
// reconciled, so a divergence between them would go unnoticed. These tests lock in
// the frontend's version so at least this side won't silently drift on its own.
import type { Breakdown, SpareUsed } from './types';

export function timeToMinutes(t: string): number {
  if (!t) return 0;
  try {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  } catch {
    return 0;
  }
}

export function minutesToDisplay(minutes: number): string {
  if (!minutes && minutes !== 0) return '0m';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m > 0 ? `${m}m` : ''}`.trim() : `${m}m`;
}

// HH:MM start/end, same-day — an end time earlier than start means it crossed
// midnight (e.g. a night-shift breakdown logged 23:10 -> 01:40), not a negative
// duration, so a day (1440 minutes) is added back on.
export function calcDowntime(start?: string, end?: string): number {
  if (!start || !end) return 0;
  const s = timeToMinutes(start), e = timeToMinutes(end);
  return Math.max(0, e >= s ? e - s : (e + 1440) - s);
}

export function sparesTotalCost(spares: Breakdown['spares_used']): number {
  if (!spares || !Array.isArray(spares)) return 0;
  return (spares as SpareUsed[]).reduce((t, s) => t + (parseFloat(s.total_cost?.toString() ?? '0') || 0), 0);
}
