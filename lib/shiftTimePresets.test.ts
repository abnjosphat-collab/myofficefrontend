import { describe, it, expect } from 'vitest';
import {
  findShiftTimePresetId,
  FREQUENT_SHIFT_TIME_PRESETS,
  isDefaultDayShiftTimes,
  normalizeClockTime,
  shiftTimesMatch,
  splitShiftPresets,
  type ShiftTimePreset,
} from './shiftTimePresets';

const make = (n: number): ShiftTimePreset[] => Array.from({ length: n }, (_, i) => ({
  id: `p${i}`, label: `P${i}`, description: `Shift ${i}`, start: '07:00', end: '17:00',
}));

describe('splitShiftPresets', () => {
  it('shows everything when the list is not longer than the limit plus one', () => {
    expect(splitShiftPresets(make(4), null).more).toEqual([]);
    expect(splitShiftPresets(make(6), null)).toEqual({ chips: make(6), more: [] });
  });

  it('keeps the first five as chips and moves the rest into the menu', () => {
    const { chips, more } = splitShiftPresets(make(9), null);
    expect(chips.map(p => p.id)).toEqual(['p0', 'p1', 'p2', 'p3', 'p4']);
    expect(more.map(p => p.id)).toEqual(['p5', 'p6', 'p7', 'p8']);
  });

  it('keeps the selected shift visible when it would have been hidden', () => {
    const { chips, more } = splitShiftPresets(make(9), 'p7');
    expect(chips.map(p => p.id)).toEqual(['p0', 'p1', 'p2', 'p3', 'p7']);
    expect(more.map(p => p.id)).toEqual(['p4', 'p5', 'p6', 'p8']);
  });

  it('leaves the split alone when the selected shift is already a chip', () => {
    expect(splitShiftPresets(make(9), 'p2').chips.map(p => p.id)).toEqual(['p0', 'p1', 'p2', 'p3', 'p4']);
  });
});

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
