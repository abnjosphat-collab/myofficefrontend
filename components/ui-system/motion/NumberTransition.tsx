'use client';

import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useEffect } from 'react';
import { cn } from '../foundations/cn';
import { SPRING } from './presets';
import { useIsReducedMotion } from './useMotionSafe';

export interface NumberTransitionProps {
  /** The value to show. Non-finite values render as "—" (not available). */
  value: number;
  /** Digits after the decimal point. Default 0. */
  decimals?: number;
  /** Static text before the number (currency symbol, "n of"…). */
  prefix?: string;
  /** Static text after the number (units, "%"). */
  suffix?: string;
  /** Screen-reader text. Defaults to the full formatted value. Announced once — never every tick. */
  label?: string;
  className?: string;
}

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

/**
 * One rolling digit column: a strip of 0–9 translated with a motion value,
 * so the roll writes to the DOM directly and React never re-renders per
 * frame. Always smooth, never bouncy (bouncy digits run backwards).
 */
function DigitColumn({ digit }: { digit: number }) {
  const raw = useMotionValue(digit);
  const eased = useSpring(raw, SPRING.smooth);
  const y = useTransform(eased, v => `${-v}em`);
  useEffect(() => {
    raw.set(digit);
  }, [digit, raw]);
  return (
    <span className="inline-block h-[1em] w-[1ch] overflow-hidden">
      <motion.span className="flex flex-col" style={{ y }}>
        {DIGITS.map(d => (
          <span key={d} className="block h-[1em] text-center leading-[1em]">{d}</span>
        ))}
      </motion.span>
    </span>
  );
}

/**
 * A number whose digits roll digit by digit to the new value, in tabular
 * numerals with no layout shift. Each digit column is a motion value
 * translated with transform — React renders once per value change, never
 * per frame (see the render-count test). Screen readers hear the final
 * value only. Under reduced motion the value changes in place.
 */
export function NumberTransition({ value, decimals = 0, prefix = '', suffix = '', label, className }: NumberTransitionProps) {
  const reduce = useIsReducedMotion();
  const places = Math.max(0, Math.floor(decimals));
  const finite = Number.isFinite(value);
  const formatted = finite ? `${prefix}${Math.abs(value).toFixed(places)}${suffix}` : '—';
  const signed = finite && value < 0 ? `-${formatted}` : formatted;
  const text = finite ? signed : '—';
  const accessible = label ?? (finite ? text : 'Not available');

  if (!finite || reduce) {
    return (
      <span aria-label={accessible} className={cn('tabular', className)}>
        <span aria-hidden="true">{!finite ? '—' : text}</span>
      </span>
    );
  }

  const [integer, fraction] = Math.abs(value).toFixed(places).split('.');
  return (
    <span aria-label={accessible} className={cn('tabular', className)}>
      <span aria-hidden="true">
        {prefix}
        {value < 0 ? '-' : ''}
        {integer.split('').map((d, i, arr) => (
          // Keyed from the right so the ones column is stable as digits come and go.
          <DigitColumn key={`i${arr.length - 1 - i}`} digit={Number(d)} />
        ))}
        {places > 0 && fraction ? (
          <>
            <span>.</span>
            {fraction.split('').map((d, i) => (
              <DigitColumn key={`f${i}`} digit={Number(d)} />
            ))}
          </>
        ) : null}
        {suffix}
      </span>
    </span>
  );
}
