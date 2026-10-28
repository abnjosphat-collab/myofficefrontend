import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, render } from '@testing-library/react';
import { Bar, BarChart, XAxis } from 'recharts';
import { Chart, chartFrameProps } from './Chart';

const rect = { x: 0, y: 0, width: 500, height: 220, top: 0, left: 0, bottom: 220, right: 500, toJSON: () => ({}) } as DOMRect;
/** jsdom has no matchMedia and no layout: fake both so the responsive box renders its child. */
const mockBrowser = (reduceMotion: boolean) => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: reduceMotion && query === '(prefers-reduced-motion: reduce)',
    media: query, addEventListener: vi.fn(), removeEventListener: vi.fn(),
  })) as unknown as typeof window.matchMedia;
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(rect);
};

afterEach(() => vi.restoreAllMocks());

describe('chartFrameProps', () => {
  it('hides the chart from assistive technology', () => {
    expect(chartFrameProps()).toEqual({ accessibilityLayer: false });
  });
});

describe('Chart', () => {
  it('frames the chart at the given height with no keyboard stop', () => {
    mockBrowser(false);
    render(<Chart height={220}><BarChart data={[{ name: 'a', value: 1 }]}><XAxis dataKey="name" /><Bar dataKey="value" /></BarChart></Chart>);
    expect(document.querySelector('.recharts-wrapper')).not.toBeNull();
    expect(document.querySelector('.recharts-responsive-container')).not.toBeNull();
    expect(document.querySelector('[tabindex="0"]')).toBeNull();
  });

  it.each([false, true])('sets series animation from the motion preference (reduced: %s)', reduceMotion => {
    mockBrowser(reduceMotion);
    const seen: Record<string, Record<string, unknown>> = {};
    const Capture = (key: string, displayName: string) => {
      const Spy = (props: Record<string, unknown>) => { seen[key] = props; return (props.children as never) ?? null; };
      Spy.displayName = displayName;
      return Spy;
    };
    const FakeChart = Capture('chart', 'BarChart');
    const FakeBar = Capture('bar', 'Bar');
    const FakeAxis = Capture('axis', 'XAxis');
    render(<Chart><FakeChart><FakeAxis /><FakeBar /></FakeChart></Chart>);
    expect(seen.chart.accessibilityLayer).toBe(false);
    expect(seen.bar.isAnimationActive).toBe(!reduceMotion);
    expect(seen.axis).not.toHaveProperty('isAnimationActive');
    expect(seen.bar.animationDuration).toBe(400);
    expect(seen.bar.animationEasing).toBe('ease-out');
  });

  it('animates only on first draw: still after 450 ms, and a data change stays still', () => {
    vi.useFakeTimers();
    try {
      mockBrowser(false);
      const seen: Record<string, Record<string, unknown>> = {};
      const BarSpy = (props: Record<string, unknown>) => { seen.bar = props; return null; };
      BarSpy.displayName = 'Bar';
      const ChartSpy = (props: Record<string, unknown>) => (props.children as never) ?? null;
      ChartSpy.displayName = 'BarChart';
      const { rerender } = render(<Chart><ChartSpy><BarSpy /></ChartSpy></Chart>);
      expect(seen.bar.isAnimationActive).toBe(true);
      act(() => { vi.advanceTimersByTime(450); });
      expect(seen.bar.isAnimationActive).toBe(false);
      rerender(<Chart><ChartSpy><BarSpy /></ChartSpy></Chart>);
      expect(seen.bar.isAnimationActive).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });
});
