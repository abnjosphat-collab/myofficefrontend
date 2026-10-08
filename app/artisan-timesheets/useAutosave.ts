// app/artisan-timesheets/useAutosave.ts — quiet persistence for the timesheet
// editor: once the draft sits unchanged for a few seconds it saves itself,
// silently — the Saved/Unsaved badge is the only feedback. The manual Save
// button stays for an explicit save with validation feedback. Saving,
// opening or exporting pauses the timer so two writes never overlap, and a
// failed save holds further attempts until the next edit retries.
'use client';

import { useEffect, useRef } from 'react';

export const AUTOSAVE_DELAY_MS = 2500;

export function useAutosave({ draft, dirty, busy, paused, onSave, delayMs = AUTOSAVE_DELAY_MS }: {
  /** The draft object — its identity must change on every edit so the timer restarts. */
  draft: unknown;
  dirty: boolean;
  busy: boolean;
  /** A failed save holds the timer; the next edit releases it. */
  paused: boolean;
  onSave: () => void;
  delayMs?: number;
}) {
  const saveRef = useRef(onSave);
  useEffect(() => { saveRef.current = onSave; });
  useEffect(() => {
    if (!dirty || busy || paused) return;
    const t = setTimeout(() => { saveRef.current(); }, delayMs);
    return () => clearTimeout(t);
  }, [draft, dirty, busy, paused, delayMs]);
}
