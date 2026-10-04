import { describe, expect, it } from 'vitest';
import { NO_EQUIPMENT_FILTERS, blankForm, calcAge, countByStatus, filterEquipment, formFromItem, toPayload } from './equipmentLogic';
import type { EquipmentItem } from './types';

const item = (over: Partial<EquipmentItem> = {}): EquipmentItem => ({ id: 1, name: 'Crusher', equipment_id: 'CR-1', status: 'operational', category: 'Machinery', location: 'Plant', ...over });
const NOW = new Date(2026, 9, 4);

describe('calcAge', () => {
  it('gives years and months, or less than a month', () => {
    expect(calcAge('2024-07-01', NOW)).toBe('2yr 3mo');
    expect(calcAge('2026-10-01', NOW)).toBe('<1 mo');
    expect(calcAge('2025-10-04', NOW)).toBe('1yr');
  });
  it('says so for no date, an unreadable date and a future date', () => {
    expect(calcAge(undefined, NOW)).toBe('N/A');
    expect(calcAge('not a date', NOW)).toBe('Invalid');
    expect(calcAge('2027-01-01', NOW)).toBe('Not yet commissioned');
  });
});

describe('filterEquipment and countByStatus', () => {
  const rows = [item(), item({ id: 2, name: 'Pump', equipment_id: 'PU-2', status: 'maintenance', category: 'Pumps', location: 'Shaft', serial_number: 'SN9' })];
  it('searches id, name, serial and category and filters by status, category and location', () => {
    expect(filterEquipment(rows, { ...NO_EQUIPMENT_FILTERS, search: 'sn9' }).map(r => r.id)).toEqual([2]);
    expect(filterEquipment(rows, { ...NO_EQUIPMENT_FILTERS, status: 'maintenance' }).map(r => r.id)).toEqual([2]);
    expect(filterEquipment(rows, { ...NO_EQUIPMENT_FILTERS, category: 'Machinery' }).map(r => r.id)).toEqual([1]);
    expect(filterEquipment(rows, { ...NO_EQUIPMENT_FILTERS, location: 'Shaft' }).map(r => r.id)).toEqual([2]);
  });
  it('counts statuses and groups a missing status as unknown', () => {
    expect(countByStatus([...rows, item({ id: 3, status: undefined })])).toEqual({ operational: 1, maintenance: 1, unknown: 1 });
  });
});

describe('form conversion', () => {
  it('keeps a date-only commission date as it is', () => {
    expect(formFromItem(item({ commission_date: '2024-05-01' })).commission_date).toBe('2024-05-01');
  });
  it('sends empty optional fields as null, numbers as numbers, and keeps the required ones', () => {
    const p = toPayload({ ...blankForm(), equipment_id: 'E1', name: 'Pump', purchase_cost: '12.5', maintenance_interval: 'abc' });
    expect(p).toMatchObject({ equipment_id: 'E1', name: 'Pump', status: 'operational', purchase_cost: 12.5, maintenance_interval: null, model: null, commission_date: null });
  });
});
