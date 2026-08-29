import { describe, it, expect } from 'vitest';
import { calcDowntime, minutesToDisplay, sparesTotalCost, timeToMinutes } from './calcBreakdowns';
import type { SparePart } from './types';

describe('timeToMinutes', () => {
  it('converts HH:MM to minutes since midnight', () => {
    expect(timeToMinutes('01:30')).toBe(90);
    expect(timeToMinutes('00:00')).toBe(0);
    expect(timeToMinutes('23:59')).toBe(1439);
  });
  it('is 0 for an empty/missing string', () => {
    expect(timeToMinutes('')).toBe(0);
  });
});

describe('minutesToDisplay', () => {
  it('formats hours and minutes together', () => {
    expect(minutesToDisplay(90)).toBe('1h 30m');
  });
  it('omits the minutes part when it is exactly on the hour', () => {
    expect(minutesToDisplay(120)).toBe('2h');
  });
  it('shows just minutes under an hour', () => {
    expect(minutesToDisplay(45)).toBe('45m');
  });
  it('shows 0m for a genuine zero (distinguished from missing/undefined)', () => {
    expect(minutesToDisplay(0)).toBe('0m');
  });
});

describe('calcDowntime', () => {
  it('computes same-day duration', () => {
    expect(calcDowntime('09:00', '11:30')).toBe(150);
  });
  it('wraps past midnight instead of going negative (an overnight breakdown)', () => {
    expect(calcDowntime('23:10', '01:40')).toBe(150); // 50min to midnight + 100min after
  });
  it('is 0 when either time is missing', () => {
    expect(calcDowntime(undefined, '11:00')).toBe(0);
    expect(calcDowntime('09:00', undefined)).toBe(0);
  });
});

describe('sparesTotalCost', () => {
  const spare = (total_cost: number): SparePart => ({ name: 'Bolt', quantity: 1, unit_price: total_cost, total_cost });

  it('sums total_cost across all spares used', () => {
    expect(sparesTotalCost([spare(12.5), spare(7.25)])).toBeCloseTo(19.75);
  });
  it('is 0 for no spares (undefined or empty array)', () => {
    expect(sparesTotalCost(undefined)).toBe(0);
    expect(sparesTotalCost([])).toBe(0);
  });
  it('treats a missing/unparseable total_cost as 0 rather than NaN', () => {
    const withMissing = { ...spare(0), total_cost: undefined as unknown as number };
    expect(sparesTotalCost([withMissing, spare(5)])).toBe(5);
  });
});
