import { describe, expect, it } from 'vitest';
import { buildDefaultEntry, cloneEntryForDate, fillTargetDayIndices, normalShiftHours } from './fillEntry';
import type { TimesheetEntry } from './types';

describe('normalShiftHours', () => {
  it('defaults to 10h except lamp room / compressor', () => {
    expect(normalShiftHours('Electrician')).toBe(10);
    expect(normalShiftHours('Lamp Room Attendant')).toBe(8);
  });
});

describe('fillTargetDayIndices', () => {
  it('returns indices between source and end, excluding source', () => {
    expect(fillTargetDayIndices(2, 5)).toEqual([3, 4, 5]);
    expect(fillTargetDayIndices(5, 2)).toEqual([2, 3, 4]);
  });
});

describe('cloneEntryForDate', () => {
  it('copies hours and strips auto marker', () => {
    const source: TimesheetEntry = {
      id: 1,
      employee_id: 5,
      date: '2024-01-01',
      status: 'work',
      regular_hours: 10,
      total_hours: 10,
      _auto: 'leave',
      notes: 'Auto: something',
    };
    const cloned = cloneEntryForDate(source, 5, '2024-01-02');
    expect(cloned.date).toBe('2024-01-02');
    expect(cloned.regular_hours).toBe(10);
    expect(cloned.notes).toBe('');
    expect(cloned).not.toHaveProperty('_auto');
  });
});

describe('buildDefaultEntry', () => {
  it('builds a 10h work day for a normal weekday', () => {
    const entry = buildDefaultEntry({ id: '1', position: 'Fitter' }, new Date(2024, 0, 3));
    expect(entry.status).toBe('work');
    expect(entry.regular_hours).toBe(10);
    expect(entry.end_time).toBe('17:00');
  });
});
