const FIELD_SELECTOR = 'input:not([type="hidden"]), select, textarea, button[role="combobox"]:not(:disabled)';

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
    return field;
  }
  return null;
}
