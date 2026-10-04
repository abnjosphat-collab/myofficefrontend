// app/issues/analytics.ts — the cost and count roll-ups behind the stock-issues analytics tab. Pure, so the numbers the
// page states are tested. Dates are bucketed by the user's local calendar day (toISOString would use UTC and move an
// issue recorded just after midnight into the previous day's bucket).
import { toLocalISODate } from '@/lib/dates';
import type { DescStats, Period, PeriodPoint, StockIssue } from './types';

const lineTotal = (qty: number, price: number) => (qty || 0) * (price || 0);

export const issueCost = (issue: StockIssue): number => (issue.items ?? []).reduce((sum, item) => sum + lineTotal(item.qty, item.unit_price || 0), 0);
export const hasPrice = (issue: StockIssue): boolean => (issue.items ?? []).some(item => (item.unit_price || 0) > 0);

const addDays = (date: Date, days: number) => { const d = new Date(date); d.setDate(d.getDate() + days); return d; };
export const startOfWeek = (d: Date): Date => {
  const mon = new Date(d);
  mon.setDate(d.getDate() + ((d.getDay() === 0 ? -6 : 1) - d.getDay()));
  mon.setHours(0, 0, 0, 0);
  return mon;
};
const monthKey = (d: Date) => toLocalISODate(d).slice(0, 7);
const blank = (key: string, label: string): PeriodPoint => ({ key, label, cost: 0, count: 0, costWithPrice: 0, itemCount: 0 });

/** The empty buckets for the period (30 days, 13 weeks or 12 months to `now`), then every issue added to its bucket. */
export function buildTimeSeries(issues: StockIssue[], period: Period, now: Date = new Date()): PeriodPoint[] {
  const map = new Map<string, PeriodPoint>();
  const keys: string[] = [];
  const open = (key: string, label: string) => { if (!map.has(key)) { keys.push(key); map.set(key, blank(key, label)); } };
  if (period === 'day') {
    for (let i = 29; i >= 0; i--) { const d = addDays(now, -i); open(toLocalISODate(d), d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })); }
  } else if (period === 'week') {
    for (let i = 12; i >= 0; i--) { const mon = startOfWeek(addDays(now, -i * 7)); open(toLocalISODate(mon), `W/c ${mon.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}`); }
  } else {
    for (let i = 11; i >= 0; i--) { const d = new Date(now.getFullYear(), now.getMonth() - i, 1); open(monthKey(d), d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })); }
  }
  for (const issue of issues) {
    const d = new Date(issue.issued_at);
    if (isNaN(d.getTime())) continue; // a missing or malformed date leaves the issue out of the series rather than crashing it
    const key = period === 'day' ? toLocalISODate(d) : period === 'week' ? toLocalISODate(startOfWeek(d)) : monthKey(d);
    const pt = map.get(key);
    if (!pt) continue;
    const cost = issueCost(issue);
    pt.cost += cost; pt.count += 1; pt.itemCount += (issue.items ?? []).length;
    if (hasPrice(issue)) pt.costWithPrice += cost;
  }
  return keys.map(k => map.get(k)!);
}

export function describeCosts(costs: number[], issues: StockIssue[]): DescStats {
  const costed = issues.filter(hasPrice).length;
  if (costs.length === 0) return { total: 0, count: 0, mean: 0, median: 0, stdDev: 0, min: 0, max: 0, costed };
  const sorted = [...costs].sort((a, b) => a - b);
  const total = costs.reduce((a, b) => a + b, 0);
  const mean = total / costs.length;
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  const stdDev = Math.sqrt(costs.reduce((a, b) => a + (b - mean) ** 2, 0) / costs.length);
  return { total, count: costs.length, mean, median, stdDev, min: sorted[0], max: sorted[sorted.length - 1], costed };
}

/** The `n` largest recipients or items by cost, with their counts. */
export function topBy(issues: StockIssue[], key: 'recipient_name' | 'description', n = 8): Array<{ name: string; cost: number; count: number }> {
  const map = new Map<string, { cost: number; count: number }>();
  for (const issue of issues) {
    if (key === 'recipient_name') {
      const e = map.get(issue.recipient_name) ?? { cost: 0, count: 0 };
      e.cost += issueCost(issue); e.count += (issue.items ?? []).length;
      map.set(issue.recipient_name, e);
    } else {
      for (const item of issue.items ?? []) {
        const name = item.stock_code ? `${item.stock_code} · ${item.description.slice(0, 28)}` : item.description.slice(0, 35);
        const e = map.get(name) ?? { cost: 0, count: 0 };
        e.cost += lineTotal(item.qty, item.unit_price || 0); e.count += item.qty;
        map.set(name, e);
      }
    }
  }
  return [...map.entries()].map(([name, d]) => ({ name, ...d })).sort((a, b) => b.cost - a.cost).slice(0, n);
}
