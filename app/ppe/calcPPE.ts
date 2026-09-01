// app/ppe/calcPPE.ts — the pure expiry/matrix calculations behind the PPE page (status
// badges, KPI tiles, the reorder-by-size breakdown), split out of page.tsx per the
// "extract + test business logic" standard (app/timesheets/calcTotals.ts precedent).
// Previously inline in page.tsx with no test coverage at all.
import type { PPERecord } from './types';

// A record with no expiry_date (e.g. gloves, matrix interval 0 = "no expiry") is never
// expiring-soon or expired — there's nothing to count down to.
export const isExpiringSoon = (d?: string | null, days = 30): boolean => {
  if (!d) return false;
  const diff = Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
  return diff <= days && diff > 0;
};

export const isExpired = (d?: string | null): boolean => !!d && new Date(d) < new Date();

// % of active records not yet past their expiry date. null (not 0/100) when there are no
// active records at all — "no data" and "fully compliant" must render differently.
export function computeComplianceRate(records: PPERecord[]): number | null {
  const active = records.filter(r => r.status === 'active');
  if (!active.length) return null;
  return Math.round((active.filter(r => !isExpired(r.expiry_date)).length / active.length) * 100);
}

// Monday-Sunday week boundary — same convention as app/overtime/calcOvertime.ts's
// mondayOf/toISODate (kept local rather than shared: this file only needs the one
// "week containing this date" shape, not overtime's fuller weekly-rollup toolkit).
// mondayOf takes a Date so it's directly testable without faking system time.
function mondayOf(d: Date): Date {
  const day = d.getDay(); // 0=Sun..6=Sat
  const diff = (day + 6) % 7; // days since the most recent Monday
  const m = new Date(d);
  m.setDate(d.getDate() - diff);
  return m;
}
const toISODate = (d: Date): string => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// Defaults to the week containing right now — the "This Week" quick-preset for the
// Overdue/Expiring Soon date-range picker. Accepts an explicit `now` for testing.
export function thisWeekRange(now: Date = new Date()): { from: string; to: string } {
  const monday = mondayOf(now);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { from: toISODate(monday), to: toISODate(sunday) };
}

export interface SizeBucket { inUse: number; reorder: number; }
export type SizeBreakdown = [type: string, sizes: [size: string, bucket: SizeBucket][]][];

// Order breakdown: active items grouped by PPE type → size, with a count in use and a
// "to reorder" count (past expiry, i.e. needs replacing). Lets a purchaser see e.g.
// "Helmet · L × 12 (3 to reorder)" at a glance. Both the type groups and the size rows
// within each are sorted by inUse count, descending.
export function computeSizeBreakdown(records: PPERecord[]): SizeBreakdown {
  const byType: Record<string, Record<string, SizeBucket>> = {};
  records.forEach(r => {
    if (r.status !== 'active') return;
    const size = (r.size || '').trim() || 'Unspecified';
    (byType[r.ppe_type] ||= {});
    (byType[r.ppe_type][size] ||= { inUse: 0, reorder: 0 });
    byType[r.ppe_type][size].inUse++;
    if (isExpired(r.expiry_date)) byType[r.ppe_type][size].reorder++;
  });
  return Object.entries(byType)
    .map(([type, sizes]): SizeBreakdown[number] => [type, Object.entries(sizes).sort((a, b) => b[1].inUse - a[1].inUse)])
    .sort((a, b) => b[1].reduce((s, [, v]) => s + v.inUse, 0) - a[1].reduce((s, [, v]) => s + v.inUse, 0));
}

// ─── ORDER LIST ─────────────────────────────────────────────────────────────
// A lightweight, browser-local "cart" of specific due/expiring items someone has
// flagged to actually order — distinct from computeSizeBreakdown above, which is a
// live read of all active stock. This is a manually curated subset (see useOrderList),
// so record_id uniqueness is enforced there at add-time, not here.

export interface OrderListEntry {
  record_id: string;
  employee_id: string; employee_name: string;
  ppe_type: string; item_name: string; size: string;
}

export interface OrderGroupRow {
  ppe_type: string; item_name: string; size: string;
  count: number; people: string[];
}

// Groups the order list the way a purchase order actually needs it: "Safety Shoes,
// size 8, qty 3" with who each one is for — not a flat per-person list. Sorted by qty
// descending (biggest reorder need first), then item name for a stable order among ties.
export function groupOrderList(entries: OrderListEntry[]): OrderGroupRow[] {
  const byKey = new Map<string, OrderGroupRow>();
  entries.forEach(e => {
    const size = (e.size || '').trim() || 'Unspecified';
    const key = `${e.ppe_type}::${size}`;
    const row = byKey.get(key) ?? { ppe_type: e.ppe_type, item_name: e.item_name, size, count: 0, people: [] };
    row.count++;
    row.people.push(e.employee_name);
    byKey.set(key, row);
  });
  return [...byKey.values()].sort((a, b) => b.count - a.count || a.item_name.localeCompare(b.item_name));
}
