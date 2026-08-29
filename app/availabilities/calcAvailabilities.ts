// app/availabilities/calcAvailabilities.ts — the period-grouping and week/month-label
// calculations behind the availabilities page, split out of page.tsx per the
// "extract + test business logic" standard (app/timesheets/calcTotals.ts precedent).
// Previously inline in page.tsx with no test coverage at all.
import type { AvailRecord, PeriodRow } from './types';

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
  return new Date(dateStr).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
}

// Groups records into day/week/month buckets and averages availability_percentage
// within each — the fleet-wide "how did we do this week/month" rollup.
export function computePeriodRows(records: AvailRecord[], period: Period): PeriodRow[] {
  const grouped = new Map<string, { sum: number; count: number; opH: number; bdH: number }>();
  records.forEach(r => {
    const key = period === 'day' ? r.date
      : period === 'week' ? getWeekLabel(r.date)
      : getMonthLabel(r.date);
    const ex = grouped.get(key) ?? { sum: 0, count: 0, opH: 0, bdH: 0 };
    grouped.set(key, { sum: ex.sum + (r.availability_percentage ?? 0), count: ex.count + 1, opH: ex.opH + (r.operational_hours ?? 0), bdH: ex.bdH + (r.breakdown_hours ?? 0) });
  });
  return Array.from(grouped.entries())
    .map(([k, v]) => ({ periodKey: k, label: k, avgAvailability: v.sum / v.count, totalOpHours: v.opH, totalBdHours: v.bdH, recordCount: v.count }))
    .sort((a, b) => a.label.localeCompare(b.label));
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
