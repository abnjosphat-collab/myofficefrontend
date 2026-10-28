'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Icon, type IconSize, type IconContextWeight } from '../foundations/Icon';
import type { IconMeaning } from '../foundations/icon-meanings';
import { SPRING } from './presets';
import { useIsReducedMotion } from './useMotionSafe';

export interface IconSwapProps {
  /** The icon before the state flips. In `slash` mode this glyph stays put. */
  from: IconMeaning;
  /** The icon after the state flips. In `slash` mode it names the slashed meaning. */
  to: IconMeaning;
  /** Whether the flipped state is showing. */
  swapped: boolean;
  /** The control's current accessible name (the caller derives it from state). Rendered sr-only, so the owning control's name follows the state. Omit it on Buttons and IconButtons, which already carry the name. */
  label?: string;
  /** Replace direction: down-up after an input (default), up-up for forward progress. */
  direction?: 'down-up' | 'up-up';
  /** Magic replace for slash pairs (mute, hide): the base glyph stays and a slash draws on or off instead of swapping the whole icon. */
  slash?: boolean;
  size?: IconSize | number;
  weight?: IconContextWeight;
  className?: string;
}

/**
 * A content transition between two meanings on the same control (download →
 * pending → success, mute ↔ unmute, copy → copied). The new icon always
 * rises in; the old one leaves downward (down-up, after an input) or upward
 * (up-up, for forward progress). Under reduced motion the icon changes
 * instantly — the accessible name always follows the state.
 */
export function IconSwap({ from, to, swapped, label = '', direction = 'down-up', slash = false, size, weight, className }: IconSwapProps) {
  const reduce = useIsReducedMotion();
  const px = typeof size === 'number' ? size : 18;

  if (slash) {
    return (
      <span className={className} data-motion-swap="slash" style={{ display: 'inline-flex', position: 'relative' }}>
        <span aria-hidden="true" style={{ display: 'inline-flex', position: 'relative' }}>
          <Icon name={from} size={size} weight={weight} />
          {reduce || !swapped ? (
            swapped ? (
              <svg width={px} height={px} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true" style={{ position: 'absolute', inset: 0 }}>
                <line x1={6} y1={18} x2={18} y2={6} />
              </svg>
            ) : null
          ) : (
            <svg width={px} height={px} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true" style={{ position: 'absolute', inset: 0 }}>
              <motion.line x1={6} y1={18} x2={18} y2={6} initial={false} animate={{ pathLength: swapped ? 1 : 0 }} transition={SPRING.snappy} />
            </svg>
          )}
        </span>
        <span className="sr-only">{label}</span>
      </span>
    );
  }

  if (reduce) {
    return (
      <span className={className} data-motion-swap="replace" style={{ display: 'inline-flex' }}>
        <Icon name={swapped ? to : from} size={size} weight={weight} />
        <span className="sr-only">{label}</span>
      </span>
    );
  }

  return (
    <span className={className} data-motion-swap="replace" style={{ display: 'inline-flex' }}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={swapped ? 'to' : 'from'}
          aria-hidden="true"
          style={{ display: 'inline-flex' }}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: direction === 'up-up' ? -6 : 6 }}
          transition={SPRING.snappy}
        >
          <Icon name={swapped ? to : from} size={size} weight={weight} />
        </motion.span>
      </AnimatePresence>
      <span className="sr-only">{label}</span>
    </span>
  );
}
