// Floor motion with full motion (real framer module): animated text crossfades
// whole through Presence (no per-word spans), and CountUp rolls digit columns.
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('framer-motion', async (importOriginal) => {
  return await importOriginal<typeof import('framer-motion')>();
});

import { AnimatedText, CountUp } from './motion';

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

describe('floor motion (full motion)', () => {
  it('crossfades animated text whole, with no per-word spans', () => {
    const { container } = render(<AnimatedText text="Fleet running now" />);
    expect(screen.getByText('Fleet running now')).toBeInTheDocument();
    expect(container.querySelectorAll('[aria-hidden="true"] span')).toHaveLength(0);
    expect(container.querySelector('.sr-only')).toBeNull();
  });
  it('rolls count digits in columns', () => {
    const { container } = render(<CountUp value={12} />);
    expect(container.querySelector('.sr-only')).toHaveTextContent('12');
    expect(container.querySelector('[aria-hidden="true"]')).toBeInTheDocument();
  });
});