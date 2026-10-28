// components/app-shell/useRiseKey.ts — a key that bumps only when a count
// rises: the bell bounces when notices arrive, never when they are read.
'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Returns a key that starts at 0 and increments whenever `value` grows past
 * its previous high. Falls and first paint never bump it. Feed it to an
 * IconButton `bounceTrigger` (or an AnimatedIcon discrete `trigger`).
 */
export function useRiseKey(value: number): number {
  const [key, setKey] = useState(0);
  const prev = useRef(value);
  useEffect(() => {
    if (value > prev.current) setKey(k => k + 1);
    prev.current = value;
  }, [value]);
  return key;
}
