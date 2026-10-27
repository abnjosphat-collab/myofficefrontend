// AnimatedIcon firing discipline (real framer module, OS not asking): a
// discrete effect starts no animation on mount — including a StrictMode
// double-invoked mount — and fires exactly when its trigger changes.
// Separate file: the framer mock counts animation starts.
import { StrictMode } from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

let starts = 0;
vi.mock('framer-motion', async (importOriginal) => {
  const orig = await importOriginal<typeof import('framer-motion')>();
  const useAnimate: typeof orig.useAnimate = (...args) => {
    const [scope, animate] = orig.useAnimate(...args);
    const counted = ((...animateArgs: unknown[]) => {
      starts += 1;
      return (animate as (...call: unknown[]) => unknown)(...animateArgs);
    }) as unknown as typeof animate;
    return [scope, counted];
  };
  return { ...orig, useAnimate };
});

import { AnimatedIcon } from './AnimatedIcon';

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

describe('AnimatedIcon firing discipline', () => {
  it('starts nothing on mount, even under StrictMode', () => {
    starts = 0;
    const { unmount } = render(
      <StrictMode>
        <AnimatedIcon name="bell" effect="bounce" trigger={1} />
      </StrictMode>,
    );
    expect(starts).toBe(0);
    unmount();
  });

  it('fires when the trigger changes', () => {
    starts = 0;
    const { rerender, unmount } = render(<AnimatedIcon name="bell" effect="bounce" trigger={1} />);
    expect(starts).toBe(0);
    rerender(<AnimatedIcon name="bell" effect="bounce" trigger={2} />);
    expect(starts).toBeGreaterThan(0);
    unmount();
  });
});
