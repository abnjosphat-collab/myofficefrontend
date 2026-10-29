// Floor motion off framer (B4s4): Slab is a plain div, CountUp is the shared
// NumberTransition (in place under the reduced-motion setup), the ring is the shared
// ProgressFill ring (plain circle under reduced motion), animated text is plain, fan is SVG.
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AnimatedText, CountUp, Fan, Ring, Slab } from './motion';

describe('floor motion (reduced motion)', () => {
  it('renders the slab as a plain div that still takes clicks', () => {
    let clicks = 0;
    const { container } = render(<Slab role="button" tabIndex={0} onClick={() => { clicks += 1; }}>Body</Slab>);
    const slab = container.firstElementChild as HTMLElement;
    expect(slab.tagName).toBe('DIV');
    slab.click();
    expect(clicks).toBe(1);
    expect(screen.getByText('Body')).toBeInTheDocument();
  });

  it('counts with the shared number transition and shows a dash when missing', () => {
    const { container, rerender } = render(<CountUp value={120.5} decimals={1} />);
    expect(container.querySelector('.sr-only')).toHaveTextContent('120.5');
    rerender(<CountUp value={null} />);
    expect(container.querySelector('.sr-only')).toHaveTextContent('Not available');
    expect(container.textContent).toContain('—');
    rerender(<CountUp value={7} suffix=" h" />);
    expect(container.querySelector('.sr-only')).toHaveTextContent('7 h');
  });

  it('sweeps the ring through the shared ProgressFill ring, no own timing', () => {
    const { container } = render(<Ring fraction={0.5} accent="var(--mo-success)" label="Half to service">50%</Ring>);
    expect(container.querySelector('[data-testid="progressfill"][data-variant="ring"]')).toBeInTheDocument();
    const fill = container.querySelectorAll('circle')[1] as unknown as SVGCircleElement;
    expect(fill.getAttribute('stroke')).toBe('var(--mo-success)');
    // r = (64 - 6) / 2, half swept: dashoffset is half the circumference.
    expect(parseFloat(fill.getAttribute('stroke-dashoffset') ?? 'NaN')).toBeCloseTo(2 * Math.PI * 29 * 0.5, 3);
    expect(fill.style.transition).toBe('');
    expect(screen.getByRole('img', { name: 'Half to service' })).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('keeps animated text whole and still', () => {
    render(<AnimatedText as="h2" text="Fleet running" />);
    expect(screen.getByRole('heading', { name: 'Fleet running' })).toBeInTheDocument();
  });

  it('renders the fan as a still SVG', () => {
    const { container } = render(<Fan running size={20} />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });
});