'use client';

import { motion, useAnimate } from 'framer-motion';
import { useEffect, useRef } from 'react';
import { Icon, type IconSize, type IconContextWeight } from '../foundations/Icon';
import type { IconMeaning } from '../foundations/icon-meanings';
import { FADE, FADE_S, SPIN, SPRING } from './presets';
import { useIsReducedMotion } from './useMotionSafe';

/**
 * Discrete effects fire once when `trigger` changes; indefinite effects run
 * while `active` is true; appear/disappear are presence (opacity-only).
 *
 * Effect meanings (one meaning per effect, applied everywhere):
 * - bounce (once): it happened, or it arrived
 * - wiggle (once): a next step you might overlook
 * - pulse (while true): ongoing activity
 * - rotate (while true): a task in progress (spinners only)
 * - connecting (while true): trying to reach the server
 * - scale (while selected): this is the selected one (persists while selected)
 * - replace: see IconSwap (the state of this control flipped)
 * - appear/disappear: it came or went
 */
export type AnimatedIconEffect =
  | 'bounce' | 'wiggle'
  | 'pulse' | 'rotate' | 'scale' | 'connecting'
  | 'appear' | 'disappear';

export interface AnimatedIconProps {
  /** The semantic glyph (meanings stay one-per-glyph). */
  name: IconMeaning;
  /** Which effect family. */
  effect: AnimatedIconEffect;
  /** Discrete effects replay when this changes (never on mount). */
  trigger?: unknown;
  /** Indefinite effects run while true. */
  active?: boolean;
  /** Discrete effects only: extra repeats after the first play. Must be finite — never "forever". */
  repeat?: number;
  size?: IconSize | number;
  weight?: IconContextWeight;
  className?: string;
  /** Accessible name. Omit for decorative icons (the default: aria-hidden). */
  label?: string;
}

/**
 * Discrete choreography as chained two-frame springs. framer springs animate
 * at most two keyframes, so a bounce is "out then back" and a wiggle is four
 * swings; each leg is a real preset spring, which also keeps a re-fire
 * mid-flight smooth (stop the old chain, start a new one — never a jerk).
 */
const DISCRETE_FRAMES: Record<'bounce' | 'wiggle', Array<Record<string, number>>> = {
  bounce: [{ scale: 1.2 }, { scale: 1 }],
  wiggle: [{ rotate: -12 }, { rotate: 10 }, { rotate: -6 }, { rotate: 0 }],
};

/** Finite repeat count; non-finite ("forever") is clamped to a single play. */
function finiteRepeat(repeat: number | undefined): number {
  if (repeat === undefined) return 0;
  if (!Number.isFinite(repeat)) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('AnimatedIcon: repeat must be a finite count, never "forever" for discrete effects.');
    }
    return 0;
  }
  return Math.max(0, Math.floor(repeat));
}

function DiscreteIcon({ name, effect, trigger, repeat, size, weight, className, label }: AnimatedIconProps & { effect: 'bounce' | 'wiggle' }) {
  const [scope, animate] = useAnimate();
  // Restraint: fire only when `trigger` changes from a previous value — never
  // on mount, including a StrictMode double-invoked mount (a boolean "mounted"
  // flag fires on the second pass, so the previous value is compared instead).
  const prev = useRef(trigger);
  const running = useRef<{ stop: () => void } | null>(null);
  const times = finiteRepeat(repeat);
  useEffect(() => {
    if (prev.current === trigger) return;
    prev.current = trigger;
    let cancelled = false;
    running.current?.stop();
    const run = async () => {
      for (let r = 0; r <= times && !cancelled; r++) {
        for (const frame of DISCRETE_FRAMES[effect]) {
          if (cancelled) return;
          const controls = animate(scope.current, frame, SPRING.snappy);
          running.current = controls;
          // Sequencing choreography, not app logic: nothing downstream waits
          // on completion. A stopped chain rejects or dangles; both are fine.
          try {
            await controls;
          } catch {
            return;
          }
        }
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [trigger]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <span ref={scope} className={className} data-motion-effect={effect} style={{ display: 'inline-flex' }}>
      <Icon name={name} size={size} weight={weight} label={label} />
    </span>
  );
}

function ConnectingBars({ active, size }: { active: boolean; size: IconSize | number | undefined }) {
  const px = typeof size === 'number' ? size : 18;
  const bars = [0, 1, 2];
  return (
    <svg width={px} height={px} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" data-testid="connecting-bars">
      {bars.map(i => (
        active ? (
          <motion.rect
            key={i}
            x={4 + i * 6}
            y={5}
            width={4}
            height={14}
            rx={2}
            initial={{ opacity: 0.35 }}
            animate={{ opacity: [0.35, 1] }}
            transition={{ ...FADE, repeat: Infinity, repeatType: 'mirror' as const, delay: i * FADE_S }}
          />
        ) : (
          <rect key={i} x={4 + i * 6} y={5} width={4} height={14} rx={2} />
        )
      ))}
    </svg>
  );
}

/**
 * An icon with one Apple-meaning effect. Discrete effects
 * (`<AnimatedIcon name="bell" effect="bounce" trigger={count} />`) fire when
 * `trigger` changes; indefinite effects
 * (`<AnimatedIcon name="sync" effect="pulse" active={uploading} />`) run
 * while `active` is true. Under reduced motion every effect renders the
 * static icon (indefinite effects stop; nothing transforms).
 */
export function AnimatedIcon(props: AnimatedIconProps) {
  const { name, effect, active = false, size, weight, className, label } = props;
  const reduce = useIsReducedMotion();

  if (reduce) {
    if (effect === 'connecting') {
      return (
        <span className={className} data-motion-effect={effect} style={{ display: 'inline-flex' }}>
          <ConnectingBars active={false} size={size} />
        </span>
      );
    }
    // appear/disappear are opacity-only, so they are safe in both modes.
    if (effect === 'appear' || effect === 'disappear') {
      return (
        <motion.span
          className={className}
          data-motion-effect={effect}
          style={{ display: 'inline-flex' }}
          initial={effect === 'appear' ? { opacity: 0 } : false}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={FADE}
        >
          <Icon name={name} size={size} weight={weight} label={label} />
        </motion.span>
      );
    }
    return <Icon name={name} size={size} weight={weight} label={label} />;
  }

  if (effect === 'bounce' || effect === 'wiggle') {
    return <DiscreteIcon {...props} effect={effect} />;
  }
  if (effect === 'appear' || effect === 'disappear') {
    return (
      <motion.span
        className={className}
        data-motion-effect={effect}
        style={{ display: 'inline-flex' }}
        initial={effect === 'appear' ? { opacity: 0 } : false}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={FADE}
      >
        <Icon name={name} size={size} weight={weight} label={label} />
      </motion.span>
    );
  }
  if (effect === 'connecting') {
    return (
      <span className={className} data-motion-effect={effect} style={{ display: 'inline-flex' }}>
        <ConnectingBars active={active} size={size} />
      </span>
    );
  }
  // Loops mirror between two frames (springs animate at most two keyframes).
  const animate = effect === 'pulse'
    ? active ? { scale: [1, 1.08] } : { scale: 1 }
    : effect === 'rotate'
      ? active ? { rotate: 360 } : { rotate: 0 }
      : { scale: active ? 1.08 : 1 }; // scale persists while selected
  const transition = effect === 'pulse'
    ? active ? { ...SPRING.smooth, repeat: Infinity, repeatType: 'mirror' as const } : SPRING.smooth
    : effect === 'rotate'
      ? active ? SPIN : FADE
      : SPRING.smooth;
  return (
    <motion.span
      className={className}
      data-motion-effect={effect}
      style={{ display: 'inline-flex' }}
      initial={false}
      animate={animate}
      transition={transition}
    >
      <Icon name={name} size={size} weight={weight} label={label} />
    </motion.span>
  );
}
