// lib/usage.test.ts — the usage-analytics store (lib/usage.ts): the pure derivation
// functions the Usage Analyzer renders, plus the localStorage-backed search history.
// jsdom provides window/localStorage.
import { describe, it, expect, beforeEach } from 'vitest';
import {
  topModules, topSearches, usageByHour, dwellByPath, getFeedback, summarize,
  fmtDuration, hourWeekdayHeat, trackSearch, getSearchHistory, clearSearchHistory,
  clearUsage, usageOverTime, usageByHourSplit, dailyActivity, topUsers, signedInVsAnonymous,
  type UsageEvent, type EnrichedUsageEvent,
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

describe('usageOverTime', () => {
  // Relative to the real clock (not the fixed T above) so the trailing window covers them.
  const now = Date.now();
  const DAY = 86_400_000;
  const recent: UsageEvent[] = [
    { type: 'module_open', ts: now, href: '/employees', title: 'Employees' },
    { type: 'page_view', ts: now, path: '/employees' },
    { type: 'module_open', ts: now - DAY, href: '/equipment', title: 'Equipment' },
    { type: 'module_open', ts: now - 40 * DAY, href: '/old', title: 'Old' }, // outside a 30-day window
  ];

  it('buckets by day within the trailing window, dropping events outside it', () => {
    const buckets = usageOverTime(recent, 'day', 30);
    expect(buckets).toHaveLength(30);
    const total = buckets.reduce((s, b) => s + b.total, 0);
    expect(total).toBe(3); // the 40-day-old event falls outside the 30-day window
    expect(buckets[buckets.length - 1].opens + buckets[buckets.length - 1].views).toBeGreaterThanOrEqual(2);
  });

  it('buckets by week and by month without throwing, summing to a consistent total', () => {
    const weekly = usageOverTime(recent, 'week', 8);
    const monthly = usageOverTime(recent, 'month', 3);
    expect(weekly).toHaveLength(8);
    expect(monthly).toHaveLength(3);
    expect(monthly.reduce((s, b) => s + b.total, 0)).toBe(4); // month window catches the 40-day-old one too
  });
});

describe('usageByHourSplit', () => {
  it('splits opens vs views into 24 hourly buckets', () => {
    const rows = usageByHourSplit(sample);
    expect(rows).toHaveLength(24);
    const opens = rows.reduce((s, r) => s + r.opens, 0);
    const views = rows.reduce((s, r) => s + r.views, 0);
    expect(opens).toBe(3);
    expect(views).toBe(2);
  });
});

describe('dailyActivity', () => {
  it('returns a per-day count with up to 6 HH:mm timestamps', () => {
    const now = Date.now();
    const events: UsageEvent[] = [
      { type: 'module_open', ts: now, href: '/a' },
      { type: 'page_view', ts: now, path: '/a' },
    ];
    const days = dailyActivity(events, 7);
    expect(days).toHaveLength(7);
    const today = days[days.length - 1];
    expect(today.count).toBe(2);
    expect(today.times.length).toBe(2);
  });
});

describe('topUsers / signedInVsAnonymous', () => {
  const enriched: EnrichedUsageEvent[] = [
    { type: 'module_open', ts: T, href: '/employees', sessionId: 's-1', userEmail: 'a@b.com', anonymous: false },
    { type: 'page_view', ts: T, path: '/employees', sessionId: 's-1', userEmail: 'a@b.com', anonymous: false },
    { type: 'module_open', ts: T, href: '/ppe', sessionId: 's-2', userEmail: null, anonymous: true },
    { type: 'module_open', ts: T, href: '/ppe', sessionId: 's-2', userEmail: null, anonymous: true },
    { type: 'search', ts: T, query: 'x', results: 0, sessionId: 's-2', userEmail: null, anonymous: true }, // not counted
  ];

  it('topUsers ranks signed-in users by email and anonymous visitors by session', () => {
    const top = topUsers(enriched);
    expect(top).toHaveLength(2);
    expect(top.find(u => u.anonymous)).toMatchObject({ label: 'Anonymous visitor (s-2)', count: 2 });
    expect(top.find(u => !u.anonymous)).toMatchObject({ label: 'a@b.com', count: 2 });
  });

  it('signedInVsAnonymous splits counts and distinct identities', () => {
    const s = signedInVsAnonymous(enriched);
    expect(s.signedIn).toBe(2);
    expect(s.anonymous).toBe(2);
    expect(s.distinctUsers).toBe(1);
    expect(s.distinctAnonymousSessions).toBe(1);
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
