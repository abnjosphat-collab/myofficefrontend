// ToastSetup with full motion (real framer module, OS not asking): the
// error icon's mount gate bumps the trigger once, so the wiggle wrapper
// renders. Separate file: framer's OS-preference listener is a module
// singleton.
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('framer-motion', async (importOriginal) => {
  return await importOriginal<typeof import('framer-motion')>();
});

import { ToastErrorIcon } from './ToastSetup';

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

describe('ToastSetup (full motion)', () => {
  it('error icon carries the wiggle meaning after its mount gate', () => {
    const { container } = render(<ToastErrorIcon />);
    expect(container.querySelector('[data-motion-effect="wiggle"]')).toBeInTheDocument();
  });
});
