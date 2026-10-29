// ProgressFill under reduced motion (the global setup mock): values sit in
// place (transform, never width), nothing pulses, rings render statically.
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProgressFill } from './ProgressFill';

describe('ProgressFill (reduced motion)', () => {
  it('bars sit at the value with a left-origin transform, never a width', () => {
    const { container } = render(<ProgressFill fraction={0.5} className="h-full rounded-full bg-action" />);
    const fill = container.querySelector('[data-testid="progressfill"]') as HTMLElement;
    expect(fill).toHaveAttribute('data-variant', 'bar');
    expect(fill.style.transform).toContain('scaleX(0.5)');
    expect(fill.style.width).toBe('');
  });

  it('rings render statically at the value', () => {
    const { container } = render(<ProgressFill fraction={0.25} variant="ring" accent="red" label="25% of the way" />);
    expect(container.querySelector('[data-testid="progressfill"]')).toHaveAttribute('aria-label', '25% of the way');
  });

  it('indeterminate work renders without pulsing', () => {
    const { container } = render(<ProgressFill fraction={0} indeterminate />);
    expect(container.querySelector('[data-testid="progressfill"]')).toBeInTheDocument();
  });
});
