import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { toast } from 'sonner';
import { previousPeriodEntries, useTimesheetEditing } from './useTimesheetEditing';
import { getDays } from './timesheetMeta';
import type { Employee, TimesheetEntry } from './types';
import { api } from './useTimesheetsData';

vi.mock('./useTimesheetsData', () => ({ api: { create: vi.fn(), update: vi.fn(), delete: vi.fn() } }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), warning: vi.fn(), error: vi.fn(), info: vi.fn() } }));

const emp = (id: string): Employee => ({ id, employeeId: `C${id}`, name: `E${id}`, position: 'Fitter', department: 'M', email: '', is_active: true, employmentType: 'NEC' });
const ts = (employee_id: number, date: string, over: Partial<TimesheetEntry> = {}): TimesheetEntry => ({ id: 9, employee_id, date, status: 'work', regular_hours: 10, ...over });

describe('previousPeriodEntries', () => {
  const prevDays = getDays({ start: new Date(2026, 7, 13), end: new Date(2026, 8, 12) }); // 31 days
  const curDays = getDays({ start: new Date(2026, 8, 13), end: new Date(2026, 9, 12) });   // 30 days
  it('copies each day onto the same position of the new period, without the old id', () => {
    const out = previousPeriodEntries({ previous: [ts(1, '2026-08-13'), ts(1, '2026-08-15', { status: 'off', regular_hours: 0 })], employees: [emp('1')], currentDays: curDays, previousDays: prevDays });
    expect(out.map(e => [e.date, e.status, (e as TimesheetEntry).id])).toEqual([['2026-09-13', 'work', undefined], ['2026-09-15', 'off', undefined]]);
  });
  it('copies only for the people on the roster, and ignores days the new period does not have', () => {
    const previous = [ts(1, '2026-09-12'), ts(2, '2026-08-13')];
    expect(previousPeriodEntries({ previous, employees: [emp('2')], currentDays: curDays, previousDays: prevDays }).map(e => e.employee_id)).toEqual([2]);
    // the 31st day of the old period has no counterpart in a 30-day period
    expect(previousPeriodEntries({ previous: [ts(1, '2026-09-12')], employees: [emp('1')], currentDays: curDays, previousDays: prevDays })).toEqual([]);
  });
});

describe('saveEntry concurrency', () => {
  const entry = { employee_id: 1, date: '2026-10-20', regular_hours: 8, status: 'work' } as Omit<TimesheetEntry, 'id'>;
  const setup = (timesheets: TimesheetEntry[]) => renderHook(() => useTimesheetEditing({
    timesheets, setTimesheets: vi.fn(), effectiveTimesheets: timesheets, rosterEmployees: [],
    currentMonth: new Date(2026, 9, 1), activePeriod: { start: new Date(2026, 9, 1), end: new Date(2026, 9, 30) },
    confirm: async () => true,
  }));

  beforeEach(() => { vi.mocked(api.update).mockReset(); vi.mocked(api.create).mockReset(); });

  it('update includes expected_updated_at from the loaded row', async () => {
    vi.mocked(api.update).mockResolvedValue(ts(1, '2026-10-20'));
    const { result } = setup([ts(1, '2026-10-20', { updated_at: 't0' })]);
    await result.current.saveEntry('1', new Date(2026, 9, 20), entry);
    expect(api.update).toHaveBeenCalledWith(9, expect.objectContaining({ expected_updated_at: 't0' }));
  });

  it('create sends no expectation', async () => {
    vi.mocked(api.create).mockResolvedValue(ts(1, '2026-10-20'));
    const { result } = setup([]);
    await result.current.saveEntry('1', new Date(2026, 9, 20), entry);
    expect(api.create).toHaveBeenCalledTimes(1);
    expect(vi.mocked(api.create).mock.calls[0][0]).not.toHaveProperty('expected_updated_at');
  });

  it('omits the key when the row lacks updated_at', async () => {
    vi.mocked(api.update).mockResolvedValue(ts(1, '2026-10-20'));
    const { result } = setup([ts(1, '2026-10-20')]);
    await result.current.saveEntry('1', new Date(2026, 9, 20), entry);
    expect(vi.mocked(api.update).mock.calls[0][1]).not.toHaveProperty('expected_updated_at');
  });
});

describe('bulkSave concurrency', () => {
  const conflict = () => Object.assign(new Error('Someone else changed this record since you opened it.'), { status: 409 });
  const setup = (timesheets: TimesheetEntry[]) => {
    const setTimesheets = vi.fn();
    const { result } = renderHook(() => useTimesheetEditing({
      timesheets, setTimesheets, effectiveTimesheets: timesheets, rosterEmployees: [],
      currentMonth: new Date(2026, 9, 1), activePeriod: { start: new Date(2026, 9, 1), end: new Date(2026, 9, 30) },
      confirm: async () => true,
    }));
    return { result, setTimesheets };
  };
  const settledState = (base: TimesheetEntry[], setTimesheets: ReturnType<typeof vi.fn>) => {
    let state = base;
    for (const [fn] of setTimesheets.mock.calls as [(prev: TimesheetEntry[]) => TimesheetEntry[]][]) state = fn(state);
    return state;
  };

  beforeEach(() => { vi.mocked(api.update).mockReset(); vi.mocked(api.create).mockReset(); vi.mocked(toast.warning).mockClear(); });

  it('sends each row its own expectation', async () => {
    vi.mocked(api.update).mockImplementation(async (id: number) => ts(1, id === 9 ? '2026-10-20' : '2026-10-21'));
    const { result } = setup([ts(1, '2026-10-20', { id: 9, updated_at: 't1' }), ts(1, '2026-10-21', { id: 10, updated_at: 't2' })]);
    await result.current.bulkSave([
      { ...ts(1, '2026-10-20', { regular_hours: 8 }), id: undefined } as Omit<TimesheetEntry, 'id'>,
      { ...ts(1, '2026-10-21', { regular_hours: 8 }), id: undefined } as Omit<TimesheetEntry, 'id'>,
    ]);
    expect(vi.mocked(api.update).mock.calls[0][1]).toMatchObject({ expected_updated_at: 't1' });
    expect(vi.mocked(api.update).mock.calls[1][1]).toMatchObject({ expected_updated_at: 't2' });
  });

  it('a 409 row is skipped and reported while the rest save, and keeps its old value', async () => {
    vi.mocked(api.update)
      .mockRejectedValueOnce(conflict())
      .mockResolvedValueOnce(ts(1, '2026-10-21', { id: 10, regular_hours: 8, updated_at: 't3' }));
    const before = [ts(1, '2026-10-20', { id: 9, regular_hours: 10, updated_at: 't1' }), ts(1, '2026-10-21', { id: 10, regular_hours: 10, updated_at: 't2' })];
    const { result, setTimesheets } = setup(before);
    await result.current.bulkSave([
      { ...ts(1, '2026-10-20', { regular_hours: 8 }), id: undefined } as Omit<TimesheetEntry, 'id'>,
      { ...ts(1, '2026-10-21', { regular_hours: 8 }), id: undefined } as Omit<TimesheetEntry, 'id'>,
    ]);
    expect(vi.mocked(toast.warning)).toHaveBeenCalledWith(expect.stringMatching(/1 entry skipped \u2014 changed by someone else/));
    const state = settledState(before, setTimesheets);
    expect(state.find(e => e.date === '2026-10-20')).toMatchObject({ regular_hours: 10, updated_at: 't1' });
    expect(state.find(e => e.date === '2026-10-21')).toMatchObject({ regular_hours: 8, updated_at: 't3' });
  });

  it('non-409 failures keep the old message and never the skipped wording', async () => {
    vi.mocked(api.update).mockRejectedValueOnce(new Error('boom'));
    const { result } = setup([ts(1, '2026-10-20', { id: 9, updated_at: 't1' })]);
    await result.current.bulkSave([{ ...ts(1, '2026-10-20', { regular_hours: 8 }), id: undefined } as Omit<TimesheetEntry, 'id'>]);
    expect(vi.mocked(toast.warning)).toHaveBeenCalledWith(expect.stringContaining('failed to save: boom'));
    expect(vi.mocked(toast.warning)).not.toHaveBeenCalledWith(expect.stringContaining('skipped'));
  });

  it('omits the key when the rows lack updated_at', async () => {
    vi.mocked(api.update).mockResolvedValueOnce(ts(1, '2026-10-20'));
    const { result } = setup([ts(1, '2026-10-20', { id: 9 })]);
    await result.current.bulkSave([{ ...ts(1, '2026-10-20', { regular_hours: 8 }), id: undefined } as Omit<TimesheetEntry, 'id'>]);
    expect(vi.mocked(api.update).mock.calls[0][1]).not.toHaveProperty('expected_updated_at');
  });
});
