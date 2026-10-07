// app/tools/ToolsComplianceViews.tsx — the three read-only views of the Compliance tab: inspections by equipment, open incidents, and
// approval coverage. Each is a table on the same grid as Account access (header row, aligned columns, one action at the right) and turns
// into labelled cards when narrow. Anything overdue is listed first, so the tab opens on what needs doing.
'use client';

import { useMemo, useState, type CSSProperties } from 'react';
import { ToolsIcon as Icon } from './ToolsIcon';
import type { CompetencyRecord, IncidentRecord } from './complianceTypes';
import type { Employee, Tool } from './prototype';
import s from './tools.module.css';

export const INCIDENT_NAMES: Record<IncidentRecord['incident_type'], string> = { lost: 'Lost equipment', damaged: 'Damage', stolen: 'Suspected theft', missing_components: 'Missing components', late_return: 'Late return' };
const shortDate = (value: string) => new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
const label = (value: string) => value.replaceAll('_', ' ');
const cols = (template: string) => ({ '--acct-cols': template }) as CSSProperties;

function Filter({ options, value, onChange, name }: { options: Array<{ value: string; label: string }>; value: string; onChange: (value: string) => void; name: string }) {
  return <div className={s.eligSwitch} role="group" aria-label={name}>{options.map(option => <button key={option.value} type="button" aria-pressed={value === option.value} onClick={() => onChange(option.value)}>{option.label}</button>)}</div>;
}
function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return <label className={s.eligFilter}><Icon name="search" size={15} /><input type="search" aria-label={placeholder} value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} /></label>;
}

// ─── Inspections ─────────────────────────────────────────────────────────────────────

export function InspectionsView({ tools, onRecord }: { tools: Tool[]; onRecord?: (tool: Tool) => void }) {
  const due = tools.filter(tool => (tool.inspectionDue || []).length);
  const [show, setShow] = useState<'due' | 'all'>(due.length ? 'due' : 'all');
  const [query, setQuery] = useState('');
  const rows = useMemo(() => tools
    .filter(tool => (show === 'all' || (tool.inspectionDue || []).length) && `${tool.id} ${tool.name} ${tool.location}`.toLowerCase().includes(query.trim().toLowerCase()))
    .sort((a, b) => (b.inspectionDue || []).length - (a.inspectionDue || []).length || a.name.localeCompare(b.name)), [tools, show, query]);
  return <div className={s.cmpPanel}>
    <div className={s.cmpToolbar}>
      <Filter name="Show equipment" value={show} onChange={value => setShow(value as 'due' | 'all')} options={[{ value: 'due', label: `Overdue (${due.length})` }, { value: 'all', label: `All equipment (${tools.length})` }]} />
      <SearchBox value={query} onChange={setQuery} placeholder="Find equipment" />
    </div>
    {due.length === 0 && show === 'due'
      ? <p className={s.acctNote}><Icon name="check" size={16} /><span>No scheduled checks are overdue. Requirements come from each equipment record.</span></p>
      : <div className={s.acctTable} role="table" aria-label="Inspections by equipment" style={cols('minmax(220px,1.5fr) minmax(210px,1.3fr) minmax(210px,1.2fr) 120px')}>
        <div className={s.acctHead} role="row"><span role="columnheader">Equipment</span><span role="columnheader">Checks</span><span role="columnheader">Last colour inspection</span><span role="columnheader"><span className={s.srOnly}>Action</span></span></div>
        {rows.map(tool => {
          const quarterly = tool.latestInspections?.quarterly;
          const overdue = tool.inspectionDue || [];
          return <div className={s.acctRow} role="row" key={tool.id}>
            <div className={s.acctPerson} role="cell"><span className={s.acctAvatar} aria-hidden="true"><Icon name="box" size={19} /></span><span><strong>{tool.name}</strong><small>{tool.id} · {tool.location}</small></span></div>
            <div className={s.acctCell} role="cell" data-label="Checks">{overdue.length ? <div className={s.cmpChips}>{overdue.map(item => <span key={item} className={s.cmpChip} data-tone="due">{label(item)} overdue</span>)}</div> : <span className={s.cmpChip} data-tone="ok">Up to date</span>}</div>
            <div className={s.acctCell} role="cell" data-label="Last colour inspection"><div className={s.inspectionColour} data-colour={(quarterly?.colour_code || 'none').toLowerCase()}><i />{quarterly ? `${quarterly.colour_code} · ${shortDate(quarterly.inspected_at)}` : 'Not recorded'}</div></div>
            <div className={`${s.acctActions} ${s.acctActionsCompact}`} role="cell">{onRecord && <button type="button" className={overdue.length ? s.primary : s.secondary} aria-label={`Record a check for ${tool.name}`} onClick={() => onRecord(tool)}>Record check</button>}</div>
          </div>;
        })}
        {rows.length === 0 && <p className={s.eligEmpty}>No equipment matches.</p>}
      </div>}
  </div>;
}

// ─── Incidents ───────────────────────────────────────────────────────────────────────

export function IncidentsView({ incidents, toolById, employeeById, onClose }: { incidents: IncidentRecord[]; toolById: Map<string | undefined, Tool>; employeeById: Map<string | undefined, Employee>; onClose?: (incident: IncidentRecord) => void }) {
  const [now] = useState(() => Date.now());
  if (incidents.length === 0) return <div className={s.cmpPanel}><p className={s.acctNote}><Icon name="check" size={16} /><span>No open incidents. Loss, damage, theft, missing parts and late returns appear here until their investigation is closed.</span></p></div>;
  return <div className={s.cmpPanel}>
    <div className={s.acctTable} role="table" aria-label="Open incidents" style={cols('minmax(230px,1.3fr) minmax(260px,2fr) minmax(190px,1fr) 150px')}>
      <div className={s.acctHead} role="row"><span role="columnheader">Incident</span><span role="columnheader">What happened</span><span role="columnheader">Investigation</span><span role="columnheader"><span className={s.srOnly}>Action</span></span></div>
      {incidents.map(item => {
        const tool = toolById.get(item.tool_id);
        const person = employeeById.get(item.employee_id);
        const overdue = new Date(item.investigation_due_at).getTime() < now;
        return <div className={s.acctRow} role="row" key={item.id} data-changed={overdue}>
          <div className={s.acctPerson} role="cell"><span className={s.acctAvatar} aria-hidden="true"><Icon name="alert" size={19} /></span><span><strong>{INCIDENT_NAMES[item.incident_type]}</strong><small>{tool ? `${tool.id} · ${tool.name}` : 'Equipment'}{person ? ` · ${person.name}` : ''}</small></span></div>
          <div className={s.acctCell} role="cell" data-label="What happened"><p className={s.cmpText}>{item.explanation}</p><small className={s.cmpMuted}>Reported by {item.reported_by}</small></div>
          <div className={s.acctCell} role="cell" data-label="Investigation"><span className={s.cmpChip} data-tone={overdue ? 'due' : 'ok'}>{overdue ? 'Overdue' : 'Due'} {new Date(item.investigation_due_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span></div>
          <div className={`${s.acctActions} ${s.acctActionsCompact}`} role="cell">{onClose && <button type="button" className={s.secondary} aria-label={`Close the investigation into ${INCIDENT_NAMES[item.incident_type]}${tool ? ` on ${tool.name}` : ''}`} onClick={() => onClose(item)}>Close investigation</button>}</div>
        </div>;
      })}
    </div>
  </div>;
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
  return <div className={s.cmpPanel}>
    <p className={s.acctNote}><Icon name="info" size={16} /><span>An approval counts only while training, qualification and authorisation are all current. People and what they may use are managed under Employees; this view shows where the cover has gaps.</span></p>
    {onOpenEmployees && <div><button type="button" className={s.secondary} onClick={onOpenEmployees}>Manage who can use what</button></div>}
    {expiring.length > 0 && <div className={s.cmpBlock}>
      <h3>Expiring within 30 days <span className={s.eligCount}>{expiring.length}</span></h3>
      <div className={s.acctTable} role="table" aria-label="Approvals expiring soon" style={cols('minmax(200px,1.2fr) minmax(200px,1.2fr) minmax(130px,.8fr) minmax(130px,.8fr)')}>
        <div className={s.acctHead} role="row"><span role="columnheader">Person</span><span role="columnheader">Equipment</span><span role="columnheader">Expires</span><span role="columnheader">Which</span></div>
        {expiring.slice(0, 25).map(({ record, name, value }) => { const person = employeeById.get(record.employee_id); const tool = toolById.get(record.tool_id); const lapsed = Date.parse(value) < now; return <div className={s.acctRow} role="row" key={`${record.id}-${name}`}>
          <div className={s.acctCell} role="cell" data-label="Person"><strong>{person?.name || 'Unknown employee'}</strong><small className={s.cmpMuted}>{person?.employeeNumber}</small></div>
          <div className={s.acctCell} role="cell" data-label="Equipment">{tool ? `${tool.id} · ${tool.name}` : record.category || 'Category approval'}</div>
          <div className={s.acctCell} role="cell" data-label="Expires"><span className={s.cmpChip} data-tone={lapsed ? 'due' : 'warn'}>{lapsed ? 'Lapsed ' : ''}{shortDate(value)}</span></div>
          <div className={s.acctCell} role="cell" data-label="Which">{name}</div>
        </div>; })}
      </div>
    </div>}
    <div className={s.cmpBlock}>
      <h3>Cover by equipment</h3>
      <div className={s.cmpToolbar}>
        <Filter name="Show equipment cover" value={show} onChange={value => setShow(value as 'none' | 'all')} options={[{ value: 'none', label: `Nobody eligible (${uncovered.length})` }, { value: 'all', label: `All equipment (${tools.length})` }]} />
        <SearchBox value={query} onChange={setQuery} placeholder="Find equipment" />
      </div>
      {uncovered.length === 0 && show === 'none'
        ? <p className={s.acctNote}><Icon name="check" size={16} /><span>Every piece of equipment has at least one eligible person.</span></p>
        : <div className={s.acctTable} role="table" aria-label="Eligible people by equipment" style={cols('minmax(240px,1.6fr) minmax(180px,1fr)')}>
          <div className={s.acctHead} role="row"><span role="columnheader">Equipment</span><span role="columnheader">Eligible people</span></div>
          {rows.map(tool => { const count = (tool.eligibleEmployees || []).length; return <div className={s.acctRow} role="row" key={tool.id}>
            <div className={s.acctPerson} role="cell"><span className={s.acctAvatar} aria-hidden="true"><Icon name="box" size={19} /></span><span><strong>{tool.name}</strong><small>{tool.id}</small></span></div>
            <div className={s.acctCell} role="cell" data-label="Eligible people"><span className={s.cmpChip} data-tone={count ? 'ok' : 'due'}>{count ? `${count} ${count === 1 ? 'person' : 'people'}` : 'Nobody eligible, cannot be issued'}</span></div>
          </div>; })}
          {rows.length === 0 && <p className={s.eligEmpty}>No equipment matches.</p>}
        </div>}
    </div>
  </div>;
}
