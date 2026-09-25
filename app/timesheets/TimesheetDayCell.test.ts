import { describe, expect, it } from 'vitest';
import { dayCellHours } from './timesheetCellDisplay';
import type { TimesheetEntry } from './types';

function entry(over: Partial<TimesheetEntry> = {}): TimesheetEntry {
  return { employee_id: 1, date: '2026-09-10', regular_hours: 10, status: 'work', ...over };
}

describe('dayCellHours — what the grid shows, not payroll', () => {
  it('shows normal hours for a work day', () => {
    expect(dayCellHours(entry())).toEqual({ hours: 10, isDT: false });
  });

  it('hides hours for Off so the cell can read as a neutral status', () => {
    expect(dayCellHours(entry({ status: 'off', regular_hours: 0 }))).toBeNull();
  });

  it('hides hours for Absent', () => {
    expect(dayCellHours(entry({ status: 'absent', regular_hours: 0 }))).toBeNull();
  });

  it('uses holiday overtime hours on double-time days', () => {
    expect(dayCellHours(entry({ status: 'weekend', regular_hours: 0, holiday_overtime_hours: 10 }))).toEqual({ hours: 10, isDT: true });
  });

  it('shows leave regular hours (leave counts as 8h in Actual)', () => {
    expect(dayCellHours(entry({ status: 'leave', regular_hours: 8 }))).toEqual({ hours: 8, isDT: false });
  });
});
