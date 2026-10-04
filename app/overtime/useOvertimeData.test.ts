import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '@/lib/apiClient';
import { fetchOT } from './useOvertimeData';

vi.mock('@/lib/apiClient', () => ({ api: { get: vi.fn() } }));

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
