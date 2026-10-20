// components/ui-system/patterns/focusFirstError.ts — after a refused submit, put
// focus (and the viewport) on the first invalid control, so a person on a phone
// sees what to fix instead of nothing happening.
'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';

/**
 * Focus and reveal the first invalid control under `root`, in DOM order.
 * Each `[aria-invalid="true"]` candidate is tried until the browser actually
 * moves focus there — invalid controls inside a collapsed section, a hidden
 * tab or a disabled set fail and are skipped. Smooth scroll, instant under
 * prefers-reduced-motion (the same matchMedia idiom as FormDialog's banner
 * scroll). Returns whether focus moved.
 */
export function focusFirstInvalid(root: HTMLElement | null): boolean {
  if (!root || typeof document === 'undefined') return false;
  const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const candidates = root.querySelectorAll('[aria-invalid="true"]');
  for (const el of candidates) {
    if (!(el instanceof HTMLElement)) continue;
    el.focus({ preventScroll: true });
    if (document.activeElement !== el) continue;
    el.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
    return true;
  }
  return false;
}

/**
 * For submit handlers whose errors render asynchronously (setState, then
 * paint): call `refused()` where a direct focus call would read stale DOM.
 * The post-paint effect focuses the first invalid control inside `formRef`.
 */
export function useRefusedSubmit(): { formRef: RefObject<HTMLFormElement | null>; refused: () => void } {
  const formRef = useRef<HTMLFormElement | null>(null);
  const [refusedCount, setRefusedCount] = useState(0);
  useEffect(() => {
    if (refusedCount > 0) focusFirstInvalid(formRef.current);
  }, [refusedCount]);
  return { formRef, refused: () => setRefusedCount(c => c + 1) };
}
