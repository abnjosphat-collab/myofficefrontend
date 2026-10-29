// CheckMark with full motion (real framer module, OS not asking): the tick
// draws on and off through pathLength, and the indeterminate dash scales
// from the centre. Separate file: framer's OS-preference listener is a
// module singleton.
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('framer-motion', async (importOriginal) => {
  return await importOriginal<typeof import('framer-motion')>();
});

import { CheckMark } from './CheckMark';

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
  })),
});

describe('CheckMark (full motion)', () => {
  it('draws the tick through the motion path', () => {
    const { container, rerender } = render(<CheckMark checked={false} />);
    expect(container.querySelector('[data-testid="checkmark-tick"]')).toBeInTheDocument();
    rerender(<CheckMark checked />);
    expect(container.querySelector('[data-testid="checkmark"]')).toHaveAttribute('data-state', 'checked');
  });

  it('renders the motion dash for the indeterminate state', () => {
    const { container } = render(<CheckMark checked indeterminate />);
    expect(container.querySelector('[data-testid="checkmark"]')).toHaveAttribute('data-state', 'indeterminate');
    expect(container.querySelector('[data-testid="checkmark-dash"]')).toBeInTheDocument();
  });
});
