import { describe, it, expect } from 'vitest';
import {
  mergeEffectiveShiftPresets,
  formatCompactShiftLabel,
  parsePersonalShiftStore,
  MIN_LEARN_USES,
} from './shiftTimePresetsPersonal';
import { FREQUENT_SHIFT_TIME_PRESETS } from './shiftTimePresets';

describe('shiftTimePresetsPersonal', () => {
  it('formats compact chip labels', () => {
    expect(formatCompactShiftLabel('07:00', '17:00')).toBe('7–17');
    expect(formatCompactShiftLabel('04:00', '06:30')).toBe('4–6:30');
  });

  it('merges built-in presets and learned ranges without duplicates', () => {
    const personal = [
      { start: '07:00', end: '17:00', useCount: 10, lastUsedAt: 1, userAdded: false },
      { start: '18:00', end: '04:00', useCount: MIN_LEARN_USES, lastUsedAt: 2, userAdded: false },
    ];
    const merged = mergeEffectiveShiftPresets(FREQUENT_SHIFT_TIME_PRESETS, personal);
    expect(merged.some(p => p.id === 'day-07-17')).toBe(true);
    expect(merged.filter(p => p.start === '07:00' && p.end === '17:00')).toHaveLength(1);
    expect(merged.some(p => p.start === '18:00' && p.end === '04:00')).toBe(true);
  });

  it('shows user-saved custom even on first save', () => {
    const merged = mergeEffectiveShiftPresets(FREQUENT_SHIFT_TIME_PRESETS, [{
      start: '22:00', end: '23:30', useCount: 1, lastUsedAt: 1, userAdded: true, label: 'Late check',
    }]);
    expect(merged.some(p => p.label === 'Late check')).toBe(true);
  });

  it('parses stored JSON safely', () => {
    const store = parsePersonalShiftStore('{"entries":[{"start":"7:00","end":"17:00","useCount":2,"lastUsedAt":1,"userAdded":false}]}');
    expect(store.entries[0].start).toBe('07:00');
  });
});
