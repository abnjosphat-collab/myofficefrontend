// app/ppe/PPEIssueForm.tsx — issue PPE to someone or edit an issue: who (picked from the personnel register, never
// typed), what, the size, the dates, the condition and status. The expiry is worked out from the issue date and the
// replacement matrix until someone types their own. The server stamps the person's details from the register on save.
// A refused save shows inside the dialog and keeps what was typed. "Premature failure" marks an issue that replaces an
// item which failed before its expiry, with an optional note of what failed (the Employees tab can show only these).
'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Checkbox, Fact, FactList, Field, FormDialog, Input, PersonPicker, Select, Textarea, lookupName } from '@/components/ui-system';
import { PersonInput } from '@/components/shared/PersonInput';
import type { EmployeeLookup } from '@/hooks/useLookups';
import { todayLocal } from '@/lib/dates';
import { normalizeDesignation } from '@/lib/employeeCatalog';
import { formatMineNumber } from '@/lib/registerMatch';
import { normalizeSection } from '@/lib/sections';
import { expiryFor, formProblems } from './ppeLogic';
import { CONDITIONS, STATUSES, TYPE_OPTIONS } from './ppeMeta';
import type { EmployeeWithPPE, FormState, PPERecord } from './types';
import { useResetOnOpen } from '@/lib/useResetOnOpen';

const blank = (): FormState => ({ employee_name: '', employee_id: '', position: '', ppe_type: 'helmet', item_name: '', size: '', issue_date: todayLocal(), expiry_date: '', condition: 'good', status: 'active', notes: '', issued_by: '', location: 'Workshop', mine_section: '' });
const seedOf = (r: PPERecord, employee: EmployeeWithPPE | null): FormState => ({
  employee_name: employee?.employee_name || r.employee_name || '', employee_id: employee?.employee_id || r.employee_id || '', position: employee?.position || r.position || '', ppe_type: r.ppe_type || 'helmet',
  item_name: r.item_name || '', size: r.size || '', issue_date: r.issue_date || todayLocal(), expiry_date: r.expiry_date || '', condition: r.condition || 'good', status: r.status || 'active',
  notes: r.notes || '', issued_by: r.issued_by || '', location: r.location || 'Workshop', mine_section: r.mine_section || '',
  premature_failure: r.premature_failure === true, failure_reason: r.failure_reason || '',
});

export function PPEIssueForm({ open, record, prefill, employee, matrix, onOpenChange, onSave, department }: {
  open: boolean; record: PPERecord | null; prefill: PPERecord | null; employee: EmployeeWithPPE | null; matrix: Record<string, number>;
  onOpenChange: (open: boolean) => void; onSave: (form: FormState, id?: string) => Promise<void>; department?: string | null;
}) {
  const [form, setForm] = useState<FormState>(blank);
  const [touchedExpiry, setTouchedExpiry] = useState(false);
  const [touched, setTouched] = useState(false);
  // One form per record, per order-list prefill and per employee it was opened for.
  const key = open ? `${record?.id ?? (prefill ? `prefill-${prefill.employee_id}-${prefill.ppe_type}` : 'new')}-${employee?.employee_id ?? ''}` : null;
  useResetOnOpen(key, () => { setTouched(false); setTouchedExpiry(false); const seed = record ?? prefill; setForm(seed ? seedOf(seed, employee) : { ...blank(), employee_name: employee?.employee_name ?? '', employee_id: employee?.employee_id ?? '', position: employee?.position ?? '', mine_section: employee?.section ?? '' }); });
  const editing = !!record;
  const set = (patch: Partial<FormState>) => setForm(f => ({ ...f, ...patch }));
  // Until someone types an expiry, it follows the issue date and type (an old record included, so fixing its date recalculates it).
  const computed = expiryFor(form.ppe_type, form.issue_date, matrix);
  const expiry = touchedExpiry || computed === undefined ? form.expiry_date : computed;
  const effective = { ...form, expiry_date: expiry };
  const problems = formProblems(effective);
  const err = (k: keyof typeof problems) => (touched ? problems[k] : undefined);
  // Editing a record whose number matches nobody is a re-link: saving writes the picked register number.
  const relink = editing && employee?.unmatched === true;
  const personLabel = !editing ? 'Pick an employee' : relink ? 'Re-link to the right person' : 'Person';
  const personHint = !editing ? 'Fills the number, name, position and section from the register.' : relink ? "This record's mine number matches nobody on the register." : 'Change to move this record to someone else.';
  const onPick = (picked: EmployeeLookup | null) => {
    if (!picked) { set({ employee_id: '', employee_name: '', position: '', mine_section: '' }); return; }
    const designation = picked.designation || picked.position || '';
    set({ employee_id: picked.employee_id || '', employee_name: lookupName(picked), position: normalizeDesignation(designation) || designation, mine_section: picked.section || '' });
  };

  const submit = async () => {
    setTouched(true);
    if (Object.keys(problems).length > 0) return false;
    await onSave({ ...effective, employee_id: form.employee_id.trim(), employee_name: form.employee_name.trim(), ...(editing && record?.updated_at ? { expected_updated_at: record.updated_at } : {}) }, record?.id);
    toast.success(editing ? 'PPE record updated.' : 'PPE issued.');
  };

  return (
    <FormDialog open={open} onOpenChange={onOpenChange} size="lg" title={editing ? 'Edit PPE record' : 'Issue PPE'} description={editing ? `${record.employee_name}, ${record.item_name}` : 'Who it is for, what it is and the size.'} submitLabel={editing ? 'Save changes' : 'Issue PPE'} onSubmit={submit} zoomId={editing ? undefined : 'ppe:new'}>
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label={personLabel} required error={err('employee_id')} description={personHint} className="sm:col-span-2">
            <PersonPicker label={personLabel} name={form.employee_name} employeeId={form.employee_id} onPick={onPick} autoFocusSearch={!editing} department={department} />
          </Field>
          {form.employee_id !== '' && (
            <FactList aria-label="Person" className="sm:col-span-2">
              <Fact label="Mine number">{formatMineNumber(form.employee_id)}</Fact>
              <Fact label="Full name">{form.employee_name}</Fact>
              <Fact label="Position">{form.position}</Fact>
              <Fact label="Section">{form.mine_section ? normalizeSection(form.mine_section) : ''}</Fact>
            </FactList>
          )}
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
          <div className="flex flex-col gap-3 sm:col-span-2">
            <Checkbox label="Premature failure" description="This replaces an item that failed before its expiry date." checked={form.premature_failure === true} onChange={e => set({ premature_failure: e.target.checked })} />
            {form.premature_failure === true && <Field label="What failed" optional description="For example: sole split after three weeks."><Input value={form.failure_reason ?? ''} maxLength={300} onChange={e => set({ failure_reason: e.target.value })} /></Field>}
          </div>
          <Field label="Notes" optional className="sm:col-span-2"><Textarea rows={2} value={form.notes} onChange={e => set({ notes: e.target.value })} /></Field>
        </div>
      </div>
    </FormDialog>
  );
}
