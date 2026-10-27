'use client';

import { useLayoutEffect, useState, type RefObject } from 'react';
import { cn } from '../foundations/cn';

/** A measured active descendant, in container padding-box pixels. */
export interface IndicatorRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const sameRect = (a: IndicatorRect | null, b: IndicatorRect | null): boolean =>
  a === b || (!!a && !!b && a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height);

/**
 * Track the first descendant matching `selector` (e.g. `[aria-pressed="true"]`,
 * `[aria-current="page"]`) inside a relatively-positioned container, for a
 * sliding selection pill or bar. Pure DOM measurement (rect difference plus
 * scroll, minus border) with MutationObserver + ResizeObserver — no framer,
 * no layoutId, so containers with several simultaneous actives (the nav's
 * Recent list plus its category list) stay well-defined: the first match wins
 * and the rest keep their static fill.
 *
 * Returns null before measurement, when nothing matches, or when the match
 * is hidden — callers keep their static selected style as the fallback, so
 * there is never an unstated flash.
 */
export function useSlidingIndicator(
  containerRef: RefObject<HTMLElement | null>,
  options: {
    /** CSS selector for the active descendant. */
    selector: string;
    /** Re-measure when this changes (the controlled value, when there is one). */
    activeKey?: unknown;
  },
): IndicatorRect | null {
  const [rect, setRect] = useState<IndicatorRect | null>(null);
  const { selector, activeKey } = options;
  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container || typeof window === 'undefined') return;
    const measure = () => {
      const active = container.querySelector(selector);
      if (!(active instanceof HTMLElement)) {
        setRect(prev => (prev === null ? prev : null));
        return;
      }
      const c = container.getBoundingClientRect();
      const r = active.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) {
        setRect(prev => (prev === null ? prev : null));
        return; // closed group, hidden tab, or unmeasurable (tests)
      }
      const next: IndicatorRect = {
        x: r.left - c.left + container.scrollLeft - container.clientLeft,
        y: r.top - c.top + container.scrollTop - container.clientTop,
        width: r.width,
        height: r.height,
      };
      setRect(prev => (sameRect(prev, next) ? prev : next));
    };
    measure();
    const resize = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    resize?.observe(container);
    // A flipped selected state is a real change: re-measure (the Tabs precedent).
    const states = new MutationObserver(measure);
    states.observe(container, {
      attributes: true,
      attributeFilter: ['data-state', 'aria-pressed', 'aria-current', 'class'],
      childList: true,
      subtree: true,
    });
    return () => {
      resize?.disconnect();
      states.disconnect();
    };
  }, [containerRef, selector, activeKey]);
  return rect;
}

export interface SlidingIndicatorProps {
  /** The measured rect, or null (renders nothing — the caller's static style covers it). */
  rect: IndicatorRect | null;
  /** Pill fills the option box; bar is a small marker (leading bar / underline nub). */
  variant?: 'pill' | 'bar';
  orientation?: 'horizontal' | 'vertical';
  className?: string;
  testId?: string;
}

/**
 * The sliding selection marker. Positioned by transform on the smooth spring
 * token; instant under reduced motion (the global rule zeroes the duration).
 * Render it as the first child of the measured container.
 */
export function SlidingIndicator({ rect, variant = 'pill', orientation = 'horizontal', className, testId = 'sliding-indicator' }: SlidingIndicatorProps) {
  if (!rect) return null;
  const box = variant === 'pill'
    ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
    : orientation === 'vertical'
      ? { x: 2, y: rect.y + 5, width: 3, height: Math.max(12, rect.height - 10) }
      : { width: Math.min(16, Math.max(8, rect.width - 8)), x: 0, y: rect.y + rect.height - 3, height: 2 };
  const left = variant === 'pill' || orientation === 'vertical'
    ? box.x
    : rect.x + (rect.width - box.width) / 2;
  return (
    <span
      aria-hidden="true"
      data-testid={testId}
      className={cn(
        'pointer-events-none absolute left-0 top-0 transition-[transform,width,height] duration-[var(--mo-spring-smooth-duration)] ease-spring-smooth motion-reduce:transition-none',
        variant === 'pill' ? 'rounded-sm' : 'rounded-full',
        className,
      )}
      style={{ width: box.width, height: box.height, transform: `translate(${left}px, ${box.y}px)` }}
    />
  );
}
