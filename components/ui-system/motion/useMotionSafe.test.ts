// useMotionSafe under reduced motion (the global setup mock reports reduce):
// every preset collapses to FADE.
import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FADE, SPRING } from './presets';
import { useIsReducedMotion, useMotionSafe } from './useMotionSafe';

describe('useMotionSafe (reduced motion)', () => {
  it('reports reduced motion', () => {
    expect(renderHook(() => useIsReducedMotion()).result.current).toBe(true);
  });

  it('returns FADE for the default preset', () => {
    expect(renderHook(() => useMotionSafe()).result.current).toBe(FADE);
  });

  it('returns FADE for an explicit preset', () => {
    expect(renderHook(() => useMotionSafe(SPRING.gentle)).result.current).toBe(FADE);
  });
});
