import { describe, expect, it } from 'vitest';
import { resolveFillTargetEntry, timesheetWritePayload } from './timesheetWritePayload';
import type { TimesheetEntry } from './types';

describe('timesheetWritePayload', () => {
  it('strips _auto and syncs night fields from shift times', () => {
    const out = timesheetWritePayload({
      employee_id: 1,
      date: '2026-08-10',
      status: 'work',
      start_time: '18:00',
      end_time: '06:00',
      regular_hours: 12,
      nightshift_hours: 0,
      _auto: 'overtime',
    } as Omit<TimesheetEntry, 'id'> & { _auto: 'overtime' });
    expect(out).not.toHaveProperty('_auto');
    expect(out.nightshift_hours).toBeGreaterThan(0);
    expect(out.nightshift_allowance).toBe(true);
  });
});

describe('resolveFillTargetEntry', () => {
  it('prefers persisted id over virtual overlay', () => {
    const saved: TimesheetEntry[] = [{ id: 5, employee_id: 1, date: '2026-08-10', regular_hours: 8, status: 'work' }];
    const effective: TimesheetEntry[] = [{
      id: 5, employee_id: 1, date: '2026-08-10', regular_hours: 8, overtime_hours: 3, status: 'work', _auto: 'overtime',
    }];
    const r = resolveFillTargetEntry('1', '2026-08-10', saved, effective);
    expect(r?.id).toBe(5);
    expect(r?.overtime_hours).toBe(3);
  });

  it('passes virtual module row without id so fill can persist to Supabase', () => {
    const effective: TimesheetEntry[] = [{
      employee_id: 1, date: '2026-08-11', regular_hours: 0, overtime_hours: 4, status: 'work', _auto: 'overtime',
    }];
    const r = resolveFillTargetEntry('1', '2026-08-11', [], effective);
    expect(r?.id).toBeUndefined();
    expect(r?.overtime_hours).toBe(4);
  });
});
