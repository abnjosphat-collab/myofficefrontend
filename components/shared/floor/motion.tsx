// components/shared/floor/motion.tsx — the moving parts of the compressor floor, all on the shared layer:
// Slab presses (snappy) when it is a control; CountUp rolls through NumberTransition; the service-life ring
// fills through ProgressFill on the smooth spring; animated text crossfades once through Presence; the fan's
// loops stay CSS verbatim (ambient floor feel, no preset equivalent — B4-13). Nothing loops for ever and
// everything stops under prefers-reduced-motion.
'use client';

import type { CSSProperties, ReactNode } from 'react';
import { NumberTransition, Presence, ProgressFill } from '@/components/ui-system/motion';
import s from './floor.module.css';

/**
 * A raised surface. A clickable one presses in (snappy) under the pointer or keyboard activation and takes a
 * slightly deeper shade; `still` keeps an information-only surface (a figure, not a control) from reacting at all.
 */
export function Slab({ children, className = '', accent, style, still = false, role, tabIndex, onClick, onKeyDown, ...aria }: {
  children: ReactNode; className?: string; accent?: string; style?: CSSProperties; still?: boolean;
  role?: string; tabIndex?: number; onClick?: () => void; onKeyDown?: (e: React.KeyboardEvent<HTMLDivElement>) => void;
  'aria-label'?: string;
}) {
  return (
    <div
      {...aria}
      role={role}
      tabIndex={tabIndex}
      onClick={onClick}
      onKeyDown={onKeyDown}
      className={`${s.slab} ${className}`}
      data-still={still ? '' : undefined}
      data-press={onClick && !still ? '' : undefined}
      style={{ ...style, ...(accent ? { ['--accent' as string]: accent } : {}) }}
    >
      {children}
    </div>
  );
}

/** A number that counts from its previous value to the new one (calm roll; in place under reduced motion). */
export function CountUp({ value, decimals = 0, suffix = '' }: { value: number | null | undefined; decimals?: number; suffix?: string }) {
  return <NumberTransition value={value ?? NaN} decimals={decimals} suffix={suffix} />;
}

/**
 * A ring that fills to `fraction` (0..1) through ProgressFill on the smooth spring — never overshooting.
 * Urgent rings nudge three times, then rest (CSS, stopped under reduced motion).
 */
export function Ring({ fraction, size = 64, stroke = 6, accent, children, label, urgent = false }: {
  fraction: number; size?: number; stroke?: number; accent: string; children?: ReactNode; label: string; urgent?: boolean;
}) {
  return (
    <ProgressFill variant="ring" fraction={fraction} size={size} stroke={stroke} accent={accent} label={label} className={urgent ? s.urgent : undefined}>
      {children}
    </ProgressFill>
  );
}

/**
 * A three-blade fan. A running unit's fan turns while the pointer is on its pod, and spins up once when the pod appears
 * or `kick` changes (a saved reading, a status change); otherwise it is still.
 */
export function Fan({ running, kick = 0, size = 26 }: { running: boolean; kick?: number; size?: number }) {
  return (
    <svg key={kick} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className={s.fan} data-running={running ? 'true' : undefined}>
      <circle cx="12" cy="12" r="2.2" fill="currentColor" />
      {[0, 120, 240].map(a => (
        <path key={a} transform={`rotate(${a} 12 12)`} fill="currentColor" opacity="0.85"
          d="M12 9.8c-.4-3.1.6-6 3.2-6.8 1.9-.6 3.3.9 2.6 2.7-.8 2.1-3.3 3.3-5.8 4.1Z" />
      ))}
    </svg>
  );
}

/**
 * Text that crossfades once when it first appears and again whenever `text` changes (a new count, a new
 * status): one moving thing, never a per-word rise. Read out whole by screen readers; still under reduced motion.
 */
export function AnimatedText({ text, className = '', as = 'span' }: {
  text: string; className?: string; as?: 'span' | 'h1' | 'h2' | 'p';
}) {
  const Tag = as;
  return (
    <Presence visible fadeOnly swapKey={text}>
      <Tag className={className}>{text}</Tag>
    </Presence>
  );
}
