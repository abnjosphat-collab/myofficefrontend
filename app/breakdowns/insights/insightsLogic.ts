// app/breakdowns/insights/insightsLogic.ts — small pure helpers for the analytics views: heatmap shading and which hours to show,
// the time and money formats, and the plain-English lines that stand in for each chart.
import { minutesToDisplay } from '../calcBreakdowns';
import { formatMonth } from '@/lib/format';

export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const DAYS_LONG = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/** 0 for an empty cell, then 1 to 4 by how close the cell is to the busiest one. */
export function heatLevel(value: number, max: number): 0 | 1 | 2 | 3 | 4 {
  if (!(value > 0) || !(max > 0)) return 0;
  const share = value / max;
  return share <= 0.25 ? 1 : share <= 0.5 ? 2 : share <= 0.75 ? 3 : 4;
}
/** The hours (0 to 23) in which anything happened on any weekday; the rest are dropped so the grid stays compact. */
export const busyHours = (grid: number[][]): number[] => Array.from({ length: 24 }, (_, h) => h).filter(h => (grid[h] ?? []).some(v => v > 0));
export const gridTotal = (grid: number[][]): number => grid.reduce((s, row) => s + row.reduce((a, v) => a + v, 0), 0);

export const duration = (minutes: number | null | undefined): string => (minutes == null || !Number.isFinite(minutes) ? 'Not recorded' : minutesToDisplay(Math.round(minutes)));
export const money = (v: number | null | undefined): string => `$${(Number(v) || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
export const monthLabel = (key: string): string => { const m = /^(\d{4})-(\d{2})$/.exec(key); return m ? formatMonth(new Date(Number(m[1]), Number(m[2]) - 1, 1), 'short') : key; };

/** "Mechanical 12; Electrical 3." — the text alternative for a ranked list or a bar chart. */
export const line = (rows: { name: string; value: number }[], unit = ''): string => rows.map(r => `${r.name} ${r.value}${unit}`).join('; ') || 'none';
export const busiest = (rows: { name: string; value: number }[]): { name: string; value: number } | null => rows.reduce<{ name: string; value: number } | null>((best, r) => (!best || r.value > best.value ? r : best), null);
