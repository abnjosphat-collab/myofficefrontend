import { describe, expect, it } from 'vitest';
import { formatDate, formatDateTime, formatDayMonth, formatMonth, formatMonthYear, formatShortDateTime, formatTime, monthName } from './format';

// Pins the exact shapes the app's conversions rely on (all en-GB).
describe('shared date shapes', () => {
  const d = new Date(2026, 9, 10, 14, 30); // 10 Oct 2026, 14:30 local
  it('formats the standard date, datetime and time', () => {
    expect(formatDate(d)).toBe('10 Oct 2026');
    expect(formatDateTime(d)).toBe('10 Oct 2026, 14:30');
    expect(formatTime(d)).toBe('14:30');
  });

  it('formats day-month and month labels for charts and lists', () => {
    expect(formatDayMonth(d)).toBe('10 Oct');
    expect(formatMonth(d)).toBe('Oct');
    expect(formatMonth(d, 'short')).toBe('Oct 26');
    expect(formatMonth(d, 'full')).toBe('Oct 2026');
    expect(formatMonthYear(d)).toBe('October 2026');
  });

  it('formats the short datetime and month names', () => {
    expect(formatShortDateTime(d)).toBe('10 Oct, 14:30');
    expect(formatShortDateTime(null)).toBe('—');
    expect(monthName(3)).toBe('March');
    expect(monthName(13)).toBe('—');
  });

  it('accepts ISO strings and degrades gracefully', () => {
    expect(formatDate('2026-10-10')).toBe('10 Oct 2026');
    expect(formatDateTime(null)).toBe('—');
    expect(formatDayMonth('not a date')).toBe('—');
  });
});
