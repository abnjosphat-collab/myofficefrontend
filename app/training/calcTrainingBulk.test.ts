// app/training/calcTrainingBulk.test.ts — the bulk-entry rules, not the dialog:
// duplicate identity, renewal tolerance, register filtering, payload shape,
// and outcome sorting (created / skipped / refused / uncertain, retry-safe).
import { describe, expect, it } from 'vitest';
import {
  GRADES,
  buildBulkPayload,
  bulkKey,
  distinctDesignations,
  filterRegister,
  findExistingDuplicates,
  normalizeEmployeeId,
  retryIds,
  splitResults,
  windowError,
} from './calcTrainingBulk';
import type { BulkSharedDetails, Certification } from './types';

const cert = (over: Partial<Certification> = {}): Certification => ({
  id: '1', employee_name: 'Rudo Moyo', employee_id: 'C1165', department: 'Engineering',
  certification_name: 'Safety Induction', expiry_date: '2027-01-01', required_refresher: '',
  status: 'Valid', provider: '', training_date: '2026-11-01',
  start_date: null, completion_date: null, grade: '', details: '', trainers: '', venue: '',
  snapshot_designation: '', snapshot_section: '', snapshot_department: '', ...over,
});

describe('normalizeEmployeeId', () => {
  it('uppercases and trims, so c1165 matches C1165', () => {
    expect(normalizeEmployeeId('  c1165 ')).toBe('C1165');
  });
});

describe('bulkKey', () => {
  it('treats case/whitespace variants as the same entry', () => {
    expect(bulkKey('c1165', ' Safety Induction ', '2026-11-01')).toBe(bulkKey('C1165', 'safety induction', '2026-11-01'));
  });
  it('treats a different date as a different entry (a renewal)', () => {
    expect(bulkKey('C1165', 'Safety Induction', '2026-11-01')).not.toBe(bulkKey('C1165', 'Safety Induction', '2027-11-01'));
  });
});

describe('findExistingDuplicates', () => {
  const register = [cert(), cert({ id: '2', employee_id: 'C1166', training_date: '2026-11-01' })];
  it('flags who already holds this certification for this date', () => {
    expect(findExistingDuplicates(register, ['C1165', 'C1167'], 'Safety Induction', '2026-11-01')).toEqual(new Set(['C1165']));
  });
  it('ignores a different date (a legitimate renewal, not a duplicate)', () => {
    expect(findExistingDuplicates(register, ['C1165'], 'Safety Induction', '2027-11-01')).toEqual(new Set());
  });
  it('ignores a different certification on the same date', () => {
    expect(findExistingDuplicates(register, ['C1165'], 'First Aid', '2026-11-01')).toEqual(new Set());
  });
  it('matches legacy rows with no training date against nothing', () => {
    expect(findExistingDuplicates([cert({ training_date: null })], ['C1165'], 'Safety Induction', '2026-11-01')).toEqual(new Set());
  });
  it('warns about nothing without a certification and date', () => {
    expect(findExistingDuplicates(register, ['C1165'], '', '')).toEqual(new Set());
  });
  it('keys on the completion date when one is recorded, not the legacy training date', () => {
    const done = [cert({ completion_date: '2026-11-05' })];
    expect(findExistingDuplicates(done, ['C1165'], 'Safety Induction', '2026-11-05')).toEqual(new Set(['C1165']));
    expect(findExistingDuplicates(done, ['C1165'], 'Safety Induction', '2026-11-01')).toEqual(new Set());
  });
});

describe('windowError', () => {
  it('refuses a start after the completion', () => {
    expect(windowError('2026-11-05', '2026-11-01')).toBe('The start date is after the completion date.');
  });
  it('accepts a blank end and an equal window', () => {
    expect(windowError('', '2026-11-01')).toBeUndefined();
    expect(windowError('2026-11-01', '')).toBeUndefined();
    expect(windowError('2026-11-01', '2026-11-01')).toBeUndefined();
    expect(windowError('2026-11-01', '2026-11-05')).toBeUndefined();
  });
});

describe('GRADES', () => {
  it('offers Distinction, Merit, Pass and Fail', () => {
    expect([...GRADES]).toEqual(['Distinction', 'Merit', 'Pass', 'Fail']);
  });
});

describe('filterRegister', () => {
  const employees = [
    { id: 1, employee_id: 'C1165', first_name: 'Rudo', last_name: 'Moyo', designation: 'Fitter Class 1', section: 'Mechanical', department: 'Engineering' },
    { id: 2, employee_id: 'C1166', first_name: 'Tino', last_name: 'Sibanda', designation: 'Electrician', section: 'Electrical', department: 'Engineering' },
    { id: 3, employee_id: 'M001', first_name: 'Blessing', last_name: 'Ncube', designation: 'Fitter Class 1', section: 'Mechanical', department: 'Mining' },
  ];
  const blank = { query: '', designation: '', section: '', department: '' };
  it('filters by trade using the register designation (Fitter Class 1)', () => {
    expect(filterRegister(employees, { ...blank, designation: 'Fitter Class 1' }).map(e => e.employee_id)).toEqual(['C1165', 'M001']);
  });
  it('tolerates trade capitalisation', () => {
    expect(filterRegister(employees, { ...blank, designation: 'fitter class 1' }).map(e => e.employee_id)).toEqual(['C1165', 'M001']);
  });
  it('narrows further by department', () => {
    expect(filterRegister(employees, { ...blank, designation: 'Fitter Class 1', department: 'Mining' }).map(e => e.employee_id)).toEqual(['M001']);
  });
  it('searches names, numbers and designations together', () => {
    expect(filterRegister(employees, { ...blank, query: 'tino' }).map(e => e.employee_id)).toEqual(['C1166']);
    expect(filterRegister(employees, { ...blank, query: 'm001' }).map(e => e.employee_id)).toEqual(['M001']);
  });
  it('skips rows with no personnel number', () => {
    expect(filterRegister([...employees, { id: 4, first_name: 'No', last_name: 'Number' }], blank)).toHaveLength(3);
  });
  it('lists distinct trades for the filter', () => {
    expect(distinctDesignations(employees)).toEqual(['Electrician', 'Fitter Class 1']);
  });
});

describe('buildBulkPayload', () => {
  const shared: BulkSharedDetails = { certification_name: 'Safety Induction', provider: 'TechEdge', start_date: '2026-10-28', completion_date: '2026-11-01', expiry_date: '2027-11-01', required_refresher: '', grade: '', details: '', trainers: '', venue: '' };
  it('dedupes people and keeps per-person differences', () => {
    const { items } = buildBulkPayload(shared, [{ employee_id: 'c1165' }, { employee_id: 'C1165' }, { employee_id: 'C1166' }], {
      C1166: { employee_id: 'C1166', expiry_date: '2028-01-01' },
    });
    expect(items).toEqual([{ employee_id: 'C1165' }, { employee_id: 'C1166', expiry_date: '2028-01-01' }]);
  });
  it('carries grade, details, trainers and venue overrides through untouched', () => {
    const { items } = buildBulkPayload(shared, [{ employee_id: 'C1165' }], {
      C1165: { employee_id: 'C1165', grade: 'Merit', details: 'Rope inspection', trainers: 'T. Nkomo', venue: 'TechEdge' },
    });
    expect(items).toEqual([{ employee_id: 'C1165', grade: 'Merit', details: 'Rope inspection', trainers: 'T. Nkomo', venue: 'TechEdge' }]);
  });
});

describe('splitResults and retryIds', () => {
  const results = [
    { employee_id: 'C1165', outcome: 'created', uncertain: false },
    { employee_id: 'C1166', outcome: 'skipped', reason: 'Already recorded', uncertain: false },
    { employee_id: 'C1167', outcome: 'failed', reason: 'Refused', uncertain: false },
    { employee_id: 'C1168', outcome: 'failed', reason: 'No confirmation', uncertain: true },
  ] as const;
  it('sorts every outcome into its own bucket', () => {
    const split = splitResults([...results]);
    expect(split.created.map(r => r.employee_id)).toEqual(['C1165']);
    expect(split.skipped.map(r => r.employee_id)).toEqual(['C1166']);
    expect(split.refused.map(r => r.employee_id)).toEqual(['C1167']);
    expect(split.uncertain.map(r => r.employee_id)).toEqual(['C1168']);
  });
  it('retries failures without resubmitting confirmed successes', () => {
    expect(retryIds([...results])).toEqual(['C1167', 'C1168']);
  });
  it('retries nothing when everything is confirmed', () => {
    expect(retryIds([{ employee_id: 'C1165', outcome: 'created', uncertain: false }])).toEqual([]);
  });
});
