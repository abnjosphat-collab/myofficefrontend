// useMediaQuery: the real value when matchMedia exists, the server value
// when the environment has none (tests that do not mock it).
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useMediaQuery } from './useMediaQuery';

const mockMedia = (matches: boolean) =>
  vi.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
  }));

describe('useMediaQuery', () => {
  it('reads the query when matchMedia exists', () => {
    Object.defineProperty(window, 'matchMedia', { writable: true, value: mockMedia(true) });
    expect(renderHook(() => useMediaQuery('(min-width: 1px)')).result.current).toBe(true);
  });

  it('falls back to the server value without matchMedia', () => {
    Object.defineProperty(window, 'matchMedia', { writable: true, value: undefined });
    expect(renderHook(() => useMediaQuery('(min-width: 1px)', true)).result.current).toBe(true);
    expect(renderHook(() => useMediaQuery('(min-width: 1px)')).result.current).toBe(false);
  });
});
