// app/tools/BulkIssueForm.tsx — issue several tools to one borrower in one pass: pick the tools, check the
// conditions each one carries, pick the borrower, fill the shared details once. Each tool is still issued by
// its own idempotent command, so one refusal never stops the rest.
'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { Button, Checkbox, Field, Icon, Input, Notice, SearchField, Textarea } from '@/components/ui-system';
import { formatDateTime } from '@/lib/format';
import { tomorrowAt } from '@/lib/dates';
import { departmentOf, type Employee, type Tool } from './prototype';
import { EmployeePicker } from './ToolsEmployeePicker';
import { SuggestField, useHint } from './ToolsForms';
import { blockingConditions, toolConditions } from './toolConditions';

export interface BulkIssueInput {
  toolIds: string[];
  person: string;
  location: string;
  due: string;
  dueISO?: string;
  job: string;
  department: string;
  preUseCheckCompleted: boolean;
  overrideDueChecks: boolean;
  overrideReason?: string;
}

const isFuture = (value: string) => { const time = Date.parse(value); return Number.isFinite(time) && time > Date.now(); };
const employeeLabel = (employee: Employee) => `${employee.name} · ${employee.employeeNumber}`;

export function BulkIssueForm({ tools, employees, issuerDepartment, locationSuggestions, onSave }: {
  tools: Tool[];
  employees: Employee[];
  issuerDepartment: string;
  locationSuggestions: string[];
  onSave: (input: BulkIssueInput) => void;
}) {
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<string[]>([]);
  const [person, setPerson] = useState('');
  const [location, setLocation] = useState('');
  const [job, setJob] = useState('');
  const [preUseCheckCompleted, setPreUseCheckCompleted] = useState(false);
  const [overrideDue, setOverrideDue] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  const [error, setError] = useState('');
  const hintFor = useHint();

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
    () => departmentEmployees.map(employee => ({ label: employeeLabel(employee), detail: [employee.jobTitle, employee.department].filter(Boolean).join(' · ') })),
    [departmentEmployees],
  );
  const selectedEmployee = employees.find(employee => employeeLabel(employee) === person) ?? null;

  const perTool = useMemo(
    () => pickedTools.map(tool => ({ tool, rows: toolConditions(tool, selectedEmployee, { preUseChecked: preUseCheckCompleted }) })),
    [pickedTools, selectedEmployee, preUseCheckCompleted],
  );
  const anyDue = perTool.some(({ rows }) => rows.some(row => row.key === 'inspections' && row.state === 'unmet'));
  const anyPreUse = pickedTools.some(tool => tool.preUseCheckRequired === true);

  const toggle = (id: string) => setPicked(current => (current.includes(id) ? current.filter(x => x !== id) : [...current, id]));
  const selectAll = () => setPicked(scoped.filter(t => t.status === 'available').map(t => t.id));

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const due = String(new FormData(event.currentTarget).get('due') || '');
    if (pickedTools.length === 0) return setError('Tick at least one available tool.');
    if (!employeeChoices.some(choice => choice.label === person)) return setError('Choose an employee from this workspace register.');
    const unqualified = perTool.find(({ rows }) => rows.some(row => row.key === 'competency' && row.state === 'unmet'));
    if (unqualified) return setError(`${person.split(' · ')[0]} is not currently trained, qualified and authorized for ${unqualified.tool.name}. Update the Compliance register first.`);
    if (!location.trim()) return setError('Add the work location.');
    if (!job.trim()) return setError('Add the work order or job reference.');
    if (!isFuture(due)) return setError('Choose a return time in the future.');
    if (anyDue && !overrideDue) return setError('A picked tool has an overdue check. Complete it, or tick "Go ahead anyway" and give a reason.');
    if (anyDue && overrideReason.trim().length < 5) return setError('Give a short reason (at least 5 characters) for going ahead with an overdue check.');
    if (anyPreUse && !preUseCheckCompleted) return setError('Confirm that the employee completed the pre-use inspections.');
    onSave({ toolIds: pickedTools.map(t => t.id), person, location: location.trim(), due: due ? formatDateTime(due) : '', dueISO: due ? new Date(due).toISOString() : undefined, job: job.trim(), department: selectedEmployee?.department || issuerDepartment, preUseCheckCompleted, overrideDueChecks: anyDue && overrideDue, overrideReason: anyDue && overrideDue ? overrideReason.trim() : undefined });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <section aria-label="Tools to issue" className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-sans text-label font-semibold text-ink">1 · Tools{pickedTools.length > 0 ? ` — ${pickedTools.length} picked` : ''}</h3>
          <Button size="sm" variant="secondary" onClick={selectAll}>Select all available</Button>
        </div>
        <SearchField value={query} onValueChange={setQuery} placeholder="Search tools" />
        {visible.length === 0 ? (
          <p className="font-sans text-body-sm text-ink-muted">No tools match this search.</p>
        ) : (
          <ul className="flex max-h-64 flex-col gap-1 overflow-y-auto rounded-card border border-line-subtle p-2">
            {visible.map(tool => {
              const ready = tool.status === 'available';
              const status = ready ? tool.location : tool.holder ? `With ${tool.holder.split(' · ')[0]}` : 'Needs attention';
              return (
                <li key={tool.id}>
                  <Checkbox
                    label={`${tool.id} · ${tool.name}`}
                    description={ready ? status : `${status} — cannot be issued`}
                    checked={picked.includes(tool.id)}
                    disabled={!ready}
                    onChange={() => toggle(tool.id)}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-label="Conditions for the picked tools" className="flex flex-col gap-2">
        <h3 className="font-sans text-label font-semibold text-ink">2 · Conditions</h3>
        {pickedTools.length === 0 ? (
          <p className="font-sans text-body-sm text-ink-muted">Tick tools above to see what each one needs.</p>
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
                        <li key={row.key} className="font-sans text-body-sm text-ink-muted">
                          <strong className="font-medium text-ink">{row.label}</strong>{row.detail ? ` — ${row.detail}` : ''}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-label="Borrower" className="flex flex-col gap-2">
        <h3 className="font-sans text-label font-semibold text-ink">3 · Borrower</h3>
        <EmployeePicker label="Employee" choices={employeeChoices} value={person} onChange={setPerson}
          emptyMessage={`No active employee is available${issuerDepartment ? ` in ${issuerDepartment}` : ''}.`}
          hint="One borrower for every picked tool. Competency is checked per tool above." />
      </section>

      <section aria-label="Shared details" className="flex flex-col gap-4">
        <h3 className="font-sans text-label font-semibold text-ink">4 · Details</h3>
        <SuggestField label="Current work location" options={locationSuggestions} value={location} onChange={setLocation} hint="One location for every picked tool." />
        <SuggestField label="Work order / job" options={[]} value={job} onChange={setJob} hint="Enter the work order number or the job reference from the paper record." />
        <Field label="Expected return" description={hintFor('Choose the local date and time.')}>
          <Input aria-label="Expected return" name="due" type="datetime-local" required defaultValue={tomorrowAt()} />
        </Field>
        {anyPreUse && (
          <Checkbox label={`Pre-use inspections completed for all ${pickedTools.length} ${pickedTools.length === 1 ? 'tool' : 'tools'}`} checked={preUseCheckCompleted} onChange={event => setPreUseCheckCompleted(event.target.checked)} />
        )}
        {anyDue && (
          <>
            <Notice tone="warning" title="A picked tool has an overdue check">You can still issue. Say why, and the reason is kept in each tool’s history.</Notice>
            <Checkbox label="Go ahead anyway" checked={overrideDue} onChange={event => setOverrideDue(event.target.checked)} />
            {overrideDue && (
              <Field label="Reason for going ahead">
                <Textarea aria-label="Reason for going ahead" rows={2} required value={overrideReason} onChange={event => setOverrideReason(event.target.value)} placeholder="For example: breakdown repair, the inspection is booked for tomorrow." />
              </Field>
            )}
          </>
        )}
      </section>

      {error && <p role="alert" className="font-sans text-body-sm font-medium text-danger">{error}</p>}
      <Button type="submit" variant="primary" disabled={pickedTools.length === 0}>
        {pickedTools.length === 0 ? 'Issue tools' : `Issue ${pickedTools.length} ${pickedTools.length === 1 ? 'tool' : 'tools'}`}
      </Button>
    </form>
  );
}
