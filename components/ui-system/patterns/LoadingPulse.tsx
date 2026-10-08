// components/ui-system/patterns/LoadingPulse.tsx — the one loading animation for MyOffice: the Tools equalizer bars, a mini sheet that
// fills itself row by row, and (optionally) a status line cycling through what is actually being gathered. It began in the artisan
// timesheets and now serves every list, panel and gate. With reduced motion it is static (no movement, first line only); screen
// readers hear one stable label, never the cycling lines.
'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { cn } from '../foundations/cn';

const BAR_HEIGHTS = [10, 18, 13];

function EqualizerBars({ large = false }: { large?: boolean }) {
  const reduce = useReducedMotion();
  return (
    <span aria-hidden="true" className={cn('flex shrink-0 items-end justify-center gap-[3px] rounded-control border border-line bg-surface px-2 pb-2 pt-1.5', large ? 'h-11 w-11' : 'h-9 w-9')}>
      {BAR_HEIGHTS.map((h, i) => (
        <motion.i
          key={i}
          className="block w-[3px] rounded-full bg-action"
          style={{ height: h, transformOrigin: 'bottom' }}
          animate={reduce ? undefined : { scaleY: [0.45, 1, 0.45], opacity: [0.5, 1, 0.5] }}
          transition={reduce ? undefined : { duration: 1.05, repeat: Infinity, ease: 'easeInOut', delay: i * 0.14 }}
        />
      ))}
    </span>
  );
}

function FillingRows({ rows = 4 }: { rows?: number }) {
  const reduce = useReducedMotion();
  return (
    <div aria-hidden="true" data-testid="loading-rows" className="grid flex-1 content-center gap-1.5">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="h-2 overflow-hidden rounded-full bg-surface-muted">
          <motion.div
            className={`h-full rounded-full ${i === rows - 1 ? 'bg-success/60' : 'bg-action/40'}`}
            style={reduce ? { width: '55%' } : undefined}
            initial={reduce ? false : { width: '0%' }}
            animate={reduce ? undefined : { width: ['0%', '100%'] }}
            transition={reduce ? undefined : { duration: 1.1, repeat: Infinity, repeatDelay: 0.9, ease: 'easeInOut', delay: i * 0.28 }}
          />
        </div>
      ))}
    </div>
  );
}

function CyclingDetail({ messages }: { messages: string[] }) {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (reduce || messages.length < 2) return;
    const id = setInterval(() => setIndex(i => (i + 1) % messages.length), 1800);
    return () => clearInterval(id);
  }, [reduce, messages.length]);
  if (reduce || messages.length < 2) {
    return <span aria-hidden="true" className="block font-sans text-caption text-ink-muted">{messages[0]}</span>;
  }
  return (
    <span aria-hidden="true" className="relative block h-5 overflow-hidden">
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={index}
          className="block font-sans text-caption text-ink-muted"
          initial={{ y: 8, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -8, opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          {messages[index]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

export function LoadingPulse({ label, detail, compact = false, screen = false, className }: {
  /** Announced once to screen readers; shown as the heading. */
  label: string;
  /** Status lines, cycled while loading. The first shows when reduced motion is on. Say only what is really being fetched. */
  detail?: string[];
  /** Bars + text only (inline use); otherwise adds the self-filling mini sheet. */
  compact?: boolean;
  /** Fills the viewport, centred: for the gates that stand in front of a whole page. */
  screen?: boolean;
  className?: string;
}) {
  if (screen) {
    return (
      <div role="status" aria-label={label} className={cn('fixed inset-0 grid place-items-center bg-canvas', className)}>
        <div className="flex flex-col items-center gap-3 text-center">
          <EqualizerBars large />
          <p className="font-sans text-body font-medium text-ink">{label}</p>
          {detail && detail.length > 0 && <CyclingDetail messages={detail} />}
        </div>
      </div>
    );
  }
  return (
    <div
      role="status"
      aria-label={label}
      className={cn(compact ? 'flex items-center gap-2.5' : 'flex items-center gap-4 rounded-card border border-line bg-surface p-4 sm:p-5', className)}
    >
      <EqualizerBars />
      <div className="min-w-0 flex-1">
        <p className="font-sans text-body font-medium text-ink">{label}</p>
        {detail && detail.length > 0 && <CyclingDetail messages={detail} />}
      </div>
      {!compact && (
        <div className="hidden w-44 shrink-0 self-stretch sm:block">
          <FillingRows />
        </div>
      )}
    </div>
  );
}
