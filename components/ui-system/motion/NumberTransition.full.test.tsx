// NumberTransition with full motion (real framer module, OS not asking):
// digit columns roll on motion values and React still commits exactly once
// per value change. Separate file: framer's OS-preference listener is a
// module singleton.
import { Profiler, type ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('framer-motion', async (importOriginal) => {
  return await importOriginal<typeof import('framer-motion')>();
});

import { NumberTransition } from './NumberTransition';

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

function profiled(node: ReactNode, phases: string[]) {
  return (
    <Profiler id="number-transition" onRender={(_id, phase) => { phases.push(phase); }}>
      {node}
    </Profiler>
  );
}

describe('NumberTransition (full motion)', () => {
  it('rolls digit columns without re-rendering per frame', async () => {
    const phases: string[] = [];
    const { container, rerender } = render(profiled(<NumberTransition value={0} />, phases));
    expect(phases).toEqual(['mount']);
    // One column per digit; the ones column is stable across the change.
    expect(container.querySelectorAll('.flex-col').length).toBe(1);
    rerender(profiled(<NumberTransition value={42} />, phases));
    expect(container.querySelectorAll('.flex-col').length).toBe(2);
    expect(screen.getByLabelText('42')).toBeInTheDocument();
    // Let the roll settle: no further commits means no per-frame setState.
    await new Promise(resolve => setTimeout(resolve, 700));
    expect(phases).toEqual(['mount', 'update']);
  });
});
