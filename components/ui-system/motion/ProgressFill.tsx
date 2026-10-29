'use client';

import { motion } from 'framer-motion';
import { SPRING } from './presets';
import { useIsReducedMotion } from './useMotionSafe';

export interface ProgressFillProps {
  /** Completion 0..1 (clamped). Ignored while indeterminate. */
  fraction: number;
  variant?: 'bar' | 'ring';
  /** Ring diameter / stroke (ring only). */
  size?: number;
  stroke?: number;
  /** Fill colour (defaults to the action token for bars, caller's accent for rings). */
  accent?: string;
  /** Accessible label for the ring's role="img". The bar variant stays a decorative fill inside the caller's progressbar. */
  label?: string;
  /** Ongoing but unmeasurable work: a calm opacity pulse (the `pulse` meaning), never a sliding shimmer. */
  indeterminate?: boolean;
  className?: string;
  children?: React.ReactNode;
}

/**
 * Fill that moves by transform, never by width: bars scale on X from the
 * left edge (smooth, never overshooting), rings sweep stroke-dashoffset on
 * the same spring. The percentage itself rolls through NumberTransition at
 * the call site. Indeterminate work pulses calmly. Under reduced motion the
 * value sits in place and nothing pulses. Replaces `Progress`'s width
 * transition, the floor `Ring` and upload progress bars.
 */
export function ProgressFill({ fraction, variant = 'bar', size = 64, stroke = 6, accent, label, indeterminate = false, className, children }: ProgressFillProps) {
  const reduce = useIsReducedMotion();
  const clamped = Math.max(0, Math.min(1, fraction));

  if (variant === 'ring') {
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;
    return (
      <div role="img" aria-label={label} data-testid="progressfill" data-variant="ring" className={`relative grid shrink-0 place-items-center ${className ?? ''}`} style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden="true">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--mo-surface-muted)" strokeWidth={stroke} />
          {reduce || indeterminate ? (
            <circle
              cx={size / 2} cy={size / 2} r={r} fill="none" stroke={accent} strokeWidth={stroke} strokeLinecap="round"
              strokeDasharray={c} strokeDashoffset={indeterminate ? c * 0.25 : c * (1 - clamped)}
              opacity={indeterminate && !reduce ? 0.7 : 1}
            />
          ) : (
            <motion.circle
              cx={size / 2} cy={size / 2} r={r} fill="none" stroke={accent} strokeWidth={stroke} strokeLinecap="round"
              strokeDasharray={c}
              data-testid="progressfill-ring"
              initial={false}
              animate={{ strokeDashoffset: c * (1 - clamped) }}
              transition={SPRING.smooth}
            />
          )}
        </svg>
        <div className="absolute inset-0 grid place-items-center">{children}</div>
      </div>
    );
  }

  if (reduce) {
    return (
      <div data-testid="progressfill" data-variant="bar" className={className} style={{ transform: indeterminate ? undefined : `scaleX(${clamped})`, transformOrigin: 'left center', opacity: 1 }}>
        {children}
      </div>
    );
  }
  if (indeterminate) {
    return (
      <motion.div
        data-testid="progressfill" data-variant="bar" data-state="indeterminate"
        className={className}
        initial={{ opacity: 0.45 }}
        animate={{ opacity: [0.45, 1] }}
        transition={{ ...SPRING.smooth, repeat: Infinity, repeatType: 'mirror' as const }}
      >
        {children}
      </motion.div>
    );
  }
  return (
    <motion.div
      data-testid="progressfill" data-variant="bar"
      className={className}
      initial={false}
      animate={{ scaleX: clamped }}
      style={{ transformOrigin: 'left center' }}
      transition={SPRING.smooth}
    >
      {children}
    </motion.div>
  );
}
