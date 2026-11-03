// app/ppe/calcGaps.test.ts — TEMPORARY (goes away with the Gaps tab).
import { describe, expect, it } from 'vitest';

import { calcGaps } from './calcGaps';
import type { EmployeeWithPPE, PPERecord } from './types';

const rec = (over: Partial<PPERecord> & { id: string }): PPERecord => ({
  employee_id: 'M1', employee_name: 'Test Person', position: '', department: 'Mining',
  ppe_type: 'helmet', item_name: 'Hard Hat', size: 'L', issue_date: '2026-05-01',
  expiry_date: '2028-05-01', condition: 'good', status: 'active', notes: '',
  issued_by: '', location: '', mine_section: '', ...over,
});

const holder = (over: Partial<EmployeeWithPPE> & { employee_id: string }): EmployeeWithPPE => ({
  employee_name: 'Test Person', position: 'Miner', section: 'Shaft A', records: [], ...over,
});

const NOW = new Date('2026-11-04T12:00:00');

describe('calcGaps', () => {
  it('flags pre-2023 and future dates, passes the window edges', () => {
    const holders = [holder({ employee_id: 'M1', records: [
      rec({ id: '1', issue_date: '1936-10-06' }),
      rec({ id: '2', issue_date: '2027-06-08' }),
      rec({ id: '3', issue_date: '2023-01-01' }),
      rec({ id: '4', issue_date: '2026-05-01' }),
    ] })];
    const dates = calcGaps(holders, NOW).find(s => s.id === 'dates')!.rows;
    expect(dates.map(r => r.key)).toEqual(['1', '2']);
  });

  it('flags missing sizes, people without PPE, and missing titles together', () => {
    const holders = [
      holder({ employee_id: 'M1', position: '', records: [rec({ id: '1', size: '' })] }),
      holder({ employee_id: 'M2', position: 'Fitter', records: [] }),
    ];
    const sections = Object.fromEntries(calcGaps(holders, NOW).map(s => [s.id, s.rows]));
    expect(sections.sizes.map((r: { key: string }) => r.key)).toEqual(['1']);
    expect(sections['no-ppe'].map((r: { employeeId: string }) => r.employeeId)).toEqual(['M2']);
    expect(sections['no-title'].map((r: { employeeId: string }) => r.employeeId)).toEqual(['M1']);
  });

  it('always carries the quarantine and cross-listed info lists', () => {
    const sections = Object.fromEntries(calcGaps([], NOW).map(s => [s.id, s.rows]));
    expect(sections.quarantine.some((r: { key: string }) => r.key === 'C0892-safety_shoes')).toBe(true);
    expect(sections['cross-listed']).toHaveLength(16);
  });
});
