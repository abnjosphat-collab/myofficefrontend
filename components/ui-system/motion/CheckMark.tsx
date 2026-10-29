'use client';

import { motion } from 'framer-motion';
import { SPRING } from './presets';
import { useIsReducedMotion } from './useMotionSafe';

export interface CheckMarkProps {
  /** Whether the box is checked. The tick draws on and off in reverse. */
  checked: boolean;
  /** Indeterminate state: the dash scales from the centre instead of the tick. */
  indeterminate?: boolean;
  size?: number;
  className?: string;
}

/**
 * The selection tick: it draws on with the stroke (snappy, about 0.15 s)
 * and draws off in reverse. The indeterminate dash scales from the centre.
 * Under reduced motion the mark appears instantly. Replaces instant
 * opacity-swapped check glyphs in Checkbox, ChoiceCards and the checklists.
 */
export function CheckMark({ checked, indeterminate = false, size = 18, className }: CheckMarkProps) {
  const reduce = useIsReducedMotion();
  const show = checked || indeterminate;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      data-testid="checkmark"
      data-state={indeterminate ? 'indeterminate' : checked ? 'checked' : 'unchecked'}
      className={className}
    >
      {indeterminate ? (
        reduce ? (
          <line x1="6" y1="12" x2="18" y2="12" />
        ) : (
          <motion.line
            x1="6"
            y1="12"
            x2="18"
            y2="12"
            data-testid="checkmark-dash"
            initial={false}
            animate={{ scaleX: show ? 1 : 0 }}
            style={{ originX: 0.5 }}
            transition={SPRING.snappy}
          />
        )
      ) : reduce ? (
        show ? <path d="M5 12.5l4.5 4.5L19 7.5" data-testid="checkmark-tick" /> : null
      ) : (
        <motion.path
          d="M5 12.5l4.5 4.5L19 7.5"
          data-testid="checkmark-tick"
          initial={false}
          animate={{ pathLength: show ? 1 : 0, opacity: show ? 1 : 0 }}
          transition={SPRING.snappy}
        />
      )}
    </svg>
  );
}
