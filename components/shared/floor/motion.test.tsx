// Floor motion off framer (B4s4): Slab is a plain div, CountUp is the shared
// NumberTransition (in place under the reduced-motion setup), the ring is a
// plain circle sweeping on the gentle token, animated text is plain, fan is SVG.
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

  it('sweeps the ring with a CSS transition on the gentle token, no transform', () => {
    const { container } = render(<Ring fraction={0.5} accent="var(--mo-success)" label="Half to service">50%</Ring>);
    const fill = container.querySelectorAll('circle')[1] as unknown as SVGCircleElement;
    expect(fill.style.transition).toContain('var(--mo-spring-gentle-duration)');
    expect(fill.style.transition).toContain('var(--mo-spring-gentle)');
    expect(screen.getByRole('img', { name: 'Half to service' })).toBeInTheDocument();
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
