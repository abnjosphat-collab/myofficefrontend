// lib/usage.ts — client-side usage analytics store (localStorage-backed, no backend).
//
// Records a capped, timestamped event log of how the app is used — module opens,
// page views + dwell time, searches, and feedback — and exposes derivations the
// Usage Analyzer page renders (most-used, usage-over-time, hour×weekday heatmap,
// top searches, dwell-by-page, feedback log). Everything is best-effort and
// SSR-safe; a private/again-unavailable localStorage just degrades to empty data.
//
// Deliberately dependency-free so it can be imported anywhere (shell, pages, lib)
// without pulling in React or the design system.

import { toLocalISODate } from './dates';

export type UsageEvent =
  | { type: 'module_open'; ts: number; href: string; title?: string }
  | { type: 'page_view'; ts: number; path: string; dwellMs?: number }
  | { type: 'search'; ts: number; query: string; results: number }
  | { type: 'feedback'; ts: number; page: string; rating: number; text: string };

const EVENTS_KEY = 'oz_usageEvents';
const MAX_EVENTS = 4000; // ~ a few hundred KB; oldest events fall off the front

/** Broadcast so open Usage Analyzer tabs / hooks can live-refresh. */
export const USAGE_EVENT = 'oz-usage-changed';

function read(): UsageEvent[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(EVENTS_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

function write(events: UsageEvent[]) {
  if (typeof window === 'undefined') return;
  try {
    const trimmed = events.length > MAX_EVENTS ? events.slice(events.length - MAX_EVENTS) : events;
    window.localStorage.setItem(EVENTS_KEY, JSON.stringify(trimmed));
    window.dispatchEvent(new CustomEvent(USAGE_EVENT));
  } catch { /* storage unavailable — non-fatal */ }
}

export function logEvent(e: UsageEvent) {
  const events = read();
  events.push(e);
  write(events);
}

export function getEvents(): UsageEvent[] { return read(); }

export function clearUsage() {
  if (typeof window === 'undefined') return;
  try { window.localStorage.removeItem(EVENTS_KEY); window.dispatchEvent(new CustomEvent(USAGE_EVENT)); } catch { /* noop */ }
}

// ─── Trackers ────────────────────────────────────────────────────────────────

export function trackModuleOpen(href: string, title?: string) {
  logEvent({ type: 'module_open', ts: Date.now(), href, title });
}

export function trackPageView(path: string, dwellMs?: number) {
  logEvent({ type: 'page_view', ts: Date.now(), path, dwellMs });
}

export function trackSearch(query: string, results: number) {
  const q = query.trim();
  if (!q) return;
  logEvent({ type: 'search', ts: Date.now(), query: q, results });
}

export function saveFeedback(page: string, rating: number, text: string) {
  logEvent({ type: 'feedback', ts: Date.now(), page, rating, text: text.trim() });
}

// ─── Search history ──────────────────────────────────────────────────────────

/** Most-recent distinct search queries (newest first). */
export function getSearchHistory(limit = 8): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const events = read();
  for (let i = events.length - 1; i >= 0 && out.length < limit; i--) {
    const e = events[i];
    if (e.type !== 'search') continue;
    const key = e.query.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(e.query);
  }
  return out;
}

export function clearSearchHistory() {
  write(read().filter(e => e.type !== 'search'));
}

// ─── Derivations for the analyzer ─────────────────────────────────────────────

export interface Counted { key: string; label: string; count: number }

/** Most-opened modules (by href), newest label wins for display. */
export function topModules(events: UsageEvent[], limit = 12): Counted[] {
  const counts = new Map<string, { count: number; label: string }>();
  for (const e of events) {
    if (e.type !== 'module_open') continue;
    const prev = counts.get(e.href);
    counts.set(e.href, { count: (prev?.count ?? 0) + 1, label: e.title || prev?.label || e.href });
  }
  return [...counts.entries()]
    .map(([key, v]) => ({ key, label: v.label, count: v.count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

/** Top search queries by frequency. */
export function topSearches(events: UsageEvent[], limit = 10): Counted[] {
  const counts = new Map<string, number>();
  for (const e of events) {
    if (e.type !== 'search') continue;
    const key = e.query.toLowerCase();
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([key, count]) => ({ key, label: key, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export type Granularity = 'day' | 'week' | 'month';
export interface PeriodBucket { date: string; label: string; opens: number; views: number; total: number }

/** The Monday (local midnight) of the week containing `d`. */
function mondayOf(d: Date): Date {
  const r = new Date(d);
  const day = r.getDay(); // 0=Sun..6=Sat
  r.setDate(r.getDate() + (day === 0 ? -6 : 1) - day);
  r.setHours(0, 0, 0, 0);
  return r;
}

function bucketKey(d: Date, granularity: Granularity): string {
  if (granularity === 'month') return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  if (granularity === 'week') return toLocalISODate(mondayOf(d));
  return toLocalISODate(d);
}

/** Total interactions (module opens + page views), bucketed by day/week/month, over a
 *  trailing window of `periods` buckets ending now. Local-calendar-safe (see lib/dates —
 *  never .toISOString() a local Date, it rolls the date back a day for UTC+ users). */
export function usageOverTime(events: UsageEvent[], granularity: Granularity = 'day', periods = 30): PeriodBucket[] {
  const now = new Date();
  const buckets: PeriodBucket[] = [];
  const index = new Map<string, number>();
  for (let i = periods - 1; i >= 0; i--) {
    let d: Date, label: string;
    if (granularity === 'month') {
      d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      label = d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
    } else if (granularity === 'week') {
      const base = mondayOf(now);
      d = new Date(base); d.setDate(base.getDate() - i * 7);
      label = `w/o ${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`;
    } else {
      d = new Date(now); d.setDate(now.getDate() - i); d.setHours(0, 0, 0, 0);
      label = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    }
    const key = bucketKey(d, granularity);
    index.set(key, buckets.length);
    buckets.push({ date: key, label, opens: 0, views: 0, total: 0 });
  }
  for (const e of events) {
    if (e.type !== 'module_open' && e.type !== 'page_view') continue;
    const i = index.get(bucketKey(new Date(e.ts), granularity));
    if (i === undefined) continue;
    if (e.type === 'module_open') buckets[i].opens++; else buckets[i].views++;
    buckets[i].total++;
  }
  return buckets;
}

/** @deprecated use usageOverTime(events, 'day', days) — kept for call-site brevity. */
export function usageByDay(events: UsageEvent[], days = 30): PeriodBucket[] {
  return usageOverTime(events, 'day', days);
}

/** 7×24 matrix [weekday 0=Sun..6=Sat][hour 0..23] of interaction counts. */
export function hourWeekdayHeat(events: UsageEvent[]): { grid: number[][]; max: number } {
  const grid: number[][] = Array.from({ length: 7 }, () => new Array(24).fill(0));
  let max = 0;
  for (const e of events) {
    if (e.type !== 'module_open' && e.type !== 'page_view') continue;
    const d = new Date(e.ts);
    const w = d.getDay(); const h = d.getHours();
    grid[w][h]++;
    if (grid[w][h] > max) max = grid[w][h];
  }
  return { grid, max };
}

/** Interactions bucketed into the 24 hours of the day (summed across all days). */
export function usageByHour(events: UsageEvent[]): { hour: number; label: string; count: number }[] {
  const counts = new Array(24).fill(0);
  for (const e of events) {
    if (e.type !== 'module_open' && e.type !== 'page_view') continue;
    counts[new Date(e.ts).getHours()]++;
  }
  return counts.map((count, hour) => ({ hour, label: `${String(hour).padStart(2, '0')}:00`, count }));
}

export interface HourSplit { hour: number; label: string; opens: number; views: number; total: number }

/** Interactions bucketed into the 24 hours of the day, split by type, for a richer
 *  time-of-day chart (opens vs views as two lines rather than one flat bar count). */
export function usageByHourSplit(events: UsageEvent[]): HourSplit[] {
  const rows: HourSplit[] = Array.from({ length: 24 }, (_, h) => ({ hour: h, label: `${String(h).padStart(2, '0')}:00`, opens: 0, views: 0, total: 0 }));
  for (const e of events) {
    if (e.type !== 'module_open' && e.type !== 'page_view') continue;
    const row = rows[new Date(e.ts).getHours()];
    if (e.type === 'module_open') row.opens++; else row.views++;
    row.total++;
  }
  return rows;
}

export interface DayActivity { date: string; count: number; times: string[] }

/** Per-calendar-day interaction counts over a trailing window, each day carrying up to 6
 *  actual HH:mm timestamps — the exact-dates-and-times detail a day-of-week×hour heatmap
 *  can't show, since that one aggregates every matching weekday/hour across all history. */
export function dailyActivity(events: UsageEvent[], days = 98): DayActivity[] {
  const now = new Date();
  const buckets: DayActivity[] = [];
  const index = new Map<string, number>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now); d.setDate(now.getDate() - i); d.setHours(0, 0, 0, 0);
    index.set(toLocalISODate(d), buckets.length);
    buckets.push({ date: toLocalISODate(d), count: 0, times: [] });
  }
  const relevant = events.filter(e => e.type === 'module_open' || e.type === 'page_view').sort((a, b) => a.ts - b.ts);
  for (const e of relevant) {
    const d = new Date(e.ts);
    const i = index.get(toLocalISODate(d));
    if (i === undefined) continue;
    buckets[i].count++;
    if (buckets[i].times.length < 6) buckets[i].times.push(d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
  }
  return buckets;
}

export interface DwellRow { path: string; visits: number; totalMs: number; avgMs: number }

/** Per-page dwell time (from page_view events that carry a dwellMs). */
export function dwellByPath(events: UsageEvent[], limit = 12): DwellRow[] {
  const agg = new Map<string, { visits: number; totalMs: number }>();
  for (const e of events) {
    if (e.type !== 'page_view' || !e.dwellMs || e.dwellMs <= 0) continue;
    const prev = agg.get(e.path) ?? { visits: 0, totalMs: 0 };
    prev.visits++; prev.totalMs += e.dwellMs;
    agg.set(e.path, prev);
  }
  return [...agg.entries()]
    .map(([path, v]) => ({ path, visits: v.visits, totalMs: v.totalMs, avgMs: v.totalMs / v.visits }))
    .sort((a, b) => b.totalMs - a.totalMs)
    .slice(0, limit);
}

export interface FeedbackRow { ts: number; page: string; rating: number; text: string }

export function getFeedback(events: UsageEvent[]): FeedbackRow[] {
  return events
    .filter((e): e is Extract<UsageEvent, { type: 'feedback' }> => e.type === 'feedback')
    .map(e => ({ ts: e.ts, page: e.page, rating: e.rating, text: e.text }))
    .sort((a, b) => b.ts - a.ts);
}

// ─── Headline summary ─────────────────────────────────────────────────────────

export interface UsageSummary {
  totalEvents: number;
  moduleOpens: number;
  pageViews: number;
  searches: number;
  feedbackCount: number;
  avgFeedbackRating: number | null;
  activeDays: number;
  firstTs: number | null;
  lastTs: number | null;
  busiestHour: { hour: number; count: number } | null;
}

export function summarize(events: UsageEvent[]): UsageSummary {
  let moduleOpens = 0, pageViews = 0, searches = 0;
  const days = new Set<string>();
  let ratingSum = 0, feedbackCount = 0;
  let firstTs: number | null = null, lastTs: number | null = null;
  for (const e of events) {
    if (firstTs === null || e.ts < firstTs) firstTs = e.ts;
    if (lastTs === null || e.ts > lastTs) lastTs = e.ts;
    if (e.type === 'module_open') moduleOpens++;
    else if (e.type === 'page_view') pageViews++;
    else if (e.type === 'search') searches++;
    else if (e.type === 'feedback') { feedbackCount++; ratingSum += e.rating; }
    if (e.type === 'module_open' || e.type === 'page_view') days.add(new Date(e.ts).toISOString().slice(0, 10));
  }
  const byHour = usageByHour(events);
  const busiest = byHour.reduce((best, cur) => (cur.count > (best?.count ?? -1) ? cur : best), null as null | { hour: number; count: number });
  return {
    totalEvents: events.length,
    moduleOpens, pageViews, searches, feedbackCount,
    avgFeedbackRating: feedbackCount ? ratingSum / feedbackCount : null,
    activeDays: days.size,
    firstTs, lastTs,
    busiestHour: busiest && busiest.count > 0 ? { hour: busiest.hour, count: busiest.count } : null,
  };
}

export function fmtDuration(ms: number): string {
  if (!ms || ms < 1000) return '<1s';
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}
