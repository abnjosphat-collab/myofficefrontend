// Drawer with full motion on a coarse pointer (real framer module): the
// panel is draggable. Separate file: framer's OS-preference listener is a
// module singleton.
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('framer-motion', async (importOriginal) => {
  return await importOriginal<typeof import('framer-motion')>();
});

import { Drawer } from './Drawer';

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: query.includes('pointer: coarse'),
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
  })),
});

describe('Drawer (full motion, coarse pointer)', () => {
  it('renders a draggable panel', () => {
    render(<Drawer open onOpenChange={() => {}} title="Work order"><p>Details.</p></Drawer>);
    expect(screen.getByRole('dialog', { name: 'Work order' })).toBeInTheDocument();
    expect(document.querySelector('[data-motion="drag-x"]')).toBeInTheDocument();
  });
});
