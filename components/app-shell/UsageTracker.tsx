// components/app-shell/UsageTracker.tsx — invisible client component mounted once in
// AppShell. Records a page_view (with dwell time) each time the route changes, plus a
// final flush when the tab is hidden/closed, feeding lib/usage's analytics store.
'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { trackPageView } from '@/lib/usage';

export function UsageTracker() {
  const pathname = usePathname();
  const enterRef = useRef<number>(Date.now());
  const pathRef = useRef<string>(pathname);

  // On path change: flush the previous page's dwell, then start the clock for the new one.
  useEffect(() => {
    const prev = pathRef.current;
    const dwell = Date.now() - enterRef.current;
    if (prev) trackPageView(prev, dwell);
    pathRef.current = pathname;
    enterRef.current = Date.now();
  }, [pathname]);

  // Flush the current page's dwell when the tab is hidden or unloaded (so time spent
  // on the last page before leaving isn't lost). Reset the clock on re-show.
  useEffect(() => {
    const flush = () => {
      const dwell = Date.now() - enterRef.current;
      if (dwell > 500) trackPageView(pathRef.current, dwell);
      enterRef.current = Date.now();
    };
    const onVisibility = () => { if (document.visibilityState === 'hidden') flush(); };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', flush);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', flush);
    };
  }, []);

  return null;
}
