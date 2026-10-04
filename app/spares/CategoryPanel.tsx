// app/spares/CategoryPanel.tsx — the register counted by category: how many parts, what share, and how many are out or low. Choosing a
// category filters the register to it; choosing it again clears the filter.
'use client';

import { useState } from 'react';
import { SearchField, StatusBadge, cn } from '@/components/ui-system';
import type { categoryBreakdown } from './stock';

export function CategoryPanel({ rows, active, onPick }: { rows: ReturnType<typeof categoryBreakdown>; active: string; onPick: (cat: string) => void }) {
  const [q, setQ] = useState('');
  const shown = rows.filter(r => !q.trim() || r.cat.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <section aria-labelledby="cat-h" className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-2"><h2 id="cat-h" className="font-display text-title font-semibold text-ink">By category</h2><SearchField value={q} onValueChange={setQ} placeholder="Search categories" wrapperClassName="w-full max-w-xs" /></div>
      {shown.length === 0 ? <p className="font-sans text-body-sm text-ink-muted">No category matches.</p> : (
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4" aria-label="Categories">
          {shown.map(r => (
            <li key={r.cat}>
              <button type="button" aria-pressed={active === r.cat} onClick={() => onPick(active === r.cat ? 'all' : r.cat)} className={cn('focus-ring flex w-full flex-col gap-1 rounded-control border px-3 py-2.5 text-left transition-colors hover:bg-surface-muted', active === r.cat ? 'border-action bg-action-soft' : 'border-line')}>
                <span className="flex items-baseline justify-between gap-2"><span className="min-w-0 truncate font-sans text-label font-medium text-ink">{r.cat}</span><span className="shrink-0 font-sans text-caption text-ink-muted tabular">{r.count} parts, {r.pct}%</span></span>
                {(r.out > 0 || r.low > 0) && <span className="flex flex-wrap gap-1">{r.out > 0 && <StatusBadge tone="danger">{r.out} out</StatusBadge>}{r.low > 0 && <StatusBadge tone="warning">{r.low} low</StatusBadge>}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
