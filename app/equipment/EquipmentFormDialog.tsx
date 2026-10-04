// app/equipment/EquipmentFormDialog.tsx — add or edit an asset. Four labelled sections in one scrolling form (basic,
// technical, maintenance, supplier); the equipment ID and name are required and the rest can be left empty. A refused save
// is shown inside the dialog and keeps everything typed.
'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Field, FormDialog, Input, Select, Textarea } from '@/components/ui-system';
import { STATUSES, STATUS_LABELS, blankForm, formFromItem, toPayload, type EquipmentForm } from './equipmentLogic';
import type { EquipmentItem } from './types';

const CRITICALITY = [{ value: '__none__', label: 'Not set' }, { value: 'High', label: 'High' }, { value: 'Medium', label: 'Medium' }, { value: 'Low', label: 'Low' }];

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <h3 id={id} className="border-b border-line pb-1.5 font-display text-section font-semibold text-ink">{title}</h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

export function EquipmentFormDialog({ open, item, locations, onOpenChange, onSave }: {
  open: boolean; item: EquipmentItem | null; locations: string[]; onOpenChange: (open: boolean) => void;
  onSave: (id: number | string | null, payload: Record<string, unknown>) => Promise<void>;
}) {
  const [form, setForm] = useState<EquipmentForm>(blankForm);
  const [touched, setTouched] = useState(false);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const key = open ? String(item?.id ?? 'new') : null;
  if (key !== loadedFor) { setLoadedFor(key); if (key !== null) { setTouched(false); setForm(item ? formFromItem(item) : blankForm()); } }
  const set = (patch: Partial<EquipmentForm>) => setForm(f => ({ ...f, ...patch }));
  const text = (k: keyof EquipmentForm, placeholder?: string) => <Input value={form[k]} onChange={e => set({ [k]: e.target.value } as Partial<EquipmentForm>)} placeholder={placeholder} />;
  const missing = useMemo(() => ({ id: !form.equipment_id.trim(), name: !form.name.trim() }), [form.equipment_id, form.name]);
  const err = (bad: boolean, msg: string) => (touched && bad ? msg : undefined);

  const submit = async () => {
    setTouched(true);
    if (missing.id || missing.name) return false;
    await onSave(item?.id ?? null, toPayload({ ...form, equipment_id: form.equipment_id.trim(), name: form.name.trim() }));
    toast.success(item ? 'Equipment updated.' : 'Equipment added.');
  };

  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title={item ? 'Edit equipment' : 'Add equipment'} description={item ? item.equipment_id : 'The equipment ID and name are required.'} submitLabel={item ? 'Update equipment' : 'Add equipment'} onSubmit={submit} size="xl">
      <div className="flex flex-col gap-6">
        <Section id="eq-basic" title="Basic information">
          <Field label="Equipment ID" required error={err(missing.id, 'Enter the equipment ID.')}>{text('equipment_id', 'EQP-001')}</Field>
          <Field label="Equipment name" required error={err(missing.name, 'Enter the equipment name.')}>{text('name', 'Industrial drill press')}</Field>
          <Field label="Model" optional>{text('model', 'DP-5000')}</Field>
          <Field label="Manufacturer" optional>{text('manufacturer', 'Atlas Copco')}</Field>
          <Field label="Serial number" optional>{text('serial_number', 'SN-DP5000-001')}</Field>
          <Field label="Category" optional>{text('category', 'Machinery')}</Field>
          <Field label="Status"><Select aria-label="Status" value={form.status} onValueChange={v => set({ status: v })} options={STATUSES.map(s => ({ value: s, label: STATUS_LABELS[s] }))} /></Field>
          <Field label="Criticality" optional><Select aria-label="Criticality" value={form.criticality || '__none__'} onValueChange={v => set({ criticality: v === '__none__' ? '' : v })} options={CRITICALITY} /></Field>
          <Field label="Location" optional>
            <Input list="equipment-locations" value={form.location} onChange={e => set({ location: e.target.value })} autoComplete="off" placeholder="Workshop A" />
            <datalist id="equipment-locations">{locations.map(l => <option key={l} value={l} label={l} />)}</datalist>
          </Field>
          <Field label="Department" optional>{text('department', 'Manufacturing')}</Field>
          <Field label="Commission date" optional><Input type="date" value={form.commission_date} onChange={e => set({ commission_date: e.target.value })} /></Field>
          <div className="sm:col-span-2"><Field label="Description" optional><Textarea rows={3} value={form.description} onChange={e => set({ description: e.target.value })} placeholder="What it is, what it is for, key features" /></Field></div>
        </Section>
        <Section id="eq-tech" title="Technical">
          <Field label="Purchase cost ($)" optional><Input type="number" inputMode="decimal" min="0" step="0.01" value={form.purchase_cost} onChange={e => set({ purchase_cost: e.target.value })} placeholder="12500.00" /></Field>
          <Field label="Power rating" optional>{text('power_rating', '45kW')}</Field>
          <div className="sm:col-span-2"><Field label="Technical specifications" optional><Textarea rows={4} value={form.specifications} onChange={e => set({ specifications: e.target.value })} /></Field></div>
        </Section>
        <Section id="eq-maint" title="Maintenance">
          <Field label="Maintenance interval (months)" optional><Input type="number" inputMode="numeric" min="0" value={form.maintenance_interval} onChange={e => set({ maintenance_interval: e.target.value })} placeholder="6" /></Field>
          <div className="sm:col-span-2"><Field label="Maintenance notes" optional><Textarea rows={3} value={form.maintenance_notes} onChange={e => set({ maintenance_notes: e.target.value })} placeholder="History, known issues or special instructions" /></Field></div>
        </Section>
        <Section id="eq-supplier" title="Supplier">
          <Field label="Supplier name" optional>{text('supplier')}</Field>
          <Field label="Contact person" optional>{text('supplier_contact')}</Field>
          <Field label="Phone number" optional><Input inputMode="tel" value={form.supplier_phone} onChange={e => set({ supplier_phone: e.target.value })} /></Field>
          <Field label="Warranty information" optional>{text('warranty_info', '2 years parts and labour')}</Field>
        </Section>
      </div>
    </FormDialog>
  );
}
