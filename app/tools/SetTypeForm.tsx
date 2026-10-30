// app/tools/SetTypeForm.tsx — Add a set: enter a set's contents once (title plus content lines),
// then optionally make physical sets in store. Lines can be typed (Enter adds a row), pasted from
// Excel (tab-separated; a preview counts what was added and what could not be read), or uploaded
// as xlsx/csv with the same libraries the register import uses.
'use client';

import { useState } from 'react';
import * as XLSX from 'xlsx';
import { Button, Field, FieldGroup, Icon, Input, Notice, Segmented, Select, Textarea } from '@/components/ui-system';
import { CATEGORIES } from './prototype';
import { parsePastedLines, type SetTypeLineDraft } from './setTypes';

export type SetTypeSaveInput = {
  title: string; make_model?: string; category?: string;
  competency_required: boolean; notes?: string;
  lines: SetTypeLineDraft[];
};

const EMPTY_LINE: SetTypeLineDraft = { name: '', qty: 1 };

export function SetTypeForm({ defaultDepartment, onSave, onMakeInStore, onCancel }: {
  defaultDepartment: string;
  onSave: (input: SetTypeSaveInput) => Promise<{ set_type: { id: string } } | null>;
  onMakeInStore: (typeId: string, count: number, department: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState('');
  const [makeModel, setMakeModel] = useState('');
  const [category, setCategory] = useState('Hand tools');
  const [competencyRequired, setCompetencyRequired] = useState(false);
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<SetTypeLineDraft[]>([{ ...EMPTY_LINE }]);
  const [paste, setPaste] = useState('');
  const [pasteReport, setPasteReport] = useState<string | null>(null);
  const [storeCount, setStoreCount] = useState('0');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const setLine = (index: number, patch: Partial<SetTypeLineDraft>) =>
    setLines(current => current.map((line, position) => (position === index ? { ...line, ...patch } : line)));
  const addRow = () => setLines(current => [...current, { ...EMPTY_LINE }]);
  const removeRow = (index: number) => setLines(current => (current.length <= 1 ? current : current.filter((_, position) => position !== index)));

  const applyPaste = () => {
    const pasted = parsePastedLines(paste);
    if (!pasted.lines.length && !pasted.unreadable) return;
    setLines(current => {
      const kept = current.filter(line => line.name.trim());
      return [...kept, ...pasted.lines];
    });
    setPaste('');
    setPasteReport(`${pasted.lines.length} ${pasted.lines.length === 1 ? 'row' : 'rows'} added${pasted.unreadable ? `, ${pasted.unreadable} could not be read (every row needs a name and a whole quantity)` : ''}.`);
  };

  const applyUpload = async (file: File) => {
    try {
      const book = XLSX.read(await file.arrayBuffer(), { type: 'array' });
      const rows = XLSX.utils.sheet_to_json(book.Sheets[book.SheetNames[0]], { header: 1, defval: '' }) as unknown[][];
      const text = rows.map(row => row.slice(0, 3).join('\t')).join('\n');
      const pasted = parsePastedLines(text);
      if (!pasted.lines.length && !pasted.unreadable) { setPasteReport('No readable rows in that file. The first column must name the tool.'); return; }
      setLines(current => [...current.filter(line => line.name.trim()), ...pasted.lines]);
      setPasteReport(`${pasted.lines.length} ${pasted.lines.length === 1 ? 'row' : 'rows'} added from ${file.name}${pasted.unreadable ? `, ${pasted.unreadable} could not be read` : ''}.`);
    } catch { setPasteReport(`Could not read ${file.name}. Paste the rows instead.`); }
  };

  const save = async () => {
    const trimmed = lines.map(line => ({ ...line, name: line.name.trim(), size: line.size?.trim() || undefined })).filter(line => line.name);
    if (title.trim().length < 2) { setError('Name the set type (two letters or more).'); return; }
    if (!trimmed.length) { setError('Add at least one content line: name each piece in the set.'); return; }
    setError(null); setSaving(true);
    try {
      const created = await onSave({ title: title.trim(), make_model: makeModel.trim() || undefined, category, competency_required: competencyRequired, notes: notes.trim() || undefined, lines: trimmed });
      const count = Math.max(0, Number(storeCount) || 0);
      if (created && count > 0) await onMakeInStore(created.set_type.id, Math.min(count, 50), defaultDepartment);
    } finally { setSaving(false); }
  };

  return (
    <div className="flex flex-col gap-4">
      <FieldGroup label="Set details">
        <Field label="Set title"><Input aria-label="Set title" value={title} onChange={event => setTitle(event.target.value)} placeholder="Gedore socket set" /></Field>
        <Field label="Make / model"><Input aria-label="Make or model" value={makeModel} onChange={event => setMakeModel(event.target.value)} placeholder="Gedore" /></Field>
        <Field label="Category">
          <Select aria-label="Category" value={category} onValueChange={setCategory} options={[...new Set([...CATEGORIES])].map(value => ({ value, label: value }))} />
        </Field>
        <Field label="Competency">
          <Segmented label="Competency" value={competencyRequired ? 'required' : 'anyone'} onValueChange={value => setCompetencyRequired(value === 'required')}
            options={[{ value: 'anyone', label: 'Anyone may receive' }, { value: 'required', label: 'Approval required' }]} />
        </Field>
        <Field label="Notes"><Textarea aria-label="Notes" value={notes} onChange={event => setNotes(event.target.value)} rows={2} /></Field>
      </FieldGroup>
      <section aria-label="Content lines" className="flex flex-col gap-2">
        <h3 className="font-sans text-label font-medium text-ink">Content lines ({lines.filter(line => line.name.trim()).length})</h3>
        <ol className="flex flex-col gap-2">
          {lines.map((line, index) => (
            <li key={index} className="grid grid-cols-[2rem_1fr_5rem_4rem_auto] items-center gap-2">
              <span aria-hidden="true" className="font-sans text-caption text-ink-muted">{index + 1}</span>
              <Input aria-label={`Line ${index + 1} name`} value={line.name} placeholder="Spanner 13mm"
                onChange={event => setLine(index, { name: event.target.value })}
                onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); addRow(); } }} />
              <Input aria-label={`Line ${index + 1} size`} value={line.size ?? ''} placeholder="13" onChange={event => setLine(index, { size: event.target.value })} />
              <Input aria-label={`Line ${index + 1} quantity`} value={String(line.qty)} inputMode="numeric"
                onChange={event => { const qty = Number(event.target.value); setLine(index, { qty: Number.isInteger(qty) && qty > 0 ? Math.min(qty, 500) : line.qty }); }} />
              <button type="button" aria-label={`Remove line ${index + 1}`} onClick={() => removeRow(index)}
                className="focus-ring touch-target rounded-control p-1 text-ink-muted hover:text-ink" disabled={lines.length <= 1}>
                <Icon name="delete" size="sm" />
              </button>
            </li>
          ))}
        </ol>
        <div><Button variant="secondary" icon="plus" onClick={addRow}>Add a line</Button></div>
        <Field label="Paste from Excel"><Textarea aria-label="Paste from Excel" value={paste} rows={3} placeholder={'Spanner 13mm\t13\t2\nTorque wrench\t\t1'}
          onChange={event => setPaste(event.target.value)} /></Field>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" onClick={applyPaste} disabled={!paste.trim()}>Add pasted rows</Button>
          <label className="focus-ring touch-target inline-flex cursor-pointer items-center gap-1.5 rounded-control px-3 py-2 font-sans text-body-sm text-ink">
            <Icon name="upload" size="sm" />Upload xlsx or csv
            <input type="file" accept=".xlsx,.csv" className="sr-only" onChange={event => { const file = event.target.files?.[0]; if (file) void applyUpload(file); event.target.value = ''; }} />
          </label>
        </div>
        {pasteReport && <Notice tone="info" title="Paste result">{pasteReport}</Notice>}
      </section>
      <Field label="How many in store now?">
        <Input aria-label="How many in store now" value={storeCount} inputMode="numeric" placeholder="0"
          onChange={event => setStoreCount(event.target.value.replace(/[^0-9]/g, '').slice(0, 2))} />
      </Field>
      {error && <Notice tone="danger" title="Cannot save">{error}</Notice>}
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button variant="primary" icon="success" pending={saving} onClick={() => { void save(); }}>{saving ? 'Saving…' : 'Save set type'}</Button>
      </div>
    </div>
  );
}
