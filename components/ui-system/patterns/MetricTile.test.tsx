// MetricTile motion (B4): numeric values roll digit by digit; anything else
// renders as before. The selected ring is a colour fade, never a scale.
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MetricGrid, MetricTile } from './MetricTile';

describe('MetricTile motion', () => {
  it('rolls a numeric value (in place under reduced motion)', () => {
    const { container, rerender } = render(<MetricTile label="Open" value={3} />);
    // The tile's own screen-reader value leads; the roll beneath is visuals only.
    const announcing = () => container.querySelector('.sr-only');
    expect(announcing()).toHaveTextContent('3');
    expect(container.querySelector('[aria-hidden="true"]')).toBeInTheDocument();
    rerender(<MetricTile label="Open" value={4} />);
    expect(announcing()).toHaveTextContent('4');
    expect(screen.queryByText('3')).not.toBeInTheDocument();
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

  it('snaps tile rows sideways on phones (CSS only, no transforms)', () => {
    const { container } = render(<MetricGrid><MetricTile label="Open" value={3} /><MetricTile label="Done" value={4} /></MetricGrid>);
    const strip = container.firstElementChild as HTMLElement;
    expect(strip.className).toContain('max-sm:snap-x');
    expect(strip.className).toContain('max-sm:overflow-x-auto');
    expect(strip.className).toContain('[&>*]:max-sm:snap-start');
    expect(strip.style.transform).toBe('');
  });

  it('still shows the skeleton while loading and Unavailable on failure', () => {
    const { container, rerender } = render(<MetricTile label="Open" value={3} loading />);
    expect(container.querySelector('.sr-only')).toBeNull();
    rerender(<MetricTile label="Open" value={3} unavailable />);
    expect(screen.getByText('Unavailable')).toBeInTheDocument();
  });
});
