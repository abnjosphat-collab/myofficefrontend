// MetricTile motion (B4): numeric values roll digit by digit; anything else
// renders as before. The selected ring is a colour fade, never a scale.
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MetricTile } from './MetricTile';

describe('MetricTile motion', () => {
  it('rolls a numeric value (in place under reduced motion)', () => {
    const { rerender } = render(<MetricTile label="Open" value={3} />);
    expect(screen.getByText('3', { selector: '.sr-only' })).toBeInTheDocument();
    rerender(<MetricTile label="Open" value={4} />);
    expect(screen.getByText('4', { selector: '.sr-only' })).toBeInTheDocument();
    expect(screen.queryByText('3', { selector: '.sr-only' })).not.toBeInTheDocument();
  });

  it('leaves non-numeric values static', () => {
    const { container } = render(<MetricTile label="State" value="—" />);
    expect(container.querySelector('.sr-only')).toBeNull();
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('fades the selected ring instead of scaling', () => {
    const { container, rerender } = render(<MetricTile label="Open" value={3} selected={false} />);
    const tile = container.firstElementChild as HTMLElement;
    expect(tile.className).toContain('transition-colors');
    expect(tile.className).toContain('duration-[var(--mo-duration-base)]');
    expect(tile.className).toContain('border-line-subtle');
    rerender(<MetricTile label="Open" value={3} selected />);
    expect(tile.className).toContain('border-action');
    expect(tile.style.transform).toBe('');
  });

  it('still shows the skeleton while loading and Unavailable on failure', () => {
    const { container, rerender } = render(<MetricTile label="Open" value={3} loading />);
    expect(container.querySelector('.sr-only')).toBeNull();
    rerender(<MetricTile label="Open" value={3} unavailable />);
    expect(screen.getByText('Unavailable')).toBeInTheDocument();
  });
});
