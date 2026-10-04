// app/ppe/ppeLogic.ts — pure rules for the PPE register: where an item stands against its expiry, who holds what, the due list and its
// filters, the headline counts, the expiry an issue gets from the replacement matrix, and what an issue form must have.
import { addMonths } from '@/lib/dates';
import { SECTION_ORDER, normalizeSection } from '@/lib/sections';
import { isExpired, isExpiringSoon, normalizeEmployeeId } from './calcPPE';
import type { EmployeeRow, EmployeeWithPPE, FormState, PPERecord } from './types';

export type Standing = 'overdue' | 'soon' | 'ok' | 'none';
/** Past its expiry (today counts), within 30 days of it, in date, or without an expiry. Only active items stand anywhere; the rest are 'none'. */
export function standing(r: Pick<PPERecord, 'status' | 'expiry_date'>): Standing {
  if (r.status !== 'active') return 'none';
  if (!r.expiry_date) return 'ok';
  if (isExpired(r.expiry_date)) return 'overdue';
  return isExpiringSoon(r.expiry_date) ? 'soon' : 'ok';
}
export const STANDING_LABEL: Record<Standing, string> = { overdue: 'Overdue', soon: 'Expiring soon', ok: 'In date', none: '' };

const norm = (v?: string) => (v ?? '').trim().replace(/\s+/g, ' ').toLowerCase();

/** One entry per person who holds anything, with the section taken from the live roster when they are on it. */
export function groupByEmployee(records: PPERecord[], roster: EmployeeRow[]): EmployeeWithPPE[] {
  const live = new Map(roster.map(e => [normalizeEmployeeId(e.employee_id), e]));
  const map = new Map<string, EmployeeWithPPE>();
  for (const r of records) {
    if (!map.has(r.employee_id)) map.set(r.employee_id, { employee_id: r.employee_id, employee_name: r.employee_name, position: r.position, section: live.get(normalizeEmployeeId(r.employee_id))?.section || r.mine_section || '', records: [] });
    map.get(r.employee_id)!.records.push(r);
  }
  return [...map.values()].sort((a, b) => a.employee_name.localeCompare(b.employee_name));
}

/** The people who can be chosen on an issue: the roster, plus anyone who already holds PPE but is not on it. */
export function selectableEmployees(roster: EmployeeRow[], holders: EmployeeWithPPE[]): EmployeeRow[] {
  const map = new Map<string, EmployeeRow>();
  roster.forEach(e => map.set(e.employee_id, e));
  holders.forEach(h => { if (!map.has(h.employee_id)) map.set(h.employee_id, { employee_id: h.employee_id, employee_name: h.employee_name, position: h.position, department: '', section: h.section }); });
  return [...map.values()].sort((a, b) => a.employee_name.localeCompare(b.employee_name));
}

export type EmployeeView = 'all' | 'active' | 'soon' | 'overdue';
export interface EmployeeFilters { view: EmployeeView; section: string; search: string }
export const NO_EMPLOYEE_FILTERS: EmployeeFilters = { view: 'all', section: 'all', search: '' };

export function filterEmployees(list: EmployeeWithPPE[], f: EmployeeFilters): EmployeeWithPPE[] {
  const q = norm(f.search);
  return list.filter(e => {
    if (f.section !== 'all' && normalizeSection(e.section) !== f.section) return false;
    if (f.view === 'active' && !e.records.some(r => r.status === 'active')) return false;
    if (f.view === 'soon' && !e.records.some(r => standing(r) === 'soon')) return false;
    if (f.view === 'overdue' && !e.records.some(r => standing(r) === 'overdue')) return false;
    return !q || [e.employee_name, e.employee_id, e.position].some(v => norm(v).includes(q));
  });
}

/** The sections that have someone in them, in the mine's order, Unassigned last, each with its head count. */
export function sectionCounts(list: EmployeeWithPPE[]): [string, number][] {
  const counts = new Map<string, number>();
  list.forEach(e => { const s = normalizeSection(e.section); counts.set(s, (counts.get(s) ?? 0) + 1); });
  const ordered = SECTION_ORDER.filter(s => counts.has(s)).map(s => [s, counts.get(s)!] as [string, number]);
  const rest = [...counts.keys()].filter(s => !SECTION_ORDER.includes(s) && s !== 'Unassigned').sort().map(s => [s, counts.get(s)!] as [string, number]);
  return [...ordered, ...rest, ...(counts.has('Unassigned') ? [['Unassigned', counts.get('Unassigned')!] as [string, number]] : [])];
}

export function summarise(records: PPERecord[], holders: EmployeeWithPPE[]) {
  const active = records.filter(r => r.status === 'active');
  const has = (s: Standing) => holders.filter(e => e.records.some(r => standing(r) === s)).length;
  return {
    employees: holders.length, active: active.length, soon: active.filter(r => standing(r) === 'soon').length, overdue: active.filter(r => standing(r) === 'overdue').length,
    employeesSoon: has('soon'), employeesOverdue: has('overdue'),
  };
}

export type DueMode = 'overdue' | 'soon';
export interface DueFilters { type: string; size: string; search: string; from: string; to: string }
export const NO_DUE_FILTERS: DueFilters = { type: 'all', size: 'all', search: '', from: '', to: '' };
export const sizeOf = (r: Pick<PPERecord, 'size'>) => (r.size || '').trim() || 'Unspecified';

/** Items in the chosen state (before the size choice, so the size list and counts are about what is being looked at), oldest expiry first. */
export function dueItems(records: PPERecord[], mode: DueMode, f: DueFilters): PPERecord[] {
  const q = norm(f.search);
  return records.filter(r => {
    if (standing(r) !== mode) return false;
    if (f.type !== 'all' && r.ppe_type !== f.type) return false;
    if (f.from && (!r.expiry_date || r.expiry_date < f.from)) return false;
    if (f.to && (!r.expiry_date || r.expiry_date > f.to)) return false;
    return !q || norm(r.employee_name).includes(q) || norm(r.item_name).includes(q);
  }).sort((a, b) => (a.expiry_date ?? '').localeCompare(b.expiry_date ?? ''));
}
export const sizeCounts = (items: PPERecord[]): [string, number][] => {
  const m = new Map<string, number>();
  items.forEach(r => m.set(sizeOf(r), (m.get(sizeOf(r)) ?? 0) + 1));
  return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
};

/** The expiry an item gets: issue date plus the matrix months; empty when the type does not expire or has no matrix entry. */
export function expiryFor(type: string, issued: string, matrix: Record<string, number>): string | undefined {
  const months = matrix[type];
  if (months === undefined || !issued) return undefined;
  return months > 0 ? addMonths(issued, months) : '';
}

export function formProblems(f: Pick<FormState, 'employee_id' | 'employee_name' | 'position' | 'item_name' | 'ppe_type' | 'issue_date' | 'expiry_date'>) {
  const out: Partial<Record<'employee_id' | 'employee_name' | 'position' | 'item_name' | 'issue_date' | 'expiry_date', string>> = {};
  if (!f.employee_id.trim()) out.employee_id = 'Enter the employee ID.';
  if (!f.employee_name.trim()) out.employee_name = 'Enter the employee name.';
  if (!f.position.trim()) out.position = 'Enter the position.';
  if (!f.item_name.trim()) out.item_name = 'Enter the item or brand.';
  if (!f.issue_date) out.issue_date = 'Choose the issue date.';
  if (f.expiry_date && f.issue_date && f.expiry_date < f.issue_date) out.expiry_date = 'The expiry cannot be before the issue date.';
  return out;
}
