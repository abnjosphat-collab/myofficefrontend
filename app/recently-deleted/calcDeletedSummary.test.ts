import { describe, expect, it } from 'vitest';
import { deletedSummary, tableLabel } from './calcDeletedSummary';

describe('tableLabel', () => {
  it('names known tables in words', () => {
    expect(tableLabel('leaves')).toBe('Leave');
    expect(tableLabel('overtime')).toBe('Overtime request');
    expect(tableLabel('timesheets')).toBe('Timesheet');
    expect(tableLabel('work_orders')).toBe('Work order');
  });

  it('prettifies unknown tables instead of showing snake_case', () => {
    expect(tableLabel('stock_issues')).toBe('Stock issue');
    expect(tableLabel('mystery_table')).toBe('Mystery table');
  });
});

describe('deletedSummary', () => {
  it('names a leave by person, type and start', () => {
    expect(deletedSummary({
      table_name: 'leaves',
      record_id: '3',
      snapshot: { employee_name: 'Ann Moyo', leave_type: 'annual', start_date: '2026-10-20' },
    })).toBe('Ann Moyo · annual · 20 Oct 2026');
  });

  it('names a work order by its number', () => {
    expect(deletedSummary({
      table_name: 'work_orders',
      record_id: '44',
      snapshot: { work_order_number: 'WO-118', job_request_details: 'Fix pump' },
    })).toBe('WO-118');
  });

  it('falls back to the record id when the snapshot names nothing', () => {
    expect(deletedSummary({ table_name: 'leaves', record_id: '3', snapshot: {} })).toBe('Record #3');
    expect(deletedSummary({ table_name: 'leaves', record_id: null, snapshot: null })).toBe('Record');
  });

  it('ignores blank and non-text identifier fields', () => {
    expect(deletedSummary({
      table_name: 'overtime',
      record_id: '9',
      snapshot: { employee_name: '  ', name: null, title: 'Night shift cover' },
    })).toBe('Night shift cover');
  });
});
