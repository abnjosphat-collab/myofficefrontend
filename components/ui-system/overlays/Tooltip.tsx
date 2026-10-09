'use client';

import { createContext, useContext, useState, type ReactElement, type ReactNode } from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { cn } from '../foundations/cn';
import { COLLISION_PADDING } from './surfaces';

const Provided = createContext(false);

/** Mount once near the root so every tooltip shares open-delay behaviour. */
export const TooltipProvider = ({ children }: { children: ReactNode }) => (
  <TooltipPrimitive.Provider delayDuration={350} skipDelayDuration={150}>
    <Provided.Provider value>{children}</Provided.Provider>
  </TooltipPrimitive.Provider>
);

/** Tooltips also work outside the root provider (a test, an isolated workspace) by supplying their own. */
function EnsureProvider({ children }: { children: ReactNode }) {
  return useContext(Provided) ? children : <TooltipProvider>{children}</TooltipProvider>;
}

const contentClasses = cn(
  'z-[var(--mo-z-tooltip)] max-w-72 rounded-[8px] border border-line bg-surface px-2.5 py-1.5 font-sans text-tip text-ink shadow-popover',
  'data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0',
  'duration-[var(--mo-duration-fast)]',
);

/**
 * Short description of a control, shown on hover and keyboard focus.
 * It supplements, never replaces, an accessible name on the trigger.
 */
export function Tooltip({ content, children, side = 'top' }: { content: ReactNode; children: ReactElement; side?: 'top' | 'right' | 'bottom' | 'left' }) {
  return (
    <EnsureProvider>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content side={side} sideOffset={7} collisionPadding={COLLISION_PADDING} className={contentClasses}>
            {content}
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </EnsureProvider>
  );
}

/**
 * Contextual help hint. Honours the "Helpful hints" appearance preference
 * (html[data-guidance=off] hides it) and toggles on tap for touch users.
 */
export function HelpHint({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <EnsureProvider>
    <TooltipPrimitive.Root open={open} onOpenChange={setOpen}>
      <TooltipPrimitive.Trigger asChild>
        <button
          type="button"
          aria-label={`Help: ${label}`}
          onClick={() => setOpen(value => !value)}
          className="focus-ring mo-hint inline-flex size-6 shrink-0 items-center justify-center rounded-full text-ink-subtle hover:bg-surface-muted hover:text-ink pointer-coarse:size-11"
        >
          <svg viewBox="0 0 256 256" className="size-4" fill="currentColor" aria-hidden="true">
            <path d="M128 24a104 104 0 1 0 104 104A104.11 104.11 0 0 0 128 24Zm0 192a88 88 0 1 1 88-88 88.1 88.1 0 0 1-88 88Zm16-40a8 8 0 0 1-8 8 16 16 0 0 1-16-16v-40a8 8 0 0 1 0-16 16 16 0 0 1 16 16v40a8 8 0 0 1 8 8Zm-32-92a12 12 0 1 1 12 12 12 12 0 0 1-12-12Z" />
          </svg>
        </button>
      </TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content sideOffset={8} collisionPadding={COLLISION_PADDING} className={cn(contentClasses, 'mo-hint-content')}>
          {children}
          <TooltipPrimitive.Arrow className="fill-surface-inverse" />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
    </EnsureProvider>
  );
}
