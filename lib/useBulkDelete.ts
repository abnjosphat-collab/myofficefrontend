// lib/useBulkDelete.ts — the one bulk-delete flow: ask once, delete each, say how many went and what did
// not, refresh. The confirm wording matches useConfirmDelete; the per-row settle matches the PPE bulk idiom
// (Promise.allSettled, first reason). The caller passes only deletable ids and names anything it skipped in
// the message — see D15.
'use client';

import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { useConfirm } from '@/components/ui-system';

export interface BulkDeleteOptions {
  /** The question, e.g. "Delete 7 unmatched PPE records?" */
  title: string;
  /** Scope + what is kept + "This cannot be undone." */
  message: string;
  /** Only deletable ids — the caller filters out what its single-delete refuses. */
  ids: (string | number)[];
  /** The single delete. Runs per id after the person confirms. */
  run: (id: string | number) => Promise<unknown>;
  /** Toast nouns, e.g. 'leave request' / 'leave requests'. */
  singular: string;
  plural: string;
  /** Refresh after the toasts. Its own failure is not reported as a failed delete. */
  after?: () => unknown | Promise<unknown>;
}

/** "Ann, Bob, Cat and 2 more" — names the scope of a bulk confirm without listing dozens. */
export function summariseNames(names: string[], max = 4): string {
  const head = names.slice(0, max).join(', ');
  const rest = names.length - Math.min(names.length, max);
  if (rest <= 0) return head;
  return head ? `${head} and ${rest} more` : `${rest} more`;
}

/** Returns `confirmBulkDelete(options)`, which resolves true when every record was deleted. */
export function useBulkDelete() {
  const confirm = useConfirm();
  const [deleting, setDeleting] = useState(false);
  const confirmBulkDelete = useCallback(async ({ title, message, ids, run, singular, plural, after }: BulkDeleteOptions) => {
    if (deleting || ids.length === 0) return false;
    if (!await confirm({ title, message, confirmLabel: 'Delete', destructive: true })) return false;
    setDeleting(true);
    try {
      const results = await Promise.allSettled(ids.map(id => run(id)));
      const ok = results.filter(r => r.status === 'fulfilled').length;
      const failed = ids.length - ok;
      const first = results.find((r): r is PromiseRejectedResult => r.status === 'rejected');
      if (ok > 0) toast.success(`${ok} ${ok === 1 ? singular : plural} deleted.`);
      if (first) toast.error(`${failed} ${failed === 1 ? singular : plural} ${failed === 1 ? 'was' : 'were'} not deleted: ${first.reason instanceof Error ? first.reason.message : 'the server did not accept it.'}`);
      try { await after?.(); } catch { /* the list's own error state reports a failed refresh */ }
      return failed === 0;
    } finally {
      setDeleting(false);
    }
  }, [confirm, deleting]);
  return { confirmBulkDelete, deleting };
}
