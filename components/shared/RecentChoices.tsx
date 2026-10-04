// components/shared/RecentChoices.tsx — the values this person types most often for a free-text field, as buttons under it.
// Shares its storage with the older PredictiveInput (same key, same format), so history already collected carries over.
'use client';

import { useMemo } from 'react';
import { Button } from '@/components/ui-system';
import { loadHistory, saveToHistory } from '@/components/shared/PredictiveInput';

export const rememberChoice = (historyKey: string, value: string) => { try { saveToHistory(historyKey, value.trim()); } catch { /* history is a convenience */ } };

export function RecentChoices({ historyKey, onPick, limit = 4, label = 'Recently used' }: { historyKey: string; onPick: (value: string) => void; limit?: number; label?: string }) {
  const choices = useMemo(() => { try { return loadHistory(historyKey).slice(0, limit).map(e => e.value); } catch { return []; } }, [historyKey, limit]);
  if (choices.length === 0) return null;
  return (
    <div role="group" aria-label={label} className="flex flex-wrap items-center gap-1.5">
      <span className="font-sans text-caption text-ink-muted">{label}:</span>
      {choices.map(c => <Button key={c} size="sm" variant="ghost" className="max-w-full truncate" title={c} onClick={() => onPick(c)}>{c.length > 40 ? `${c.slice(0, 39)}…` : c}</Button>)}
    </div>
  );
}
