// app/compressors/calcCompressors.ts — the pure efficiency/service-due/daily-delta
// calculations behind the compressors page, split out of page.tsx per the
// "extract + test business logic" standard (app/timesheets/calcTotals.ts precedent).
// Previously inline in page.tsx with no test coverage at all.
//
// Flagged during a quality pass because this logic *duplicates* backend/app/routers/
// compressors.py's own efficiency/service-urgency/cumulative-hours calc engine — the
// two aren't reconciled, so a divergence between them would go unnoticed. These tests
// lock in the frontend's version so at least this side won't silently drift on its own.
import { SERVICE_INTERVALS } from './useCompressorsData';

export function calculateEfficiency(running: number, loaded: number): number {
  return !running ? 0 : parseFloat(((loaded / running) * 100).toFixed(1));
}

export interface EfficiencyStatus { label: string; color: string; }

export function getEfficiencyStatus(efficiency: number): EfficiencyStatus {
  if (efficiency >= 80) return { label: 'Excellent', color: '#34d399' };
  if (efficiency >= 60) return { label: 'Good', color: '#2563eb' }; // matches ACCENT_HEX.blue
  if (efficiency >= 40) return { label: 'Fair', color: '#f59e0b' };
  return { label: 'Poor', color: '#f43f5e' };
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
