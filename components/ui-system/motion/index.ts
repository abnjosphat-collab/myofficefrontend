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
export { AnimatedIcon } from './AnimatedIcon';
export type { AnimatedIconEffect, AnimatedIconProps } from './AnimatedIcon';
export { IconSwap } from './IconSwap';
export type { IconSwapProps } from './IconSwap';
export { NumberTransition } from './NumberTransition';
export type { NumberTransitionProps } from './NumberTransition';
export { MotionList, MotionListItem, Presence, presenceMotion, MotionTableBody, MotionTableRow } from './Presence';
export type { MotionListItemProps, MotionListProps, PresenceProps, MotionTableBodyProps, MotionTableRowProps } from './Presence';
export { SlidingIndicator, useSlidingIndicator } from './Indicator';
export type { IndicatorRect, SlidingIndicatorProps } from './Indicator';
export { DrawerDragPanel } from './DrawerDragPanel';
export type { DrawerDragPanelProps } from './DrawerDragPanel';
export { ZoomLink, ZoomTarget, ZoomBoundary, ZoomOverlay } from './Zoom';
export type { ZoomLinkProps, ZoomTargetProps } from './Zoom';
export { registerZoomSource, unregisterZoomSource, markZoomSourceUsed, lookupZoomSource, consumeZoomSource } from './zoomRegistry';
