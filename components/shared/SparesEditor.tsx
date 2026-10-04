// components/shared/SparesEditor.tsx — the parts used on a job: find one in the spares register (or type it), set the quantity and
// unit price, add it, remove it. A record of parts and their cost only: it never changes stock. Shared by overtime and maintenance;
// each maps its own stored shape to and from SpareLine.
'use client';

import { useMemo, useState } from 'react';
import { Button, Combobox, Field, IconButton, Input } from '@/components/ui-system';
import { formatCurrency } from '@/components/shared/utils';
import { useSpares } from '@/hooks/useLookups';

export interface SpareLine { name: string; part_number?: string; quantity: number; unit_price?: number; total_cost?: number }
const BLANK = { name: '', part_number: '', quantity: '1', unit_price: '0' };

export function SparesEditor({ value, onChange, title = 'Spares used', hint = 'A record of the parts and their cost. It does not change stock.' }: {
  value: SpareLine[]; onChange: (lines: SpareLine[]) => void; title?: string; hint?: string;
}) {
  const spares = useSpares();
  const [draft, setDraft] = useState(BLANK);
  const options = useMemo(() => spares.slice(0, 500).map(s => ({
    value: String(s.id), label: s.description || s.name || String(s.stock_code || 'Spare'),
    description: [s.stock_code, s.category, s.current_quantity !== undefined ? `Stock ${s.current_quantity}` : ''].filter(Boolean).join(' · '),
  })), [spares]);
  const pick = (id: string) => {
    const s = spares.find(x => String(x.id) === id);
    if (s) setDraft(d => ({ ...d, name: s.description || s.name || d.name, part_number: s.stock_code || d.part_number, unit_price: s.unit_price != null ? String(s.unit_price) : d.unit_price }));
  };
  const add = () => {
    const name = draft.name.trim();
    if (!name) return;
    const quantity = parseFloat(draft.quantity) || 1; const unit_price = parseFloat(draft.unit_price) || 0;
    onChange([...value, { name, part_number: draft.part_number.trim() || undefined, quantity, unit_price, total_cost: quantity * unit_price }]);
    setDraft(BLANK);
  };
  const total = value.reduce((s, l) => s + (l.total_cost ?? l.quantity * (l.unit_price ?? 0)), 0);
  return (
    <section aria-label={title} className="flex flex-col gap-3 rounded-card border border-line bg-surface-subtle p-4">
      <div><h3 className="font-sans text-label font-semibold text-ink">{title}</h3><p className="font-sans text-caption text-ink-muted">{hint}</p></div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <Field label="Find in the spares register" optional className="sm:col-span-4"><Combobox aria-label="Find a spare" value="" onValueChange={pick} options={options} placeholder="Search spares" /></Field>
        <Field label="Spare" className="sm:col-span-2"><Input value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} placeholder="Or type a name" /></Field>
        <Field label="Quantity"><Input type="number" min={0.01} step="any" value={draft.quantity} onChange={e => setDraft(d => ({ ...d, quantity: e.target.value }))} /></Field>
        <Field label="Unit price"><Input type="number" min={0} step={0.01} value={draft.unit_price} onChange={e => setDraft(d => ({ ...d, unit_price: e.target.value }))} /></Field>
      </div>
      <div><Button icon="plus" disabled={!draft.name.trim()} onClick={add}>Add spare</Button></div>
      {value.length > 0 && (
        <>
          <ul className="flex flex-col gap-1.5" aria-label={title}>
            {value.map((s, i) => (
              <li key={i} className="flex items-center gap-2 rounded-control border border-line bg-surface px-3 py-2 font-sans text-body-sm">
                <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">{s.name}{s.part_number && <span className="text-ink-muted"> ({s.part_number})</span>} <span className="text-ink-muted tabular">{s.quantity} × {formatCurrency(s.unit_price || 0)}</span></span>
                <span className="font-semibold tabular text-ink">{formatCurrency(s.total_cost ?? s.quantity * (s.unit_price ?? 0))}</span>
                <IconButton icon="delete" size="sm" variant="ghost" label={`Remove ${s.name}`} onClick={() => onChange(value.filter((_, n) => n !== i))} />
              </li>
            ))}
          </ul>
          <p className="text-right font-sans text-body-sm text-ink-muted">Total <span className="font-semibold tabular text-ink">{formatCurrency(total)}</span></p>
        </>
      )}
    </section>
  );
}
