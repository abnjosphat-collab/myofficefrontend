'use client';

import { Children, cloneElement, isValidElement, useEffect, useState, type ReactElement, type ReactNode } from 'react';
import { ResponsiveContainer } from 'recharts';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { CHART_DRAW_MS, CHART_STILL_AFTER_MS } from '../motion/presets';

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';
/** The animated series our charts use. Recharts v3 animates each series itself (default 'auto'); the chart-level
 *  `isAnimationActive` it inherited from v2 reaches nothing, so stillness must be set on these. */
const ANIMATED_ITEMS = new Set(['Bar', 'Line', 'Area']);

/**
 * The frame's contract with the chart inside it: hidden from assistive technology (the ChartPanel
 * summary carries the meaning instead). Stillness is separate — see `frameItems`.
 */
export function chartFrameProps(): { accessibilityLayer: false } {
  return { accessibilityLayer: false };
}

function frameItems(children: ReactNode, animate: boolean): ReactNode {
  return Children.map(children, child => {
    if (!isValidElement(child)) return child;
    const name = (child.type as { displayName?: string } | null)?.displayName;
    return ANIMATED_ITEMS.has(name ?? '')
      ? cloneElement(child as ReactElement<Record<string, unknown>>, { isAnimationActive: animate, animationDuration: CHART_DRAW_MS, animationEasing: 'ease-out' })
      : child;
  });
}

/**
 * The one Recharts frame, inside a ChartPanel: sizing plus the behaviours every chart needs.
 * The chart keeps its own data, axes and series; the frame supplies the responsive box, the
 * `accessibilityLayer={false}` the hidden chart requires, and first-draw-only animation
 * (CHART_DRAW_MS ease-out on mount, still after CHART_STILL_AFTER_MS so a background refresh
 * or filter change never re-animates; always still under prefers-reduced-motion). Put the text
 * alternative on the ChartPanel, never here.
 */
export function Chart({ height = 220, minWidth, children }: { height?: number | `${number}%`; minWidth?: number | `${number}%`; children: ReactNode }) {
  const reduceMotion = useMediaQuery(REDUCED_MOTION);
  const [firstDraw, setFirstDraw] = useState(true);
  useEffect(() => {
    const timer = window.setTimeout(() => setFirstDraw(false), CHART_STILL_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, []);
  const animate = !reduceMotion && firstDraw;
  const framed = Children.map(children, child => {
    if (!isValidElement(child)) return child;
    const el = child as ReactElement<{ children?: ReactNode }>;
    return cloneElement(el as ReactElement<Record<string, unknown>>, chartFrameProps(), frameItems(el.props.children, animate));
  });
  return <ResponsiveContainer width="100%" height={height} minWidth={minWidth}>{framed}</ResponsiveContainer>;
}
