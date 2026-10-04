import { describe, expect, it } from 'vitest';
import { busiest, busyHours, duration, gridTotal, heatLevel, line, money, monthLabel } from './insightsLogic';

describe('heatmap helpers', () => {
  it('shades by share of the busiest cell, and leaves an empty cell unshaded', () => {
    expect([0, 1, 2, 3, 4].map(v => heatLevel(v, 4))).toEqual([0, 1, 2, 3, 4]);
    expect(heatLevel(5, 0)).toBe(0);
    expect(heatLevel(NaN, 3)).toBe(0);
  });
  it('keeps only hours in which something happened', () => {
    const grid = Array.from({ length: 24 }, () => Array(7).fill(0));
    grid[6][2] = 3; grid[22][0] = 1;
    expect(busyHours(grid)).toEqual([6, 22]);
    expect(gridTotal(grid)).toBe(4);
    expect(busyHours([])).toEqual([]);
  });
});
describe('formats', () => {
  it('says "Not recorded" rather than 0m for a missing duration', () => { expect(duration(null)).toBe('Not recorded'); expect(duration(150)).toBe('2h 30m'); expect(duration(0)).toBe('0m'); });
  it('formats money and months', () => { expect(money(12345.6)).toBe('$12,346'); expect(money(undefined)).toBe('$0'); expect(monthLabel('2026-09')).toMatch(/^Sep/); expect(monthLabel('weird')).toBe('weird'); });
  it('writes a chart as a sentence and finds the busiest row', () => {
    const rows = [{ name: 'A', value: 2 }, { name: 'B', value: 5 }];
    expect(line(rows, ' h')).toBe('A 2 h; B 5 h');
    expect(line([])).toBe('none');
    expect(busiest(rows)?.name).toBe('B');
    expect(busiest([])).toBeNull();
  });
});
