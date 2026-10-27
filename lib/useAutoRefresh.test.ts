// lib/useAutoRefresh.test.ts — the shared background-refresh driver: tick,
// visible-again, online, and every skip guard (hidden tab, own request pending,
// hook loading, mutation pending, disabled).
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const getSession = vi.fn();
vi.mock('@/lib/supabase', () => ({
  supabase: { auth: { getSession: () => getSession() } },
}));

import { authFetch, isMutationInFlight } from '@/lib/api';
import { AUTO_REFRESH_EVERY_MS, useAutoRefresh } from './useAutoRefresh';

function setHidden(hidden: boolean) {
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
}

describe('useAutoRefresh', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-27T10:00:00Z'));
    setHidden(false);
    getSession.mockResolvedValue({ data: { session: null } });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.resetAllMocks();
  });

  it('refetches on the 60 s tick while the tab is visible', () => {
    const refetch = vi.fn();
    renderHook(() => useAutoRefresh(refetch));
    expect(refetch).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(AUTO_REFRESH_EVERY_MS); });
    expect(refetch).toHaveBeenCalledTimes(1);
    act(() => { vi.advanceTimersByTime(AUTO_REFRESH_EVERY_MS); });
    expect(refetch).toHaveBeenCalledTimes(2);
  });

  it('honours a custom interval (the bell passes 15 s)', () => {
    const refetch = vi.fn();
    renderHook(() => useAutoRefresh(refetch, { every: 15_000 }));
    act(() => { vi.advanceTimersByTime(15_000); });
    expect(refetch).toHaveBeenCalledTimes(1);
    act(() => { vi.advanceTimersByTime(14_999); });
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('wires nothing when disabled', () => {
    const refetch = vi.fn();
    renderHook(() => useAutoRefresh(refetch, { enabled: false }));
    act(() => { vi.advanceTimersByTime(AUTO_REFRESH_EVERY_MS * 3); });
    act(() => { window.dispatchEvent(new Event('online')); });
    expect(refetch).not.toHaveBeenCalled();
  });

  it('refetches when the tab becomes visible again after 30 s away, but not before', () => {
    const refetch = vi.fn();
    renderHook(() => useAutoRefresh(refetch));
    act(() => { setHidden(true); document.dispatchEvent(new Event('visibilitychange')); });
    act(() => { vi.advanceTimersByTime(29_999); });
    act(() => { setHidden(false); document.dispatchEvent(new Event('visibilitychange')); });
    expect(refetch).not.toHaveBeenCalled();
    act(() => { setHidden(true); document.dispatchEvent(new Event('visibilitychange')); });
    act(() => { vi.advanceTimersByTime(30_000); });
    act(() => { setHidden(false); document.dispatchEvent(new Event('visibilitychange')); });
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('refetches when the network comes back', () => {
    const refetch = vi.fn();
    renderHook(() => useAutoRefresh(refetch));
    act(() => { window.dispatchEvent(new Event('online')); });
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('skips the tick while the tab is hidden', () => {
    const refetch = vi.fn();
    renderHook(() => useAutoRefresh(refetch));
    act(() => { setHidden(true); });
    act(() => { vi.advanceTimersByTime(AUTO_REFRESH_EVERY_MS); });
    expect(refetch).not.toHaveBeenCalled();
  });

  it('never fires while its own refetch is still pending', async () => {
    let resolve!: () => void;
    const refetch = vi.fn(() => new Promise<void>(r => { resolve = r; }));
    renderHook(() => useAutoRefresh(refetch));
    act(() => { vi.advanceTimersByTime(AUTO_REFRESH_EVERY_MS); });
    expect(refetch).toHaveBeenCalledTimes(1);
    act(() => { vi.advanceTimersByTime(AUTO_REFRESH_EVERY_MS * 2); });
    expect(refetch).toHaveBeenCalledTimes(1);
    await act(async () => { resolve(); });
    act(() => { vi.advanceTimersByTime(AUTO_REFRESH_EVERY_MS); });
    expect(refetch).toHaveBeenCalledTimes(2);
  });

  it('skips the tick while the hook reports a request in flight', () => {
    const refetch = vi.fn();
    const { rerender } = renderHook(({ loading }) => useAutoRefresh(refetch, { isLoading: loading }), { initialProps: { loading: true } });
    act(() => { vi.advanceTimersByTime(AUTO_REFRESH_EVERY_MS); });
    expect(refetch).not.toHaveBeenCalled();
    rerender({ loading: false });
    act(() => { vi.advanceTimersByTime(AUTO_REFRESH_EVERY_MS); });
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('skips the tick while a custom mutating check holds', () => {
    const refetch = vi.fn();
    let mutating = true;
    renderHook(() => useAutoRefresh(refetch, { isMutating: () => mutating }));
    act(() => { vi.advanceTimersByTime(AUTO_REFRESH_EVERY_MS); });
    expect(refetch).not.toHaveBeenCalled();
    mutating = false;
    act(() => { vi.advanceTimersByTime(AUTO_REFRESH_EVERY_MS); });
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('skips the tick while a real write is in flight, then refetches once it settles', async () => {
    let release!: (value: Response) => void;
    vi.stubGlobal('fetch', () => new Promise<Response>(r => { release = r; }));
    const refetch = vi.fn();
    renderHook(() => useAutoRefresh(refetch));
    let settled = false;
    const pending = authFetch('http://x/api/thing', { method: 'POST', body: '{}' }).then(
      r => { settled = true; return r; },
      e => { settled = true; throw e; },
    );
    await act(async () => { await Promise.resolve(); });
    expect(isMutationInFlight()).toBe(true);
    act(() => { vi.advanceTimersByTime(AUTO_REFRESH_EVERY_MS); });
    expect(refetch).not.toHaveBeenCalled();
    await act(async () => { release(new Response('{}', { status: 200 })); await pending; });
    expect(settled).toBe(true);
    expect(isMutationInFlight()).toBe(false);
    act(() => { vi.advanceTimersByTime(AUTO_REFRESH_EVERY_MS); });
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('stops all timers and listeners on unmount', () => {
    const refetch = vi.fn();
    const { unmount } = renderHook(() => useAutoRefresh(refetch));
    unmount();
    act(() => { vi.advanceTimersByTime(AUTO_REFRESH_EVERY_MS * 2); });
    act(() => { window.dispatchEvent(new Event('online')); });
    expect(refetch).not.toHaveBeenCalled();
  });
});
