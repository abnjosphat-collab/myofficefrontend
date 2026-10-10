// app/spares/SpareForm.tsx — add or edit a spare part: stock code, description and price (required), stock levels and priority,
// categories (pick from the common ones and those already in use, or add a new one), machine, location and supplier. The stock code
// is fixed once the part exists. A refused save shows inside the dialog and keeps what was typed.
'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button, Checkbox, Field, FormDialog, Input, Select, Textarea } from '@/components/ui-system';
import { categoriesOf, PRIORITY } from './stock';
import type { Spare, SpareFormData } from './types';
import { dialogKey, useResetOnOpen } from '@/lib/useResetOnOpen';

const PARTS = ['Hydraulic power packs', 'Lubricants', 'Dewatering/Pumps', 'Steels', 'Stationery'];
const EQUIPMENT = ['Winders', 'Conveyance', 'Airloaders', 'Compressors', 'Locomotives', 'Scrappers', 'Winches', 'Transformers'];
const PRIORITIES = (Object.keys(PRIORITY) as Spare['priority'][]).map(value => ({ value, label: PRIORITY[value].label }));

interface Draft { stock_code: string; description: string; unit_price: string; current_quantity: string; min_quantity: string; max_quantity: string; unit_of_measure: string; priority: Spare['priority']; safety_stock: boolean; categories: string[]; machine_type: string; storage_location: string; supplier: string; notes: string }
const blank = (): Draft => ({ stock_code: '', description: '', unit_price: '0', current_quantity: '0', min_quantity: '1', max_quantity: '10', unit_of_measure: 'UN', priority: 'medium', safety_stock: false, categories: [], machine_type: '', storage_location: '', supplier: '', notes: '' });
const fromSpare = (s: Spare): Draft => ({
  stock_code: s.stock_code, description: s.description, unit_price: String(s.unit_price), current_quantity: String(s.current_quantity), min_quantity: String(s.min_quantity), max_quantity: String(s.max_quantity),
  unit_of_measure: s.unit_of_measure || 'UN', priority: s.priority, safety_stock: s.safety_stock, categories: categoriesOf(s), machine_type: s.machine_type || '', storage_location: s.storage_location || '', supplier: s.supplier || '', notes: s.notes || '',
});
const num = (v: string) => (Number.isFinite(parseFloat(v)) ? parseFloat(v) : 0);

function CategoryPicker({ value, onChange, inUse }: { value: string[]; onChange: (v: string[]) => void; inUse: string[] }) {
  const [text, setText] = useState('');
  const toggle = (c: string) => onChange(value.includes(c) ? value.filter(x => x !== c) : [...value, c]);
  const add = () => { const t = text.trim(); if (t && !value.includes(t)) onChange([...value, t]); setText(''); };
  const known = new Set([...PARTS, ...EQUIPMENT]);
  const group = (title: string, items: string[]) => items.length > 0 && (
    <div role="group" aria-label={title} className="flex flex-wrap items-center gap-1.5"><span className="w-20 shrink-0 font-sans text-caption text-ink-muted">{title}</span>{items.map(c => <Button key={c} size="sm" variant={value.includes(c) ? 'primary' : 'secondary'} aria-pressed={value.includes(c)} onClick={() => toggle(c)}>{c}</Button>)}</div>
  );
  return (
    <div className="flex flex-col gap-2">
      {value.length > 0 && <p className="font-sans text-body-sm text-ink" aria-live="polite">Chosen: {value.join(', ')}</p>}
      {group('Parts', PARTS)}{group('Equipment', EQUIPMENT)}{group('In use', inUse.filter(c => !known.has(c)))}
      <div className="flex items-end gap-2"><Field label="Add a new category" optional className="flex-1"><Input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} placeholder="Type it and press Enter" /></Field><Button icon="plus" disabled={!text.trim()} onClick={add}>Add</Button></div>
    </div>
  );
}

export function SpareForm({ open, spare, all, onOpenChange, onSave }: { open: boolean; spare: Spare | null; all: Spare[]; onOpenChange: (open: boolean) => void; onSave: (data: SpareFormData, id?: number) => Promise<void> }) {
  const [d, setD] = useState<Draft>(blank);
  const [touched, setTouched] = useState(false);
  useResetOnOpen(dialogKey(open, spare?.id), () => { setTouched(false); setD(spare ? fromSpare(spare) : blank()); });
  const set = (patch: Partial<Draft>) => setD(prev => ({ ...prev, ...patch }));
  const editing = !!spare;
  const inUse = useMemo(() => [...new Set(all.flatMap(categoriesOf))].sort(), [all]);
  const suppliers = useMemo(() => [...new Set(all.map(s => (s.supplier || '').trim()).filter(Boolean))].sort(), [all]);
  const problems = { code: !d.stock_code.trim() ? 'Enter the stock code.' : undefined, description: !d.description.trim() ? 'Enter a description.' : undefined };
  const err = (m?: string) => (touched ? m : undefined);

  const submit = async () => {
    setTouched(true);
    if (problems.code || problems.description) return false;
    await onSave({
      stock_code: d.stock_code.trim(), description: d.description.trim(), category: d.categories[0] || '', categories: d.categories, machine_type: d.machine_type, current_quantity: num(d.current_quantity),
      min_quantity: num(d.min_quantity), max_quantity: num(d.max_quantity), unit_price: num(d.unit_price), unit_of_measure: d.unit_of_measure || 'UN', priority: d.priority, storage_location: d.storage_location,
      supplier: d.supplier, safety_stock: d.safety_stock, notes: d.notes,
    }, spare?.id);
    toast.success(editing ? 'Spare updated.' : 'Spare added.');
  };

  return (
    <FormDialog open={open} onOpenChange={onOpenChange} size="lg" title={editing ? `Edit ${spare.stock_code}` : 'Add a spare part'} description={editing ? spare.description : 'Stock code, description and price are required.'} submitLabel={editing ? 'Save changes' : 'Add spare'} onSubmit={submit}>
      <div className="flex flex-col gap-6">
        <section aria-labelledby="sf-req" className="flex flex-col gap-3">
          <h3 id="sf-req" className="border-b border-line pb-1.5 font-display text-section font-semibold text-ink">The part</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Stock code" required error={err(problems.code)}><Input value={d.stock_code} disabled={editing} onChange={e => set({ stock_code: e.target.value })} placeholder="106335" autoComplete="off" /></Field>
            <Field label="Unit price (USD)" required><Input type="number" min={0} step={0.01} value={d.unit_price} onChange={e => set({ unit_price: e.target.value })} /></Field>
            <Field label="Description" required error={err(problems.description)} className="sm:col-span-2"><Input value={d.description} onChange={e => set({ description: e.target.value })} placeholder="Bearing 6204 2RS" /></Field>
          </div>
        </section>
        <section aria-labelledby="sf-stock" className="flex flex-col gap-3">
          <h3 id="sf-stock" className="border-b border-line pb-1.5 font-display text-section font-semibold text-ink">Stock levels</h3>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Field label="On hand"><Input type="number" min={0} value={d.current_quantity} onChange={e => set({ current_quantity: e.target.value })} /></Field>
            <Field label="Minimum"><Input type="number" min={0} value={d.min_quantity} onChange={e => set({ min_quantity: e.target.value })} /></Field>
            <Field label="Maximum"><Input type="number" min={0} value={d.max_quantity} onChange={e => set({ max_quantity: e.target.value })} /></Field>
            <Field label="Unit of measure"><Input value={d.unit_of_measure} onChange={e => set({ unit_of_measure: e.target.value })} placeholder="UN" /></Field>
            <Field label="Priority" className="col-span-2"><Select aria-label="Priority" value={d.priority} onValueChange={v => set({ priority: v as Spare['priority'] })} options={PRIORITIES} /></Field>
            <div className="col-span-2 flex items-end"><Checkbox label="Safety stock" description="Must always be on the shelf." checked={d.safety_stock} onChange={e => set({ safety_stock: e.target.checked })} /></div>
          </div>
        </section>
        <section aria-labelledby="sf-class" className="flex flex-col gap-3">
          <h3 id="sf-class" className="border-b border-line pb-1.5 font-display text-section font-semibold text-ink">Classification</h3>
          <CategoryPicker value={d.categories} onChange={v => set({ categories: v })} inUse={inUse} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Machine or equipment" optional><Input value={d.machine_type} onChange={e => set({ machine_type: e.target.value })} placeholder="Crusher, winder" /></Field>
            <Field label="Storage location" optional><Input value={d.storage_location} onChange={e => set({ storage_location: e.target.value })} placeholder="A1-S3" /></Field>
            <Field label="Supplier" optional className="sm:col-span-2"><Input list="sf-suppliers" value={d.supplier} onChange={e => set({ supplier: e.target.value })} autoComplete="off" /><datalist id="sf-suppliers" aria-label="Suppliers in use">{suppliers.map(s => <option key={s} value={s} label={s} />)}</datalist></Field>
            <Field label="Notes" optional className="sm:col-span-2"><Textarea rows={2} value={d.notes} onChange={e => set({ notes: e.target.value })} placeholder="Anything else worth knowing" /></Field>
          </div>
        </section>
      </div>
    </FormDialog>
  );
}
