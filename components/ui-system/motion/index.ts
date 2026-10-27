/**
 * @/components/ui-system/motion — the one motion layer for MyOffice.
 * All framer-motion use goes through this folder (enforced by
 * `local/no-framer-outside-motion` and `scripts/motion-consistency.mjs`).
 * Feel: "calm and precise" — smooth springs, no visible bounce, under 0.5 s,
 * motion only where it explains something. See the UI system README's
 * "Motion" section for the rules and the effect-meaning matrix.
 */
export { FADE, FADE_S, HIGHLIGHT_WASH_S, SPIN, SPRING } from './presets';
export type { SpringName, SpringPreset } from './presets';
export { MotionProvider } from './MotionProvider';
export { useIsReducedMotion, useMotionSafe } from './useMotionSafe';
