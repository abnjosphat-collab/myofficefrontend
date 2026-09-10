import { describe, expect, it } from 'vitest';
import {
  buildMonthDayRows,
  calcArtisanTimesheetTotals,
  mergeMonthRows,
  monthName,
} from './calcTotals';

describe('buildMonthDayRows', () => {
  it('generates 31 rows for January', () => {
    const rows = buildMonthDayRows(2024, 1);
    expect(rows).toHaveLength(31);
    expect(rows[0].date).toBe('2024-01-01');
    expect(rows[0].day).toBe('Mon');
    expect(rows[30].date).toBe('2024-01-31');
  });

  it('generates 29 rows for Feb 2024 (leap year)', () => {
    expect(buildMonthDayRows(2024, 2)).toHaveLength(29);
  });
});

describe('mergeMonthRows', () => {
  it('preserves saved hours on matching dates', () => {
    const saved = buildMonthDayRows(2024, 1);
    saved[0] = { ...saved[0], normal_hrs: 8, comments: 'Shift A' };
    const merged = mergeMonthRows(2024, 1, saved);
    expect(merged[0].normal_hrs).toBe(8);
    expect(merged[0].comments).toBe('Shift A');
    expect(merged).toHaveLength(31);
  });
});

describe('calcArtisanTimesheetTotals', () => {
  it('sums hour columns', () => {
    const rows = buildMonthDayRows(2024, 1);
    rows[0].normal_hrs = 8;
    rows[0].ot_15 = 2;
    rows[1].night_shift = 10;
    expect(calcArtisanTimesheetTotals(rows)).toEqual({
      normal_hrs: 8,
      ot_15: 2,
      ot_20: 0,
      sb_15: 0,
      sb_20: 0,
      night_shift: 10,
    });
  });
});

describe('monthName', () => {
  it('returns English month name', () => {
    expect(monthName(3)).toBe('March');
  });
});
