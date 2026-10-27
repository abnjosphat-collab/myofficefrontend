// NumberTransition under reduced motion (the global setup mock): the value
// changes in place, screen readers hear the final value only, and React
// commits exactly once per value change (never per frame).
import { Profiler, type ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
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
    expect(screen.getByLabelText('41')).toBeInTheDocument();
    expect(container.querySelector('[aria-hidden="true"]')).toBeInTheDocument();
    rerender(<NumberTransition value={42} />);
    expect(screen.getByLabelText('42')).toBeInTheDocument();
    expect(screen.queryByLabelText('41')).not.toBeInTheDocument();
  });

  it('formats decimals, sign, prefix and suffix', () => {
    const { rerender } = render(<NumberTransition value={1960} decimals={1} />);
    expect(screen.getByLabelText('1960.0')).toBeInTheDocument();
    rerender(<NumberTransition value={-3.5} decimals={1} prefix="Δ" suffix="%" />);
    expect(screen.getByLabelText('-Δ3.5%')).toBeInTheDocument();
  });

  it('renders non-finite values as not available', () => {
    render(<NumberTransition value={Number.NaN} />);
    expect(screen.getByLabelText('Not available')).toBeInTheDocument();
  });

  it('honours an explicit screen-reader label', () => {
    render(<NumberTransition value={5} label="5 of 12 records" />);
    expect(screen.getByLabelText('5 of 12 records')).toBeInTheDocument();
  });

  it('commits once per value change, never per frame', async () => {
    const phases: string[] = [];
    const { rerender } = render(profiled(<NumberTransition value={0} />, phases));
    expect(phases).toEqual(['mount']);
    rerender(profiled(<NumberTransition value={12345} />, phases));
    await new Promise(resolve => setTimeout(resolve, 700));
    expect(phases).toEqual(['mount', 'update']);
  });
});
