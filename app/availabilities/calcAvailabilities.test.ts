import { describe, it, expect } from 'vitest';
import { computePeriodRows, findBestWorstPeriod, getMonthLabel, getWeekLabel } from './calcAvailabilities';
import type { AvailRecord } from './types';

function record(over: Partial<AvailRecord> = {}): AvailRecord {
  return {
    id: 1, equipment_id: 'EQ-1', date: '2026-08-10',
    operational_hours: 24, breakdown_hours: 2, availability_percentage: 91.7,
    ...over,
  };
}

describe('getWeekLabel', () => {
  it('formats as "W<week> <year>"', () => {
    expect(getWeekLabel('2026-01-05')).toMatch(/^W\d{2} 2026$/);
  });
  it('is stable for dates in the same week', () => {
    expect(getWeekLabel('2026-08-10')).toBe(getWeekLabel('2026-08-11'));
  });
});

describe('getMonthLabel', () => {
  it('formats as "<Mon> <year>"', () => {
    expect(getMonthLabel('2026-08-15')).toBe('Aug 2026');
  });
});

describe('computePeriodRows', () => {
  it('groups by exact date when period is "day"', () => {
    const rows = computePeriodRows([record({ date: '2026-08-10' }), record({ date: '2026-08-11' })], 'day');
    expect(rows).toHaveLength(2);
  });

  it('averages availability_percentage within each bucket, and sums hours', () => {
    const rows = computePeriodRows([
      record({ date: '2026-08-10', availability_percentage: 80, operational_hours: 24, breakdown_hours: 4 }),
      record({ date: '2026-08-10', availability_percentage: 100, operational_hours: 24, breakdown_hours: 0 }),
    ], 'day');
    expect(rows).toHaveLength(1);
    expect(rows[0].avgAvailability).toBe(90);
    expect(rows[0].totalOpHours).toBe(48);
    expect(rows[0].totalBdHours).toBe(4);
    expect(rows[0].recordCount).toBe(2);
  });

  it('groups multiple dates into the same week bucket', () => {
    const rows = computePeriodRows([record({ date: '2026-08-10' }), record({ date: '2026-08-11' })], 'week');
    expect(rows).toHaveLength(1);
  });

  it('is sorted by label', () => {
    const rows = computePeriodRows([record({ date: '2026-08-11' }), record({ date: '2026-08-10' })], 'day');
    expect(rows.map(r => r.label)).toEqual(['2026-08-10', '2026-08-11']);
  });

  it('is empty for no records', () => {
    expect(computePeriodRows([], 'day')).toEqual([]);
  });

  it('treats a record missing a numeric field as 0 rather than propagating NaN', () => {
    // A legacy/malformed record missing availability_percentage/operational_hours/
    // breakdown_hours otherwise poisoned the whole bucket's sum with NaN, which
    // crashed the availabilities page's .toFixed() calls downstream (found live,
    // 2026-08-29 UI audit, audit/07-ui-polish-findings.md).
    const rows = computePeriodRows([
      record({ date: '2026-08-10', availability_percentage: 80, operational_hours: 24, breakdown_hours: 4 }),
      { id: 2, equipment_id: 'EQ-2', date: '2026-08-10' } as unknown as AvailRecord,
    ], 'day');
    expect(rows).toHaveLength(1);
    expect(rows[0].avgAvailability).toBe(40);
    expect(rows[0].totalOpHours).toBe(24);
    expect(rows[0].totalBdHours).toBe(4);
    expect(Number.isNaN(rows[0].avgAvailability)).toBe(false);
  });
});

describe('findBestWorstPeriod', () => {
  it('finds the highest and lowest average-availability periods', () => {
    const rows = computePeriodRows([
      record({ date: '2026-08-10', availability_percentage: 95 }),
      record({ date: '2026-08-11', availability_percentage: 60 }),
    ], 'day');
    const r = findBestWorstPeriod(rows);
    expect(r.best).toBe(95);
    expect(r.worst).toBe(60);
    expect(r.bestLabel).toBe('2026-08-10');
    expect(r.worstLabel).toBe('2026-08-11');
  });

  it('returns 0/undefined for an empty input rather than throwing (Math.max() of nothing is -Infinity)', () => {
    expect(findBestWorstPeriod([])).toEqual({ best: 0, worst: 0, bestLabel: undefined, worstLabel: undefined });
  });
});

describe('computePeriodRows ordering', () => {
  it('orders months chronologically, not alphabetically', () => {
    const rows = computePeriodRows([record({ date: '2026-08-10' }), record({ date: '2026-01-05' }), record({ date: '2026-04-02' })], 'month');
    expect(rows.map(r => r.label.slice(0, 3))).toEqual(['Jan', 'Apr', 'Aug']);
  });
  it('orders weeks across a year boundary by year first', () => {
    const rows = computePeriodRows([record({ date: '2026-01-06' }), record({ date: '2025-12-10' })], 'week');
    expect(rows.map(r => r.label.slice(-4))).toEqual(['2025', '2026']);
  });
});

import { availabilityPercent, availabilityTone } from './calcAvailabilities';
describe('availabilityPercent and availabilityTone', () => {
  it('is the share of operating time not lost to downtime, held to 0-100', () => {
    expect(availabilityPercent(24, 2.4)).toBeCloseTo(90);
    expect(availabilityPercent(24, 30)).toBe(0);
  });
  it('bands at 95 and 90', () => {
    expect([95, 94.9, 90, 89.9].map(availabilityTone)).toEqual(['success', 'warning', 'warning', 'danger']);
  });
});
