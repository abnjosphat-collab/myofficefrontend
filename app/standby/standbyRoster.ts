// app/standby/standbyRoster.ts — the rotation math behind the standby board: which
// member holds a given date, the stint around it, the upcoming sequence, and which
// duty officials cover a date. Pure, so each is tested. All date math runs in UTC
// so a stint boundary never shifts with daylight saving.
import type { DutyEntry, RotationMember, StandbyRotation } from './types';

/** The calendar-day part of a date value, tolerant of datetime suffixes. */
export function dayPart(value: string | undefined | null): string {
  return (value ?? '').slice(0, 10);
}

/** Employee numbers match loosely — a code typed with a stray space or different case is still the same person. */
export function sameEmployee(a: string | undefined | null, b: string | undefined | null): boolean {
  return (a ?? '').trim().toUpperCase() === (b ?? '').trim().toUpperCase();
}

function toUTC(dateStr: string): number {
  const [y, m, d] = dateStr.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

function fromUTC(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/** Whole days from `fromStr` to `toStr` (negative when `toStr` is earlier). */
export function diffDays(fromStr: string, toStr: string): number {
  return Math.round((toUTC(dayPart(toStr)) - toUTC(dayPart(fromStr))) / 86400000);
}

export function addDays(dateStr: string, delta: number): string {
  return fromUTC(toUTC(dayPart(dateStr)) + delta * 86400000);
}

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

function rotationShape(rotation: StandbyRotation): { members: RotationMember[]; weekLen: number; start: string } | null {
  const members = rotation.members ?? [];
  const weekLen = rotation.week_length_days || 0;
  const start = dayPart(rotation.cycle_start_date);
  if (members.length === 0 || weekLen < 1 || !DAY_RE.test(start)) return null;
  return { members, weekLen, start };
}

/** Stint number holding `dateStr`, counting from 0 at the cycle start (negative before it). */
function stintNumber(rotation: StandbyRotation, dateStr: string): number | null {
  const shape = rotationShape(rotation);
  if (!shape) return null;
  return Math.floor(diffDays(shape.start, dayPart(dateStr)) / shape.weekLen);
}

/** True once the rotation's first stint has begun — before that nobody holds anything yet. */
export function rotationStartedOn(rotation: StandbyRotation, dateStr: string): boolean {
  const n = stintNumber(rotation, dateStr);
  return n !== null && n >= 0;
}

/** Which member index holds `dateStr`, or null when nobody does (bad shape, or before the start). */
export function holderIndexOn(rotation: StandbyRotation, dateStr: string): number | null {
  const shape = rotationShape(rotation);
  const n = stintNumber(rotation, dateStr);
  if (!shape || n === null || n < 0) return null;
  return ((n % shape.members.length) + shape.members.length) % shape.members.length;
}

export function holderOn(rotation: StandbyRotation, dateStr: string): RotationMember | null {
  const shape = rotationShape(rotation);
  const i = holderIndexOn(rotation, dateStr);
  if (!shape || i === null) return null;
  return shape.members[i];
}

export interface Stint { start: string; end: string; index: number; member: RotationMember }

/** The stint containing `dateStr`: its dates and who holds it. Null before the start. */
export function stintOn(rotation: StandbyRotation, dateStr: string): Stint | null {
  const shape = rotationShape(rotation);
  const n = stintNumber(rotation, dateStr);
  if (!shape || n === null || n < 0) return null;
  const start = addDays(shape.start, n * shape.weekLen);
  const index = ((n % shape.members.length) + shape.members.length) % shape.members.length;
  return { start, end: addDays(start, shape.weekLen - 1), index, member: shape.members[index] };
}

/** `count` stints from the one containing `fromStr` — the rotation sequence strip. */
export function stintsFrom(rotation: StandbyRotation, fromStr: string, count: number): Stint[] {
  const shape = rotationShape(rotation);
  const n = stintNumber(rotation, dateStrClamped(rotation, fromStr));
  if (!shape || n === null || count <= 0) return [];
  // A strip requested before the start begins at the first stint instead.
  const first = Math.max(n, 0);
  return Array.from({ length: count }, (_, k) => {
    const at = first + k;
    const start = addDays(shape.start, at * shape.weekLen);
    const index = ((at % shape.members.length) + shape.members.length) % shape.members.length;
    return { start, end: addDays(start, shape.weekLen - 1), index, member: shape.members[index] };
  });
}

function dateStrClamped(rotation: StandbyRotation, dateStr: string): string {
  const shape = rotationShape(rotation);
  if (!shape) return dateStr;
  const day = dayPart(dateStr);
  return day < shape.start ? shape.start : day;
}

/** Duty officials covering one day — mine-wide first, then by department name. */
export function officialsOn(entries: DutyEntry[], dateStr: string): DutyEntry[] {
  const day = dayPart(dateStr);
  return entries
    .filter(e => day >= dayPart(e.date_from) && day <= dayPart(e.date_to))
    .sort((a, b) => (a.department ? 1 : 0) - (b.department ? 1 : 0) || (a.department || '').localeCompare(b.department || ''));
}

/** Distinct officials intersecting a date range, each with the days they cover inside it. */
export function officialsOverRange(entries: DutyEntry[], fromStr: string, toStr: string): { entry: DutyEntry; from: string; to: string }[] {
  const from = dayPart(fromStr);
  const to = dayPart(toStr);
  return entries
    .filter(e => dayPart(e.date_from) <= to && dayPart(e.date_to) >= from)
    .map(e => ({
      entry: e,
      from: dayPart(e.date_from) < from ? from : dayPart(e.date_from),
      to: dayPart(e.date_to) > to ? to : dayPart(e.date_to),
    }))
    .sort((a, b) => a.from.localeCompare(b.from) || (a.entry.department ? 1 : 0) - (b.entry.department ? 1 : 0));
}

export interface EmployeeContact {
  employee_id?: string;
  phone?: string;
  address?: string;
  section?: string;
  department?: string;
}

/** Freshest phone for a rotation member: the employee register wins over the stored snapshot. */
export function resolvePhone(
  snapshot: string | null | undefined,
  employees: EmployeeContact[],
  employeeId: string,
): string {
  const live = employees.find(e => sameEmployee(e.employee_id, employeeId))?.phone?.trim();
  return live || (snapshot || '').trim();
}

/** Where this person works: rotation section first, then the register's section and department. */
export function workLocation(
  rotationSection: string | null | undefined,
  employees: EmployeeContact[],
  employeeId: string,
): string {
  const found = employees.find(e => sameEmployee(e.employee_id, employeeId));
  return [rotationSection || found?.section, found?.department].filter(Boolean).join(' · ');
}
