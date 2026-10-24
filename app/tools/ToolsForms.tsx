// app/tools/ToolsForms.tsx — the Tools forms, built from the shared Field / Input / Select / Combobox / Checkbox: record a movement
// (issue, return, transfer, extend), add or edit equipment, mark a held tool ready, add an employee. The rules and the messages
// are unchanged; only how the fields are drawn.
'use client';

import { useContext, useState, type FormEvent, type ReactNode } from 'react';
import { asString, Button, Checkbox, Combobox, Field, FieldGroup, Icon, Input, Notice, readStored, Segmented, Select, storeValue, Tag, Textarea, useRefusedSubmit } from '@/components/ui-system';
import { CATEGORIES, DEPARTMENTS, defaultEquipmentKind, departmentOf, employeeLabel, equipmentTypesForCategory, type ActionKind, type Employee, type EquipmentKind, type Movement, type Tool, type Evidence } from './prototype';
import type { InspectionType } from './complianceTypes';
import { INSPECTION_LABELS } from './ToolsCompliance';
import { formatDateTime } from '@/lib/format';
import { tomorrowAt } from '@/lib/dates';
import { EmployeePicker } from './ToolsEmployeePicker';
import { EvidencePicker, ToolsPreferences, type AddEvidence } from './ToolsUI';
import { ToolConditions } from './ToolConditionsPanel';
import { isEligibleForTool, needsAttention, nobodyCanUse, overdueCheckLabel, type ConditionAction } from './toolConditions';

/** Hint text under a field; the "Show helpful hints" setting hides it. */
export function useHint() {
  const { guidance } = useContext(ToolsPreferences);
  return (text: string) => (guidance ? text : undefined);
}

const Row = ({ children }: { children: ReactNode }) => <div className="grid gap-4 sm:grid-cols-2">{children}</div>;
export const Footer = ({ children }: { children: ReactNode }) => <div className="sticky bottom-0 flex justify-end gap-2 border-t border-line-subtle bg-surface pb-1 pt-4">{children}</div>;
const Section = ({ title, note, children }: { title: string; note?: string; children: ReactNode }) => (
  <section className="flex flex-col gap-4 rounded-card border border-line-subtle p-4">
    <div className="flex items-baseline justify-between gap-2"><strong className="font-sans text-body-sm font-semibold text-ink">{title}</strong>{note && <span className="font-sans text-caption text-ink-muted">{note}</span>}</div>
    {children}
  </section>
);

/** Free text with suggestions from a list (the shared Combobox with free text; the person may type anything). */
export function SuggestField({ label, options, value, onChange, onSelect, required = true, hint, disabled = false, emptyMessage, historyKey, error }: {
  label: string; options: string[]; value: string; onChange: (value: string) => void; onSelect?: (value: string) => void; required?: boolean; hint?: string; disabled?: boolean; emptyMessage?: ReactNode; historyKey?: string; error?: string;
}) {
  const hintFor = useHint();
  return (
    <Field label={label} optional={!required} description={hint ? hintFor(hint) : undefined} error={error}>
      <Combobox aria-label={label} value={value} allowCustomValue disabled={disabled} historyKey={historyKey}
        placeholder={`Search ${label.toLowerCase()}…`} searchPlaceholder={`Search ${label.toLowerCase()}…`}
        emptyMessage={emptyMessage ?? 'No matches — press Tab to use what you typed.'}
        onValueChange={next => { onChange(next); if (options.includes(next)) onSelect?.(next); }}
        options={options.map(option => ({ value: option, label: option }))} />
    </Field>
  );
}

export function MultiSuggestField({ label, options, value, onChange, hint }: { label: string; options: string[]; value: string[]; onChange: (value: string[]) => void; hint?: string }) {
  const hintFor = useHint();
  const add = (entry: string) => { const clean = entry.trim(); if (clean && !value.some(item => item.toLowerCase() === clean.toLowerCase())) onChange([...value, clean]); };
  return (
    <Field label={label} description={hint ? hintFor(hint) : undefined}>
      <div className="flex flex-col gap-2">
        {value.length > 0 && <div className="flex flex-wrap gap-1.5">{value.map(item => <Tag key={item} onRemove={() => onChange(value.filter(entry => entry !== item))} removeLabel={item}>{item}</Tag>)}</div>}
        <Combobox aria-label={`Add ${label.toLowerCase()}`} value="" allowCustomValue
          placeholder={`Search add ${label.toLowerCase()}…`} searchPlaceholder={`Search add ${label.toLowerCase()}…`}
          emptyMessage="No matches — press Tab to use what you typed."
          onValueChange={add}
          options={options.filter(option => !value.includes(option)).map(option => ({ value: option, label: option }))} />
      </div>
    </Field>
  );
}

export const TITLES: Record<ActionKind, string> = { issue: 'Issue tool', return: 'Record a return', transfer: 'Change custodian', extend: 'Change return date' };
/** Under-field validation problems, one per field; the overdue-check instruction stays a form-level message. */
type MovementProblems = { tool?: string; person?: string; location?: string; due?: string; overrideReason?: string; notes?: string; gatePass?: string; approvalRef?: string };
type ToolProblems = { name?: string; make?: string; department?: string; location?: string; contractorName?: string; homeStorageLocation?: string; storageConditions?: string; maintenanceRequirements?: string; calibrationFrequencyDays?: string; replacementValue?: string; procurementCost?: string };
// Only called by the submit event, never during rendering.
function isFuture(value: string) { const time = Date.parse(value); return Number.isFinite(time) && time > Date.now(); }

export function MovementForm({ kind, initialTool, initialEmployee, tools, employees = [], locationSuggestions = [], equipmentSuggestions = [], issuerDepartment, addFiles, onSave, onCancel, onResolveAction }: {
  kind: ActionKind; initialTool?: Tool; initialEmployee?: Employee; tools: Tool[]; employees?: Employee[]; locationSuggestions?: string[]; equipmentSuggestions?: string[]; issuerDepartment?: string; addFiles: AddEvidence; onSave: (input: Movement) => void | Promise<void>; onCancel: () => void; onResolveAction?: (action: ConditionAction, tool: Tool) => void;
}) {
  const hintFor = useHint();
  const initialEmployeeIds = new Set(initialEmployee ? [initialEmployee.backendId, initialEmployee.employeeNumber].filter(Boolean) : []);
  const availableForAction = (t: Tool) => (kind === 'issue' ? t.status === 'available' && !needsAttention(t) && !nobodyCanUse(t) : ['issued', 'overdue'].includes(t.status));
  const candidates = tools.filter(t => {
    const approvedForEmployee = !initialEmployee || !['issue', 'transfer'].includes(kind) || t.eligibleEmployees === undefined || t.eligibleEmployees.some(employee => initialEmployeeIds.has(employee.id) || initialEmployeeIds.has(employee.employeeNumber));
    // A tool nobody can use stays visible (greyed, with its reason) even on the employee-first path, so the gap is seen, not silent.
    return (!issuerDepartment || departmentOf(t) === issuerDepartment) && !t.archived && (approvedForEmployee || (kind === 'issue' && nobodyCanUse(t)));
  });
  // Greyed-out tools stay visible with the reason, so the picker explains itself; only ready tools can be picked.
  const optionState = (t: Tool): { disabled: boolean; description: string } => {
    if (availableForAction(t)) return { disabled: false, description: t.holder ? `With ${t.holder.split(' · ')[0]}` : t.location };
    if (kind === 'issue') {
      if (t.holder) return { disabled: true, description: `With ${t.holder.split(' · ')[0]} — receive it back or transfer the open loan` };
      if (nobodyCanUse(t)) return { disabled: true, description: 'Nobody can use it yet' };
      return { disabled: true, description: 'Needs attention — record the repair first' };
    }
    return { disabled: true, description: 'Not out on loan' };
  };
  const [toolLabel, setToolLabel] = useState(initialTool ? `${initialTool.id} · ${initialTool.name}` : '');
  const [person, setPerson] = useState(initialEmployee ? employeeLabel(initialEmployee) : '');
  const [location, setLocation] = useState(() => readStored('myoffice.tools.last-location', asString, ''));
  const [job, setJob] = useState(() => initialTool?.job ?? readStored('myoffice.tools.last-job', asString, ''));
  const [assignedEquipment, setAssignedEquipment] = useState<string[]>(initialTool?.assignedEquipment || []);
  const [condition, setCondition] = useState('Good');
  const [notes, setNotes] = useState('');
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [calibration, setCalibration] = useState('Not verified');
  const [movementScope, setMovementScope] = useState('Within the operation');
  const [gatePass, setGatePass] = useState('');
  const [approvalRef, setApprovalRef] = useState('');
  const [overrideDue, setOverrideDue] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  const [department, setDepartment] = useState(initialTool ? departmentOf(initialTool) : initialEmployee?.department || issuerDepartment || 'Engineering');
  const [fieldErrors, setFieldErrors] = useState<MovementProblems>({});
  const [formError, setFormError] = useState('');
  const { formRef, refused } = useRefusedSubmit();
  const clearError = (key: keyof MovementProblems) => setFieldErrors(f => (f[key] === undefined ? f : { ...f, [key]: undefined }));
  const [saving, setSaving] = useState(false);
  const tool = candidates.find(t => `${t.id} · ${t.name}` === toolLabel);
  const toolBlocked = tool !== undefined && !availableForAction(tool);
  // A greyed-out tool cannot be picked, but naming it in the search (exactly, or closely enough to match just one)
  // previews what blocks it and the resolving actions. The picker's committed value and its live search text both feed this.
  const [toolQuery, setToolQuery] = useState('');
  const previewText = tool ? '' : (toolLabel.trim() || toolQuery.trim());
  const blockedMatches = previewText ? candidates.filter(t => !availableForAction(t) && `${t.id} · ${t.name}`.toLowerCase().includes(previewText.toLowerCase())) : [];
  const previewTool = blockedMatches.find(t => `${t.id} · ${t.name}` === previewText) ?? (blockedMatches.length === 1 ? blockedMatches[0] : undefined);
  const departmentEmployees = employees.filter(employee => employee.active && (!issuerDepartment || employee.department === issuerDepartment));
  const eligibleEmployees = departmentEmployees.filter(employee => !tool || isEligibleForTool(tool, employee));
  const employeeChoices = eligibleEmployees.map(employee => ({ label: employeeLabel(employee), detail: [employee.jobTitle, employee.department].filter(Boolean).join(' · ') }));
  const employeeOptions = employeeChoices.map(choice => choice.label);
  const employeeEmptyMessage = tool && departmentEmployees.length
    ? `No employee is currently trained, qualified and authorized for ${tool.name}. Update Compliance before issue.`
    : `No active employee is available${issuerDepartment ? ` in ${issuerDepartment}` : ''}.`;
  const selectedEmployee = employees.find(employee => employeeLabel(employee) === person);
  const selectEmployee = (label: string) => {
    const employee = employees.find(item => employeeLabel(item) === label);
    if (employee?.department) setDepartment(employee.department);
  };
  const dueChecks = ['issue', 'transfer'].includes(kind) ? (tool?.inspectionDue || []) : [];
  const needsOverride = dueChecks.length > 0;
  const needsCalibration = !!tool && ['digital-multimeter', 'clamp-meter', 'torque-wrench', 'test-instrument'].includes(tool.kind);
  const notesRequired = kind === 'extend' || (kind === 'return' && condition !== 'Good');
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const due = String(new FormData(event.currentTarget).get('due') || '');
    // Checked here, not by the browser (the form is noValidate): a quiet message under the field instead of the browser's bubble.
    const problems: MovementProblems = {};
    if (!tool) problems.tool = 'Choose a tool from the suggestions.';
    else if (toolBlocked) problems.tool = kind === 'issue' ? 'That tool is not ready to issue. Pick a ready tool, or resolve it with the actions below.' : 'That tool is not out on loan.';
    if (['issue', 'transfer'].includes(kind) && !employeeOptions.includes(person)) {
      const named = person.trim() ? employees.find(employee => employeeLabel(employee) === person) : undefined;
      if (named && tool) problems.person = `${named.name} is not currently trained, qualified and authorized for ${tool.name}. Update the Compliance register first.`;
      else problems.person = 'Choose an eligible employee from the list.';
    }
    if (kind === 'return' && !location.trim()) problems.location = 'Add the return location.';
    if (['issue', 'extend'].includes(kind) && !isFuture(due)) problems.due = 'Choose a return time in the future.';
    if (kind === 'extend' && tool?.dueISO && Date.parse(due) <= Date.parse(tool.dueISO)) problems.due = 'The new return time must be later than the current deadline.';
    let formProblem = '';
    if (needsOverride && !overrideDue) formProblem = `The ${dueChecks.map(item => item.replace('_', ' ')).join(', ')} check is overdue. Complete it, or tick "Go ahead anyway" and give a reason.`;
    if (needsOverride && overrideDue && overrideReason.trim().length < 5) problems.overrideReason = 'Give a short reason (at least 5 characters) for going ahead with an overdue check.';
    if (notesRequired && !notes.trim()) problems.notes = 'Add a short note so the next person has the context.';
    if (kind === 'transfer' && !gatePass.trim()) problems.gatePass = 'Record the gate pass number.';
    if (kind === 'transfer' && !approvalRef.trim()) problems.approvalRef = 'Record the existing approval reference.';
    setFieldErrors(problems);
    setFormError(formProblem);
    if (formProblem || Object.keys(problems).length > 0) { refused(); return; }
    if (!tool || toolBlocked) return; // Reported above; this keeps the save below typed.
    const displayDue = due ? formatDateTime(due) : '';
    if (location.trim()) storeValue('myoffice.tools.last-location', location.trim());
    if (job.trim()) storeValue('myoffice.tools.last-job', job.trim());
    setSaving(true);
    try {
      await onSave({ kind, toolId: tool.id, person, location: location.trim(), due: displayDue, dueISO: due ? new Date(due).toISOString() : undefined, job: job.trim(), assignedEquipment, condition, notes: notes.trim(), evidence, calibration: kind === 'return' && needsCalibration ? calibration : undefined, gatePass, approvalRef, movementScope, department, overrideDueChecks: needsOverride && overrideDue, overrideReason: needsOverride && overrideDue ? overrideReason.trim() : undefined });
    } finally {
      setSaving(false);
    }
  }
  return (
    <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <Field label="Tool" required description={hintFor('Search by tool name or ID. Tools that cannot take this action are greyed out, with the reason. Name a greyed-out tool to see how to unblock it.')} error={fieldErrors.tool}>
        <Combobox aria-label="Tool" value={toolLabel} onValueChange={value => { setToolLabel(value); setToolQuery(''); clearError('tool'); }} onSearchChange={setToolQuery} placeholder="Search tool…" searchPlaceholder="Search by tool name or ID…" emptyMessage="No tool matches." clearLabel="None"
          options={candidates.map(t => ({ value: `${t.id} · ${t.name}`, label: `${t.id} · ${t.name}`, ...optionState(t) }))} />
      </Field>
      {tool && (
        <p className="flex items-center gap-2 font-sans text-body-sm text-ink-muted">
          <Icon name={tool.holder ? 'user' : 'department'} size="sm" />
          <span>{tool.holder ? <>With <strong className="text-ink">{tool.holder.split(' · ')[0]}</strong> · Expected {tool.due}</> : <>{departmentOf(tool)} · {tool.location} · {tool.condition}</>}</span>
        </p>
      )}
      {tool && ['issue', 'transfer'].includes(kind) && (
        <ToolConditions tool={tool} employee={selectedEmployee ?? null} onAction={onResolveAction} />
      )}
      {onResolveAction && previewTool && ['issue', 'transfer'].includes(kind) && (
        <ToolConditions tool={previewTool} employee={selectedEmployee ?? null} onAction={onResolveAction} />
      )}
      {needsOverride && (
        <>
          <Notice tone="warning" title={overdueCheckLabel(dueChecks)}>You can still {kind === 'transfer' ? 'transfer' : 'issue'} this equipment. Say why, and the reason is kept in its history.</Notice>
          <Checkbox label="Go ahead anyway" description="The overdue check has not been done or the equipment is not yet maintained." checked={overrideDue} onChange={event => setOverrideDue(event.target.checked)} />
          {overrideDue && (
            <Field label="Reason for going ahead" required error={fieldErrors.overrideReason}>
              <Textarea aria-label="Reason for going ahead" rows={2} value={overrideReason} onChange={event => { setOverrideReason(event.target.value); clearError('overrideReason'); }} placeholder="For example: breakdown repair, the inspection is booked for tomorrow." />
            </Field>
          )}
        </>
      )}
      {['issue', 'transfer'].includes(kind) && tool && !employeeOptions.length && (
        <Notice tone="warning" title="No eligible employee for this equipment">
          {departmentEmployees.length} active {issuerDepartment || departmentOf(tool)} {departmentEmployees.length === 1 ? 'employee exists' : 'employees exist'}, but none has current training, qualification and authorization for {tool.name}. Update the Compliance register first.
        </Notice>
      )}
      {['issue', 'transfer'].includes(kind) && (
        <EmployeePicker label="Employee" required={['issue', 'transfer'].includes(kind)} choices={employeeChoices} value={person} onChange={value => { setPerson(value); clearError('person'); }} onSelect={selectEmployee} emptyMessage={employeeEmptyMessage} error={fieldErrors.person}
          hint={hintFor('Only active employees with current training, qualification and authorization for the selected equipment are listed. Their saved details fill automatically.')} />
      )}
      {['issue', 'transfer'].includes(kind) && selectedEmployee && (
        <p aria-label="Selected employee details" className="flex items-center gap-2 font-sans text-body-sm text-ink-muted">
          <Icon name="user" size="sm" />
          <span><strong className="text-ink">{employeeLabel(selectedEmployee)}</strong> {[selectedEmployee.jobTitle, selectedEmployee.department, selectedEmployee.supervisorName && `Supervisor: ${selectedEmployee.supervisorName}`].filter(Boolean).join(' · ')}</span>
        </p>
      )}
      <Row>
        {kind !== 'extend' && <SuggestField label={kind === 'return' ? 'Return location' : 'Current work location'} required={kind === 'return'} options={locationSuggestions} value={location} onChange={value => { setLocation(value); clearError('location'); }} historyKey={kind === 'return' ? 'tools.return_location' : 'tools.work_location'} hint={kind === 'return' ? 'Start typing to reuse a known location, or enter the exact place freely because teams and tools move frequently.' : 'If known — a work location is not required to issue or transfer.'} error={fieldErrors.location} />}
        {['issue', 'transfer'].includes(kind) && <SuggestField label="Work order / job" required={false} options={[]} value={job} onChange={setJob} historyKey="tools.job_reference" hint="If there is one — a work order is not required." />}
        {['issue', 'extend'].includes(kind) && (
          <Field label="Expected return" required={['issue', 'extend'].includes(kind)} description={hintFor('Choose the local date and time.')} error={fieldErrors.due}>
            <Input aria-label="Expected return" name="due" type="datetime-local" defaultValue={kind === 'issue' ? tomorrowAt() : undefined} onChange={() => clearError('due')} />
          </Field>
        )}
      </Row>

      {['issue', 'transfer'].includes(kind) && <MultiSuggestField label="Equipment being worked on" options={equipmentSuggestions} value={assignedEquipment} onChange={setAssignedEquipment} hint="Add one or more machines or fixed assets this portable tool will be used on. Type a new name or choose a previous entry." />}
      {kind === 'transfer' && (
        <Section title="Movement references" note="Record an existing approval; this form does not grant approval.">
          <Row>
            <SuggestField label="Receiving department" options={DEPARTMENTS} value={department} onChange={setDepartment} historyKey="tools.department" />
            <Field label="Movement"><Select aria-label="Movement" value={movementScope} onValueChange={setMovementScope} options={['Within the operation', 'Outside the operation'].map(value => ({ value, label: value }))} /></Field>
            <Field label="Gate pass reference" required error={fieldErrors.gatePass}><Input aria-label="Gate pass reference" value={gatePass} onChange={e => { setGatePass(e.target.value); clearError('gatePass'); }} placeholder="Existing gate pass number" /></Field>
            <Field label={`${movementScope.startsWith('Outside') ? 'GM' : 'HOS'} approval reference`} required description={hintFor('Internal movement requires HOS approval and external movement requires GM approval.')} error={fieldErrors.approvalRef}>
              <Input aria-label="Approval reference" value={approvalRef} onChange={e => { setApprovalRef(e.target.value); clearError('approvalRef'); }} placeholder="Existing approval reference" />
            </Field>
          </Row>
        </Section>
      )}
      {['issue', 'return'].includes(kind) && (
        <>
          <FieldGroup label={kind === 'issue' ? 'Condition at issue' : 'Condition on return'}>
            <Segmented label={kind === 'issue' ? 'Condition at issue' : 'Condition on return'} value={condition} onValueChange={setCondition} options={['Good', 'Damaged', 'Missing parts'].map(c => ({ value: c, label: c }))} />
          </FieldGroup>
          {kind === 'return' && needsCalibration && (
            <Field label="Calibration check" description={hintFor('Record the check against the existing certificate or calibration matrix. Unknown or expired calibration keeps this instrument on hold.')}>
              <Select aria-label="Calibration check" value={calibration} onValueChange={setCalibration} options={['Not verified', 'Verified current', 'Expired'].map(value => ({ value, label: value }))} />
            </Field>
          )}
        </>
      )}
      {notesRequired && (
        <Field label={kind === 'extend' ? 'Reason for extension' : 'Describe the condition'} required={notesRequired} error={fieldErrors.notes}>
          <Textarea aria-label="Required notes" rows={2} placeholder="A brief, useful explanation…" value={notes} onChange={e => { setNotes(e.target.value); clearError('notes'); }} />
        </Field>
      )}
      {kind === 'return' && (condition !== 'Good' || (needsCalibration && calibration !== 'Verified current')) && <Notice tone="warning" title="This tool will be held for attention." />}
      <details className="rounded-card border border-line-subtle px-4 py-3">
        <summary className="flex cursor-pointer items-center gap-2 font-sans text-body-sm font-medium text-ink"><Icon name="attachment" size="sm" />Notes &amp; attachments <span className="font-normal text-ink-muted">Optional</span></summary>
        <div className="mt-3 flex flex-col gap-4">
          {!notesRequired && <Field label="Notes"><Textarea aria-label="Notes" rows={2} placeholder="Anything the next person should know…" value={notes} onChange={e => setNotes(e.target.value)} /></Field>}
          <EvidencePicker value={evidence} onChange={setEvidence} addFiles={addFiles} />
        </div>
      </details>
      {formError && <p role="alert" className="flex items-start gap-1.5 font-sans text-body-sm font-medium text-danger"><Icon name="warning" size="sm" />{formError}</p>}
      <Footer><Button type="button" onClick={onCancel}>Cancel</Button><Button type="submit" variant="primary" pending={saving}>{saving ? 'Saving…' : TITLES[kind]}</Button></Footer>
      <p className="font-sans text-caption text-ink-muted">This action is saved in the equipment history.</p>
    </form>
  );
}

export function ToolForm({ initialTool, defaultDepartment, addFiles, onSave, onCancel }: { initialTool?: Tool; defaultDepartment: string; addFiles: AddEvidence; onSave: (tool: Tool) => void | Promise<void>; onCancel: () => void }) {
  const hintFor = useHint();
  const [name, setName] = useState(initialTool?.name || '');
  const [make, setMake] = useState(initialTool?.make || '');
  const [id, setId] = useState(initialTool?.id || '');
  const [serial, setSerial] = useState(initialTool?.serial || '');
  const [department, setDepartment] = useState(initialTool ? departmentOf(initialTool) : defaultDepartment);
  const [section, setSection] = useState(initialTool?.section || '');
  const [category, setCategory] = useState(initialTool?.category || CATEGORIES[0]);
  const [equipmentKind, setEquipmentKind] = useState<EquipmentKind>(initialTool?.kind || defaultEquipmentKind(CATEGORIES[0]));
  const [location, setLocation] = useState(initialTool?.location || '');
  const [homeStorageLocation, setHomeStorageLocation] = useState(initialTool?.homeStorageLocation || initialTool?.location || '');
  const [storageConditions, setStorageConditions] = useState(initialTool?.storageConditions || 'Locked, dry, clean and protected from damage or contamination.');
  const [maintenanceRequirements, setMaintenanceRequirements] = useState(initialTool?.maintenanceRequirements || 'Maintain and clean in accordance with the OEM instructions.');
  const [preUseCheckRequired, setPreUseCheckRequired] = useState(initialTool?.preUseCheckRequired !== false);
  const [competencyRequired, setCompetencyRequired] = useState(initialTool?.competencyRequired !== false);
  const [weeklyInspectionRequired, setWeeklyInspectionRequired] = useState(initialTool?.weeklyInspectionRequired || false);
  const [monthlyInspectionRequired, setMonthlyInspectionRequired] = useState(initialTool?.monthlyInspectionRequired !== false);
  const [quarterlyInspectionRequired, setQuarterlyInspectionRequired] = useState(initialTool?.quarterlyInspectionRequired !== false);
  const [calibrationRequired, setCalibrationRequired] = useState(initialTool?.calibrationRequired || false);
  const [calibrationFrequencyDays, setCalibrationFrequencyDays] = useState(String(initialTool?.calibrationFrequencyDays || 365));
  const [replacementValue, setReplacementValue] = useState(initialTool?.replacementValue?.toString() || '');
  const [criticality, setCriticality] = useState(initialTool?.criticality || 'standard');
  const [cctvRequired, setCctvRequired] = useState(initialTool?.cctvRequired || false);
  const [gpsRequired, setGpsRequired] = useState(initialTool?.gpsRequired || false);
  const [requiredPpe, setRequiredPpe] = useState((initialTool?.requiredPpe || []).join(', '));
  const [ownershipType, setOwnershipType] = useState<'company' | 'contractor'>(initialTool?.ownershipType || 'company');
  const [contractorName, setContractorName] = useState(initialTool?.contractorName || '');
  const [oemManualRef, setOemManualRef] = useState(initialTool?.oemManualRef || '');
  const [purchaseDate, setPurchaseDate] = useState(initialTool?.purchaseDate || '');
  const [procurementCost, setProcurementCost] = useState(initialTool?.procurementCost?.toString() || '');
  const [insured, setInsured] = useState(initialTool?.insured == null ? 'unknown' : initialTool.insured ? 'yes' : 'no');
  const [lastVerified, setLastVerified] = useState(initialTool?.lastVerified || '');
  const [workingStatus, setWorkingStatus] = useState(initialTool?.workingStatus || 'unknown');
  const [condition, setCondition] = useState(initialTool?.condition || 'Good');
  const [notes, setNotes] = useState(initialTool?.notes || '');
  const [approvalRef, setApprovalRef] = useState(initialTool?.approvalRef || '');
  const [specificationText, setSpecificationText] = useState(Object.entries(initialTool?.specifications || {}).map(([key, value]) => `${key}: ${value}`).join('\n'));
  const [evidence, setEvidence] = useState<Evidence[]>(initialTool?.evidence || []);
  const [fieldErrors, setFieldErrors] = useState<ToolProblems>({});
  const clearError = (key: keyof ToolProblems) => setFieldErrors(f => (f[key] === undefined ? f : { ...f, [key]: undefined }));
  const { formRef, refused } = useRefusedSubmit();
  const [saving, setSaving] = useState(false);
  const equipmentTypes = equipmentTypesForCategory(category);
  function changeCategory(nextCategory: string) {
    setCategory(nextCategory);
    if (!equipmentTypesForCategory(nextCategory).some(type => type.value === equipmentKind)) setEquipmentKind(defaultEquipmentKind(nextCategory));
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    // Checked here, not by the browser (the form is noValidate): a quiet message under the field instead of the browser's bubble.
    const problems: ToolProblems = {};
    if (!name.trim()) problems.name = 'Enter the tool name.';
    if (!make.trim()) problems.make = 'Enter the make and model.';
    if (!department.trim()) problems.department = 'Choose the department that owns this record.';
    if (!location.trim()) problems.location = 'Enter the storage location.';
    if (ownershipType === 'contractor' && !contractorName.trim()) problems.contractorName = 'Enter the contractor company name.';
    if (!homeStorageLocation.trim()) problems.homeStorageLocation = 'Enter the designated storage place.';
    if (!storageConditions.trim()) problems.storageConditions = 'Enter the required storage conditions.';
    if (!maintenanceRequirements.trim()) problems.maintenanceRequirements = 'Enter the maintenance requirements.';
    if (calibrationRequired) {
      if (!calibrationFrequencyDays.trim()) problems.calibrationFrequencyDays = 'Enter the calibration frequency in days.';
      else if (Number(calibrationFrequencyDays) < 1 || Number(calibrationFrequencyDays) > 3650) problems.calibrationFrequencyDays = 'Enter 1 to 3650.';
    }
    if (replacementValue.trim() && Number(replacementValue) < 0) problems.replacementValue = 'Enter 0 or more.';
    if (procurementCost.trim() && Number(procurementCost) < 0) problems.procurementCost = 'Enter 0 or more.';
    setFieldErrors(problems);
    if (Object.keys(problems).length > 0) { refused(); return; }
    const specifications = Object.fromEntries(specificationText.split('\n').map(line => { const colon = line.indexOf(':'); return colon < 0 ? [line, ''] : [line.slice(0, colon), line.slice(colon + 1)]; }).filter(parts => parts[0]?.trim() && parts[1]?.trim()).map(parts => [parts[0].trim(), parts[1].trim()]));
    setSaving(true);
    try {
      await onSave({
        ...initialTool, id: id.trim(), name: name.trim(), make: make.trim(), serial: serial.trim() || 'Not recorded', department: department.trim(), section: section.trim(), category, kind: equipmentKind, location,
        homeStorageLocation: homeStorageLocation.trim() || location.trim(), storageConditions: storageConditions.trim(), maintenanceRequirements: maintenanceRequirements.trim(), preUseCheckRequired, competencyRequired,
        weeklyInspectionRequired, monthlyInspectionRequired, quarterlyInspectionRequired, calibrationRequired, calibrationFrequencyDays: calibrationRequired ? Number(calibrationFrequencyDays) : undefined,
        replacementValue: replacementValue ? Number(replacementValue) : undefined, criticality: criticality as Tool['criticality'], cctvRequired: cctvRequired || Number(replacementValue) > 5000, gpsRequired,
        requiredPpe: requiredPpe.split(',').map(item => item.trim()).filter(Boolean), ownershipType, contractorName: ownershipType === 'contractor' ? contractorName.trim() : undefined,
        oemManualRef: oemManualRef.trim() || undefined, purchaseDate: purchaseDate || undefined, procurementCost: procurementCost ? Number(procurementCost) : undefined,
        insured: insured === 'unknown' ? undefined : insured === 'yes', lastVerified: lastVerified.trim() || undefined, workingStatus: workingStatus === 'unknown' ? undefined : workingStatus as Tool['workingStatus'],
        status: initialTool?.status || 'available', condition, notes: notes.trim(), approvalRef: approvalRef.trim(), evidence, specifications,
      });
    } finally {
      setSaving(false);
    }
  }
  return (
    <form ref={formRef} className="flex flex-col gap-5" onSubmit={submit} noValidate>
      <Row>
        <Field label="Tool name" required error={fieldErrors.name}><Input aria-label="Tool name" value={name} onChange={e => { setName(e.target.value); clearError('name'); }} placeholder="Cordless impact driver" /></Field>
        <Field label="Make & model" required error={fieldErrors.make}><Input aria-label="Make and model" value={make} onChange={e => { setMake(e.target.value); clearError('make'); }} placeholder="Bosch GDX 18V" /></Field>
        <SuggestField label="Department" options={DEPARTMENTS} value={department} onChange={value => { setDepartment(value); clearError('department'); }} historyKey="tools.department" hint="The department that owns this record. Start with Engineering; add other departments as they join." error={fieldErrors.department} />
        <Field label="Category"><Select aria-label="Category" value={category} onValueChange={changeCategory} options={CATEGORIES.map(value => ({ value, label: value }))} /></Field>
        <Field label="Equipment type" description={hintFor('Choose the closest physical form. Test instruments ask for a calibration check when they are returned.')}>
          <Select aria-label="Equipment type" value={equipmentKind} onValueChange={value => setEquipmentKind(value as EquipmentKind)} options={equipmentTypes} />
        </Field>
        <Field label="Tool ID" optional description={hintFor('Use the existing physical label. Leave blank to generate a prototype ID. Existing IDs cannot be changed here.')}>
          <Input aria-label="Tool ID" value={id} disabled={!!initialTool} onChange={e => setId(e.target.value)} placeholder="Existing tool number" />
        </Field>
        <Field label="Serial number" optional><Input aria-label="Serial number" value={serial} onChange={e => setSerial(e.target.value)} placeholder="Manufacturer serial number" /></Field>
        <Field label="Storage location" required description={hintFor('Enter the location as free text. Use the description people actually use on site.')} error={fieldErrors.location}>
          <Input aria-label="Storage location" disabled={!!initialTool?.holder} value={location} onChange={event => { setLocation(event.target.value); clearError('location'); }} placeholder="Main workshop, electrical cage…" />
        </Field>
        <Field label="Section" optional><Input aria-label="Section" value={section} onChange={e => setSection(e.target.value)} placeholder="Mechanical, electrical…" /></Field>
      </Row>

      <Section title="Ownership, storage and safeguarding" note="SOP controls">
        <Row>
          <Field label="Ownership"><Select aria-label="Equipment ownership" value={ownershipType} onValueChange={value => setOwnershipType(value as typeof ownershipType)} options={[{ value: 'company', label: 'Company owned' }, { value: 'contractor', label: 'Contractor owned' }]} /></Field>
          {ownershipType === 'contractor' && <Field label="Contractor" error={fieldErrors.contractorName}><Input value={contractorName} onChange={event => { setContractorName(event.target.value); clearError('contractorName'); }} placeholder="Contractor company name" /></Field>}
          <Field label="OEM manual / checklist reference" optional><Input value={oemManualRef} onChange={event => setOemManualRef(event.target.value)} placeholder="Document number or controlled link" /></Field>
          <Field label="Designated storage place" required error={fieldErrors.homeStorageLocation}><Input value={homeStorageLocation} onChange={event => { setHomeStorageLocation(event.target.value); clearError('homeStorageLocation'); }} placeholder="Locked tool room / rack / crib" /></Field>
          <Field label="Required storage conditions" required error={fieldErrors.storageConditions}><Textarea rows={3} value={storageConditions} onChange={event => { setStorageConditions(event.target.value); clearError('storageConditions'); }} /></Field>
          <Field label="Replacement value USD" optional error={fieldErrors.replacementValue}><Input type="number" min="0" step="0.01" value={replacementValue} onChange={event => { setReplacementValue(event.target.value); clearError('replacementValue'); if (Number(event.target.value) > 5000) setCctvRequired(true); }} /></Field>
          <Field label="Criticality"><Select aria-label="Criticality" value={criticality} onValueChange={value => setCriticality(value as NonNullable<Tool['criticality']>)} options={[{ value: 'standard', label: 'Standard' }, { value: 'high', label: 'High value' }, { value: 'safety_critical', label: 'Safety critical' }]} /></Field>
        </Row>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <Checkbox label="CCTV storage required" checked={cctvRequired} onChange={event => setCctvRequired(event.target.checked)} />
          <Checkbox label="GPS tracking required" checked={gpsRequired} onChange={event => setGpsRequired(event.target.checked)} />
        </div>
      </Section>

      <Section title="Purchase and condition" note="From the Engineering register">
        <Row>
          <Field label="Date of purchase"><Input type="date" value={purchaseDate} onChange={event => setPurchaseDate(event.target.value)} /></Field>
          <Field label="Procurement cost (USD)" error={fieldErrors.procurementCost}><Input type="number" min="0" step="0.01" inputMode="decimal" value={procurementCost} onChange={event => { setProcurementCost(event.target.value); clearError('procurementCost'); }} placeholder="0.00" /></Field>
          <Field label="Insured"><Select aria-label="Insured" value={insured} onValueChange={setInsured} options={[{ value: 'unknown', label: 'Not recorded' }, { value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }]} /></Field>
          <Field label="Last verified"><Input value={lastVerified} maxLength={40} onChange={event => setLastVerified(event.target.value)} placeholder="Q2-2026 or a date" /></Field>
          <Field label="Working status"><Select aria-label="Working status" value={workingStatus} onValueChange={value => setWorkingStatus(value as typeof workingStatus)} options={[{ value: 'unknown', label: 'Not recorded' }, { value: 'working', label: 'Working' }, { value: 'not_working', label: 'Not working' }]} /></Field>
          <Field label="General condition"><Select aria-label="General condition" value={condition} onValueChange={setCondition} options={[...new Set(['Good', ...(initialTool?.condition ? [initialTool.condition] : []), 'Damaged', 'Defective', 'Missing'])].map(value => ({ value, label: value }))} /></Field>
        </Row>
        <p className="font-sans text-caption text-ink-muted">Equipment recorded as not working, defective, missing or damaged is held as “Needs attention” and cannot be issued until it is marked ready.</p>
      </Section>

      <Section title="Inspection and maintenance plan" note="Issue is blocked when required checks expire">
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <Checkbox label="Training, qualification and authorization required" description="Turn off for simple items anyone may use, like a tape measure." checked={competencyRequired} onChange={event => setCompetencyRequired(event.target.checked)} />
          <Checkbox label="Pre-use check" description="The borrower records it after receiving the tool." checked={preUseCheckRequired} onChange={event => setPreUseCheckRequired(event.target.checked)} />
          <Checkbox label="Weekly check" checked={weeklyInspectionRequired} onChange={event => setWeeklyInspectionRequired(event.target.checked)} />
          <Checkbox label="Monthly inspection" checked={monthlyInspectionRequired} onChange={event => setMonthlyInspectionRequired(event.target.checked)} />
          <Checkbox label="Quarterly colour inspection" checked={quarterlyInspectionRequired} onChange={event => setQuarterlyInspectionRequired(event.target.checked)} />
          <Checkbox label="Calibration required" checked={calibrationRequired} onChange={event => setCalibrationRequired(event.target.checked)} />
        </div>
        <Row>
          <Field label="Maintenance requirements" required error={fieldErrors.maintenanceRequirements}><Textarea rows={3} value={maintenanceRequirements} onChange={event => { setMaintenanceRequirements(event.target.value); clearError('maintenanceRequirements'); }} /></Field>
          {calibrationRequired && <Field label="Calibration frequency in days" error={fieldErrors.calibrationFrequencyDays}><Input type="number" min="1" max="3650" value={calibrationFrequencyDays} onChange={event => { setCalibrationFrequencyDays(event.target.value); clearError('calibrationFrequencyDays'); }} /></Field>}
          <Field label="Required PPE" description="Comma separated"><Input value={requiredPpe} onChange={event => setRequiredPpe(event.target.value)} placeholder="Safety glasses, gloves, hearing protection" /></Field>
        </Row>
      </Section>

      <EvidencePicker value={evidence} onChange={setEvidence} addFiles={addFiles} toolPhoto />
      <Field label="Technical specifications" description={hintFor('Use one “Label: value” entry per line; different equipment types need different specifications.')}>
        <Textarea aria-label="Technical specifications" rows={5} value={specificationText} onChange={event => setSpecificationText(event.target.value)} placeholder={'Voltage: 18 V\nChuck capacity: 13 mm\nNo-load speed: 0–1,800 rpm\nWeight: 1.8 kg'} />
      </Field>
      <details className="rounded-card border border-line-subtle px-4 py-3">
        <summary className="flex cursor-pointer items-center gap-2 font-sans text-body-sm font-medium text-ink"><Icon name="attachment" size="sm" />Notes &amp; approval</summary>
        <div className="mt-3 flex flex-col gap-4">
          <Field label="Register endorsement / approval reference"><Input aria-label="Register approval reference" value={approvalRef} onChange={e => setApprovalRef(e.target.value)} placeholder="Existing department endorsement or GM approval" /></Field>
          <Field label="Notes"><Textarea aria-label="Notes" rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Condition, missing components or useful context…" /></Field>
        </div>
      </details>
      <Footer><Button type="button" onClick={onCancel}>Cancel</Button><Button variant="primary" type="submit" pending={saving}>{saving ? 'Saving…' : initialTool ? 'Save changes' : 'Add tool'}</Button></Footer>
      <p className="font-sans text-caption text-ink-muted">Blank IDs are generated as PP-UG-DEPARTMENT-ACTIVITY-01. Existing physical labels may be retained.</p>
    </form>
  );
}

export function MarkReadyForm({ tool, onSave, onCancel }: { tool: Tool; onSave: (resolutionNote: string) => void | Promise<void>; onCancel: () => void }) {
  const [resolutionNote, setResolutionNote] = useState('');
  const [noteError, setNoteError] = useState<string | undefined>(undefined);
  const { formRef, refused } = useRefusedSubmit();
  const [saving, setSaving] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    // Checked here, not by the browser (the form is noValidate): a quiet message under the field instead of the browser's bubble.
    const note = resolutionNote.trim();
    if (note.length < 2) { setNoteError(note ? 'Use at least 2 characters.' : 'Describe what was repaired or checked.'); refused(); return; }
    setSaving(true);
    try {
      await onSave(note);
    } finally {
      setSaving(false);
    }
  }
  return (
    <form ref={formRef} className="flex flex-col gap-4" onSubmit={submit} noValidate>
      <p className="flex items-center gap-2 font-sans text-body-sm text-ink-muted"><Icon name="success" size="sm" /><span><strong className="text-ink">{tool.name}</strong> · Currently held in Needs attention</span></p>
      <Field label="Repair or inspection completed" required description="This explanation is saved in the permanent history. The tool will return to Ready to use with condition Good." error={noteError}>
        <Textarea aria-label="Repair or inspection completed" rows={4} value={resolutionNote} onChange={event => { setResolutionNote(event.target.value); setNoteError(undefined); }} placeholder="For example: Trigger switch replaced and function tested." />
      </Field>
      <Footer><Button type="button" onClick={onCancel}>Cancel</Button><Button type="submit" variant="primary" pending={saving}>{saving ? 'Marking…' : 'Mark ready for use'}</Button></Footer>
    </form>
  );
}

export type RecordCheckInput = { inspection_type: InspectionType; outcome: 'passed' | 'conditional' | 'failed'; defects?: string; notes?: string };
/** Record one of the tool's due checks from wherever it is blocked (the issue flow, the drawer): types due only, outcome + notes. The backend sets the next due date. Same validation as the Compliance register (a failed check must name the defects). */
export function RecordCheckForm({ tool, onSave, onCancel }: { tool: Tool; onSave: (input: RecordCheckInput) => void | Promise<void>; onCancel: () => void }) {
  const dueTypes = [...new Set(tool.inspectionDue || [])].filter((type): type is InspectionType => type in INSPECTION_LABELS);
  const typeOptions = (dueTypes.length ? dueTypes : (Object.keys(INSPECTION_LABELS) as InspectionType[])).map(value => ({ value, label: INSPECTION_LABELS[value] }));
  const [inspectionType, setInspectionType] = useState<InspectionType>(typeOptions[0].value);
  const [outcome, setOutcome] = useState<'passed' | 'conditional' | 'failed'>('passed');
  const [defects, setDefects] = useState('');
  const [notes, setNotes] = useState('');
  const [defectsError, setDefectsError] = useState<string | undefined>(undefined);
  const { formRef, refused } = useRefusedSubmit();
  const [saving, setSaving] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    // Checked here, not by the browser (the form is noValidate): a quiet message under the field instead of the browser's bubble.
    if (outcome === 'failed' && !defects.trim()) { setDefectsError('Describe the defects.'); refused(); return; }
    setSaving(true);
    try {
      await onSave({ inspection_type: inspectionType, outcome, defects: defects.trim() || undefined, notes: notes.trim() || undefined });
    } finally {
      setSaving(false);
    }
  }
  return (
    <form ref={formRef} className="flex flex-col gap-4" onSubmit={submit} noValidate>
      <p className="flex items-center gap-2 font-sans text-body-sm text-ink-muted"><Icon name="check" size="sm" /><span><strong className="text-ink">{tool.id} · {tool.name}</strong> · completing a due check unblocks it for issue</span></p>
      <Field label="Check">
        <Select aria-label="Check" value={inspectionType} onValueChange={value => setInspectionType(value as InspectionType)} options={typeOptions} />
      </Field>
      <FieldGroup label="Result">
        <Segmented label="Result" value={outcome} onValueChange={setOutcome} options={[{ value: 'passed', label: 'Passed' }, { value: 'conditional', label: 'Passed with notes' }, { value: 'failed', label: 'Failed' }]} />
      </FieldGroup>
      {outcome === 'failed' && (
        <Field label="Defects" error={defectsError}>
          <Textarea aria-label="Defects" rows={2} value={defects} onChange={event => { setDefects(event.target.value); setDefectsError(undefined); }} placeholder="What is wrong with it." />
        </Field>
      )}
      <Field label="Check notes" optional>
        <Textarea aria-label="Check notes" rows={2} value={notes} onChange={event => setNotes(event.target.value)} placeholder="Anything the next person should know." />
      </Field>
      <Footer><Button type="button" onClick={onCancel}>Cancel</Button><Button type="submit" variant="primary" pending={saving}>{saving ? 'Recording…' : 'Record check'}</Button></Footer>
    </form>
  );
}

export function EmployeeForm({ onSave, onCancel }: { onSave: (employee: Employee) => void | Promise<void>; onCancel: () => void }) {
  const { formRef, refused } = useRefusedSubmit();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [employeeNumber, setEmployeeNumber] = useState('');
  const [numberUnknown, setNumberUnknown] = useState(false);
  const [department, setDepartment] = useState('Engineering');
  const [jobTitle, setJobTitle] = useState('');
  const [supervisorName, setSupervisorName] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; employeeNumber?: string }>({});
  async function submit(event: FormEvent) {
    event.preventDefault();
    // Checked here, not by the browser (the form is noValidate): a quiet message under the field instead of the browser's bubble.
    const problems: { name?: string; employeeNumber?: string } = {};
    if (!name.trim()) problems.name = 'Enter the full name.';
    if (!numberUnknown && !employeeNumber.trim()) problems.employeeNumber = 'Enter the employee ID or number.';
    setFieldErrors(problems);
    if (Object.keys(problems).length > 0) { refused(); return; }
    setSaving(true);
    try {
      await onSave({ id: crypto.randomUUID(), name: name.trim(), employeeNumber: numberUnknown ? null : employeeNumber.trim(), department: department.trim(), jobTitle: jobTitle.trim(), supervisorName: supervisorName.trim(), active: true });
    } finally {
      setSaving(false);
    }
  }
  return (
    <form ref={formRef} className="flex flex-col gap-4" onSubmit={submit} noValidate>
      <Row>
        <Field label="Full name" required error={fieldErrors.name}><Input aria-label="Full name" value={name} onChange={event => { setName(event.target.value); setFieldErrors(f => ({ ...f, name: undefined })); }} placeholder="Employee name" /></Field>
        <Field label="Employee ID / number" required={!numberUnknown} error={fieldErrors.employeeNumber}><Input aria-label="Employee ID or number" value={employeeNumber} disabled={numberUnknown} onChange={event => { setEmployeeNumber(event.target.value); setFieldErrors(f => ({ ...f, employeeNumber: undefined })); }} placeholder="EMP-001" /></Field>
        <SuggestField label="Department" options={DEPARTMENTS} value={department} onChange={setDepartment} historyKey="tools.department" />
        <Field label="Job title" optional><Input aria-label="Job title" value={jobTitle} onChange={event => setJobTitle(event.target.value)} placeholder="Artisan, supervisor…" /></Field>
        <Field label="Supervisor name" optional><Input aria-label="Supervisor name" value={supervisorName} onChange={event => setSupervisorName(event.target.value)} placeholder="Immediate supervisor" /></Field>
      </Row>
      <Checkbox label="No mine number yet" description="Tick this instead of inventing a number — it can be added later from the employee record." checked={numberUnknown} onChange={event => { setNumberUnknown(event.target.checked); setFieldErrors(f => ({ ...f, employeeNumber: undefined })); }} />
      <p className="font-sans text-caption text-ink-muted">This employee register belongs to the Tools &amp; Equipment workspace.</p>
      <Footer><Button type="button" onClick={onCancel}>Cancel</Button><Button type="submit" variant="primary" pending={saving}>{saving ? 'Adding…' : 'Add employee'}</Button></Footer>
    </form>
  );
}

/** Add (or correct) the mine number that was unknown when the person was recorded. Unticking the box without a number keeps it unknown. */
export function EmployeeNumberForm({ employee, onSave, onCancel }: { employee: Employee; onSave: (employeeNumber: string | null) => void | Promise<void>; onCancel: () => void }) {
  const [number, setNumber] = useState(employee.employeeNumber ?? '');
  const [unknown, setUnknown] = useState(employee.employeeNumber == null);
  const [error, setError] = useState<string | undefined>(undefined);
  const { formRef, refused } = useRefusedSubmit();
  const [saving, setSaving] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    // Checked here, not by the browser (the form is noValidate): a quiet message under the field instead of the browser's bubble.
    if (!unknown && !number.trim()) { setError('Enter the employee ID or number.'); refused(); return; }
    setSaving(true);
    try {
      await onSave(unknown ? null : number.trim());
    } finally {
      setSaving(false);
    }
  }
  return (
    <form ref={formRef} className="flex flex-col gap-4" onSubmit={submit} noValidate>
      <p className="flex items-center gap-2 font-sans text-body-sm text-ink-muted"><Icon name="user" size="sm" /><span><strong className="text-ink">{employee.name}</strong> · {employee.department}</span></p>
      <Field label="Employee ID / number" required={!unknown} error={error}>
        <Input aria-label="Employee ID or number" value={number} disabled={unknown} onChange={event => { setNumber(event.target.value); setError(undefined); }} placeholder="EMP-001" />
      </Field>
      <Checkbox label="No mine number yet" checked={unknown} onChange={event => { setUnknown(event.target.checked); setError(undefined); }} />
      <Footer><Button type="button" onClick={onCancel}>Cancel</Button><Button type="submit" variant="primary" pending={saving}>{saving ? 'Saving…' : 'Save number'}</Button></Footer>
    </form>
  );
}
