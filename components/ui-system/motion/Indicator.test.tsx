// useSlidingIndicator + SlidingIndicator: the pill tracks the active option
// (mocked rects — jsdom has no layout), follows changes, and settles on the
// first match when several actives coexist (the nav's Recent + category case).
import { useRef } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SlidingIndicator, useSlidingIndicator } from './Indicator';

const rectOf = (left: number, top: number, width: number, height: number) => ({
  left, top, width, height, right: left + width, bottom: top + height, x: left, y: top, toJSON: () => {},
});

function Strip({ pressed = 'a', duplicates = false, nudge = 0 }: { pressed?: string; duplicates?: boolean; nudge?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const rect = useSlidingIndicator(ref, { selector: '[aria-pressed="true"]', activeKey: `${pressed}:${nudge}` });
  return (
    <div ref={ref} data-testid="strip" className="relative">
      <SlidingIndicator rect={rect} className="bg-action" />
      <button type="button" aria-pressed={pressed === 'a'}>Alpha</button>
      <button type="button" aria-pressed={pressed === 'b'}>Beta</button>
      {duplicates && <button type="button" aria-pressed>Alpha again</button>}
    </div>
  );
}

function mockLayout(strip: HTMLElement) {
  const buttons = strip.querySelectorAll('button');
  strip.getBoundingClientRect = () => rectOf(0, 0, 200, 36) as DOMRect;
  buttons[0].getBoundingClientRect = () => rectOf(2, 2, 60, 32) as DOMRect;
  buttons[1].getBoundingClientRect = () => rectOf(64, 2, 72, 32) as DOMRect;
}

const pillAfterLayout = async (container: HTMLElement) => {
  await waitFor(() => {
    expect(screen.getByTestId('sliding-indicator')).toBeInTheDocument();
  });
  return container.querySelector('[data-testid="sliding-indicator"]') as HTMLElement;
};

describe('SlidingIndicator', () => {
  it('renders nothing before anything is measurable', () => {
    render(<Strip />);
    expect(screen.queryByTestId('sliding-indicator')).not.toBeInTheDocument();
  });

  it('positions the pill over the active option', async () => {
    const { container, rerender } = render(<Strip pressed="a" />);
    mockLayout(container.querySelector('[data-testid="strip"]') as HTMLElement);
    rerender(<Strip pressed="a" nudge={1} />);
    const pill = await pillAfterLayout(container);
    expect(pill.style.transform).toBe('translate(2px, 2px)');
    expect(pill.style.width).toBe('60px');
  });

  it('follows the active option when it moves', async () => {
    const { container, rerender } = render(<Strip pressed="a" />);
    mockLayout(container.querySelector('[data-testid="strip"]') as HTMLElement);
    rerender(<Strip pressed="b" nudge={1} />);
    const pill = await pillAfterLayout(container);
    expect(pill.style.transform).toBe('translate(64px, 2px)');
    expect(pill.style.width).toBe('72px');
  });

  it('settles on the first match when several actives coexist', async () => {
    const { container, rerender } = render(<Strip pressed="a" duplicates />);
    mockLayout(container.querySelector('[data-testid="strip"]') as HTMLElement);
    rerender(<Strip pressed="a" duplicates nudge={1} />);
    const pill = await pillAfterLayout(container);
    expect(pill.style.transform).toBe('translate(2px, 2px)');
  });

  it('slides on the smooth spring token and jumps under reduced motion', async () => {
    const { container, rerender } = render(<Strip pressed="a" />);
    mockLayout(container.querySelector('[data-testid="strip"]') as HTMLElement);
    rerender(<Strip pressed="a" nudge={1} />);
    const pill = await pillAfterLayout(container);
    expect(pill.className).toContain('duration-[var(--mo-spring-smooth-duration)]');
    expect(pill.className).toContain('ease-spring-smooth');
    expect(pill.className).toContain('motion-reduce:transition-none');
  });
});
