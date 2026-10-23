// hooks/useLookups.test.tsx — F-17: lookup caches expire after 60 s (the same
// window as the server cache) and refetch on remount or window focus, so a
// record added elsewhere appears without a reload. Each test re-imports the
// module for fresh cache state; Date.now is frozen only around the check.
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/apiClient', () => ({
  api: { get: vi.fn() },
  ApiError: class extends Error { status = 0; },
}));

async function fresh() {
  vi.resetModules();
  const lookups = await import('@/hooks/useLookups');
  const apiMod = await import('@/lib/apiClient');
  return { lookups, get: apiMod.api.get as unknown as ReturnType<typeof vi.fn> };
}

const ALICE = [{ id: 1, employee_id: 'E1', full_name: 'Alice' }];
const ALICE_BOB = [...ALICE, { id: 2, employee_id: 'E2', full_name: 'Bob' }];

describe('lookup cache TTL (F-17)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('serves the cache within the TTL without refetching', async () => {
    const { lookups, get } = await fresh();
    get.mockResolvedValue(ALICE);
    const first = renderHook(() => lookups.useEmployees());
    await waitFor(() => expect(first.result.current).toHaveLength(1));
    expect(get).toHaveBeenCalledTimes(1);
    first.unmount();

    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 59_000);
    const second = renderHook(() => lookups.useEmployees());
    await waitFor(() => expect(second.result.current).toHaveLength(1));
    expect(get).toHaveBeenCalledTimes(1);
    nowSpy.mockRestore();
    second.unmount();
  });

  it('refetches on remount after the TTL, showing the new person', async () => {
    const { lookups, get } = await fresh();
    get.mockResolvedValueOnce(ALICE).mockResolvedValueOnce(ALICE_BOB);
    const first = renderHook(() => lookups.useEmployees());
    await waitFor(() => expect(first.result.current).toHaveLength(1));
    first.unmount();

    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 61_000);
    const second = renderHook(() => lookups.useEmployees());
    await waitFor(() => expect(second.result.current).toHaveLength(2));
    expect(get).toHaveBeenCalledTimes(2);
    nowSpy.mockRestore();
    second.unmount();
  });

  it('refetches on window focus after the TTL', async () => {
    const { lookups, get } = await fresh();
    get.mockResolvedValueOnce(ALICE).mockResolvedValueOnce(ALICE_BOB);
    const rendered = renderHook(() => lookups.useEmployees());
    await waitFor(() => expect(rendered.result.current).toHaveLength(1));
    expect(get).toHaveBeenCalledTimes(1);

    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 61_000);
    act(() => {
      window.dispatchEvent(new Event('focus'));
    });
    await waitFor(() => expect(rendered.result.current).toHaveLength(2));
    expect(get).toHaveBeenCalledTimes(2);
    nowSpy.mockRestore();
    rendered.unmount();
  });

  it('ignores window focus while the cache is fresh', async () => {
    const { lookups, get } = await fresh();
    get.mockResolvedValue(ALICE);
    const rendered = renderHook(() => lookups.useEmployees());
    await waitFor(() => expect(rendered.result.current).toHaveLength(1));
    act(() => {
      window.dispatchEvent(new Event('focus'));
    });
    await waitFor(() => expect(get).toHaveBeenCalledTimes(1));
    rendered.unmount();
  });
});
