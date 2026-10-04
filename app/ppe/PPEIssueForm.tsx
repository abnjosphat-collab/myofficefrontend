// app/ppe/PPEIssueForm.tsx — issue PPE to someone or edit an issue: who, what, the size, the dates, the condition and status. The expiry
// is worked out from the issue date and the replacement matrix until someone types their own. An employee ID that is not on the
// roster asks before saving. A refused save shows inside the dialog and keeps what was typed.
'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Combobox, Field, FormDialog, Input, Select, Textarea, useConfirm } from '@/components/ui-system';
import { PersonInput } from '@/components/shared/PersonInput';
import { todayLocal } from '@/lib/dates';
import { SECTION_ORDER } from '@/lib/sections';
import { expiryFor, formProblems } from './ppeLogic';
import { CONDITIONS, STATUSES, TYPE_OPTIONS } from './ppeMeta';
import type { EmployeeRow, EmployeeWithPPE, FormState, PPERecord } from './types';

const blank = (): FormState => ({ employee_name: '', employee_id: '', position: '', ppe_type: 'helmet', item_name: '', size: '', issue_date: todayLocal(), expiry_date: '', condition: 'good', status: 'active', notes: '', issued_by: '', location: 'Workshop', mine_section: '' });
const seedOf = (r: PPERecord, employee: EmployeeWithPPE | null): FormState => ({
  employee_name: employee?.employee_name || r.employee_name || '', employee_id: employee?.employee_id || r.employee_id || '', position: employee?.position || r.position || '', ppe_type: r.ppe_type || 'helmet',
  item_name: r.item_name || '', size: r.size || '', issue_date: r.issue_date || todayLocal(), expiry_date: r.expiry_date || '', condition: r.condition || 'good', status: r.status || 'active',
  notes: r.notes || '', issued_by: r.issued_by || '', location: r.location || 'Workshop', mine_section: r.mine_section || '',
});
const SECTIONS = [{ value: '', label: 'Not set' }, ...SECTION_ORDER.map(s => ({ value: s, label: s }))];

export function PPEIssueForm({ open, record, prefill, employee, employees, matrix, onOpenChange, onSave }: {
  open: boolean; record: PPERecord | null; prefill: PPERecord | null; employee: EmployeeWithPPE | null; employees: EmployeeRow[]; matrix: Record<string, number>;
  onOpenChange: (open: boolean) => void; onSave: (form: FormState, id?: string) => Promise<void>;
}) {
  const confirm = useConfirm();
  const [form, setForm] = useState<FormState>(blank);
  const [touchedExpiry, setTouchedExpiry] = useState(false);
  const [touched, setTouched] = useState(false);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const key = open ? `${record?.id ?? (prefill ? `prefill-${prefill.employee_id}-${prefill.ppe_type}` : 'new')}-${employee?.employee_id ?? ''}` : null;
  if (key !== loadedFor) {
    setLoadedFor(key);
    if (key !== null) { setTouched(false); setTouchedExpiry(false); const seed = record ?? prefill; setForm(seed ? seedOf(seed, employee) : { ...blank(), employee_name: employee?.employee_name ?? '', employee_id: employee?.employee_id ?? '', position: employee?.position ?? '', mine_section: employee?.section ?? '' }); }
  }
  const editing = !!record;
  const set = (patch: Partial<FormState>) => setForm(f => ({ ...f, ...patch }));
  // Until someone types an expiry, it follows the issue date and type (an old record included, so fixing its date recalculates it).
  const computed = expiryFor(form.ppe_type, form.issue_date, matrix);
  const expiry = touchedExpiry || computed === undefined ? form.expiry_date : computed;
  const effective = { ...form, expiry_date: expiry };
  const problems = formProblems(effective);
  const err = (k: keyof typeof problems) => (touched ? problems[k] : undefined);
  const options = useMemo(() => employees.map(e => ({ value: e.employee_id, label: e.employee_name || e.employee_id, description: [e.employee_id, e.position].filter(Boolean).join(' · ') })), [employees]);
  const pick = (id: string) => { const e = employees.find(x => x.employee_id === id); if (e) set({ employee_id: e.employee_id, employee_name: e.employee_name, position: e.position, mine_section: e.section || form.mine_section }); };

  const submit = async () => {
    setTouched(true);
    if (Object.keys(problems).length > 0) return false;
    // A typed ID can differ from the register's even when the name beside it is right; ask rather than save one that matches no one.
    if (!employees.some(e => e.employee_id === form.employee_id.trim()) && !await confirm({ title: 'Employee ID not found', message: `"${form.employee_id.trim()}" does not match anyone in the personnel register. Save it anyway?`, confirmLabel: 'Save anyway' })) return false;
    await onSave({ ...effective, employee_id: form.employee_id.trim(), employee_name: form.employee_name.trim() }, record?.id);
    toast.success(editing ? 'PPE record updated.' : 'PPE issued.');
  };

  return (
    <FormDialog open={open} onOpenChange={onOpenChange} size="lg" title={editing ? 'Edit PPE record' : 'Issue PPE'} description={editing ? `${record.employee_name}, ${record.item_name}` : 'Who it is for, what it is and the size.'} submitLabel={editing ? 'Save changes' : 'Issue PPE'} onSubmit={submit}>
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Pick an employee" optional description="Fills the ID, name, position and section." className="sm:col-span-2"><Combobox aria-label="Pick an employee" value="" onValueChange={pick} options={options} placeholder="Search the personnel register" /></Field>
          <Field label="Employee ID" required error={err('employee_id')}><Input value={form.employee_id} onChange={e => set({ employee_id: e.target.value })} placeholder="C1165" autoComplete="off" /></Field>
          <Field label="Full name" required error={err('employee_name')}><Input value={form.employee_name} onChange={e => set({ employee_name: e.target.value })} autoComplete="off" /></Field>
          <Field label="Position" required error={err('position')}><Input value={form.position} onChange={e => set({ position: e.target.value })} /></Field>
          <Field label="Mine section" optional><Select aria-label="Mine section" value={form.mine_section} onValueChange={v => set({ mine_section: v })} options={SECTIONS} /></Field>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="PPE type" required><Select aria-label="PPE type" value={form.ppe_type} onValueChange={v => set({ ppe_type: v })} options={TYPE_OPTIONS} /></Field>
          <Field label="Item or brand" required error={err('item_name')}><Input value={form.item_name} onChange={e => set({ item_name: e.target.value })} placeholder="Brand and model" /></Field>
          <Field label="Size" optional><Input value={form.size} onChange={e => set({ size: e.target.value })} placeholder="L, 8, XL" /></Field>
          <Field label="Issued by" optional><PersonInput value={form.issued_by} onChange={v => set({ issued_by: v })} placeholder="Type to search employees" /></Field>
          <Field label="Issue date" required error={err('issue_date')}><Input type="date" value={form.issue_date} onChange={e => set({ issue_date: e.target.value })} /></Field>
          <Field label="Expiry date" optional error={err('expiry_date')} description={!touchedExpiry && computed !== undefined ? (matrix[form.ppe_type] > 0 ? `Worked out from the matrix: ${matrix[form.ppe_type]} months. Type a date to override.` : 'This type does not expire.') : 'Typed by hand.'}>
            <Input type="date" value={expiry} onChange={e => { setTouchedExpiry(true); set({ expiry_date: e.target.value }); }} />
          </Field>
          <Field label="Condition"><Select aria-label="Condition" value={form.condition} onValueChange={v => set({ condition: v })} options={CONDITIONS.map(c => ({ value: c.value, label: c.label }))} /></Field>
          <Field label="Status"><Select aria-label="Status" value={form.status} onValueChange={v => set({ status: v })} options={STATUSES.map(s => ({ value: s.value, label: s.label }))} /></Field>
          <Field label="Location" optional><Input value={form.location} onChange={e => set({ location: e.target.value })} placeholder="Workshop" /></Field>
          <Field label="Notes" optional className="sm:col-span-2"><Textarea rows={2} value={form.notes} onChange={e => set({ notes: e.target.value })} /></Field>
        </div>
      </div>
    </FormDialog>
  );
}
