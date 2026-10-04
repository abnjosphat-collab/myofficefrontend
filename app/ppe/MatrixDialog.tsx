// app/ppe/MatrixDialog.tsx — how many months each kind of PPE lasts. Saving an interval also recalculates the expiry of every active item
// of that type; Recalculate resets them to issue date plus the interval. Both overwrite stored expiry dates and need a manager, and a
// refusal is shown against the row it came from. While the saved matrix cannot be read, editing is switched off and the dialog says so.
'use client';

import { useState } from 'react';
import { Button, Dialog, Field, Input, Notice } from '@/components/ui-system';
import { PPE_TYPES } from './ppeMeta';
import type { PPERecord } from './types';

export function MatrixDialog({ open, onOpenChange, matrix, loading, error, onRetry, records, onSetInterval, onRecalculate, onRecalculateAll }: {
  open: boolean; onOpenChange: (o: boolean) => void; matrix: Record<string, number>; loading: boolean; error: string | null; onRetry: () => void; records: PPERecord[];
  onSetInterval: (type: string, months: number) => Promise<void>; onRecalculate: (type: string) => Promise<void>; onRecalculateAll: () => Promise<void>;
}) {
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [rowError, setRowError] = useState<Record<string, string>>({});
  const off = loading || !!error;
  const run = async (key: string, fn: () => Promise<void>, after?: () => void) => {
    setBusy(key); setRowError(e => ({ ...e, [key]: '' }));
    try { await fn(); after?.(); } catch (e) { setRowError(r => ({ ...r, [key]: e instanceof Error ? e.message : 'It did not work.' })); }
    finally { setBusy(null); }
  };
  return (
    <Dialog
      open={open} onOpenChange={o => { if (!busy) { setDraft({}); setRowError({}); onOpenChange(o); } }} size="lg" title="Replacement matrix" description="How long each kind of PPE lasts. Saving an interval recalculates the expiry of every active item of that type."
      footer={<><Button onClick={() => onOpenChange(false)} disabled={!!busy}>Close</Button><Button icon="refresh" disabled={off} pending={busy === '__all__'} onClick={() => run('__all__', onRecalculateAll)}>Recalculate all types</Button></>}
    >
      <div className="flex flex-col gap-4">
        {loading && <Notice tone="info" title="Loading the saved matrix">Editing is off until it has loaded.</Notice>}
        {error && <Notice tone="danger" title="The saved matrix is unavailable" action={<Button size="sm" icon="refresh" onClick={onRetry}>Try again</Button>}>{error} Editing and recalculating are off.</Notice>}
        {rowError.__all__ && <Notice tone="danger" title="Recalculating all types failed">{rowError.__all__}</Notice>}
        <ul className="flex flex-col gap-2.5" aria-label="PPE types">
          {Object.entries(PPE_TYPES).map(([key, info]) => {
            const active = records.filter(r => r.ppe_type === key && r.status === 'active').length;
            const saved = matrix[key] ?? 0;
            const value = draft[key] ?? String(saved);
            const changed = draft[key] !== undefined && Number(draft[key]) !== saved;
            const bad = value === '' || !Number.isFinite(Number(value)) || Number(value) < 0 || Number(value) > 120;
            return (
              <li key={key} className="flex flex-col gap-2 rounded-control border border-line bg-surface-subtle px-3 py-3 sm:flex-row sm:items-end sm:gap-3">
                <div className="min-w-0 flex-1"><p className="font-sans text-label font-medium text-ink">{info.name}</p><p className="font-sans text-caption text-ink-muted">{active} active {active === 1 ? 'item' : 'items'}{Number(value) === 0 ? ', no expiry' : ''}</p></div>
                <Field label="Months" error={changed && bad ? '0 to 120.' : undefined} className="w-28"><Input type="number" min={0} max={120} value={value} disabled={off} onChange={e => setDraft(d => ({ ...d, [key]: e.target.value }))} /></Field>
                <div className="flex gap-2">
                  <Button variant="primary" disabled={off || !changed || bad} pending={busy === `s-${key}`} onClick={() => run(`s-${key}`, () => onSetInterval(key, Number(value)), () => setDraft(d => { const n = { ...d }; delete n[key]; return n; }))}>Save</Button>
                  <Button disabled={off || active === 0} pending={busy === `r-${key}`} onClick={() => run(`r-${key}`, () => onRecalculate(key))}>Recalculate</Button>
                </div>
                {(rowError[`s-${key}`] || rowError[`r-${key}`]) && <p role="alert" className="font-sans text-caption text-danger sm:basis-full">{rowError[`s-${key}`] || rowError[`r-${key}`]}</p>}
              </li>
            );
          })}
        </ul>
      </div>
    </Dialog>
  );
}
