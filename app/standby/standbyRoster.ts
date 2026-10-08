// app/standby/standbyRoster.ts — the rotation math behind the standby board: which
// member holds a given date, the stint around it, the upcoming sequence, who
// covers for whom, and which duty officials answer on a date. Pure, so each is
// tested. Cycle math runs in UTC so a stint boundary never shifts with daylight
// saving; the month grid works in local day integers, never round-tripping
// through a timezone. Standby and duty rotations share one cycle shape, so the
// stint functions are generic over it.
import type { LeaveRecord } from '@/app/shifts/types';
import type {
  CrewMember, DutyEntry, DutyRotation, RotationCover, RotationKind, RotationMember,
} from './types';

/** Whatever a rotation cycles through: standby leads (with crew) or duty officials. */
export interface CycleMember {
  employee_id: string;
  employee_name: string;
  phone?: string | null;
  designation?: string | null;
}

export interface CycledRotation<M extends CycleMember = CycleMember> {
  members: M[];
  week_length_days: number;
  cycle_start_date: string;
}

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

function rotationShape<M extends CycleMember>(rotation: CycledRotation<M>): { members: M[]; weekLen: number; start: string } | null {
  const members = rotation.members ?? [];
  const weekLen = rotation.week_length_days || 0;
  const start = dayPart(rotation.cycle_start_date);
  if (members.length === 0 || weekLen < 1 || !DAY_RE.test(start)) return null;
  return { members, weekLen, start };
}

/** Stint number holding `dateStr`, counting from 0 at the cycle start (negative before it). */
function stintNumber<M extends CycleMember>(rotation: CycledRotation<M>, dateStr: string): number | null {
  const shape = rotationShape(rotation);
  if (!shape) return null;
  return Math.floor(diffDays(shape.start, dayPart(dateStr)) / shape.weekLen);
}

/** True once the rotation's first stint has begun — before that nobody holds anything yet. */
export function rotationStartedOn<M extends CycleMember>(rotation: CycledRotation<M>, dateStr: string): boolean {
  const n = stintNumber(rotation, dateStr);
  return n !== null && n >= 0;
}

/** Which member index holds `dateStr`, or null when nobody does (bad shape, or before the start). */
export function holderIndexOn<M extends CycleMember>(rotation: CycledRotation<M>, dateStr: string): number | null {
  const shape = rotationShape(rotation);
  const n = stintNumber(rotation, dateStr);
  if (!shape || n === null || n < 0) return null;
  return ((n % shape.members.length) + shape.members.length) % shape.members.length;
}

export function holderOn<M extends CycleMember>(rotation: CycledRotation<M>, dateStr: string): M | null {
  const shape = rotationShape(rotation);
  const i = holderIndexOn(rotation, dateStr);
  if (!shape || i === null) return null;
  return shape.members[i];
}

export interface Stint<M extends CycleMember = CycleMember> { start: string; end: string; index: number; member: M }

/** The stint containing `dateStr`: its dates and who holds it. Null before the start. */
export function stintOn<M extends CycleMember>(rotation: CycledRotation<M>, dateStr: string): Stint<M> | null {
  const shape = rotationShape(rotation);
  const n = stintNumber(rotation, dateStr);
  if (!shape || n === null || n < 0) return null;
  const start = addDays(shape.start, n * shape.weekLen);
  const index = ((n % shape.members.length) + shape.members.length) % shape.members.length;
  return { start, end: addDays(start, shape.weekLen - 1), index, member: shape.members[index] };
}

/** `count` stints from the one containing `fromStr` — the rotation sequence strip. */
export function stintsFrom<M extends CycleMember>(rotation: CycledRotation<M>, fromStr: string, count: number): Stint<M>[] {
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

function dateStrClamped<M extends CycleMember>(rotation: CycledRotation<M>, dateStr: string): string {
  const shape = rotationShape(rotation);
  if (!shape) return dateStr;
  const day = dayPart(dateStr);
  return day < shape.start ? shape.start : day;
}

/** The cover holding for `employeeId` in a rotation on a date, if any. */
export function coverOn(covers: RotationCover[], kind: RotationKind, rotationId: number, employeeId: string, dateStr: string): RotationCover | undefined {
  const day = dayPart(dateStr);
  return covers.find(c => c.kind === kind && c.rotation_id === rotationId
    && sameEmployee(c.absent_employee_id, employeeId)
    && day >= dayPart(c.date_from) && day <= dayPart(c.date_to));
}

export interface HeldMember<M extends CycleMember = CycleMember> { member: M; cover?: RotationCover }

/** The stint holder with their cover attached, when someone holds in place of them. */
export function heldStint<M extends CycleMember>(
  kind: RotationKind, rotation: CycledRotation<M> & { id: number }, covers: RotationCover[], dateStr: string,
): (Stint<M> & { cover?: RotationCover }) | null {
  const stint = stintOn(rotation, dateStr);
  if (!stint) return null;
  const cover = coverOn(covers, kind, rotation.id, stint.member.employee_id, dateStr);
  return cover ? { ...stint, cover } : { ...stint };
}

/** Each crew member with their own cover attached, when one holds for them. */
export function heldCrew(member: RotationMember, covers: RotationCover[], rotationId: number, dateStr: string): HeldMember<CrewMember>[] {
  return (member.crew ?? []).map(c => {
    const cover = coverOn(covers, 'standby', rotationId, c.employee_id, dateStr);
    return cover ? { member: c, cover } : { member: c };
  });
}

/** Two scope labels name the same scope — blank means mine-wide, case-insensitive. */
export function sameScope(department: string | null | undefined, scope: string | null): boolean {
  return (department ?? '').trim().toLowerCase() === (scope ?? '').trim().toLowerCase();
}

/** Every duty scope with a roster or an override — mine-wide first. */
export function dutyScopes(dutyRotations: DutyRotation[], overrides: DutyEntry[]): (string | null)[] {
  const scopes: (string | null)[] = [null];
  const seen = new Set(['']);
  for (const r of [...dutyRotations].sort((a, b) => a.id - b.id)) {
    const key = (r.department ?? '').trim().toLowerCase();
    if (!seen.has(key)) { seen.add(key); scopes.push(r.department?.trim() || null); }
  }
  for (const e of overrides) {
    const key = (e.department ?? '').trim().toLowerCase();
    if (!seen.has(key)) { seen.add(key); scopes.push(e.department?.trim() || null); }
  }
  return scopes;
}

export interface EffectiveOfficial {
  employee_id: string;
  employee_name: string;
  phone: string | null;
  override?: DutyEntry;
  cover?: RotationCover;
}

/** Who answers for a scope on a date: an explicit override wins, else the
 * rotation holder; a cover applies to either. Null when nobody does. */
export function officialOn(
  rotation: DutyRotation | undefined, overrides: DutyEntry[], covers: RotationCover[],
  dateStr: string, department: string | null,
): EffectiveOfficial | null {
  const day = dayPart(dateStr);
  const override = overrides.find(e => sameScope(e.department, department)
    && day >= dayPart(e.date_from) && day <= dayPart(e.date_to));
  const holder = rotation ? holderOn(rotation, day) : null;
  const person = override
    ? { employee_id: override.employee_id, employee_name: override.employee_name, phone: override.phone ?? null }
    : holder
      ? { employee_id: holder.employee_id, employee_name: holder.employee_name, phone: holder.phone ?? null }
      : null;
  if (!person) return null;
  const cover = rotation ? coverOn(covers, 'duty', rotation.id, person.employee_id, day) : undefined;
  return { ...person, ...(override ? { override } : {}), ...(cover ? { cover } : {}) };
}

export interface OfficialSegment { from: string; to: string; official: EffectiveOfficial }

/** A range split where the effective official changes — override, stint, and
 * cover boundaries each start a new segment; days with nobody are skipped. */
export function officialSegments(
  rotation: DutyRotation | undefined, overrides: DutyEntry[], covers: RotationCover[],
  fromStr: string, toStr: string, department: string | null,
): OfficialSegment[] {
  const segments: OfficialSegment[] = [];
  let day = dayPart(fromStr);
  const to = dayPart(toStr);
  while (day <= to) {
    const official = officialOn(rotation, overrides, covers, day, department);
    const key = official ? `${official.employee_id}|${official.override?.id ?? ''}|${official.cover?.id ?? ''}` : null;
    const last = segments[segments.length - 1];
    const lastKey = last ? `${last.official.employee_id}|${last.official.override?.id ?? ''}|${last.official.cover?.id ?? ''}` : null;
    if (official && key === lastKey && last) last.to = day;
    else if (official) segments.push({ from: day, to: day, official });
    day = addDays(day, 1);
  }
  return segments;
}

/** A leave keeping someone away on a date — decided or still pending, never rejected. */
export function leaveOn(leaves: LeaveRecord[], employeeId: string, employeeName: string, dateStr: string): LeaveRecord | undefined {
  const day = dayPart(dateStr);
  const norm = (s: string) => (s || '').toLowerCase().trim();
  return leaves.find(l => (sameEmployee(l.employee_id, employeeId) || norm(l.employee_name) === norm(employeeName))
    && day >= dayPart(l.start_date) && day <= dayPart(l.end_date) && l.status !== 'rejected');
}

/** Covers holding for someone over any part of a range, earliest first. */
export function coversOverRange(
  covers: RotationCover[], kind: RotationKind, rotationId: number,
  employeeId: string, fromStr: string, toStr: string,
): RotationCover[] {
  const from = dayPart(fromStr);
  const to = dayPart(toStr);
  return covers
    .filter(c => c.kind === kind && c.rotation_id === rotationId && sameEmployee(c.absent_employee_id, employeeId)
      && dayPart(c.date_from) <= to && dayPart(c.date_to) >= from)
    .sort((a, b) => dayPart(a.date_from).localeCompare(dayPart(b.date_from)));
}

/** Leaves keeping someone away over any part of a range, earliest first. */
export function leavesOverRange(
  leaves: LeaveRecord[], employeeId: string, employeeName: string, fromStr: string, toStr: string,
): LeaveRecord[] {
  const from = dayPart(fromStr);
  const to = dayPart(toStr);
  const norm = (s: string) => (s || '').toLowerCase().trim();
  return leaves
    .filter(l => (sameEmployee(l.employee_id, employeeId) || norm(l.employee_name) === norm(employeeName))
      && dayPart(l.start_date) <= to && dayPart(l.end_date) >= from && l.status !== 'rejected')
    .sort((a, b) => dayPart(a.start_date).localeCompare(dayPart(b.start_date)));
}

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function monthLabel(year: number, month0: number): string {
  return `${MONTH_NAMES[month0]} ${year}`;
}

function localDay(year: number, month0: number, dayOfMonth: number): string {
  const d = new Date(year, month0, dayOfMonth);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Weeks of YYYY-MM-DD days, Monday first, covering a month — padded with the
 * adjacent days so every week is full. Local day integers throughout, so the
 * grid never shifts with the timezone. */
export function monthGrid(year: number, month0: number): string[][] {
  const lead = (new Date(year, month0, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month0 + 1, 0).getDate();
  const weeks = Math.ceil((lead + daysInMonth) / 7);
  return Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => localDay(year, month0, 1 - lead + w * 7 + d)));
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
