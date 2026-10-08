'use client';

import { useRef, type ReactNode } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { cn } from '../foundations/cn';
import { IconButton } from '../primitives/Button';
import { DESKTOP_QUERY, useMediaQuery } from '../hooks/useMediaQuery';

/** Height of the sticky navigation strip below the desktop breakpoint (Tools' strip: 8px padding, 40px controls, 1px
 *  rule), plus the device's top safe area. The top bar sticks beneath it. */
const STRIP_HEIGHT = 'calc(57px + var(--mo-safe-top))';

/**
 * The navigation, laid out as the Tools sidebar.
 *
 * - **Desktop (821 px and up):** a full-height sticky column, 216 px wide or a 68 px icon rail (width eases over
 *   0.22 s). Top row: the `spotlight` header slot (whatever mark the caller owns) and a collapse chevron. Below it a bordered, rounded
 *   panel holds `children` (the destinations) and an optional `footer` toggle.
 * - **Below 821 px:** a sticky horizontal `strip` (the caller supplies a menu button that opens the drawer,
 *   Home and shortcut icons). The full navigation opens in an accessible drawer (Radix Dialog: focus
 *   trap, Escape, scroll lock, focus return) showing the same `children`.
 *
 * Callers render the same `children` in both modes, so navigation is identical at every width; pass `collapsed`
 * only for the desktop rail (the drawer never renders collapsed).
 */
export function SidebarFrame({ open, onOpenChange, collapsed, onToggleCollapsed, spotlight, strip, children, footer, drawerBrand, label = 'Main navigation' }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  /** Header slot beside the collapse chevron — brand, `NavSpotlight`, or another mark the caller owns. */
  spotlight: ReactNode;
  /** Mobile strip content. */
  strip: ReactNode;
  children: ReactNode;
  /** Toggle row inside the bottom of the navigation panel (desktop and drawer). */
  footer?: ReactNode;
  /** Brand shown at the top of the drawer. */
  drawerBrand?: ReactNode;
  label?: string;
}) {
  const desktop = useMediaQuery(DESKTOP_QUERY, true);
  // The drawer is opened by a button elsewhere (not a Radix trigger), so remember the opener and give it focus back.
  const opener = useRef<HTMLElement | null>(null);

  const panel = (
    <nav aria-label={label} className="flex min-h-0 flex-col overflow-hidden rounded-[18px] border border-line bg-surface">
      {/* The panel hugs its content (as in Tools) and only scrolls when the viewport is shorter than the list. */}
      <div className="flex min-h-0 flex-col gap-1 overflow-y-auto overflow-x-hidden p-2">{children}</div>
      {footer && <div className="shrink-0 border-t border-line">{footer}</div>}
    </nav>
  );

  if (desktop) {
    return (
      <aside
        aria-label={label}
        data-collapsed={collapsed || undefined}
        className={cn(
          'sticky top-0 z-[var(--mo-z-sidebar)] flex h-dvh shrink-0 flex-col border-r border-line bg-surface py-[18px]',
          'transition-[width] duration-[220ms] ease-[ease]',
          // The left safe area (a landscape notch) widens the column so the content keeps its full width.
          collapsed ? 'w-[calc(var(--mo-sidebar-collapsed)+var(--mo-safe-left))] pl-[calc(0.5rem+var(--mo-safe-left))] pr-2' : 'w-[calc(var(--mo-sidebar-width)+var(--mo-safe-left))] pl-[calc(0.75rem+var(--mo-safe-left))] pr-3',
        )}
      >
        <div className={cn('relative mb-[15px] flex min-h-[38px] items-center gap-[9px] border-b border-line pb-[15px]', collapsed ? 'justify-center px-0' : 'px-1.5')}>
          {spotlight}
          <IconButton
            icon="chevron-left"
            label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!collapsed}
            onClick={onToggleCollapsed}
            className={cn('size-7 rounded-[7px] [&_svg]:transition-transform [&_svg]:duration-[var(--mo-duration-slow)]', collapsed ? 'absolute -right-[19px] top-1 border-line bg-surface [&_svg]:rotate-180' : 'ml-auto')}
          />
        </div>
        {panel}
      </aside>
    );
  }

  return (
    <>
      <div
        data-nav-strip=""
        className="sticky top-0 z-[var(--mo-z-sidebar)] flex items-center gap-1.5 overflow-x-auto border-b border-line bg-surface pt-[var(--mo-safe-top)]"
        style={{ height: STRIP_HEIGHT, paddingLeft: 'max(0.75rem, var(--mo-safe-left))', paddingRight: 'max(0.75rem, var(--mo-safe-right))' }}
      >
        {strip}
      </div>
      <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-[var(--mo-z-overlay)] bg-[var(--mo-overlay)] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
          <DialogPrimitive.Content
            aria-describedby={undefined}
            onOpenAutoFocus={() => { opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; }}
            onCloseAutoFocus={event => { const target = opener.current; if (target?.isConnected) { event.preventDefault(); target.focus(); } }}
            className="fixed inset-y-0 left-0 z-[var(--mo-z-dialog)] flex w-[min(20rem,calc(100vw-3rem))] flex-col gap-3 border-r border-line bg-surface p-3 pb-[max(0.75rem,var(--mo-safe-bottom))] pl-[max(0.75rem,var(--mo-safe-left))] pt-[max(0.75rem,var(--mo-safe-top))] shadow-dialog outline-none data-[state=open]:animate-in data-[state=open]:slide-in-from-left data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left duration-[var(--mo-duration-slow)]"
          >
            <div className="flex min-h-[38px] items-center justify-between border-b border-line px-1.5 pb-3">
              <DialogPrimitive.Title className="sr-only">{label}</DialogPrimitive.Title>
              {drawerBrand}
              <DialogPrimitive.Close asChild><IconButton icon="close" label="Close navigation" /></DialogPrimitive.Close>
            </div>
            {panel}
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </>
  );
}

/**
 * The top row of the content column, exactly as the Tools "topline": sticky, inset to the page gutter, a 1 px line above and below in
 * the standard line colour, a soft shadow under it, and a translucent canvas with a blur. Slots: `start` (title), `center` (search), `end` (actions). Below 821 px it sticks
 * under the navigation strip.
 */
export function TopBar({ start, center, end, below }: { start?: ReactNode; center?: ReactNode; end?: ReactNode; below?: ReactNode }) {
  return (
    <header
      className="sticky top-[calc(57px+var(--mo-safe-top))] z-[var(--mo-z-header)] mt-3 border-y border-line bg-canvas/[0.88] shadow-[0_10px_30px_-28px_var(--mo-ink)] backdrop-blur-[18px] backdrop-saturate-[1.2] min-[821px]:top-0"
      style={{ marginLeft: 'max(var(--mo-page-gutter), var(--mo-safe-left))', marginRight: 'max(var(--mo-page-gutter), var(--mo-safe-right))' }}
    >
      <div className="flex min-h-[38px] items-center gap-3 px-1 py-[11px]">
        <div className="flex min-w-0 shrink-0 items-center gap-2">{start}</div>
        <div className="mx-auto hidden min-w-0 flex-1 md:block md:max-w-xl">{center}</div>
        <div className="ml-auto flex shrink-0 items-center gap-2 md:ml-0">{end}</div>
      </div>
      {below}
    </header>
  );
}

/**
 * Page chrome: skip link, the navigation column, and a content column holding the top bar and a `main` landmark with
 * the shared gutter and maximum width. The DOCUMENT scrolls (not an inner container), so browser zoom, find in
 * page, anchors and mobile browser chrome behave normally.
 */
export function AppFrame({ topBar, sidebar, children, className, contained = true }: {
  topBar: ReactNode;
  sidebar?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Apply the shared page gutter and maximum width. Only pages that have not been migrated yet pass false (they own their own spacing). */
  contained?: boolean;
}) {
  return (
    <div className="min-h-dvh bg-canvas">
      <a href="#main-content" className="focus-ring sr-only fixed left-3 top-3 z-[var(--mo-z-tooltip)] rounded-control bg-action px-3 py-2 font-sans text-label font-medium text-action-ink focus:not-sr-only">
        Skip to main content
      </a>
      {/* Mobile first: a column (strip above content); the sidebar row starts at 821 px, the same boundary the JS uses.
          (Tailwind 4's max-* variants are exclusive, so max-[820px] would miss 820 itself.) */}
      <div className="flex min-h-dvh flex-col min-[821px]:flex-row">
        {sidebar}
        <div className="flex min-w-0 flex-1 flex-col">
          {topBar}
          <main id="main-content" tabIndex={-1} className={cn('min-w-0 flex-1 outline-none', className)}>
            {contained ? <div className="mx-auto w-full max-w-[var(--mo-page-max)] py-5 sm:py-6" style={{ paddingLeft: 'max(var(--mo-page-gutter), var(--mo-safe-left))', paddingRight: 'max(var(--mo-page-gutter), var(--mo-safe-right))', paddingBottom: 'max(1.25rem, var(--mo-safe-bottom))' }}>{children}</div> : children}
          </main>
        </div>
      </div>
    </div>
  );
}
