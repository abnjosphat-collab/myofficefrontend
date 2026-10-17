'use client';

import { Children, cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react';
import { ResponsiveContainer } from 'recharts';
import { useMediaQuery } from '../hooks/useMediaQuery';

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

function frameItems(children: ReactNode, reduceMotion: boolean): ReactNode {
  return Children.map(children, child => {
    if (!isValidElement(child)) return child;
    const name = (child.type as { displayName?: string } | null)?.displayName;
    return ANIMATED_ITEMS.has(name ?? '')
      ? cloneElement(child as ReactElement<Record<string, unknown>>, { isAnimationActive: !reduceMotion })
      : child;
  });
}

/**
 * The one Recharts frame, inside a ChartPanel: sizing plus the two behaviours every chart needs.
 * The chart keeps its own data, axes and series; the frame supplies the responsive box, the
 * `accessibilityLayer={false}` the hidden chart requires, and still series under
 * prefers-reduced-motion. Put the text alternative on the ChartPanel, never here.
 */
export function Chart({ height = 220, minWidth, children }: { height?: number | `${number}%`; minWidth?: number | `${number}%`; children: ReactNode }) {
  const reduceMotion = useMediaQuery(REDUCED_MOTION);
  const framed = Children.map(children, child => {
    if (!isValidElement(child)) return child;
    const el = child as ReactElement<{ children?: ReactNode }>;
    return cloneElement(el as ReactElement<Record<string, unknown>>, chartFrameProps(), frameItems(el.props.children, reduceMotion));
  });
  return <ResponsiveContainer width="100%" height={height} minWidth={minWidth}>{framed}</ResponsiveContainer>;
}
