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
