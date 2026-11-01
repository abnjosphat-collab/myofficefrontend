export const FIELD_SELECTOR = 'input:not([type="hidden"]), select, textarea, button[role="combobox"]:not(:disabled)';

/**
 * The first form field a keyboard user would reach inside an opened dialog: visible and enabled.
 * Covers native fields plus picker/select triggers (Combobox and the Radix Select both render
 * button[role=combobox]), so a dialog that starts with a picker focuses it instead of skipping
 * to a later native field. Detail dialogs have none, so they fall back to the title; form dialogs
 * land in their first field instead of on the close button. Exported for tests.
 */
export function firstDialogField(root: HTMLElement | null): HTMLElement | null {
  if (!root) return null;
  const fields = root.querySelectorAll(FIELD_SELECTOR);
  for (const field of fields) {
    if (!(field instanceof HTMLElement)) continue;
    if ((field as HTMLInputElement).disabled) continue;
    if (field.getClientRects().length === 0) continue;
    // A screen-reader-only file input still has a (1px) box: never hand it the caret, or
    // keyboard shortcuts scoped to "not in a field" (the document viewer's arrows) go dead.
    if (field.getAttribute('aria-hidden') === 'true' || field.tabIndex < 0) continue;
    return field;
  }
  return null;
}

/**
 * Layout-free candidate check: whether the dialog holds anything the caret could
 * move to. Selector matching never forces layout, unlike firstDialogField's
 * visibility scan. The dialog skips its post-paint focus pass entirely when this
 * is false (detail dialogs), and skips a stale pass when the panel is gone.
 */
export function hasDialogField(root: HTMLElement | null): boolean {
  if (!root) return false;
  return root.querySelector(FIELD_SELECTOR) !== null;
}
