import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { authFetch } from '@/lib/api';
import { useModuleData } from './useModuleData';

vi.mock('@/lib/api', () => ({ authFetch: vi.fn() }));
vi.mock('@/lib/config', () => ({ API_BASE: 'http://api.test' }));

type Row = { id: number; name: string };

const respond = (status: number, body: unknown) =>
  ({ ok: status >= 200 && status < 300, status, json: async () => body, text: async () => (typeof body === 'string' ? body : JSON.stringify(body)) }) as Response;

describe('useModuleData', () => {
  beforeEach(() => vi.mocked(authFetch).mockReset());
  afterEach(() => vi.useRealTimers());

  describe('loading', () => {
    it('starts loading, then holds the rows from the endpoint', async () => {
      vi.mocked(authFetch).mockResolvedValue(respond(200, [{ id: 1, name: 'a' }]));
      const { result } = renderHook(() => useModuleData<Row>('job-cards'));
      expect(result.current.loading).toBe(true);
      expect(result.current.data).toEqual([]);
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.data).toEqual([{ id: 1, name: 'a' }]);
      expect(result.current.error).toBe('');
      expect(authFetch).toHaveBeenCalledWith('http://api.test/api/job-cards');
    });

    it('sends only the non-empty filters on a refetch', async () => {
      vi.mocked(authFetch).mockResolvedValue(respond(200, []));
      const { result } = renderHook(() => useModuleData<Row>('job-cards'));
      await waitFor(() => expect(result.current.loading).toBe(false));
      await act(async () => { await result.current.refetch({ status: 'open', search: '' }); });
      expect(vi.mocked(authFetch).mock.calls.at(-1)?.[0]).toBe('http://api.test/api/job-cards?status=open');
    });
  });

  describe('failures', () => {
    it('reports a refusal at once, in the "<status>: <body>" form, with no retry and no empty-success', async () => {
      vi.mocked(authFetch).mockResolvedValue(respond(403, 'Permission denied'));
      const { result } = renderHook(() => useModuleData<Row>('job-cards'));
      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.error).toBe('403: Permission denied');
      expect(result.current.data).toEqual([]);
      expect(authFetch).toHaveBeenCalledTimes(1);
    });

    it('treats a not-found as permanent', async () => {
      vi.mocked(authFetch).mockResolvedValue(respond(404, 'Not found'));
      const { result } = renderHook(() => useModuleData<Row>('job-cards'));
      await waitFor(() => expect(result.current.error).toBe('404: Not found'));
      expect(authFetch).toHaveBeenCalledTimes(1);
    });

    it('keeps loading through a slow service and shows the rows once it answers', async () => {
      vi.useFakeTimers();
      vi.mocked(authFetch)
        .mockResolvedValueOnce(respond(503, 'waking up'))
        .mockResolvedValueOnce(respond(500, 'Errno 11'))
        .mockResolvedValueOnce(respond(200, [{ id: 7, name: 'late' }]));
      const { result } = renderHook(() => useModuleData<Row>('job-cards'));

      await act(async () => { await vi.advanceTimersByTimeAsync(0); });
      expect(authFetch).toHaveBeenCalledTimes(1);
      expect(result.current.loading).toBe(true);
      expect(result.current.error).toBe('');

      await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
      expect(authFetch).toHaveBeenCalledTimes(2);
      expect(result.current.loading).toBe(true);
      expect(result.current.error).toBe('');

      await act(async () => { await vi.advanceTimersByTimeAsync(2000); });
      expect(authFetch).toHaveBeenCalledTimes(3);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe('');
      expect(result.current.data).toEqual([{ id: 7, name: 'late' }]);
    });

    it('keeps loading when the connection is lost, then recovers', async () => {
      vi.useFakeTimers();
      vi.mocked(authFetch)
        .mockRejectedValueOnce(new TypeError('Failed to fetch'))
        .mockResolvedValueOnce(respond(200, [{ id: 1, name: 'ok' }]));
      const { result } = renderHook(() => useModuleData<Row>('job-cards'));
      await act(async () => { await vi.advanceTimersByTimeAsync(0); });
      expect(result.current.loading).toBe(true);
      await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
      expect(result.current.data).toHaveLength(1);
      expect(result.current.loading).toBe(false);
    });

    it('a retry that was waiting when a newer request took over never overwrites the newer rows', async () => {
      vi.useFakeTimers();
      vi.mocked(authFetch)
        .mockResolvedValueOnce(respond(503, 'slow'))
        .mockResolvedValueOnce(respond(200, [{ id: 2, name: 'fresh' }]))
        .mockResolvedValue(respond(200, [{ id: 99, name: 'stale' }]));
      const { result } = renderHook(() => useModuleData<Row>('job-cards'));
      await act(async () => { await vi.advanceTimersByTimeAsync(0); });
      await act(async () => { await result.current.refetch(); });
      expect(result.current.data).toEqual([{ id: 2, name: 'fresh' }]);

      await act(async () => { await vi.advanceTimersByTimeAsync(20_000); });
      expect(result.current.data).toEqual([{ id: 2, name: 'fresh' }]);
      expect(result.current.loading).toBe(false);
    });
  });

  describe('writes', () => {
    async function ready(rows: Row[]) {
      vi.mocked(authFetch).mockResolvedValueOnce(respond(200, rows));
      const hook = renderHook(() => useModuleData<Row>('job-cards'));
      await waitFor(() => expect(hook.result.current.loading).toBe(false));
      return hook;
    }

    it('create posts JSON and puts the new row first', async () => {
      const { result } = await ready([{ id: 1, name: 'a' }]);
      vi.mocked(authFetch).mockResolvedValueOnce(respond(201, { id: 2, name: 'b' }));
      await act(async () => { await result.current.create({ name: 'b' }); });
      const [url, init] = vi.mocked(authFetch).mock.calls.at(-1)!;
      expect(url).toBe('http://api.test/api/job-cards');
      expect(init).toMatchObject({ method: 'POST', body: JSON.stringify({ name: 'b' }) });
      expect(result.current.data.map(r => r.id)).toEqual([2, 1]);
    });

    it('update patches by id and replaces only that row', async () => {
      const { result } = await ready([{ id: 1, name: 'a' }, { id: 2, name: 'b' }]);
      vi.mocked(authFetch).mockResolvedValueOnce(respond(200, { id: 2, name: 'B2' }));
      await act(async () => { await result.current.update(2, { name: 'B2' }); });
      expect(vi.mocked(authFetch).mock.calls.at(-1)?.[0]).toBe('http://api.test/api/job-cards/2');
      expect(result.current.data).toEqual([{ id: 1, name: 'a' }, { id: 2, name: 'B2' }]);
    });

    it('remove deletes by id and drops that row', async () => {
      const { result } = await ready([{ id: 1, name: 'a' }, { id: 2, name: 'b' }]);
      vi.mocked(authFetch).mockResolvedValueOnce(respond(204, ''));
      await act(async () => { await result.current.remove(1); });
      expect(vi.mocked(authFetch).mock.calls.at(-1)?.[1]).toMatchObject({ method: 'DELETE' });
      expect(result.current.data).toEqual([{ id: 2, name: 'b' }]);
    });

    it('a refused write throws with the server message and leaves the rows untouched', async () => {
      const { result } = await ready([{ id: 1, name: 'a' }]);
      vi.mocked(authFetch).mockResolvedValueOnce(respond(403, 'Managers only'));
      await expect(result.current.remove(1)).rejects.toThrow('Managers only');
      vi.mocked(authFetch).mockResolvedValueOnce(respond(422, 'bad'));
      await expect(result.current.create({ name: '' })).rejects.toThrow('bad');
      vi.mocked(authFetch).mockResolvedValueOnce(respond(500, 'boom'));
      await expect(result.current.update(1, { name: 'x' })).rejects.toThrow('boom');
      expect(result.current.data).toEqual([{ id: 1, name: 'a' }]);
    });
  });
});
