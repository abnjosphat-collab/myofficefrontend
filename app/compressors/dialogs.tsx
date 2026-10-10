// app/compressors/dialogs.tsx — add a compressor, and change a compressor's status.
'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Field, FormDialog, Icon, Input, Select, cn } from '@/components/ui-system';
import { STATUS_KEYS, STATUS_META } from './meta';
import type { AddCompressorFormData, Compressor } from './types';
import { useResetOnOpen } from '@/lib/useResetOnOpen';

const emptyForm = (): AddCompressorFormData => ({ name: '', model: '', capacity: '', location: '', status: 'standby', total_running_hours: 0, total_loaded_hours: 0, color: 'bg-brand-500' });

export function AddCompressorDialog({ open, onOpenChange, locations, onAdd }: {
  open: boolean; onOpenChange: (open: boolean) => void; locations: string[]; onAdd: (data: AddCompressorFormData) => Promise<void>;
}) {
  const [form, setForm] = useState<AddCompressorFormData>(emptyForm);
  const [touched, setTouched] = useState(false);
  const [wasOpen, setWasOpen] = useState(false);
  if (open !== wasOpen) { setWasOpen(open); if (open) { setForm(emptyForm()); setTouched(false); } }
  const set = (patch: Partial<AddCompressorFormData>) => setForm(p => ({ ...p, ...patch }));
  const num = (s: string) => Math.max(0, parseFloat(s) || 0);
  const missing = { name: !form.name.trim(), model: !form.model.trim(), capacity: !form.capacity.trim() };
  const loadedTooHigh = form.total_loaded_hours > form.total_running_hours;

  const submit = async () => {
    setTouched(true);
    if (Object.values(missing).some(Boolean) || loadedTooHigh) return false;
    await onAdd({ ...form, name: form.name.trim(), model: form.model.trim(), capacity: form.capacity.trim(), location: form.location.trim() || 'Main Plant' });
    toast.success(`${form.name.trim()} added.`);
  };
  const err = (bad: boolean, text: string) => (touched && bad ? text : undefined);

  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title="Add compressor" description="Name, model and capacity are required." submitLabel="Add compressor" onSubmit={submit} size="lg">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Compressor name" required error={err(missing.name, 'Enter a name.')}><Input value={form.name} onChange={e => set({ name: e.target.value })} placeholder="Compressor 1" /></Field>
        <Field label="Model" required error={err(missing.model, 'Enter the model.')}><Input value={form.model} onChange={e => set({ model: e.target.value })} placeholder="Atlas Copco GA37" /></Field>
        <Field label="Capacity" required error={err(missing.capacity, 'Enter the capacity.')}><Input value={form.capacity} onChange={e => set({ capacity: e.target.value })} placeholder="37 kW" /></Field>
        <Field label="Location" optional description="Defaults to Main Plant.">
          <Input list="compressor-locations" value={form.location} onChange={e => set({ location: e.target.value })} autoComplete="off" placeholder="Select or type a location" />
          <datalist id="compressor-locations">{locations.map(l => <option key={l} value={l} label={l} />)}</datalist>
        </Field>
        <Field label="Total running hours"><Input type="number" inputMode="decimal" min="0" step="0.1" value={String(form.total_running_hours)} onChange={e => set({ total_running_hours: num(e.target.value) })} /></Field>
        <Field label="Total loaded hours" error={err(loadedTooHigh, 'Loaded hours cannot exceed running hours.')}><Input type="number" inputMode="decimal" min="0" step="0.1" value={String(form.total_loaded_hours)} onChange={e => set({ total_loaded_hours: num(e.target.value) })} /></Field>
        <Field label="Initial status"><Select aria-label="Initial status" value={form.status} onValueChange={v => set({ status: v })} options={STATUS_KEYS.map(k => ({ value: k, label: STATUS_META[k].label }))} /></Field>
      </div>
    </FormDialog>
  );
}

export function StatusDialog({ compressor, onClose, onChange }: {
  compressor: Compressor | null; onClose: () => void; onChange: (id: number, status: string) => Promise<void>;
}) {
  const [choice, setChoice] = useState('');
  useResetOnOpen(compressor ? String(compressor.id) : null, () => setChoice(compressor?.status ?? ''));
  const submit = async () => {
    if (!compressor) return false;
    if (choice === compressor.status) throw new Error('Choose a different status first.');
    await onChange(compressor.id, choice);
    toast.success(`${compressor.name} is now ${STATUS_META[choice]?.label.toLowerCase() ?? choice}.`);
  };
  return (
    <FormDialog open={!!compressor} onOpenChange={o => { if (!o) onClose(); }} title="Change status" description={compressor ? `${compressor.name} is currently ${STATUS_META[compressor.status]?.label.toLowerCase() ?? compressor.status}.` : undefined} submitLabel="Update status" onSubmit={submit} size="sm">
      <div role="group" aria-label="New status" className="grid grid-cols-2 gap-2">
        {STATUS_KEYS.map(k => (
          <button key={k} type="button" aria-pressed={choice === k} onClick={() => setChoice(k)}
            className={cn('focus-ring inline-flex items-center gap-2 rounded-control border px-3 py-2.5 font-sans text-label font-medium transition-colors', choice === k ? 'border-action bg-action-soft text-action' : 'border-line-control bg-surface text-ink hover:bg-surface-subtle')}>
            <Icon name={STATUS_META[k].icon} size="md" weight={choice === k ? 'emphasis' : 'control'} />{STATUS_META[k].label}
          </button>
        ))}
      </div>
    </FormDialog>
  );
}
