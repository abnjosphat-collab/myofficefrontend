// app/ppe/ppeLogic.ts — pure rules for the PPE register: where an item stands against its expiry, who holds what, the due list and its
// filters, the headline counts, the expiry an issue gets from the replacement matrix, and what an issue form must have.
import { addMonths } from '@/lib/dates';
import { SECTION_ORDER, normalizeSection } from '@/lib/sections';
import { isExpired, isExpiringSoon, normalizeEmployeeId } from './calcPPE';
import { NO_TYPE_FILTER, matchesTypeFilter, normalizePpeType, type TypeFilter } from './ppeTypes';
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

/** One entry per person on the register, each with the records stamped with their number; a register person with no PPE
 * gets a blank card. Record ids that match nobody become unmatched pseudo-holders. Records group by normalised id so
 * 'pm453' and 'PM453' never split into two cards. Archived people appear only when they hold something. */
export function groupByEmployee(records: PPERecord[], roster: EmployeeRow[]): EmployeeWithPPE[] {
  const rest = new Map<string, PPERecord[]>();
  for (const r of records) {
    const key = normalizeEmployeeId(r.employee_id);
    const list = rest.get(key);
    if (list) list.push(r); else rest.set(key, [r]);
  }
  const holders: EmployeeWithPPE[] = [];
  for (const e of roster) {
    const key = normalizeEmployeeId(e.employee_id);
    const recs = rest.get(key) ?? [];
    rest.delete(key);
    if (e.archived === true && recs.length === 0) continue;
    const first = recs[0];
    holders.push({
      employee_id: e.employee_id, employee_name: e.employee_name || first?.employee_name || '',
      position: e.position || first?.position || '', section: e.section || first?.mine_section || '',
      archived: e.archived === true, records: recs,
    });
  }
  for (const recs of rest.values()) {
    const first = recs[0];
    holders.push({ employee_id: first.employee_id, employee_name: first.employee_name, position: first.position, section: first.mine_section || '', archived: false, unmatched: true, records: recs });
  }
  return holders.sort((a, b) => a.employee_name.localeCompare(b.employee_name));
}

/** 'none' lists the register people with no PPE at all: the blank cards, for follow-up. */
/** 'premature': people holding an item issued as a premature-failure replacement. */
export type EmployeeView = 'all' | 'active' | 'soon' | 'overdue' | 'none' | 'premature';
export interface EmployeeFilters { view: EmployeeView; section: string; search: string }
export const NO_EMPLOYEE_FILTERS: EmployeeFilters = { view: 'all', section: 'all', search: '' };

export function filterEmployees(list: EmployeeWithPPE[], f: EmployeeFilters): EmployeeWithPPE[] {
  const q = norm(f.search);
  return list.filter(e => {
    if (f.section !== 'all' && normalizeSection(e.section) !== f.section) return false;
    if (f.view === 'active' && !e.records.some(r => r.status === 'active')) return false;
    if (f.view === 'soon' && !e.records.some(r => standing(r) === 'soon')) return false;
    if (f.view === 'overdue' && !e.records.some(r => standing(r) === 'overdue')) return false;
    if (f.view === 'none' && e.records.length > 0) return false;
    if (f.view === 'premature' && !e.records.some(r => r.premature_failure === true)) return false;
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

/** People counts register people (blank cards included); unmatched pseudo-holders are records to fix, not people. */
export function summarise(records: PPERecord[], holders: EmployeeWithPPE[]) {
  const active = records.filter(r => r.status === 'active');
  const has = (s: Standing) => holders.filter(e => e.records.some(r => standing(r) === s)).length;
  return {
    employees: holders.filter(h => h.unmatched !== true).length, active: active.length, soon: active.filter(r => standing(r) === 'soon').length, overdue: active.filter(r => standing(r) === 'overdue').length,
    employeesSoon: has('soon'), employeesOverdue: has('overdue'),
  };
}

export type DueMode = 'overdue' | 'soon';
/** The type lens is page-owned (shared with the basket); the rest stays local to the Due list. */
export interface DueFilters { size: string; search: string; from: string; to: string }
export const NO_DUE_FILTERS: DueFilters = { size: 'all', search: '', from: '', to: '' };
export const sizeOf = (r: Pick<PPERecord, 'size'>) => (r.size || '').trim() || 'Unspecified';

/** Items in the chosen state (before the size choice, so the size list and counts are about what is being looked at), oldest expiry first. */
export function dueItems(records: PPERecord[], mode: DueMode, f: DueFilters, typeFilter: TypeFilter = NO_TYPE_FILTER): PPERecord[] {
  const q = norm(f.search);
  return records.filter(r => {
    if (standing(r) !== mode) return false;
    if (!matchesTypeFilter(r.ppe_type, typeFilter)) return false;
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

/**
 * The record an order-list issue renews: the one the order entry pointed at, when it is still active and belongs to the same person and
 * kind of PPE. It is updated in place (new issue date, expiry from the matrix, size), so it reads "In date" again. It is never marked
 * returned: an item that has worn out or reached its expiry is kept by the person, nobody hands it back. Due or not yet due makes no
 * difference. Anything else (no entry, a record that is gone or closed, another person or kind) is a plain new issue.
 */
export function renewalTarget(records: PPERecord[], orderRecordId: string | null | undefined, issue: Pick<FormState, 'employee_id' | 'ppe_type'>): PPERecord | undefined {
  if (!orderRecordId) return undefined;
  const old = records.find(r => String(r.id) === String(orderRecordId));
  if (!old || old.status !== 'active') return undefined;
  const samePerson = normalizeEmployeeId(old.employee_id) === normalizeEmployeeId(issue.employee_id);
  return samePerson && normalizePpeType(old.ppe_type) === normalizePpeType(issue.ppe_type) ? old : undefined;
}

/** The expiry an item gets: issue date plus the matrix months; empty when the type does not expire or has no matrix entry. */
export function expiryFor(type: string, issued: string, matrix: Record<string, number>): string | undefined {
  const months = matrix[type];
  if (months === undefined || !issued) return undefined;
  return months > 0 ? addMonths(issued, months) : '';
}

/** The person comes only from the register picker (name and position follow the pick; the server stamps them). */
export function formProblems(f: Pick<FormState, 'employee_id' | 'item_name' | 'ppe_type' | 'issue_date' | 'expiry_date'>) {
  const out: Partial<Record<'employee_id' | 'item_name' | 'issue_date' | 'expiry_date', string>> = {};
  if (!f.employee_id.trim()) out.employee_id = 'Pick the person from the register.';
  if (!f.item_name.trim()) out.item_name = 'Enter the item or brand.';
  if (!f.issue_date) out.issue_date = 'Choose the issue date.';
  if (f.expiry_date && f.issue_date && f.expiry_date < f.issue_date) out.expiry_date = 'The expiry cannot be before the issue date.';
  return out;
}

/** How many of these people already hold this kind of PPE issued on this day and still open: the client-side echo of
 * backend/app/ppe_conflicts.py (same person + kind + day, closed ones excluded). A warning only — the server's 409
 * is the refusal, so this never blocks a save. */
const CLOSED_ISSUE = new Set(['returned', 'replaced', 'lost', 'disposed', 'cancelled']);
export function countBulkIssueDupes(records: PPERecord[], ids: string[], ppeType: string, issueDay: string): number {
  const type = (ppeType || '').trim().toLowerCase();
  const day = (issueDay || '').slice(0, 10);
  if (!type || !day) return 0;
  const want = new Set(ids.map(id => normalizeEmployeeId(id)));
  const hit = new Set<string>();
  for (const r of records) {
    const key = normalizeEmployeeId(r.employee_id);
    if (!want.has(key) || hit.has(key)) continue;
    if (CLOSED_ISSUE.has(String(r.status || 'active').toLowerCase())) continue;
    if ((r.ppe_type || '').trim().toLowerCase() === type && (r.issue_date || '').slice(0, 10) === day) hit.add(key);
  }
  return hit.size;
}
