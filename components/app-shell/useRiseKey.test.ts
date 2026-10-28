// useRiseKey: bumps on rises only — never on first paint, falls, or flats.
import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useRiseKey } from './useRiseKey';

describe('useRiseKey', () => {
  it('bumps only when the value rises', () => {
    const hook = renderHook(({ value }) => useRiseKey(value), { initialProps: { value: 3 } });
    expect(hook.result.current).toBe(0);
    hook.rerender({ value: 3 });
    expect(hook.result.current).toBe(0);
    hook.rerender({ value: 5 });
    expect(hook.result.current).toBe(1);
    hook.rerender({ value: 4 });
    expect(hook.result.current).toBe(1);
    hook.rerender({ value: 0 });
    expect(hook.result.current).toBe(1);
    hook.rerender({ value: 2 });
    expect(hook.result.current).toBe(2);
  });
});
