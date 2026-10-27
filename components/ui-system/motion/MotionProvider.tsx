'use client';

import { MotionConfig } from 'framer-motion';
import type { ReactNode } from 'react';
import { SPRING } from './presets';

/**
 * The one motion switch for the app. Replaces the bare MotionConfig:
 * `reducedMotion="user"` honours the OS setting, and every spring defaults
 * to the smooth preset unless a component passes its own transition.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user" transition={SPRING.smooth}>
      {children}
    </MotionConfig>
  );
}
