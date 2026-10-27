import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UpdatedCaption } from './UpdatedCaption';

describe('UpdatedCaption', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-27T10:00:00Z'));
  });
  afterEach(() => vi.useRealTimers());

  it('renders nothing before the first success', () => {
    const { container } = render(<p>3 records<UpdatedCaption at={null} /></p>);
    expect(container.textContent).toBe('3 records');
  });

  it('reads the relative time off the last success', () => {
    render(<p>3 records<UpdatedCaption at={new Date('2026-10-27T09:58:00Z')} /></p>);
    expect(screen.getByText(/Updated 2 min ago/)).toBeInTheDocument();
  });

  it('stays honest as time passes', () => {
    render(<p>3 records<UpdatedCaption at={new Date('2026-10-27T10:00:00Z')} /></p>);
    expect(screen.getByText(/Updated just now/)).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(30_000); });
    screen.getByText(/Updated just now/);
    act(() => { vi.advanceTimersByTime(70_000); });
    screen.getByText(/Updated 1 min ago/);
  });
});
