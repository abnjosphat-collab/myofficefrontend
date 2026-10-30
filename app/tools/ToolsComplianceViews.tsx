// app/tools/ToolsComplianceViews.tsx — the three read-only views of the Compliance section: inspections by tool, open
// incidents, and approval coverage. Each is a shared table; anything overdue is listed first, so the section opens on what
// needs doing.
'use client';

import { useMemo, useState } from 'react';
import { Button, DataTable, Icon, Notice, SearchField, Segmented, StatusBadge } from '@/components/ui-system';
import { formatDate, formatDateTime } from '@/lib/format';
import type { CompetencyRecord, IncidentRecord, InspectionPlanRow, InspectionRecord } from './complianceTypes';
import type { Employee, Tool } from './prototype';

export const INCIDENT_NAMES: Record<IncidentRecord['incident_type'], string> = { lost: 'Lost tool', damaged: 'Damage', stolen: 'Suspected theft', missing_components: 'Missing components', late_return: 'Late return' };
const label = (value: string) => value.replaceAll('_', ' ');
const COLOUR_DOT: Record<string, string> = { green: 'var(--mo-success)', yellow: 'var(--mo-warning)', red: 'var(--mo-danger)', blue: 'var(--mo-info)' };

const Toolbar = ({ children }: { children: React.ReactNode }) => <div className="flex flex-wrap items-center gap-3">{children}</div>;

// ─── Inspections ─────────────────────────────────────────────────────────────────────

export function InspectionsView({ tools, plan, inspections, onRecord }: { tools: Tool[]; plan: InspectionPlanRow[]; inspections: InspectionRecord[]; onRecord?: (tool: Tool) => void }) {
  const due = tools.filter(tool => (tool.inspectionDue || []).length);
  const [show, setShow] = useState<'due' | 'all'>(due.length ? 'due' : 'all');
  const [query, setQuery] = useState('');
  const rows = useMemo(() => tools
    .filter(tool => (show === 'all' || (tool.inspectionDue || []).length) && `${tool.id} ${tool.name} ${tool.location}`.toLowerCase().includes(query.trim().toLowerCase()))
    .sort((a, b) => (b.inspectionDue || []).length - (a.inspectionDue || []).length || a.name.localeCompare(b.name)), [tools, show, query]);
  return (
    <div className="flex flex-col gap-4">
      <Toolbar>
        <Segmented label="Show tools" value={show} onValueChange={setShow} options={[{ value: 'due', label: `Overdue (${due.length})` }, { value: 'all', label: `All tools (${tools.length})` }]} />
        <SearchField label="Find tools" placeholder="Find tools" value={query} onValueChange={setQuery} wrapperClassName="w-full sm:w-64" />
      </Toolbar>
      {due.length === 0 && show === 'due'
        ? <p className="flex items-center gap-2 font-sans text-body-sm text-ink-muted"><Icon name="success" size="sm" />No scheduled checks are overdue. Requirements come from each tool record.</p>
        : (
          <DataTable
            stillKey={JSON.stringify([show, query])}
            caption="Inspections by tool"
            rows={rows}
            getRowId={tool => tool.id}
            columns={[
              { id: 'equipment', header: 'Tool', sticky: true, cell: tool => <><strong className="block font-medium text-ink">{tool.name}</strong><small className="text-ink-muted">{tool.id} · {tool.location}</small></> },
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
      {rows.length === 0 && !(due.length === 0 && show === 'due') && <p className="font-sans text-body-sm text-ink-muted">No tools match.</p>}
      <QuarterPlanView tools={tools} plan={plan} inspections={inspections} onRecord={onRecord} />
    </div>
  );
}

// --- This quarter's plan ---

/** The quarter a timestamp falls in, as the plan's own key ('2026-Q4'). */
const planQuarterOf = (iso: string) => { const at = new Date(iso); return `${at.getUTCFullYear()}-Q${Math.floor(at.getUTCMonth() / 3) + 1}`; };

/** The quarter's colour-inspection plan by day: date, tools, done or pending, with the record action on pending rows. */
export function QuarterPlanView({ tools, plan, inspections, onRecord }: { tools: Tool[]; plan: InspectionPlanRow[]; inspections: InspectionRecord[]; onRecord?: (tool: Tool) => void }) {
  const byId = useMemo(() => new Map(tools.map(tool => [tool.backendId, tool])), [tools]);
  const done = (row: InspectionPlanRow) => row.completed_inspection_id != null || inspections.some(item => item.tool_id === row.tool_id && item.inspection_type === 'quarterly' && item.outcome === 'passed' && item.inspected_at && planQuarterOf(item.inspected_at) === row.quarter);
  const days = useMemo(() => {
    const groups = new Map<string, InspectionPlanRow[]>();
    for (const row of [...plan].sort((a, b) => a.planned_date.localeCompare(b.planned_date))) {
      if (!byId.get(row.tool_id)) continue;
      groups.set(row.planned_date, [...(groups.get(row.planned_date) || []), row]);
    }
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [plan, byId]);
  if (!days.length) return null;
  const quarter = plan[0]?.quarter || '';
  const title = quarter ? `Q${quarter.slice(6)} ${quarter.slice(0, 4)}` : 'This quarter';
  return (
    <section aria-label="This quarter's plan" className="flex flex-col gap-4">
      <h3 className="font-sans text-body-sm font-semibold text-ink">This quarter&apos;s plan <span className="font-normal text-ink-muted">{title} &middot; {plan.length} {plan.length === 1 ? 'tool' : 'tools'}</span></h3>
      {days.map(([day, rows]) => (
        <section key={day} aria-label={`Planned for ${formatDate(day)}`} className="flex flex-col gap-2">
          <h4 className="font-sans text-caption font-medium text-ink-muted">{formatDate(day)} &middot; {rows.length} {rows.length === 1 ? 'tool' : 'tools'}</h4>
          <DataTable
            caption={`Quarterly plan for ${formatDate(day)}`}
            rows={rows}
            getRowId={row => row.id}
            columns={[
              { id: 'equipment', header: 'Tool', sticky: true, cell: row => { const tool = byId.get(row.tool_id)!; return <><strong className="block font-medium text-ink">{tool.name}</strong><small className="text-ink-muted">{tool.id} &middot; {tool.location}</small></>; } },
              { id: 'state', header: 'State', cell: row => done(row) ? <StatusBadge tone="success">Done</StatusBadge> : <StatusBadge tone="neutral">Pending</StatusBadge> },
            ]}
            rowActions={onRecord ? row => { const tool = byId.get(row.tool_id)!; return done(row) ? null : <Button variant="secondary" aria-label={`Record a check for ${tool.name}`} onClick={() => onRecord(tool)}>Record check</Button>; } : undefined}
          />
        </section>
      ))}
    </section>
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
          return <><strong className="block font-medium text-ink">{INCIDENT_NAMES[item.incident_type]}</strong><small className="text-ink-muted">{tool ? `${tool.id} · ${tool.name}` : 'Tool'}{person ? ` · ${person.name}` : ''}</small></>;
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
              { id: 'person', header: 'Person', cell: ({ record }) => { const person = employeeById.get(record.employee_id); return <><strong className="block font-medium text-ink">{person?.name || 'Unknown employee'}</strong><small className="text-ink-muted">{person?.employeeNumber ?? 'Not recorded'}</small></>; } },
              { id: 'tool', header: 'Tool', cell: ({ record }) => { const tool = toolById.get(record.tool_id); return tool ? `${tool.id} · ${tool.name}` : record.category || 'Category approval'; } },
              { id: 'expires', header: 'Expires', cell: ({ value }) => { const lapsed = Date.parse(value) < now; return <StatusBadge tone={lapsed ? 'danger' : 'warning'}>{lapsed ? 'Lapsed ' : ''}{formatDate(value)}</StatusBadge>; } },
              { id: 'which', header: 'Which', cell: ({ name }) => name },
            ]}
          />
        </section>
      )}
      <section className="flex flex-col gap-3">
        <h3 className="font-sans text-body-sm font-semibold text-ink">Cover by tool</h3>
        <Toolbar>
          <Segmented label="Show tool cover" value={show} onValueChange={setShow} options={[{ value: 'none', label: `Nobody eligible (${uncovered.length})` }, { value: 'all', label: `All tools (${tools.length})` }]} />
          <SearchField label="Find tools" placeholder="Find tools" value={query} onValueChange={setQuery} wrapperClassName="w-full sm:w-64" />
        </Toolbar>
        {uncovered.length === 0 && show === 'none'
          ? <p className="flex items-center gap-2 font-sans text-body-sm text-ink-muted"><Icon name="success" size="sm" />Every tool has at least one eligible person.</p>
          : (
            <DataTable
              stillKey={JSON.stringify([show, query])}
              caption="Eligible people by tool"
              rows={rows}
              getRowId={tool => tool.id}
              columns={[
                { id: 'equipment', header: 'Tool', sticky: true, cell: tool => <><strong className="block font-medium text-ink">{tool.name}</strong><small className="text-ink-muted">{tool.id}</small></> },
                { id: 'people', header: 'Eligible people', cell: tool => { const count = (tool.eligibleEmployees || []).length; return <StatusBadge tone={count ? 'success' : 'danger'}>{count ? `${count} ${count === 1 ? 'person' : 'people'}` : 'Nobody can use it, cannot be issued'}</StatusBadge>; } },
              ]}
            />
          )}
      </section>
    </div>
  );
}
