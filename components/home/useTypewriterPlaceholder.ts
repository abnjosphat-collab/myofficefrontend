// components/home/useTypewriterPlaceholder.ts — text that types itself for the
// homepage search's guide overlay. Loops: type, hold, delete, next. Reduced
// motion (or unknown, e.g. server render) gets the first example statically.
// Static cases are derived during render; the effect only owns the timer loop.
'use client';

import { useEffect, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

export const TYPE_MS = 75;
export const HOLD_MS = 3000;
export const DELETE_MS = 32;
export const REST_MS = 5000;

export const SEARCH_EXAMPLES = [
  'Try “leave” — requests & balances',
  'Try “overtime” — claims & approvals',
  'Try “payroll” — search by tag',
  'Try “new work order” — jump to an action',
];

export function useTypewriterPlaceholder(phrases: string[] = SEARCH_EXAMPLES, active = true): string {
  const reduced = useReducedMotion();
  const [text, setText] = useState('');
  const animating = active && phrases.length > 0 && reduced === false;
  useEffect(() => {
    if (!animating) return;
    let phrase = 0;
    let chars = 0;
    let deleting = false;
    let timer: ReturnType<typeof setTimeout>;
    const step = () => {
      const current = phrases[phrase];
      if (!deleting) {
        chars += 1;
        setText(current.slice(0, chars));
        const full = chars >= current.length;
        if (full) deleting = true;
        timer = setTimeout(step, full ? HOLD_MS : TYPE_MS);
      } else {
        chars -= 1;
        const done = chars <= 0;
        setText(done ? '' : current.slice(0, chars));
        if (done) {
          deleting = false;
          phrase = (phrase + 1) % phrases.length;
        }
        timer = setTimeout(step, done ? REST_MS : DELETE_MS);
      }
    };
    timer = setTimeout(step, TYPE_MS);
    return () => clearTimeout(timer);
  }, [animating, phrases]);
  if (!active || phrases.length === 0) return '';
  if (reduced !== false) return phrases[0];
  return text;
}
