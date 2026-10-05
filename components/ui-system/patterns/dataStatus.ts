/**
 * Which state should a data region show? One pure function so every module
 * distinguishes the same cases and never renders a failed request as "no records".
 *
 *   loading       first fetch, nothing to show yet            → skeleton
 *   retrying      a transient failure is being retried        → skeleton + "still trying" copy
 *   refreshing    background reload, records already visible  → keep records, subtle indicator
 *   stale-error   refresh failed but records remain           → keep records + "may be out of date" banner
 *   unauthorized  401/403                                     → access message (never an empty list)
 *   error         permanent failure, nothing to show          → error with retry
 *   empty         loaded successfully, zero records           → empty state
 *   ready         records to show
 */
export type DataStatus = 'loading' | 'retrying' | 'refreshing' | 'stale-error' | 'unauthorized' | 'error' | 'empty' | 'ready';

export interface DataStatusInput {
  /** At least one successful response has been received. */
  loaded: boolean;
  /** A request is in flight. */
  loading: boolean;
  /** HTTP status of the latest failure, if any. */
  errorStatus?: number | null;
  /** Human-readable failure of the latest attempt, if any. */
  error?: string | null;
  /** The failure is expected to clear on its own (server errors such as 500/502/503/504, timeouts, network, Supabase waking up). */
  transient?: boolean;
  /** Number of records the region would render. */
  count: number;
}

/** Must agree with lib/transientRetry.ts (what is retried is what is shown as "still loading"): timeouts, rate limits, no answer, and server-side failures (500, 502, 503, 504...) except "not implemented" and "version not supported". */
export function isTransientStatus(status: number | null | undefined): boolean {
  if (status === undefined || status === null || status === 0) return true;
  return status === 408 || status === 429 || (status >= 500 && status !== 501 && status !== 505);
}

export function deriveDataStatus(input: DataStatusInput): DataStatus {
  const { loaded, loading, error, errorStatus, count } = input;
  const failed = Boolean(error) || (errorStatus !== undefined && errorStatus !== null && errorStatus >= 400);
  if (failed && (errorStatus === 401 || errorStatus === 403)) return 'unauthorized';
  if (failed) {
    if (loaded && count > 0) return 'stale-error';
    if (loading && (input.transient ?? isTransientStatus(errorStatus))) return 'retrying';
    return 'error';
  }
  if (!loaded) return 'loading'; // nothing yet: never claim "empty" before a success
  if (loading) return count > 0 ? 'refreshing' : 'loading';
  return count > 0 ? 'ready' : 'empty';
}
