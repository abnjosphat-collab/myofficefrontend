// app/training/BulkCertificationForm.tsx — one shared certification for a crew:
// common details entered once, people picked from the register, optional
// per-person differences behind an advanced toggle, and a review step before
// anything is sent. Successes leave the list so a retry never resubmits them;
// failures and uncertain outcomes stay with their reasons.
'use client';

import { useMemo, useState } from 'react';
import {
  Checkbox, Field, FormDialog, Input, Notice, OptionChecklist, Select,
  type ChecklistOption,
} from '@/components/ui-system';
import { NameTypeahead } from '@/components/ui-system/patterns/NameTypeahead';
import { lookupName } from '@/components/ui-system/patterns/PeoplePicker';
import { useEmployees } from '@/hooks/useLookups';
import { recordRecentPerson } from '@/lib/peopleHistory';
import { ApiError } from '@/lib/apiClient';
import { dialogKey, useResetOnOpen } from '@/lib/useResetOnOpen';
import {
  buildBulkPayload, distinctDepartments, distinctDesignations, distinctSections,
  filterRegister, findExistingDuplicates, normalizeEmployeeId, retryIds, splitResults,
  type SplitResults,
} from './calcTrainingBulk';
import { createBulkCertifications } from './useTrainingData';
import type { BulkPersonOverride, BulkSharedDetails, Certification } from './types';

const toOption = (e: Parameters<typeof filterRegister>[0][number]): ChecklistOption => ({
  value: String(e.employee_id),
  label: lookupName(e),
  description: [e.employee_id, e.designation ?? e.position, e.section].filter(Boolean).join(' · '),
});

const blankShared = (): BulkSharedDetails => ({
  certification_name: '', provider: '', training_date: '', expiry_date: '', required_refresher: '',
});

export function BulkCertificationForm({ open, onOpenChange, onCreated, certs }: {
  open: boolean; onOpenChange: (open: boolean) => void; onCreated: () => void; certs: Certification[];
}) {
  const employees = useEmployees();
  const [ids, setIds] = useState<string[]>([]);
  const [trade, setTrade] = useState('');
  const [section, setSection] = useState('');
  const [department, setDepartment] = useState('');
  const [shared, setShared] = useState<BulkSharedDetails>(blankShared);
  const [advanced, setAdvanced] = useState(false);
  const [evidence, setEvidence] = useState('');
  const [overrides, setOverrides] = useState<Record<string, BulkPersonOverride>>({});
  const [touched, setTouched] = useState(false);
  const [lastResult, setLastResult] = useState<SplitResults | null>(null);

  useResetOnOpen(dialogKey(open, undefined), () => {
    setIds([]); setTrade(''); setSection(''); setDepartment('');
    setShared(blankShared()); setAdvanced(false); setEvidence(''); setOverrides({});
    setTouched(false); setLastResult(null);
  });

  const byId = useMemo(() => {
    const map = new Map<string, (typeof employees)[number]>();
    for (const e of employees) if (e.employee_id) map.set(normalizeEmployeeId(e.employee_id), e);
    return map;
  }, [employees]);
  const scopedOptions = useMemo(
    () => filterRegister(employees, { query: '', designation: trade, section, department }).map(toOption),
    [employees, trade, section, department],
  );
  const labelOf = (id: string) => {
    const e = byId.get(normalizeEmployeeId(id));
    return e ? lookupName(e) : id;
  };
  const dupes = useMemo(
    () => findExistingDuplicates(certs, ids, shared.certification_name, shared.training_date),
    [certs, ids, shared.certification_name, shared.training_date],
  );

  const pick = (next: string[]) => {
    const prev = new Set(ids);
    for (const id of next) {
      if (prev.has(id)) continue;
      const e = byId.get(normalizeEmployeeId(id));
      if (e) recordRecentPerson(String(e.id));
    }
    const kept = new Map(ids.map(id => [id, true]));
    setIds(next.filter(id => kept.has(id) || byId.has(normalizeEmployeeId(id))));
    setLastResult(null);
  };

  const evidenceError =
    touched && evidence.trim() && !evidence.trim().startsWith('http') ? 'Enter a link starting with http(s), or leave it empty.' : undefined;
  const missing = (value: string, message: string) => (touched && !value.trim() ? message : undefined);
  const dateOrderError =
    touched && shared.training_date && shared.expiry_date && shared.expiry_date < shared.training_date
      ? 'The expiry date is before the training date.' : undefined;
  const invalid = ids.length === 0 || !shared.certification_name.trim() || !shared.training_date
    || !shared.expiry_date || !!dateOrderError || !!evidenceError;

  const submit = async () => {
    setTouched(true);
    if (invalid) return false;
    const { items } = buildBulkPayload(
      { ...shared, group_evidence_url: evidence.trim() || undefined }, ids.map(employee_id => ({ employee_id })), overrides,
    );
    let confirmed = false;
    try {
      const res = await createBulkCertifications(
        { ...shared, group_evidence_url: evidence.trim() || undefined }, items,
      );
      confirmed = true;
      const split = splitResults(res.results);
      setLastResult(split);
      if (res.failed === 0) {
        onCreated();
        return undefined;
      }
      setIds(prev => prev.filter(id => retryIds(res.results).includes(normalizeEmployeeId(id))));
      const parts = [
        `${res.created} recorded`,
        `${res.skipped} already recorded`,
        `${split.refused.length} refused`,
        `${split.uncertain.length} not confirmed`,
      ].join(', ');
      const details = [...split.refused, ...split.uncertain]
        .map(r => `${labelOf(r.employee_id)}: ${r.reason ?? 'Not saved.'}`).join(' ');
      throw new Error(`${parts}. ${details}${split.uncertain.length > 0 ? ' Check the register before retrying the unconfirmed ones.' : ''}`);
    } catch (e) {
      if (confirmed) throw e;
      const refused = e instanceof ApiError && e.status >= 400 && e.status < 500 && e.status !== 408;
      throw new Error(refused
        ? `Not saved: ${e instanceof Error ? e.message : 'The server refused the batch.'}`
        : `No save confirmation received${e instanceof Error ? `: ${e.message}` : ''}. Nobody was removed from the list; check the register before retrying.`);
    }
  };

  const chosen = ids.map(id => ({ id, employee: byId.get(normalizeEmployeeId(id)) }));
  const effectiveOf = (id: string) => {
    const o = overrides[normalizeEmployeeId(id)];
    return { expiry: o?.expiry_date || shared.expiry_date, trained: o?.training_date || shared.training_date };
  };

  return (
    <FormDialog open={open} onOpenChange={onOpenChange} size="lg" title="Certifications for several people"
      description="One shared certification, one entry per person. Review before sending."
      zoomId="training:new-bulk" submitLabel={ids.length > 0 ? `Record ${ids.length} ${ids.length === 1 ? 'certification' : 'certifications'}` : 'Record certifications'} onSubmit={submit}>
      <div className="flex flex-col gap-5">
        <Field label="Employees" optional description={touched && ids.length === 0 ? undefined : 'Tick people, or type a name and press Tab to add. Select-all adds everyone the filters match.'}>
          <OptionChecklist label="Employees" options={scopedOptions} value={ids} onChange={pick}
            searchPlaceholder="Search by name, ID or job" emptyText="No employee matches these filters."
            pickedWord="picked" labelOf={labelOf}
            renderSearch={({ value: text, onValueChange }) => (
              <NameTypeahead aria-label="Employees" text={text} onTextChange={onValueChange} keepFocusOnPick
                options={scopedOptions.filter(o => !ids.includes(o.value)).map(o => ({ ...o, keywords: [o.value, o.description ?? ''] }))}
                onChoose={choice => { pick([...ids, choice.value]); onValueChange(''); }}
                placeholder="Type a name or ID; Tab adds the suggestion" />
            )}
            searchAside={(
              <div className="flex flex-col gap-2 sm:flex-row">
                <Field label="Trade" optional className="sm:w-44">
                  <Select aria-label="Filter by trade" value={trade} onValueChange={setTrade}
                    options={[{ value: '', label: 'All trades' }, ...distinctDesignations(employees).map(d => ({ value: d, label: d }))]} />
                </Field>
                <Field label="Section" optional className="sm:w-40">
                  <Select aria-label="Filter by section" value={section} onValueChange={setSection}
                    options={[{ value: '', label: 'All sections' }, ...distinctSections(employees).map(s => ({ value: s, label: s }))]} />
                </Field>
                <Field label="Department" optional className="sm:w-44">
                  <Select aria-label="Filter by department" value={department} onValueChange={setDepartment}
                    options={[{ value: '', label: 'All departments' }, ...distinctDepartments(employees).map(d => ({ value: d, label: d }))]} />
                </Field>
              </div>
            )} />
        </Field>
        {touched && ids.length === 0 && <p role="alert" className="-mt-3 font-sans text-caption text-danger">Add at least one employee.</p>}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Certification" required error={missing(shared.certification_name, 'Enter the certification name.')}>
            <Input value={shared.certification_name} onChange={e => setShared(s => ({ ...s, certification_name: e.target.value }))} placeholder="For example, Safety induction" />
          </Field>
          <Field label="Provider" optional>
            <Input value={shared.provider} onChange={e => setShared(s => ({ ...s, provider: e.target.value }))} placeholder="For example, TechEdge" />
          </Field>
          <Field label="Training date" required error={missing(shared.training_date, 'Choose the training date.')}>
            <Input type="date" value={shared.training_date} onChange={e => setShared(s => ({ ...s, training_date: e.target.value }))} />
          </Field>
          <Field label="Expiry date" required error={missing(shared.expiry_date, 'Choose the expiry date.')}>
            <Input type="date" value={shared.expiry_date} onChange={e => setShared(s => ({ ...s, expiry_date: e.target.value }))} />
          </Field>
          <Field label="Required refresher" optional className="sm:col-span-2">
            <Input value={shared.required_refresher} onChange={e => setShared(s => ({ ...s, required_refresher: e.target.value }))} placeholder="For example, Annual refresher" />
          </Field>
        </div>
        {dateOrderError && <Notice tone="danger" title="Check the dates">{dateOrderError}</Notice>}
        {dupes.size > 0 && (
          <Notice tone="warning" title="Already recorded">
            {dupes.size} of {ids.length} {dupes.size === 1 ? 'has' : 'have'} this certification for this date ({[...dupes].map(labelOf).join(', ')}).
            The server will skip {dupes.size === 1 ? 'them' : 'it'} rather than store {dupes.size === 1 ? 'it' : 'them'} twice.
          </Notice>
        )}

        <Checkbox label="Per-person differences and group evidence" description="Different expiry or training dates for some people, or one shared attendance-sheet link."
          checked={advanced} onChange={e => setAdvanced(e.target.checked)} />
        {advanced && (
          <div className="flex flex-col gap-3 rounded-control border border-line-subtle bg-surface-subtle p-3">
            <Field label="Group attendance-sheet link" optional error={evidenceError}
              description="One shared attendance sheet for the group. It is stored as group evidence, never as anyone's certificate.">
              <Input value={evidence} onChange={e => setEvidence(e.target.value)} placeholder="https://…" inputMode="url" />
            </Field>
            {chosen.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="font-sans text-label font-medium text-ink">Per-person dates (empty follows the shared dates)</p>
                {chosen.map(({ id, employee }) => (
                  <div key={id} className="grid grid-cols-1 items-end gap-2 sm:grid-cols-[1fr_1fr_1fr]">
                    <p className="font-sans text-body-sm text-ink">{labelOf(id)}{employee?.designation ? <span className="block text-caption text-ink-muted">{String(employee.designation)}</span> : null}</p>
                    <Field label={`Expiry for ${labelOf(id)}`} optional>
                      <Input type="date" aria-label={`Expiry for ${labelOf(id)}`} value={overrides[normalizeEmployeeId(id)]?.expiry_date ?? ''}
                        onChange={e => setOverrides(o => ({ ...o, [normalizeEmployeeId(id)]: { ...o[normalizeEmployeeId(id)], employee_id: normalizeEmployeeId(id), expiry_date: e.target.value || undefined } }))} />
                    </Field>
                    <Field label={`Trained on for ${labelOf(id)}`} optional>
                      <Input type="date" aria-label={`Training date for ${labelOf(id)}`} value={overrides[normalizeEmployeeId(id)]?.training_date ?? ''}
                        onChange={e => setOverrides(o => ({ ...o, [normalizeEmployeeId(id)]: { ...o[normalizeEmployeeId(id)], employee_id: normalizeEmployeeId(id), training_date: e.target.value || undefined } }))} />
                    </Field>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {chosen.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="font-sans text-label font-medium text-ink">Review ({chosen.length})</p>
            <ul className="flex flex-col gap-1.5" aria-label="Chosen people, review">
              {chosen.map(({ id, employee }) => {
                const eff = effectiveOf(id);
                return (
                  <li key={id} className="flex flex-wrap items-center justify-between gap-2 rounded-control border border-line-subtle px-3 py-2">
                    <span className="font-sans text-body-sm text-ink">{labelOf(id)}
                      <span className="block text-caption text-ink-muted">
                        {[id, employee?.designation ?? employee?.position, eff.trained ? `trained ${eff.trained}` : '', eff.expiry ? `expires ${eff.expiry}` : ''].filter(Boolean).join(' · ')}
                        {dupes.has(normalizeEmployeeId(id)) ? ' · already recorded' : ''}
                      </span>
                    </span>
                    <button type="button" className="font-sans text-body-sm font-medium text-action underline" onClick={() => pick(ids.filter(x => x !== id))}>Remove</button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {lastResult && (
          <div className="flex flex-col gap-2" aria-live="polite">
            {lastResult.created.length > 0 && <Notice tone="info" title="Recorded">{lastResult.created.length} recorded.</Notice>}
            {lastResult.skipped.length > 0 && (
              <Notice tone="warning" title="Already recorded, not stored again">
                {lastResult.skipped.map(r => `${labelOf(r.employee_id)}: ${r.reason ?? ''}`).join(' ')}
              </Notice>
            )}
            {lastResult.refused.length > 0 && (
              <Notice tone="danger" title="Not saved">
                {lastResult.refused.map(r => `${labelOf(r.employee_id)}: ${r.reason ?? ''}`).join(' ')}
              </Notice>
            )}
            {lastResult.uncertain.length > 0 && (
              <Notice tone="warning" title="Not confirmed">
                {lastResult.uncertain.map(r => `${labelOf(r.employee_id)}: ${r.reason ?? ''}`).join(' ')} Check the register before retrying.
              </Notice>
            )}
          </div>
        )}
      </div>
    </FormDialog>
  );
}
