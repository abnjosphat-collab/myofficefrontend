// components/shared/design-system/motion.ts — named Framer Motion variants.
// See MyOffice-Design-System.docx Section 4 for the exact numbers and where each
// pattern is used; keep this file as the single source for those values so a
// future tweak doesn't require hunting through every consumer component.

/** Default entrance stagger for sibling cards/list items revealing on mount. */
export const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

export const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
};

/** Slow "emerge from below" used by AnimatedText — descriptive copy, not UI chrome.
 * Fades in while sliding up a short distance, deliberately unhurried so the motion
 * itself reads as a moment rather than a flicker. Delay is tuned to start just as
 * GlowCard's immediate lift (~0.2s, see primitives.tsx) finishes — the card should
 * visibly move first, then the text emerges, not both firing at once. */
export const fadeTextVariant = {
  rest: { opacity: 0, y: 8 },
  hover: { opacity: 1, y: 0, transition: { duration: 1.1, delay: 0.25, ease: [0.16, 1, 0.3, 1] } },
};

/** Icon micro-pop used inside info-display card tiles (module cards, quick-view header). */
export const tileIconItem = {
  rest: { scale: 1 },
  hover: { scale: 1.08, transition: { duration: 0.25, ease: [0.22, 1, 0.36, 1] } },
};

/** Staggered reveal for the title/metric/description block inside an info-display card. */
export const tileTextContainer = {
  rest: {},
  hover: { transition: { staggerChildren: 0.06, delayChildren: 0.02 } },
};

export const tileTextItem = {
  rest: { opacity: 0.8, y: 0 },
  hover: { opacity: 1, y: -2, transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] } },
};

/** Spring pop-in entrance for PulsingIcon. */
export const iconPop = {
  hidden: { scale: 0.5, rotate: -8, opacity: 0 },
  show: { scale: 1, rotate: 0, opacity: 1, transition: { type: 'spring' as const, stiffness: 260, damping: 16, delay: 0.15 } },
};
