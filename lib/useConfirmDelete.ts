// lib/useConfirmDelete.ts — the one delete flow: ask, delete, say so, refresh. Every register deletes the
// same way, so the confirmation wording, the success toast and a failure that names what was not deleted
// read identically on every page.
'use client';

import { useCallback } from 'react';
import { toast } from 'sonner';
import { useConfirm } from '@/components/ui-system';

export interface ConfirmDeleteOptions {
  /** The question, e.g. "Delete this work order?" */
  title: string;
  /** What will be lost. Defaults to "This cannot be undone." */
  message?: string;
  /** Names the record when it fails: "{what} was not deleted: {reason}". */
  what: string;
  /** The delete itself, plus any closing of a detail view. Runs only after the person confirms. */
  run: () => unknown | Promise<unknown>;
  /** Success toast, e.g. "Work order deleted." */
  done: string;
  /** Refresh after the success toast. Its own failure is not reported as a failed delete. */
  after?: () => unknown | Promise<unknown>;
}

/** Returns `confirmDelete(options)`, which resolves true when the record was deleted. */
export function useConfirmDelete() {
  const confirm = useConfirm();
  return useCallback(async ({ title, message = 'This cannot be undone.', what, run, done, after }: ConfirmDeleteOptions) => {
    if (!await confirm({ title, message, confirmLabel: 'Delete', destructive: true })) return false;
    try {
      await run();
    } catch (e) {
      toast.error(`${what} was not deleted: ${e instanceof Error ? e.message : 'the server did not accept it.'}`);
      return false;
    }
    toast.success(done);
    try { await after?.(); } catch { /* the list's own error state reports a failed refresh */ }
    return true;
  }, [confirm]);
}
