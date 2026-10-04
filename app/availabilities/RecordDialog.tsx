// app/availabilities/RecordDialog.tsx — log or edit one availability record. Downtime can be filled from the
// breakdowns recorded that day; the availability shown is calculated, and the server derives the stored value.
'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Field, FormDialog, Input, Progress, Select, StatusBadge, Textarea } from '@/components/ui-system';
import { todayLocal } from '@/lib/dates';
import { fetchBreakdownRecords } from './useAvailabilitiesData';
import { availabilityPercent, availabilityTone } from './calcAvailabilities';
import type { AvailRecord, Equipment } from './types';

type Form = { equipment_id: string; date: string; operational_hours: string; breakdown_hours: string; notes: string };
const emptyForm = (): Form => ({ equipment_id: '', date: todayLocal(), operational_hours: '24', breakdown_hours: '0', notes: '' });
const LABEL = { success: 'Excellent', warning: 'Acceptable', danger: 'Needs attention' } as const;

export function RecordDialog({ open, record, equipment, onOpenChange, onSave }: {
  open: boolean;
  record: AvailRecord | null;
  equipment: Equipment[];
  onOpenChange: (open: boolean) => void;
  onSave: (id: number | string | null, payload: Record<string, unknown>) => Promise<void>;
}) {
  const [form, setForm] = useState<Form>(emptyForm);
  const [touched, setTouched] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const key = open ? String(record?.id ?? 'new') : null;
  if (key !== loadedFor) {
    setLoadedFor(key);
    if (key !== null) {
      setTouched(false); setHint(null);
      setForm(record ? { equipment_id: String(record.equipment_id), date: record.date, operational_hours: String(record.operational_hours ?? ''), breakdown_hours: String(record.breakdown_hours ?? ''), notes: record.notes ?? '' } : emptyForm());
    }
  }
  const set = (patch: Partial<Form>) => setForm(f => ({ ...f, ...patch }));

  const op = parseFloat(form.operational_hours); const bd = parseFloat(form.breakdown_hours);
  const bad = {
    equipment: !form.equipment_id, date: !form.date,
    op: !(op > 0), bd: !(bd >= 0) || bd > op,
  };
  const pct = op > 0 && bd >= 0 && bd <= op ? availabilityPercent(op, bd) : null;

  // For a new record, the breakdowns already recorded that day fill the downtime. A failed lookup is said, not hidden.
  const prefill = async (equipmentId: string, date: string) => {
    if (record || !equipmentId || !date) return;
    try {
      const found = await fetchBreakdownRecords(`equipment_id=${equipmentId}&date_from=${date}&date_to=${date}`);
      if (found.length > 0) { setForm(f => ({ ...f, breakdown_hours: String(found[0].breakdown_hours) })); setHint(`Downtime filled from the breakdowns recorded on ${date}.`); }
      else setHint(null);
    } catch { setHint('Breakdowns for that day could not be looked up. Enter the downtime yourself.'); }
  };

  const submit = async () => {
    setTouched(true);
    if (Object.values(bad).some(Boolean)) return false;
    await onSave(record?.id ?? null, { equipment_id: parseInt(form.equipment_id, 10), date: form.date, operational_hours: op, breakdown_hours: bd, availability_percentage: availabilityPercent(op, bd), notes: form.notes });
    toast.success(record ? 'Availability record updated.' : 'Availability record logged.');
  };
  const err = (isBad: boolean, text: string) => (touched && isBad ? text : undefined);

  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title={record ? 'Edit availability record' : 'Log availability record'} description="Operating hours and downtime for one machine on one day." submitLabel={record ? 'Save changes' : 'Save record'} onSubmit={submit} size="md">
      <div className="flex flex-col gap-4">
        <Field label="Equipment" required error={err(bad.equipment, 'Choose the equipment.')} description={equipment.length === 0 ? 'The equipment list could not be loaded, so no machine can be chosen.' : undefined}>
          <Select aria-label="Equipment" placeholder="Select equipment" value={form.equipment_id} onValueChange={id => { set({ equipment_id: id }); prefill(id, form.date); }} options={equipment.map(e => ({ value: String(e.id), label: e.name }))} />
        </Field>
        <Field label="Date" required error={err(bad.date, 'Enter the date.')}>
          <Input type="date" value={form.date} onChange={e => { set({ date: e.target.value }); prefill(form.equipment_id, e.target.value); }} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Operational hours" required error={err(bad.op, 'Enter more than 0 hours.')}><Input type="number" inputMode="decimal" min="0" step="0.5" value={form.operational_hours} onChange={e => set({ operational_hours: e.target.value })} /></Field>
          <Field label="Downtime hours" error={err(bad.bd, 'Downtime must be 0 or more and no more than the operational hours.')} description={hint ?? undefined}><Input type="number" inputMode="decimal" min="0" step="0.5" value={form.breakdown_hours} onChange={e => set({ breakdown_hours: e.target.value })} /></Field>
        </div>
        <div className="flex flex-col gap-2 rounded-control bg-surface-subtle p-3" aria-live="polite">
          <div className="flex items-center justify-between gap-3">
            <p className="font-sans text-label font-medium text-ink">Calculated availability <span className="font-display text-title font-semibold tabular">{pct === null ? '—' : `${pct.toFixed(1)}%`}</span></p>
            {pct !== null && <StatusBadge tone={availabilityTone(pct)}>{LABEL[availabilityTone(pct)]}</StatusBadge>}
          </div>
          <Progress value={pct ?? 0} label="Calculated availability" />
        </div>
        <Field label="Notes" optional><Textarea rows={2} value={form.notes} onChange={e => set({ notes: e.target.value })} placeholder="Any remarks about this period" /></Field>
      </div>
    </FormDialog>
  );
}
