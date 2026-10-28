// app/issues/SpareLookup.tsx — find a part in the spare catalogue without starting an issue: the code,
// description, price, category and stock for each match, with the matched words highlighted. The matching
// rule is the shared one in lib/spareSearch, so this finds the same parts as the register and the issue
// form's picker. When onAdd is given, each row offers Add to issue (button, or Enter on the active row);
// every row offers Copy code.
'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button, EXPORT_CHECK_MS, EmptyState, IconButton, LoadingPulse, Notice, SearchField, StatusBadge, cn } from '@/components/ui-system';
import { formatCurrency } from '@/components/shared/utils';
import { searchWords, splitHighlight } from '@/lib/moduleSearch';
import { searchSpares, type SearchableSpare } from '@/lib/spareSearch';

export interface LookupSpare extends SearchableSpare {
  stock_code: string;
  description: string;
  unit_price: number | null;
  current_quantity: number;
}

/** Copy text, with a fallback for contexts without the async clipboard API (non-secure origins, old webviews). */
async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    const area = document.createElement('textarea');
    area.value = text;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}

/** Query words marked up; the same shape as the home module browser (splitHighlight + warning-soft mark). */
function Marked({ text, words }: { text: string; words: string[] }) {
  return <>{splitHighlight(text, words).map((run, i) => run.mark ? <mark key={i} className="rounded-sm bg-warning-soft text-ink">{run.text}</mark> : <span key={i}>{run.text}</span>)}</>;
}

export function SpareLookup({ spares, loading, loaded, error, onRetry, onAdd }: {
  spares: LookupSpare[]; loading: boolean; loaded: boolean; error: string | null; onRetry: () => void;
  onAdd?: (spare: LookupSpare) => void;
}) {
  const [q, setQ] = useState('');
  // The active row is keyed by code, not index: a new result list simply leaves a stale code unmatched.
  const [activeCode, setActiveCode] = useState<string | null>(null);
  const listId = useId();
  const { hits, total } = useMemo(() => searchSpares(spares, q), [spares, q]);
  const words = useMemo(() => searchWords(q), [q]);
  const typed = q.trim() !== '';
  const active = hits.findIndex(h => h.stock_code === activeCode);
  const optionId = (i: number) => `${listId}-option-${i}`;

  const onSearch = (v: string) => { setQ(v); setActiveCode(null); };
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const copiedTimer = useRef<number | null>(null);
  useEffect(() => () => { if (copiedTimer.current !== null) window.clearTimeout(copiedTimer.current); }, []);
  const copyCode = async (code: string) => {
    if (await copyText(code)) { toast.success(`Code ${code} copied to the clipboard.`); setCopiedCode(code); if (copiedTimer.current !== null) window.clearTimeout(copiedTimer.current); copiedTimer.current = window.setTimeout(() => setCopiedCode(null), EXPORT_CHECK_MS); }
    else toast.error('The code could not be copied.');
  };
  const move = (dir: 1 | -1) => {
    if (hits.length === 0) return;
    const next = Math.min(Math.max(active + dir, 0), hits.length - 1);
    setActiveCode(hits[next].stock_code);
  };
  const onSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
    else if (e.key === 'Home' && hits.length > 0) { e.preventDefault(); setActiveCode(hits[0].stock_code); }
    else if (e.key === 'End' && hits.length > 0) { e.preventDefault(); setActiveCode(hits[hits.length - 1].stock_code); }
    else if (e.key === 'Enter' && active >= 0 && onAdd) { e.preventDefault(); onAdd(hits[active]); }
  };

  return (
    <div className="flex flex-col gap-3">
      <SearchField
        value={q} onValueChange={onSearch} onKeyDown={onSearchKeyDown} placeholder="Search code, description or category" wrapperClassName="min-w-56 max-w-sm flex-1"
        role="combobox" aria-expanded={hits.length > 0} aria-controls={listId} aria-activedescendant={active >= 0 ? optionId(active) : undefined}
      />
      {error && !loaded ? (
        <Notice tone="warning" title="The spare catalogue could not be loaded" action={<Button size="sm" icon="refresh" onClick={onRetry}>Try again</Button>}>{error}</Notice>
      ) : loading && !loaded ? (
        <LoadingPulse compact label="Loading the spare catalogue" />
      ) : total === 0 && !typed ? (
        <EmptyState icon="spares" title="No spares in the catalogue" description="Add spares on the Spares page." />
      ) : hits.length === 0 ? (
        <EmptyState icon="search" title="No spare matches" description={`Nothing matches "${q.trim()}" — if you typed a code, try words from the name, or the other way round.`} action={<Button onClick={() => onSearch('')}>Clear the search</Button>} />
      ) : (
        <>
          <p className="font-sans text-caption text-ink-muted" role="status">
            {typed ? `${total} ${total === 1 ? 'match' : 'matches'}` : `${total} ${total === 1 ? 'part' : 'parts'} in the catalogue`}{hits.length < total ? ` — showing the first ${hits.length}, type to narrow` : ''}
          </p>
          <ul role="listbox" id={listId} aria-label="Matching spares" className="flex flex-col gap-2">
            {hits.map((s, i) => {
              const cats = (s.categories && s.categories.length > 0 ? s.categories : s.category ? [s.category] : []).join(', ');
              const isActive = i === active;
              return (
                <li key={s.stock_code} role="option" id={optionId(i)} aria-selected={isActive} className={cn('flex flex-wrap items-center gap-x-3 gap-y-1 rounded-control border px-3 py-2', isActive ? 'border-action bg-action-soft/60' : 'border-line bg-surface-subtle')}>
                  <span className="font-mono text-body-sm font-semibold text-ink"><Marked text={s.stock_code} words={words} /></span>
                  <span className="min-w-0 flex-1 basis-40 font-sans text-body-sm text-ink [overflow-wrap:anywhere]"><Marked text={s.description} words={words} /></span>
                  <span className="font-sans text-body-sm tabular text-ink">{formatCurrency(s.unit_price ?? 0)}</span>
                  {cats && <span className="font-sans text-caption text-ink-muted">{cats}</span>}
                  {s.current_quantity > 0 ? <span className="font-sans text-caption tabular text-ink-muted">{s.current_quantity} in stock</span> : <StatusBadge tone="danger">Out of stock</StatusBadge>}
                  <span className="ml-auto flex shrink-0 items-center gap-1.5">
                    {onAdd && <Button size="sm" onClick={() => onAdd(s)}>Add to issue</Button>}
                    <IconButton icon="copy" size="sm" label={copiedCode === s.stock_code ? `Copied ${s.stock_code}` : `Copy code ${s.stock_code}`} success={copiedCode === s.stock_code} onClick={() => copyCode(s.stock_code)} />
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
