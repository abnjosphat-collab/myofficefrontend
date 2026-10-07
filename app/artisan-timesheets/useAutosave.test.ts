// app/artisan-timesheets/useAutosave.test.ts — the timer fires once the draft
// settles, restarts on every edit, and stays quiet when clean, busy or paused.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { AUTOSAVE_DELAY_MS, useAutosave } from './useAutosave';

describe('useAutosave', () => {
  afterEach(() => { vi.useRealTimers(); });

  it('saves once the draft sits unchanged past the delay', () => {
    vi.useFakeTimers();
    const onSave = vi.fn();
    const { rerender } = renderHook(
      ({ draft, dirty, busy, paused }: { draft: unknown; dirty: boolean; busy: boolean; paused: boolean }) => useAutosave({ draft, dirty, busy, paused, onSave, delayMs: 1000 }),
      { initialProps: { draft: null as unknown, dirty: false, busy: false, paused: false } },
    );
    rerender({ draft: { day: 1 }, dirty: true, busy: false, paused: false });
    vi.advanceTimersByTime(999);
    expect(onSave).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('restarts the timer on every edit and uses the default delay', () => {
    vi.useFakeTimers();
    const onSave = vi.fn();
    const { rerender } = renderHook(
      ({ draft }: { draft: unknown }) => useAutosave({ draft, dirty: true, busy: false, paused: false, onSave }),
      { initialProps: { draft: { day: 1 } } },
    );
    vi.advanceTimersByTime(AUTOSAVE_DELAY_MS - 1);
    rerender({ draft: { day: 2 } }); // another keystroke just before the timer
    vi.advanceTimersByTime(AUTOSAVE_DELAY_MS - 1);
    expect(onSave).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('stays quiet when clean, busy or paused', () => {
    vi.useFakeTimers();
    const onSave = vi.fn();
    const { rerender } = renderHook(
      ({ dirty, busy, paused }: { dirty: boolean; busy: boolean; paused: boolean }) => useAutosave({ draft: { day: 1 }, dirty, busy, paused, onSave, delayMs: 1000 }),
      { initialProps: { dirty: false, busy: false, paused: false } },
    );
    vi.advanceTimersByTime(5000);
    rerender({ dirty: true, busy: true, paused: false });
    vi.advanceTimersByTime(5000);
    rerender({ dirty: true, busy: false, paused: true });
    vi.advanceTimersByTime(5000);
    expect(onSave).not.toHaveBeenCalled();
  });
});
