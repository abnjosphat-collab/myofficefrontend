'use client';

import { useReducedMotionConfig, type Transition } from 'framer-motion';
import { FADE, SPRING, type SpringPreset } from './presets';

/**
 * True when motion must be reduced. Uses framer's config-aware hook (not
 * `useReducedMotion`, which reads only the OS setting and ignores
 * MotionConfig): the /dev/motion gallery's simulated reduce-motion switch
 * nests `motion="always"`, and every piece below must honour it. Outside any
 * provider the OS setting decides.
 */
export function useIsReducedMotion(): boolean {
  return useReducedMotionConfig() !== false;
}

/**
 * The transition a component should use: its preset normally, FADE when
 * reduced motion is on (or still unknown). Movement becomes a short
 * crossfade; feedback stays, without travelling.
 */
export function useMotionSafe(preset: SpringPreset = SPRING.smooth): Transition {
  const reduce = useIsReducedMotion();
  return reduce ? FADE : preset;
}
