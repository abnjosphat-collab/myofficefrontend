// app/ppe/PPEBulkIssueForm.tsx — the same PPE for a crew: one item, size, dates, condition and status, and one fresh
// record per person. People whose record is saved leave the list, so a retry after a partial failure never duplicates
// them; the others stay with the reason each was refused. Issues to several people are always new records: renewing from the order
// list stays in the single-issue form. The server stamps each person's details and refuses same-day repeats (409).
'use client';

import { useMemo, useState } from 'react';
import { Field, FormDialog, Input, Notice, PeopleChecklist, Select, Textarea, type PickedPerson } from '@/components/ui-system';
import { PersonInput } from '@/components/shared/PersonInput';
import { useEmployees } from '@/hooks/useLookups';
import { todayLocal } from '@/lib/dates';
import { normalizeDesignation } from '@/lib/employeeCatalog';
import { dialogKey, useResetOnOpen } from '@/lib/useResetOnOpen';
import { createPPERecord } from './usePPEData';
import { countBulkIssueDupes, expiryFor, formProblems } from './ppeLogic';
import { CONDITIONS, STATUSES, TYPE_OPTIONS } from './ppeMeta';
import type { FormState, PPERecord } from './types';

type Shared = Omit<FormState, 'employee_name' | 'employee_id' | 'position' | 'mine_section' | 'expected_updated_at'>;
const sharedOf = (): Shared => ({ ppe_type: 'helmet', item_name: '', size: '', issue_date: todayLocal(), expiry_date: '', condition: 'good', status: 'active', notes: '', issued_by: '', location: 'Workshop' });

export function PPEBulkIssueForm({ open, records, matrix, onOpenChange, onCreated, department }: {
  open: boolean; records: PPERecord[]; matrix: Record<string, number>; onOpenChange: (open: boolean) => void; onCreated: () => void; department?: string | null;
}) {
  const employees = useEmployees(department);
  const [people, setPeople] = useState<PickedPerson[]>([]);
  const [form, setForm] = useState<Shared>(sharedOf);
  const [touchedExpiry, setTouchedExpiry] = useState(false);
  const [touched, setTouched] = useState(false);
  useResetOnOpen(dialogKey(open, undefined), () => { setPeople([]); setForm(sharedOf()); setTouched(false); setTouchedExpiry(false); });
  const set = (patch: Partial<Shared>) => setForm(f => ({ ...f, ...patch }));
  // Until someone types an expiry, it follows the issue date and type.
  const computed = expiryFor(form.ppe_type, form.issue_date, matrix);
  const expiry = touchedExpiry || computed === undefined ? form.expiry_date : computed;
  const effective = { ...form, expiry_date: expiry };
  // The single form's person rule is replaced by the people list (its own message below); the item and date rules are shared.
  const problems = formProblems({ ...effective, employee_id: 'bulk' });
  const err = (k: keyof typeof problems) => (touched ? problems[k] : undefined);
  const bad = people.length === 0 || Object.keys(problems).length > 0;
  const metaOf = (p: PickedPerson) => {
    const e = employees.find(x => x.employee_id === p.employee_id);
    const designation = e?.designation || e?.position || '';
    return { position: normalizeDesignation(designation) || designation, mine_section: e?.section || '' };
  };
  const dupes = useMemo(() => countBulkIssueDupes(records, people.map(p => p.employee_id), form.ppe_type, form.issue_date), [records, people, form.ppe_type, form.issue_date]);

  const submit = async () => {
    setTouched(true);
    if (bad) return false;
    const failed: { person: PickedPerson; reason: string }[] = [];
    let ok = 0;
    for (const p of people) {
      try { await createPPERecord({ ...effective, employee_name: p.name, employee_id: p.employee_id, ...metaOf(p) }); ok += 1; }
      catch (e) { failed.push({ person: p, reason: e instanceof Error ? e.message : 'Not saved.' }); }
    }
    if (ok) onCreated();
    if (failed.length) {
      setPeople(failed.map(f => f.person));
      throw new Error(`${ok} issued, ${failed.length} not saved. ${failed.map(f => `${f.person.name}: ${f.reason}`).join(' ')}`);
    }
    return undefined;
  };

  return (
    <FormDialog open={open} onOpenChange={onOpenChange} size="lg" title="Issue to several people" description="One record per person, all with these details." zoomId="ppe:new-bulk" submitLabel={people.length > 0 ? `Issue to ${people.length} ${people.length === 1 ? 'person' : 'people'}` : 'Issue PPE'} onSubmit={submit}>
      <div className="flex flex-col gap-5">
        <PeopleChecklist label="Employees" value={people} onChange={setPeople} hint={touched && people.length === 0 ? undefined : 'Tick everyone getting this item.'} department={department} />
        {touched && people.length === 0 && <p role="alert" className="-mt-3 font-sans text-caption text-danger">Add at least one employee.</p>}
        {dupes > 0 && <Notice tone="warning" title="Some of these people already hold this item">{dupes} of {people.length} already {dupes === 1 ? 'has' : 'have'} this kind of PPE recorded as issued on {form.issue_date}. {dupes === 1 ? 'That record is' : 'Those records are'} not saved again; the others are, and the ones left out stay in the list with the reason.</Notice>}
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
