import { describe, expect, it, vi, afterEach } from 'vitest';
import { ApiError } from '@/lib/apiClient';
import { isTransientError, retryTransient, timeoutError } from './transientRetry';

afterEach(() => vi.useRealTimers());

describe('timeoutError', () => {
  it('is a transient 408 with the page-facing message', () => {
    const e = timeoutError('Overtime records');
    expect(e).toBeInstanceOf(ApiError);
    expect(e.status).toBe(408);
    expect(e.message).toBe('Overtime records are taking too long to load. Please retry.');
    expect(isTransientError(e)).toBe(true);
  });
});

describe('retryTransient', () => {
  it('waits out transient failures and returns the answer', async () => {
    vi.useFakeTimers();
    const run = vi.fn().mockRejectedValueOnce(new ApiError('down', 503)).mockRejectedValueOnce(new TypeError('Failed to fetch')).mockResolvedValue('rows');
    const result = retryTransient(run);
    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(2000);
    await expect(result).resolves.toBe('rows');
    expect(run).toHaveBeenCalledTimes(3);
  });

  it('throws a permanent failure at once', async () => {
    const run = vi.fn().mockRejectedValue(new ApiError('not allowed', 403));
    await expect(retryTransient(run)).rejects.toThrow('not allowed');
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('gives up after maxWaitMs and stops when cancelled', async () => {
    vi.useFakeTimers();
    const run = vi.fn().mockRejectedValue(new ApiError('down', 502));
    const capped = retryTransient(run, { maxWaitMs: 2500 });
    const caught = capped.catch(e => e);
    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(2000);
    await vi.advanceTimersByTimeAsync(4000);
    expect((await caught as Error).message).toBe('down');

    let gone = false;
    const cancelled = retryTransient(vi.fn().mockRejectedValue(new ApiError('down', 502)), { cancelled: () => gone }).catch(e => e);
    gone = true;
    await vi.advanceTimersByTimeAsync(1000);
    expect(((await cancelled) as Error).message).toBe('down');
  });
});
