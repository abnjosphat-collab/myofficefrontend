// lib/format.ts — shared date/number formatting. Previously `toLocaleDateString`
// (and friends) were called ~110 times across pages with slightly different options
// each time, producing inconsistent date displays. Use these so every date/time in
// the app looks the same and the format is changeable in one place.

/** "15 Jul 2026" — the app's standard short date. Accepts a Date, ISO string, or ms. */
export function formatDate(value?: string | number | Date | null): string {
  if (value === null || value === undefined || value === '') return '—';
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** "15 Jul 2026, 14:30" — short date + 24h time. */
export function formatDateTime(value?: string | number | Date | null): string {
  if (value === null || value === undefined || value === '') return '—';
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

/** "14:30" — 24h time only. */
export function formatTime(value?: string | number | Date | null): string {
  if (value === null || value === undefined || value === '') return '—';
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

const asDate = (value?: string | number | Date | null): Date | null => {
  if (value === null || value === undefined || value === '') return null;
  const d = value instanceof Date ? value : new Date(value);
  return isNaN(d.getTime()) ? null : d;
};
const en = (value: string | number | Date | null | undefined, options: Intl.DateTimeFormatOptions) => {
  const d = asDate(value);
  return d ? d.toLocaleDateString('en-GB', options) : '—';
};

/** "5 July 2026" — a date written out, for documents and headings. */
export const formatLongDate = (value?: string | number | Date | null) => en(value, { day: 'numeric', month: 'long', year: 'numeric' });

/** "5 Jul", or "5 July" with `long` — a day within a known year (chart axes, compact lists). */
export const formatDayMonth = (value?: string | number | Date | null, long = false) => en(value, { day: 'numeric', month: long ? 'long' : 'short' });

/** "Monday 5 July", or "Monday 5 July 2026" with `withYear` — a day as people say it. */
export const formatFullDate = (value?: string | number | Date | null, withYear = false) =>
  en(value, { weekday: 'long', day: 'numeric', month: 'long', ...(withYear ? { year: 'numeric' as const } : {}) });

/** "Mon", or "Monday" with `long`. */
export const formatWeekday = (value?: string | number | Date | null, long = false) => en(value, { weekday: long ? 'long' : 'short' });

/** "Jul"; "Jul 26" with `year: 'short'`; "Jul 2026" with `year: 'full'` — month labels for charts and periods. */
export const formatMonth = (value?: string | number | Date | null, year: 'none' | 'short' | 'full' = 'none') =>
  en(value, { month: 'short', ...(year === 'short' ? { year: '2-digit' as const } : year === 'full' ? { year: 'numeric' as const } : {}) });

/** Relative "time ago" for activity feeds: "just now", "5 min", "3 hours", "2 days". */
export function timeAgo(value?: string | number | Date | null): string {
  if (value === null || value === undefined || value === '') return '';
  const d = value instanceof Date ? value : new Date(value);
  const ms = Date.now() - d.getTime();
  if (!Number.isFinite(ms) || ms < 0) return '';
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'}`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? '' : 's'}`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days === 1 ? '' : 's'}`;
}

/** A file size in the largest sensible unit: 1536 -> "1.5 KB". */
export function formatFileSize(bytes: number): string {
  if (!bytes || bytes < 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${parseFloat((bytes / 1024 ** i).toFixed(1))} ${units[i]}`;
}
