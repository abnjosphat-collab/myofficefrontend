'use client';

import { useEffect } from 'react';

/**
 * Repairs a leaked body pointer-events lock. Radix modal overlays (dialog,
 * menu, popover) set body{pointer-events:none} while open and restore it on
 * close — but when one overlay opens in the same tick another closes (a menu
 * item opening a dialog), the close can restore the stale 'none' and the
 * whole page stops receiving clicks. Whenever no overlay is mounted and the
 * body is still locked, unlock it. Radix portals do not render a wrapper;
 * content carries role + data-state. Include closing content until it unmounts,
 * since exit animations retain the dismissable layer. Plain inline listboxes
 * lack data-state and must not keep an orphaned lock alive. The check
 * short-circuits on the body's own style.
 */
export function PointerEventsGuard() {
  useEffect(() => {
    const fix = () => {
      if (document.body.style.pointerEvents !== 'none') return;
      const overlayOpen = document.querySelector(
        '[data-state]:is([role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"])',
      );
      if (!overlayOpen) document.body.style.pointerEvents = '';
    };
    const observer = new MutationObserver(fix);
    observer.observe(document.body, { attributes: true, attributeFilter: ['style'], childList: true, subtree: true });
    fix(); // a previous route may already have leaked a lock before mount
    return () => observer.disconnect();
  }, []);
  return null;
}
