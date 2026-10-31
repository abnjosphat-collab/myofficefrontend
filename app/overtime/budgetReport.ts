// app/overtime/budgetReport.ts — Overtime Split Budget report: forecast average
// monthly overtime hours per employee, in the shape of the FY2027 split-budget
// workbook (one sheet per department, four OT columns). All figures are whole
// numbers (halves round up) and the Comment column is always left blank.
//
// - OT @ 1.5 Shift: from the uploaded monthly NEC timesheet book ("NEC June /
//   July / August 2026" sheets): monthly shift overtime is TOTAL HRS minus T/M
//   Hours, baked as a value; the report averages the months each employee is
//   actually present in (one month of data means that month stands).
// - OT @ 2.0 Shift: from the Overtime module only — weekend and public-holiday
//   overtime (holiday/off-day working), Jul–Sep 2026 total ÷ 3.
// - OT @ 1.5 Adhoc: every other Overtime-module hour (regular, emergency,
//   project, night and any other type), Jul–Sep 2026 total ÷ 3.
// - OT @ 2.0 Adhoc: no source maps to it (holiday/off-day hours all sit in
//   2.0 Shift), so the column stays blank — kept for template fidelity.
// The three sourced columns never mix: book hours never feed an Adhoc or 2.0
// column, and module hours never feed the 1.5 Shift column.
//
// Matching is by employee number (employee_id), normalised with
// normalizeTimesheetEmployeeCode — never by name alone.
import { normalizeTimesheetEmployeeCode } from '../timesheets/employeeCode';
import { OT_TYPE_TO_BUCKET } from '../timesheets/mergeEffectiveTimesheets';
import { calcHours, groupSimilarReasons } from './calcOvertime';
import type { EmployeeLookup } from '@/hooks/useLookups';
import type { OTRecord } from './types';

/** Overtime-module reporting window (inclusive ISO dates). */
export const ADHOC_FROM = '2026-07-01';
export const ADHOC_TO = '2026-09-30';
/** The module window spans exactly three calendar months. */
export const ADHOC_MONTHS = 3;

/**
 * Overtime-module statuses that never count as worked hours: rejected requests
 * were refused, cancelled ones were withdrawn (same convention as summarisePerson
 * in overtimeLogic.ts). Everything else (pending, approved, paid) counts.
 */
export const EXCLUDED_OT_STATUSES = new Set(['rejected', 'cancelled']);

/** Workbook sheets, in template order; 'OTHER' exists only when the register holds a department outside the five. */
export const BUDGET_SHEET_NAMES = ['ENGINEERING', 'MINING', 'MTS', 'PROJECTS', 'SHARED SERVICES'] as const;
export type BudgetSheet = (typeof BUDGET_SHEET_NAMES)[number] | 'OTHER';

/** Canonical Department cell per sheet (the template writes full names, e.g. MINING TECHNICAL SERVICES on MTS). */
export const SHEET_DEPARTMENT_LABEL: Record<string, string> = {
  ENGINEERING: 'ENGINEERING',
  MINING: 'MINING',
  MTS: 'MINING TECHNICAL SERVICES',
  PROJECTS: 'PROJECTS',
  'SHARED SERVICES': 'SHARED SERVICES',
};

/** Register department → workbook sheet. HR/Stores sit under Shared Services, like the template. */
export function sheetForDepartment(department: string): BudgetSheet {
  const d = (department || '').trim().toUpperCase();
  if (d === 'ENGINEERING') return 'ENGINEERING';
  if (d === 'MINING') return 'MINING';
  if (d === 'MTS' || d.includes('TECHNICAL')) return 'MTS';
  if (d === 'PROJECTS') return 'PROJECTS';
  if (d === 'SHARED SERVICES' || d === 'HUMAN RESOURCES' || d === 'STORES' || d === 'HR') return 'SHARED SERVICES';
  return 'OTHER';
}

export interface BudgetEmployee {
  /** Timesheets-table id (the integer `id` from Personnel, as a string). */
  dbId: string;
  /** Unique human employee number, e.g. C1165. */
  employeeId: string;
  firstName: string;
  surname: string;
  occupation: string;
  /** Register section, uppercased like the template's CostCentre values. */
  costCentre: string;
  /** Canonical department label for the Department cell. */
  department: string;
  sheet: BudgetSheet;
  employmentType: 'NEC' | 'SALARIED' | '';
  archived: boolean;
}

/** Personnel rows (raw /api/employees shape) → the register the report runs on. */
export function toBudgetEmployees(lookups: EmployeeLookup[]): BudgetEmployee[] {
  return (lookups ?? [])
    .filter(e => e.archived !== true)
    .map(e => {
      const rawType = String(e.employment_type ?? '').trim().toUpperCase();
      const department = String(e.department || '').trim();
      const sheet = sheetForDepartment(department);
      return {
        dbId: String(e.id ?? ''),
        employeeId: String(e.employee_id || '').trim(),
        firstName: String(e.first_name || '').trim(),
        surname: String(e.last_name || '').trim(),
        occupation: String(e.designation || e.position || '').trim(),
        costCentre: String(e.section || '').trim().toUpperCase(),
        department: SHEET_DEPARTMENT_LABEL[sheet] ?? department.toUpperCase(),
        sheet,
        employmentType: (rawType === 'NEC' || rawType === 'SALARIED' ? rawType : '') as BudgetEmployee['employmentType'],
        archived: false,
      };
    })
    .filter(e => e.dbId !== '' && e.employeeId !== '');
}

export type BudgetStatus = 'OK' | 'Incomplete' | 'Missing' | 'Non-NEC' | 'Unclassified';

/**
 * The report roster is exactly the template ENGINEERING sheet: live register
 * data enriches each row where the employee number matches, and the template's
 * own details stand in otherwise (Unclassified until Personnel confirms them).
 */
export function buildEngineeringRoster(
  register: BudgetEmployee[],
  template: { code: string; firstName: string; surname: string; occupation: string; costCentre: string }[],
): BudgetEmployee[] {
  const byCode = new Map(register.map(e => [normalizeTimesheetEmployeeCode(e.employeeId), e]));
  return template.map(t => {
    const reg = byCode.get(normalizeTimesheetEmployeeCode(t.code));
    if (!reg) {
      return {
        dbId: '', employeeId: t.code.trim(), firstName: t.firstName, surname: t.surname,
        occupation: t.occupation, costCentre: t.costCentre, department: 'ENGINEERING',
        sheet: 'ENGINEERING' as const, employmentType: '' as const, archived: false,
      };
    }
    return {
      ...reg,
      sheet: 'ENGINEERING' as const,
      department: 'ENGINEERING',
      firstName: reg.firstName || t.firstName,
      surname: reg.surname || t.surname,
      occupation: reg.occupation || t.occupation,
      costCentre: reg.costCentre || t.costCentre,
    };
  });
}

export interface BudgetRow {
  employeeId: string;
  firstName: string;
  surname: string;
  occupation: string;
  costCentre: string;
  department: string;
  sheet: BudgetSheet;
  /** Null when the employee has no monthly-book data — never a silent zero. */
  ot15Shift: number | null;
  ot15Adhoc: number;
  ot20Shift: number;
  status: BudgetStatus;
  /** What is driving this person's overtime (top cause + shift); blank when there is nothing to say. */
  comment: string;
}

export interface BudgetTotals {
  employees: number;
  total15Shift: number;
  total15Adhoc: number;
  total20Shift: number;
}

export interface AdhocBuckets {
  /** Weekend + public-holiday module hours → OT @ 2.0 Shift. */
  shift20: { total: number; count: number };
  /** Every other module hour → OT @ 1.5 Adhoc. */
  adhoc15: { total: number; count: number };
}

/** One employee's top overtime cause from free-text reasons (fuzzy-grouped, so "daily check" and "daily checks" count as one). */
export interface AdhocCause {
  label: string;
  /** Whole hours behind the top cause across the reporting window. */
  hours: number;
  /** Whole hours of all that employee's module overtime across the window. */
  total: number;
}

/** Overtime-module hours per employee number, split into the two sourced buckets and deduped by record id. */
export function adhocTotals(
  // overtime_type is a plain string, not OTRecord's union: stored records can
  // hold legacy values the form no longer offers, and they still count as Adhoc.
  records: (Pick<OTRecord, 'id' | 'employee_id' | 'employee_name' | 'date' | 'start_time' | 'end_time' | 'hours' | 'status' | 'reason'> & { overtime_type: string })[],
  employees: BudgetEmployee[],
  from: string = ADHOC_FROM,
  to: string = ADHOC_TO,
): { byKey: Map<string, AdhocBuckets>; causeByKey: Map<string, AdhocCause | null>; orphanCount: number; orphanHours: number } {
  const register = new Set(employees.map(e => normalizeTimesheetEmployeeCode(e.employeeId)));
  const byKey = new Map<string, AdhocBuckets>();
  const recsByKey = new Map<string, OTRecord[]>();
  const blank = (): AdhocBuckets => ({ shift20: { total: 0, count: 0 }, adhoc15: { total: 0, count: 0 } });
  const seenIds = new Set<string>();
  let orphanCount = 0;
  let orphanHours = 0;
  for (const r of records ?? []) {
    const idKey = String(r.id);
    if (seenIds.has(idKey)) continue; // same record fetched twice counts once
    seenIds.add(idKey);
    const [lo, hi] = from <= to ? [from, to] : [to, from];
    if (!r.date || r.date < lo || r.date > hi) continue;
    if (EXCLUDED_OT_STATUSES.has(String(r.status ?? '').trim().toLowerCase())) continue;
    const hours = Math.max(0, r.hours ?? calcHours(r.start_time, r.end_time));
    const key = normalizeTimesheetEmployeeCode(String(r.employee_id || ''));
    if (!key || !register.has(key)) {
      // Eligible-period hours for someone outside the register: flagged, never
      // folded into another employee's row.
      orphanCount += 1;
      orphanHours += hours;
      continue;
    }
    const acc = byKey.get(key) ?? blank();
    const bucket = OT_TYPE_TO_BUCKET[String(r.overtime_type ?? '')] === 'ot20' ? acc.shift20 : acc.adhoc15;
    bucket.total += hours;
    bucket.count += 1;
    byKey.set(key, acc);
    const recs = recsByKey.get(key) ?? [];
    recs.push(r as OTRecord);
    recsByKey.set(key, recs);
  }
  // Reliable zeros: everyone on the register gets an entry even with no records.
  employees.forEach(e => {
    const key = normalizeTimesheetEmployeeCode(e.employeeId);
    if (!byKey.has(key)) byKey.set(key, blank());
  });
  // Top cause per employee from free-text reasons (fuzzy-grouped).
  const causeByKey = new Map<string, AdhocCause | null>();
  for (const [key, recs] of recsByKey) {
    const acc = byKey.get(key)!;
    const total = Math.round(acc.shift20.total + acc.adhoc15.total);
    const top = groupSimilarReasons(recs)[0];
    causeByKey.set(key, top && total > 0 ? { label: top.label, hours: Math.round(top.hours), total } : null);
  }
  return { byKey, causeByKey, orphanCount, orphanHours: Math.round(orphanHours) };
}

/**
 * Comment-cell text: what is driving one person's overtime. Whole hours,
 * cause first, rostered shift second — blank when there is nothing to say.
 */
/**
 * Comment-cell text in plain words: what the person's overtime was made of —
 * the top cause from their overtime reasons, plus rostered shift overtime.
 * No arithmetic: the hour columns already carry the numbers.
 */
export function budgetComment(shift: number | null, cause: AdhocCause | null | undefined): string {
  const plain = (label: string) => {
    const t = label.trim().replace(/\s+/g, ' ');
    return t.length > 60 ? `${t.slice(0, 57)}…` : t;
  };
  const parts: string[] = [];
  if (cause) parts.push(plain(cause.label));
  if (shift != null && shift > 0) parts.push('shift overtime above 208hrs');
  if (parts.length === 0) return '';
  const sentence = parts.join(' and ');
  return sentence.charAt(0).toUpperCase() + sentence.slice(1);
}

function bookStatus(emp: BudgetEmployee, avg: number | null): BudgetStatus {
  // OT @ 1.5 Shift is NEC-only: the books are NEC timesheets and the 208 cap
  // is an NEC rule, so only employees classified as NEC get a value — even if
  // someone else somehow appears on a book sheet.
  if (emp.employmentType === '') return 'Unclassified';
  if (emp.employmentType !== 'NEC') return 'Non-NEC';
  return avg != null ? 'OK' : 'Missing';
}

/** One row per roster employee. The roster itself carries the sheet's exact row
 * order, so this only groups sheets (stable sort) — register values can never
 * scramble the copy-paste alignment. */
export function buildSplitBudgetRows(
  employees: BudgetEmployee[],
  bookAvg: Map<string, number>,
  adhoc: Map<string, AdhocBuckets>,
  causes: Map<string, AdhocCause | null> = new Map(),
  months = ADHOC_MONTHS,
): BudgetRow[] {
  const sheetOrder = (s: BudgetSheet) => {
    const i = BUDGET_SHEET_NAMES.indexOf(s as (typeof BUDGET_SHEET_NAMES)[number]);
    return i < 0 ? BUDGET_SHEET_NAMES.length : i;
  };
  return employees
    .map(emp => {
      const key = normalizeTimesheetEmployeeCode(emp.employeeId);
      // NEC-only: a book average for a non-NEC employee is not shift overtime.
      const shift = emp.employmentType === 'NEC' ? bookAvg.get(key) ?? null : null;
      const ad = adhoc.get(key) ?? { shift20: { total: 0, count: 0 }, adhoc15: { total: 0, count: 0 } };
      return {
        employeeId: emp.employeeId,
        firstName: emp.firstName,
        surname: emp.surname,
        occupation: emp.occupation,
        costCentre: emp.costCentre,
        department: emp.department,
        sheet: emp.sheet,
        ot15Shift: shift,
        ot15Adhoc: Math.round(ad.adhoc15.total / months),
        ot20Shift: Math.round(ad.shift20.total / months),
        status: bookStatus(emp, shift),
        comment: budgetComment(shift, causes.get(key)),
      } satisfies BudgetRow;
    })
    .sort((a, b) => sheetOrder(a.sheet) - sheetOrder(b.sheet));
}

/** Column totals are the sums of the rows' rounded averages — never a workforce-wide average. */
export function budgetTotals(rows: BudgetRow[]): BudgetTotals {
  return {
    employees: rows.length,
    total15Shift: rows.reduce((s, r) => s + (r.ot15Shift ?? 0), 0),
    total15Adhoc: rows.reduce((s, r) => s + r.ot15Adhoc, 0),
    total20Shift: rows.reduce((s, r) => s + r.ot20Shift, 0),
  };
}
