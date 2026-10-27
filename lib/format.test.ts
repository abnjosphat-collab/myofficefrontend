import { describe, expect, it } from 'vitest';
import { formatDate, formatDateTime, formatDayMonth, formatMonth, formatMonthYear, formatShortDateTime, formatTime, formatUpdatedAgo, monthName } from './format';

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

describe('formatUpdatedAgo', () => {
  const now = new Date(2026, 9, 27, 10, 0, 0);
  const ago = (ms: number) => new Date(now.getTime() - ms);
  it('reads just now under 90 seconds, minutes under an hour, hours under a day', () => {
    expect(formatUpdatedAgo(ago(0), now)).toBe('just now');
    expect(formatUpdatedAgo(ago(89_000), now)).toBe('just now');
    expect(formatUpdatedAgo(ago(90_000), now)).toBe('1 min ago');
    expect(formatUpdatedAgo(ago(119_000), now)).toBe('1 min ago');
    expect(formatUpdatedAgo(ago(2 * 60_000), now)).toBe('2 min ago');
    expect(formatUpdatedAgo(ago(59 * 60_000), now)).toBe('59 min ago');
    expect(formatUpdatedAgo(ago(60 * 60_000), now)).toBe('1 hr ago');
    expect(formatUpdatedAgo(ago(5 * 3_600_000), now)).toBe('5 hr ago');
  });
  it('falls back to the date past a day, and never goes negative', () => {
    expect(formatUpdatedAgo(ago(25 * 3_600_000), now)).toBe('26 Oct 2026');
    expect(formatUpdatedAgo(new Date(now.getTime() + 60_000), now)).toBe('just now');
  });
});
