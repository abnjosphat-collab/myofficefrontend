'use client';

import { useId, type ReactNode } from 'react';
import { cn } from '../foundations/cn';
import { Icon } from '../foundations/Icon';
import { Presence } from './Presence';

export interface DisclosureProps {
  /** Whether the content is open. */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The toggle row content (a summary line, a "more" label). */
  label: ReactNode;
  /** The collapsible content. */
  children: ReactNode;
  className?: string;
  /** Extra classes for the content wrapper. */
  bodyClassName?: string;
  /** Extra classes for the toggle button (the runway header stretches full-width). */
  buttonClassName?: string;
}

/**
 * One "show more" / collapsible: the chevron rotates 90° (snappy) and the
 * content fades in with height (smooth — the recorded height exception),
 * reversible while it is moving. Under reduced motion the content appears
 * and disappears without travelling. Replaces ad-hoc Presence + chevron
 * pairs (compressors runway, UnitDrawer "more").
 */
export function Disclosure({ open, onOpenChange, label, children, className, bodyClassName, buttonClassName }: DisclosureProps) {
  const bodyId = useId();
  return (
    <div className={className}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={() => onOpenChange(!open)}
        className={cn('flex w-fit items-center gap-1.5 rounded-sm font-sans text-body-sm text-ink-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus', buttonClassName)}
      >
        <span
          data-testid="disclosure-chevron"
          aria-hidden="true"
          className={cn(
            'inline-flex transition-transform duration-[var(--mo-spring-snappy-duration)] ease-spring-snappy motion-reduce:transition-none',
            open ? '' : '-rotate-90',
          )}
        >
          <Icon name="chevron-down" size="xs" />
        </span>
        {label}
      </button>
      <Presence visible={open}>
        <div id={bodyId} className={bodyClassName}>
          {children}
        </div>
      </Presence>
    </div>
  );
}
