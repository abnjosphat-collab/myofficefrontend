import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/apiClient';
import { isTransientTimesheetReadError, retryTimesheetRead } from './retryTimesheetRead';

afterEach(() => vi.useRealTimers());

describe('timesheet read recovery', () => {
  it('retries overload/network errors but stops on auth, validation and invalid payloads', () => {
    for (const status of [408, 429, 500, 502, 503, 504]) expect(isTransientTimesheetReadError(new ApiError('Temporary', status))).toBe(true);
    for (const status of [400, 401, 403, 404, 422, 501, 505]) expect(isTransientTimesheetReadError(new ApiError('Permanent', status))).toBe(false);
    expect(isTransientTimesheetReadError(new TypeError('Failed to fetch'))).toBe(true);
    expect(isTransientTimesheetReadError(new Error('Leave records returned an unexpected response.'))).toBe(false);
  });

  it('continues beyond a short failure burst, with backoff capped at 15 seconds', async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const read = vi.fn().mockRejectedValue(new ApiError('Busy', 503));
    const pending = retryTimesheetRead(read, controller.signal, vi.fn());
    const outcome = pending.catch(error => error);
    await vi.advanceTimersByTimeAsync(45_000);
    expect(read).toHaveBeenCalledTimes(7);
    controller.abort();
    expect(await outcome).toMatchObject({ name: 'AbortError' });
    expect(vi.getTimerCount()).toBe(0);
  });

  it('aborts a stalled request and retries it after the 30-second request timeout', async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const read = vi.fn().mockImplementationOnce((signal: AbortSignal) => new Promise((_, reject) => {
      signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
    })).mockResolvedValueOnce(['record']);
    const pending = retryTimesheetRead(read, controller.signal, vi.fn());
    await vi.advanceTimersByTimeAsync(31_000);
    expect(await pending).toEqual(['record']);
    expect(read).toHaveBeenCalledTimes(2);
    expect(vi.getTimerCount()).toBe(0);
  });
});
