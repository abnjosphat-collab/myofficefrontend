import { describe, it, expect } from 'vitest';
import {
  findShiftTimePresetId,
  FREQUENT_SHIFT_TIME_PRESETS,
  isDefaultDayShiftTimes,
  normalizeClockTime,
  shiftTimesMatch,
} from './shiftTimePresets';

describe('shiftTimePresets', () => {
  it('normalizes clock values for matching', () => {
    expect(normalizeClockTime('7:00')).toBe('07:00');
    expect(shiftTimesMatch('07:00', '17:00', '7:00', '17:00')).toBe(true);
  });

  it('finds frequent preset ids', () => {
    expect(findShiftTimePresetId('04:00', '06:00')).toBe('ot-04-06');
    expect(findShiftTimePresetId('17:00', '18:00')).toBe('ot-17-18');
    expect(findShiftTimePresetId('08:00', '12:00')).toBeNull();
  });

  it('recognises the default day shift window', () => {
    expect(isDefaultDayShiftTimes('07:00', '17:00')).toBe(true);
    expect(isDefaultDayShiftTimes('7:00', '17:00')).toBe(true);
    expect(isDefaultDayShiftTimes('07:00', '16:00')).toBe(false);
  });

  it('lists the four user-requested ranges', () => {
    const keys = FREQUENT_SHIFT_TIME_PRESETS.map(p => `${p.start}-${p.end}`);
    expect(keys).toEqual(['07:00-17:00', '04:00-06:00', '17:00-19:00', '17:00-18:00']);
  });
});
