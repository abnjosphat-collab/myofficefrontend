// IconSwap with full motion (real framer module, OS not asking): the swap
// mounts settled (no enter animation on first paint) and the name follows.
// Separate file: framer's OS-preference listener is a module singleton.
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('framer-motion', async (importOriginal) => {
  return await importOriginal<typeof import('framer-motion')>();
});

import { IconSwap } from './IconSwap';

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

describe('IconSwap (full motion)', () => {
  it('mounts settled and swaps the name with the state', () => {
    const { container, rerender } = render(
      <button type="button"><IconSwap from="copy" to="check" swapped={false} label="Copy" /></button>,
    );
    expect(container.querySelector('[data-motion-swap="replace"]')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy' })).toBeInTheDocument();
    rerender(
      <button type="button"><IconSwap from="copy" to="check" swapped label="Copied" /></button>,
    );
    expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument();
  });

  it('renders the slash overlay for slash pairs', () => {
    const { container } = render(
      <IconSwap from="show" to="hide" swapped slash label="Hide" />,
    );
    expect(container.querySelector('[data-motion-swap="slash"] line')).toBeInTheDocument();
  });
});
