import { describe, it, expect } from 'vitest';
import { getZimHolidays, zimHolidayName } from './zimHolidays';

describe('getZimHolidays', () => {
  it('includes the fixed-date holidays for a given year', () => {
    const holidays = getZimHolidays(2026).map(h => h.date);
    expect(holidays).toContain('2026-01-01');
    expect(holidays).toContain('2026-04-18');
    expect(holidays).toContain('2026-05-01');
    expect(holidays).toContain('2026-05-25');
    expect(holidays).toContain('2026-12-22');
    expect(holidays).toContain('2026-12-25');
    expect(holidays).toContain('2026-12-26');
  });

  it('computes Easter-based holidays correctly (2026: Easter Sunday is Apr 5)', () => {
    const byName = Object.fromEntries(getZimHolidays(2026).map(h => [h.name, h.date]));
    expect(byName['Good Friday']).toBe('2026-04-03');
    expect(byName['Easter Saturday']).toBe('2026-04-04');
    expect(byName['Easter Monday']).toBe('2026-04-06');
  });

  it("computes Heroes' Day as the 2nd Monday of August, Defence Forces Day the day after", () => {
    const byName = Object.fromEntries(getZimHolidays(2026).map(h => [h.name, h.date]));
    // Aug 1 2026 is a Saturday, so the 2nd Monday is Aug 10.
    expect(byName["Heroes' Day"]).toBe('2026-08-10');
    expect(byName['Defence Forces Day']).toBe('2026-08-11');
  });

  it('returns 13 holidays, sorted by date', () => {
    const holidays = getZimHolidays(2026);
    expect(holidays).toHaveLength(13);
    const dates = holidays.map(h => h.date);
    expect(dates).toEqual([...dates].sort());
  });
});

describe('zimHolidayName', () => {
  it('returns the holiday name for a known holiday date', () => {
    expect(zimHolidayName('2026-12-25')).toBe('Christmas Day');
  });

  it('returns null for a non-holiday date', () => {
    expect(zimHolidayName('2026-03-15')).toBeNull();
  });

  it('returns null for an empty/invalid date', () => {
    expect(zimHolidayName('')).toBeNull();
  });

  it('works across different years independently', () => {
    expect(zimHolidayName('2025-01-01')).toBe("New Year's Day");
    expect(zimHolidayName('2027-01-01')).toBe("New Year's Day");
  });
});
