'use client';

import { useRef, type ComponentProps, type HTMLAttributes, type ReactNode } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../foundations/cn';
import { type } from '../foundations/typography';
import { IconButton } from '../primitives/Button';
import { DrawerDragPanel, ZoomBoundary, ZoomOverlay, ZoomTarget } from '../motion';
import { firstDialogField } from './dialogFocus';

const panelVariants = cva(
  [
    'fixed z-dialog flex flex-col border border-line bg-surface font-sans text-body text-ink shadow-dialog outline-none',
  ],
  {
    variants: {
      placement: {
        center: [
          'left-1/2 top-1/2 max-h-[min(92dvh,56rem)] w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 rounded-panel',
        ],
        right: [
          'inset-y-0 right-0 h-dvh w-full max-w-lg rounded-l-panel border-r-0',
        ],
      },
      // The enter/exit choreography. `css` is the tw-animate open (the
      // default, byte-identical to before); `zoom` leaves the panel bare
      // for the ZoomTarget, which owns the motion instead.
      motion: {
        css: '',
        zoom: '',
      },
      size: { sm: 'sm:max-w-md', md: 'sm:max-w-xl', lg: 'sm:max-w-3xl', xl: 'sm:max-w-5xl' },
    },
    compoundVariants: [
      { placement: 'right', size: ['sm', 'md', 'lg', 'xl'], className: 'sm:max-w-lg' },
      {
        placement: 'center', motion: 'css',
        className: 'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:zoom-in-[0.98] data-[state=closed]:zoom-out-[0.98] duration-[var(--mo-spring-smooth-duration)] ease-spring-smooth',
      },
      {
        placement: 'right', motion: 'css',
        className: 'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right duration-[var(--mo-spring-gentle-duration)] ease-spring-gentle',
      },
    ],
    defaultVariants: { placement: 'center', size: 'md', motion: 'css' },
  },
);

const overlayBase = 'fixed inset-0 z-overlay bg-overlay';
const overlayCss = 'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 duration-[var(--mo-spring-quick-duration)] ease-spring-quick';

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
  /** Intercept every close attempt (Escape, outside click, the close button). Call onOpenChange(false) yourself to proceed. */
  onRequestClose?: () => void;
  className?: string;
  /** Focus on open: true = the title; false = the first control; omitted = the first field when the body has one, else the title. */
  focusTitle?: boolean;
  /** A surface that dresses dialogs its own way (the Tools workspace). See DialogSkin. */
  skin?: DialogSkin;
  /** Drag-to-dismiss axis. Drawer passes "x" (phones only, off in reduced motion); centre dialogs never drag. */
  dragDismiss?: 'x';
  /**
   * Shared-element zoom: the panel grows out of the ZoomLink source looked up
   * by this stable id and shrinks back into it on close (a missing or
   * off-screen source falls back to the placement's normal open). Disables
   * drag-dismiss while set. Omit for the plain open.
   */
  zoomId?: string;
}

/**
 * Class names that replace the default look, slot by slot, while the behaviour (focus trap, focus return,
 * dismissal rules, scroll lock, aria wiring) stays this component's. `attrs` reach the panel element.
 */
export type DialogSkin = {
  overlay: string; panel: string; header: string; title: string; description: string; body: string; close: string;
  closeIcon: ReactNode;
  attrs?: HTMLAttributes<HTMLDivElement> & { [key: `data-${string}`]: string | undefined };
};

/**
 * The one dialog. Replaces CenterModal / ToolsDialog / ui/dialog usage.
 * Radix supplies the focus trap, scroll lock, aria wiring and Escape handling;
 * this component adds focus return to a still-connected opener, a scrollable
 * body between a fixed header and footer, and responsive sizing.
 */
export function Dialog({
  open, onOpenChange, title, description, children, footer, placement, size, dismissible = true, onRequestClose, className, focusTitle, skin, dragDismiss, zoomId,
}: DialogProps) {
  const opener = useRef<HTMLElement | null>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const attemptClose = (next: boolean) => {
    if (next) { onOpenChange(true); return; }
    if (!dismissible) return;
    if (onRequestClose) onRequestClose();
    else onOpenChange(false);
  };
  const contentEvents: Pick<
    ComponentProps<typeof DialogPrimitive.Content>,
    'onOpenAutoFocus' | 'onCloseAutoFocus' | 'onEscapeKeyDown' | 'onPointerDownOutside' | 'onInteractOutside'
  > = {
    onOpenAutoFocus: event => {
      opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      // A picker that opens typing-ready owns the caret: its own effect focuses the search box,
      // so the dialog cancels Radix's automatic focus and leaves the caret to the picker.
      const root = titleRef.current?.closest('[role="dialog"]');
      if (root instanceof HTMLElement && root.querySelector('[data-autofocus-search]')) { event.preventDefault(); return; }
      if (focusTitle !== false) {
        event.preventDefault();
        if (focusTitle) { titleRef.current?.focus(); return; }
        // The title is the light, measurement-free focus target: take it inside
        // the commit, then move to the first field on clean layout after paint.
        // firstDialogField's visibility scan forces a full-page layout; running it
        // here stalls the open on element-rich pages.
        titleRef.current?.focus();
        requestAnimationFrame(() => {
          firstDialogField(root instanceof HTMLElement ? root : null)?.focus({ preventScroll: true });
        });
      }
    },
    onCloseAutoFocus: event => {
      const target = opener.current;
      if (target?.isConnected) { event.preventDefault(); target.focus(); }
    },
    onEscapeKeyDown: event => { if (!dismissible) event.preventDefault(); },
    onPointerDownOutside: event => { if (!dismissible) event.preventDefault(); },
    onInteractOutside: event => {
      // Menus/selects/tooltips portal outside the dialog; clicking inside them must not dismiss it.
      const target = event.target as HTMLElement | null;
      if (target?.closest('[data-radix-popper-content-wrapper], [data-radix-select-content], [role="listbox"], [role="menu"], [cmdk-root]')) event.preventDefault();
    },
  };
  const zoom = zoomId !== undefined;
  const drag = dragDismiss === 'x' && dismissible && !skin && !zoom;
  const contentClass = skin ? cn(skin.panel, className) : cn(panelVariants({ placement, size, motion: zoom ? 'zoom' : 'css' }), className);
  const panel = (
    <>
      <header className={skin?.header ?? 'flex items-start gap-3 border-b border-line-subtle px-5 py-4 sm:px-6'}>
        <div className={skin ? undefined : 'min-w-0 flex-1'}>
          <DialogPrimitive.Title ref={titleRef} tabIndex={focusTitle === false ? undefined : -1} className={skin?.title ?? cn(type.sectionTitle, 'tracking-tight focus-ring')}>{title}</DialogPrimitive.Title>
          {description ? (
            <DialogPrimitive.Description className={skin?.description ?? 'mt-1 font-sans text-body-sm text-ink-muted'}>{description}</DialogPrimitive.Description>
          ) : (
            <DialogPrimitive.Description className="sr-only">{title}</DialogPrimitive.Description>
          )}
        </div>
        {dismissible && (
          <DialogPrimitive.Close asChild>
            {skin
              ? <button type="button" className={skin.close} aria-label="Close dialog">{skin.closeIcon}</button>
              : <IconButton icon="close" label="Close dialog" size="md" className="-mr-2 -mt-1" tooltip={false} />}
          </DialogPrimitive.Close>
        )}
      </header>
      <div className={skin?.body ?? 'min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6'}>{children}</div>
      {footer && <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-line-subtle px-5 py-3.5 sm:px-6 max-sm:flex-col-reverse max-sm:flex-nowrap max-sm:items-stretch max-sm:[&>*]:w-full">{footer}</footer>}
    </>
  );
  return (
    <DialogPrimitive.Root open={open} onOpenChange={attemptClose}>
      <DialogPrimitive.Portal forceMount={zoom ? true : undefined}>
        {zoom ? (
          <ZoomBoundary>
            {open && (
              <DialogPrimitive.Overlay key="zoom-overlay" asChild forceMount>
                <ZoomOverlay className={skin?.overlay ?? overlayBase} />
              </DialogPrimitive.Overlay>
            )}
            {open && (
              <DialogPrimitive.Content
                key="zoom-content"
                asChild
                forceMount
                className={contentClass}
                {...skin?.attrs}
                {...contentEvents}
              >
                <ZoomTarget zoomId={zoomId} placement={placement ?? 'center'}>{panel}</ZoomTarget>
              </DialogPrimitive.Content>
            )}
          </ZoomBoundary>
        ) : (
          <>
            <DialogPrimitive.Overlay className={skin?.overlay ?? `${overlayBase} ${overlayCss}`} />
            {drag ? (
              <DialogPrimitive.Content asChild className={contentClass} {...contentEvents}>
                <DrawerDragPanel onDismiss={() => attemptClose(false)}>{panel}</DrawerDragPanel>
              </DialogPrimitive.Content>
            ) : (
              <DialogPrimitive.Content
                className={contentClass}
                {...skin?.attrs}
                {...contentEvents}
              >
                {panel}
              </DialogPrimitive.Content>
            )}
          </>
        )}
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
