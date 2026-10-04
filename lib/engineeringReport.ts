// lib/engineeringReport.ts — pure calculations behind the monthly engineering report. Each section is
// derived only from its own source records; a section whose source failed to load is not calculated at
// all (the page reports it as unavailable instead of showing zeros).

/** Report targets. These thresholds are policy numbers used to colour and label the report; they are not
 *  read from any service. Change them here, in one place, when the targets change. */
export const REPORT_TARGETS = {
  breakdownsPerMonth: 20,
  mttrHours: 4,
  workOrderCompletionPct: 90,
  recoveryPct: 92,
  tonnesPerDay: 1900,
} as const;

export type AnyRecord = Record<string, unknown>;
const num = (v: unknown) => Number(v || 0);
const str = (v: unknown) => (typeof v === 'string' ? v : '');
const pad2 = (n: number) => String(n).padStart(2, '0');
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const periodKey = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
export const periodLabel = (period: string) => { const [y, m] = period.split('-'); return `${MONTHS[parseInt(m, 10) - 1]} ${y}`; };
export const periodOptions = (now: Date, count = 12) => Array.from({ length: count }, (_, i) => {
  const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
  return { value: periodKey(d), label: `${MONTHS[d.getMonth()]} ${d.getFullYear()}` };
});

const inPeriod = (date: unknown, period: string) => typeof date === 'string' && date.startsWith(period);
const breakdownDate = (b: AnyRecord) => str(b.breakdown_date) || str(b.date) || str(b.created_at);

export function maintenanceFigures(breakdowns: readonly AnyRecord[], jobCards: readonly AnyRecord[], period: string, now: Date) {
  const periodBDs = breakdowns.filter(b => inPeriod(breakdownDate(b), period));
  const periodJCs = jobCards.filter(j => inPeriod(str(j.created_at) || str(j.scheduled_date), period));
  const totalDowntime = periodBDs.reduce((s, b) => s + num(b.downtime_hours || b.duration_hours), 0);
  const completed = periodJCs.filter(j => j.status === 'completed').length;

  const trend = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const key = periodKey(d);
    return { month: MONTHS[d.getMonth()], count: breakdowns.filter(b => breakdownDate(b).startsWith(key)).length };
  });

  const byEquipment = new Map<string, number>();
  periodBDs.forEach(b => { const name = str(b.equipment_name) || 'Unknown'; byEquipment.set(name, (byEquipment.get(name) ?? 0) + 1); });

  const statuses = ['open', 'in_progress', 'completed', 'on_hold', 'cancelled'] as const;
  return {
    breakdowns: periodBDs.length,
    downtimeHours: totalDowntime,
    mttrHours: periodBDs.length > 0 ? totalDowntime / periodBDs.length : null,
    workOrdersRaised: periodJCs.length,
    workOrdersCompleted: completed,
    completionPct: periodJCs.length > 0 ? Math.round((completed / periodJCs.length) * 100) : null,
    openWorkOrders: jobCards.filter(j => j.status === 'open' || j.status === 'in_progress').length,
    trend,
    topFailures: [...byEquipment.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([equipment, count]) => ({ equipment, count })),
    statusDistribution: statuses.map(status => ({ status, count: jobCards.filter(j => j.status === status).length })).filter(s => s.count > 0),
  };
}

export function productionFigures(production: readonly AnyRecord[], period: string) {
  const rows = production.filter(p => inPeriod(p.prod_date, period));
  const tonnes = rows.reduce((s, r) => s + num(r.tonnes_milled), 0);
  return {
    records: rows.length,
    tonnes,
    recoveryPct: rows.length > 0 ? rows.reduce((s, r) => s + num(r.recovery_pct), 0) / rows.length : null,
    goldOz: rows.reduce((s, r) => s + num(r.gold_produced_oz), 0),
    // Last ten records of the period, oldest first.
    daily: [...rows].reverse().slice(-10).map(r => ({ date: str(r.prod_date).slice(5), tonnes: num(r.tonnes_milled), target: REPORT_TARGETS.tonnesPerDay })),
  };
}

export function statusCounts(records: readonly AnyRecord[]) {
  const count = (status: string) => records.filter(r => r.status === status).length;
  return { total: records.length, current: count('current'), dueSoon: count('due_soon'), overdue: count('overdue') };
}
