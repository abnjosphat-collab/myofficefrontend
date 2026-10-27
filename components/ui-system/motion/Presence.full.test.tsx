// Presence/MotionList with full motion (real framer module, OS not asking):
// enter/exit wrappers mount settled (no cascade on first paint) and the
// fade-only variant skips the rise and the collapse.
// Separate file: framer's OS-preference listener is a module singleton.
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('framer-motion', async (importOriginal) => {
  return await importOriginal<typeof import('framer-motion')>();
});

import { MotionList, MotionListItem, Presence } from './Presence';

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

describe('Presence/MotionList (full motion)', () => {
  it('mounts settled with no first-paint cascade', () => {
    const { container } = render(
      <MotionList>
        <MotionListItem key={1}><p>Row 1</p></MotionListItem>
        <Presence visible><p>Bar</p></Presence>
      </MotionList>,
    );
    expect(container.querySelector('[data-testid="motion-list-item"]')).toBeInTheDocument();
    expect(container.querySelector('[data-testid="motion-presence"]')).toBeInTheDocument();
    // initial={false}: no enter animation ran, so every node is settled.
    for (const el of container.querySelectorAll('[data-testid="motion-list-item"], [data-testid="motion-presence"]')) {
      expect(['', 'none']).toContain((el as HTMLElement).style.transform);
    }
  });

  it('offers a fade-only variant for table rows', () => {
    const { container } = render(
      <MotionList>
        <MotionListItem key={1} collapse={false}><p>Cell row</p></MotionListItem>
      </MotionList>,
    );
    const item = container.querySelector('[data-testid="motion-list-item"]') as HTMLElement;
    expect(item).toBeInTheDocument();
    expect(item.style.overflow).toBe('');
  });

  it('clamps collapsing rows for the height exit', () => {
    const { container } = render(
      <MotionList>
        <MotionListItem key={1}><p>Card</p></MotionListItem>
      </MotionList>,
    );
    const item = container.querySelector('[data-testid="motion-list-item"]') as HTMLElement;
    expect(item.style.overflow).toBe('hidden');
  });
});
