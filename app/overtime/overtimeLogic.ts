// app/overtime/overtimeLogic.ts — pure rules for the overtime page: hours of a record (one definition, used everywhere), the
// register's filters, summaries and month shortcuts, duplicate-slot detection, the tallies behind the insight charts, and the
// weekly summary's view model. The weekly roll-up itself and the reason grouping live in calcOvertime.ts.
import type { EmployeeLookup } from '@/hooks/useLookups';
import { WEEKDAYS } from './overtimeMeta';
import { addDays, buildWeeklyRows, calcHours, groupSimilarReasons, mondayOf, overtimeCostCentre, recordsForEngineeringCostCentreExport, toISODate } from './calcOvertime';
import { OT_TYPES, STATUSES, type OTRecord } from './types';
import { formatMonth } from '@/lib/format';

/** Hours entered directly win; otherwise the length of the start-to-end span. One definition, so the table, detail and totals agree. */
export const recordHours = (r: Pick<OTRecord, 'hours' | 'start_time' | 'end_time'>): number => r.hours ?? calcHours(r.start_time, r.end_time);
export const timeSpan = (r: Pick<OTRecord, 'start_time' | 'end_time'>): string => (r.start_time && r.end_time ? `${r.start_time} to ${r.end_time}` : 'Hours only');
const round1 = (n: number) => Math.round(n * 10) / 10;
const idOf = (r: Pick<OTRecord, 'employee_id' | 'employee_name'>) => r.employee_id || r.employee_name;

export interface OTFilters { search: string; status: string; type: string; from: string; to: string; employeeIds: string[] }
export const NO_FILTERS: OTFilters = { search: '', status: 'all', type: 'all', from: '', to: '', employeeIds: [] };
export const isFiltered = (f: OTFilters) => f.search.trim() !== '' || f.status !== 'all' || f.type !== 'all' || f.from !== '' || f.to !== '' || f.employeeIds.length > 0;

export function filterRecords(records: OTRecord[], f: OTFilters, order: 'asc' | 'desc' = 'desc'): OTRecord[] {
  const q = f.search.trim().toLowerCase();
  const ids = new Set(f.employeeIds);
  return records
    .filter(r => {
      if (f.status !== 'all' && r.status !== f.status) return false;
      if (f.type !== 'all' && r.overtime_type !== f.type) return false;
      if (f.from && r.date < f.from) return false;
      if (f.to && r.date > f.to) return false;
      if (ids.size > 0 && !ids.has(r.employee_id)) return false;
      if (q && ![r.employee_name, r.employee_id, r.reason ?? '', r.position, overtimeCostCentre(r)].some(v => (v || '').toLowerCase().includes(q))) return false;
      return true;
    })
    .sort((a, b) => (order === 'asc' ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date)));
}

export function summarise(records: OTRecord[]) {
  const hours = records.reduce((s, r) => s + recordHours(r), 0);
  return {
    total: records.length, pending: records.filter(r => r.status === 'pending').length, approved: records.filter(r => r.status === 'approved').length,
    hours: round1(hours), employees: new Set(records.map(r => r.employee_id)).size, avgHours: records.length ? round1(hours / records.length) : 0,
  };
}

/** The twelve newest months present in the data, as ready-made date ranges. */
export function monthOptions(records: OTRecord[]) {
  const months = new Set(records.map(r => r.date?.slice(0, 7)).filter((m): m is string => !!m));
  return [...months].sort((a, b) => b.localeCompare(a)).slice(0, 12).map(m => {
    const [y, mo] = m.split('-').map(Number);
    return { key: m, label: formatMonth(new Date(y, mo - 1, 1), 'full'), from: `${m}-01`, to: `${m}-${String(new Date(y, mo, 0).getDate()).padStart(2, '0')}` };
  });
}

/** Another live request for the same person, date and start time. Flagged, not blocked: stacked entries such as a call-out after a shift are real. */
export function findDuplicate(records: OTRecord[], slot: { employee_id: string; date: string; start_time: string }, ignoreId?: number | string): OTRecord | undefined {
  if (!slot.employee_id || !slot.date || !slot.start_time) return undefined;
  return records.find(r => r.id !== ignoreId && r.employee_id === slot.employee_id && r.date === slot.date && r.start_time === slot.start_time && r.status !== 'rejected' && r.status !== 'cancelled');
}
export const countDuplicates = (records: OTRecord[], employeeIds: string[], date: string, start: string) => employeeIds.filter(id => findDuplicate(records, { employee_id: id, date, start_time: start })).length;

// ── Insights tallies (client-side, instant) ───────────────────────────────────────────────────────────────
const KNOWN_SECTIONS = ['Mechanical', 'Electrical', 'Civil', 'Instrumentation'];
/** Section names arrive in mixed case; the same real section must always land in one bucket. */
export function normalizeSection(section?: string): string {
  const s = (section || '').trim();
  return s ? KNOWN_SECTIONS.find(c => c.toLowerCase() === s.toLowerCase()) ?? s : 'Unassigned';
}

export function tally(records: OTRecord[], employees: EmployeeLookup[]) {
  const empById = new Map(employees.map(e => [e.employee_id, e]));
  const byType = OT_TYPES.map(type => ({ type, count: records.filter(r => r.overtime_type === type).length })).filter(x => x.count > 0);
  const byStatus = STATUSES.map(status => ({ status, count: records.filter(r => r.status === status).length })).filter(x => x.count > 0);
  const sections: Record<string, { hours: number; count: number }> = {};
  const artisans = new Map<string, { employee_id: string; employee_name: string; position: string; hours: number; count: number }>();
  const weekday = WEEKDAYS.map(() => ({ hours: 0, count: 0 }));
  let spareCost = 0;
  for (const r of records) {
    const h = recordHours(r);
    const sec = normalizeSection(empById.get(r.employee_id)?.section);
    (sections[sec] ??= { hours: 0, count: 0 }).hours += h; sections[sec].count += 1;
    const a = artisans.get(idOf(r));
    if (a) { a.hours += h; a.count += 1; } else artisans.set(idOf(r), { employee_id: r.employee_id, employee_name: r.employee_name, position: r.position, hours: h, count: 1 });
    if (r.date) { const dow = (new Date(`${r.date}T00:00:00`).getDay() + 6) % 7; weekday[dow].hours += h; weekday[dow].count += 1; }
    spareCost += (r.spares_used || []).reduce((s, sp) => s + (sp.total_cost ?? (sp.unit_price ?? 0) * (sp.quantity ?? 0)), 0);
  }
  const byWeekday = WEEKDAYS.map((day, i) => ({ day, hours: round1(weekday[i].hours), count: weekday[i].count }));
  const busiest = byWeekday.reduce((best, d) => (d.hours > best.hours ? d : best), byWeekday[0]);
  const totalHours = round1(records.reduce((s, r) => s + recordHours(r), 0));
  return {
    byType, byStatus, byWeekday,
    bySection: Object.entries(sections).map(([section, v]) => ({ section, hours: round1(v.hours), count: v.count })),
    byArtisan: [...artisans.values()].sort((a, b) => b.hours - a.hours).slice(0, 8).map(a => ({ ...a, hours: round1(a.hours) })),
    stats: { employees: new Set(records.map(r => r.employee_id)).size, totalHours, avgHours: records.length ? round1(totalHours / records.length) : 0, busiestDay: busiest.hours > 0 ? busiest.day : '', spareCost: Math.round(spareCost) },
  };
}

// ── Weekly summary ────────────────────────────────────────────────────────────────────────────────────────
export type WeeklySort = 'name' | 'total' | 'mineNumber';

/** The most recently completed Monday-to-Sunday week, on any day of the week. */
export function lastCompletedWeek(now = new Date()): { from: string; to: string } {
  const monday = addDays(mondayOf(now), -7);
  return { from: toISODate(monday), to: toISODate(addDays(monday, 6)) };
}

export function weeklyView(records: OTRecord[], employees: EmployeeLookup[], from: string, to: string, sort: WeeklySort) {
  const engineering = recordsForEngineeringCostCentreExport(records);
  const { rows: byName, days } = buildWeeklyRows(engineering, from, to, employees);
  const rows = sort === 'total' ? [...byName].sort((a, b) => b.total - a.total) : sort === 'mineNumber' ? [...byName].sort((a, b) => a.employee_id.localeCompare(b.employee_id, undefined, { numeric: true })) : byName;
  const sum = (pick: (r: (typeof rows)[number]) => number) => rows.reduce((s, r) => s + pick(r), 0);
  // Records with no planning status are shown as Unplanned: "not known to be planned".
  const totals = { all: sum(r => r.total), r15: sum(r => r.total15), r20: sum(r => r.total20), planned: sum(r => r.plannedHours), unplanned: sum(r => r.unplannedHours + r.unclassifiedHours) };
  const dayTotals = days.map(d => { const ds = toISODate(d); return rows.reduce((s, r) => s + (r.byDate.get(ds) || 0), 0); });
  const week = engineering.filter(r => r.date >= from && r.date <= to);
  const people = byName.filter(r => r.total > 0).sort((a, b) => b.total - a.total).map(emp => {
    const instances = week.filter(r => idOf(r) === (emp.employee_id || emp.employee_name)).sort((a, b) => recordHours(b) - recordHours(a));
    return { ...emp, instances, mainCause: groupSimilarReasons(instances)[0] ?? null };
  });
  return { rows, days, dayTotals, totals, people, excluded: records.length - engineering.length, topShare: totals.all > 0 && people[0] ? Math.round((people[0].total / totals.all) * 100) : 0 };
}
