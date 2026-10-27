// DrawerDragPanel under reduced motion (the global setup mock): a plain
// panel, never draggable.
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DrawerDragPanel } from './DrawerDragPanel';

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

describe('DrawerDragPanel (reduced motion)', () => {
  it('renders a plain panel with no drag and no transform', () => {
    const { container } = render(<DrawerDragPanel onDismiss={vi.fn()} className="panel"><p>Body</p></DrawerDragPanel>);
    expect(container.querySelector('[data-motion="drag-x"]')).not.toBeInTheDocument();
    expect(container.querySelector('.panel')).toBeInTheDocument();
    for (const el of container.querySelectorAll('*')) {
      expect((el as HTMLElement).style.transform).toBe('');
    }
  });
});
