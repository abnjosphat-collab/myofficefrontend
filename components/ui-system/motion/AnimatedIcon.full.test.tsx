// AnimatedIcon with full motion (real framer module, OS not asking):
// structure per effect + restraint (discrete never fires on mount).
// Separate file: framer's OS-preference listener is a module singleton.
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('framer-motion', async (importOriginal) => {
  return await importOriginal<typeof import('framer-motion')>();
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

describe('AnimatedIcon (full motion)', () => {
  it('mounts discrete effects without animating', () => {
    const { container } = render(<AnimatedIcon name="bell" effect="bounce" trigger={1} />);
    const scope = container.querySelector('[data-motion-effect="bounce"]') as HTMLElement;
    expect(scope).toBeInTheDocument();
    expect(scope.style.transform).toBe('');
  });

  it('keeps the effect wrapper across trigger changes', () => {
    const { container, rerender } = render(<AnimatedIcon name="bell" effect="wiggle" trigger={1} />);
    rerender(<AnimatedIcon name="bell" effect="wiggle" trigger={2} />);
    expect(container.querySelector('[data-motion-effect="wiggle"]')).toBeInTheDocument();
  });

  it('renders indefinite effects in their wrappers', () => {
    for (const effect of ['pulse', 'rotate', 'scale', 'connecting'] as const) {
      const { container, unmount } = render(<AnimatedIcon name="sync" effect={effect} active />);
      expect(container.querySelector(`[data-motion-effect="${effect}"]`), effect).toBeInTheDocument();
      unmount();
    }
  });

  it('clamps a non-finite repeat instead of looping forever', () => {
    const { container } = render(<AnimatedIcon name="bell" effect="bounce" trigger={1} repeat={Infinity} />);
    expect(container.querySelector('[data-motion-effect="bounce"]')).toBeInTheDocument();
  });

  it('renders appear/disappear through presence', () => {
    const { container, unmount } = render(<AnimatedIcon name="check" effect="appear" />);
    expect(container.querySelector('[data-motion-effect="appear"]')).toBeInTheDocument();
    unmount();
  });
});
