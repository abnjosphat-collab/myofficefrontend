import { describe, expect, it } from 'vitest';
import { artisanKey, artisansOf, draftToPayload, isDirty, openMonth, previousMonth, problems, recordToDraft, snapshot, staffFrom } from './artisanLogic';
import type { ArtisanTimesheetRecord } from './types';

const NONE = { leaves: [], overtime: [], standbyAssignments: [] };
const staff = [
  staffFrom({ id: 1, employee_id: 'C100', first_name: 'Ann', last_name: 'Alpha', designation: 'Fitter Class 1', id_number: '12-345', employment_type: 'SALARIED' }),
  staffFrom({ id: 2, employee_id: 'C200', first_name: 'Bob', last_name: 'Beta', designation: 'Clerk', employment_type: 'NEC' }),
  staffFrom({ id: 3, employee_id: 'C300', first_name: 'Cy', last_name: 'Gamma', designation: 'Fitter Class 1', employment_type: 'SALARIED', archived: true }),
  staffFrom({ id: 4, employee_id: 'C400', first_name: 'Dee', last_name: 'Delta', designation: 'Winder Technician', employment_type: 'SALARIED', is_active: false }),
];
const artisans = artisansOf(staff);

describe('who is an artisan', () => {
  it('reads a personnel row defensively', () => { expect(staffFrom(null)).toMatchObject({ name: 'Employee', employee_id: '', active: true }); expect(staffFrom({ id: '7', first_name: 'A' }).id).toBe(7); });
  it('lists only active salaried employees as artisans', () => { expect(artisans.map(a => a.employee_id)).toEqual(['C100']); });
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
describe('previous month default', () => {
  it('goes back one month within the year', () => { expect(previousMonth(new Date(2026, 9, 6))).toEqual({ year: 2026, month: 9 }); });
  it('rolls January back to December of the previous year', () => { expect(previousMonth(new Date(2026, 0, 15))).toEqual({ year: 2025, month: 12 }); });
});

  it('refuses a daily figure that cannot be right', () => {
    const { draft } = openMonth(artisans[0], 2026, 2, [], NONE);
    expect(problems(draft)).toEqual([]);
    const rows = draft.daily_rows.map((r, i) => (i === 0 ? { ...r, ot_15: 30, normal_hrs: -1 } : r));
    const p = problems({ ...draft, daily_rows: rows });
    expect(p).toEqual(expect.arrayContaining([expect.stringContaining('2026-02-01: 30'), expect.stringContaining('2026-02-01: -1')]));
  });
});

describe('nobody works on leave', () => {
  const leaveSources = {
    leaves: [{ employee_id: 'C100', leave_type: 'annual', start_date: '2026-02-10', end_date: '2026-02-11', status: 'approved', reason: 'Trip' }],
    overtime: [],
    standbyAssignments: [],
  };
  const withRow = (date: string, patch: object) => {
    const { draft } = openMonth(artisans[0], 2026, 2, [], NONE);
    return { ...draft, daily_rows: draft.daily_rows.map(r => (r.date === date ? { ...r, ...patch } : r)) };
  };

  it('passes a clean leave day: 8 normal hours and nothing else', () => {
    const { draft } = openMonth(artisans[0], 2026, 2, [], NONE);
    const rows = draft.daily_rows.map(r => (
      r.date === '2026-02-10' || r.date === '2026-02-11' ? { ...r, day_status: 'leave' as const, normal_hrs: 8 } : r
    ));
    expect(problems({ ...draft, daily_rows: rows }, leaveSources)).toEqual([]);
  });

  it('refuses overtime, standby and sign-in on a leave-status day', () => {
    const draft = withRow('2026-02-10', {
      day_status: 'leave', normal_hrs: 8, ot_15: 2, on_standby: true,
      sign_in_time: '07:00', sign_in_signature: 'data:image/png;base64,AAA',
    });
    const p = problems(draft);
    expect(p).toEqual(expect.arrayContaining([
      expect.stringContaining('2026-02-10'),
    ]));
    expect(p.filter(m => m.includes('2026-02-10'))).toHaveLength(3);
  });

  it('refuses normal hours other than 8 on a leave day', () => {
    const draft = withRow('2026-02-10', { day_status: 'sick', normal_hrs: 0 });
    const p = problems(draft);
    expect(p).toEqual(expect.arrayContaining([expect.stringContaining('2026-02-10'), expect.stringContaining('8')]));
  });

  it('refuses work on an approved leave date even when the row was never marked', () => {
    const draft = withRow('2026-02-10', { normal_hrs: 0, ot_15: 2 });
    const p = problems(draft, leaveSources);
    expect(p).toEqual(expect.arrayContaining([expect.stringContaining('2026-02-10')]));
  });

  it('ignores leave belonging to someone else', () => {
    const draft = withRow('2026-02-10', { normal_hrs: 0, ot_15: 2 });
    const others = { ...leaveSources, leaves: [{ ...leaveSources.leaves[0], employee_id: 'C999' }] };
    expect(problems(draft, others)).toEqual([]);
  });
});
