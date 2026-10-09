// app/compressors/calcCompressors.ts — the pure efficiency/service-due/daily-delta
// calculations behind the compressors page, split out of page.tsx per the
// "extract + test business logic" standard (app/timesheets/calcTotals.ts precedent).
// Previously inline in page.tsx with no test coverage at all.
//
// Flagged during a quality pass because this logic *duplicates* backend/app/routers/
// compressors.py's own efficiency/service-urgency/cumulative-hours calc engine — the
// two aren't reconciled, so a divergence between them would go unnoticed. These tests
// lock in the frontend's version so at least this side won't silently drift on its own.
import { toLocalISODate } from '@/lib/dates';

/** Service intervals in running hours; the next one a compressor has not yet reached is its next service. */
export const SERVICE_INTERVALS = [1000, 2000, 4000, 8000, 16000];

export function calculateEfficiency(running: number, loaded: number): number {
  return !running ? 0 : parseFloat(((loaded / running) * 100).toFixed(1));
}

/** An efficiency rating: one set of thresholds gives both the word and its badge tone. */
export interface EfficiencyStatus { label: string; tone: EfficiencyTone }

export function getEfficiencyStatus(efficiency: number): EfficiencyStatus {
  const tone = efficiencyTone(efficiency);
  return { label: ({ success: 'Excellent', info: 'Good', warning: 'Fair', danger: 'Poor' } as const)[tone], tone };
}

// A reading's "loaded" hours can never exceed its "running" hours (you can't be loaded
// while not running) — clamps whatever was typed into that valid range.
export function autoAdjustLoadedHours(running: number, loaded: number): number {
  return Math.max(0, Math.min(loaded, running));
}

// Cumulative meter readings only ever go up — today's actual activity is the delta
// since the previous reading, never negative even if a reading was corrected downward.
export function calculateDailyDelta(currentTotal: number, previousTotal: number): number {
  return Math.max(0, (currentTotal || 0) - (previousTotal || 0));
}

export type ServiceUrgency = 'low' | 'medium' | 'high' | 'critical';

export interface NextServiceInfo {
  interval: number;
  hoursRemaining: number;
  daysRemaining: number;
  urgency: ServiceUrgency;
  isUrgent: boolean;
}

// The next service interval this compressor hasn't yet reached, and how soon it'll get
// there at the assumed daily operating rate. `null` means every known interval has
// already been passed (fully serviced, nothing left in SERVICE_INTERVALS to plan for).
export function calculateNextService(
  totalRunningHours: number,
  defaultOperatingHours = 8,
  maintenanceBufferDays = 7,
): NextServiceInfo | null {
  const nextIntervals = SERVICE_INTERVALS.filter(i => i > totalRunningHours);
  if (!nextIntervals.length) return null;
  const interval = nextIntervals[0];
  const hoursRemaining = interval - totalRunningHours;
  const daysRemaining = Math.ceil(hoursRemaining / defaultOperatingHours);
  let urgency: ServiceUrgency = 'low';
  if (daysRemaining <= 0) urgency = 'critical';
  else if (daysRemaining <= 7) urgency = 'high';
  else if (daysRemaining <= 30) urgency = 'medium';
  return { interval, hoursRemaining, daysRemaining, urgency, isUrgent: daysRemaining <= maintenanceBufferDays };
}

/** The calendar day in the user's own time zone (toISOString would use UTC and shift the day late in the evening). */
export const localDateString = toLocalISODate;

export type EfficiencyTone = 'success' | 'info' | 'warning' | 'danger';
export function efficiencyTone(efficiency: number): EfficiencyTone {
  if (efficiency >= 80) return 'success';
  if (efficiency >= 60) return 'info';
  if (efficiency >= 40) return 'warning';
  return 'danger';
}

export interface ReadingProblems { running?: string; loaded?: string; }

/**
 * What is wrong with a cumulative meter reading, field by field (nothing wrong = empty object).
 * Totals only ever go up, loaded hours are a subset of running hours, and the hours loaded since the
 * previous reading cannot exceed the hours run since then.
 */
export function readingProblems(
  previous: { total_running_hours: number; total_loaded_hours: number } | undefined,
  running: number,
  loaded: number,
): ReadingProblems {
  const problems: ReadingProblems = {};
  const prevRun = previous?.total_running_hours ?? 0;
  const prevLoad = previous?.total_loaded_hours ?? 0;
  if (previous && running < prevRun) problems.running = `Cannot be below the previous total of ${prevRun.toFixed(1)} h.`;
  if (previous && loaded < prevLoad) problems.loaded = `Cannot be below the previous total of ${prevLoad.toFixed(1)} h.`;
  if (!problems.loaded && loaded > running) problems.loaded = 'Loaded hours cannot exceed running hours.';
  if (!problems.loaded && previous && loaded - prevLoad > running - prevRun) problems.loaded = 'Hours loaded since the previous reading exceed the hours run.';
  return problems;
}
