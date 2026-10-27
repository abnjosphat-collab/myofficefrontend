// Drawer under reduced motion (the global setup mock): the edge slide is a
// plain panel — drag is off — on the gentle spring token.
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Drawer } from './Drawer';

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

describe('Drawer (reduced motion)', () => {
  it('renders the panel with no drag and no transform', () => {
    render(<Drawer open onOpenChange={() => {}} title="Work order"><p>Details.</p></Drawer>);
    expect(screen.getByRole('dialog', { name: 'Work order' })).toBeInTheDocument();
    expect(document.querySelector('[data-motion="drag-x"]')).not.toBeInTheDocument();
    const panel = screen.getByRole('dialog', { name: 'Work order' });
    expect(panel.style.transform).toBe('');
  });

  it('slides on the gentle spring token', () => {
    render(<Drawer open onOpenChange={() => {}} title="Work order"><p>Details.</p></Drawer>);
    const panel = screen.getByRole('dialog', { name: 'Work order' });
    expect(panel.className).toContain('duration-[var(--mo-spring-gentle-duration)]');
    expect(panel.className).toContain('ease-spring-gentle');
  });
});
