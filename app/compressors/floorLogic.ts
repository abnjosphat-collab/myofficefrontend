// app/compressors/floorLogic.ts — the small calculations the floor shows: a status's accent and how far a
// compressor has run towards its next planned service.
import { SERVICE_INTERVALS, calculateNextService } from './calcCompressors';

const ACCENT: Record<string, string> = {
  running: 'var(--mo-success)', standby: 'var(--mo-info)', maintenance: 'var(--mo-warning)', offline: 'var(--mo-neutral)',
};
export const statusAccent = (status: string) => ACCENT[status] ?? 'var(--mo-neutral)';

export interface ServiceLife {
  /** The next planned service interval, or null when every interval has passed. */
  next: number | null;
  /** 0..1 from the last interval passed to the next one. */
  fraction: number;
  hoursLeft: number | null;
  daysLeft: number | null;
  urgent: boolean;
  /** Colour of the ring: calm, then amber within 30 days, red within a week. */
  tone: string;
}

export function serviceLife(runningHours: number): ServiceLife {
  const info = calculateNextService(runningHours || 0);
  if (!info) return { next: null, fraction: 1, hoursLeft: null, daysLeft: null, urgent: false, tone: 'var(--mo-neutral)' };
  const passed = SERVICE_INTERVALS.filter(i => i <= (runningHours || 0));
  const from = passed.length ? passed[passed.length - 1] : 0;
  const fraction = (runningHours - from) / (info.interval - from);
  const tone = info.urgency === 'critical' || info.urgency === 'high' ? 'var(--mo-danger)' : info.urgency === 'medium' ? 'var(--mo-warning)' : 'var(--mo-action)';
  return { next: info.interval, fraction, hoursLeft: info.hoursRemaining, daysLeft: info.daysRemaining, urgent: info.isUrgent, tone };
}
