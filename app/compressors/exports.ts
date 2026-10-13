// app/compressors/exports.ts — what each compressor view can download, as Excel (.xlsx) and PDF through the shared
// DownloadButton: the fleet register, upcoming services, performance, and the fleet summary. One definition per
// download, so the current page and the floor preview export the same thing the same way.
import type { DLColumn } from '@/components/shared/DownloadButton';
import { calculateEfficiency, calculateNextService } from './calcCompressors';
import { statusLabel } from './meta';
import type { Compressor, ManagementSummary, PerformanceMetric, UpcomingService } from './types';

const h1 = (v: unknown) => (v == null || v === '' || Number.isNaN(Number(v)) ? '' : Number(v).toFixed(1));

/** The fleet register: one row per compressor, with its next service and (optionally) whether today's reading is in. */
export const REGISTER_COLUMNS: DLColumn[] = [
  { key: 'name', label: 'Compressor', width: 22 },
  { key: 'model', label: 'Model', width: 16 },
  { key: 'capacity', label: 'Capacity', width: 12 },
  { key: 'location', label: 'Location', width: 16 },
  { key: 'status', label: 'Status', width: 13, format: v => statusLabel(String(v ?? '')) },
  { key: 'total_running_hours', label: 'Running hours', width: 15, format: h1 },
  { key: 'total_loaded_hours', label: 'Loaded hours', width: 15, format: h1 },
  { key: 'loaded_share', label: 'Loaded %', width: 11 },
  { key: 'next_service', label: 'Next service (h)', width: 16 },
  { key: 'hours_to_service', label: 'Hours to service', width: 16 },
  { key: 'reading', label: 'Reading for the day', width: 18 },
];
export function registerRows(compressors: Compressor[], recordedIds?: ReadonlySet<number>): Record<string, unknown>[] {
  return compressors.map(c => {
    const next = calculateNextService(c.total_running_hours || 0);
    return {
      ...c,
      loaded_share: c.total_running_hours ? `${calculateEfficiency(c.total_running_hours, c.total_loaded_hours)}%` : '',
      next_service: next?.interval ?? 'All passed',
      hours_to_service: next ? next.hoursRemaining.toFixed(1) : '',
      reading: recordedIds ? (recordedIds.has(c.id) ? 'Recorded' : 'Due') : '',
    };
  });
}

/** Upcoming services, nearest first. */
export const SERVICES_COLUMNS: DLColumn[] = [
  { key: 'compressor_name', label: 'Compressor', width: 22 },
  { key: 'service_interval', label: 'Service (h)', width: 12 },
  { key: 'current_hours', label: 'Current hours', width: 14, format: h1 },
  { key: 'hours_remaining', label: 'Hours to go', width: 13, format: h1 },
  { key: 'days_remaining', label: 'Days to go (about)', width: 17 },
  { key: 'urgency', label: 'Urgency', width: 12, format: v => { const s = String(v ?? ''); return s.charAt(0).toUpperCase() + s.slice(1); } },
];
/** The same rows built from the register, for views that work out services themselves. */
export function servicesFromRegister(compressors: Compressor[]): UpcomingService[] {
  return compressors.flatMap(c => {
    const n = calculateNextService(c.total_running_hours || 0);
    return n ? [{ compressor_id: c.id, compressor_name: c.name, service_interval: n.interval, current_hours: c.total_running_hours, next_service_hours: n.interval, hours_remaining: n.hoursRemaining, days_remaining: n.daysRemaining, urgency: n.urgency }] : [];
  }).sort((a, b) => a.hours_remaining - b.hours_remaining);
}

/** Performance over the chosen period. */
export const PERFORMANCE_COLUMNS: DLColumn[] = [
  { key: 'compressor_name', label: 'Compressor', width: 22 },
  { key: 'avg_efficiency', label: 'Avg efficiency %', width: 16 },
  { key: 'avg_daily_running_hours', label: 'Avg running h / day', width: 18, format: h1 },
  { key: 'avg_daily_loaded_hours', label: 'Avg loaded h / day', width: 18, format: h1 },
  { key: 'total_running_hours', label: 'Running hours', width: 15, format: h1 },
  { key: 'total_loaded_hours', label: 'Loaded hours', width: 15, format: h1 },
  { key: 'downtime_percentage', label: 'Downtime %', width: 12 },
  { key: 'service_count', label: 'Services', width: 10 },
];
export const performanceRows = (m: PerformanceMetric[]) => m as unknown as Record<string, unknown>[];

/** The fleet summary as one table: how many compressors per status, per location and per age band. */
export const SUMMARY_COLUMNS: DLColumn[] = [
  { key: 'group', label: 'Grouped by', width: 14 },
  { key: 'value', label: 'Group', width: 22 },
  { key: 'count', label: 'Compressors', width: 13 },
];
const AGE_LABEL: Record<string, string> = { less_than_year: 'Under 1 year', '1_3_years': '1 to 3 years', '3_5_years': '3 to 5 years', more_than_5: 'Over 5 years' };
export function summaryRows(s: ManagementSummary | null): Record<string, unknown>[] {
  if (!s) return [];
  return [
    ...Object.entries(s.status_distribution ?? {}).map(([k, n]) => ({ group: 'Status', value: statusLabel(k), count: n })),
    ...Object.entries(s.location_distribution ?? {}).map(([k, n]) => ({ group: 'Location', value: k, count: n })),
    ...Object.entries(s.age_distribution ?? {}).map(([k, n]) => ({ group: 'Age', value: AGE_LABEL[k] ?? k, count: n ?? 0 })),
  ];
}
