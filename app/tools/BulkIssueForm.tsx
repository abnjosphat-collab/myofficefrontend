// app/tools/BulkIssueForm.tsx — issue several tools to one borrower in one guided pass: pick the tools,
// pick the borrower, confirm what each tool needs, then the shared details. Each tool is still issued by
// its own idempotent command, so one refusal never stops the rest.
'use client';

import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Button, Checkbox, Field, FieldGroup, Icon, IconButton, Input, Notice, SearchField, Segmented, Tabs, TabsContent, TabsList, TabsTrigger, Textarea } from '@/components/ui-system';
import { formatDateTime } from '@/lib/format';
import { daysFromNowAt, tomorrowAt } from '@/lib/dates';
import { departmentOf, employeeLabel, type Employee, type Tool } from './prototype';
import { EmployeePicker } from './ToolsEmployeePicker';
import { SuggestField, useHint } from './ToolsForms';
import { blockingConditions, CONDITION_ACTION_LABELS, isEligibleForTool, needsAttention, nobodyCanUse, toolConditions, type ConditionAction } from './toolConditions';

export interface BulkIssueInput {
  toolIds: string[];
  person: string;
  location: string;
  due: string;
  dueISO?: string;
  job: string;
  condition: string;
  notes: string;
  department: string;
  overrideDueChecks: boolean;
  overrideReason?: string;
}

type Step = 'tools' | 'borrower' | 'conditions' | 'details';
const STEPS: Step[] = ['tools', 'borrower', 'conditions', 'details'];

const isFuture = (value: string) => { const time = Date.parse(value); return Number.isFinite(time) && time > Date.now(); };
const holderName = (tool: Tool) => tool.holder?.split(' · ')[0] ?? '';

const DUE_PRESETS = [{ label: 'Tomorrow', days: 1 }, { label: 'In 3 days', days: 3 }, { label: 'Next week', days: 7 }];

export function BulkIssueForm({ tools, employees, issuerDepartment, locationSuggestions, onSave, onResolveAction }: {
  tools: Tool[];
  employees: Employee[];
  issuerDepartment: string;
  locationSuggestions: string[];
  onSave: (input: BulkIssueInput) => void | Promise<void>;
  onResolveAction?: (action: ConditionAction, tool: Tool) => void;
}) {
  const [step, setStep] = useState<Step>('tools');
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<string[]>([]);
  const [person, setPerson] = useState('');
  const [location, setLocation] = useState('');
  const [job, setJob] = useState('');
  const [due, setDue] = useState(() => tomorrowAt());
  const [condition, setCondition] = useState('Good');
  const [notes, setNotes] = useState('');
  const [overrideDue, setOverrideDue] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const hintFor = useHint();
  // Step problems are message-level (no single field owns them): bring the
  // message itself into view and focus so a refused Next/Issue is noticed.
  const errorRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => { if (error) errorRef.current?.focus(); }, [error]);

  const scoped = useMemo(
    () => tools.filter(t => (!issuerDepartment || departmentOf(t) === issuerDepartment) && !t.archived),
    [tools, issuerDepartment],
  );
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return scoped;
    return scoped.filter(t => `${t.id} ${t.name} ${t.category} ${t.location}`.toLowerCase().includes(q));
  }, [scoped, query]);
  const pickedTools = useMemo(() => scoped.filter(t => picked.includes(t.id)), [scoped, picked]);

  const departmentEmployees = useMemo(
    () => employees.filter(employee => employee.active && (!issuerDepartment || employee.department === issuerDepartment)),
    [employees, issuerDepartment],
  );
  const employeeChoices = useMemo(
    () => departmentEmployees.filter(employee => pickedTools.every(t => isEligibleForTool(t, employee))).map(employee => ({ label: employeeLabel(employee), detail: [employee.jobTitle, employee.department].filter(Boolean).join(' · ') })),
    [departmentEmployees, pickedTools],
  );
  const filteredOut = departmentEmployees.length - employeeChoices.length;
  const selectedEmployee = employees.find(employee => employeeLabel(employee) === person) ?? null;
  const holds = useMemo(
    () => (selectedEmployee ? tools.filter(t => t.holder && holderName(t) === selectedEmployee.name) : []),
    [tools, selectedEmployee],
  );

  const perTool = useMemo(
    () => pickedTools.map(tool => ({ tool, rows: toolConditions(tool, selectedEmployee) })),
    [pickedTools, selectedEmployee],
  );
  const anyDue = perTool.some(({ rows }) => rows.some(row => row.key === 'inspections' && row.state === 'unmet'));

  const toggle = (id: string) => { setPicked(current => (current.includes(id) ? current.filter(x => x !== id) : [...current, id])); setError(''); };
  const readyToIssue = (t: Tool) => t.status === 'available' && !needsAttention(t) && !nobodyCanUse(t);
  const resolveActions = (t: Tool): ConditionAction[] => [...new Set(toolConditions(t).flatMap(row => row.actions ?? []))];
  const selectAll = () => { setPicked(scoped.filter(readyToIssue).map(t => t.id)); setError(''); };
  const go = (next: Step) => { setError(''); setStep(next); };

  const validate = (at: Step): string => {
    if (at === 'tools' && pickedTools.length === 0) return 'Tick at least one available tool.';
    if (at === 'borrower') {
      if (!employeeChoices.some(choice => choice.label === person)) return 'Choose an eligible employee from the list.';
      const unqualified = perTool.find(({ rows }) => rows.some(row => row.key === 'competency' && row.state === 'unmet'));
      if (unqualified) return `${person.split(' · ')[0]} is not currently trained, qualified and authorized for ${unqualified.tool.name}. Update the Compliance register first.`;
    }
    if (at === 'conditions') {
      if (anyDue && !overrideDue) return 'A picked tool has an overdue check. Complete it, or tick "Go ahead anyway" and give a reason.';
      if (anyDue && overrideReason.trim().length < 5) return 'Give a short reason (at least 5 characters) for going ahead with an overdue check.';
    }
    if (at === 'details') {
      if (!isFuture(due)) return 'Choose a return time in the future.';
    }
    return '';
  };
  const next = () => {
    const problem = validate(step);
    if (problem) { setError(problem); return; }
    const at = STEPS.indexOf(step);
    if (at < STEPS.length - 1) go(STEPS[at + 1]);
  };
  const back = () => { const at = STEPS.indexOf(step); if (at > 0) go(STEPS[at - 1]); };

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    for (const at of STEPS) {
      const problem = validate(at);
      if (problem) { go(at); setError(problem); return; }
    }
    setSaving(true);
    try {
      await onSave({ toolIds: pickedTools.map(t => t.id), person, location: location.trim(), due: due ? formatDateTime(due) : '', dueISO: due ? new Date(due).toISOString() : undefined, job: job.trim(), condition, notes: notes.trim(), department: selectedEmployee?.department || issuerDepartment, overrideDueChecks: anyDue && overrideDue, overrideReason: anyDue && overrideDue ? overrideReason.trim() : undefined });
    } finally {
      setSaving(false);
    }
  }

  const footer = (last: boolean) => (
    <div className="sticky bottom-0 flex items-center justify-between gap-2 border-t border-line-subtle bg-surface pb-1 pt-4">
      {step === 'tools'
        ? <span />
        : <Button variant="secondary" onClick={back}>Back</Button>}
      {last
        ? <Button type="submit" variant="primary" pending={saving}>{saving ? 'Issuing…' : pickedTools.length === 0 ? 'Issue tools' : `Issue ${pickedTools.length} ${pickedTools.length === 1 ? 'tool' : 'tools'}`}</Button>
        : <Button variant="primary" onClick={next}>Next</Button>}
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <Tabs value={step} onValueChange={value => go(value as Step)}>
        <TabsList aria-label="Issue steps">
          <TabsTrigger value="tools" count={pickedTools.length} countTone={pickedTools.length > 0 ? 'brand' : 'neutral'}>Tools</TabsTrigger>
          <TabsTrigger value="borrower">Borrower</TabsTrigger>
          <TabsTrigger value="conditions">Conditions</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
        </TabsList>

        <TabsContent value="tools" className="flex flex-col gap-3 pt-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-sans text-body-sm text-ink-muted">{pickedTools.length === 0 ? 'Tick the tools to issue.' : `${pickedTools.length} picked.`}</p>
            <Button size="sm" variant="secondary" onClick={selectAll}>Select all available</Button>
          </div>
          <SearchField value={query} onValueChange={setQuery} placeholder="Search tools" />
          {visible.length === 0 ? (
            <p className="font-sans text-body-sm text-ink-muted">No tools match this search.</p>
          ) : (
            <ul className="flex max-h-64 flex-col gap-1 overflow-y-auto rounded-card border border-line-subtle p-2">
              {visible.map(tool => {
                const ready = readyToIssue(tool);
                const status = ready ? tool.location : tool.holder ? `With ${holderName(tool)}` : nobodyCanUse(tool) ? 'Nobody can use it yet' : 'Needs attention';
                return (
                  <li key={tool.id} className="flex items-center gap-1">
                    <div className="min-w-0 flex-1">
                      <Checkbox
                        label={`${tool.id} · ${tool.name}`}
                        description={ready || nobodyCanUse(tool) ? status : `${status} — cannot be issued`}
                        checked={picked.includes(tool.id)}
                        disabled={!ready}
                        onChange={() => toggle(tool.id)}
                      />
                    </div>
                    {onResolveAction && !ready && resolveActions(tool).map(action => (
                      <Button key={action} type="button" size="sm" variant="secondary" className="shrink-0" onClick={() => onResolveAction(action, tool)}>{CONDITION_ACTION_LABELS[action]}</Button>
                    ))}
                  </li>
                );
              })}
            </ul>
          )}
          {footer(false)}
        </TabsContent>

        <TabsContent value="borrower" className="flex flex-col gap-3 pt-4">
          {filteredOut > 0 && (
            <Notice tone="info" title="Only eligible borrowers are listed">
              {filteredOut} {filteredOut === 1 ? 'person is' : 'people are'} not trained, qualified and authorized for every picked tool. Update the Compliance register to add them.
            </Notice>
          )}
          <EmployeePicker label="Employee" required choices={employeeChoices} value={person} onChange={value => { setPerson(value); setError(''); }}
            emptyMessage={departmentEmployees.length ? `Nobody is currently trained, qualified and authorized for all ${pickedTools.length} picked tools. Update the Compliance register first.` : `No active employee is available${issuerDepartment ? ` in ${issuerDepartment}` : ''}.`}
            hint="One borrower for every picked tool — everyone listed can take all of them." />
          {selectedEmployee && (
            <p className="font-sans text-body-sm text-ink-muted">
              {holds.length === 0
                ? `${selectedEmployee.name.split(' ')[0]} holds nothing right now.`
                : `${selectedEmployee.name.split(' ')[0]} already holds ${holds.length}: ${holds.map(t => t.id).join(', ')}.`}
            </p>
          )}
          {footer(false)}
        </TabsContent>

        <TabsContent value="conditions" className="flex flex-col gap-3 pt-4">
          {pickedTools.length === 0 ? (
            <p className="font-sans text-body-sm text-ink-muted">Go back and tick tools to see what each one needs.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {perTool.map(({ tool, rows }) => {
                const open = rows.filter(row => row.state !== 'met');
                const blocked = blockingConditions(rows, overrideDue);
                return (
                  <li key={tool.id} className="rounded-card border border-line-subtle bg-surface-subtle/50 p-3">
                    <p className="flex items-center gap-2 font-sans text-body-sm font-medium text-ink">
                      <Icon name={blocked.length > 0 ? 'warning' : 'success'} size="sm" weight="emphasis" className={blocked.length > 0 ? 'text-warning' : 'text-success'} />
                      {tool.id} · {tool.name}
                    </p>
                    {open.length === 0 ? (
                      <p className="mt-1 font-sans text-body-sm text-ink-muted">Ready — no outstanding conditions.</p>
                    ) : (
                      <ul className="mt-1 flex flex-col gap-1">
                        {open.map(row => (
                          <li key={row.key} className="flex flex-wrap items-center gap-x-2 gap-y-1 font-sans text-body-sm text-ink-muted">
                            <span><strong className="font-medium text-ink">{row.label}</strong>{row.detail ? ` — ${row.detail}` : ''}</span>
                            {onResolveAction && row.actions?.map(action => (
                              <Button key={action} type="button" size="sm" variant="secondary" onClick={() => onResolveAction(action, tool)}>{CONDITION_ACTION_LABELS[action]}</Button>
                            ))}
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          {anyDue && (
            <>
              <Notice tone="warning" title="A picked tool has an overdue check">You can still issue. Say why, and the reason is kept in each tool’s history.</Notice>
              <Checkbox label="Go ahead anyway" checked={overrideDue} onChange={event => setOverrideDue(event.target.checked)} />
              {overrideDue && (
                <Field label="Reason for going ahead">
                  <Textarea aria-label="Reason for going ahead" rows={2} value={overrideReason} onChange={event => setOverrideReason(event.target.value)} placeholder="For example: breakdown repair, the inspection is booked for tomorrow." />
                </Field>
              )}
            </>
          )}
          {footer(false)}
        </TabsContent>

        <TabsContent value="details" className="flex flex-col gap-4 pt-4">
          <div className="rounded-card border border-line-subtle bg-surface-subtle/50 p-3">
            <p className="font-sans text-body-sm text-ink-muted">
              {pickedTools.length} {pickedTools.length === 1 ? 'tool' : 'tools'} for <strong className="text-ink">{person || 'no borrower yet'}</strong>
            </p>
            <ul className="mt-1 flex flex-col gap-1">
              {pickedTools.map(tool => (
                <li key={tool.id} className="flex items-center justify-between gap-2 font-sans text-body-sm text-ink-muted">
                  <span>{tool.id} · {tool.name}</span>
                  <IconButton icon="close" label={`Remove ${tool.id}`} size="sm" variant="ghost" onClick={() => toggle(tool.id)} />
                </li>
              ))}
            </ul>
          </div>
          <SuggestField label="Current work location" required={false} options={locationSuggestions} value={location} onChange={setLocation} historyKey="tools.work_location" hint="If known — one location for every picked tool, or leave it blank." />
          <SuggestField label="Work order / job" required={false} options={[]} value={job} onChange={setJob} historyKey="tools.job_reference" hint="If there is one — a work order is not required to issue." />
          <Field label="Expected return" required description={hintFor('Choose the local date and time, or take a preset.')}>
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap gap-2" role="group" aria-label="Return presets">
                {DUE_PRESETS.map(preset => (
                  <Button key={preset.label} size="sm" variant={due === daysFromNowAt(preset.days) ? 'primary' : 'secondary'} aria-pressed={due === daysFromNowAt(preset.days)} onClick={() => setDue(daysFromNowAt(preset.days))}>
                    {preset.label}
                  </Button>
                ))}
              </div>
              <Input aria-label="Expected return" name="due" type="datetime-local" value={due} onChange={event => setDue(event.target.value)} />
            </div>
          </Field>
          <FieldGroup label="Condition at issue">
            <Segmented label="Condition at issue" value={condition} onValueChange={setCondition} options={['Good', 'Damaged', 'Missing parts'].map(c => ({ value: c, label: c }))} />
          </FieldGroup>
          <Field label="Comments" optional description={hintFor('Anything about the state the tools went out in — marks, worn parts, missing accessories.')}>
            <Textarea aria-label="Comments" rows={2} value={notes} onChange={event => setNotes(event.target.value)} placeholder="For example: grinder guard scratched, otherwise sound." />
          </Field>
          {footer(true)}
        </TabsContent>
      </Tabs>
      {error && <p ref={errorRef} tabIndex={-1} role="alert" className="focus-ring font-sans text-body-sm font-medium text-danger">{error}</p>}
    </form>
  );
}
