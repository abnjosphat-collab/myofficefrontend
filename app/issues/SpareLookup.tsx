// app/issues/SpareLookup.tsx — find a part in the spare catalogue without starting an issue: the code,
// description, price, category and stock for each match. The matching rule is the shared one in
// lib/spareSearch, so this finds the same parts as the register and the issue form's picker.
'use client';

import { useMemo, useState } from 'react';
import { Button, EmptyState, LoadingPulse, Notice, SearchField, StatusBadge } from '@/components/ui-system';
import { formatCurrency } from '@/components/shared/utils';
import { searchSpares, type SearchableSpare } from '@/lib/spareSearch';

export interface LookupSpare extends SearchableSpare {
  stock_code: string;
  description: string;
  unit_price: number | null;
  current_quantity: number;
}

export function SpareLookup({ spares, loading, loaded, error, onRetry }: {
  spares: LookupSpare[]; loading: boolean; loaded: boolean; error: string | null; onRetry: () => void;
}) {
  const [q, setQ] = useState('');
  const { hits, total } = useMemo(() => searchSpares(spares, q), [spares, q]);
  const typed = q.trim() !== '';
  return (
    <div className="flex flex-col gap-3">
      <SearchField value={q} onValueChange={setQ} placeholder="Search code, description or category" wrapperClassName="min-w-56 max-w-sm flex-1" />
      {error && !loaded ? (
        <Notice tone="warning" title="The spare catalogue could not be loaded" action={<Button size="sm" icon="refresh" onClick={onRetry}>Try again</Button>}>{error}</Notice>
      ) : loading && !loaded ? (
        <LoadingPulse compact label="Loading the spare catalogue" />
      ) : total === 0 && !typed ? (
        <EmptyState icon="spares" title="No spares in the catalogue" description="Add spares on the Spares page." />
      ) : hits.length === 0 ? (
        <EmptyState icon="search" title="No spare matches" description={`Nothing matches "${q.trim()}".`} action={<Button onClick={() => setQ('')}>Clear the search</Button>} />
      ) : (
        <>
          <p className="font-sans text-caption text-ink-muted" role="status">
            {typed ? `${total} ${total === 1 ? 'match' : 'matches'}` : `${total} ${total === 1 ? 'part' : 'parts'} in the catalogue`}{hits.length < total ? ` — showing the first ${hits.length}, type to narrow` : ''}
          </p>
          <ul className="flex flex-col gap-2" aria-label="Matching spares">
            {hits.map(s => {
              const cats = (s.categories && s.categories.length > 0 ? s.categories : s.category ? [s.category] : []).join(', ');
              return (
                <li key={s.stock_code} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-control border border-line bg-surface-subtle px-3 py-2">
                  <span className="font-mono text-body-sm font-semibold text-ink">{s.stock_code}</span>
                  <span className="min-w-0 flex-1 basis-40 font-sans text-body-sm text-ink [overflow-wrap:anywhere]">{s.description}</span>
                  <span className="font-sans text-body-sm tabular text-ink">{formatCurrency(s.unit_price ?? 0)}</span>
                  {cats && <span className="font-sans text-caption text-ink-muted">{cats}</span>}
                  {s.current_quantity > 0 ? <span className="font-sans text-caption tabular text-ink-muted">{s.current_quantity} in stock</span> : <StatusBadge tone="danger">Out of stock</StatusBadge>}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
