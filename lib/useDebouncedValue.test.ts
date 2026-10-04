import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDebouncedValue } from './useDebouncedValue';

describe('useDebouncedValue', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('keeps the old value until the input has been still for the delay', () => {
    const { result, rerender } = renderHook(({ v }) => useDebouncedValue(v, 300), { initialProps: { v: 'a' } });
    rerender({ v: 'ab' });
    act(() => { vi.advanceTimersByTime(299); });
    expect(result.current).toBe('a');
    act(() => { vi.advanceTimersByTime(1); });
    expect(result.current).toBe('ab');
  });

  it('restarts the wait on every change, so a burst of typing yields one update', () => {
    const { result, rerender } = renderHook(({ v }) => useDebouncedValue(v, 300), { initialProps: { v: '' } });
    for (const v of ['p', 'pu', 'pum', 'pump']) { rerender({ v }); act(() => { vi.advanceTimersByTime(200); }); }
    expect(result.current).toBe('');
    act(() => { vi.advanceTimersByTime(300); });
    expect(result.current).toBe('pump');
  });
});
