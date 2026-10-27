// AnimatedIcon under reduced motion (the global setup mock): every effect
// renders statically — no transform anywhere — and discrete effects never
// fire on mount.
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AnimatedIcon, type AnimatedIconEffect } from './AnimatedIcon';

const EFFECTS: AnimatedIconEffect[] = ['bounce', 'wiggle', 'pulse', 'rotate', 'scale', 'connecting', 'appear', 'disappear'];

describe('AnimatedIcon (reduced motion)', () => {
  it.each(EFFECTS)('renders the %s effect with no transform', (effect) => {
    const { container, rerender } = render(
      <AnimatedIcon name="bell" effect={effect} trigger={1} active />,
    );
    rerender(<AnimatedIcon name="bell" effect={effect} trigger={2} active />);
    for (const el of container.querySelectorAll('*')) {
      expect((el as HTMLElement).style.transform, effect).toBe('');
    }
  });

  it('renders the connecting bars statically', () => {
    const { container } = render(<AnimatedIcon name="sync" effect="connecting" active />);
    expect(container.querySelector('[data-testid="connecting-bars"]')).toBeInTheDocument();
    expect(container.querySelectorAll('rect').length).toBe(3);
  });

  it('renders scale unscaled (callers convey selection statically)', () => {
    const { container } = render(<AnimatedIcon name="check" effect="scale" active />);
    expect(container.firstElementChild?.tagName).toBe('svg');
  });

  it('clamps a non-finite repeat to a single play', () => {
    const { container } = render(<AnimatedIcon name="bell" effect="bounce" trigger={1} repeat={Infinity} />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('passes a label through as the accessible name', () => {
    render(<AnimatedIcon name="bell" effect="pulse" active label="Syncing" />);
    expect(screen.getByRole('img', { name: 'Syncing' })).toBeInTheDocument();
  });
});
