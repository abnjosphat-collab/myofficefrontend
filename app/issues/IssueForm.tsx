// app/issues/IssueForm.tsx — record one stock issue: who received it, when, and the items (picked from the spare
// catalogue or described by hand). Validation is explained on the field; a refused save keeps everything typed.
'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button, Combobox, Field, Icon, IconButton, Input, Notice, Panel } from '@/components/ui-system';
import { useEmployees } from '@/hooks/useLookups';
import { formatCurrency, lineTotal, nowLocal } from '@/components/shared/utils';
import { invalidateSparesCache } from '@/hooks/useLookups';
import { createIssue } from './useIssuesData';
import type { IssueItemRow, Spare } from './types';

const uid = () => Math.random().toString(36).slice(2);
const blankItem = (): IssueItemRow => ({ id: uid(), stockCode: '', description: '', qty: 1, unit: 'UN', unit_price: 0 });
const ROW = 'sm:grid-cols-[minmax(0,13rem)_minmax(0,1fr)_5.5rem_4.5rem_6.5rem_2.5rem]';

/** Choose a spare from the catalogue. Only the best matches are rendered, so a catalogue of thousands stays fast. */
function SparePick({ spares, value, onPick }: { spares: Spare[]; value: string; onPick: (s: Spare | null) => void }) {
  const [query, setQuery] = useState('');
  const options = useMemo(() => {
    const q = query.trim().toLowerCase();
    const hits = (q ? spares.filter(s => s.stock_code.toLowerCase().includes(q) || s.description.toLowerCase().includes(q) || (s.category || '').toLowerCase().includes(q)) : spares).slice(0, 40);
    const chosen = spares.find(s => s.stock_code === value);
    if (chosen && !hits.includes(chosen)) hits.unshift(chosen);
    return hits.map(s => ({ value: s.stock_code, label: s.stock_code, description: `${s.description} · ${formatCurrency(s.unit_price)} · ${s.current_quantity} in stock`, keywords: [s.description] }));
  }, [spares, query, value]);
  return (
    <Combobox
      aria-label="Stock code" value={value} options={options} shouldFilter={false} onSearchChange={setQuery}
      onValueChange={code => onPick(spares.find(s => s.stock_code === code) ?? null)}
      placeholder="Choose from stock" searchPlaceholder="Search code or description" emptyMessage="No spare matches." clearLabel="No stock code"
    />
  );
}

export function IssueForm({ spares, sparesError, onRetrySpares, defaultIssuedBy, onRecorded }: {
  spares: Spare[];
  sparesError: string | null;
  onRetrySpares: () => void;
  defaultIssuedBy: string;
  onRecorded: () => Promise<void>;
}) {
  const employees = useEmployees();
  const people = useMemo(() => [...new Set(employees.map(e => `${e.first_name} ${e.last_name}`.trim()).filter(Boolean))].sort(), [employees]);
  const [recipient, setRecipient] = useState('');
  const [issuedBy, setIssuedBy] = useState(defaultIssuedBy);
  const [issuedAt, setIssuedAt] = useState(nowLocal);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<IssueItemRow[]>([blankItem()]);
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (id: string, patch: Partial<IssueItemRow>) => setItems(p => p.map(i => (i.id === id ? { ...i, ...patch } : i)));
  const pick = (id: string, s: Spare | null) => update(id, s ? { stockCode: s.stock_code, description: s.description, unit: s.unit_of_measure || 'UN', unit_price: s.unit_price } : { stockCode: '' });
  const used = items.filter(i => i.description.trim() || i.stockCode.trim());
  const total = used.reduce((s, i) => s + lineTotal(i.qty, i.unit_price), 0);
  const bad = { recipient: !recipient.trim(), items: used.length === 0, qty: used.some(i => !(i.qty > 0)) };

  const submit = async () => {
    setTouched(true); setError(null);
    if (bad.recipient || bad.items || bad.qty) return;
    setSaving(true);
    try {
      const made = await createIssue({
        issued_at: new Date(issuedAt).toISOString(), recipient_name: recipient.trim(), issued_by: issuedBy.trim() || null, notes: notes.trim() || null,
        items: used.map(i => ({ stock_code: i.stockCode || null, description: (i.description || i.stockCode).trim(), qty: i.qty, unit: i.unit || 'UN', unit_price: i.unit_price || null })),
      });
      invalidateSparesCache();
      toast.success((made.stock?.length ?? 0) > 0 ? 'Issue recorded and the stock taken off.' : 'Issue recorded.');
      (made.stock_warnings ?? []).forEach(w => toast.warning(w, { duration: 10_000 }));
      setRecipient(''); setNotes(''); setIssuedAt(nowLocal()); setItems([blankItem()]); setTouched(false);
      await onRecorded();
    } catch (e) { setError((e as Error).message || 'The issue could not be recorded.'); }
    finally { setSaving(false); }
  };

  return (
    <Panel title="Record a new issue" description="Who received what, and when.">
      <form className="flex flex-col gap-4" onSubmit={e => { e.preventDefault(); submit(); }} noValidate>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Issued to" required error={touched && bad.recipient ? 'Enter who received the items.' : undefined}>
            <Input list="issue-people" value={recipient} onChange={e => setRecipient(e.target.value)} autoComplete="off" placeholder="Name" />
          </Field>
          <Field label="Date and time"><Input type="datetime-local" value={issuedAt} onChange={e => setIssuedAt(e.target.value)} /></Field>
          <Field label="Issued by" optional><Input list="issue-people" value={issuedBy} onChange={e => setIssuedBy(e.target.value)} autoComplete="off" placeholder="Your name" /></Field>
          <Field label="Notes" optional><Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Reason, job number or project" /></Field>
        </div>
        <datalist id="issue-people">{people.map(n => <option key={n} value={n} label={n} />)}</datalist>

        <section aria-labelledby="issue-items" className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <h3 id="issue-items" className="font-sans text-label font-semibold text-ink">Items to issue</h3>
            <Button type="button" icon="plus" onClick={() => setItems(p => [...p, blankItem()])}>Add item</Button>
          </div>
          {sparesError && <Notice tone="warning" title="The spare catalogue could not be loaded" action={<Button size="sm" icon="refresh" onClick={onRetrySpares}>Try again</Button>}>{sparesError} You can still describe each item by hand.</Notice>}
          {touched && bad.items && <p role="alert" className="flex items-center gap-1.5 font-sans text-caption font-medium text-danger"><Icon name="warning" size="xs" weight="emphasis" />Add at least one item, with a stock code or a description.</p>}
          <div className={`hidden gap-2 px-1 font-sans text-caption text-ink-muted sm:grid ${ROW}`} aria-hidden="true"><span>Stock code</span><span>Description</span><span className="text-right">Qty</span><span>Unit</span><span className="text-right">Unit cost</span><span /></div>
          <ul className="flex flex-col gap-2">
            {items.map((item, n) => {
              const spare = spares.find(s => s.stock_code === item.stockCode);
              const short = spare && item.qty > spare.current_quantity;
              return (
                <li key={item.id} className={`grid grid-cols-2 items-start gap-2 rounded-control border border-line bg-surface-subtle p-2 ${ROW}`}>
                  <div className="col-span-2 sm:col-span-1"><SparePick spares={spares} value={item.stockCode} onPick={s => pick(item.id, s)} /></div>
                  <div className="col-span-2 sm:col-span-1"><Input aria-label={`Description, item ${n + 1}`} value={item.description} onChange={e => update(item.id, { description: e.target.value })} placeholder="Description" /></div>
                  <Input aria-label={`Quantity, item ${n + 1}`} type="number" inputMode="decimal" min="0" step="any" className="text-right" value={item.qty} onChange={e => update(item.id, { qty: parseFloat(e.target.value) || 0 })} aria-invalid={touched && !(item.qty > 0) ? true : undefined} />
                  <Input aria-label={`Unit, item ${n + 1}`} value={item.unit} onChange={e => update(item.id, { unit: e.target.value })} placeholder="UN" />
                  <Input aria-label={`Unit cost, item ${n + 1}`} type="number" inputMode="decimal" min="0" step="0.01" className="text-right" value={item.unit_price} onChange={e => update(item.id, { unit_price: parseFloat(e.target.value) || 0 })} />
                  <div className="flex justify-end"><IconButton icon="close" variant="danger" size="sm" label={`Remove item ${n + 1}`} disabled={items.length === 1} onClick={() => setItems(p => p.filter(i => i.id !== item.id))} /></div>
                  {touched && !(item.qty > 0) && <p role="alert" className="col-span-2 font-sans text-caption font-medium text-danger sm:col-span-6">Quantity must be more than 0.</p>}
                  {short && <p className="col-span-2 font-sans text-caption text-warning sm:col-span-6">Only {spare.current_quantity} of {spare.stock_code} in stock.</p>}
                </li>
              );
            })}
          </ul>
          {total > 0 && <p className="text-right font-sans text-body-sm text-ink-muted">Issue total <span className="font-semibold text-ink tabular">{formatCurrency(total)}</span></p>}
        </section>

        {error && <Notice tone="danger" title="The issue was not recorded">{error} What you typed is still here.</Notice>}
        <Notice tone="info" title="Issuing takes stock off">Each item with a stock code is taken off that spare in the Spares register (never below zero). An item without a code, or one that is not in the register, is only recorded. Deleting an issue puts its stock back.</Notice>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-sans text-caption text-ink-muted">{used.length} {used.length === 1 ? 'item' : 'items'} to {recipient || 'nobody yet'}</p>
          <Button type="submit" variant="primary" icon="check" pending={saving}>Record issue</Button>
        </div>
      </form>
    </Panel>
  );
}
