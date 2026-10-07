import { describe, expect, it } from 'vitest';
import {
  addDays, dayPart, diffDays, holderIndexOn, holderOn, officialsOn, officialsOverRange,
  resolvePhone, rotationStartedOn, sameEmployee, stintOn, stintsFrom, workLocation,
} from './standbyRoster';
import type { DutyEntry, StandbyRotation } from './types';

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
