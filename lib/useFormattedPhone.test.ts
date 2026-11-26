// lib/useFormattedPhone.test.ts — the hook behind FormattedPhoneField:
// live formatting while typing, the digit cap, caret mapping, the blur
// commit, external value changes, and the immediate-read guarantee the
// render-to-effect ref sync must not break (a commit landing in the same
// batch as the last keystroke still reads the latest text).
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { mapCaretThroughFormat, useFormattedPhoneField } from './useFormattedPhone';

function setup(initial = '') {
  const onChange = vi.fn();
  const view = renderHook(
    ({ value }: { value: string }) => useFormattedPhoneField({ value, onChange }),
    { initialProps: { value: initial } },
  );
  return { onChange, ...view };
}

describe('mapCaretThroughFormat', () => {
  it('never invents a position', () => {
    expect(mapCaretThroughFormat('+263 77', '077', null)).toBeNull();
  });

  it('keeps the caret after the same digit through grouping', () => {
    // After "077" (3 digits) the formatted "+263 77 8" caret sits after digit 3 of the national part.
    expect(mapCaretThroughFormat('+263 77', '+26377', 6)).toBe(7);
    // A caret past the raw text clamps to it; with no digits seen it stays there.
    expect(mapCaretThroughFormat('+263 77 8973 142', 'x', 99)).toBe(1);
  });
});

describe('useFormattedPhoneField', () => {
  it('formats progressively through rapid appends', () => {
    const { result, onChange } = setup();
    for (const raw of ['0', '07', '077', '0778', '07789', '077897', '0778973', '07789731', '077897314', '0778973142']) {
      act(() => { result.current.handleChange(raw); });
    }
    expect(result.current.display).toBe('+263 77 8973 142');
    expect(onChange).toHaveBeenLastCalledWith('+263 77 8973 142');
  });

  it('refuses digits past the cap while typing', () => {
    const { result } = setup();
    act(() => { result.current.handleChange('0778973142'); });
    act(() => { result.current.handleChange('+263 77 8973 1425'); });
    expect(result.current.display).toBe('+263 77 8973 142');
  });

  it('commits canonical on blur and reports no error', () => {
    const { result, onChange } = setup();
    act(() => { result.current.handleChange('0778973142'); });
    let verdict: string | null = 'unset';
    act(() => { verdict = result.current.handleBlur(); });
    expect(verdict).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.display).toBe('+263 77 8973 142');
    expect(onChange).toHaveBeenLastCalledWith('+263 77 8973 142');
  });

  it('reads the latest text when commit lands in the same batch as the edit', () => {
    const { result } = setup();
    let verdict: string | null = null;
    act(() => {
      result.current.handleChange('call office');
      verdict = result.current.handleBlur();
    });
    // Without the handler-side ref update this read the stale '' and passed silently.
    expect(verdict).toContain('call office');
    expect(result.current.error).toContain('call office');
  });

  it('follows external value changes and clears the error', () => {
    const { result, rerender } = setup('0771112223');
    act(() => { result.current.handleChange('nope'); });
    act(() => { result.current.handleBlur(); });
    expect(result.current.error).not.toBeNull();
    rerender({ value: '+263 78 5555 444' });
    expect(result.current.display).toBe('+263 78 5555 444');
    expect(result.current.error).toBeNull();
  });

  it('ignores echoes of its own commits', () => {
    const { result, rerender } = setup();
    act(() => { result.current.handleChange('0778973142'); });
    rerender({ value: '+263 77 8973 142' });
    expect(result.current.display).toBe('+263 77 8973 142');
    expect(result.current.error).toBeNull();
  });
});
