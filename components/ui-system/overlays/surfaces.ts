/** Shared class strings for every floating surface (menu, select list, popover, tooltip, dialog). */

/** Floating panel: menus, select lists, popovers. Animates only opacity/translate; instant under reduced motion. */
export const floatingSurface = [
  'z-[var(--mo-z-popover)] overflow-hidden rounded-card border border-line bg-surface font-sans text-body text-ink shadow-popover',
  'origin-[var(--radix-popover-content-transform-origin)]',
  'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-[0.98]',
  'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-[0.98]',
  'data-[side=bottom]:slide-in-from-top-1 data-[side=top]:slide-in-from-bottom-1',
  'duration-[var(--mo-duration-base)]',
].join(' ');

/** One option / menu row. Selection is shown by the indicator, not colour alone. */
export const optionRow = [
  'relative flex min-h-9 w-full cursor-pointer select-none items-center gap-2 rounded-control px-2.5 py-1.5 pr-8 text-left font-sans text-body text-ink outline-none',
  'data-[highlighted]:bg-surface-muted data-[selected=true]:bg-surface-muted',
  'data-[state=checked]:font-medium aria-selected:bg-surface-muted',
  // Radix items mark disabled with an empty data-disabled; cmdk items always carry data-disabled="true" or "false",
  // so a bare data-[disabled] selector made every cmdk option look and behave disabled.
  "data-[disabled='']:pointer-events-none data-[disabled='']:opacity-45 data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-45 aria-disabled:pointer-events-none aria-disabled:opacity-45",
  'pointer-coarse:min-h-11',
].join(' ');

/** Trigger for Select / Combobox / menus that behave like a field. */
export const triggerSurface = [
  'focus-ring inline-flex h-9 w-full min-w-0 items-center justify-between gap-2 rounded-control border border-line-control bg-surface-raised px-3 text-left font-sans text-body text-ink',
  'transition-[border-color,box-shadow] duration-[var(--mo-duration-base)] ease-standard',
  'hover:border-line-strong data-[state=open]:border-focus focus-visible:border-focus',
  'data-[placeholder]:text-ink-subtle',
  'disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-ink-muted',
  'aria-[invalid=true]:border-danger',
  'pointer-coarse:h-11',
].join(' ');

/** Viewport padding used for collision handling on every floating surface. */
export const COLLISION_PADDING = 12;
