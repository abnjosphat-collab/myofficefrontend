import { describe, expect, it } from 'vitest';
import { findMatch, leaveReason, matchOptions, personOptions, tabTarget, toolOptions, toolWarning, type RegisterOption } from './registers';
import type { LeaveRow, ToolRegisterRow } from './types';

const opts = (...values: string[]): RegisterOption[] => values.map(value => ({ value }));
const leave = (over: Partial<LeaveRow> = {}): LeaveRow => ({ employee_id: 'E2', employee_name: 'Tendai Banda', leave_type: 'Annual leave', start_date: '2026-08-05', end_date: '2026-08-14', ...over });
const tool = (over: Partial<ToolRegisterRow> = {}): ToolRegisterRow => ({ id: 't1', register_number: 'PP-UG-0001', name: 'Torque wrench', make_model: 'Gedore', category: 'Hand tools', equipment_kind: 'hand-tool', department: 'Engineering', status: 'available', holder: null, expected_return_at: null, inspection_due: [], condition: 'Good', ...over });

describe('matching what was typed', () => {
  it('finds an exact match ignoring case and spacing, and nothing for blank', () => {
    const o = opts('Tendai Banda', 'F. Ncube');
    expect(findMatch(o, '  tendai   BANDA ')?.value).toBe('Tendai Banda');
    expect(findMatch(o, 'Tend')).toBeNull();
    expect(findMatch(o, '  ')).toBeNull();
  });

  it('ranks the start of the text, then the start of a word, then anywhere', () => {
    const out = matchOptions(opts('Sam Dube', 'Dubek Moyo', 'Abdul Ubed'), 'ub').map(o => o.value);
    expect(out).toEqual(['Abdul Ubed', 'Dubek Moyo', 'Sam Dube']); // a word starts with it, then it is inside a name (A to Z)
    expect(matchOptions(opts('Sam Dube', 'Dube Moyo', 'Abdul Ubed'), 'dub').map(o => o.value)).toEqual(['Dube Moyo', 'Sam Dube']);
  });

  it('also matches the register key (employee or register number)', () => {
    const o: RegisterOption[] = [{ value: 'Torque wrench', key: 'PP-UG-0001' }, { value: 'Hammer', key: 'PP-UG-0002' }];
    expect(matchOptions(o, 'pp-ug-0002').map(x => x.value)).toEqual(['Hammer']);
  });

  it('shows the first few for blank, never more than the limit, and nothing when nothing matches', () => {
    const many = opts(...Array.from({ length: 20 }, (_, i) => `Person ${i}`));
    expect(matchOptions(many, '')).toHaveLength(8);
    expect(matchOptions(many, 'zzz')).toEqual([]);
  });

  it('Tab fills the highlighted match, skipping people who cannot be chosen', () => {
    const m: RegisterOption[] = [{ value: 'A', blocked: 'On leave' }, { value: 'B' }, { value: 'C' }];
    expect(tabTarget(m, 0)?.value).toBe('B'); // highlighted is blocked, so the first that can be chosen
    expect(tabTarget(m, 2)?.value).toBe('C');
    expect(tabTarget([{ value: 'A', blocked: 'x' }], 0)).toBeNull();
    expect(tabTarget([], 0)).toBeNull();
  });
});

describe('people and leave', () => {
  const employees = [
    { id: 1, employee_id: 'E1', first_name: 'Farai', last_name: 'Ncube', designation: 'Foreman', section: 'Fitters' },
    { id: 2, employee_id: 'E2', first_name: 'Tendai', last_name: 'Banda', designation: 'Artisan', section: 'Fitters' },
    { id: 3, employee_id: 'E3', full_name: 'Tendai Banda' }, // same name again: listed once
  ];

  it('greys a person on leave with the reason and the dates, matched by employee number', () => {
    const out = personOptions(employees, [leave()]);
    expect(out.map(o => o.value)).toEqual(['Farai Ncube', 'Tendai Banda']);
    expect(out[1].blocked).toBe('On annual leave, 5 Aug to 14 Aug');
    expect(out[0].blocked).toBeUndefined();
    expect(out[0].description).toBe('Foreman · Fitters');
  });

  it('falls back to the name when the leave record carries no employee number', () => {
    expect(personOptions(employees, [leave({ employee_id: null })])[1].blocked).toContain('annual leave');
  });

  it('does not grey anyone when leave does not apply (the requester)', () => {
    expect(personOptions(employees, [leave()], false).every(o => !o.blocked)).toBe(true);
  });

  it('words the reason for any leave type', () => {
    expect(leaveReason({ leave_type: 'Sick', start_date: '2026-08-05', end_date: '2026-08-06' })).toBe('On sick leave, 5 Aug to 6 Aug');
    expect(leaveReason({ leave_type: null, start_date: '2026-08-05', end_date: '2026-08-06' })).toBe('On leave, 5 Aug to 6 Aug');
  });
});

describe('tools', () => {
  it('no warning for a tool that is available and checked', () => {
    expect(toolWarning(tool())).toBeUndefined();
  });

  it('warns when a tool is out, overdue, needs attention or is due a check', () => {
    expect(toolWarning(tool({ status: 'issued', holder: 'T. Banda', expected_return_at: '2026-08-12T00:00:00Z' }))).toBe('Issued to T. Banda, back 12 Aug');
    expect(toolWarning(tool({ status: 'overdue', holder: 'T. Banda' }))).toBe('Overdue to T. Banda');
    expect(toolWarning(tool({ status: 'attention' }))).toBe('Needs attention');
    expect(toolWarning(tool({ inspection_due: ['monthly', 'calibration'] }))).toBe('monthly, calibration inspection due');
    expect(toolWarning(tool({ status: 'overdue', inspection_due: ['weekly'] }))).toBe('Overdue. weekly inspection due');
  });

  it('keeps the register number so the job names exactly which tool', () => {
    const [o] = toolOptions([tool({ status: 'attention' })]);
    expect(o).toMatchObject({ value: 'Torque wrench', key: 'PP-UG-0001', description: 'PP-UG-0001 · Gedore · Hand tools', warning: 'Needs attention' });
    expect(o.blocked).toBeUndefined(); // maintenance warns, it never refuses a tool
  });
});
