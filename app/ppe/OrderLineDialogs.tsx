// app/ppe/OrderLineDialogs.tsx — the order basket's three dialogs: edit a line (quantity, size, note), choose from due soon
// (type filter + tick + add), and add a free line (something with no PPE record). All dumb: they collect and call back.
'use client';

import { useMemo, useState } from 'react';
import { Button, DetailActions, Dialog, Field, Input, OptionChecklist, Select } from '@/components/ui-system';
import { fmtDate } from '@/components/shared/utils';
import { SECTION_ORDER } from '@/lib/sections';
import { dialogKey, useResetOnOpen } from '@/lib/useResetOnOpen';
import type { BasketLine } from './orderBasket';
import { TYPE_OPTIONS, typeName } from './ppeMeta';
import { normalizePpeType } from './ppeTypes';
import type { FreeLineDraft, OrderLinePatch } from './useOrderList';
import type { PPERecord } from './types';

const ALL = 'all';

export function LineEditDialog({ line, onClose, onSave }: { line: BasketLine | null; onClose: () => void; onSave: (id: string, patch: OrderLinePatch) => void }) {
  const [qty, setQty] = useState('1');
  const [size, setSize] = useState('');
  const [note, setNote] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  useResetOnOpen(line ? line.record_id : null, () => { setQty(String(line?.qty ?? 1)); setSize(line?.size ?? ''); setNote(line?.note ?? ''); setProblem(null); });
  const save = () => {
    const n = Math.floor(Number(qty));
    if (!Number.isFinite(n) || n < 1) { setProblem('Quantity must be at least 1.'); return; }
    if (!line) return;
    onSave(line.record_id, { qty: n, size: size.trim(), note: note.trim() });
    onClose();
  };
  return (
    <Dialog
      open={!!line} onOpenChange={o => { if (!o) onClose(); }} title="Edit order line"
      description={line ? `${line.employee_name || 'Free line'} — ${typeName(line.ppe_type)}${line.size ? `, size ${line.size}` : ''}` : undefined}
      footer={<DetailActions onClose={onClose}><Button variant="primary" onClick={save}>Save line</Button></DetailActions>}
    >
      <div className="flex flex-col gap-4">
        <Field label="Quantity" error={problem ?? undefined} className="max-w-32"><Input inputMode="numeric" value={qty} onChange={e => { setQty(e.target.value); setProblem(null); }} /></Field>
        <Field label="Size" description="Left blank when it does not come in sizes." className="max-w-48"><Input value={size} onChange={e => setSize(e.target.value)} /></Field>
        <Field label="Note for the purchaser" optional><Input value={note} onChange={e => setNote(e.target.value)} placeholder="Wide fit, left-handed, …" /></Field>
      </div>
    </Dialog>
  );
}

export function ChooseSoonDialog({ open, records, onClose, onAdd }: { open: boolean; records: PPERecord[]; onClose: () => void; onAdd: (ids: string[]) => void }) {
  const [type, setType] = useState(ALL);
  const [picked, setPicked] = useState<string[]>([]);
  useResetOnOpen(dialogKey(open, null), () => { setType(ALL); setPicked([]); });
  const types = useMemo(() => [...new Set(records.map(r => r.ppe_type))].sort(), [records]);
  const options = useMemo(() => records
    .filter(r => type === ALL || normalizePpeType(r.ppe_type) === normalizePpeType(type))
    .map(r => ({ value: String(r.id), label: `${r.employee_name} — ${typeName(r.ppe_type)}${r.size ? `, size ${r.size}` : ''}`, description: r.expiry_date ? `Expires ${fmtDate(r.expiry_date)}` : 'No expiry' })), [records, type]);
  const labels = useMemo(() => new Map(records.map(r => [String(r.id), `${r.employee_name} — ${typeName(r.ppe_type)}`] as [string, string])), [records]);
  return (
    <Dialog
      open={open} onOpenChange={o => { if (!o) onClose(); }} size="lg" title="Choose from due soon"
      description="Items expiring in the next 30 days that are not on the order list yet."
      footer={<DetailActions onClose={onClose}><Button variant="primary" disabled={picked.length === 0} onClick={() => { onAdd(picked); onClose(); }}>{picked.length > 0 ? `Add ${picked.length} to the order list` : 'Add to the order list'}</Button></DetailActions>}
    >
      <OptionChecklist
        label="Due soon" options={options} value={picked} onChange={setPicked}
        searchPlaceholder="Search name or item" emptyText="Nothing is due soon that is not on the order list yet."
        noneText="Nothing picked yet." chipsLabel="Picked items" labelOf={v => labels.get(v) ?? v}
        searchAside={<Select aria-label="PPE type" className="w-44 shrink-0" value={type} onValueChange={setType} options={[{ value: ALL, label: 'All types' }, ...types.map(t => ({ value: t, label: typeName(t) }))]} />}
      />
    </Dialog>
  );
}

export function FreeLineDialog({ open, onClose, onSave, knownSections = [] }: {
  open: boolean; onClose: () => void; onSave: (draft: FreeLineDraft) => void;
  /** Sections already on the order list (the register has some beyond the standard four, e.g. Underground). */
  knownSections?: string[];
}) {
  const sectionOptions = useMemo(() => [{ value: '', label: 'None' }, ...[...new Set([...SECTION_ORDER, ...knownSections.filter(s => s !== 'Unassigned')])].map(s => ({ value: s, label: s }))], [knownSections]);
  const [ppeType, setPpeType] = useState('');
  const [item, setItem] = useState('');
  const [size, setSize] = useState('');
  const [qty, setQty] = useState('1');
  const [who, setWho] = useState('');
  const [section, setSection] = useState('');
  const [note, setNote] = useState('');
  const [problems, setProblems] = useState<{ ppe_type?: string; item_name?: string; qty?: string }>({});
  useResetOnOpen(dialogKey(open, null), () => { setPpeType(''); setItem(''); setSize(''); setQty('1'); setWho(''); setSection(''); setNote(''); setProblems({}); });
  const save = () => {
    const next: typeof problems = {};
    if (!ppeType) next.ppe_type = 'Choose the PPE type.';
    if (!item.trim()) next.item_name = 'Enter the item or brand.';
    const n = Math.floor(Number(qty));
    if (!Number.isFinite(n) || n < 1) next.qty = 'Quantity must be at least 1.';
    setProblems(next);
    if (Object.keys(next).length > 0) return;
    onSave({ ppe_type: ppeType, item_name: item.trim(), size: size.trim(), qty: n, note: note.trim(), ...(who.trim() ? { employee_name: who.trim() } : {}), ...(section ? { section } : {}) });
    onClose();
  };
  return (
    <Dialog
      open={open} onOpenChange={o => { if (!o) onClose(); }} title="Add a free line"
      description="Something with no PPE record — spares, extras, a guess at next month. It never matches an issue."
      footer={<DetailActions onClose={onClose}><Button variant="primary" icon="plus" onClick={save}>Add free line</Button></DetailActions>}
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="PPE type" error={problems.ppe_type} required><Select aria-label="PPE type" value={ppeType} onValueChange={v => { setPpeType(v); setProblems(p => ({ ...p, ppe_type: undefined })); }} options={[{ value: '', label: 'Choose a type' }, ...TYPE_OPTIONS]} /></Field>
        <Field label="Item or brand" error={problems.item_name} required><Input value={item} onChange={e => { setItem(e.target.value); setProblems(p => ({ ...p, item_name: undefined })); }} placeholder="Spare laces" /></Field>
        <Field label="Size" optional><Input value={size} onChange={e => setSize(e.target.value)} /></Field>
        <Field label="Quantity" error={problems.qty} required><Input inputMode="numeric" value={qty} onChange={e => { setQty(e.target.value); setProblems(p => ({ ...p, qty: undefined })); }} /></Field>
        <Field label="For" description="A name to print on the order, when someone is known." optional><Input value={who} onChange={e => setWho(e.target.value)} placeholder="Optional" /></Field>
        <Field label="Section" description="Which section's order this goes on." optional><Select aria-label="Section" value={section} onValueChange={setSection} options={sectionOptions} /></Field>
        <Field label="Note for the purchaser" optional><Input value={note} onChange={e => setNote(e.target.value)} /></Field>
      </div>
    </Dialog>
  );
}
