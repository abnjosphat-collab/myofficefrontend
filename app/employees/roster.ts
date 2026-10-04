// app/employees/roster.ts — pure rules for the personnel register: how long someone has served, the section and trade groups the cards
// are shown in (and exported in), the filters and sort, the headline counts, and the form's validation. The catalogue of designations
// and sections lives in lib/employeeCatalog.ts and lib/sections.ts.
import type { Tone } from '@/components/ui-system';
import {
  ARTISAN_FILTER_VALUE, ARTISAN_SUBCATEGORY, FOREMAN_SUBCATEGORY, isArtisanClass1Designation, normalizeDesignation, rosterSubgroupLabel,
} from '@/lib/employeeCatalog';
import { SECTION_ORDER, normalizeSection } from '@/lib/sections';
import type { Employee, EmployeeFormData, SectionGroup, SortDir, SortField } from './types';

export const CLASS_OPTIONS = ['Permanent', 'Contract', 'Internship', 'Part-Time'] as const;
export const CLASS_TONE: Record<string, Tone> = { Permanent: 'success', Contract: 'warning', Internship: 'info', 'Part-Time': 'brand' };
export const ETYPE_TONE: Record<string, Tone> = { NEC: 'info', SALARIED: 'brand' };
export const ETYPE_LABEL: Record<string, string> = { NEC: 'NEC', SALARIED: 'Salaried' };
export const fullName = (e: Pick<Employee, 'first_name' | 'last_name'>) => `${e.first_name} ${e.last_name}`.trim();

/** Whole years and months since engagement (a month counts once its day has come round), as "3y 4m"; "Less than a month" for a new start; empty when there is no valid date. */
export function tenure(engaged?: string, now = new Date()): string {
  if (!engaged) return '';
  const s = new Date(engaged);
  if (isNaN(s.getTime())) return '';
  let y = now.getFullYear() - s.getFullYear(), m = now.getMonth() - s.getMonth() - (now.getDate() < s.getDate() ? 1 : 0);
  if (m < 0) { y -= 1; m += 12; }
  if (y < 0) return '';
  if (y === 0 && m === 0) return 'Less than a month';
  return [y > 0 && `${y}y`, m > 0 && `${m}m`].filter(Boolean).join(' ');
}

/**
 * Section, then trade: sections in the mine's own order (Unassigned last), trades alphabetically with Artisan and Foreman first, so a trade
 * and its assistants sit together. The on-screen groups and the exports use this one function so they can never disagree.
 */
export function groupBySectionAndProfession(list: Employee[], colorOf: (section: string) => string = () => ''): SectionGroup[] {
  const map = new Map<string, Employee[]>();
  for (const e of list) { const key = normalizeSection(e.section); (map.get(key) ?? map.set(key, []).get(key)!).push(e); }
  const rank = (k: string) => (k === 'Unassigned' ? 999 : SECTION_ORDER.indexOf(k) === -1 ? 500 : SECTION_ORDER.indexOf(k));
  return [...map.keys()].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b)).map(section => {
    const members = map.get(section)!;
    const subMap = new Map<string, Employee[]>();
    for (const e of members) { const k = rosterSubgroupLabel(e.designation); (subMap.get(k) ?? subMap.set(k, []).get(k)!).push(e); }
    const subgroups = [...subMap.keys()].sort((a, b) => {
      if (a === ARTISAN_SUBCATEGORY) return -1;
      if (b === ARTISAN_SUBCATEGORY) return 1;
      if (a === FOREMAN_SUBCATEGORY) return -1;
      if (b === FOREMAN_SUBCATEGORY) return 1;
      if (a === 'Other') return 1;
      if (b === 'Other') return -1;
      return a.localeCompare(b);
    }).map(designation => ({ designation, employees: subMap.get(designation)! }));
    return { section, color: colorOf(section), employees: members, subgroups, hasMeaningfulSubgroups: subgroups.length > 1 && subgroups.some(sg => sg.employees.length > 1) };
  });
}

/** Trade only, ignoring section: every Rigger together wherever they work. */
export function groupByProfession(list: Employee[]): { designation: string; employees: Employee[] }[] {
  const map = new Map<string, Employee[]>();
  for (const e of list) { const k = normalizeDesignation(e.designation) || 'Unclassified'; (map.get(k) ?? map.set(k, []).get(k)!).push(e); }
  return [...map.keys()].sort((a, b) => (a === 'Unclassified' ? 1 : b === 'Unclassified' ? -1 : a.localeCompare(b))).map(designation => ({ designation, employees: map.get(designation)! }));
}

export interface RosterFilters { search: string; cls: string; etype: string; section: string; role: string; show: 'active' | 'archived' | 'all' }
export const NO_FILTERS: RosterFilters = { search: '', cls: 'all', etype: 'all', section: 'all', role: 'all', show: 'active' };
export const isFiltered = (f: RosterFilters) => f.search.trim() !== '' || f.cls !== 'all' || f.etype !== 'all' || f.section !== 'all' || f.role !== 'all' || f.show !== 'active';
export const artisansOnly = (f: RosterFilters) => f.role === ARTISAN_FILTER_VALUE;

export function filterEmployees(list: Employee[], f: RosterFilters): Employee[] {
  const s = f.search.trim().toLowerCase();
  return list.filter(e => {
    if (f.show === 'active' ? e.archived === true : f.show === 'archived' ? e.archived !== true : false) return false;
    if (s && ![fullName(e), e.employee_id, e.designation, normalizeDesignation(e.designation), e.id_number, e.section].some(v => (v ?? '').toLowerCase().includes(s))) return false;
    if (f.cls !== 'all' && (e.employee_class || 'Unclassified') !== f.cls) return false;
    if (f.etype !== 'all' && (e.employment_type || '') !== f.etype) return false;
    if (f.section !== 'all' && normalizeSection(e.section) !== f.section) return false;
    if (f.role === ARTISAN_FILTER_VALUE) return isArtisanClass1Designation(e.designation);
    if (f.role !== 'all' && normalizeDesignation(e.designation) !== f.role && (e.designation || '').trim() !== f.role) return false;
    return true;
  });
}

export function sortEmployees(list: Employee[], by: SortField, dir: SortDir): Employee[] {
  const key = (e: Employee): string => (by === 'first_name' ? fullName(e).toLowerCase() : by === 'section' ? normalizeSection(e.section) : by === 'date_of_engagement' ? e.date_of_engagement || '' : ((e[by] as string) || '').toLowerCase());
  const sign = dir === 'asc' ? 1 : -1;
  return [...list].sort((a, b) => { const x = key(a), y = key(b); return x === y ? 0 : (x > y ? 1 : -1) * sign; });
}

export function summarise(list: Employee[]) {
  const active = list.filter(e => e.archived !== true);
  return {
    total: active.length, archived: list.length - active.length, nec: active.filter(e => e.employment_type === 'NEC').length, salaried: active.filter(e => e.employment_type === 'SALARIED').length,
    permanent: active.filter(e => e.employee_class === 'Permanent').length, artisans: active.filter(e => isArtisanClass1Designation(e.designation)).length,
  };
}

/** What is missing before an employee can be saved, one reason per field. */
export function formProblems(f: Pick<EmployeeFormData, 'employee_id' | 'first_name' | 'last_name' | 'id_number' | 'designation'>): Partial<Record<'employee_id' | 'first_name' | 'last_name' | 'id_number' | 'designation', string>> {
  const out: Partial<Record<'employee_id' | 'first_name' | 'last_name' | 'id_number' | 'designation', string>> = {};
  if (!f.employee_id.trim()) out.employee_id = 'Enter the mine number.';
  if (!f.first_name.trim()) out.first_name = 'Enter the first name.';
  if (!f.last_name.trim()) out.last_name = 'Enter the last name.';
  if (!f.id_number.trim()) out.id_number = 'Enter the national ID or passport number.';
  if (!f.designation.trim()) out.designation = 'Choose the designation.';
  return out;
}
