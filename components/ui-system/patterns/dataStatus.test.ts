import { describe, expect, it } from 'vitest';
import { deriveDataStatus, isTransientStatus } from './dataStatus';

const base = { loaded: false, loading: false, count: 0 };

describe('deriveDataStatus', () => {
  it('never reports empty before a first success', () => {
    expect(deriveDataStatus({ ...base })).toBe('loading');
    expect(deriveDataStatus({ ...base, loading: true })).toBe('loading');
  });

  it('reports empty only after a successful load with zero records', () => {
    expect(deriveDataStatus({ loaded: true, loading: false, count: 0 })).toBe('empty');
  });

  it('keeps visible records while refreshing', () => {
    expect(deriveDataStatus({ loaded: true, loading: true, count: 4 })).toBe('refreshing');
  });

  it('shows ready when records exist and nothing is in flight', () => {
    expect(deriveDataStatus({ loaded: true, loading: false, count: 4 })).toBe('ready');
  });

  it('a failed first load is an error, never an empty list', () => {
    expect(deriveDataStatus({ ...base, error: 'Server error', errorStatus: 500 })).toBe('error');
  });

  it('a transient failure being retried reads as retrying, not fatal', () => {
    expect(deriveDataStatus({ ...base, loading: true, error: 'Waking up', errorStatus: 503 })).toBe('retrying');
    expect(deriveDataStatus({ ...base, loading: true, error: 'Network down', errorStatus: null })).toBe('retrying');
  });

  it('a permanent failure while loading stays an error (no endless spinner)', () => {
    expect(deriveDataStatus({ ...base, loading: true, error: 'Bad request', errorStatus: 400 })).toBe('error');
  });

  it('a failed refresh keeps the existing records and flags them stale', () => {
    expect(deriveDataStatus({ loaded: true, loading: false, count: 3, error: 'Down', errorStatus: 503 })).toBe('stale-error');
  });

  it('a failed refresh with no records is an error', () => {
    expect(deriveDataStatus({ loaded: true, loading: false, count: 0, error: 'Down', errorStatus: 503 })).toBe('error');
  });

  it('401 and 403 are unauthorized regardless of loaded data', () => {
    expect(deriveDataStatus({ ...base, error: 'No', errorStatus: 401 })).toBe('unauthorized');
    expect(deriveDataStatus({ loaded: true, loading: false, count: 5, error: 'No', errorStatus: 403 })).toBe('unauthorized');
  });
});

describe('isTransientStatus', () => {
  it('treats gateway, timeout, throttle and network failures as transient', () => {
    for (const status of [undefined, null, 0, 408, 429, 502, 503, 504]) expect(isTransientStatus(status)).toBe(true);
  });
  it('treats client and server logic errors as permanent', () => {
    for (const status of [400, 401, 403, 404, 422, 500]) expect(isTransientStatus(status)).toBe(false);
  });
});
