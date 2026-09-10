import { describe, expect, it } from 'vitest';
import { normalHrsForDayStatus } from './hourAlloc';

describe('normalHrsForDayStatus', () => {
  it('credits 10h for on duty and 8h for leave types', () => {
    expect(normalHrsForDayStatus('')).toBe(10);
    expect(normalHrsForDayStatus('sick')).toBe(8);
    expect(normalHrsForDayStatus('leave')).toBe(8);
  });

  it('credits 0h for off and absent', () => {
    expect(normalHrsForDayStatus('off')).toBe(0);
    expect(normalHrsForDayStatus('absent')).toBe(0);
  });
});
