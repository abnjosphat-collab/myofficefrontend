// Floor motion with full motion (real framer module): animated text rises
// word by word on the CSS smooth token, and CountUp rolls digit columns.
import { render } from '@testing-library/react';
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
  it('rises animated text word by word with staggered delays', () => {
    const { container } = render(<AnimatedText text="Fleet running now" />);
    expect(container.querySelector('.sr-only')).toHaveTextContent('Fleet running now');
    const words = container.querySelectorAll('[aria-hidden="true"] span');
    expect(words).toHaveLength(3);
    expect((words[1] as HTMLElement).style.animationDelay).toBe('0.045s');
  });

  it('rolls count digits in columns', () => {
    const { container } = render(<CountUp value={12} />);
    expect(container.querySelector('.sr-only')).toHaveTextContent('12');
    expect(container.querySelector('[aria-hidden="true"]')).toBeInTheDocument();
  });
});
