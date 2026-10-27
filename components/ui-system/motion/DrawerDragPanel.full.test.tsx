// DrawerDragPanel with full motion (real framer module, OS not asking):
// draggable on coarse pointers, plain on fine ones. Separate file: framer's
// OS-preference listener is a module singleton.
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('framer-motion', async (importOriginal) => {
  return await importOriginal<typeof import('framer-motion')>();
});

import { DrawerDragPanel } from './DrawerDragPanel';

const matchMediaFor = (coarse: boolean) =>
  vi.fn().mockImplementation((query: string) => ({
    matches: coarse && query.includes('pointer: coarse'),
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
  }));

describe('DrawerDragPanel (full motion)', () => {
  it('is draggable on coarse pointers', () => {
    Object.defineProperty(window, 'matchMedia', { writable: true, value: matchMediaFor(true) });
    const { container } = render(<DrawerDragPanel onDismiss={vi.fn()}><p>Body</p></DrawerDragPanel>);
    expect(container.querySelector('[data-motion="drag-x"]')).toBeInTheDocument();
  });

  it('is plain on fine pointers', () => {
    Object.defineProperty(window, 'matchMedia', { writable: true, value: matchMediaFor(false) });
    const { container } = render(<DrawerDragPanel onDismiss={vi.fn()} className="panel"><p>Body</p></DrawerDragPanel>);
    expect(container.querySelector('[data-motion="drag-x"]')).not.toBeInTheDocument();
    expect(container.querySelector('.panel')).toBeInTheDocument();
  });
});
