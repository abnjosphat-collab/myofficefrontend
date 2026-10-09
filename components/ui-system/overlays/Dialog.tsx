'use client';

import { useRef, type ReactNode } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../foundations/cn';
import { type } from '../foundations/typography';
import { IconButton } from '../primitives/Button';

const panelVariants = cva(
  [
    'fixed z-[var(--mo-z-dialog)] flex flex-col border border-line bg-surface font-sans text-body text-ink shadow-dialog outline-none',
    'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0',
    'duration-[var(--mo-duration-slow)] ease-emphasized',
  ],
  {
    variants: {
      placement: {
        center: [
          'left-1/2 top-1/2 max-h-[min(92dvh,56rem)] w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 rounded-panel',
          'data-[state=open]:zoom-in-[0.985] data-[state=closed]:zoom-out-[0.985]',
        ],
        right: [
          'inset-y-0 right-0 h-dvh w-full max-w-lg rounded-l-panel border-r-0',
          'data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right',
        ],
      },
      size: { sm: 'sm:max-w-md', md: 'sm:max-w-xl', lg: 'sm:max-w-3xl', xl: 'sm:max-w-5xl' },
    },
    compoundVariants: [{ placement: 'right', size: ['sm', 'md', 'lg', 'xl'], className: 'sm:max-w-lg' }],
    defaultVariants: { placement: 'center', size: 'md' },
  },
);

export interface DialogProps extends VariantProps<typeof panelVariants> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** One short sentence under the title. Required for assistive technology; hide visually with `hideDescription`. */
  description?: string;
  /** Main content. It scrolls inside the panel; header and footer stay put. */
  children: ReactNode;
  /** Action row. Primary action last. */
  footer?: ReactNode;
  /**
   * When false, Escape / outside press / the close button do nothing. Use while
   * a save is in flight or while a sign-in gate must be completed. For unsaved
   * edits prefer `onRequestClose` and ask for confirmation.
   */
  dismissible?: boolean;
  /** Intercept every close attempt (Escape, outside, ✕). Call onOpenChange(false) yourself to proceed. */
  onRequestClose?: () => void;
  className?: string;
}

/**
 * The one dialog. Replaces CenterModal / ToolsDialog / ui/dialog usage.
 * Radix supplies the focus trap, scroll lock, aria wiring and Escape handling;
 * this component adds focus return to a still-connected opener, a scrollable
 * body between a fixed header and footer, and responsive sizing.
 */
export function Dialog({
  open, onOpenChange, title, description, children, footer, placement, size, dismissible = true, onRequestClose, className,
}: DialogProps) {
  const opener = useRef<HTMLElement | null>(null);
  const attemptClose = (next: boolean) => {
    if (next) { onOpenChange(true); return; }
    if (!dismissible) return;
    if (onRequestClose) onRequestClose();
    else onOpenChange(false);
  };
  return (
    <DialogPrimitive.Root open={open} onOpenChange={attemptClose}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[var(--mo-z-overlay)] bg-[var(--mo-overlay)] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 duration-[var(--mo-duration-base)]" />
        <DialogPrimitive.Content
          className={cn(panelVariants({ placement, size }), className)}
          onOpenAutoFocus={() => { opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; }}
          onCloseAutoFocus={event => {
            const target = opener.current;
            if (target?.isConnected) { event.preventDefault(); target.focus(); }
          }}
          onEscapeKeyDown={event => { if (!dismissible) event.preventDefault(); }}
          onPointerDownOutside={event => { if (!dismissible) event.preventDefault(); }}
          onInteractOutside={event => {
            // Menus/selects/tooltips portal outside the dialog; clicking inside them must not dismiss it.
            const target = event.target as HTMLElement | null;
            if (target?.closest('[data-radix-popper-content-wrapper], [data-radix-select-content], [role="listbox"], [role="menu"], [cmdk-root]')) event.preventDefault();
          }}
        >
          <header className="flex items-start gap-3 border-b border-line-subtle px-5 py-4 sm:px-6">
            <div className="min-w-0 flex-1">
              <DialogPrimitive.Title className={cn(type.sectionTitle, 'tracking-tight')}>{title}</DialogPrimitive.Title>
              {description ? (
                <DialogPrimitive.Description className="mt-1 font-sans text-body-sm text-ink-muted">{description}</DialogPrimitive.Description>
              ) : (
                <DialogPrimitive.Description className="sr-only">{title}</DialogPrimitive.Description>
              )}
            </div>
            {dismissible && (
              <DialogPrimitive.Close asChild>
                <IconButton icon="close" label="Close dialog" size="md" className="-mr-2 -mt-1" />
              </DialogPrimitive.Close>
            )}
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">{children}</div>
          {footer && <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-line-subtle px-5 py-3.5 sm:px-6">{footer}</footer>}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
