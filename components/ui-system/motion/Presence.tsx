'use client';

import { AnimatePresence, motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { cn } from '../foundations/cn';
import { FADE, HIGHLIGHT_WASH_S, SPRING } from './presets';
import { useIsReducedMotion } from './useMotionSafe';

/**
 * Shared enter/exit choreography for cards and list rows. Enter is fade +
 * 6 px rise (opacity on quick so the fade leads); exit is fade + height
 * collapse, or fade-only for table rows. Pure data, exported for tests and
 * for B4's list migrations.
 */
export const presenceMotion = {
  enter: {
    initial: { opacity: 0, y: 6 },
    animate: { opacity: 1, y: 0 },
    transition: { opacity: SPRING.quick, y: SPRING.smooth },
  },
  enterFadeOnly: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: SPRING.quick,
  },
  exitCollapse: {
    exit: { opacity: 0, height: 0 },
    transition: { opacity: SPRING.quick, height: SPRING.smooth },
  },
  exitFadeOnly: {
    exit: { opacity: 0 },
    transition: SPRING.quick,
  },
};

/** Opacity-only wash for freshly arrived rows (both motion modes; never a transform). */
function HighlightWash() {
  return (
    <motion.span
      aria-hidden="true"
      data-testid="motion-highlight-wash"
      className="pointer-events-none absolute inset-0 rounded-[inherit] bg-action-soft"
      initial={{ opacity: 0.7 }}
      animate={{ opacity: 0 }}
      transition={{ ...FADE, duration: HIGHLIGHT_WASH_S }}
    />
  );
}

export interface PresenceProps {
  /** Whether the content is showing. */
  visible: boolean;
  children: ReactNode;
  className?: string;
  /** Swap key for content that stays visible but changes phase (DataRegion's loading↔settled crossfade). A key change exits the old phase before the new one enters. */
  swapKey?: string | number;
  /** Fade only, no rise or collapse (DataRegion's skeleton→content crossfade). */
  fadeOnly?: boolean;
}

/**
 * Enter/exit for one conditional block (bulk bar, badge, chip): fade + 6 px
 * rise in, fade + collapse out. Under reduced motion the block appears and
 * disappears instantly.
 */
export function Presence({ visible, children, className, swapKey = 'content', fadeOnly = false }: PresenceProps) {
  const reduce = useIsReducedMotion();
  const enter = fadeOnly ? presenceMotion.enterFadeOnly : presenceMotion.enter;
  const exit = fadeOnly ? presenceMotion.exitFadeOnly : presenceMotion.exitCollapse;
  if (reduce) {
    return visible ? <>{children}</> : null;
  }
  return (
    <AnimatePresence initial={false} mode="wait">
      {visible && (
        <motion.div
          key={swapKey}
          data-testid="motion-presence"
          className={className}
          style={fadeOnly ? undefined : { overflow: 'hidden' }}
          initial={enter.initial}
          animate={enter.animate}
          exit={exit.exit}
          transition={{ ...enter.transition, ...exit.transition }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export interface MotionListProps {
  children: ReactNode;
  className?: string;
}

/**
 * A list whose rows enter with fade + 6 px rise and leave with fade +
 * collapse. No enter cascade on first paint (`initial={false}`): page
 * navigation never animates. Under reduced motion rows add and remove
 * instantly. For lists of ~100 items or fewer (the height collapse is the
 * one non-transform animation, and it stays cheap at that size).
 */
export function MotionList({ children, className }: MotionListProps) {
  const reduce = useIsReducedMotion();
  if (reduce) {
    return <div className={className}>{children}</div>;
  }
  return (
    <div className={className}>
      <AnimatePresence initial={false}>{children}</AnimatePresence>
    </div>
  );
}

export interface MotionListItemProps {
  children: ReactNode;
  className?: string;
  /** The row just arrived (background refresh): an opacity-only wash fades out over 1.2 s. */
  highlight?: boolean;
  /** Collapse the row's height on exit (default true). False = fade only, for DataTable rows, which stay crisp. */
  collapse?: boolean;
}

/** One row inside a MotionList. Key it by record id so exits track the right row. */
export function MotionListItem({ children, className, highlight = false, collapse = true }: MotionListItemProps) {
  const reduce = useIsReducedMotion();
  const enter = collapse ? presenceMotion.enter : presenceMotion.enterFadeOnly;
  const exit = collapse ? presenceMotion.exitCollapse : presenceMotion.exitFadeOnly;
  if (reduce) {
    return (
      <div className={cn('relative', className)}>
        {highlight ? <HighlightWash key="wash" /> : null}
        {children}
      </div>
    );
  }
  return (
    <motion.div
      data-testid="motion-list-item"
      className={cn('relative', className)}
      style={collapse ? { overflow: 'hidden' } : undefined}
      initial={enter.initial}
      animate={enter.animate}
      exit={exit.exit}
      transition={{ ...enter.transition, ...exit.transition }}
    >
      {highlight ? <HighlightWash key="wash" /> : null}
      {children}
    </motion.div>
  );
}
