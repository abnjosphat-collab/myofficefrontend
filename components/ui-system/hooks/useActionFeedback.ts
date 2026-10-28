// components/ui-system/hooks/useActionFeedback.ts — one action's three phases
// (idle → pending → success-hold → idle) for triggers that finish with a
// check: exports (B4), bespoke exporters, copy buttons. The hold is a display
// hold, never logic-on-settle: nothing downstream waits for it.
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type ActionPhase = 'idle' | 'pending' | 'success';

/**
 * Drives a trigger through idle → pending → success (held `holdMs`) → idle.
 * `run` blocks re-entry while busy; a throwing action returns to idle with no
 * check. The hold timer is cleaned up on unmount and on the next run.
 */
export function useActionFeedback(holdMs: number): {
  phase: ActionPhase;
  pending: boolean;
  success: boolean;
  run: (action: () => Promise<unknown>) => Promise<void>;
} {
  const [phase, setPhase] = useState<ActionPhase>('idle');
  const busy = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (timer.current !== null) clearTimeout(timer.current);
  }, []);
  const run = useCallback(async (action: () => Promise<unknown>) => {
    if (busy.current) return;
    busy.current = true;
    setPhase('pending');
    try {
      await action();
    } catch {
      busy.current = false;
      setPhase('idle');
      return;
    }
    setPhase('success');
    timer.current = setTimeout(() => {
      timer.current = null;
      busy.current = false;
      setPhase('idle');
    }, holdMs);
  }, [holdMs]);
  return { phase, pending: phase === 'pending', success: phase === 'success', run };
}
