import { describe, it, expect, beforeAll } from 'vitest';
import {
  calcCalendarLeaveDays,
  calcWorkingLeaveDays,
  calcLeaveDays,
  isWorkingLeaveDay,
} from './calcLeaveDays';

beforeAll(() => { process.env.TZ = 'Africa/Johannesburg'; });

describe('calcCalendarLeaveDays', () => {
  it('counts inclusive calendar days', () => {
    expect(calcCalendarLeaveDays('2026-09-11', '2026-09-14')).toBe(4);
    expect(calcCalendarLeaveDays('2026-09-11', '2026-09-11')).toBe(1);
  });
});

describe('calcWorkingLeaveDays', () => {
  it('counts Fri–Mon as 2 working days (Fri + Mon, skip weekend)', () => {
    // 2026-09-11 = Friday, 2026-09-14 = Monday
    expect(calcWorkingLeaveDays('2026-09-11', '2026-09-14')).toBe(2);
  });

  it('excludes Zimbabwe public holidays', () => {
    // Independence Day 2026-04-18 is a Saturday — pick Workers' Day week: 2026-04-30 Thu – 2026-05-04 Mon
    // Thu, Fri working; Sat/Sun off; Mon = Workers' Day (holiday) → 2 working days
    expect(calcWorkingLeaveDays('2026-04-30', '2026-05-04')).toBe(2);
    expect(isWorkingLeaveDay('2026-05-01')).toBe(false);
    expect(isWorkingLeaveDay('2026-09-15')).toBe(false);
    expect(calcWorkingLeaveDays('2026-09-14', '2026-09-16')).toBe(2);
  });

  it('returns 0 when end is before start', () => {
    expect(calcWorkingLeaveDays('2026-09-14', '2026-09-11')).toBe(0);
  });
});

describe('calcLeaveDays', () => {
  it('switches between calendar and working modes', () => {
    expect(calcLeaveDays('2026-09-11', '2026-09-14')).toBe(4);
    expect(calcLeaveDays('2026-09-11', '2026-09-14', { excludeWeekendsAndHolidays: true })).toBe(2);
  });
});
