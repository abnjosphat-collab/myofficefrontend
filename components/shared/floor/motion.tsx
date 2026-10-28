// components/shared/floor/motion.tsx — the moving parts of the compressor floor: a raised slab, numbers that count to
// their value, the service-life ring and the fan. Nothing loops for ever: things move once when they appear or change,
// while the pointer is on them, or when the floor signals an event. Each one is still under reduced motion.
// All timing comes from the motion presets (components/ui-system/motion/presets): CountUp rolls on the calm
// smooth spring via NumberTransition, the ring sweeps on the gentle CSS spring token, animated text rises on
// the smooth token; the fan's loops stay CSS (ambient floor feel, no preset equivalent).
'use client';

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { NumberTransition, useIsReducedMotion } from '@/components/ui-system/motion';
import s from './floor.module.css';

/**
 * A raised surface. A clickable one takes a slightly deeper shade under the pointer or keyboard focus (it does not move);
 * `still` keeps an information-only surface (a figure, not a control) from reacting at all.
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

/** A ring that fills to `fraction` (0..1). The fill sweeps on the gentle token whenever the value changes. */
export function Ring({ fraction, size = 64, stroke = 6, accent, children, label, urgent = false }: {
  fraction: number; size?: number; stroke?: number; accent: string; children?: ReactNode; label: string; urgent?: boolean;
}) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, fraction));
  return (
    <div role="img" aria-label={label} className={`relative grid shrink-0 place-items-center ${urgent ? s.urgent : ''}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--mo-surface-muted)" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={accent} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={shown ? c * (1 - clamped) : c}
          style={{ filter: `drop-shadow(0 0 4px color-mix(in srgb, ${accent} 45%, transparent))`, transition: 'stroke-dashoffset var(--mo-spring-gentle-duration) var(--mo-spring-gentle)' }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
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
 * Text that rises in word by word: once when it first appears, and again whenever `text` changes (a new count, a new
 * status). Read out whole by screen readers; still under reduced motion.
 */
export function AnimatedText({ text, className = '', as = 'span', stagger = 0.045 }: {
  text: string; className?: string; as?: 'span' | 'h1' | 'h2' | 'p'; stagger?: number;
}) {
  const reduced = useIsReducedMotion();
  const Tag = as;
  if (reduced) return <Tag className={className}>{text}</Tag>;
  const words = text.split(' ');
  return (
    <Tag className={className}>
      {/* Screen readers get the whole text once; the animated words are decoration. */}
      <span className="sr-only">{text}</span>
      <span key={text} aria-hidden="true" className="inline-block">
        {words.map((w, i) => (
          <span key={i} className={`${s.riseWord} inline-block whitespace-pre`} style={{ animationDelay: `${i * stagger}s` }}>
            {w}{i < words.length - 1 ? ' ' : ''}
          </span>
        ))}
      </span>
    </Tag>
  );
}
