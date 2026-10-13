import { describe, expect, it } from 'vitest';
import { addDays, buildMonth, buildRange, daysInMonth, intensity, weekStart } from './monthLogic';

const r = (date: string, total: number, daily?: number) => ({ date, total_running_hours: total, total_loaded_hours: total * 0.5, daily_running_hours: daily, daily_loaded_hours: daily == null ? undefined : daily * 0.5 });

describe('buildMonth', () => {
  it('lays out every day of the month and totals the readings in it', () => {
    const m = buildMonth([r('2026-10-01', 108, 8), r('2026-10-02', 118, 10)], 2026, 10, '2026-10-05');
    expect(m.days).toHaveLength(31);
    expect(m.days[0]).toMatchObject({ state: 'reading', running: 8, span: 1 });
    expect(m.days[1]).toMatchObject({ state: 'reading', running: 10, span: 1 });
    expect(m.running).toBe(18);
    expect(m.loadedPct).toBe(50);
    expect(m.recorded).toBe(2);
    expect(m.expected).toBe(5); // 1–5 October have passed
  });

  it('marks a past day without a reading as missing, never zero, and a coming day as future', () => {
    const m = buildMonth([r('2026-10-01', 108, 8)], 2026, 10, '2026-10-05');
    expect(m.days[3]).toMatchObject({ state: 'missing', running: null });
    expect(m.days[9]).toMatchObject({ state: 'future', running: null });
  });

  it('shows how many days a reading after a gap covers', () => {
    const m = buildMonth([r('2026-10-01', 100, 8), r('2026-10-04', 130, 30)], 2026, 10, '2026-10-31');
    expect(m.days[3]).toMatchObject({ state: 'reading', running: 30, span: 3 });
  });

  it('treats days before the first reading as before recording started', () => {
    const m = buildMonth([r('2026-10-10', 40, 8)], 2026, 10, '2026-10-31');
    expect(m.days[0].state).toBe('before');
    expect(m.days[12].state).toBe('missing');
  });

  it('works the daily hours out from the totals when a reading lacks them', () => {
    const m = buildMonth([r('2026-10-01', 100), r('2026-10-02', 112)], 2026, 10, '2026-10-31');
    expect(m.days[1].running).toBe(12);
  });

  it('has no loaded share without running hours, and counts the whole month once it is over', () => {
    const m = buildMonth([], 2026, 9, '2026-10-10');
    expect(m.loadedPct).toBeNull();
    expect(m.expected).toBe(30);
    expect(m.days.every(d => d.state === 'missing')).toBe(true);
  });
});

describe('intensity', () => {
  it('is the average hours per day over 24, so a gap reading is not shown as one huge day', () => {
    const m = buildMonth([r('2026-10-01', 100, 12), r('2026-10-04', 136, 36)], 2026, 10, '2026-10-31');
    expect(intensity(m.days[0])).toBeCloseTo(0.5);
    expect(intensity(m.days[3])).toBeCloseTo(0.5); // 36 h over 3 days
    expect(intensity(m.days[5])).toBe(0);
  });
});

describe('daysInMonth', () => {
  it('knows the length of each month, February included', () => {
    expect(daysInMonth(2026, 2)).toBe(28);
    expect(daysInMonth(2028, 2)).toBe(29);
    expect(daysInMonth(2026, 10)).toBe(31);
  });
});

describe('weeks and ranges', () => {
  it('starts a week on Monday, wherever in the week the day falls', () => {
    expect(weekStart('2026-10-10')).toBe('2026-10-05'); // a Saturday
    expect(weekStart('2026-10-05')).toBe('2026-10-05'); // the Monday itself
    expect(weekStart('2026-10-11')).toBe('2026-10-05'); // the Sunday closing that week
    expect(addDays('2026-10-30', 3)).toBe('2026-11-02');
  });

  it('builds a seven-day week with the reading behind each day', () => {
    const w = buildRange([r('2026-10-06', 100, 8), r('2026-10-08', 120, 20)], '2026-10-05', '2026-10-11', '2026-10-09');
    expect(w.days).toHaveLength(7);
    expect(w.rows[1]?.date).toBe('2026-10-06');
    expect(w.rows[0]).toBeNull();
    expect(w.days[2].state).toBe('missing');
    expect(w.days[6].state).toBe('future');
    expect(w.running).toBe(28);
    expect(w.expected).toBe(5); // Mon 5 to Fri 9
  });
});
