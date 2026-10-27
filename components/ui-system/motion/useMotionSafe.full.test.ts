// useMotionSafe with full motion (real framer module, OS not asking):
// the preset passes through. Separate file: framer's OS-preference listener
// is a module singleton initialised once per file.
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('framer-motion', async (importOriginal) => {
  return await importOriginal<typeof import('framer-motion')>();
});

import { SPRING } from './presets';
import { useIsReducedMotion, useMotionSafe } from './useMotionSafe';

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
  })),
});

describe('useMotionSafe (full motion)', () => {
  it('reports full motion', () => {
    expect(renderHook(() => useIsReducedMotion()).result.current).toBe(false);
  });

  it('returns the smooth preset by default', () => {
    expect(renderHook(() => useMotionSafe()).result.current).toBe(SPRING.smooth);
  });

  it('returns an explicit preset', () => {
    expect(renderHook(() => useMotionSafe(SPRING.snappy)).result.current).toBe(SPRING.snappy);
  });
});
