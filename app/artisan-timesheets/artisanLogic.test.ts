import { describe, expect, it } from 'vitest';
import { artisanKey, artisansOf, draftToPayload, isDirty, openMonth, problems, recordToDraft, snapshot, staffFrom } from './artisanLogic';
import type { ArtisanTimesheetRecord } from './types';

const NONE = { leaves: [], overtime: [], standbyAssignments: [] };
const staff = [
  staffFrom({ id: 1, employee_id: 'C100', first_name: 'Ann', last_name: 'Alpha', designation: 'Fitter Class 1', id_number: '12-345' }),
  staffFrom({ id: 2, employee_id: 'C200', first_name: 'Bob', last_name: 'Beta', designation: 'Clerk' }),
  staffFrom({ id: 3, employee_id: 'C300', first_name: 'Cy', last_name: 'Gamma', designation: 'Fitter Class 1', archived: true }),
  staffFrom({ id: 4, employee_id: 'C400', first_name: 'Dee', last_name: 'Delta', designation: 'Winder Technician', is_active: false }),
];
const artisans = artisansOf(staff);

describe('who is an artisan', () => {
  it('reads a personnel row defensively', () => { expect(staffFrom(null)).toMatchObject({ name: 'Employee', employee_id: '', active: true }); expect(staffFrom({ id: '7', first_name: 'A' }).id).toBe(7); });
  it('lists only active class 1 artisans and winder technicians', () => { expect(artisans.map(a => a.employee_id)).toEqual(['C100']); });
  it('keys an artisan by mine number, falling back to the record id', () => { expect(artisanKey({ employee_id: '', id: 9 })).toBe('9'); expect(artisanKey(artisans[0])).toBe('C100'); });
});

describe('opening a month', () => {
  it('starts a blank month with one row per day and no signatures', () => {
    const { draft, recordId } = openMonth(artisans[0], 2026, 2, [], NONE);
    expect(recordId).toBeNull();
    expect(draft.daily_rows).toHaveLength(28);
    expect(draft).toMatchObject({ employee_id: 'C100', employee_name: 'Ann Alpha', id_number: '12-345', compiled_by_signature: '' });
  });
  it('opens the saved timesheet for that artisan and month instead', () => {
    const saved = { id: 5, employee_id: 'C100', employee_name: 'Ann Alpha', year: 2026, month: 2, shift_rate: 12.5, hourly_rate: null, daily_rows: [], compiled_by: 'Lee' } as unknown as ArtisanTimesheetRecord;
    const { draft, recordId } = openMonth(artisans[0], 2026, 2, [saved], NONE);
    expect(recordId).toBe(5);
    expect(draft).toMatchObject({ shift_rate: '12.5', hourly_rate: '', compiled_by: 'Lee' });
    expect(openMonth(artisans[0], 2026, 3, [saved], NONE).recordId).toBeNull();
  });
});

describe('the payload', () => {
  it('sends rates as numbers or null, and blank names and signatures as null', () => {
    const { draft } = openMonth(artisans[0], 2026, 2, [], NONE);
    const p = draftToPayload({ ...draft, shift_rate: ' 12.5 ', hourly_rate: '' });
    expect(p).toMatchObject({ shift_rate: 12.5, hourly_rate: null, compiled_by: null, compiled_by_signature: null, id_number: '12-345', year: 2026, month: 2 });
    expect(recordToDraft({ id: 1, ...p, daily_rows: p.daily_rows } as unknown as ArtisanTimesheetRecord).shift_rate).toBe('12.5');
  });
});

describe('unsaved changes and what stops a save', () => {
  it('knows when the draft differs from what was opened', () => {
    const { draft } = openMonth(artisans[0], 2026, 2, [], NONE);
    const base = snapshot(draft);
    expect(isDirty(draft, base)).toBe(false);
    expect(isDirty({ ...draft, compiled_by: 'Lee' }, base)).toBe(true);
    expect(isDirty(null, '')).toBe(false);
  });
  it('refuses a daily figure that cannot be right, and a rate that is not a number', () => {
    const { draft } = openMonth(artisans[0], 2026, 2, [], NONE);
    expect(problems(draft)).toEqual([]);
    const rows = draft.daily_rows.map((r, i) => (i === 0 ? { ...r, ot_15: 30, normal_hrs: -1 } : r));
    const p = problems({ ...draft, daily_rows: rows, shift_rate: 'abc' });
    expect(p).toEqual(expect.arrayContaining([expect.stringContaining('2026-02-01: 30'), expect.stringContaining('2026-02-01: -1'), 'The shift rate is not a number.']));
  });
});
