import { describe, expect, it } from 'vitest';
import { maintenanceFigures, periodLabel, periodOptions, productionFigures, statusCounts } from './engineeringReport';

const NOW = new Date(2026, 9, 15);

describe('engineering report calculations', () => {
  it('returns null (not zero) for ratios with no data', () => {
    const m = maintenanceFigures([], [], '2026-10', NOW);
    expect(m.breakdowns).toBe(0);
    expect(m.mttrHours).toBeNull();
    expect(m.completionPct).toBeNull();
    expect(productionFigures([], '2026-10').recoveryPct).toBeNull();
  });

  it('calculates breakdowns, downtime, MTTR and work order completion for the period only', () => {
    const m = maintenanceFigures(
      [{ equipment_name: 'A', downtime_hours: 6, breakdown_date: '2026-10-02' }, { equipment_name: 'A', downtime_hours: 2, breakdown_date: '2026-10-09' }, { equipment_name: 'B', downtime_hours: 50, breakdown_date: '2026-09-09' }],
      [{ status: 'completed', created_at: '2026-10-03' }, { status: 'open', created_at: '2026-10-04' }, { status: 'completed', created_at: '2026-09-04' }],
      '2026-10', NOW,
    );
    expect(m.breakdowns).toBe(2);
    expect(m.downtimeHours).toBe(8);
    expect(m.mttrHours).toBe(4);
    expect(m.workOrdersRaised).toBe(2);
    expect(m.completionPct).toBe(50);
    expect(m.openWorkOrders).toBe(1);
    expect(m.topFailures).toEqual([{ equipment: 'A', count: 2 }]);
    expect(m.trend.map(t => t.month)).toEqual(['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct']);
    expect(m.trend.at(-1)?.count).toBe(2);
    expect(m.trend.at(-2)?.count).toBe(1);
  });

  it('summarises production for the period', () => {
    const p = productionFigures([{ prod_date: '2026-10-01', tonnes_milled: 1000, recovery_pct: 90, gold_produced_oz: 5 }, { prod_date: '2026-10-02', tonnes_milled: 2000, recovery_pct: 94, gold_produced_oz: 7 }, { prod_date: '2026-09-30', tonnes_milled: 9999 }], '2026-10');
    expect(p.records).toBe(2);
    expect(p.tonnes).toBe(3000);
    expect(p.recoveryPct).toBe(92);
    expect(p.goldOz).toBe(12);
    expect(p.daily.map(d => d.date)).toEqual(['10-02', '10-01']);
  });

  it('counts compliance-style statuses and builds period options', () => {
    expect(statusCounts([{ status: 'current' }, { status: 'overdue' }, { status: 'overdue' }, { status: 'due_soon' }])).toEqual({ total: 4, current: 1, dueSoon: 1, overdue: 2 });
    expect(periodOptions(NOW)[0]).toEqual({ value: '2026-10', label: 'Oct 2026' });
    expect(periodOptions(NOW)).toHaveLength(12);
    expect(periodLabel('2026-03')).toBe('Mar 2026');
  });
});
