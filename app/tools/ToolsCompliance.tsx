// app/tools/ToolsCompliance.tsx — compliance for the equipment register: inspections and maintenance, incidents (loss, damage,
// theft) with their investigations, and the approvals behind who may use what. Managers also record each of these here.
'use client';

import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Button, Checkbox, Field, Icon, Input, Notice, Segmented, Select, Textarea, useRefusedSubmit } from '@/components/ui-system';
import { ApprovalsView, IncidentsView, InspectionsView, INCIDENT_NAMES } from './ToolsComplianceViews';
import type { CompetencyRecord, IncidentRecord, InspectionPlanRow, InspectionRecord, InspectionType } from './complianceTypes';
import { employeeLabel, type Employee, type Tool } from './prototype';

export const INSPECTION_LABELS: Record<InspectionType, string> = { pre_use: 'Pre-use check', weekly: 'Weekly check', monthly: 'Monthly inspection', quarterly: 'Quarterly colour inspection', calibration: 'Calibration', maintenance: 'Maintenance', storage_audit: 'Storage audit', repair: 'Repair verification' };
export const INCIDENT_LABELS = INCIDENT_NAMES;

type InspectionInput = { inspection_type: InspectionType; outcome: 'passed' | 'conditional' | 'failed'; next_due_at?: string; condition?: string; defects?: string; notes?: string; repair_quote?: number; new_equipment_price?: number };
type IncidentInput = { incident_type: IncidentRecord['incident_type']; occurred_at: string; employee_id?: string; explanation: string };
type IncidentCloseInput = { investigation_outcome: string; negligence_confirmed: boolean; replacement_cost?: number; recovery_months?: number };
type FormName = 'competency' | 'inspection' | 'incident' | 'close';

/** One of the record-keeping forms, folded away until it is needed. */
function FormCard({ name, open, onToggle, title, note, children }: { name: FormName; open: boolean; onToggle: (name: FormName, open: boolean) => void; title: string; note: string; children: ReactNode }) {
  return (
    <details open={open} onToggle={event => onToggle(name, event.currentTarget.open)} className="rounded-card border border-line-subtle bg-surface-raised">
      <summary className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3">
        <span><strong className="block font-sans text-body-sm font-medium text-ink">{title}</strong><small className="font-sans text-caption text-ink-muted">{note}</small></span>
        <Icon name="chevron-down" size="sm" />
      </summary>
      <div className="flex flex-col gap-4 border-t border-line-subtle p-4">{children}</div>
    </details>
  );
}
const Row = ({ children }: { children: ReactNode }) => <div className="grid gap-4 sm:grid-cols-2">{children}</div>;
const Submit = ({ children, disabled, pending }: { children: ReactNode; disabled?: boolean; pending?: boolean }) => <div className="flex justify-end"><Button variant="primary" type="submit" disabled={disabled} pending={pending}>{children}</Button></div>;
const at = (day: string) => new Date(`${day}T23:59:59`).toISOString();

export function ToolsCompliance({ tools, employees, competencies, inspections, incidents, plan, canManage, onSaveCompetency, onRecordInspection, onReportIncident, onCloseIncident, onOpenEmployees }: {
  tools: Tool[];
  employees: Employee[];
  competencies: CompetencyRecord[];
  inspections: InspectionRecord[];
  incidents: IncidentRecord[];
  plan: InspectionPlanRow[];
  canManage: boolean;
  onSaveCompetency: (value: { employee_id: string; tool_id: string; trained: boolean; qualified: boolean; authorized: boolean; training_certificate_ref?: string; training_expires_at?: string; qualification_ref?: string; qualification_expires_at?: string; authorization_expires_at?: string; notes?: string }) => Promise<void>;
  onRecordInspection: (toolId: string, value: InspectionInput) => Promise<void>;
  onReportIncident: (toolId: string, value: IncidentInput) => Promise<void>;
  onCloseIncident: (incidentId: string, value: IncidentCloseInput) => Promise<void>;
  /** Go to the Employees section, where who may use what is managed. */
  onOpenEmployees?: () => void;
}) {
  const [section, setSection] = useState<'inspections' | 'incidents' | 'approvals' | 'record'>('inspections');
  const [openForm, setOpenForm] = useState<FormName | null>(null);
  const toggleForm = (name: FormName, open: boolean) => setOpenForm(current => open ? name : current === name ? null : current);
  const activeTools = tools.filter(tool => !tool.archived && tool.backendId);
  const activeEmployees = employees.filter(employee => employee.active && employee.backendId);
  const openIncidents = incidents.filter(incident => incident.status !== 'closed');
  const [toolId, setToolId] = useState(activeTools[0]?.backendId || '');
  const [employeeId, setEmployeeId] = useState(activeEmployees[0]?.backendId || '');
  const [trained, setTrained] = useState(true);
  const [qualified, setQualified] = useState(true);
  const [authorized, setAuthorized] = useState(true);
  const [trainingRef, setTrainingRef] = useState('');
  const [trainingExpiry, setTrainingExpiry] = useState('');
  const [qualificationRef, setQualificationRef] = useState('');
  const [qualificationExpiry, setQualificationExpiry] = useState('');
  const [authorizationExpiry, setAuthorizationExpiry] = useState('');
  const [competencyNotes, setCompetencyNotes] = useState('');
  const [inspectionToolId, setInspectionToolId] = useState(activeTools[0]?.backendId || '');
  const [inspectionType, setInspectionType] = useState<InspectionType>('monthly');
  const [outcome, setOutcome] = useState<'passed' | 'conditional' | 'failed'>('passed');
  const [nextDue, setNextDue] = useState('');
  const [defects, setDefects] = useState('');
  const [inspectionNotes, setInspectionNotes] = useState('');
  const [repairQuote, setRepairQuote] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [incidentToolId, setIncidentToolId] = useState(activeTools[0]?.backendId || '');
  const [incidentType, setIncidentType] = useState<IncidentRecord['incident_type']>('damaged');
  const [occurredAt, setOccurredAt] = useState('');
  const [incidentEmployeeId, setIncidentEmployeeId] = useState('');
  const [explanation, setExplanation] = useState('');
  const [closingIncidentId, setClosingIncidentId] = useState(openIncidents[0]?.id || '');
  const [investigationOutcome, setInvestigationOutcome] = useState('');
  const [negligenceConfirmed, setNegligenceConfirmed] = useState(false);
  const [replacementCost, setReplacementCost] = useState('');
  const [recoveryMonths, setRecoveryMonths] = useState('6');
  // Checked here, not by the browser (the forms are noValidate): a quiet message under the field instead of the browser's bubble.
  const [defectsError, setDefectsError] = useState<string | undefined>(undefined);
  const [repairQuoteError, setRepairQuoteError] = useState<string | undefined>(undefined);
  const [newPriceError, setNewPriceError] = useState<string | undefined>(undefined);
  const [occurredAtError, setOccurredAtError] = useState<string | undefined>(undefined);
  const [explanationError, setExplanationError] = useState<string | undefined>(undefined);
  const [outcomeError, setOutcomeError] = useState<string | undefined>(undefined);
  const [costError, setCostError] = useState<string | undefined>(undefined);
  const [monthsError, setMonthsError] = useState<string | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const { formRef: competencyFormRef } = useRefusedSubmit();
  const { formRef: inspectionFormRef, refused: inspectionRefused } = useRefusedSubmit();
  const { formRef: incidentFormRef, refused: incidentRefused } = useRefusedSubmit();
  const { formRef: closeFormRef, refused: closeRefused } = useRefusedSubmit();
  const employeeById = useMemo(() => new Map(employees.map(employee => [employee.backendId, employee])), [employees]);
  const toolById = useMemo(() => new Map(activeTools.map(tool => [tool.backendId, tool])), [activeTools]);
  const dueTools = activeTools.filter(tool => (tool.inspectionDue || []).length);
  const eligibleCount = competencies.filter(item => item.trained && item.qualified && item.authorized).length;
  const repairPercentage = repairQuote && newPrice && Number(newPrice) > 0 ? Number(repairQuote) / Number(newPrice) * 100 : undefined;
  const toolOptions = activeTools.map(item => ({ value: item.backendId!, label: `${item.id} · ${item.name}` }));
  const employeeOptions = activeEmployees.map(item => ({ value: item.backendId!, label: employeeLabel(item) }));

  async function submitCompetency(event: FormEvent) {
    event.preventDefault();
    if (!toolId || !employeeId) return;
    setSaving(true);
    try {
      await onSaveCompetency({ employee_id: employeeId, tool_id: toolId, trained, qualified, authorized, training_certificate_ref: trainingRef || undefined, training_expires_at: trainingExpiry ? at(trainingExpiry) : undefined, qualification_ref: qualificationRef || undefined, qualification_expires_at: qualificationExpiry ? at(qualificationExpiry) : undefined, authorization_expires_at: authorizationExpiry ? at(authorizationExpiry) : undefined, notes: competencyNotes || undefined });
    } finally {
      setSaving(false);
    }
  }
  async function submitInspection(event: FormEvent) {
    event.preventDefault();
    if (!inspectionToolId) return;
    if (outcome === 'failed' && !defects.trim()) { setDefectsError('Describe the defects.'); inspectionRefused(); return; }
    if (inspectionType === 'repair' && !repairQuote.trim()) { setRepairQuoteError('Enter the repair quotation.'); inspectionRefused(); return; }
    if (inspectionType === 'repair' && Number(repairQuote) < 0) { setRepairQuoteError('Enter 0 or more.'); inspectionRefused(); return; }
    if (inspectionType === 'repair' && !newPrice.trim()) { setNewPriceError('Enter the new-equipment price.'); inspectionRefused(); return; }
    if (inspectionType === 'repair' && Number(newPrice) < 0.01) { setNewPriceError('Enter 0.01 or more.'); inspectionRefused(); return; }
    setSaving(true);
    try {
      await onRecordInspection(inspectionToolId, { inspection_type: inspectionType, outcome, next_due_at: nextDue ? at(nextDue) : undefined, defects: defects || undefined, notes: inspectionNotes || undefined, repair_quote: inspectionType === 'repair' && repairQuote ? Number(repairQuote) : undefined, new_equipment_price: inspectionType === 'repair' && newPrice ? Number(newPrice) : undefined });
    } finally {
      setSaving(false);
    }
    setDefects(''); setInspectionNotes(''); setRepairQuote(''); setNewPrice('');
  }
  async function submitIncident(event: FormEvent) {
    event.preventDefault();
    if (!incidentToolId) return;
    if (!occurredAt) { setOccurredAtError('Enter when it happened.'); incidentRefused(); return; }
    if (explanation.trim().length < 5) { setExplanationError(explanation.trim() ? 'Use at least 5 characters.' : 'Describe what happened.'); incidentRefused(); return; }
    setSaving(true);
    try {
      await onReportIncident(incidentToolId, { incident_type: incidentType, occurred_at: new Date(occurredAt).toISOString(), employee_id: incidentEmployeeId || undefined, explanation: explanation.trim() });
    } finally {
      setSaving(false);
    }
    setExplanation(''); setOccurredAt('');
  }
  async function submitCloseIncident(event: FormEvent) {
    event.preventDefault();
    if (!closingIncidentId) return;
    if (investigationOutcome.trim().length < 5) { setOutcomeError(investigationOutcome.trim() ? 'Use at least 5 characters.' : 'Describe the investigation outcome.'); closeRefused(); return; }
    if (negligenceConfirmed && !replacementCost.trim()) { setCostError('Enter the replacement cost.'); closeRefused(); return; }
    if (negligenceConfirmed && Number(replacementCost) < 0) { setCostError('Enter 0 or more.'); closeRefused(); return; }
    if (negligenceConfirmed && (!recoveryMonths.trim() || Number(recoveryMonths) < 1 || Number(recoveryMonths) > 6)) { setMonthsError('Enter 1 to 6.'); closeRefused(); return; }
    setSaving(true);
    try {
      await onCloseIncident(closingIncidentId, { investigation_outcome: investigationOutcome.trim(), negligence_confirmed: negligenceConfirmed, replacement_cost: negligenceConfirmed && replacementCost ? Number(replacementCost) : undefined, recovery_months: negligenceConfirmed ? Number(recoveryMonths) : undefined });
    } finally {
      setSaving(false);
    }
    setInvestigationOutcome(''); setNegligenceConfirmed(false); setReplacementCost(''); setRecoveryMonths('6');
  }

  const summary = [{ one: 'Check overdue', many: 'Checks overdue', value: dueTools.length }, { one: 'Open incident', many: 'Open incidents', value: openIncidents.length }, { one: 'Approval', many: 'Approvals', value: eligibleCount }, { one: 'Inspection record', many: 'Inspection records', value: inspections.length }];
  const sections: Array<{ value: 'inspections' | 'incidents' | 'approvals' | 'record'; label: string }> = [{ value: 'inspections', label: 'Inspections' }, { value: 'incidents', label: openIncidents.length ? `Incidents (${openIncidents.length})` : 'Incidents' }, { value: 'approvals', label: 'Approvals' }, ...(canManage ? [{ value: 'record' as const, label: 'Record' }] : [])];
  const recordCheck = (tool: Tool) => { setInspectionToolId(tool.backendId || ''); setOpenForm('inspection'); setSection('record'); };
  const closeInvestigation = (incident: IncidentRecord) => { setClosingIncidentId(incident.id); setOpenForm('close'); setSection('record'); };

  return (
    <section className="flex flex-col gap-5" aria-label="Compliance">
      <dl className="flex flex-wrap gap-2">
        {summary.map(item => (
          <div key={item.many} className="inline-flex items-baseline gap-2 rounded-control border border-line-subtle px-3 py-1.5 font-sans text-body-sm">
            <dd className="font-display font-semibold tabular text-ink">{item.value}</dd>
            <dt className="text-ink-muted">{item.value === 1 ? item.one : item.many}</dt>
          </div>
        ))}
      </dl>
      <Segmented label="Compliance sections" value={section} onValueChange={setSection} options={sections} />
      {section === 'inspections' && <InspectionsView tools={activeTools} plan={plan} inspections={inspections} onRecord={canManage ? recordCheck : undefined} />}
      {section === 'incidents' && <IncidentsView incidents={openIncidents} toolById={toolById} employeeById={employeeById} onClose={canManage ? closeInvestigation : undefined} />}
      {section === 'approvals' && <ApprovalsView tools={activeTools} competencies={competencies} toolById={toolById} employeeById={employeeById} onOpenEmployees={onOpenEmployees} />}
      {section === 'record' && canManage && (
        <div className="flex flex-col gap-3">
          <FormCard name="competency" open={openForm === 'competency'} onToggle={toggleForm} title="Training and authorization" note="All three criteria are required before issue">
            <form ref={competencyFormRef} className="flex flex-col gap-4" onSubmit={submitCompetency} noValidate>
              <Row>
                <Field label="Employee"><Select aria-label="Competency employee" value={employeeId} onValueChange={setEmployeeId} options={employeeOptions} /></Field>
                <Field label="Equipment"><Select aria-label="Competency equipment" value={toolId} onValueChange={setToolId} options={toolOptions} /></Field>
              </Row>
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                <Checkbox label="Trained" checked={trained} onChange={event => setTrained(event.target.checked)} />
                <Checkbox label="Qualified" checked={qualified} onChange={event => setQualified(event.target.checked)} />
                <Checkbox label="Authorized" checked={authorized} onChange={event => setAuthorized(event.target.checked)} />
              </div>
              <Row>
                <Field label="Training certificate" optional><Input value={trainingRef} onChange={event => setTrainingRef(event.target.value)} placeholder="Certificate or trainer reference" /></Field>
                <Field label="Training expiry" optional><Input type="date" value={trainingExpiry} onChange={event => setTrainingExpiry(event.target.value)} /></Field>
                <Field label="Qualification reference" optional><Input value={qualificationRef} onChange={event => setQualificationRef(event.target.value)} placeholder="Trade or competency reference" /></Field>
                <Field label="Qualification expiry" optional><Input type="date" value={qualificationExpiry} onChange={event => setQualificationExpiry(event.target.value)} /></Field>
                <Field label="Authorization expiry" optional><Input type="date" value={authorizationExpiry} onChange={event => setAuthorizationExpiry(event.target.value)} /></Field>
                <Field label="Notes" optional><Input value={competencyNotes} onChange={event => setCompetencyNotes(event.target.value)} /></Field>
              </Row>
              {(!employeeOptions.length || !toolOptions.length) && <p className="font-sans text-caption text-ink-muted">There is no employee or equipment to record this against yet.</p>}
              <Submit disabled={!employeeId || !toolId} pending={saving}>Save competency</Submit>
            </form>
          </FormCard>

          <FormCard name="inspection" open={openForm === 'inspection'} onToggle={toggleForm} title="Record inspection or maintenance" note="Failed checks place equipment on hold">
            <form ref={inspectionFormRef} className="flex flex-col gap-4" onSubmit={submitInspection} noValidate>
              <Row>
                <Field label="Equipment"><Select aria-label="Inspection equipment" value={inspectionToolId} onValueChange={setInspectionToolId} options={toolOptions} /></Field>
                <Field label="Check type"><Select aria-label="Inspection type" value={inspectionType} onValueChange={value => { setInspectionType(value as InspectionType); setRepairQuoteError(undefined); setNewPriceError(undefined); }} options={Object.entries(INSPECTION_LABELS).map(([value, text]) => ({ value, label: text }))} /></Field>
                <Field label="Outcome"><Select aria-label="Inspection outcome" value={outcome} onValueChange={value => { setOutcome(value as typeof outcome); setDefectsError(undefined); }} options={[{ value: 'passed', label: 'Passed · fit for use' }, { value: 'conditional', label: 'Conditional · follow-up required' }, { value: 'failed', label: 'Failed · quarantine' }]} /></Field>
                <Field label="Next due" optional><Input type="date" value={nextDue} onChange={event => setNextDue(event.target.value)} /></Field>
                <Field label="Defects" description="Required if failed" error={defectsError}><Input value={defects} onChange={event => { setDefects(event.target.value); setDefectsError(undefined); }} /></Field>
                <Field label="Work completed or notes"><Input value={inspectionNotes} onChange={event => setInspectionNotes(event.target.value)} /></Field>
                {inspectionType === 'repair' && (
                  <>
                    <Field label="Repair quotation" error={repairQuoteError}><Input type="number" min="0" step="0.01" value={repairQuote} onChange={event => { setRepairQuote(event.target.value); setRepairQuoteError(undefined); }} /></Field>
                    <Field label="New equipment price" error={newPriceError}><Input type="number" min="0.01" step="0.01" value={newPrice} onChange={event => { setNewPrice(event.target.value); setNewPriceError(undefined); }} /></Field>
                  </>
                )}
              </Row>
              {inspectionType === 'repair' && repairPercentage !== undefined && (
                <Notice tone={repairPercentage <= 60 ? 'info' : 'warning'} title={repairPercentage <= 60 ? 'Repair is within the 60% limit' : 'Replacement review required'}>Repair quotation is {repairPercentage.toFixed(1)}% of the new-equipment price.</Notice>
              )}
              {!toolOptions.length && <p className="font-sans text-caption text-ink-muted">There is no equipment to inspect yet.</p>}
              <Submit disabled={!inspectionToolId} pending={saving}>Record check</Submit>
            </form>
          </FormCard>

          <FormCard name="incident" open={openForm === 'incident'} onToggle={toggleForm} title="Report loss, damage or theft" note="Investigation is due within 24 hours">
            <form ref={incidentFormRef} className="flex flex-col gap-4" onSubmit={submitIncident} noValidate>
              <Row>
                <Field label="Equipment"><Select aria-label="Incident equipment" value={incidentToolId} onValueChange={setIncidentToolId} options={toolOptions} /></Field>
                <Field label="Incident type"><Select aria-label="Incident type" value={incidentType} onValueChange={value => setIncidentType(value as IncidentRecord['incident_type'])} options={Object.entries(INCIDENT_LABELS).map(([value, text]) => ({ value, label: text }))} /></Field>
                <Field label="Occurred at" required error={occurredAtError}><Input type="datetime-local" value={occurredAt} onChange={event => { setOccurredAt(event.target.value); setOccurredAtError(undefined); }} /></Field>
                <Field label="Employee involved" optional><Select aria-label="Employee involved" value={incidentEmployeeId} onValueChange={setIncidentEmployeeId} options={[{ value: '', label: 'Not assigned' }, ...employeeOptions]} /></Field>
              </Row>
              <Field label="Immediate report" required error={explanationError}><Textarea rows={4} value={explanation} onChange={event => { setExplanation(event.target.value); setExplanationError(undefined); }} placeholder="What happened, where, when, and what immediate action was taken?" /></Field>
              {!toolOptions.length && <p className="font-sans text-caption text-ink-muted">There is no equipment to report against yet.</p>}
              <Submit disabled={!incidentToolId} pending={saving}>Report incident</Submit>
            </form>
          </FormCard>

          <FormCard name="close" open={openForm === 'close'} onToggle={toggleForm} title="Close investigation" note="Record accountability and recovery terms">
            <form ref={closeFormRef} className="flex flex-col gap-4" onSubmit={submitCloseIncident} noValidate>
              <Field label="Open incident"><Select aria-label="Open incident" value={closingIncidentId} onValueChange={setClosingIncidentId} options={openIncidents.map(item => ({ value: item.id, label: `${toolById.get(item.tool_id)?.id || 'Equipment'} · ${INCIDENT_LABELS[item.incident_type]}` }))} /></Field>
              <Field label="Investigation outcome" required error={outcomeError}><Textarea rows={4} value={investigationOutcome} onChange={event => { setInvestigationOutcome(event.target.value); setOutcomeError(undefined); }} /></Field>
              <Checkbox label="Negligence confirmed" description="Replacement recovery may be scheduled over no more than six months." checked={negligenceConfirmed} onChange={event => { setNegligenceConfirmed(event.target.checked); setCostError(undefined); setMonthsError(undefined); }} />
              {negligenceConfirmed && (
                <Row>
                  <Field label="Replacement cost" error={costError}><Input type="number" min="0" step="0.01" value={replacementCost} onChange={event => { setReplacementCost(event.target.value); setCostError(undefined); }} /></Field>
                  <Field label="Recovery period" error={monthsError}><Input type="number" min="1" max="6" value={recoveryMonths} onChange={event => { setRecoveryMonths(event.target.value); setMonthsError(undefined); }} /></Field>
                </Row>
              )}
              {!openIncidents.length && <p className="font-sans text-caption text-ink-muted">There is no open incident to close yet.</p>}
              <Submit disabled={!closingIncidentId} pending={saving}>Close investigation</Submit>
            </form>
          </FormCard>
        </div>
      )}
    </section>
  );
}
