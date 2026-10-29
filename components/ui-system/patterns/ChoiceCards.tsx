// components/ui-system/patterns/ChoiceCards.tsx — pick one of a few modes, each
// explained in a sentence: a labelled radio group of cards. For choices where a
// Segmented would read as loose words (its label is screen-reader-only).
'use client';

import { useId, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { cn } from '../foundations/cn';
import { Icon } from '../foundations/Icon';
import { CheckMark } from '../motion/CheckMark';
import type { IconMeaning } from '../foundations/icon-meanings';

export interface ChoiceCardOption {
  value: string;
  title: string;
  description: string;
  icon?: IconMeaning;
  /** Extra content under the description (a live summary, a warning). */
  footer?: ReactNode;
}

export function ChoiceCards({ label, description, value, onValueChange, options, columns = 1 }: {
  label: string;
  description?: string;
  value: string;
  onValueChange: (value: string) => void;
  options: ChoiceCardOption[];
  columns?: 1 | 2;
}) {
  const labelId = useId();
  const descId = useId();
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const matched = options.some(o => o.value === value);
  const move = (from: number, delta: number) => {
    const next = (from + delta + options.length) % options.length;
    refs.current[next]?.focus();
    onValueChange(options[next].value);
  };
  const onKeyDown = (e: KeyboardEvent, index: number) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); move(index, 1); }
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); move(index, -1); }
    else if (e.key === 'Home') { e.preventDefault(); refs.current[0]?.focus(); onValueChange(options[0].value); }
    else if (e.key === 'End') { e.preventDefault(); refs.current[options.length - 1]?.focus(); onValueChange(options[options.length - 1].value); }
  };
  return (
    <div className="flex flex-col gap-2">
      <p id={labelId} className="font-sans text-label font-medium text-ink">{label}</p>
      {description && <p id={descId} className="font-sans text-caption text-ink-muted">{description}</p>}
      <div role="radiogroup" aria-labelledby={labelId} aria-describedby={description ? descId : undefined} className={cn('grid gap-2', columns === 2 && 'sm:grid-cols-2')}>
        {options.map((o, i) => {
          const selected = o.value === value;
          return (
            <button
              key={o.value} ref={el => { refs.current[i] = el; }} type="button" role="radio" aria-checked={selected}
              tabIndex={selected || (!matched && i === 0) ? 0 : -1}
              onClick={() => onValueChange(o.value)} onKeyDown={e => onKeyDown(e, i)}
              className={cn('focus-ring touch-target flex w-full items-start gap-3 rounded-control border p-3 text-left transition-colors',
                selected ? 'border-action bg-action-soft' : 'border-line bg-surface hover:bg-surface-subtle')}
            >
              <span aria-hidden className={cn('mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border', selected ? 'border-action bg-action text-action-ink' : 'border-line-strong text-transparent')}>
                <CheckMark checked={selected} size={12} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 font-sans text-body-sm font-semibold text-ink">
                  {o.icon && <Icon name={o.icon} size="sm" className="shrink-0 text-ink-muted" />}{o.title}
                </span>
                <span className="mt-0.5 block font-sans text-caption text-ink-muted">{o.description}</span>
                {o.footer && <span className="mt-1.5 block">{o.footer}</span>}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
