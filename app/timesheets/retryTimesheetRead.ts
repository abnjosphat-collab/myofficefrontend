import { ApiError } from '@/lib/apiClient';

/** Read failures that can recover without user intervention. */
export function isTransientTimesheetReadError(error: unknown): boolean {
  if (error instanceof ApiError) return error.status === 408 || error.status === 429
    || (error.status >= 500 && error.status !== 501 && error.status !== 505);
  if (error instanceof TypeError) return /fetch|network|load failed/i.test(error.message);
  return error instanceof Error && /resource temporarily unavailable|timed? out|network|offline|failed to fetch/i.test(error.message);
}

/** Abortable backoff; cancelled loads must not wake up and query an old period. */
function waitForRetry(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const cancel = () => {
      clearTimeout(timer);
      signal.removeEventListener('abort', cancel);
      reject(new DOMException('Timesheet load cancelled', 'AbortError'));
    };
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', cancel);
      resolve();
    }, ms);
    signal.addEventListener('abort', cancel, { once: true });
    if (signal.aborted) cancel();
  });
}

/** Retry an individual read until it succeeds, is cancelled, or fails permanently. */
export async function retryTimesheetRead<T>(
  read: (signal: AbortSignal) => Promise<T>,
  signal: AbortSignal,
  onRetry: () => void,
): Promise<T> {
  let attempt = 0;
  while (!signal.aborted) {
    const request = new AbortController();
    const cancel = () => request.abort();
    signal.addEventListener('abort', cancel, { once: true });
    const timeout = setTimeout(() => request.abort(), 30_000);
    try {
      return await read(request.signal);
    } catch (error) {
      if (signal.aborted) throw error;
      const timedOut = request.signal.aborted;
      if (!timedOut && !isTransientTimesheetReadError(error)) throw error;
    } finally {
      clearTimeout(timeout);
      signal.removeEventListener('abort', cancel);
    }
    if (signal.aborted) break;
    onRetry();
    await waitForRetry(Math.min(1_000 * 2 ** Math.min(attempt++, 4), 15_000), signal);
  }
  throw new DOMException('Timesheet load cancelled', 'AbortError');
}
