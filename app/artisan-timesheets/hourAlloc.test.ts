import { describe, expect, it } from 'vitest';
import { normalHrsForDayStatus } from './hourAlloc';

describe('normalHrsForDayStatus', () => {
  it('credits nothing for on-duty days: artisans are on basic pay', () => {
    expect(normalHrsForDayStatus('')).toBe(0);
  });

  it('credits 8h for leave types', () => {
    expect(normalHrsForDayStatus('sick')).toBe(8);
    expect(normalHrsForDayStatus('leave')).toBe(8);
    expect(normalHrsForDayStatus('maternity')).toBe(8);
  });

  it('credits 0h for off, absent and training', () => {
    expect(normalHrsForDayStatus('off')).toBe(0);
    expect(normalHrsForDayStatus('absent')).toBe(0);
    expect(normalHrsForDayStatus('training')).toBe(0);
  });
});
