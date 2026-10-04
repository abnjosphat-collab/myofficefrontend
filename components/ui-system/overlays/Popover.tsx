'use client';

import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { cn } from '../foundations/cn';
import { COLLISION_PADDING, floatingSurface } from './surfaces';

export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;
export const PopoverAnchor = PopoverPrimitive.Anchor;
export const PopoverClose = PopoverPrimitive.Close;

/**
 * Popover panel. Portalled to <body> (inherits the :root appearance tokens),
 * collision-aware, closes on Escape / outside press, and returns focus to its
 * trigger — all handled by Radix.
 */
export const PopoverContent = forwardRef<ElementRef<typeof PopoverPrimitive.Content>, ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>>(
  function PopoverContent({ className, align = 'start', sideOffset = 6, ...props }, ref) {
    return (
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          ref={ref}
          align={align}
          sideOffset={sideOffset}
          collisionPadding={COLLISION_PADDING}
          className={cn(floatingSurface, 'w-72 max-w-[calc(100vw-1.5rem)] p-3', className)}
          {...props}
        />
      </PopoverPrimitive.Portal>
    );
  },
);
