// app/breakdowns/breakdownLogic.ts — the rules behind the breakdowns page that need no screen: reading a record's parts, cost and
// downtime, the filters and sorting, the tile counts, and the form (a blank one, one made from a record, what is missing, and the
// payload sent to the server). Pure, so each is tested without rendering.
import { calcDowntime } from './calcBreakdowns';
import { DEFAULT_DEPARTMENT, OPEN_STATUSES } from './breakdownMeta';
import type { Breakdown, BreakdownFormData, SparePart } from './types';

/** The parts used, whether the server sent a list or a JSON string. */
export function partsOf(b: Pick<Breakdown, 'spares_used'>): SparePart[] {
  const raw = b.spares_used;
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string' && raw.trim()) { try { const parsed = JSON.parse(raw); return Array.isArray(parsed) ? parsed : []; } catch { return []; } }
  return [];
}
/** What the parts cost: the stored line total, or quantity times unit price when a line has no total. */
export const costOf = (b: Pick<Breakdown, 'spares_used'>): number => partsOf(b).reduce((sum, s) => sum + (Number(s.total_cost) || (Number(s.quantity) || 0) * (Number(s.unit_price) || 0)), 0);
export const downtimeOf = (b: Pick<Breakdown, 'breakdown_start' | 'breakdown_end'>): number => calcDowntime(b.breakdown_start, b.breakdown_end);
export const repairOf = (b: Pick<Breakdown, 'work_start' | 'work_end'>): number => calcDowntime(b.work_start, b.work_end);
export const isOpen = (b: Pick<Breakdown, 'status'>): boolean => OPEN_STATUSES.includes(b.status);
const day = (d?: string | null) => (d ?? '').slice(0, 10);

export interface Filters { search: string; status: string; type: string; priority: string; department: string; location: string; from: string; to: string }
export const ALL = 'all';
export const OPEN = 'open';
export const NO_FILTERS: Filters = { search: '', status: ALL, type: ALL, priority: ALL, department: ALL, location: ALL, from: '', to: '' };
export const isFiltered = (f: Filters): boolean => (Object.keys(NO_FILTERS) as (keyof Filters)[]).some(k => f[k] !== NO_FILTERS[k]);

export function filterBreakdowns(list: Breakdown[], f: Filters): Breakdown[] {
  const q = f.search.trim().toLowerCase();
  return list.filter(b => {
    if (f.status === OPEN ? !isOpen(b) : f.status !== ALL && b.status !== f.status) return false;
    if (f.type !== ALL && b.breakdown_type !== f.type) return false;
    if (f.priority !== ALL && b.priority !== f.priority) return false;
    if (f.department !== ALL && b.department !== f.department) return false;
    if (f.location !== ALL && b.location !== f.location) return false;
    if (f.from && day(b.breakdown_date) < f.from) return false;
    if (f.to && day(b.breakdown_date) > f.to) return false;
    if (!q) return true;
    return [b.machine_name, b.machine_id, b.breakdown_description, b.artisan_name, b.location, b.breakdown_nature, b.work_done].some(v => (v ?? '').toLowerCase().includes(q));
  });
}

export type SortKey = 'date' | 'machine' | 'status' | 'priority' | 'downtime' | 'cost';
const RANK_PRIORITY = ['critical', 'high', 'medium', 'low'];
const RANK_STATUS = ['logged', 'in_progress', 'resolved', 'closed', 'cancelled'];
const rank = (order: string[], v: string) => { const i = order.indexOf(v); return i === -1 ? order.length : i; };
export function sortBreakdowns(list: Breakdown[], key: SortKey, dir: 'asc' | 'desc'): Breakdown[] {
  const value = (b: Breakdown): number | string => {
    switch (key) {
      case 'date': return day(b.breakdown_date);
      case 'machine': return (b.machine_name ?? '').toLowerCase();
      case 'status': return rank(RANK_STATUS, b.status);
      case 'priority': return rank(RANK_PRIORITY, b.priority);
      case 'downtime': return downtimeOf(b);
      case 'cost': return costOf(b);
    }
  };
  const sign = dir === 'asc' ? 1 : -1;
  // Ties fall back to the newest first, so equal rows do not shuffle between renders.
  return [...list].sort((a, b) => {
    const x = value(a), y = value(b);
    const cmp = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y));
    return cmp !== 0 ? cmp * sign : day(b.breakdown_date).localeCompare(day(a.breakdown_date)) || (b.id ?? 0) - (a.id ?? 0);
  });
}

export interface Summary { total: number; open: number; critical: number; avgDowntimeMinutes: number | null; avgDowntimeCount: number }
/** Counts for the tiles. The average is over finished breakdowns that have times recorded; it is null (not zero) when there are none. */
export function summarise(list: Breakdown[]): Summary {
  const timed = list.filter(b => (b.status === 'resolved' || b.status === 'closed') && downtimeOf(b) > 0);
  return {
    total: list.length,
    open: list.filter(isOpen).length,
    critical: list.filter(b => b.priority === 'critical').length,
    avgDowntimeMinutes: timed.length ? Math.round(timed.reduce((s, b) => s + downtimeOf(b), 0) / timed.length) : null,
    avgDowntimeCount: timed.length,
  };
}

export const distinct = (list: Breakdown[], pick: (b: Breakdown) => string | undefined): string[] => [...new Set(list.map(pick).map(v => (v ?? '').trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));

export const emptyForm = (today: string): BreakdownFormData => ({
  machine_id: '', machine_name: '', breakdown_description: '', artisan_name: '', breakdown_date: today, location: '', department: DEFAULT_DEPARTMENT, breakdown_type: 'mechanical', breakdown_nature: '',
  work_done: '', artisan_recommendations: '', status: 'logged', priority: 'medium', breakdown_start: '', breakdown_end: '', work_start: '', work_end: '', spares_used: [],
});
export const formFromRecord = (b: Breakdown, today: string): BreakdownFormData => ({
  machine_id: b.machine_id || '', machine_name: b.machine_name || '', breakdown_description: b.breakdown_description || b.machine_description || '', artisan_name: b.artisan_name || '',
  breakdown_date: day(b.breakdown_date) || today, location: b.location || '', department: b.department || DEFAULT_DEPARTMENT, breakdown_type: b.breakdown_type || 'mechanical', breakdown_nature: b.breakdown_nature || '',
  work_done: b.work_done || '', artisan_recommendations: b.artisan_recommendations || '', status: b.status || 'logged', priority: b.priority || 'medium',
  breakdown_start: (b.breakdown_start || '').slice(0, 5), breakdown_end: (b.breakdown_end || '').slice(0, 5), work_start: (b.work_start || '').slice(0, 5), work_end: (b.work_end || '').slice(0, 5), spares_used: partsOf(b),
});

export type FormProblems = Partial<Record<'machine_name' | 'machine_id' | 'breakdown_description' | 'artisan_name' | 'location' | 'department' | 'breakdown_date' | 'breakdown_end' | 'work_end', string>>;
/** What stops a save. The server also requires the machine ID, which the old form called optional and then refused with a bare error. */
export function formProblems(f: BreakdownFormData): FormProblems {
  const p: FormProblems = {};
  if (!f.machine_name.trim()) p.machine_name = 'Enter the machine name.';
  if (!f.machine_id.trim()) p.machine_id = 'Enter the machine ID (it is filled in when you pick the machine from the register).';
  if (!f.breakdown_description.trim()) p.breakdown_description = 'Describe what happened.';
  if (!f.artisan_name.trim()) p.artisan_name = 'Enter the artisan.';
  if (!f.location.trim()) p.location = 'Enter where it happened.';
  if (!f.department.trim()) p.department = 'Enter the department.';
  if (!f.breakdown_date) p.breakdown_date = 'Enter the date.';
  if (f.breakdown_start && !f.breakdown_end) p.breakdown_end = 'Enter when the breakdown ended, or clear the start.';
  if (f.work_start && !f.work_end) p.work_end = 'Enter when the work ended, or clear the start.';
  return p;
}

/** The body sent on create and edit. The nature is included (the old payload dropped it, so it was never saved); blank times are sent
 *  as empty strings so an edit can clear them. */
export function toPayload(f: BreakdownFormData) {
  return {
    machine_id: f.machine_id.trim(), machine_name: f.machine_name.trim(), breakdown_description: f.breakdown_description.trim(), machine_description: f.breakdown_description.trim(),
    artisan_name: f.artisan_name.trim(), breakdown_date: f.breakdown_date, location: f.location.trim(), department: f.department.trim(), breakdown_type: f.breakdown_type || 'mechanical',
    breakdown_nature: f.breakdown_nature.trim(), work_done: f.work_done, artisan_recommendations: f.artisan_recommendations, status: f.status || 'logged', priority: f.priority || 'medium',
    breakdown_start: f.breakdown_start, breakdown_end: f.breakdown_end, work_start: f.work_start, work_end: f.work_end,
    spares_used: f.spares_used.map(s => { const quantity = Math.max(1, Math.round(Number(s.quantity) || 1)); const unit_price = Math.max(0, Number(s.unit_price) || 0); return { name: s.name, part_number: s.part_number || '', quantity, unit_price, total_cost: quantity * unit_price }; }),
  };
}

/** Downtime shown live in the form while the times are typed (null until both are in). */
export const previewDowntime = (start: string, end: string): number | null => (start && end ? calcDowntime(start, end) : null);
