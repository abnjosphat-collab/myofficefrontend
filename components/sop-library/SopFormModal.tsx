// components/sop-library/SopFormModal.tsx — create/edit form for one SOP.
// Built entirely on shared design-system primitives (CenterModal/FormField/
// FormActions/SelectField/AutofillInput) — no page-local input styling.
'use client';

import { useState } from 'react';
import {
  CenterModal, FormField, FormActions, SelectField, AutofillInput, HintText,
} from '@/components/shared/theme';
import {
  SOP_STATUSES, SOP_STATUS_LABEL, SOP_SECTION_LABELS, SOP_CLASSIFICATIONS, SOP_RISK_TIERS, SOP_RISK_TIER_LABEL,
  emptySopForm, sopToFormValues,
  type SopDocument, type SopFormValues,
} from '@/lib/sops/types';

export function SopFormModal({
  open, onClose, sop, onSubmit, submitting,
}: {
  open: boolean;
  onClose: () => void;
  /** undefined = create mode; a SopDocument = edit mode. */
  sop?: SopDocument;
  onSubmit: (values: SopFormValues) => Promise<void>;
  submitting: boolean;
}) {
  const isEdit = !!sop;
  // No effect syncing `open`/`sop` into state: the caller re-mounts this component
  // fresh each time the modal opens (see page.tsx's `key={formKey}`), so this lazy
  // initializer alone is enough — the same "mounts fresh each open" contract
  // AnimatedText's trigger="mount" already relies on elsewhere in the design system.
  const [values, setValues] = useState<SopFormValues>(() => (sop ? sopToFormValues(sop) : emptySopForm()));

  const set = <K extends keyof SopFormValues>(key: K, value: SopFormValues[K]) =>
    setValues(prev => ({ ...prev, [key]: value }));

  const setSection = (key: keyof SopFormValues['sections'], value: string) =>
    setValues(prev => ({ ...prev, sections: { ...prev.sections, [key]: value } }));

  const canSubmit = values.code.trim() && values.title.trim() && values.department.trim() && values.owner.trim();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || submitting) return;
    await onSubmit(values);
  };

  const inputCls = 'w-full h-9 px-3 rounded-lg text-sm bg-transparent border';

  return (
    <CenterModal
      open={open}
      onClose={onClose}
      title={isEdit ? `Edit ${sop!.code}` : 'New SOP'}
      subtitle={isEdit ? 'Saving creates a new revision snapshot' : 'Starts as a draft you can move through review'}
      width="max-w-2xl"
    >
      <form onSubmit={handleSubmit}>
        <div className="p-5 space-y-4">
          <HintText>Only Code, Title, Department and Owner are required — everything else, including every section below, can be filled in later as the SOP matures.</HintText>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="SOP Code" required>
              <input
                value={values.code} required disabled={isEdit}
                onChange={e => set('code', e.target.value)}
                placeholder="SOP-OPS-001"
                aria-label="SOP code"
                className={`${inputCls} border-black/10 dark:border-white/10 disabled:opacity-60`}
              />
            </FormField>
            <FormField label="Title" required>
              <AutofillInput field="sop_title" value={values.title} onChange={v => set('title', v)} placeholder="Lockout / Tagout" required />
            </FormField>
            <FormField label="Department" required>
              <AutofillInput field="sop_department" value={values.department} onChange={v => set('department', v)} placeholder="Operations" required />
            </FormField>
            <FormField label="Status">
              <SelectField
                value={values.status}
                onChange={v => set('status', v as SopFormValues['status'])}
                options={SOP_STATUSES.map(s => ({ value: s, label: SOP_STATUS_LABEL[s] }))}
              />
            </FormField>
            <FormField label="Classification">
              <SelectField
                value={values.classification}
                onChange={v => set('classification', v as SopFormValues['classification'])}
                options={SOP_CLASSIFICATIONS}
              />
            </FormField>
            <FormField label="Risk Tier">
              <SelectField
                value={values.risk_tier}
                onChange={v => set('risk_tier', v as SopFormValues['risk_tier'])}
                placeholder="Not yet assessed"
                options={SOP_RISK_TIERS.map(t => ({ value: String(t), label: SOP_RISK_TIER_LABEL[t] }))}
              />
            </FormField>
            <FormField label="Owner" required>
              <AutofillInput field="sop_owner" value={values.owner} onChange={v => set('owner', v)} placeholder="J. Moyo" required />
            </FormField>
            <FormField label="Approver">
              <AutofillInput field="sop_approver" value={values.approver} onChange={v => set('approver', v)} placeholder="Optional" />
            </FormField>
            <FormField label="Version">
              <AutofillInput field="sop_version" value={values.version} onChange={v => set('version', v)} placeholder="0.1" />
            </FormField>
            <FormField label="Supersedes">
              <AutofillInput field="sop_supersedes" value={values.supersedes} onChange={v => set('supersedes', v)} placeholder="e.g. SOP-OPS-000 v1.0 (optional)" />
            </FormField>
            <FormField label="Effective Date">
              <input
                type="date" value={values.effective_date}
                onChange={e => set('effective_date', e.target.value)}
                aria-label="Effective date"
                className={`${inputCls} border-black/10 dark:border-white/10`}
              />
            </FormField>
            <FormField label="Next Review Date">
              <input
                type="date" value={values.next_review_date}
                onChange={e => set('next_review_date', e.target.value)}
                aria-label="Next review date"
                className={`${inputCls} border-black/10 dark:border-white/10`}
              />
            </FormField>
            <FormField label="Tags (comma-separated)">
              <input
                value={values.tags.join(', ')}
                onChange={e => set('tags', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                placeholder="safety, electrical"
                aria-label="Tags"
                className={`${inputCls} border-black/10 dark:border-white/10`}
              />
            </FormField>
          </div>

          <FormField label="Summary">
            <textarea
              value={values.summary}
              onChange={e => set('summary', e.target.value)}
              placeholder="One or two sentences describing what this SOP covers"
              rows={2}
              aria-label="Summary"
              className={`w-full px-3 py-2 rounded-lg text-sm bg-transparent border border-black/10 dark:border-white/10 resize-none`}
            />
          </FormField>

          {SOP_SECTION_LABELS.map(({ key, label }) => (
            <FormField key={key} label={label}>
              <textarea
                value={values.sections[key]}
                onChange={e => setSection(key, e.target.value)}
                rows={3}
                aria-label={label}
                className={`w-full px-3 py-2 rounded-lg text-sm bg-transparent border border-black/10 dark:border-white/10 resize-y`}
              />
            </FormField>
          ))}

          <FormField label="Change note" required={isEdit}>
            <AutofillInput
              field="sop_change_note" value={values.change_note} onChange={v => set('change_note', v)}
              required={isEdit} placeholder={isEdit ? 'What changed and why' : 'Initial draft'}
            />
          </FormField>
          <HintText>Every save creates a new revision — the change note is what shows up in this SOP&apos;s history.</HintText>
        </div>

        <FormActions onCancel={onClose} submitting={submitting} submitLabel={isEdit ? 'Save Changes' : 'Create SOP'} />
      </form>
    </CenterModal>
  );
}
