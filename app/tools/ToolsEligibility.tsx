// app/tools/ToolsEligibility.tsx — who may take which equipment, shown two ways from the same register: each person with the
// equipment they are eligible for, and each piece of equipment with the people eligible for it. Both open and close like a list
// of headings, show what is currently eligible, and let an administrator or issuer add one more from a searchable list or remove one.
// Adding records the person as trained, qualified and authorised, under the authorising officer named at the top of the page.
'use client';

import { useMemo, useState } from 'react';
import { ToolsIcon as Icon } from './ToolsIcon';
import { SuggestField } from './ToolsForms';
import type { Employee, Tool } from './prototype';
import { groupEmployeesByDepartment, type Eligibility } from './toolEligibility';
import type { CompetencyRecord } from './complianceTypes';
import s from './tools.module.css';

export type GrantCompetency = (value: { employee_id: string; tool_id: string; trained: boolean; qualified: boolean; authorized: boolean; authorized_by?: string }) => Promise<void>;

const toolLabel = (tool: Tool) => `${tool.id} · ${tool.name}`;
const personLabel = (employee: Employee) => `${employee.name} · ${employee.employeeNumber}`;

/** A remove button that asks once more before it takes eligibility away. */
function RemoveButton({ label, onConfirm, disabled }: { label: string; onConfirm: () => void; disabled?: boolean }) {
  const [sure, setSure] = useState(false);
  return sure
    ? <span className={s.eligConfirm}><button type="button" className={s.eligDanger} disabled={disabled} onClick={() => { setSure(false); onConfirm(); }}>Yes, remove</button><button type="button" className={s.eligLink} onClick={() => setSure(false)}>Keep</button></span>
    : <button type="button" className={s.eligLink} aria-label={label} disabled={disabled} onClick={() => setSure(true)}>Remove</button>;
}

function Accordion({ open, onToggle, icon, title, subtitle, count, noun, children }: { open: boolean; onToggle: () => void; icon: 'user' | 'box'; title: string; subtitle: string; count: number | null; noun: string; children: React.ReactNode }) {
  return <article className={s.eligAccordion} data-open={open}>
    <button type="button" className={s.eligSummary} aria-expanded={open} onClick={onToggle}>
      <span className={s.eligAvatar}><Icon name={icon} size={19} /></span>
      <span className={s.eligSummaryText}><strong>{title}</strong><small>{subtitle}</small></span>
      <span className={s.eligCount} data-empty={count === 0 || count === null}>{count === null ? 'Approvals unknown' : `${count} ${noun}`}</span>
      <Icon name="down" size={16} />
    </button>
    {open && <div className={s.eligBody}>{children}</div>}
  </article>;
}

function ListFilter({ value, onChange, label }: { value: string; onChange: (value: string) => void; label: string }) {
  return <label className={s.eligFilter}><Icon name="search" size={15} /><input type="search" aria-label={label} value={value} onChange={event => onChange(event.target.value)} placeholder={label} /></label>;
}

export function EligibilityByPerson({ employees, tools, eligibility, competencies, ready, canManage, authoriser, onGrant, onOpenApprovals, onIssue }: {
  employees: Employee[]; tools: Tool[]; eligibility: Eligibility; competencies: CompetencyRecord[]; ready: boolean; canManage: boolean; authoriser: string;
  onGrant: GrantCompetency; onOpenApprovals: (employee: Employee) => void; onIssue: (employee: Employee) => void;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const groups = useMemo(() => groupEmployeesByDepartment(employees), [employees]);
  return <div className={s.eligGroups}>
    {groups.map(group => <section key={group.department} className={s.eligGroup} aria-label={group.department}>
      <header className={s.eligGroupHeading}><h2>{group.department}</h2><span>{group.employees.length} {group.employees.length === 1 ? 'person' : 'people'}</span></header>
      {group.employees.map(employee => {
        const eligible = (employee.backendId && eligibility.forEmployee.get(employee.backendId)) || [];
        return <Accordion key={employee.id} open={openId === employee.id} onToggle={() => setOpenId(id => (id === employee.id ? null : employee.id))} icon="user" title={employee.name} subtitle={`${employee.jobTitle || 'Job title not recorded'} · ${employee.employeeNumber}${employee.active ? '' : ' · inactive'}`} count={ready ? eligible.length : null} noun="equipment">
          <PersonBody ready={ready} employee={employee} tools={tools} eligible={eligible} competencies={competencies} canManage={canManage} authoriser={authoriser} onGrant={onGrant} onOpenApprovals={onOpenApprovals} onIssue={onIssue} />
        </Accordion>;
      })}
    </section>)}
  </div>;
}

function PersonBody({ ready, employee, tools, eligible, competencies, canManage, authoriser, onGrant, onOpenApprovals, onIssue }: {
  ready: boolean; employee: Employee; tools: Tool[]; eligible: Tool[]; competencies: CompetencyRecord[]; canManage: boolean; authoriser: string;
  onGrant: GrantCompetency; onOpenApprovals: (employee: Employee) => void; onIssue: (employee: Employee) => void;
}) {
  const [filter, setFilter] = useState('');
  const [adding, setAdding] = useState('');
  const [busy, setBusy] = useState(false);
  const eligibleIds = new Set(eligible.map(tool => tool.id));
  const addable = tools.filter(tool => !tool.archived && tool.backendId && !eligibleIds.has(tool.id) && (!tool.department || tool.department === employee.department));
  const shown = eligible.filter(tool => `${tool.id} ${tool.name} ${tool.category}`.toLowerCase().includes(filter.trim().toLowerCase()));
  const authorisedBy = (tool: Tool) => competencies.find(record => record.employee_id === employee.backendId && record.tool_id === tool.backendId && record.authorized)?.authorized_by;
  const change = async (tool: Tool, on: boolean) => {
    if (!employee.backendId || !tool.backendId) return;
    setBusy(true);
    try { await onGrant({ employee_id: employee.backendId, tool_id: tool.backendId, trained: on, qualified: on, authorized: on, ...(on && authoriser ? { authorized_by: authoriser } : {}) }); } finally { setBusy(false); }
  };
  if (!ready) return <p className={s.eligEmpty}>The approvals are not loaded, so the eligibility of this person cannot be shown yet.</p>;
  return <>
    {eligible.length === 0 ? <p className={s.eligEmpty}>Not eligible for any equipment yet.</p> : <>
      {eligible.length > 8 && <ListFilter value={filter} onChange={setFilter} label="Filter this person's equipment" />}
      <ul className={s.eligList} aria-label={`Equipment ${employee.name} is eligible for`}>
        {shown.map(tool => <li key={tool.id}><Icon name="box" size={16} /><span><strong>{tool.name}</strong><small>{tool.id} · {tool.category}{authorisedBy(tool) ? ` · authorised by ${authorisedBy(tool)}` : ''}</small></span>{canManage && <RemoveButton label={`Remove ${tool.name} from ${employee.name}`} disabled={busy} onConfirm={() => void change(tool, false)} />}</li>)}
        {shown.length === 0 && <li className={s.eligEmpty}>Nothing matches.</li>}
      </ul>
    </>}
    {canManage && <SuggestField label="Add equipment" required={false} options={addable.map(toolLabel)} value={adding} onChange={setAdding} onSelect={label => { const tool = addable.find(item => toolLabel(item) === label); setAdding(''); if (tool) void change(tool, true); }} emptyMessage="No more equipment to add." hint={authoriser ? `Recorded as trained, qualified and authorised by ${authoriser}.` : 'Recorded as trained, qualified and authorised.'} />}
    <div className={s.eligActions}>
      <button type="button" className={s.secondary} onClick={() => onOpenApprovals(employee)}>Detailed approvals</button>
      <button type="button" className={s.primary} disabled={!employee.active || eligible.length === 0} title={!employee.active ? 'This employee is inactive.' : eligible.length === 0 ? 'Add equipment first.' : undefined} onClick={() => onIssue(employee)}>Issue tool</button>
    </div>
  </>;
}

export function EligibilityByEquipment({ employees, tools, eligibility, competencies, ready, search, canManage, authoriser, onGrant }: {
  employees: Employee[]; tools: Tool[]; eligibility: Eligibility; competencies: CompetencyRecord[]; ready: boolean; search: string; canManage: boolean; authoriser: string; onGrant: GrantCompetency;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const query = search.trim().toLowerCase();
  const groups = useMemo(() => {
    const byCategory = new Map<string, Tool[]>();
    for (const tool of tools) {
      if (tool.archived || !tool.backendId) continue;
      if (query && !`${tool.id} ${tool.name} ${tool.category}`.toLowerCase().includes(query)) continue;
      byCategory.set(tool.category, [...(byCategory.get(tool.category) || []), tool]);
    }
    return [...byCategory.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([category, list]) => ({ category, tools: list.sort((a, b) => a.name.localeCompare(b.name)) }));
  }, [tools, query]);
  if (!groups.length) return <div className={s.empty}><Icon name="search" size={28} /><h2>No matching equipment</h2><p>Try a name, register number or category.</p></div>;
  return <div className={s.eligGroups}>
    {groups.map(group => <section key={group.category} className={s.eligGroup} aria-label={group.category}>
      <header className={s.eligGroupHeading}><h2>{group.category}</h2><span>{group.tools.length} {group.tools.length === 1 ? 'item' : 'items'}</span></header>
      {group.tools.map(tool => {
        const people = (tool.backendId && eligibility.forTool.get(tool.backendId)) || [];
        return <Accordion key={tool.id} open={openId === tool.id} onToggle={() => setOpenId(id => (id === tool.id ? null : tool.id))} icon="box" title={tool.name} subtitle={`${tool.id}${tool.department ? ` · ${tool.department}` : ''}`} count={ready ? people.length : null} noun={people.length === 1 ? 'person' : 'people'}>
          <EquipmentBody ready={ready} tool={tool} employees={employees} people={people} competencies={competencies} canManage={canManage} authoriser={authoriser} onGrant={onGrant} />
        </Accordion>;
      })}
    </section>)}
  </div>;
}

function EquipmentBody({ ready, tool, employees, people, competencies, canManage, authoriser, onGrant }: {
  ready: boolean; tool: Tool; employees: Employee[]; people: Employee[]; competencies: CompetencyRecord[]; canManage: boolean; authoriser: string; onGrant: GrantCompetency;
}) {
  const [filter, setFilter] = useState('');
  const [adding, setAdding] = useState('');
  const [busy, setBusy] = useState(false);
  const eligibleIds = new Set(people.map(person => person.id));
  const addable = employees.filter(employee => employee.active && employee.backendId && !eligibleIds.has(employee.id) && (!tool.department || employee.department === tool.department));
  const shown = people.filter(person => `${person.name} ${person.employeeNumber} ${person.jobTitle || ''}`.toLowerCase().includes(filter.trim().toLowerCase()));
  const authorisedBy = (person: Employee) => competencies.find(record => record.employee_id === person.backendId && record.tool_id === tool.backendId && record.authorized)?.authorized_by;
  const change = async (person: Employee, on: boolean) => {
    if (!person.backendId || !tool.backendId) return;
    setBusy(true);
    try { await onGrant({ employee_id: person.backendId, tool_id: tool.backendId, trained: on, qualified: on, authorized: on, ...(on && authoriser ? { authorized_by: authoriser } : {}) }); } finally { setBusy(false); }
  };
  if (!ready) return <p className={s.eligEmpty}>The approvals are not loaded, so who is eligible for this equipment cannot be shown yet.</p>;
  return <>
    {people.length === 0 ? <p className={s.eligEmpty}>Nobody is eligible for this equipment yet, so it cannot be issued.</p> : <>
      {people.length > 8 && <ListFilter value={filter} onChange={setFilter} label="Filter the people for this equipment" />}
      <ul className={s.eligList} aria-label={`People eligible for ${tool.name}`}>
        {shown.map(person => <li key={person.id}><Icon name="user" size={16} /><span><strong>{person.name}</strong><small>{person.jobTitle || 'Job title not recorded'} · {person.employeeNumber}{authorisedBy(person) ? ` · authorised by ${authorisedBy(person)}` : ''}</small></span>{canManage && <RemoveButton label={`Remove ${person.name} from ${tool.name}`} disabled={busy} onConfirm={() => void change(person, false)} />}</li>)}
        {shown.length === 0 && <li className={s.eligEmpty}>Nothing matches.</li>}
      </ul>
    </>}
    {canManage && <SuggestField label="Add a person" required={false} options={addable.map(personLabel)} value={adding} onChange={setAdding} onSelect={label => { const person = addable.find(item => personLabel(item) === label); setAdding(''); if (person) void change(person, true); }} emptyMessage="Nobody else to add." hint={authoriser ? `Recorded as trained, qualified and authorised by ${authoriser}.` : 'Recorded as trained, qualified and authorised.'} />}
  </>;
}
