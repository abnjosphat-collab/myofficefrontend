'use client';

import { useEffect, useState } from 'react';
import { Toaster } from 'sonner';
import { AnimatedIcon } from '../motion/AnimatedIcon';

/**
 * The error toast's icon wiggles once. Discrete effects fire on trigger
 * change, never on mount — so the icon bumps a local trigger after mount
 * and the wiggle runs exactly once.
 */
export function ToastErrorIcon() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    setTick(1);
  }, []);
  return <AnimatedIcon name="error" effect="wiggle" trigger={tick} />;
}

/**
 * The app's toast stack, configured through sonner's own options (no fork,
 * no new package). Toasts enter from the bottom edge and the stack re-flows
 * on sonner's own springs; swipe-to-dismiss keeps the release velocity.
 * The success/info/warning icons appear once; the error icon wiggles once.
 * Reduced motion collapses to sonner's instant path (no travelling).
 */
export function MotionToaster() {
  return (
    <Toaster
      position="bottom-center"
      richColors
      expand
      gap={8}
      swipeDirections={['bottom', 'left', 'right']}
      toastOptions={{
        duration: 4000,
        style: {
          fontFamily: 'var(--mo-font-body)',
          border: '1px solid var(--mo-line)',
          boxShadow: 'var(--mo-shadow-popover)',
        },
      }}
      icons={{
        success: <AnimatedIcon name="success" effect="appear" />,
        info: <AnimatedIcon name="info" effect="appear" />,
        warning: <AnimatedIcon name="warning" effect="appear" />,
        error: <ToastErrorIcon />,
      }}
    />
  );
}
