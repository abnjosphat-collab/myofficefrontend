'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Children, cloneElement, isValidElement, useRef, type Key, type ReactElement, type ReactNode } from 'react';
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
  /** List element, so card grids keep `ul` semantics. Default `div`. */
  as?: 'div' | 'ul' | 'ol';
  /**
   * Calm key: the page's filter/sort/page signature. When it changes the
   * boundary remounts, so filtering, sorting and paging never animate —
   * only data changes (background refresh, mutations) enter and exit.
   */
  calmKey?: string | number;
}

/**
 * A list whose rows enter with fade + 6 px rise and leave with fade +
 * collapse. Rows that arrive after first paint (a background refresh) also
 * get the highlight wash, by key — so key items by record id, never by
 * index. No enter cascade on first paint (`initial={false}`): page
 * navigation never animates. Under reduced motion rows add and remove
 * instantly (the wash still fades: it is opacity-only). For lists of ~100
 * items or fewer (the height collapse is the one non-transform animation,
 * and it stays cheap at that size).
 */
export function MotionList({ children, className, as = 'div', calmKey }: MotionListProps) {
  const reduce = useIsReducedMotion();
  // Keys seen so far, set on first paint. Anything new later arrived with
  // the data and gets the wash. (Render-phase ref write: StrictMode renders
  // twice with the same children, so both passes agree.)
  const seen = useRef<Set<Key | null> | null>(null);
  const lastCalm = useRef(calmKey);
  const keys = Children.toArray(children).map(child => (isValidElement(child) ? (child.key ?? null) : null));
  // A calm-key change (new filters, sort or page) starts the list over: rows
  // it reveals are not "new arrivals" and get no wash.
  if (lastCalm.current !== calmKey) {
    lastCalm.current = calmKey;
    seen.current = new Set(keys);
  }
  if (seen.current === null) seen.current = new Set(keys);
  const fresh = new Set<Key | null>();
  for (const key of keys) {
    if (!seen.current.has(key)) fresh.add(key);
  }
  seen.current = new Set(keys);
  const items = Children.toArray(children).map(child => {
    if (!isValidElement(child) || child.type !== MotionListItem) return child;
    const key = child.key ?? null;
    if (!fresh.has(key)) return child;
    return cloneElement(child as ReactElement<MotionListItemProps>, { highlight: true });
  });
  const List = as;
  if (reduce) {
    return <List className={className}>{items}</List>;
  }
  return (
    <List className={className}>
      <AnimatePresence key={calmKey ?? 'live'} initial={false}>{items}</AnimatePresence>
    </List>
  );
}

export interface MotionListItemProps {
  children: ReactNode;
  className?: string;
  /** The list element for this row, matching the parent (`li` under `ul`). Default `div`. */
  as?: 'div' | 'li';
  /** The row just arrived (background refresh): an opacity-only wash fades out over 1.2 s. MotionList sets this by key; pass it directly only outside a MotionList. */
  highlight?: boolean;
  /** Collapse the row's height on exit (default true). False = fade only, for DataTable rows, which stay crisp. */
  collapse?: boolean;
}

/** One row inside a MotionList. Key it by record id so exits track the right row. */
export function MotionListItem({ children, className, as = 'div', highlight = false, collapse = true }: MotionListItemProps) {
  const reduce = useIsReducedMotion();
  const enter = collapse ? presenceMotion.enter : presenceMotion.enterFadeOnly;
  const exit = collapse ? presenceMotion.exitCollapse : presenceMotion.exitFadeOnly;
  if (reduce) {
    const Item = as;
    return (
      <Item className={cn('relative', className)}>
        {highlight ? <HighlightWash key="wash" /> : null}
        {children}
      </Item>
    );
  }
  const Item = motion[as];
  return (
    <Item
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
    </Item>
  );
}

export interface MotionTableBodyProps {
  children: ReactNode;
  className?: string;
  /**
   * Calm key: the page's filter/sort/page signature. When it changes the
   * boundary remounts, so filtering, sorting and paging never animate.
   */
  stillKey?: string | number;
}

/**
 * The AnimatePresence boundary for a table body: rows fade in and out on
 * data changes only (background refresh, mutations). `initial={false}`: no
 * cascade on first paint. Renders a plain tbody under reduced motion.
 */
export function MotionTableBody({ children, className, stillKey }: MotionTableBodyProps) {
  const reduce = useIsReducedMotion();
  if (reduce) {
    return <tbody className={className}>{children}</tbody>;
  }
  return (
    <tbody className={className}>
      <AnimatePresence key={stillKey ?? 'live'} initial={false}>{children}</AnimatePresence>
    </tbody>
  );
}

export interface MotionTableRowProps {
  children: ReactNode;
  className?: string;
  onClick?: (event: React.MouseEvent<HTMLTableRowElement>) => void;
  [key: `data-${string}`]: unknown;
}

/**
 * One table row: fades in on add, fades out on remove, never a layout
 * animation (tables stay crisp). Key the row — or its fragment — by record
 * id so exits track the right row. No highlight wash: a tr cannot host the
 * overlay, so the fade-in IS the insert motion.
 */
export function MotionTableRow({ children, className, onClick, ...rest }: MotionTableRowProps) {
  const reduce = useIsReducedMotion();
  if (reduce) {
    return <tr className={className} onClick={onClick} {...rest}>{children}</tr>;
  }
  return (
    <motion.tr
      data-testid="motion-table-row"
      className={className}
      onClick={onClick}
      {...rest}
      initial={presenceMotion.enterFadeOnly.initial}
      animate={presenceMotion.enterFadeOnly.animate}
      exit={presenceMotion.exitFadeOnly.exit}
      transition={presenceMotion.enterFadeOnly.transition}
    >
      {children}
    </motion.tr>
  );
}
