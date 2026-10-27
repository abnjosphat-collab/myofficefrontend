'use client';

import { MotionConfig } from 'framer-motion';
import type { ReactNode } from 'react';
import { SPRING } from './presets';

/**
 * The one motion switch for the app. Replaces the bare MotionConfig:
 * `reducedMotion="user"` honours the OS setting, and every spring defaults
 * to the smooth preset unless a component passes its own transition.
 *
 * `motion="always"` forces reduced motion under this subtree. Only the
 * /dev/motion gallery's simulated reduce-motion switch uses it (nested
 * MotionConfigs compose, so the gallery preview can simulate the OS setting
 * while the rest of the app follows it).
 */
export function MotionProvider({ children, motion = 'user' }: { children: ReactNode; motion?: 'user' | 'always' }) {
  return (
    <MotionConfig reducedMotion={motion} transition={SPRING.smooth}>
      {children}
    </MotionConfig>
  );
}
