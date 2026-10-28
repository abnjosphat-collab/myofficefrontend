/**
 * @/components/ui-system/motion/presets — every duration and bounce in the app.
 *
 * Springs are described the way Apple describes them (WWDC23 10158): a
 * *perceptual* duration plus a bounce. framer's `visualDuration` is that
 * perceptual duration, and it keeps its velocity when retargeted, so a change
 * of mind mid-animation never jerks. "Calm and precise" means: smooth (bounce
 * 0) almost everywhere, at most 0.1 for press feedback, hard cap 0.15.
 *
 * Linear is non-physical: it appears only in SPIN (the repeating spinner),
 * never for movement and never for fades.
 *
 * `scripts/gen-spring-css.mjs` reads the spring entries below (by regex) and
 * generates the matching CSS `linear()` curves in `tokens.css`, so CSS-only
 * transitions share the same feel with no JS. `presets.test.ts` fails if any
 * value drifts over 0.5 s (except the documented highlight wash) or any
 * bounce over 0.15.
 */
import type { Transition } from 'framer-motion';

/** A duration-based spring: perceptual seconds plus bounce. */
export interface SpringPreset {
  readonly type: 'spring';
  readonly visualDuration: number;
  readonly bounce: number;
}

const spring = (visualDuration: number, bounce: number): SpringPreset => ({
  type: 'spring',
  visualDuration,
  bounce,
});

/**
 * The four springs. smooth is Apple's general-purpose default; gentle is for
 * large surfaces (drawers, zooms); snappy is press feedback and icon swaps;
 * quick is opacity, so a fade finishes before the movement does.
 */
export const SPRING = {
  smooth: spring(0.3, 0),
  gentle: spring(0.45, 0),
  snappy: spring(0.2, 0.1),
  quick: spring(0.15, 0),
} as const satisfies Record<string, SpringPreset>;

export type SpringName = keyof typeof SPRING;

/**
 * FADE: the reduced-motion swap (0.15 s ease-out, never linear). Movement
 * becomes a short crossfade; feedback stays, without travelling.
 */
export const FADE: Transition = { duration: 0.15, ease: 'easeOut' };

/** FADE's duration in seconds, for deriving staggered delays (connecting bars). */
export const FADE_S = 0.15;

/**
 * SPIN: the only linear transition in the app, for the rotate effect
 * (spinners) only. The 0.5 s cap sets the rate: two revolutions per second.
 */
export const SPIN: Transition = { duration: 0.5, ease: 'linear', repeat: Infinity };

/**
 * HIGHLIGHT_WASH_S: how long a freshly arrived row's highlight wash takes to
 * fade out (1.2 s). This is the sole documented exception to the 0.5 s cap: a
 * background fade, not a transition, kept here so presets.ts stays the only
 * place a duration is written. Pinned by `presets.test.ts`.
 */
export const HIGHLIGHT_WASH_S = 1.2;

/**
 * EXPORT_CHECK_MS: how long an export trigger holds the check after the file
 * lands (1.2 s). SAVE_CHECK_MS: how long a form's submit button holds the
 * check before the dialog closes (0.25 s, within the 0.3 s budget). Display
 * holds, not transitions, so outside the 0.5 s cap — but still single-sourced
 * here, so no duration is written anywhere else.
 */
export const EXPORT_CHECK_MS = 1200;
export const SAVE_CHECK_MS = 250;
