// app/availabilities/calcAvailabilities.ts — the period-grouping and week/month-label
// calculations behind the availabilities page, split out of page.tsx per the
// "extract + test business logic" standard (app/timesheets/calcTotals.ts precedent).
// Previously inline in page.tsx with no test coverage at all.
import type { AvailRecord, PeriodRow } from './types';
import { formatMonth } from '@/lib/format';

export type Period = 'day' | 'week' | 'month';

// Not a true ISO 8601 week number (which anchors to the Thursday of each week) —
// a simple "how many 7-day blocks since Jan 1" count. Good enough for grouping
// records into consistent weekly buckets within this page; don't rely on this
// matching an ISO week number shown elsewhere.
export function getWeekLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const jan1 = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
  return `W${String(week).padStart(2, '0')} ${d.getFullYear()}`;
}

export function getMonthLabel(dateStr: string): string {
  return formatMonth(new Date(dateStr), 'full');
}

// Groups records into day/week/month buckets and averages availability_percentage
// within each — the fleet-wide "how did we do this week/month" rollup.
export function computePeriodRows(records: AvailRecord[], period: Period): PeriodRow[] {
  const grouped = new Map<string, { sortKey: string; sum: number; count: number; opH: number; bdH: number }>();
  records.forEach(r => {
    const key = period === 'day' ? r.date
      : period === 'week' ? getWeekLabel(r.date)
      : getMonthLabel(r.date);
    const ex = grouped.get(key) ?? { sortKey: periodSortKey(r.date, period), sum: 0, count: 0, opH: 0, bdH: 0 };
    grouped.set(key, { ...ex, sum: ex.sum + (r.availability_percentage ?? 0), count: ex.count + 1, opH: ex.opH + (r.operational_hours ?? 0), bdH: ex.bdH + (r.breakdown_hours ?? 0) });
  });
  // Chronological, not alphabetical: sorting the labels put "Apr 2026" before "Jan 2026" and week 01 of next year before week 50.
  return Array.from(grouped.entries())
    .map(([k, v]) => ({ periodKey: k, label: k, sortKey: v.sortKey, avgAvailability: v.sum / v.count, totalOpHours: v.opH, totalBdHours: v.bdH, recordCount: v.count }))
    .sort((a, b) => a.sortKey.localeCompare(b.sortKey));
}

/** A key that sorts periods in time order: the day, the year and week, or the year and month. */
export function periodSortKey(dateStr: string, period: Period): string {
  if (period === 'day') return dateStr;
  if (period === 'month') return dateStr.slice(0, 7);
  const label = getWeekLabel(dateStr); // "W05 2026"
  return `${label.slice(4)}-${label.slice(1, 3)}`;
}

export interface BestWorstPeriod {
  best: number;
  worst: number;
  bestLabel: string | undefined;
  worstLabel: string | undefined;
}

// The highest/lowest average-availability period in the current selection, with
// which period each one was — undefined labels/0 values for an empty input.
export function findBestWorstPeriod(periodRows: PeriodRow[]): BestWorstPeriod {
  if (periodRows.length === 0) return { best: 0, worst: 0, bestLabel: undefined, worstLabel: undefined };
  const avgs = periodRows.map(r => r.avgAvailability);
  const best = Math.max(...avgs);
  const worst = Math.min(...avgs);
  return {
    best, worst,
    bestLabel: periodRows.find(r => r.avgAvailability === best)?.label,
    worstLabel: periodRows.find(r => r.avgAvailability === worst)?.label,
  };
}

/** (operational − downtime) ÷ operational × 100, held to 0–100. Needs operational hours above zero. */
export function availabilityPercent(operational: number, downtime: number): number {
  return Math.max(0, Math.min(100, ((operational - downtime) / operational) * 100));
}

/** 95% and above is good, 90% and above needs watching, below that is poor. */
export function availabilityTone(pct: number): 'success' | 'warning' | 'danger' {
  return pct >= 95 ? 'success' : pct >= 90 ? 'warning' : 'danger';
}
