// lib/transientRetry.ts — which read failures are worth waiting out, and how long to wait. A read that fails because the service is waking
// up, overloaded, or unreachable is retried quietly (the page keeps showing that it is loading) until it answers; a read that fails for a
// reason retrying cannot fix (not allowed, not found, a bad request, a malformed answer) is reported at once.
import { ApiError } from '@/lib/apiClient';

/** Timeouts, rate limits and server-side or gateway failures, and a request that never reached the server (a network error). */
export function isTransientError(error: unknown): boolean {
  if (error instanceof ApiError) return error.status === 408 || error.status === 429 || (error.status >= 500 && error.status !== 501 && error.status !== 505);
  if (error instanceof TypeError) return /fetch|network|load failed/i.test(error.message);
  return false;
}

/** 1 s, 2 s, 4 s, 8 s, then every 15 s: quick to recover from a blip, gentle on a service that is down. */
export const retryDelay = (attempt: number): number => Math.min(1000 * 2 ** Math.min(attempt, 4), 15_000);

/** A request the page gave up waiting for (it was aborted): the service is slow, so this counts as transient (HTTP 408). */
export const timeoutError = (what: string): ApiError => new ApiError(`${what} are taking too long to load. Please retry.`, 408);

/**
 * Run a read until it answers: a failure waiting can fix (see isTransientError) is retried with the growing delay, anything else is thrown
 * at once. For hooks that keep their own state instead of using useApiList. `maxWaitMs` caps the total wait (for secondary figures such as the
 * home page's); `cancelled` stops the loop when the page is gone.
 */
export async function retryTransient<T>(run: () => Promise<T>, options: { maxWaitMs?: number; cancelled?: () => boolean } = {}): Promise<T> {
  const started = Date.now();
  for (let attempt = 0; ; attempt++) {
    try {
      return await run();
    } catch (error) {
      const waited = Date.now() - started;
      if (!isTransientError(error) || options.cancelled?.() || (options.maxWaitMs !== undefined && waited >= options.maxWaitMs)) throw error;
      await new Promise(resolve => setTimeout(resolve, retryDelay(attempt)));
    }
  }
}
