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
