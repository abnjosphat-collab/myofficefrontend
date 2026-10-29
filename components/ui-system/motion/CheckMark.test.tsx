// CheckMark under reduced motion (the global setup mock): the tick shows
// instantly when checked, hides when unchecked, and the indeterminate dash
// renders statically. No transform ever runs.
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CheckMark } from './CheckMark';

describe('CheckMark (reduced motion)', () => {
  it('shows the static tick when checked', () => {
    const { container } = render(<CheckMark checked />);
    expect(container.querySelector('[data-testid="checkmark"]')).toHaveAttribute('data-state', 'checked');
    expect(container.querySelector('[data-testid="checkmark-tick"]')).toBeInTheDocument();
  });

  it('renders no tick when unchecked', () => {
    const { container } = render(<CheckMark checked={false} />);
    expect(container.querySelector('[data-testid="checkmark"]')).toHaveAttribute('data-state', 'unchecked');
    expect(container.querySelector('[data-testid="checkmark-tick"]')).not.toBeInTheDocument();
  });

  it('renders the static dash when indeterminate', () => {
    const { container } = render(<CheckMark checked={false} indeterminate />);
    expect(container.querySelector('[data-testid="checkmark"]')).toHaveAttribute('data-state', 'indeterminate');
  });

  it('is decorative: hidden from assistive technology', () => {
    const { container } = render(<CheckMark checked />);
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });
});
