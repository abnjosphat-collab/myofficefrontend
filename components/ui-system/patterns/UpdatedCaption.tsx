'use client';

import { useEffect, useState } from 'react';
import { formatUpdatedAgo } from '@/lib/format';

/**
 * The quiet "· Updated just now / 2 min ago" tail of a list's count line.
 * Rendered only on pages that already show a count line, and only once data
 * has arrived (`at` is null until the first success). Re-renders on a 30 s
 * beat so the relative time stays honest; renders nothing otherwise.
 */
export function UpdatedCaption({ at }: { at: Date | null }) {
  const [, setBeat] = useState(0);
  useEffect(() => {
    if (at == null) return;
    const timer = setInterval(() => setBeat(b => b + 1), 30_000);
    return () => clearInterval(timer);
  }, [at]);
  // `== null` (not `=== null`): untyped hook mocks in render tests leave
  // updatedAt undefined, and the caption must vanish, not crash.
  if (at == null) return null;
  return <> · Updated {formatUpdatedAgo(at)}</>;
}
