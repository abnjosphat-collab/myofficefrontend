// components/sop-library/SopFormDialog.tsx — create/edit form for one SOP, on the shared FormDialog.
// A failed save keeps the dialog open with everything typed; only a successful save closes it.
'use client';

import { useState } from 'react';
import { SuggestField } from '@/components/shared/SuggestField';
import { Field, FormDialog, Input, Select, Textarea } from '@/components/ui-system';
import {
  SOP_CLASSIFICATIONS, SOP_RISK_TIERS, SOP_RISK_TIER_LABEL, SOP_SECTION_LABELS, SOP_STATUSES, SOP_STATUS_LABEL, emptySopForm, sopToFormValues,
  type SopDocument, type SopFormValues,
} from '@/lib/sops/types';

const NOT_ASSESSED = '__none__';

export function SopFormDialog({ open, onOpenChange, sop, onSubmit }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** undefined = create mode; a SopDocument = edit mode. */
  sop?: SopDocument;
  /** Resolve true when saved, false when the save failed (the caller has already told the user). */
  onSubmit: (values: SopFormValues) => Promise<boolean>;
}) {
  const isEdit = !!sop;
  const [values, setValues] = useState<SopFormValues>(() => (sop ? sopToFormValues(sop) : emptySopForm()));
  const [touched, setTouched] = useState(false);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const key = open ? (sop?.id ?? 'new') : null;
  if (key !== loadedFor) {
    setLoadedFor(key);
    if (key !== null) { setTouched(false); setValues(sop ? sopToFormValues(sop) : emptySopForm()); }
  }

  const set = <K extends keyof SopFormValues>(name: K, value: SopFormValues[K]) => setValues(prev => ({ ...prev, [name]: value }));
  const setSection = (name: keyof SopFormValues['sections'], value: string) => setValues(prev => ({ ...prev, sections: { ...prev.sections, [name]: value } }));
  const missing = (value: string, message: string) => (touched && !value.trim() ? message : undefined);

  const submit = async () => {
    setTouched(true);
    if (!values.code.trim() || !values.title.trim() || !values.department.trim() || !values.owner.trim() || (isEdit && !values.change_note.trim())) return false;
    return (await onSubmit(values)) ? undefined : false;
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? `Edit ${sop!.code}` : 'New SOP'}
      description={isEdit ? 'Saving creates a new revision snapshot.' : 'Starts as a draft you can move through review.'}
      submitLabel={isEdit ? 'Save changes' : 'Create SOP'}
      onSubmit={submit}
      size="lg"
    >
      <p className="font-sans text-body-sm text-ink-muted">Only code, title, department and owner are required. Every other field, including each section, can be filled in as the SOP matures.</p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="SOP code" required error={missing(values.code, 'Enter the SOP code.')}><Input value={values.code} disabled={isEdit} onChange={e => set('code', e.target.value)} placeholder="SOP-OPS-001" /></Field>
        <Field label="Title" required error={missing(values.title, 'Enter the title.')}><SuggestField historyKey="sop_title" value={values.title} onChange={v => set('title', v)} placeholder="Lockout and tagout" /></Field>
        <Field label="Department" required error={missing(values.department, 'Enter the department.')}><SuggestField historyKey="sop_department" value={values.department} onChange={v => set('department', v)} placeholder="Operations" /></Field>
        <Field label="Status"><Select aria-label="Status" value={values.status} onValueChange={v => set('status', v as SopFormValues['status'])} options={SOP_STATUSES.map(s => ({ value: s, label: SOP_STATUS_LABEL[s] }))} /></Field>
        <Field label="Classification"><Select aria-label="Classification" value={values.classification} onValueChange={v => set('classification', v as SopFormValues['classification'])} options={SOP_CLASSIFICATIONS.map(c => ({ value: c, label: c }))} /></Field>
        <Field label="Risk tier"><Select aria-label="Risk tier" value={values.risk_tier || NOT_ASSESSED} onValueChange={v => set('risk_tier', (v === NOT_ASSESSED ? '' : v) as SopFormValues['risk_tier'])} options={[{ value: NOT_ASSESSED, label: 'Not yet assessed' }, ...SOP_RISK_TIERS.map(t => ({ value: String(t), label: SOP_RISK_TIER_LABEL[t] }))]} /></Field>
        <Field label="Owner" required error={missing(values.owner, 'Enter the owner.')}><SuggestField historyKey="sop_owner" value={values.owner} onChange={v => set('owner', v)} placeholder="J. Moyo" /></Field>
        <Field label="Approver" optional><SuggestField historyKey="sop_approver" value={values.approver} onChange={v => set('approver', v)} placeholder="" /></Field>
        <Field label="Version"><SuggestField historyKey="sop_version" value={values.version} onChange={v => set('version', v)} placeholder="0.1" /></Field>
        <Field label="Supersedes" optional><SuggestField historyKey="sop_supersedes" value={values.supersedes} onChange={v => set('supersedes', v)} placeholder="For example, SOP-OPS-000 v1.0" /></Field>
        <Field label="Effective date" optional><Input type="date" value={values.effective_date} onChange={e => set('effective_date', e.target.value)} /></Field>
        <Field label="Next review date" optional><Input type="date" value={values.next_review_date} onChange={e => set('next_review_date', e.target.value)} /></Field>
        <div className="sm:col-span-2">
          <Field label="Tags" optional description="Separate tags with commas."><Input value={values.tags.join(', ')} onChange={e => set('tags', e.target.value.split(',').map(s => s.trim()).filter(Boolean))} placeholder="safety, electrical" /></Field>
        </div>
      </div>

      <Field label="Summary" optional><Textarea rows={2} value={values.summary} onChange={e => set('summary', e.target.value)} placeholder="One or two sentences on what this SOP covers" /></Field>
      {SOP_SECTION_LABELS.map(({ key, label }) => (
        <Field key={key} label={label} optional><Textarea rows={3} value={values.sections[key]} onChange={e => setSection(key, e.target.value)} /></Field>
      ))}
      <Field label="Change note" required={isEdit} optional={!isEdit} description="Every save creates a new revision. This note appears in the SOP's history." error={isEdit ? missing(values.change_note, 'Say what changed and why.') : undefined}>
        <SuggestField historyKey="sop_change_note" value={values.change_note} onChange={v => set('change_note', v)} placeholder={isEdit ? 'What changed and why' : 'Initial draft'} />
      </Field>
    </FormDialog>
  );
}
