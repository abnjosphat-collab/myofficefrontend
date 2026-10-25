'use client';

import { forwardRef, useEffect, useRef, useState, type ComponentPropsWithoutRef, type ElementRef, type ReactNode } from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '../foundations/cn';
import { Icon } from '../foundations/Icon';
import type { IconMeaning } from '../foundations/icon-meanings';
import { CountBadge } from './Badge';

export const Tabs = TabsPrimitive.Root;
export const TabsContent = TabsPrimitive.Content;

/** Pure — the localStorage key remembering one strip's dismissed first-visit guide. Exported for tests. */
export function tabsGuideKey(guideId: string): string {
  return `myoffice.tabs.guide.${guideId}`;
}

function readGuideDismissed(guideId: string): boolean {
  try {
    return window.localStorage.getItem(tabsGuideKey(guideId)) !== null;
  } catch {
    return true; // storage unavailable: never nag
  }
}

function writeGuideDismissed(guideId: string): void {
  try {
    window.localStorage.setItem(tabsGuideKey(guideId), '1');
  } catch {
    /* storage unavailable — non-fatal */
  }
}

export interface TabsListProps extends ComponentPropsWithoutRef<typeof TabsPrimitive.List> {
  /** Enables the first-visit guide line under the strip, remembered per id. */
  guideId?: string;
  /** The guide line ("Switch between ... here"), shown until the first tab change. Needs guideId. */
  guideText?: string;
}

/** Underline tab strip with a sliding indicator (instant under reduced motion). Scrolls horizontally on narrow screens rather than wrapping. */
export const TabsList = forwardRef<ElementRef<typeof TabsPrimitive.List>, TabsListProps>(function TabsList(
  { className, guideId, guideText, children, ...props },
  ref,
) {
  const listRef = useRef<ElementRef<typeof TabsPrimitive.List>>(null);
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const guideOn = guideId !== undefined && guideText !== undefined;

  useEffect(() => {
    if (guideOn && typeof window !== 'undefined' && !readGuideDismissed(guideId)) setShowGuide(true);
  }, [guideOn, guideId]);

  useEffect(() => {
    const list = listRef.current;
    if (!list || typeof window === 'undefined') return;
    const measure = () => {
      const active = list.querySelector('[data-state="active"]');
      if (active instanceof HTMLElement && active.offsetWidth > 0) {
        setIndicator({ left: active.offsetLeft, width: active.offsetWidth });
      } else {
        setIndicator(null);
      }
    };
    measure();
    const resize = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    resize?.observe(list);
    // A flipped data-state is a real tab change: re-measure and retire the guide.
    const states = new MutationObserver(() => {
      measure();
      if (guideOn) {
        writeGuideDismissed(guideId);
        setShowGuide(false);
      }
    });
    states.observe(list, { attributes: true, attributeFilter: ['data-state'], subtree: true });
    return () => {
      resize?.disconnect();
      states.disconnect();
    };
  }, [guideOn, guideId]);

  const setRefs = (node: ElementRef<typeof TabsPrimitive.List> | null) => {
    listRef.current = node;
    if (typeof ref === 'function') ref(node);
    else if (ref) ref.current = node;
  };

  return (
    <>
      <TabsPrimitive.List
        ref={setRefs}
        className={cn('relative flex min-w-0 items-end gap-6 overflow-x-auto border-b border-line [scrollbar-width:none] [&::-webkit-scrollbar]:hidden', className)}
        {...props}
      >
        {children}
        {indicator && (
          <span
            aria-hidden="true"
            data-testid="tabs-indicator"
            className="pointer-events-none absolute bottom-0 left-0 h-0.5 rounded-full bg-action transition-[transform,width] duration-[var(--mo-duration-base)] motion-reduce:transition-none"
            style={{ width: indicator.width, transform: `translateX(${indicator.left}px)` }}
          />
        )}
      </TabsPrimitive.List>
      {guideOn && showGuide && (
        <p className="mt-1 font-sans text-caption text-ink-muted">{guideText}</p>
      )}
    </>
  );
});

export interface TabsTriggerProps extends Omit<ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>, 'children'> {
  icon?: IconMeaning;
  count?: number;
  countTone?: 'neutral' | 'brand' | 'warning' | 'danger';
  children: ReactNode;
}

export const TabsTrigger = forwardRef<ElementRef<typeof TabsPrimitive.Trigger>, TabsTriggerProps>(function TabsTrigger(
  { icon, count, countTone, className, children, ...props },
  ref,
) {
  return (
    <TabsPrimitive.Trigger
      ref={ref}
      className={cn(
        'focus-ring touch-target relative -mb-px inline-flex h-10 shrink-0 items-center gap-2 whitespace-nowrap border-b-2 border-transparent px-0.5 font-sans text-label font-normal text-ink-muted',
        'transition-colors duration-[var(--mo-duration-base)] hover:text-ink',
        'data-[state=active]:text-action',
        className,
      )}
      {...props}
    >
      {icon && <Icon name={icon} size="md" weight="navigation" />}
      {children}
      {count !== undefined && count > 0 && <CountBadge value={count} tone={countTone} />}
    </TabsPrimitive.Trigger>
  );
});
