import { describe, it, expect, beforeAll } from 'vitest';
import { addMonths, todayLocal, daysUntil } from './dates';

// Exercise it in a UTC+ timezone — exactly where the old `new Date(...).toISOString()`
// implementation produced a day-early result (Africa/Johannesburg is UTC+2). addMonths is
// TZ-independent by construction, so it must give the same right answer regardless.
beforeAll(() => { process.env.TZ = 'Africa/Johannesburg'; });

describe('addMonths — timezone-safe expiry math', () => {
  it('adds months without shifting the day (the reported bug)', () => {
    expect(addMonths('2024-01-15', 6)).toBe('2024-07-15');
    expect(addMonths('2024-03-10', 24)).toBe('2026-03-10');
    expect(addMonths('2024-06-01', 3)).toBe('2024-09-01');
  });

  it('clamps day overflow to the last day of the target month', () => {
    expect(addMonths('2024-08-31', 6)).toBe('2025-02-28'); // Feb 2025 has 28 days
    expect(addMonths('2024-01-31', 1)).toBe('2024-02-29'); // 2024 is a leap year
    expect(addMonths('2025-01-31', 1)).toBe('2025-02-28');
  });

  it('crosses year boundaries', () => {
    expect(addMonths('2024-11-20', 3)).toBe('2025-02-20');
    expect(addMonths('2024-12-31', 24)).toBe('2026-12-31');
  });

  it('returns empty for empty or zero-month input', () => {
    expect(addMonths('', 6)).toBe('');
    expect(addMonths('2024-01-15', 0)).toBe('');
  });
});

describe('todayLocal', () => {
  it('returns a YYYY-MM-DD string', () => {
    expect(todayLocal()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('daysUntil', () => {
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  it('is 0 for today regardless of the time of day (the overdue-flip bug)', () => {
    expect(daysUntil(todayLocal())).toBe(0);
    expect(daysUntil(iso(new Date()))).toBe(0);
  });

  it('counts whole days forward and backward', () => {
    const plus = new Date(); plus.setDate(plus.getDate() + 5);
    const minus = new Date(); minus.setDate(minus.getDate() - 3);
    expect(daysUntil(iso(plus))).toBe(5);
    expect(daysUntil(iso(minus))).toBe(-3);
  });

  it('returns 0 for empty input', () => {
    expect(daysUntil('')).toBe(0);
  });
});
