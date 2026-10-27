'use client';

import { useReducedMotion, type Transition } from 'framer-motion';
import { FADE, SPRING, type SpringPreset } from './presets';

/**
 * True when motion must be reduced. framer reports `null` before it knows
 * (SSR, first render); unknown counts as reduced, so the first paint never
 * animates something the OS asked to keep still.
 */
export function useIsReducedMotion(): boolean {
  return useReducedMotion() !== false;
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
