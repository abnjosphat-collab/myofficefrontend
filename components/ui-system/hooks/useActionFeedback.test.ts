// useActionFeedback: idle → pending → success (held) → idle for triggers that
// finish with a check. Re-entry blocked; failures return to idle silently.
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useActionFeedback } from './useActionFeedback';

describe('useActionFeedback', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('runs idle → pending → success → idle across the hold', async () => {
    const { result } = renderHook(() => useActionFeedback(1200));
    expect(result.current.phase).toBe('idle');
    let done!: Promise<void>;
    act(() => {
      done = result.current.run(async () => {});
    });
    expect(result.current.phase).toBe('pending');
    await act(async () => {
      await done;
    });
    expect(result.current.phase).toBe('success');
    expect(result.current.success).toBe(true);
    act(() => {
      vi.advanceTimersByTime(1199);
    });
    expect(result.current.phase).toBe('success');
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current.phase).toBe('idle');
  });

  it('blocks a second run while busy', async () => {
    const { result } = renderHook(() => useActionFeedback(1200));
    const first = vi.fn(async () => {});
    const second = vi.fn(async () => {});
    let done!: Promise<void>;
    act(() => {
      done = result.current.run(first);
    });
    await act(async () => {
      await result.current.run(second);
    });
    expect(first).toHaveBeenCalledOnce();
    expect(second).not.toHaveBeenCalled();
    await act(async () => {
      await done;
    });
    expect(result.current.phase).toBe('success');
  });

  it('returns to idle with no check when the action throws', async () => {
    const { result } = renderHook(() => useActionFeedback(1200));
    await act(async () => {
      await result.current.run(async () => {
        throw new Error('No connection.');
      });
    });
    expect(result.current.phase).toBe('idle');
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(result.current.phase).toBe('idle');
  });

  it('clears the hold timer on unmount', async () => {
    const clearSpy = vi.spyOn(globalThis, 'clearTimeout');
    const { result, unmount } = renderHook(() => useActionFeedback(1200));
    let done!: Promise<void>;
    act(() => {
      done = result.current.run(async () => {});
    });
    await act(async () => {
      await done;
    });
    expect(result.current.phase).toBe('success');
    unmount();
    expect(clearSpy).toHaveBeenCalled();
    clearSpy.mockRestore();
  });
});
