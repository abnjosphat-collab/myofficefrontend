import { describe, it, expect, beforeAll } from 'vitest';
import { isExpiringSoon, isExpired, computeComplianceRate, computeSizeBreakdown } from './calcPPE';
import type { PPERecord } from './types';

beforeAll(() => { process.env.TZ = 'Africa/Johannesburg'; });

function rec(over: Partial<PPERecord> = {}): PPERecord {
  return {
    id: '1', employee_id: 'C1000', employee_name: 'Jane Doe',
    position: 'Fitter', department: 'Engineering',
    ppe_type: 'helmet', item_name: 'Safety Helmet', size: 'L',
    issue_date: '2026-01-01', expiry_date: null,
    condition: 'good', status: 'active',
    notes: '', issued_by: '', location: '', mine_section: '',
    ...over,
  };
}

function daysFromNow(days: number): string {
  return new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
}

describe('isExpiringSoon', () => {
  it('is false for no expiry date (e.g. gloves, 0-month matrix interval)', () => {
    expect(isExpiringSoon(null)).toBe(false);
    expect(isExpiringSoon(undefined)).toBe(false);
  });
  it('is true inside the default 30-day window', () => {
    expect(isExpiringSoon(daysFromNow(10))).toBe(true);
    expect(isExpiringSoon(daysFromNow(30))).toBe(true);
  });
  it('is false once already expired (that is isExpired\'s job, not this one\'s)', () => {
    expect(isExpiringSoon(daysFromNow(-1))).toBe(false);
  });
  it('is false beyond the window', () => {
    expect(isExpiringSoon(daysFromNow(31))).toBe(false);
  });
  it('respects a custom window', () => {
    expect(isExpiringSoon(daysFromNow(45), 60)).toBe(true);
    expect(isExpiringSoon(daysFromNow(45), 30)).toBe(false);
  });
});

describe('isExpired', () => {
  it('is false for no expiry date', () => {
    expect(isExpired(null)).toBe(false);
    expect(isExpired(undefined)).toBe(false);
  });
  it('is true for a past date, false for a future one', () => {
    expect(isExpired(daysFromNow(-1))).toBe(true);
    expect(isExpired(daysFromNow(1))).toBe(false);
  });
});

describe('computeComplianceRate', () => {
  it('returns null (not 0) when there are no active records — no data, not "fully compliant"', () => {
    expect(computeComplianceRate([])).toBeNull();
    expect(computeComplianceRate([rec({ status: 'returned' })])).toBeNull();
  });
  it('is 100 when every active record is unexpired', () => {
    expect(computeComplianceRate([rec({ expiry_date: daysFromNow(10) }), rec({ expiry_date: null })])).toBe(100);
  });
  it('excludes inactive records from the denominator', () => {
    const records = [
      rec({ status: 'active', expiry_date: daysFromNow(10) }),
      rec({ status: 'returned', expiry_date: daysFromNow(-100) }), // would drag the rate down if counted
    ];
    expect(computeComplianceRate(records)).toBe(100);
  });
  it('computes a partial rate, rounded', () => {
    const records = [
      rec({ expiry_date: daysFromNow(10) }),
      rec({ expiry_date: daysFromNow(10) }),
      rec({ expiry_date: daysFromNow(-5) }), // expired
    ];
    expect(computeComplianceRate(records)).toBe(67); // 2/3 -> 66.67 -> 67
  });
});

describe('computeSizeBreakdown', () => {
  it('groups active records by type then size, counting inUse and reorder', () => {
    const records = [
      rec({ ppe_type: 'helmet', size: 'L', expiry_date: daysFromNow(10) }),
      rec({ ppe_type: 'helmet', size: 'L', expiry_date: daysFromNow(-5) }), // reorder
      rec({ ppe_type: 'helmet', size: 'M', expiry_date: null }),
    ];
    const breakdown = computeSizeBreakdown(records);
    expect(breakdown).toHaveLength(1);
    const [type, sizes] = breakdown[0];
    expect(type).toBe('helmet');
    const lSize = sizes.find(([s]) => s === 'L')!;
    expect(lSize[1]).toEqual({ inUse: 2, reorder: 1 });
  });

  it('excludes non-active records entirely', () => {
    const breakdown = computeSizeBreakdown([rec({ status: 'returned' })]);
    expect(breakdown).toHaveLength(0);
  });

  it('falls back an empty/whitespace size to "Unspecified"', () => {
    const breakdown = computeSizeBreakdown([rec({ size: '  ' }), rec({ size: '' })]);
    const [, sizes] = breakdown[0];
    expect(sizes[0][0]).toBe('Unspecified');
    expect(sizes[0][1].inUse).toBe(2);
  });

  it('sorts type groups by total inUse, descending', () => {
    const records = [
      rec({ ppe_type: 'gloves', size: 'M' }),
      rec({ ppe_type: 'helmet', size: 'L' }),
      rec({ ppe_type: 'helmet', size: 'M' }),
    ];
    const breakdown = computeSizeBreakdown(records);
    expect(breakdown[0][0]).toBe('helmet'); // 2 in use, beats gloves' 1
  });
});
