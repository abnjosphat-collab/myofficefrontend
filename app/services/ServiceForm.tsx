// app/services/ServiceForm.tsx — add or edit a job's own details (what was done, by whom, the reference numbers and amount).
// The approvals are filled in from the job's detail, not here. A refused save is shown inside the dialog and keeps everything typed.
'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Field, FormDialog, Input, Select, Textarea } from '@/components/ui-system';
import { CATEGORIES } from './meta';
import { emptyRecord } from './useServicesData';
import type { ServiceRecord } from './types';

const NONE = '__none__';

export function ServiceForm({ open, record, onOpenChange, onSave }: {
  open: boolean; record: ServiceRecord | null; onOpenChange: (open: boolean) => void; onSave: (r: ServiceRecord) => Promise<void>;
}) {
  const [form, setForm] = useState<ServiceRecord>(emptyRecord);
  const [touched, setTouched] = useState(false);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const key = open ? (record ? record.id || 'scanned' : 'new') : null;
  if (key !== loadedFor) { setLoadedFor(key); if (key !== null) { setTouched(false); setForm(record ?? emptyRecord()); } }
  const set = (patch: Partial<ServiceRecord>) => setForm(f => ({ ...f, ...patch }));
  const text = (k: keyof ServiceRecord, placeholder?: string) => <Input value={String(form[k] ?? '')} onChange={e => set({ [k]: e.target.value } as Partial<ServiceRecord>)} placeholder={placeholder} />;
  const editing = !!record?.id;

  const submit = async () => {
    setTouched(true);
    if (!form.description.trim()) return false;
    await onSave({ ...form, description: form.description.trim() });
    toast.success(editing ? 'Service record updated.' : 'Service record added.');
  };
  return (
    <FormDialog open={open} onOpenChange={onOpenChange} size="lg" title={editing ? 'Edit service' : 'New service'} description={record && !editing ? 'Read from the file. Check every field before saving.' : 'The description is required.'} submitLabel={editing ? 'Save changes' : 'Add service'} onSubmit={submit}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Description of the service" required error={touched && !form.description.trim() ? 'Describe what was done.' : undefined} className="sm:col-span-2">
          <Textarea rows={3} value={form.description} onChange={e => set({ description: e.target.value })} placeholder="Replaced the hydraulic pump on compressor 3" />
        </Field>
        <Field label="Date of service" optional><Input type="date" value={form.date} onChange={e => set({ date: e.target.value })} /></Field>
        <Field label="Category" optional><Select aria-label="Category" value={form.category || NONE} onValueChange={v => set({ category: v === NONE ? '' : v })} options={[{ value: NONE, label: 'Not set' }, ...CATEGORIES.map(c => ({ value: c, label: c }))]} /></Field>
        <Field label="Supplier or contractor" optional>{text('supplier', 'Company name')}</Field>
        <Field label="Contact person" optional>{text('contact_person', 'Representative')}</Field>
        <Field label="Requisition number" optional>{text('requisition_number', 'REQ-001')}</Field>
        <Field label="Order (PO) number" optional>{text('order_number', 'PO-001')}</Field>
        <Field label="Invoice number" optional>{text('invoice_number', 'INV-001')}</Field>
        <Field label="Total amount" optional description="Kept as typed, so include the currency.">{text('amount', '$1,500.00')}</Field>
        <Field label="General comments" optional className="sm:col-span-2"><Textarea rows={2} value={form.general_comments} onChange={e => set({ general_comments: e.target.value })} placeholder="Anything else worth knowing" /></Field>
      </div>
    </FormDialog>
  );
}
