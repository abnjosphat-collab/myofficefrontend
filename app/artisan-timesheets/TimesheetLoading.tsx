// app/artisan-timesheets/TimesheetLoading.tsx — loading with a pulse: the Tools
// equalizer bars, a mini timesheet that fills itself row by row, and a status
// line cycling through what is actually being gathered. Static (no motion, first
// message only) when reduced motion is preferred; screen readers hear one label.
'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

const BAR_HEIGHTS = [10, 18, 13];

function EqualizerBars() {
  const reduce = useReducedMotion();
  return (
    <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-end justify-center gap-[3px] rounded-control border border-line bg-surface px-2 pb-2 pt-1.5">
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

export function TimesheetLoading({ label, detail, compact = false }: {
  /** Announced once to screen readers; shown as the heading. */
  label: string;
  /** Status lines, cycled while loading. The first shows when reduced motion is on. */
  detail?: string[];
  /** Bars + text only (inline use); otherwise adds the self-filling mini sheet. */
  compact?: boolean;
}) {
  return (
    <div
      role="status"
      aria-label={label}
      className={compact
        ? 'flex items-center gap-2.5'
        : 'flex items-center gap-4 rounded-card border border-line bg-surface p-4 sm:p-5'}
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
