import { describe, expect, it } from 'vitest';
import {
  addDays, coverOn, coversOverRange, dayPart, diffDays, dutyScopes, heldCrew,
  heldStint, holderIndexOn, holderOn, leaveOn, leavesOverRange, monthGrid,
  monthLabel, officialOn, officialSegments, officialsOn, officialsOverRange,
  resolvePhone, rotationStartedOn, sameEmployee, stintOn, stintsFrom, workLocation,
} from './standbyRoster';
import type { DutyEntry, DutyRotation, RotationCover, StandbyRotation } from './types';
import type { LeaveRecord } from '@/app/shifts/types';

const rotation = (over: Partial<StandbyRotation> = {}): StandbyRotation => ({
  id: 1, name: 'Electrical', section: 'Electrical', is_active: true,
  week_length_days: 7, cycle_start_date: '2026-10-05',
  members: [
    { employee_id: 'C001', employee_name: 'Ann Alpha', phone: '0771111111', crew: [{ employee_id: 'C010', employee_name: 'Crew One' }] },
    { employee_id: 'C002', employee_name: 'Bob Beta' },
    { employee_id: 'C003', employee_name: 'Cy Gamma' },
  ],
  ...over,
});

const duty = (over: Partial<DutyEntry> = {}): DutyEntry => ({
  id: 1, employee_id: 'C100', employee_name: 'Dee Delta', department: null,
  date_from: '2026-10-05', date_to: '2026-10-11', ...over,
});

describe('day helpers', () => {
  it('tolerates datetime suffixes and matches employees loosely', () => {
    expect(dayPart('2026-10-05T00:00:00')).toBe('2026-10-05');
    expect(sameEmployee(' c001 ', 'C001')).toBe(true);
    expect(diffDays('2026-10-05', '2026-10-12')).toBe(7);
    expect(diffDays('2026-10-12', '2026-10-05')).toBe(-7);
    expect(addDays('2026-10-05', 6)).toBe('2026-10-11');
    expect(addDays('2026-10-05', -1)).toBe('2026-10-04');
  });
});

describe('holderIndexOn / holderOn', () => {
  it('holds each member for exactly one stint, then rotates', () => {
    const r = rotation();
    expect(holderIndexOn(r, '2026-10-05')).toBe(0);
    expect(holderIndexOn(r, '2026-10-11')).toBe(0);
    expect(holderIndexOn(r, '2026-10-12')).toBe(1);
    expect(holderIndexOn(r, '2026-10-19')).toBe(2);
    expect(holderIndexOn(r, '2026-10-26')).toBe(0); // rotated back to Ann
    expect(holderOn(r, '2026-10-13')?.employee_name).toBe('Bob Beta');
  });
  it('supports stints other than a week', () => {
    const r = rotation({ week_length_days: 10, members: rotation().members.slice(0, 2) });
    expect(holderIndexOn(r, '2026-10-05')).toBe(0);
    expect(holderIndexOn(r, '2026-10-14')).toBe(0);
    expect(holderIndexOn(r, '2026-10-15')).toBe(1);
  });
  it('holds nobody before the start or on a broken shape', () => {
    const r = rotation();
    expect(rotationStartedOn(r, '2026-10-04')).toBe(false);
    expect(rotationStartedOn(r, '2026-10-05')).toBe(true);
    expect(holderIndexOn(r, '2026-10-04')).toBeNull();
    expect(holderIndexOn(rotation({ members: [] }), '2026-10-05')).toBeNull();
    expect(holderIndexOn(rotation({ week_length_days: 0 }), '2026-10-05')).toBeNull();
    expect(holderIndexOn(rotation({ cycle_start_date: 'not-a-date' }), '2026-10-05')).toBeNull();
    expect(holderOn(rotation({ members: [] }), '2026-10-05')).toBeNull();
  });
});

describe('stintOn / stintsFrom', () => {
  it('spans the stint containing the date', () => {
    expect(stintOn(rotation(), '2026-10-07')).toMatchObject({ start: '2026-10-05', end: '2026-10-11', index: 0 });
    expect(stintOn(rotation(), '2026-10-12')).toMatchObject({ start: '2026-10-12', end: '2026-10-18', index: 1 });
    expect(stintOn(rotation(), '2026-10-04')).toBeNull();
  });
  it('lists the upcoming sequence, wrapping the rotation', () => {
    const seq = stintsFrom(rotation(), '2026-10-07', 4);
    expect(seq.map(s => s.member.employee_name)).toEqual(['Ann Alpha', 'Bob Beta', 'Cy Gamma', 'Ann Alpha']);
    expect(seq[3]).toMatchObject({ start: '2026-10-26', end: '2026-11-01', index: 0 });
  });
  it('begins at the first stint when asked from before the start', () => {
    const seq = stintsFrom(rotation(), '2026-09-01', 2);
    expect(seq.map(s => s.start)).toEqual(['2026-10-05', '2026-10-12']);
    expect(stintsFrom(rotation({ members: [] }), '2026-10-07', 2)).toEqual([]);
    expect(stintsFrom(rotation(), '2026-10-07', 0)).toEqual([]);
  });
});

describe('officialsOn / officialsOverRange', () => {
  const entries = [
    duty({ id: 1, employee_name: 'Mine Wide', department: null }),
    duty({ id: 2, employee_name: 'Dept Eng', department: 'Engineering', date_from: '2026-10-08', date_to: '2026-10-20' }),
    duty({ id: 3, employee_name: 'Later', department: null, date_from: '2026-10-12', date_to: '2026-10-18' }),
  ];
  it('covers boundary days and sorts mine-wide first', () => {
    expect(officialsOn(entries, '2026-10-05').map(e => e.employee_name)).toEqual(['Mine Wide']);
    expect(officialsOn(entries, '2026-10-08').map(e => e.employee_name)).toEqual(['Mine Wide', 'Dept Eng']);
    expect(officialsOn(entries, '2026-10-11').map(e => e.employee_name)).toEqual(['Mine Wide', 'Dept Eng']);
    expect(officialsOn(entries, '2026-10-12').map(e => e.employee_name)).toEqual(['Later', 'Dept Eng']);
    expect(officialsOn(entries, '2026-10-21')).toEqual([]);
  });
  it('clamps each official to the viewed range', () => {
    const over = officialsOverRange(entries, '2026-10-06', '2026-10-13');
    expect(over).toHaveLength(3);
    expect(over[0]).toMatchObject({ from: '2026-10-06', to: '2026-10-11' });
    expect(over.find(o => o.entry.employee_name === 'Dept Eng')).toMatchObject({ from: '2026-10-08', to: '2026-10-13' });
    expect(over.find(o => o.entry.employee_name === 'Later')).toMatchObject({ from: '2026-10-12', to: '2026-10-13' });
  });
});

const dutyRotation = (over: Partial<DutyRotation> = {}): DutyRotation => ({
  id: 7, name: 'Mine-wide duty', department: null, is_active: true,
  week_length_days: 7, cycle_start_date: '2026-10-05',
  members: [
    { employee_id: 'C101', employee_name: 'Off One' },
    { employee_id: 'C102', employee_name: 'Off Two' },
  ],
  ...over,
});

const cover = (over: Partial<RotationCover> = {}): RotationCover => ({
  id: 1, kind: 'standby', rotation_id: 1,
  absent_employee_id: 'C001', absent_employee_name: 'Ann Alpha',
  cover_employee_id: 'C009', cover_employee_name: 'Zed Zulu',
  date_from: '2026-10-06', date_to: '2026-10-12', reason: 'leave',
  ...over,
});

const leave = (over: Partial<LeaveRecord> = {}): LeaveRecord => ({
  id: 1, employee_id: 'C001', employee_name: 'Ann Alpha', leave_type: 'Annual',
  start_date: '2026-10-06', end_date: '2026-10-12', status: 'approved', ...over,
});

describe('coverOn / heldStint / heldCrew', () => {
  it('finds the cover for a person on a date, loosely and within range', () => {
    const covers = [cover()];
    expect(coverOn(covers, 'standby', 1, ' c001 ', '2026-10-08')?.cover_employee_name).toBe('Zed Zulu');
    expect(coverOn(covers, 'standby', 1, 'C001', '2026-10-05')).toBeUndefined();
    expect(coverOn(covers, 'standby', 1, 'C001', '2026-10-13')).toBeUndefined();
    expect(coverOn(covers, 'standby', 2, 'C001', '2026-10-08')).toBeUndefined();
    expect(coverOn(covers, 'duty', 1, 'C001', '2026-10-08')).toBeUndefined();
    expect(coverOn(covers, 'standby', 1, 'C002', '2026-10-08')).toBeUndefined();
  });
  it('attaches the cover to the holder, and stays null before the start', () => {
    const held = heldStint('standby', rotation(), [cover()], '2026-10-08');
    expect(held?.member.employee_name).toBe('Ann Alpha');
    expect(held?.cover?.cover_employee_name).toBe('Zed Zulu');
    expect(heldStint('standby', rotation(), [], '2026-10-08')?.cover).toBeUndefined();
    expect(heldStint('standby', rotation(), [cover()], '2026-10-04')).toBeNull();
  });
  it('covers crew members individually', () => {
    const crewCover = cover({ absent_employee_id: 'C010', absent_employee_name: 'Crew One' });
    const held = heldCrew(rotation().members[0], [crewCover], 1, '2026-10-08');
    expect(held).toHaveLength(1);
    expect(held[0].cover?.cover_employee_name).toBe('Zed Zulu');
    expect(heldCrew(rotation().members[1], [crewCover], 1, '2026-10-08')).toEqual([]);
  });
});

describe('officialOn / officialSegments', () => {
  it('prefers an explicit override over the rotation holder', () => {
    const over = [duty({ employee_name: 'Override Olive', date_from: '2026-10-06', date_to: '2026-10-09' })];
    const official = officialOn(dutyRotation(), over, [], '2026-10-07', null);
    expect(official?.employee_name).toBe('Override Olive');
    expect(official?.override?.employee_name).toBe('Override Olive');
    expect(officialOn(dutyRotation(), over, [], '2026-10-10', null)?.employee_name).toBe('Off One');
    expect(officialOn(undefined, [], [], '2026-10-07', null)).toBeNull();
  });
  it('matches the scope loosely and applies cover to either source', () => {
    const over = [duty({ employee_name: 'Dept Dan', department: 'Engineering', date_from: '2026-10-05', date_to: '2026-10-11' })];
    expect(officialOn(dutyRotation(), over, [], '2026-10-07', 'engineering')?.employee_name).toBe('Dept Dan');
    expect(officialOn(dutyRotation(), over, [], '2026-10-07', null)?.employee_name).toBe('Off One');
    const deptRotation = dutyRotation({ id: 8, department: 'Engineering' });
    const deptCover = cover({ kind: 'duty', rotation_id: 8, absent_employee_id: 'C101' });
    const held = officialOn(deptRotation, [], [deptCover], '2026-10-07', 'Engineering');
    expect(held?.employee_name).toBe('Off One');
    expect(held?.cover?.cover_employee_name).toBe('Zed Zulu');
  });
  it('splits a range where the effective official changes', () => {
    const over = [duty({ employee_name: 'Override Olive', date_from: '2026-10-08', date_to: '2026-10-09' })];
    const segs = officialSegments(dutyRotation(), over, [], '2026-10-05', '2026-10-12', null);
    expect(segs.map(s => [s.from, s.to, s.official.employee_name])).toEqual([
      ['2026-10-05', '2026-10-07', 'Off One'],
      ['2026-10-08', '2026-10-09', 'Override Olive'],
      ['2026-10-10', '2026-10-11', 'Off One'],
      ['2026-10-12', '2026-10-12', 'Off Two'],
    ]);
    expect(segs[1].official.override?.employee_name).toBe('Override Olive');
  });
  it('splits where a cover starts and ends, and skips empty days', () => {
    const segs = officialSegments(dutyRotation(), [], [cover({ kind: 'duty', rotation_id: 7, absent_employee_id: 'C101' })], '2026-10-05', '2026-10-07', null);
    expect(segs.map(s => [s.from, s.to, s.official.cover?.cover_employee_name ?? null])).toEqual([
      ['2026-10-05', '2026-10-05', null],
      ['2026-10-06', '2026-10-07', 'Zed Zulu'],
    ]);
    expect(officialSegments(undefined, [], [], '2026-10-05', '2026-10-07', null)).toEqual([]);
  });
});

describe('dutyScopes', () => {
  it('lists mine-wide first, then each scoped roster or override once', () => {
    expect(dutyScopes([], [])).toEqual([null]);
    expect(dutyScopes(
      [dutyRotation({ department: 'Engineering' }), dutyRotation({ id: 9, department: 'engineering' })],
      [duty({ department: 'Processing' })],
    )).toEqual([null, 'Engineering', 'Processing']);
  });
});

describe('leaveOn', () => {
  const leaves = [leave()];
  it('matches by id or name within the span, ignoring rejected leave', () => {
    expect(leaveOn(leaves, 'C001', 'Nobody', '2026-10-08')?.leave_type).toBe('Annual');
    expect(leaveOn(leaves, 'C999', 'ann alpha', '2026-10-08')?.leave_type).toBe('Annual');
    expect(leaveOn(leaves, 'C001', 'Ann Alpha', '2026-10-05')).toBeUndefined();
    expect(leaveOn([leave({ status: 'rejected' })], 'C001', 'Ann Alpha', '2026-10-08')).toBeUndefined();
    expect(leaveOn([leave({ status: 'pending' })], 'C001', 'Ann Alpha', '2026-10-08')?.status).toBe('pending');
  });
});

describe('coversOverRange / leavesOverRange', () => {
  const covers = [
    cover({ id: 1, date_from: '2026-10-06', date_to: '2026-10-07' }),
    cover({ id: 2, date_from: '2026-10-10', date_to: '2026-10-20' }),
    cover({ id: 3, absent_employee_id: 'C002', date_from: '2026-10-06', date_to: '2026-10-07' }),
  ];
  it('collects every intersecting cover and leave, earliest first', () => {
    expect(coversOverRange(covers, 'standby', 1, 'C001', '2026-10-05', '2026-10-11').map(c => c.id)).toEqual([1, 2]);
    expect(coversOverRange(covers, 'standby', 1, 'C001', '2026-10-08', '2026-10-09')).toEqual([]);
    expect(leavesOverRange([leave()], 'C001', 'Ann Alpha', '2026-10-05', '2026-10-11')).toHaveLength(1);
    expect(leavesOverRange([leave()], 'C001', 'Ann Alpha', '2026-10-13', '2026-10-19')).toEqual([]);
    expect(leavesOverRange([leave({ status: 'rejected' })], 'C001', 'Ann Alpha', '2026-10-05', '2026-10-11')).toEqual([]);
  });
});

describe('monthGrid / monthLabel', () => {
  it('covers October 2026 in Monday-first weeks with adjacent padding', () => {
    expect(monthLabel(2026, 9)).toBe('October 2026');
    const grid = monthGrid(2026, 9);
    expect(grid).toHaveLength(5);
    expect(grid.every(w => w.length === 7)).toBe(true);
    expect(grid[0][0]).toBe('2026-09-28');
    expect(grid[0][3]).toBe('2026-10-01');
    expect(grid[4][6]).toBe('2026-11-01');
    expect(grid.flat()).toContain('2026-10-15');
  });
  it('starts a Sunday-opening month on the previous Monday', () => {
    const grid = monthGrid(2026, 1);
    expect(grid[0][0]).toBe('2026-01-26');
    expect(grid[0][6]).toBe('2026-02-01');
  });
});

describe('resolvePhone / workLocation', () => {
  const employees = [{ employee_id: 'C001', phone: '0719999999', section: 'Winding', department: 'Engineering' }];
  it('prefers the live register phone over the snapshot', () => {
    expect(resolvePhone('0771111111', employees, 'C001')).toBe('0719999999');
    expect(resolvePhone('0771111111', employees, 'C002')).toBe('0771111111');
    expect(resolvePhone(null, [], 'C002')).toBe('');
  });
  it('locates work by rotation section, then register section and department', () => {
    expect(workLocation('Electrical', employees, 'C001')).toBe('Electrical · Engineering');
    expect(workLocation(null, employees, 'C001')).toBe('Winding · Engineering');
    expect(workLocation('Electrical', [], 'C009')).toBe('Electrical');
    expect(workLocation(null, [], 'C009')).toBe('');
  });
});
