import { describe, expect, it } from 'vitest';
import { NO_DATA, averageAvailability, figureText, hasFigure } from './figures';

describe('availability figures', () => {
  it('only real numbers count as a figure; null, undefined and NaN do not, but 0 does', () => {
    expect(hasFigure(0)).toBe(true);
    expect(hasFigure(97.5)).toBe(true);
    expect(hasFigure(null)).toBe(false);
    expect(hasFigure(undefined)).toBe(false);
    expect(hasFigure(Number.NaN)).toBe(false);
  });

  it('shows "No data" for a missing figure and the formatted number otherwise', () => {
    expect(figureText(null, n => `${n}%`)).toBe(NO_DATA);
    expect(figureText(undefined, n => `${n}%`)).toBe('No data');
    expect(figureText(91.25, n => `${n.toFixed(1)}%`)).toBe('91.3%');
    expect(figureText(0, n => `${n.toFixed(1)}%`)).toBe('0.0%');
  });

  describe('averageAvailability', () => {
    it('averages only the measured units, so an unmeasured one is not counted as 0% or 100%', () => {
      expect(averageAvailability([{ availability: 90 }, { availability: null }, { availability: 100 }])).toEqual({ average: 95, measured: 2 });
    });

    it('counts a measured 0% as a real reading', () => {
      expect(averageAvailability([{ availability: 0 }, { availability: 100 }])).toEqual({ average: 50, measured: 2 });
    });

    it('is null (No data) when nothing is measured, and for an empty list', () => {
      expect(averageAvailability([{ availability: null }, { availability: null }])).toEqual({ average: null, measured: 0 });
      expect(averageAvailability([])).toEqual({ average: null, measured: 0 });
    });
  });
});
