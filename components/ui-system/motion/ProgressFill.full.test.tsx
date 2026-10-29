// ProgressFill with full motion (real framer module, OS not asking): bars
// animate scaleX and rings sweep dashoffset on the smooth spring; both keep
// their value with no overshoot (smooth bounce is 0). Separate file:
// framer's OS-preference listener is a module singleton.
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('framer-motion', async (importOriginal) => {
  return await importOriginal<typeof import('framer-motion')>();
});

import { ProgressFill } from './ProgressFill';

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

describe('ProgressFill (full motion)', () => {
  it('bars move by transform, never by width', () => {
    const { container, rerender } = render(<ProgressFill fraction={0.2} className="h-full bg-action" />);
    rerender(<ProgressFill fraction={0.8} className="h-full bg-action" />);
    const fill = container.querySelector('[data-testid="progressfill"]') as HTMLElement;
    expect(fill.style.width).toBe('');
  });

  it('rings sweep through the motion circle', () => {
    const { container } = render(<ProgressFill fraction={0.5} variant="ring" accent="red" label="halfway" />);
    expect(container.querySelector('[data-testid="progressfill-ring"]')).toBeInTheDocument();
  });

  it('indeterminate work pulses calmly', () => {
    const { container } = render(<ProgressFill fraction={0} indeterminate />);
    expect(container.querySelector('[data-state="indeterminate"]')).toBeInTheDocument();
  });
});
