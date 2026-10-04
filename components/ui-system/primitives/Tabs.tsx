'use client';

import { forwardRef, type ComponentPropsWithoutRef, type ElementRef, type ReactNode } from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '../foundations/cn';
import { Icon } from '../foundations/Icon';
import type { IconMeaning } from '../foundations/icon-meanings';
import { CountBadge } from './Badge';

export const Tabs = TabsPrimitive.Root;
export const TabsContent = TabsPrimitive.Content;

/** Underline tab strip. Scrolls horizontally on narrow screens rather than wrapping. */
export const TabsList = forwardRef<ElementRef<typeof TabsPrimitive.List>, ComponentPropsWithoutRef<typeof TabsPrimitive.List>>(function TabsList({ className, ...props }, ref) {
  return (
    <TabsPrimitive.List
      ref={ref}
      className={cn('flex min-w-0 items-end gap-1 overflow-x-auto border-b border-line [scrollbar-width:none] [&::-webkit-scrollbar]:hidden', className)}
      {...props}
    />
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
        'focus-ring touch-target relative -mb-px inline-flex h-10 shrink-0 items-center gap-2 whitespace-nowrap border-b-2 border-transparent px-3 font-sans text-label font-medium text-ink-muted',
        'transition-colors duration-[var(--mo-duration-base)] hover:text-ink',
        'data-[state=active]:border-action data-[state=active]:text-ink',
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
