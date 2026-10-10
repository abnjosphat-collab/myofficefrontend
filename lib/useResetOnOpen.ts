// lib/useResetOnOpen.ts — refill a dialog's form each time it opens, or opens for a different record.
//
// Every form dialog needs this: open "New" and the fields start blank; open "Edit" on a record and they hold that
// record; close and reopen and stale typing is gone. It is done during render, not in an effect, so the dialog never
// paints one frame with the previous record's values (React's "adjust state when a prop changes" pattern).
'use client';

import { useState } from 'react';

/** The identity of what a dialog is showing: null while closed, the record's id when editing, `fallback` when creating. */
export function dialogKey(open: boolean, id: string | number | null | undefined, fallback = 'new'): string | null {
  return open ? String(id ?? fallback) : null;
}

/**
 * Calls `reset` whenever `key` changes to a non-null value: when the dialog opens, or switches to another record while
 * open. `reset` sets the form's state; it runs during render of the same component, which React allows for that
 * component's own state.
 */
export function useResetOnOpen(key: string | null, reset: () => void): void {
  const [seen, setSeen] = useState<string | null>(null);
  if (key !== seen) {
    setSeen(key);
    if (key !== null) reset();
  }
}
