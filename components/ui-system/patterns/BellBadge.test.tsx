import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BellBadge, bellBadgeTone } from './BellBadge';

describe('bellBadgeTone', () => {
  it('is dark green normally, red only when urgent', () => {
    expect(bellBadgeTone(false)).toBe('brand');
    expect(bellBadgeTone(true)).toBe('danger');
  });
});

describe('BellBadge', () => {
  it('renders the value in dark green when nothing is urgent', () => {
    render(<BellBadge value={2} urgent={false} />);
    // The rolling number: screen readers hear the final value once, sighted
    // users see the strip. (Reduced test mode: the value changes in place.)
    expect(screen.getByText('2', { selector: '.sr-only' })).toBeInTheDocument();
    const visible = screen.getByText('2', { selector: '[aria-hidden="true"]' });
    expect(visible.closest('span[class*="bg-action"]')).not.toBeNull();
  });

  it('renders the value in red when something is overdue or critical', () => {
    render(<BellBadge value={2} urgent />);
    const visible = screen.getByText('2', { selector: '[aria-hidden="true"]' });
    expect(visible.closest('span[class*="bg-danger"]')).not.toBeNull();
  });

  it('caps a large value at 9+', () => {
    render(<BellBadge value={12} urgent={false} />);
    expect(screen.getByText('9+', { selector: '.sr-only' })).toBeInTheDocument();
    expect(screen.getByText('9+', { selector: '[aria-hidden="true"]' })).toBeInTheDocument();
  });
});
