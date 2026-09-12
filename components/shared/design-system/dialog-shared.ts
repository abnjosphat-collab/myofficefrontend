// Shared Radix dialog behaviour + class hooks for CenterModal and components/ui/dialog.

/** Let open selects/comboboxes close on Escape before the modal dismisses. */
export function handleModalEscapeKeyDown(e: KeyboardEvent | { preventDefault: () => void; target: EventTarget | null }) {
  const target = e.target as HTMLElement | null;
  if (target?.getAttribute('aria-expanded') === 'true') e.preventDefault();
}

export const DIALOG_LAYER_Z = 50;
