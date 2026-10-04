import { describe, expect, it } from 'vitest';
import { buildTimeSeries, describeCosts, issueCost, topBy } from './analytics';
import type { StockIssue } from './types';

const issue = (over: Partial<StockIssue> = {}): StockIssue => ({ id: 1, issued_at: '2026-10-02T10:00:00', recipient_name: 'Ann', items: [{ description: 'Bearing', qty: 2, unit_price: 10 }], ...over });
const NOW = new Date(2026, 9, 4, 12, 0); // Sun 4 Oct 2026, local time

describe('issueCost', () => {
  it('sums quantity times price and treats a missing price as 0', () => {
    expect(issueCost(issue({ items: [{ description: 'a', qty: 2, unit_price: 10 }, { description: 'b', qty: 3 }] }))).toBe(20);
  });
  it('copes with a record that has no items', () => {
    expect(issueCost(issue({ items: undefined as never }))).toBe(0);
  });
});

describe('buildTimeSeries', () => {
  it('has 30 daily, 13 weekly and 12 monthly buckets ending now', () => {
    expect(buildTimeSeries([], 'day', NOW)).toHaveLength(30);
    expect(buildTimeSeries([], 'week', NOW)).toHaveLength(13);
    expect(buildTimeSeries([], 'month', NOW)).toHaveLength(12);
  });
  it('puts an issue in its local day, week and month', () => {
    expect(buildTimeSeries([issue()], 'day', NOW).find(p => p.key === '2026-10-02')).toMatchObject({ count: 1, cost: 20, itemCount: 1 });
    expect(buildTimeSeries([issue()], 'week', NOW).find(p => p.key === '2026-09-28')).toMatchObject({ count: 1 }); // the Monday of that week
    expect(buildTimeSeries([issue()], 'month', NOW).at(-1)).toMatchObject({ key: '2026-10', count: 1 });
  });
  it('leaves out an issue with a malformed date instead of throwing', () => {
    const bad = issue({ issued_at: 'not a date' });
    expect(() => buildTimeSeries([bad], 'day', NOW)).not.toThrow();
    expect(buildTimeSeries([bad], 'day', NOW).every(p => p.count === 0)).toBe(true);
  });
  it('counts an unpriced issue in the count but not in costWithPrice', () => {
    const pt = buildTimeSeries([issue({ items: [{ description: 'x', qty: 1 }] })], 'day', NOW).find(p => p.key === '2026-10-02')!;
    expect(pt.count).toBe(1);
    expect(pt.costWithPrice).toBe(0);
  });
});

describe('describeCosts', () => {
  it('gives the mean, median and spread, and how many issues carry a price', () => {
    const s = describeCosts([20, 0], [issue(), issue({ items: [{ description: 'x', qty: 1 }] })]);
    expect(s).toMatchObject({ total: 20, count: 2, mean: 10, median: 10, min: 0, max: 20, costed: 1 });
    expect(s.stdDev).toBe(10);
  });
  it('is all zeros for no issues', () => {
    expect(describeCosts([], [])).toMatchObject({ total: 0, count: 0, mean: 0, costed: 0 });
  });
});

describe('topBy', () => {
  it('ranks recipients and items by cost', () => {
    const issues = [issue({ recipient_name: 'Ann' }), issue({ recipient_name: 'Bob', items: [{ stock_code: 'S1', description: 'Seal', qty: 5, unit_price: 10 }] })];
    expect(topBy(issues, 'recipient_name').map(r => r.name)).toEqual(['Bob', 'Ann']);
    expect(topBy(issues, 'description')[0]).toMatchObject({ name: 'S1 · Seal', cost: 50, count: 5 });
  });
});
