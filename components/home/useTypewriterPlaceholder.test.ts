import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { DELETE_MS, HOLD_MS, REST_MS, TYPE_MS, useTypewriterPlaceholder } from './useTypewriterPlaceholder';

const mockReduced = vi.fn();
vi.mock('framer-motion', () => ({ useReducedMotion: () => mockReduced() }));

const PHRASES = ['ab', 'c'];
const step = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });

describe('useTypewriterPlaceholder', () => {
  afterEach(() => { vi.useRealTimers(); mockReduced.mockReset(); });

  it('types, holds, deletes, rests, then loops', () => {
    mockReduced.mockReturnValue(false);
    vi.useFakeTimers();
    const { result } = renderHook(() => useTypewriterPlaceholder(PHRASES, true));
    expect(result.current).toBe('');
    step(TYPE_MS);
    expect(result.current).toBe('a');
    step(TYPE_MS);
    expect(result.current).toBe('ab');
    step(HOLD_MS - 1);
    expect(result.current).toBe('ab');
    step(1);
    expect(result.current).toBe('a');
    step(DELETE_MS);
    expect(result.current).toBe('');
    step(REST_MS - 1);
    expect(result.current).toBe('');
    step(1);
    expect(result.current).toBe('c');
    step(HOLD_MS);
    expect(result.current).toBe('');
    step(REST_MS);
    expect(result.current).toBe('a');
  });

  it('shows the first example statically under reduced motion', () => {
    mockReduced.mockReturnValue(true);
    vi.useFakeTimers();
    const { result } = renderHook(() => useTypewriterPlaceholder(PHRASES, true));
    expect(result.current).toBe('ab');
    step(HOLD_MS * 5);
    expect(result.current).toBe('ab');
  });

  it('treats unknown motion preference as reduced (server-safe)', () => {
    mockReduced.mockReturnValue(null);
    vi.useFakeTimers();
    const { result } = renderHook(() => useTypewriterPlaceholder(PHRASES, true));
    expect(result.current).toBe('ab');
  });

  it('goes blank when inactive or given no phrases', () => {
    mockReduced.mockReturnValue(false);
    vi.useFakeTimers();
    const on = renderHook(() => useTypewriterPlaceholder(PHRASES, true));
    step(TYPE_MS);
    expect(on.result.current).toBe('a');
    const off = renderHook(() => useTypewriterPlaceholder(PHRASES, false));
    expect(off.result.current).toBe('');
    const empty = renderHook(() => useTypewriterPlaceholder([], true));
    expect(empty.result.current).toBe('');
  });
});
