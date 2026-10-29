// app/ppe/calcPPE.ts — the pure expiry/matrix calculations behind the PPE page (status
// badges, KPI tiles, the reorder-by-size breakdown), split out of page.tsx per the
// "extract + test business logic" standard (app/timesheets/calcTotals.ts precedent).
// Previously inline in page.tsx with no test coverage at all.
import { daysUntil } from '@/lib/dates';
import { normalizeSection, SECTION_ORDER } from '@/lib/sections';
import { matchesTypeFilter, normalizePpeType, type TypeFilter } from './ppeTypes';
import type { PPERecord } from './types';

/** Trim + uppercase so PM453 / pm453n match the register. */
export function normalizeEmployeeId(id: string): string {
  return (id || '').trim().toUpperCase();
}

/** Strip stray trailing backticks sometimes saved into free-text name fields. */
export function sanitizeDisplayName(name: string): string {
  return (name || '').replace(/`+$/g, '').trim();
}

export interface EmployeeRegisterRow {
  employee_id: string;
  employee_name: string;
  position?: string;
  section?: string;
  department?: string;
}

export function employeeRegisterById(rows: EmployeeRegisterRow[]): Map<string, EmployeeRegisterRow> {
  const map = new Map<string, EmployeeRegisterRow>();
  rows.forEach(r => {
    if (r.employee_id) map.set(normalizeEmployeeId(r.employee_id), r);
  });
  return map;
}

/** Overlay live personnel-register name/position onto a PPE record for display/export. */
export function enrichPPERecord(record: PPERecord, register: Map<string, EmployeeRegisterRow>): PPERecord {
  const live = register.get(normalizeEmployeeId(record.employee_id));
  if (!live) {
    return { ...record, employee_name: sanitizeDisplayName(record.employee_name) };
  }
  return {
    ...record,
    employee_name: live.employee_name || sanitizeDisplayName(record.employee_name),
    position: live.position || record.position,
    mine_section: live.section || record.mine_section,
    department: live.department || record.department,
  };
}

export function enrichPPERecords(records: PPERecord[], registerRows: EmployeeRegisterRow[]): PPERecord[] {
  const register = employeeRegisterById(registerRows);
  return records.map(r => enrichPPERecord(r, register));
}

// A record with no expiry_date (e.g. gloves, matrix interval 0 = "no expiry") is never
// expiring-soon or expired — there's nothing to count down to.
export const isExpiringSoon = (d?: string | null, days = 30): boolean => {
  if (!d) return false;
  const diff = daysUntil(d);
  return diff > 0 && diff <= days;
};

export const isExpired = (d?: string | null): boolean => {
  if (!d) return false;
  return daysUntil(d) <= 0;
};

// % of active records not yet past their expiry date. null (not 0/100) when there are no
// active records at all — "no data" and "fully compliant" must render differently.
export function computeComplianceRate(records: PPERecord[]): number | null {
  const active = records.filter(r => r.status === 'active');
  if (!active.length) return null;
  return Math.round((active.filter(r => !isExpired(r.expiry_date)).length / active.length) * 100);
}

// Monday-Sunday week boundary — same convention as app/overtime/calcOvertime.ts's
// mondayOf/toISODate (kept here: this file only needs the one "week containing
// this date" shape, not overtime's fuller weekly-rollup toolkit; orderBasket.ts
// reuses these for its week windows). mondayOf takes a Date so it's directly
// testable without faking system time.
export function mondayOf(d: Date): Date {
  const day = d.getDay(); // 0=Sun..6=Sat
  const diff = (day + 6) % 7; // days since the most recent Monday
  const m = new Date(d);
  m.setDate(d.getDate() - diff);
  return m;
}
export const toISODate = (d: Date): string => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

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
// The order "basket": overdue items join on their own (see orderBasket.ts); what
// someone flags by hand — items due later, free lines, exclusions — is kept on
// the server (`/api/ppe-order-list`, see useOrderList), so everyone who signs in
// sees the same list. record_id uniqueness is enforced there at add-time, not here.

export interface OrderListEntry {
  record_id: string;
  employee_id: string; employee_name: string;
  ppe_type: string; item_name: string; size: string;
  /** ISO date from the due record — drives sort/filter in the order list UI. */
  expiry_date?: string | null;
  /** When this entry was flagged for ordering (ISO timestamp). */
  added_at?: string;
  /** What the stored line is: an order line, a free line, or an exclusion. Missing on rows stored before the basket (read as 'line'). */
  kind?: 'line' | 'free' | 'excluded';
  /** Stored lines are always manual; the automatic lines are computed, never stored. Missing on old rows. */
  source?: 'manual';
  /** How many to order (edited on the order list). Missing on old rows: read as 1. */
  qty?: number;
  /** A note for the purchaser. Missing on old rows: read as ''. */
  note?: string;
  /** Where a basket line comes from — display-only, never stored (the server drops it). Set by buildBasket, not by callers. */
  origin?: 'auto' | 'manual' | 'free';
  /** The ordering section (Electrical, Mechanical, ...). Stored only on free lines (chosen when added); on a person's line
   *  buildBasket sets it from the person's current register section, so a section move is never stale on the list. */
  section?: string;
}

export type OrderListSortKey = 'expiry' | 'employee' | 'type' | 'item' | 'added' | 'section';
export type OrderListUrgency = 'all' | 'overdue' | 'soon';

export interface OrderListFilters {
  type?: TypeFilter;
  size?: string;
  /** 'all', or a normalised section name ('Unassigned' for lines with none). */
  section?: string;
  search?: string;
  urgency?: OrderListUrgency;
}

const normSize = (size?: string) => (size || '').trim() || 'Unspecified';

export function filterOrderList<T extends OrderListEntry>(entries: readonly T[], filters: OrderListFilters): T[] {
  const { type, size = 'all', section = 'all', search = '', urgency = 'all' } = filters;
  const q = search.trim().toLowerCase();
  return entries.filter(e => {
    if (type && !matchesTypeFilter(e.ppe_type, type)) return false;
    if (size !== 'all' && normSize(e.size) !== size) return false;
    if (section !== 'all' && normalizeSection(e.section) !== section) return false;
    if (urgency === 'overdue' && !isExpired(e.expiry_date)) return false;
    if (urgency === 'soon' && !(isExpiringSoon(e.expiry_date) && !isExpired(e.expiry_date))) return false;
    if (q) {
      const hay = `${e.employee_name} ${e.item_name} ${e.size} ${e.employee_id}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export function sortOrderList<T extends OrderListEntry>(entries: readonly T[], sortBy: OrderListSortKey, dir: 'asc' | 'desc' = 'asc'): T[] {
  const mul = dir === 'asc' ? 1 : -1;
  const dateKey = (d?: string | null) => (d ? new Date(d).getTime() : Number.MAX_SAFE_INTEGER);
  return [...entries].sort((a, b) => {
    let cmp = 0;
    switch (sortBy) {
      case 'expiry': cmp = dateKey(a.expiry_date) - dateKey(b.expiry_date); break;
      case 'added': cmp = dateKey(a.added_at) - dateKey(b.added_at); break;
      case 'employee': cmp = a.employee_name.localeCompare(b.employee_name); break;
      case 'type': cmp = a.ppe_type.localeCompare(b.ppe_type) || a.item_name.localeCompare(b.item_name); break;
      case 'item': cmp = a.item_name.localeCompare(b.item_name) || normSize(a.size).localeCompare(normSize(b.size)); break;
      case 'section': cmp = compareSections(normalizeSection(a.section), normalizeSection(b.section)) || dateKey(a.expiry_date) - dateKey(b.expiry_date); break;
    }
    return cmp * mul || a.employee_name.localeCompare(b.employee_name);
  });
}

/** True when a newly issued item fulfills an order-list line (same person + type + size). A free line (no person) is never fulfilled by an issue. */
export function orderEntryFulfilled(entry: OrderListEntry, employeeId: string, ppeType: string, size: string): boolean {
  if (!entry.employee_id) return false;
  return entry.employee_id === employeeId
    && normalizePpeType(entry.ppe_type) === normalizePpeType(ppeType)
    && normSize(entry.size) === normSize(size);
}

export interface OrderGroupRow {
  ppe_type: string; item_name: string; size: string;
  /** The section these lines are ordered for; '' when the list is not split by section. */
  section: string;
  count: number; people: string[];
}

/** Section display order: the register's known sections first, then any others A-Z, 'Unassigned' last. */
export function compareSections(a: string, b: string): number {
  const rank = (s: string) => (s === 'Unassigned' ? 1e6 : SECTION_ORDER.includes(s) ? SECTION_ORDER.indexOf(s) : 1e3);
  return rank(a) - rank(b) || a.localeCompare(b);
}

// Groups the order list the way a purchase order actually needs it: "Safety Shoes,
// size 8, qty 3" with who each one is for — not a flat per-person list. Quantities
// add up (a line edited to 4 counts 4); each person is named once no matter how
// many lines they have. Sorted by qty descending (biggest reorder need first),
// then item name for a stable order among ties. `bySection` keeps each section's
// lines apart (Electrical and Mechanical order separately), sections in display order.
export function groupOrderList(entries: OrderListEntry[], { bySection = false }: { bySection?: boolean } = {}): OrderGroupRow[] {
  const byKey = new Map<string, OrderGroupRow>();
  entries.forEach(e => {
    const size = (e.size || '').trim() || 'Unspecified';
    const section = bySection ? normalizeSection(e.section) : '';
    const key = `${section}::${e.ppe_type}::${size}`;
    const row = byKey.get(key) ?? { ppe_type: e.ppe_type, item_name: e.item_name, size, section, count: 0, people: [] };
    row.count += e.qty ?? 1;
    if (e.employee_name && !row.people.includes(e.employee_name)) row.people.push(e.employee_name);
    byKey.set(key, row);
  });
  return [...byKey.values()].sort((a, b) => compareSections(a.section, b.section) || b.count - a.count || a.item_name.localeCompare(b.item_name));
}
