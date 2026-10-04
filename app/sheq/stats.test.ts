import { describe, expect, it } from 'vitest';
import { computeStats, filterByRange, rangeToFromTo, weeklyActuals } from './stats';
import type { RawData } from './types';

const empty = (): RawData => ({ nm: [], ws: [], vfl: [], pto: [], insp: [], pach: [] });
const NOW = new Date('2026-10-07T12:00:00'); // a Wednesday

describe('computeStats', () => {
  it('reports no score, not a perfect one, when there is nothing to judge', () => {
    const stats = computeStats(empty(), null, null, NOW);
    expect(stats.safetyScore).toBeNull();
    expect(stats.scoreParts.every(p => p.value === null)).toBe(true);
    expect(stats.totals.totalReports).toBe(0);
  });

  it('averages only the parts that have records', () => {
    const raw = empty();
    raw.vfl = [{ behaviourCategory: 'Safe Behaviour', status: 'submitted', created_at: '2026-10-01' }, { behaviourCategory: 'Unsafe Behaviour', status: 'draft', created_at: '2026-10-02' }];
    raw.insp = [{ status: 'approved', date: '2026-10-01', findings: [] }];
    const stats = computeStats(raw, null, null, NOW);
    expect(stats.scoreParts.find(p => p.key === 'vfl')?.value).toBe(50);
    expect(stats.scoreParts.find(p => p.key === 'insp')?.value).toBe(100);
    expect(stats.scoreParts.find(p => p.key === 'pto')?.value).toBeNull();
    expect(stats.safetyScore).toBe(75);
  });

  it('counts a PTO as high risk when any risk-assessment answer is No', () => {
    const raw = empty();
    raw.pto = [{ riskAssessment: { made: 'Yes', identified: 'No', effective: 'Yes' } }, { riskAssessment: { made: 'Yes', identified: 'Yes', effective: 'Yes' } }];
    expect(computeStats(raw, null, null, NOW).pto.highRisk).toBe(1);
  });

  it('pools corrective actions across work stoppage, VFL and PTO', () => {
    const raw = empty();
    raw.ws = [{ correctiveActions: [{ status: 'Completed' }, { status: 'Pending' }] }];
    raw.vfl = [{ actions: [{ status: 'In Progress' }] }];
    raw.pto = [{ actionPlan: [{ status: 'Completed' }] }];
    expect(computeStats(raw, null, null, NOW).totals).toMatchObject({ totalActions: 4, totalActionsDone: 2, totalActionsProg: 1, totalActionsPend: 1 });
  });

  it('only derives what near-miss records actually contain (the section split)', () => {
    const raw = empty();
    raw.nm = [{ section: 'Mechanical' }, { section: 'Mechanical' }, { section: 'General' }];
    expect(computeStats(raw, null, null, NOW).nm).toEqual({ total: 3, mechanical: 2, electrical: 0, general: 1 });
  });

  it('buckets the last six months and sums them across modules', () => {
    const raw = empty();
    raw.vfl = [{ created_at: '2026-10-02' }];
    raw.nm = [{ date: '2026-10-03' }, { date: '2026-05-03' }];
    const stats = computeStats(raw, null, null, NOW);
    expect(stats.months).toHaveLength(6);
    expect([stats.months[0].label, stats.months[5].label]).toEqual(['May', 'Oct']);
    expect(stats.months.map(m => m.count)).toEqual([1, 0, 0, 0, 0, 2]);
  });
});

describe('date ranges', () => {
  it('keeps undated records so a filter never hides them', () => {
    const items = [{ created_at: '2026-01-01' }, { created_at: '2026-10-05' }, {}];
    const [from] = rangeToFromTo('30d', '', '', NOW);
    expect(filterByRange(items, 'vfl', from, null)).toHaveLength(2);
  });

  it('treats a custom end date as the end of that day', () => {
    const [, to] = rangeToFromTo('custom', '2026-10-01', '2026-10-05', NOW);
    expect(filterByRange([{ created_at: '2026-10-05T20:00:00' }], 'vfl', null, to)).toHaveLength(1);
  });

  it('counts the week from Monday', () => {
    const raw = empty();
    raw.vfl = [{ date: '2026-10-05' }, { date: '2026-10-04' }];
    expect(weeklyActuals(raw, NOW).vfl).toBe(1);
  });
});
