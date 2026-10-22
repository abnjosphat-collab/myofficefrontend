// components/ui-system/patterns/DataRegion.test.tsx — a retry that drags on says
// so: after 20 s of retrying the region adds "Still trying to reach the server"
// with a Try again button, while the retry loop underneath keeps going.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { DataRegion } from './DataRegion';

describe('DataRegion retry escalation', () => {
  afterEach(() => { vi.useRealTimers(); });

  it('stays quiet for the first 20 seconds of retrying, then says it is still trying', () => {
    vi.useFakeTimers();
    render(<DataRegion status="retrying" subject="work orders" onRetry={() => {}}>records</DataRegion>);
    expect(screen.queryByText('Still trying to reach the server.')).not.toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(19_999); });
    expect(screen.queryByText('Still trying to reach the server.')).not.toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(1); });
    expect(screen.getByText('Still trying to reach the server.')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeVisible();
  });

  it('runs the retry callback from the escalation button', () => {
    vi.useFakeTimers();
    const onRetry = vi.fn();
    render(<DataRegion status="retrying" subject="work orders" onRetry={onRetry}>records</DataRegion>);
    act(() => { vi.advanceTimersByTime(20_000); });
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('never escalates a plain first load, however long it takes', () => {
    vi.useFakeTimers();
    render(<DataRegion status="loading" subject="work orders" onRetry={() => {}}>records</DataRegion>);
    act(() => { vi.advanceTimersByTime(120_000); });
    expect(screen.queryByText('Still trying to reach the server.')).not.toBeInTheDocument();
  });

  it('drops the escalation as soon as retrying ends, and restarts the wait on the next retry', () => {
    vi.useFakeTimers();
    const view = render(<DataRegion status="retrying" subject="work orders" onRetry={() => {}}>records</DataRegion>);
    act(() => { vi.advanceTimersByTime(20_000); });
    expect(screen.getByText('Still trying to reach the server.')).toBeVisible();
    view.rerender(<DataRegion status="ready" subject="work orders" onRetry={() => {}}>records</DataRegion>);
    expect(screen.queryByText('Still trying to reach the server.')).not.toBeInTheDocument();
    view.rerender(<DataRegion status="retrying" subject="work orders" onRetry={() => {}}>records</DataRegion>);
    act(() => { vi.advanceTimersByTime(19_999); });
    expect(screen.queryByText('Still trying to reach the server.')).not.toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(1); });
    expect(screen.getByText('Still trying to reach the server.')).toBeVisible();
  });
});
