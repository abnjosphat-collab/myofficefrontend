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
    expect(screen.getByText('2').className).toContain('bg-action');
  });

  it('renders the value in red when something is overdue or critical', () => {
    render(<BellBadge value={2} urgent />);
    expect(screen.getByText('2').className).toContain('bg-danger');
  });

  it('caps a large value at 9+', () => {
    render(<BellBadge value={12} urgent={false} />);
    expect(screen.getByText('9+')).toBeInTheDocument();
  });
});
