import { describe, expect, it } from 'vitest';
import { mergeRecords } from './useAvailabilitiesData';
import type { AvailRecord } from './types';

const rec = (over: Partial<AvailRecord>): AvailRecord => ({ id: 1, equipment_id: 1, date: '2026-09-01', operational_hours: 24, breakdown_hours: 0, availability_percentage: 100, ...over });

describe('mergeRecords', () => {
  it('lets a manual record replace the derived one for the same machine and day', () => {
    const merged = mergeRecords([rec({ id: 1, notes: 'manual' })], [rec({ id: 'bd_1', source: 'breakdown' }), rec({ id: 'bd_2', equipment_id: 2, source: 'breakdown' })]);
    expect(merged.map(r => r.id)).toEqual([1, 'bd_2']);
  });
  it('lists the newest day first', () => {
    const merged = mergeRecords([rec({ id: 1, date: '2026-09-01' }), rec({ id: 2, date: '2026-09-09', equipment_id: 3 })], [rec({ id: 'bd', date: '2026-09-05', equipment_id: 2, source: 'breakdown' })]);
    expect(merged.map(r => r.id)).toEqual([2, 'bd', 1]);
  });
});
