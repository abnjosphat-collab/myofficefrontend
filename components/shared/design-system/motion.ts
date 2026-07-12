// components/shared/design-system/motion.ts — named Framer Motion variants.
// See MyOffice-Design-System.docx Section 4 for the exact numbers and where each
// pattern is used; keep this file as the single source for those values so a
// future tweak doesn't require hunting through every consumer component.
import type { Variants } from 'framer-motion';

// Cubic-bezier easings declared as fixed 4-number tuples. This matters: a bare
// array literal `[0.22, 1, 0.36, 1]` is inferred as `number[]`, which is NOT
// assignable to framer-motion's `Easing`/`BezierDefinition` — a `next build`
// (strict tsc) fails on it with a "not assignable to type 'Variants'" error even
// though `next dev` tolerates it. Typing these as tuples fixes the whole family
// of that error at the source. Reuse these instead of inlining `ease: [...]`.
export const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];
export const EASE_SOFT: [number, number, number, number] = [0.16, 1, 0.3, 1];

/** Default entrance stagger for sibling cards/list items revealing on mount. */
export const staggerContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE_OUT } },
};

/** Slow "emerge from below" used by AnimatedText — descriptive copy, not UI chrome.
 * Fades in while sliding up a short distance, deliberately unhurried so the motion
 * itself reads as a moment rather than a flicker. Delay is tuned to start just as
 * GlowCard's immediate lift (~0.2s, see primitives.tsx) finishes — the card should
 * visibly move first, then the text emerges, not both firing at once. */
export const fadeTextVariant: Variants = {
  rest: { opacity: 0, y: 8 },
  hover: { opacity: 1, y: 0, transition: { duration: 1.1, delay: 0.25, ease: EASE_SOFT } },
};

/** Icon micro-pop used inside info-display card tiles (module cards, quick-view header). */
export const tileIconItem: Variants = {
  rest: { scale: 1 },
  hover: { scale: 1.08, transition: { duration: 0.25, ease: EASE_OUT } },
};

/** Staggered reveal for the title/metric/description block inside an info-display card. */
export const tileTextContainer: Variants = {
  rest: {},
  hover: { transition: { staggerChildren: 0.06, delayChildren: 0.02 } },
};

export const tileTextItem: Variants = {
  rest: { opacity: 0.8, y: 0 },
  hover: { opacity: 1, y: -2, transition: { duration: 0.28, ease: EASE_OUT } },
};

/** Spring pop-in entrance for PulsingIcon. */
export const iconPop: Variants = {
  hidden: { scale: 0.5, rotate: -8, opacity: 0 },
  show: { scale: 1, rotate: 0, opacity: 1, transition: { type: 'spring', stiffness: 260, damping: 16, delay: 0.15 } },
};
