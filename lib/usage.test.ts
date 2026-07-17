// lib/usage.test.ts — the usage-analytics store (lib/usage.ts): the pure derivation
// functions the Usage Analyzer renders, plus the localStorage-backed search history.
// jsdom provides window/localStorage.
import { describe, it, expect, beforeEach } from 'vitest';
import {
  topModules, topSearches, usageByHour, dwellByPath, getFeedback, summarize,
  fmtDuration, hourWeekdayHeat, trackSearch, getSearchHistory, clearSearchHistory,
  clearUsage, type UsageEvent,
} from '@/lib/usage';

// A fixed clock so timestamp-derived buckets are deterministic.
const T = new Date('2026-07-14T15:00:00Z').getTime();
const HOUR = 3600_000;

const sample: UsageEvent[] = [
  { type: 'module_open', ts: T, href: '/employees', title: 'Employees' },
  { type: 'module_open', ts: T - HOUR, href: '/employees', title: 'Employees' },
  { type: 'module_open', ts: T - 2 * HOUR, href: '/equipment', title: 'Equipment' },
  { type: 'page_view', ts: T, path: '/employees', dwellMs: 5000 },
  { type: 'page_view', ts: T - HOUR, path: '/employees', dwellMs: 3000 },
  { type: 'search', ts: T, query: 'forklift', results: 3 },
  { type: 'search', ts: T - HOUR, query: 'forklift', results: 3 },
  { type: 'search', ts: T - 2 * HOUR, query: 'safety', results: 1 },
  { type: 'feedback', ts: T, page: '/ppe', rating: 4, text: 'good' },
  { type: 'feedback', ts: T - HOUR, page: '/ppe', rating: 2, text: 'meh' },
];

describe('usage derivations', () => {
  it('topModules ranks by open count', () => {
    const top = topModules(sample);
    expect(top[0]).toMatchObject({ key: '/employees', count: 2, label: 'Employees' });
    expect(top[1]).toMatchObject({ key: '/equipment', count: 1 });
  });

  it('topSearches counts by normalized query', () => {
    const top = topSearches(sample);
    expect(top[0]).toMatchObject({ label: 'forklift', count: 2 });
    expect(top.find(s => s.label === 'safety')?.count).toBe(1);
  });

  it('dwellByPath aggregates visits and total time', () => {
    const rows = dwellByPath(sample);
    const emp = rows.find(r => r.path === '/employees')!;
    expect(emp.visits).toBe(2);
    expect(emp.totalMs).toBe(8000);
    expect(emp.avgMs).toBe(4000);
  });

  it('usageByHour returns 24 buckets summing all interactions', () => {
    const byHour = usageByHour(sample);
    expect(byHour).toHaveLength(24);
    const total = byHour.reduce((s, h) => s + h.count, 0);
    // 3 module opens + 2 page views = 5 interactions (searches/feedback don't count).
    expect(total).toBe(5);
  });

  it('hourWeekdayHeat is a 7x24 grid with the right max', () => {
    const { grid, max } = hourWeekdayHeat(sample);
    expect(grid).toHaveLength(7);
    expect(grid[0]).toHaveLength(24);
    expect(max).toBeGreaterThanOrEqual(1);
  });

  it('getFeedback returns rows newest-first', () => {
    const fb = getFeedback(sample);
    expect(fb).toHaveLength(2);
    expect(fb[0].ts).toBeGreaterThan(fb[1].ts);
  });

  it('summarize totals every event type', () => {
    const s = summarize(sample);
    expect(s.moduleOpens).toBe(3);
    expect(s.pageViews).toBe(2);
    expect(s.searches).toBe(3);
    expect(s.feedbackCount).toBe(2);
    expect(s.avgFeedbackRating).toBe(3); // (4 + 2) / 2
  });
});

describe('fmtDuration', () => {
  it('formats sub-second, seconds, minutes, hours', () => {
    expect(fmtDuration(500)).toBe('<1s');
    expect(fmtDuration(5000)).toBe('5s');
    expect(fmtDuration(90_000)).toBe('1m 30s');
    expect(fmtDuration(3_660_000)).toBe('1h 1m');
  });
});

describe('search history (localStorage-backed)', () => {
  beforeEach(() => clearUsage());

  it('records distinct recent queries newest-first', () => {
    trackSearch('alpha', 1);
    trackSearch('beta', 2);
    trackSearch('alpha', 3); // duplicate — should collapse, moving alpha to front
    const hist = getSearchHistory();
    expect(hist[0]).toBe('alpha');
    expect(hist).toContain('beta');
    expect(hist.filter(q => q === 'alpha')).toHaveLength(1);
  });

  it('ignores blank queries', () => {
    trackSearch('   ', 0);
    expect(getSearchHistory()).toHaveLength(0);
  });

  it('clearSearchHistory removes only search events', () => {
    trackSearch('gamma', 1);
    clearSearchHistory();
    expect(getSearchHistory()).toHaveLength(0);
  });
});
