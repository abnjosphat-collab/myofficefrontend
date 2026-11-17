import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/lib/apiClient';
import { fetchOT, deleteOT, mergeConfirmedOT, createOT } from './useOvertimeData';

vi.mock('@/lib/apiClient', async importOriginal => ({ ...(await importOriginal<typeof import('@/lib/apiClient')>()), api: { get: vi.fn(), post: vi.fn(), delete: vi.fn() } }));

describe('fetchOT', () => {
  beforeEach(() => { vi.mocked(api.get).mockReset(); });

  it('returns the records provided by the API', async () => {
    const rows = [{ id: 1, employee_name: 'Example' }];
    vi.mocked(api.get).mockResolvedValue(rows);
    await expect(fetchOT()).resolves.toEqual(rows);
  });

  it('rejects an invalid response instead of making it look like an empty register', async () => {
    vi.mocked(api.get).mockResolvedValue({ detail: 'error' });
    await expect(fetchOT()).rejects.toThrow('response was invalid');
  });

  it('retries once after a temporary server failure', async () => {
    vi.mocked(api.get)
      .mockRejectedValueOnce(Object.assign(new Error('Server disconnected'), { status: 503 }))
      .mockResolvedValueOnce([{ id: 2 }]);
    await expect(fetchOT()).resolves.toEqual([{ id: 2 }]);
    expect(api.get).toHaveBeenCalledTimes(2);
  });

  it('stops a stalled request so the page can offer Retry', async () => {
    vi.mocked(api.get).mockImplementation(() => new Promise(() => {}));
    await expect(fetchOT(5)).rejects.toThrow('taking too long');
  });
});

import { buildOvertimePayload } from './useOvertimeData';
import type { OTForm } from './types';
import { ApiError } from '@/lib/apiClient';
import type { OTRecord } from './types';

describe('confirmed and uncertain overtime writes', () => {
  beforeEach(() => vi.clearAllMocks());

  it('reconciles a lost DELETE response with one detail read and never repeats DELETE', async () => {
    vi.mocked(api.delete).mockRejectedValueOnce(new TypeError('Failed to fetch'));
    vi.mocked(api.get).mockRejectedValueOnce(new ApiError('Overtime not found', 404));
    await expect(deleteOT(7)).resolves.toBeUndefined();
    expect(api.delete).toHaveBeenCalledOnce();
    expect(api.get).toHaveBeenCalledWith('/api/overtime/7');
  });

  it('does not claim delete success when the readback still finds the row', async () => {
    const error = new TypeError('Failed to fetch');
    vi.mocked(api.delete).mockRejectedValueOnce(error);
    vi.mocked(api.get).mockResolvedValueOnce({ id: 7 });
    await expect(deleteOT(7)).rejects.toBe(error);
  });

  it('preserves an explicit server refusal without a reconciliation read', async () => {
    const error = new ApiError('Approved overtime cannot be deleted', 409);
    vi.mocked(api.delete).mockRejectedValueOnce(error);
    await expect(deleteOT(7)).rejects.toBe(error);
    expect(api.get).not.toHaveBeenCalled();
  });

  it('merges the confirmed ID exactly once even if IDs have different JS types', () => {
    const old = { id: 7, employee_name: 'Before' } as OTRecord;
    const saved = { id: '7', employee_name: 'After' } as OTRecord;
    expect(mergeConfirmedOT([old], saved)).toEqual([saved]);
  });

  it('does not submit client approval or application stamps or replay uncertain creates', async () => {
    vi.mocked(api.post).mockRejectedValueOnce(new TypeError('Failed to fetch'));
    const payload = { employee_id: 'C1', hours: 2 };
    await expect(createOT(payload)).rejects.toThrow('Failed to fetch');
    expect(api.post).toHaveBeenCalledExactlyOnceWith('/api/overtime', payload);
  });
});

const form: OTForm = {
  employee_name: 'Jane', employee_id: 'C1', position: 'Fitter', department: '', cost_centre: 'Engineering', overtime_type: 'regular', planning_status: 'planned', payout_method: 'cash',
  date: '2026-09-01', start_time: '17:00', end_time: '20:00', hours: '3.5', reason: '', contact_number: '', notes: '',
};

describe('buildOvertimePayload', () => {
  it('sends times and omits hours on create, and the reverse on the hours-only path', () => {
    expect(buildOvertimePayload(form, false)).toMatchObject({ start_time: '17:00', end_time: '20:00' });
    expect('hours' in buildOvertimePayload(form, false)).toBe(false);
    const fast = buildOvertimePayload(form, true);
    expect(fast).toMatchObject({ hours: 3.5 });
    expect('start_time' in fast).toBe(false);
  });
  it('clears the other pair when editing, so a record switched between the two never keeps stale values that would win', () => {
    expect(buildOvertimePayload(form, false, true)).toMatchObject({ start_time: '17:00', end_time: '20:00', hours: null });
    expect(buildOvertimePayload(form, true, true)).toMatchObject({ hours: 3.5, start_time: null, end_time: null });
  });
});
