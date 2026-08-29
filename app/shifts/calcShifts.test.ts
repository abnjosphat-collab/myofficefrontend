import { describe, it, expect } from 'vitest';
import { buildHolidayMap, computeDayStatus, cycleProgress, d2s, findEvent, stripTime, todayStatus } from './calcShifts';
import type { ShiftAssignment } from './types';

function assignment(over: Partial<ShiftAssignment> = {}): ShiftAssignment {
  return {
    id: 1, employee_id: 'C1000', employee_name: 'Jane Doe',
    shift_type: '10-4', on_days: 10, off_days: 4, cycle_start_date: '2026-08-01',
    is_active: true, ...over,
  };
}

describe('stripTime / d2s', () => {
  it('strips the time component to local midnight', () => {
    const d = stripTime(new Date(2026, 7, 15, 23, 45));
    expect(d.getHours()).toBe(0);
  });
  it('formats as YYYY-MM-DD using local getters (not toISOString, no UTC+ off-by-one)', () => {
    expect(d2s(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('computeDayStatus — the on/off cycle', () => {
  it('is "on" for the first on_days days of a cycle starting today', () => {
    const a = assignment({ cycle_start_date: d2s(new Date()), on_days: 10, off_days: 4 });
    expect(computeDayStatus(a, new Date())).toBe('on');
  });

  it('flips to "off" once on_days have elapsed', () => {
    const start = new Date(2026, 7, 1);
    const a = assignment({ cycle_start_date: d2s(start), on_days: 10, off_days: 4 });
    const day11 = new Date(2026, 7, 11); // day index 10 (0-based) — first off day
    expect(computeDayStatus(a, day11)).toBe('off');
  });

  it('wraps correctly into a second cycle', () => {
    const start = new Date(2026, 7, 1);
    const a = assignment({ cycle_start_date: d2s(start), on_days: 10, off_days: 4 });
    const day15 = new Date(2026, 7, 15); // day index 14 = 14 % 14 = 0 -> back to 'on'
    expect(computeDayStatus(a, day15)).toBe('on');
  });

  it('is always "standby" for a standby-type assignment (no on/off cycle)', () => {
    const a = assignment({ shift_type: 'standby' });
    expect(computeDayStatus(a, new Date())).toBe('standby');
  });

  it('an override event with an explicit status wins over the cycle', () => {
    const a = assignment({
      cycle_start_date: d2s(new Date()), on_days: 10, off_days: 4,
      day_overrides: [{ id: 'ev1', from: d2s(new Date()), to: d2s(new Date()), type: 'custom', status: 'off' }],
    });
    expect(computeDayStatus(a, new Date())).toBe('off'); // would otherwise be 'on'
  });

  it("an override event with no explicit status falls back to its type's default", () => {
    const today = d2s(new Date());
    const a = assignment({
      cycle_start_date: today, on_days: 10, off_days: 4,
      day_overrides: [{ id: 'ev1', from: today, to: today, type: 'annual_leave' }], // annual_leave defaults to 'off'
    });
    expect(computeDayStatus(a, new Date())).toBe('off');
  });

  it('a standby period during an "on" day is "on+standby", during an "off" day is "standby"', () => {
    const start = new Date(2026, 7, 1);
    const onDay = d2s(new Date(2026, 7, 3));
    const offDay = d2s(new Date(2026, 7, 12));
    const a = assignment({
      cycle_start_date: d2s(start), on_days: 10, off_days: 4,
      standby_periods: [{ from: onDay, to: offDay }],
    });
    expect(computeDayStatus(a, new Date(2026, 7, 3))).toBe('on+standby');
    expect(computeDayStatus(a, new Date(2026, 7, 12))).toBe('standby');
  });
});

describe('todayStatus', () => {
  it("is computeDayStatus for today's date", () => {
    const a = assignment({ cycle_start_date: d2s(new Date()), on_days: 10, off_days: 4 });
    expect(todayStatus(a)).toBe('on');
  });
});

describe('cycleProgress', () => {
  it('is 0 for a standby assignment (no cycle to progress through)', () => {
    expect(cycleProgress(assignment({ shift_type: 'standby' }))).toBe(0);
  });
  it('is 100 for a degenerate zero-length cycle', () => {
    expect(cycleProgress(assignment({ on_days: 0, off_days: 0 }))).toBe(100);
  });
  it('is 0% on the exact cycle-start date', () => {
    const a = assignment({ cycle_start_date: d2s(new Date()), on_days: 10, off_days: 4 });
    expect(cycleProgress(a)).toBe(0);
  });
  it('never returns NaN for a legacy/malformed record missing on_days or off_days', () => {
    // The type says these are always numbers, but real data has shown up without
    // them (2026-08-29 UI audit, audit/07-ui-polish-findings.md) — literally
    // rendered "NaN%" in the UI before cycleProgress guarded against it.
    const a = assignment({ on_days: undefined as unknown as number, off_days: 4 });
    expect(Number.isNaN(cycleProgress(a))).toBe(false);
  });
});

describe('findEvent', () => {
  it('finds an override whose from/to range covers the given date', () => {
    const a = assignment({ day_overrides: [{ id: 'ev1', from: '2026-08-10', to: '2026-08-12', type: 'training' }] });
    expect(findEvent(a, '2026-08-11')?.id).toBe('ev1');
  });
  it('returns undefined when no override covers the date', () => {
    const a = assignment({ day_overrides: [{ id: 'ev1', from: '2026-08-10', to: '2026-08-12', type: 'training' }] });
    expect(findEvent(a, '2026-08-20')).toBeUndefined();
  });
});

describe('buildHolidayMap — reuses lib/zimHolidays.ts (the bug this extraction fixes)', () => {
  it('correctly computes Heroes\' Day as the 2nd Monday of August, not a hardcoded Aug 11', () => {
    // 2026: August 1 is a Saturday, so the 2nd Monday is August 10 — the old local
    // reimplementation hardcoded "${year}-08-11" every year, which was simply wrong
    // for any year (like this one) where the 2nd Monday isn't the 11th.
    const map = buildHolidayMap([new Date(2026, 7, 1)]);
    expect(map.get('2026-08-10')).toBe("Heroes' Day");
    expect(map.get('2026-08-11')).toBe('Defence Forces Day');
  });

  it('includes Feb 21 (Robert Gabriel Mugabe National Youth Day), missing from the old local copy', () => {
    const map = buildHolidayMap([new Date(2026, 1, 1)]);
    expect(map.has('2026-02-21')).toBe(true);
  });

  it('covers every year represented in the input dates', () => {
    const map = buildHolidayMap([new Date(2025, 0, 1), new Date(2026, 0, 1)]);
    expect(map.get('2025-01-01')).toBe("New Year's Day");
    expect(map.get('2026-01-01')).toBe("New Year's Day");
  });
});
