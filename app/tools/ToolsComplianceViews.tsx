// app/tools/ToolsComplianceViews.tsx — the three read-only views of the Compliance section: inspections by equipment, open
// incidents, and approval coverage. Each is a shared table; anything overdue is listed first, so the section opens on what
// needs doing.
'use client';

import { useMemo, useState } from 'react';
import { Button, DataTable, Icon, Notice, SearchField, Segmented, StatusBadge } from '@/components/ui-system';
import { formatDate, formatDateTime } from '@/lib/format';
import type { CompetencyRecord, IncidentRecord } from './complianceTypes';
import type { Employee, Tool } from './prototype';

export const INCIDENT_NAMES: Record<IncidentRecord['incident_type'], string> = { lost: 'Lost equipment', damaged: 'Damage', stolen: 'Suspected theft', missing_components: 'Missing components', late_return: 'Late return' };
const label = (value: string) => value.replaceAll('_', ' ');
const COLOUR_DOT: Record<string, string> = { green: 'var(--mo-success)', yellow: 'var(--mo-warning)', red: 'var(--mo-danger)', blue: 'var(--mo-info)' };

const Toolbar = ({ children }: { children: React.ReactNode }) => <div className="flex flex-wrap items-center gap-3">{children}</div>;

// ─── Inspections ─────────────────────────────────────────────────────────────────────

export function InspectionsView({ tools, onRecord }: { tools: Tool[]; onRecord?: (tool: Tool) => void }) {
  const due = tools.filter(tool => (tool.inspectionDue || []).length);
  const [show, setShow] = useState<'due' | 'all'>(due.length ? 'due' : 'all');
  const [query, setQuery] = useState('');
  const rows = useMemo(() => tools
    .filter(tool => (show === 'all' || (tool.inspectionDue || []).length) && `${tool.id} ${tool.name} ${tool.location}`.toLowerCase().includes(query.trim().toLowerCase()))
    .sort((a, b) => (b.inspectionDue || []).length - (a.inspectionDue || []).length || a.name.localeCompare(b.name)), [tools, show, query]);
  return (
    <div className="flex flex-col gap-4">
      <Toolbar>
        <Segmented label="Show equipment" value={show} onValueChange={setShow} options={[{ value: 'due', label: `Overdue (${due.length})` }, { value: 'all', label: `All equipment (${tools.length})` }]} />
        <SearchField label="Find equipment" placeholder="Find equipment" value={query} onValueChange={setQuery} wrapperClassName="w-full sm:w-64" />
      </Toolbar>
      {due.length === 0 && show === 'due'
        ? <p className="flex items-center gap-2 font-sans text-body-sm text-ink-muted"><Icon name="success" size="sm" />No scheduled checks are overdue. Requirements come from each equipment record.</p>
        : (
          <DataTable
            caption="Inspections by equipment"
            rows={rows}
            getRowId={tool => tool.id}
            columns={[
              { id: 'equipment', header: 'Equipment', sticky: true, cell: tool => <><strong className="block font-medium text-ink">{tool.name}</strong><small className="text-ink-muted">{tool.id} · {tool.location}</small></> },
              { id: 'checks', header: 'Checks', cell: tool => (tool.inspectionDue || []).length
                ? <span className="flex flex-wrap gap-1.5">{(tool.inspectionDue || []).map(item => <StatusBadge key={item} tone="danger">{label(item)} overdue</StatusBadge>)}</span>
                : <StatusBadge tone="success">Up to date</StatusBadge> },
              { id: 'colour', header: 'Last colour inspection', hideBelow: 'md', cell: tool => {
                const quarterly = tool.latestInspections?.quarterly;
                return <span className="inline-flex items-center gap-2"><span aria-hidden="true" className="size-2 rounded-full" style={{ background: COLOUR_DOT[(quarterly?.colour_code || '').toLowerCase()] ?? 'var(--mo-neutral)' }} />{quarterly ? `${quarterly.colour_code} · ${formatDate(quarterly.inspected_at)}` : 'Not recorded'}</span>;
              } },
            ]}
            rowActions={onRecord ? tool => <Button variant={(tool.inspectionDue || []).length ? 'primary' : 'secondary'} aria-label={`Record a check for ${tool.name}`} onClick={() => onRecord(tool)}>Record check</Button> : undefined}
          />
        )}
      {rows.length === 0 && !(due.length === 0 && show === 'due') && <p className="font-sans text-body-sm text-ink-muted">No equipment matches.</p>}
    </div>
  );
}

// ─── Incidents ───────────────────────────────────────────────────────────────────────

export function IncidentsView({ incidents, toolById, employeeById, onClose }: { incidents: IncidentRecord[]; toolById: Map<string | undefined, Tool>; employeeById: Map<string | undefined, Employee>; onClose?: (incident: IncidentRecord) => void }) {
  const [now] = useState(() => Date.now());
  if (incidents.length === 0) return <p className="flex items-center gap-2 font-sans text-body-sm text-ink-muted"><Icon name="success" size="sm" />No open incidents. Loss, damage, theft, missing parts and late returns appear here until their investigation is closed.</p>;
  return (
    <DataTable
      caption="Open incidents"
      rows={incidents}
      getRowId={item => item.id}
      columns={[
        { id: 'incident', header: 'Incident', sticky: true, cell: item => {
          const tool = toolById.get(item.tool_id); const person = employeeById.get(item.employee_id);
          return <><strong className="block font-medium text-ink">{INCIDENT_NAMES[item.incident_type]}</strong><small className="text-ink-muted">{tool ? `${tool.id} · ${tool.name}` : 'Equipment'}{person ? ` · ${person.name}` : ''}</small></>;
        } },
        { id: 'what', header: 'What happened', hideBelow: 'md', cell: item => <><p>{item.explanation}</p><small className="text-ink-muted">Reported by {item.reported_by}</small></> },
        { id: 'due', header: 'Investigation', cell: item => { const overdue = new Date(item.investigation_due_at).getTime() < now; return <StatusBadge tone={overdue ? 'danger' : 'success'}>{overdue ? 'Overdue' : 'Due'} {formatDateTime(item.investigation_due_at)}</StatusBadge>; } },
      ]}
      rowActions={onClose ? item => { const tool = toolById.get(item.tool_id); return <Button aria-label={`Close the investigation into ${INCIDENT_NAMES[item.incident_type]}${tool ? ` on ${tool.name}` : ''}`} onClick={() => onClose(item)}>Close investigation</Button>; } : undefined}
    />
  );
}

// ─── Approvals: coverage and expiry ──────────────────────────────────────────────────

const EXPIRY_FIELDS: Array<[keyof CompetencyRecord, string]> = [['training_expires_at', 'Training'], ['qualification_expires_at', 'Qualification'], ['authorization_expires_at', 'Authorisation']];

export function ApprovalsView({ tools, competencies, toolById, employeeById, onOpenEmployees }: { tools: Tool[]; competencies: CompetencyRecord[]; toolById: Map<string | undefined, Tool>; employeeById: Map<string | undefined, Employee>; onOpenEmployees?: () => void }) {
  const [show, setShow] = useState<'none' | 'all'>('none');
  const [query, setQuery] = useState('');
  const [now] = useState(() => Date.now());
  const uncovered = tools.filter(tool => !(tool.eligibleEmployees || []).length);
  const soon = now + 30 * 24 * 3600 * 1000;
  const expiring = competencies.flatMap(record => EXPIRY_FIELDS.flatMap(([field, name]) => {
    const value = record[field] as string | undefined;
    return value && record.authorized && Date.parse(value) < soon ? [{ record, name, value }] : [];
  })).sort((a, b) => Date.parse(a.value) - Date.parse(b.value));
  const rows = tools.filter(tool => (show === 'all' || !(tool.eligibleEmployees || []).length) && `${tool.id} ${tool.name}`.toLowerCase().includes(query.trim().toLowerCase()));
  return (
    <div className="flex flex-col gap-5">
      <Notice title="An approval counts only while training, qualification and authorisation are all current."
        action={onOpenEmployees ? <Button type="button" onClick={onOpenEmployees}>Manage who can use what</Button> : undefined}>
        People and what they may use are managed under Employees; this view shows where the cover has gaps.
      </Notice>
      {expiring.length > 0 && (
        <section className="flex flex-col gap-2">
          <h3 className="font-sans text-body-sm font-semibold text-ink">Expiring within 30 days <span className="font-normal text-ink-muted">{expiring.length}</span></h3>
          <DataTable
            caption="Approvals expiring soon"
            rows={expiring.slice(0, 25)}
            getRowId={item => `${item.record.id}-${item.name}`}
            columns={[
              { id: 'person', header: 'Person', cell: ({ record }) => { const person = employeeById.get(record.employee_id); return <><strong className="block font-medium text-ink">{person?.name || 'Unknown employee'}</strong><small className="text-ink-muted">{person?.employeeNumber}</small></>; } },
              { id: 'tool', header: 'Equipment', cell: ({ record }) => { const tool = toolById.get(record.tool_id); return tool ? `${tool.id} · ${tool.name}` : record.category || 'Category approval'; } },
              { id: 'expires', header: 'Expires', cell: ({ value }) => { const lapsed = Date.parse(value) < now; return <StatusBadge tone={lapsed ? 'danger' : 'warning'}>{lapsed ? 'Lapsed ' : ''}{formatDate(value)}</StatusBadge>; } },
              { id: 'which', header: 'Which', cell: ({ name }) => name },
            ]}
          />
        </section>
      )}
      <section className="flex flex-col gap-3">
        <h3 className="font-sans text-body-sm font-semibold text-ink">Cover by equipment</h3>
        <Toolbar>
          <Segmented label="Show equipment cover" value={show} onValueChange={setShow} options={[{ value: 'none', label: `Nobody eligible (${uncovered.length})` }, { value: 'all', label: `All equipment (${tools.length})` }]} />
          <SearchField label="Find equipment" placeholder="Find equipment" value={query} onValueChange={setQuery} wrapperClassName="w-full sm:w-64" />
        </Toolbar>
        {uncovered.length === 0 && show === 'none'
          ? <p className="flex items-center gap-2 font-sans text-body-sm text-ink-muted"><Icon name="success" size="sm" />Every piece of equipment has at least one eligible person.</p>
          : (
            <DataTable
              caption="Eligible people by equipment"
              rows={rows}
              getRowId={tool => tool.id}
              columns={[
                { id: 'equipment', header: 'Equipment', sticky: true, cell: tool => <><strong className="block font-medium text-ink">{tool.name}</strong><small className="text-ink-muted">{tool.id}</small></> },
                { id: 'people', header: 'Eligible people', cell: tool => { const count = (tool.eligibleEmployees || []).length; return <StatusBadge tone={count ? 'success' : 'danger'}>{count ? `${count} ${count === 1 ? 'person' : 'people'}` : 'Nobody eligible, cannot be issued'}</StatusBadge>; } },
              ]}
            />
          )}
      </section>
    </div>
  );
}
