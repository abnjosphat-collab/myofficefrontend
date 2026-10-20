// components/ui-system/patterns/FormGuard.tsx — "never lose what you typed".
// FormDialog auto-tracks unsaved input (bubbling change events plus the
// useMarkDirty path from primitives/Field for custom controls) and asks
// before an accidental close. Plain dialogs reuse useDismissGuard with
// their own explicit dirty flag.
'use client';

import { useConfirm } from '../overlays/Confirm';

/**
 * Wraps an explicit close path. When `when`, asks first with the repo's
 * shared confirm (artisan discard copy); otherwise proceeds immediately.
 * Focus starts on Cancel; Escape answers "keep".
 */
export function useDismissGuard(opts: { when: boolean; message: string; title?: string; confirmLabel?: string }): {
  guardClose: (proceed: () => void) => void;
} {
  const confirm = useConfirm();
  return {
    guardClose: (proceed: () => void) => {
      if (!opts.when) {
        proceed();
        return;
      }
      void confirm({
        title: opts.title ?? 'Discard the changes?',
        message: opts.message,
        confirmLabel: opts.confirmLabel ?? 'Discard changes',
        destructive: true,
      }).then(ok => {
        if (ok) proceed();
      });
    },
  };
}
