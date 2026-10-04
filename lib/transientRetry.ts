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
