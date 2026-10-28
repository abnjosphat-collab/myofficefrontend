'use client';

import { useEffect } from 'react';

/**
 * Repairs a leaked body pointer-events lock. Radix modal overlays (dialog,
 * menu, popover) set body{pointer-events:none} while open and restore it on
 * close — but when one overlay opens in the same tick another closes (a menu
 * item opening a dialog), the close can restore the stale 'none' and the
 * whole page stops receiving clicks. Whenever no overlay is mounted and the
 * body is still locked, unlock it. The check short-circuits on the body's own
 * style, so ordinary renders cost one property read.
 */
export function PointerEventsGuard() {
  useEffect(() => {
    const fix = () => {
      if (document.body.style.pointerEvents !== 'none') return;
      const overlayOpen = document.querySelector(
        '[data-radix-portal] [role="dialog"], [data-radix-portal] [role="alertdialog"], [data-radix-portal] [role="menu"], [data-radix-portal] [role="listbox"]',
      );
      if (!overlayOpen) document.body.style.pointerEvents = '';
    };
    const observer = new MutationObserver(fix);
    observer.observe(document.body, { attributes: true, attributeFilter: ['style'], childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);
  return null;
}
