import { describe, expect, it } from 'vitest';
import { deriveReliability, fleetFigures, monthSummary } from './reliability';

const NOW = new Date(2026, 9, 15); // 15 Oct 2026

describe('deriveReliability', () => {
  it('returns no figures (not demo data) for no records', () => {
    const r = deriveReliability([], NOW);
    expect(r.table).toEqual([]);
    expect(r.sections).toEqual([]);
    expect(r.monthly.map(m => m.failures)).toEqual([0, 0, 0, 0, 0, 0]);
    expect(fleetFigures(r.table).highRpn).toBe(0);
  });

  it('derives MTBF, MTTR, availability and RPN per equipment', () => {
    const r = deriveReliability([
      { equipment_name: 'Pump A', section: 'Milling', downtime_hours: 4, breakdown_date: '2026-07-17' },
      { equipment_name: 'Pump A', section: 'Milling', downtime_hours: 2, breakdown_date: '2026-09-01' },
    ], NOW);
    const a = r.table[0];
    expect(a.failures).toBe(2);
    expect(a.mttr).toBe(3);
    // first failure 90 days before NOW -> MTBF = 90 / 2 = 45
    expect(a.mtbf).toBe(45);
    expect(a.availability).toBeCloseTo(99.7, 1);
    expect(a.rpn).toBe(Math.round((5 - Math.min(4, 4.5)) * 3 * 3));
  });

  it('sorts equipment by RPN descending and averages MTTR per section', () => {
    const r = deriveReliability([
      { equipment_name: 'Crusher', section: 'Crushing', downtime_hours: 20, breakdown_date: '2026-10-10' },
      { equipment_name: 'Fan', section: 'Crushing', downtime_hours: 0, breakdown_date: '2026-01-01' },
    ], NOW);
    expect(r.table[0].equipment).toBe('Crusher');
    expect(r.sections).toEqual([{ section: 'Crushing', mttr: 10 }]);
  });

  it('counts failures into the last six calendar months and ignores older ones', () => {
    const r = deriveReliability([
      { equipment_name: 'A', breakdown_date: '2026-10-02' },
      { equipment_name: 'A', breakdown_date: '2026-10-09' },
      { equipment_name: 'B', breakdown_date: '2026-05-20' },
      { equipment_name: 'C', breakdown_date: '2025-01-01' },
    ], NOW);
    expect(r.monthly.map(m => m.month)).toEqual(['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct']);
    expect(r.monthly.map(m => m.failures)).toEqual([1, 0, 0, 0, 0, 2]);
  });

  it('falls back to date/created_at fields and the Unknown name', () => {
    const r = deriveReliability([{ date: '2026-10-01', location: 'Yard' }], NOW);
    expect(r.table[0].equipment).toBe('Unknown');
    expect(r.table[0].section).toBe('Yard');
  });

  it('reports downtime hours per equipment and summarises the current month', () => {
    const records = [
      { equipment_name: 'A', downtime_hours: 3, breakdown_date: '2026-10-02' },
      { equipment_name: 'A', downtime_hours: 5, breakdown_date: '2026-10-09' },
      { equipment_name: 'B', downtime_hours: 9, breakdown_date: '2026-09-30' },
    ];
    expect(deriveReliability(records, NOW).table.find(e => e.equipment === 'A')?.downtimeHours).toBe(8);
    expect(monthSummary(records, NOW)).toEqual({ failures: 2, mttr: 4 });
    expect(monthSummary([], NOW)).toEqual({ failures: 0, mttr: null });
  });
});
