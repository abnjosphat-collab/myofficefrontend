// NumberTransition under reduced motion (the global setup mock): the value
// changes in place, screen readers hear the final value only, and React
// commits exactly once per value change (never per frame).
import { Profiler, type ReactNode } from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { NumberTransition } from './NumberTransition';

/** Commit phases observed through a React Profiler around the component. */
function profiled(node: ReactNode, phases: string[]) {
  return (
    <Profiler id="number-transition" onRender={(_id, phase) => { phases.push(phase); }}>
      {node}
    </Profiler>
  );
}

describe('NumberTransition (reduced motion)', () => {
  it('announces only the final value', () => {
    const { container, rerender } = render(<NumberTransition value={41} />);
    expect(container.querySelector('.sr-only')).toHaveTextContent('41');
    expect(container.querySelector('[aria-hidden="true"]')).toBeInTheDocument();
    rerender(<NumberTransition value={42} />);
    expect(container.querySelector('.sr-only')).toHaveTextContent('42');
  });

  it('formats decimals, sign, prefix and suffix', () => {
    const { container, rerender } = render(<NumberTransition value={1960} decimals={1} />);
    expect(container.querySelector('.sr-only')).toHaveTextContent('1960.0');
    rerender(<NumberTransition value={-3.5} decimals={1} prefix="Δ" suffix="%" />);
    expect(container.querySelector('.sr-only')).toHaveTextContent('-Δ3.5%');
  });

  it('renders non-finite values as not available', () => {
    const { container } = render(<NumberTransition value={Number.NaN} />);
    expect(container.querySelector('.sr-only')).toHaveTextContent('Not available');
  });

  it('honours an explicit screen-reader label', () => {
    const { container } = render(<NumberTransition value={5} label="5 of 12 records" />);
    expect(container.querySelector('.sr-only')).toHaveTextContent('5 of 12 records');
  });

  it('commits once per value change, never per frame', async () => {
    const phases: string[] = [];
    const { rerender } = render(profiled(<NumberTransition value={0} />, phases));
    // Mount settles once (SSR match, then the real setting) - not a frame.
    expect(phases).toEqual(['mount', 'update']);
    rerender(profiled(<NumberTransition value={12345} />, phases));
    await new Promise(resolve => setTimeout(resolve, 700));
    // Exactly one more commit for the value change, then silence: no per-frame work.
    expect(phases).toEqual(['mount', 'update', 'update']);
  });
});
