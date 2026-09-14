import { describe, it, expect } from 'vitest';
import {
  applyNormalHoursFill,
  applyOffFill,
  canFillFromSource,
  extractFillFromSource,
  extractNormalHoursFromSource,
  fillTargetDayIndices,
  isFillProtectedTarget,
  prepareFillTemplate,
} from './fillEntry';
import type { TimesheetEntry } from './types';

function entry(over: Partial<TimesheetEntry> = {}): TimesheetEntry {
  return { employee_id: 1, date: '2026-08-10', regular_hours: 8, status: 'work', ...over };
}

describe('fillTargetDayIndices', () => {
  it('returns indices between source and end excluding source', () => {
    expect(fillTargetDayIndices(2, 5)).toEqual([3, 4, 5]);
    expect(fillTargetDayIndices(5, 2)).toEqual([2, 3, 4]);
  });
});

describe('fill protection', () => {
  it('blocks targets that are leave-only projections', () => {
    expect(isFillProtectedTarget(entry({ _auto: 'leave' }))).toBe(true);
    expect(isFillProtectedTarget(entry({ _auto: 'overtime' }))).toBe(false);
    expect(isFillProtectedTarget(undefined)).toBe(false);
  });

  it('blocks filling from leave, sick, and double-time sources', () => {
    expect(canFillFromSource(entry({ _auto: 'leave' }))).toBe(false);
    expect(canFillFromSource(entry({ status: 'sick' }))).toBe(false);
    expect(canFillFromSource(entry({ status: 'weekend' }))).toBe(false);
    expect(canFillFromSource(entry({ status: 'work', regular_hours: 10 }))).toBe(true);
    expect(canFillFromSource(entry({ status: 'off', regular_hours: 0 }))).toBe(true);
  });
});

describe('OFF fill', () => {
  it('detects off source', () => {
    expect(extractFillFromSource(entry({ status: 'off', regular_hours: 0 }))).toEqual({ kind: 'off', status: 'off' });
  });

  it('applyOffFill writes zero-hour off row', () => {
    const out = applyOffFill('off', undefined, 1, '2026-08-12');
    expect(out.status).toBe('off');
    expect(out.regular_hours).toBe(0);
    expect(out.overtime_hours).toBe(0);
    expect(out.start_time).toBe('');
  });
});

describe('normal-hours fill', () => {
  it('extracts regular hours and times only', () => {
    expect(extractNormalHoursFromSource(entry({
      regular_hours: 10, start_time: '06:00', end_time: '16:00',
      overtime_hours: 4, standby_allowance: true,
    }))).toEqual({ regular_hours: 10, start_time: '06:00', end_time: '16:00' });
  });

  it('prepareFillTemplate creates a work row without OT or allowances', () => {
    const t = prepareFillTemplate(entry({
      id: 99, overtime_hours: 4, nightshift_hours: 3, standby_allowance: true, notes: 'x',
    }));
    expect(t.regular_hours).toBe(8);
    expect(t.overtime_hours).toBe(0);
    expect(t.nightshift_hours).toBe(0);
    expect(t.standby_allowance).toBe(false);
    expect(t.notes).toBe('');
  });

  it('copies night shift allowance onto newly filled empty days when source shift crosses 18:00–06:00', () => {
    const from = extractFillFromSource(entry({
      start_time: '18:00', end_time: '06:00', regular_hours: 10,
      nightshift_hours: 10, nightshift_allowance: false,
    }));
    expect(from.kind).toBe('normal');
    if (from.kind !== 'normal') return;
    const out = applyNormalHoursFill(from.normal, undefined, 1, '2026-08-12', from.nightAllowance);
    expect(out.nightshift_allowance).toBe(true);
    expect(out.nightshift_hours).toBeGreaterThan(0);
  });

  it('applyNormalHoursFill preserves existing OT and allowances on saved targets', () => {
    const existing = entry({
      id: 5, date: '2026-08-11', overtime_hours: 6, nightshift_hours: 2,
      nightshift_allowance: true, standby_allowance: true, notes: 'keep',
    });
    const out = applyNormalHoursFill(
      { regular_hours: 10, start_time: '06:00', end_time: '16:00' },
      existing,
      1,
      '2026-08-11',
    );
    expect(out.regular_hours).toBe(10);
    expect(out.overtime_hours).toBe(6);
    expect(out.nightshift_hours).toBe(2);
    expect(out.standby_allowance).toBe(true);
    expect(out.notes).toBe('keep');
    expect(out.total_hours).toBe(10 + 6 + 2);
  });
});
