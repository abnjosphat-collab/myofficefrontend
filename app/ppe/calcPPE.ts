// app/ppe/calcPPE.ts — the pure expiry/matrix calculations behind the PPE page (status
// badges, KPI tiles, the reorder-by-size breakdown), split out of page.tsx per the
// "extract + test business logic" standard (app/timesheets/calcTotals.ts precedent).
// Previously inline in page.tsx with no test coverage at all.
import type { PPERecord } from './types';

// A record with no expiry_date (e.g. gloves, matrix interval 0 = "no expiry") is never
// expiring-soon or expired — there's nothing to count down to.
export const isExpiringSoon = (d?: string | null, days = 30): boolean => {
  if (!d) return false;
  const diff = Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
  return diff <= days && diff > 0;
};

export const isExpired = (d?: string | null): boolean => !!d && new Date(d) < new Date();

// % of active records not yet past their expiry date. null (not 0/100) when there are no
// active records at all — "no data" and "fully compliant" must render differently.
export function computeComplianceRate(records: PPERecord[]): number | null {
  const active = records.filter(r => r.status === 'active');
  if (!active.length) return null;
  return Math.round((active.filter(r => !isExpired(r.expiry_date)).length / active.length) * 100);
}

export interface SizeBucket { inUse: number; reorder: number; }
export type SizeBreakdown = [type: string, sizes: [size: string, bucket: SizeBucket][]][];

// Order breakdown: active items grouped by PPE type → size, with a count in use and a
// "to reorder" count (past expiry, i.e. needs replacing). Lets a purchaser see e.g.
// "Helmet · L × 12 (3 to reorder)" at a glance. Both the type groups and the size rows
// within each are sorted by inUse count, descending.
export function computeSizeBreakdown(records: PPERecord[]): SizeBreakdown {
  const byType: Record<string, Record<string, SizeBucket>> = {};
  records.forEach(r => {
    if (r.status !== 'active') return;
    const size = (r.size || '').trim() || 'Unspecified';
    (byType[r.ppe_type] ||= {});
    (byType[r.ppe_type][size] ||= { inUse: 0, reorder: 0 });
    byType[r.ppe_type][size].inUse++;
    if (isExpired(r.expiry_date)) byType[r.ppe_type][size].reorder++;
  });
  return Object.entries(byType)
    .map(([type, sizes]): SizeBreakdown[number] => [type, Object.entries(sizes).sort((a, b) => b[1].inUse - a[1].inUse)])
    .sort((a, b) => b[1].reduce((s, [, v]) => s + v.inUse, 0) - a[1].reduce((s, [, v]) => s + v.inUse, 0));
}
