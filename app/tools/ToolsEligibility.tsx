// app/tools/ToolsEligibility.tsx — who may take which tools, shown two ways from the same register: each person with the
// equipment they are eligible for, and each tool with the people eligible for it. Both open and close like a list
// of headings, show what is currently eligible, and let an administrator or issuer add one more from a searchable list or remove one.
// Adding records the person as trained, qualified and authorised, under the authorising officer named at the top of the page.
'use client';

import { useMemo, useState } from 'react';
import { Button, Checkbox, EmptyState, Icon, SearchField } from '@/components/ui-system';
import { SuggestField } from './ToolsForms';
import { employeeLabel as personLabel, type Employee, type Tool } from './prototype';
import { eligibilityKey, groupEmployeesByDepartment, type Eligibility, type EligibilityBasis } from './toolEligibility';
import type { CompetencyRecord } from './complianceTypes';

export type GrantCompetency = (value: { employee_id: string; tool_id: string; trained: boolean; qualified: boolean; authorized: boolean; authorized_by?: string }) => Promise<void>;

const toolLabel = (tool: Tool) => `${tool.id} · ${tool.name}`;

/** Why this pair is eligible, in the register's own words. */
const basisMark = (basis?: EligibilityBasis) => basis?.kind === 'section' ? `by section (${basis.section})` : basis?.kind === 'open' ? 'anyone may use it' : 'approved individually';


/** A remove button that asks once more before it takes eligibility away. */
function RemoveButton({ label, onConfirm, disabled, labelText = 'Remove', confirmText = 'Yes, remove' }: { label: string; onConfirm: () => void; disabled?: boolean; labelText?: string; confirmText?: string }) {
  const [sure, setSure] = useState(false);
  return sure
    ? <span className="flex items-center gap-2"><Button size="sm" variant="danger-quiet" disabled={disabled} onClick={() => { setSure(false); onConfirm(); }}>{confirmText}</Button><Button size="sm" variant="ghost" onClick={() => setSure(false)}>Keep</Button></span>
    : <Button size="sm" variant="ghost" aria-label={label} disabled={disabled} onClick={() => setSure(true)}>{labelText}</Button>;
}

function Accordion({ open, onToggle, icon, title, subtitle, count, noun, children, pick }: { open: boolean; onToggle: () => void; icon: 'user' | 'box'; title: string; subtitle: string; count: number | null; noun: string; children: React.ReactNode; pick?: React.ReactNode }) {
  return (
    <article className="rounded-card border border-line-subtle bg-surface-raised">
      <div className="flex items-center">
        {pick}
        <button type="button" aria-expanded={open} onClick={onToggle} className="focus-ring flex min-w-0 flex-1 items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-subtle">
          <span className="text-ink-muted"><Icon name={icon === 'user' ? 'user' : 'equipment'} size="md" /></span>
          <span className="min-w-0 flex-1"><strong className="block truncate font-sans text-body-sm font-medium text-ink">{title}</strong><small className="block truncate font-sans text-caption text-ink-muted">{subtitle}</small></span>
          <span className={`shrink-0 font-sans text-caption ${count === 0 || count === null ? 'text-ink-muted' : 'font-medium text-ink'}`}>{count === null ? 'Approvals unknown' : `${count} ${noun}`}</span>
          <Icon name={open ? 'chevron-up' : 'chevron-down'} size="sm" />
        </button>
      </div>
      {open && <div className="flex flex-col gap-3 border-t border-line-subtle px-4 py-3">{children}</div>}
    </article>
  );
}

function ListFilter({ value, onChange, label }: { value: string; onChange: (value: string) => void; label: string }) {
  return <SearchField label={label} placeholder={label} value={value} onValueChange={onChange} />;
}

/** Ticking people to act on together: `blocked` says why someone cannot be ticked (or nothing if they can). */
export type PersonSelection = { picked: string[]; onToggle: (employee: Employee, on: boolean) => void; blocked: (employee: Employee) => string | undefined };

export function EligibilityByPerson({ employees, tools, eligibility, competencies, ready, canManage, authoriser, onGrant, onOpenApprovals, onIssue, onSetActive, selection, allowDeactivate = true }: {
  employees: Employee[]; tools: Tool[]; eligibility: Eligibility; competencies: CompetencyRecord[]; ready: boolean; canManage: boolean; authoriser: string;
  onGrant: GrantCompetency; onOpenApprovals: (employee: Employee) => void; onIssue: (employee: Employee) => void; onSetActive: (employee: Employee, active: boolean) => Promise<void>; selection?: PersonSelection; allowDeactivate?: boolean;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const groups = useMemo(() => groupEmployeesByDepartment(employees), [employees]);
  return <div className="flex flex-col gap-5">
    {groups.map(group => <section key={group.department} className="flex flex-col gap-2" aria-label={group.department}>
      <header className="flex items-baseline justify-between gap-2"><h2 className="font-sans text-body-sm font-semibold text-ink">{group.department}</h2><span className="font-sans text-caption text-ink-muted">{group.employees.length} {group.employees.length === 1 ? 'person' : 'people'}</span></header>
      {group.employees.map(employee => {
        const eligible = (employee.backendId && eligibility.forEmployee.get(employee.backendId)) || [];
        const reason = selection?.blocked(employee);
        const pick = selection && <span className="pl-4"><Checkbox aria-label={`Select ${employee.name}`} title={reason} disabled={!!reason} checked={selection.picked.includes(employee.id)} onChange={event => selection.onToggle(employee, event.target.checked)} /></span>;
        return <Accordion key={employee.id} pick={pick} open={openId === employee.id} onToggle={() => setOpenId(id => (id === employee.id ? null : employee.id))} icon="user" title={employee.name} subtitle={`${employee.jobTitle || 'Job title not recorded'} · ${employee.employeeNumber ?? 'Not recorded'}${employee.active ? '' : ' · inactive'}`} count={ready ? eligible.length : null} noun={eligible.length === 1 ? 'tool' : 'tools'}>
          <PersonBody ready={ready} allowDeactivate={allowDeactivate} onSetActive={onSetActive} employee={employee} tools={tools} eligible={eligible} eligibility={eligibility} competencies={competencies} canManage={canManage} authoriser={authoriser} onGrant={onGrant} onOpenApprovals={onOpenApprovals} onIssue={onIssue} />
        </Accordion>;
      })}
    </section>)}
  </div>;
}

function PersonBody({ ready, allowDeactivate, onSetActive, employee, tools, eligible, eligibility, competencies, canManage, authoriser, onGrant, onOpenApprovals, onIssue }: {
  ready: boolean; allowDeactivate: boolean; onSetActive: (employee: Employee, active: boolean) => Promise<void>; employee: Employee; tools: Tool[]; eligible: Tool[]; eligibility: Eligibility; competencies: CompetencyRecord[]; canManage: boolean; authoriser: string;
  onGrant: GrantCompetency; onOpenApprovals: (employee: Employee) => void; onIssue: (employee: Employee) => void;
}) {
  const [filter, setFilter] = useState('');
  const [adding, setAdding] = useState('');
  const [busy, setBusy] = useState(false);
  const eligibleIds = new Set(eligible.map(tool => tool.id));
  const addable = tools.filter(tool => !tool.archived && tool.backendId && !eligibleIds.has(tool.id) && (!tool.department || tool.department === employee.department));
  const shown = eligible.filter(tool => `${tool.id} ${tool.name} ${tool.category}`.toLowerCase().includes(filter.trim().toLowerCase()));
  const authorisedBy = (tool: Tool) => competencies.find(record => record.employee_id === employee.backendId && record.tool_id === tool.backendId && record.authorized)?.authorized_by;
  const basisFor = (tool: Tool) => tool.backendId && employee.backendId ? eligibility.basis.get(eligibilityKey(tool.backendId, employee.backendId)) : undefined;
  const change = async (tool: Tool, on: boolean) => {
    if (!employee.backendId || !tool.backendId) return;
    setBusy(true);
    try { await onGrant({ employee_id: employee.backendId, tool_id: tool.backendId, trained: on, qualified: on, authorized: on, ...(on && authoriser ? { authorized_by: authoriser } : {}) }); } finally { setBusy(false); }
  };
  if (!ready) return <p className="font-sans text-body-sm text-ink-muted">The approvals are not loaded, so the eligibility of this person cannot be shown yet.</p>;
  return <>
    {eligible.length === 0 ? <p className="font-sans text-body-sm text-ink-muted">Not eligible for any tools yet.</p> : <>
      {eligible.length > 8 && <ListFilter value={filter} onChange={setFilter} label="Filter this person's tools" />}
      <ul className="flex flex-col divide-y divide-line-subtle" aria-label={`Tools ${employee.name} can use`}>
        {shown.map(tool => <li key={tool.id} className="flex items-center gap-3 py-2"><Icon name="equipment" size="sm" /><span className="min-w-0 flex-1"><strong className="block truncate font-sans text-body-sm font-medium text-ink">{tool.name}</strong><small className="block truncate font-sans text-caption text-ink-muted">{tool.id} · {tool.category} · {basisMark(basisFor(tool))}{basisFor(tool)?.kind === 'individual' && authorisedBy(tool) ? ` · authorised by ${authorisedBy(tool)}` : ''}</small></span>{canManage && <RemoveButton label={`Remove ${tool.name} from ${employee.name}`} disabled={busy} onConfirm={() => void change(tool, false)} />}</li>)}
        {shown.length === 0 && <li className="font-sans text-body-sm text-ink-muted">Nothing matches.</li>}
      </ul>
    </>}
    {canManage && <SuggestField label="Add a tool" required={false} options={addable.map(toolLabel)} value={adding} onChange={setAdding} onSelect={label => { const tool = addable.find(item => toolLabel(item) === label); setAdding(''); if (tool) void change(tool, true); }} emptyMessage="No more tools to add." hint={authoriser ? `Recorded as trained, qualified and authorised by ${authoriser}.` : 'Recorded as trained, qualified and authorised.'} />}
    <div className="flex flex-wrap justify-end gap-2">
      {canManage&&(employee.active?(allowDeactivate&&<RemoveButton label={`Deactivate ${employee.name}`} labelText="Deactivate" confirmText="Yes, deactivate" onConfirm={()=>void onSetActive(employee,false)}/>):<Button type="button" onClick={()=>void onSetActive(employee,true)}>Reactivate</Button>)}
      <Button type="button" onClick={() => onOpenApprovals(employee)}>Detailed approvals</Button>
      <Button type="button" variant="primary" disabled={!employee.active || eligible.length === 0} title={!employee.active ? 'This employee is inactive.' : eligible.length === 0 ? 'Add a tool first.' : undefined} onClick={() => onIssue(employee)}>Issue tool</Button>
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
  if (!groups.length) return <EmptyState icon="search" title="No matching tools" description="Try a name, register number or category." />;
  return <div className="flex flex-col gap-5">
    {groups.map(group => <section key={group.category} className="flex flex-col gap-2" aria-label={group.category}>
      <header className="flex items-baseline justify-between gap-2"><h2 className="font-sans text-body-sm font-semibold text-ink">{group.category}</h2><span className="font-sans text-caption text-ink-muted">{group.tools.length} {group.tools.length === 1 ? 'item' : 'items'}</span></header>
      {group.tools.map(tool => {
        const people = (tool.backendId && eligibility.forTool.get(tool.backendId)) || [];
        return <Accordion key={tool.id} open={openId === tool.id} onToggle={() => setOpenId(id => (id === tool.id ? null : tool.id))} icon="box" title={tool.name} subtitle={`${tool.id}${tool.department ? ` · ${tool.department}` : ''}`} count={ready ? people.length : null} noun={people.length === 1 ? 'person' : 'people'}>
          <EquipmentBody ready={ready} tool={tool} employees={employees} people={people} eligibility={eligibility} competencies={competencies} canManage={canManage} authoriser={authoriser} onGrant={onGrant} />
        </Accordion>;
      })}
    </section>)}
  </div>;
}

function EquipmentBody({ ready, tool, employees, people, eligibility, competencies, canManage, authoriser, onGrant }: {
  ready: boolean; tool: Tool; employees: Employee[]; people: Employee[]; eligibility: Eligibility; competencies: CompetencyRecord[]; canManage: boolean; authoriser: string; onGrant: GrantCompetency;
}) {
  const [filter, setFilter] = useState('');
  const [adding, setAdding] = useState('');
  const [busy, setBusy] = useState(false);
  const eligibleIds = new Set(people.map(person => person.id));
  const addable = employees.filter(employee => employee.active && employee.backendId && !eligibleIds.has(employee.id) && (!tool.department || employee.department === tool.department));
  const shown = people.filter(person => `${person.name} ${person.employeeNumber ?? ''} ${person.jobTitle || ''}`.toLowerCase().includes(filter.trim().toLowerCase()));
  const authorisedBy = (person: Employee) => competencies.find(record => record.employee_id === person.backendId && record.tool_id === tool.backendId && record.authorized)?.authorized_by;
  const basisFor = (person: Employee) => tool.backendId && person.backendId ? eligibility.basis.get(eligibilityKey(tool.backendId, person.backendId)) : undefined;
  const change = async (person: Employee, on: boolean) => {
    if (!person.backendId || !tool.backendId) return;
    setBusy(true);
    try { await onGrant({ employee_id: person.backendId, tool_id: tool.backendId, trained: on, qualified: on, authorized: on, ...(on && authoriser ? { authorized_by: authoriser } : {}) }); } finally { setBusy(false); }
  };
  if (!ready) return <p className="font-sans text-body-sm text-ink-muted">The approvals are not loaded, so who can use this tool cannot be shown yet.</p>;
  return <>
    {tool.competencyRequired === false && people.length > 0 && <p className="font-sans text-body-sm text-ink-muted">Anyone may use this tool — no approval needed.</p>}
    {people.length === 0 ? <p className="font-sans text-body-sm text-ink-muted">Nobody can use this tool yet, so it cannot be issued.</p> : <>
      {people.length > 8 && <ListFilter value={filter} onChange={setFilter} label="Filter the people for this tool" />}
      <ul className="flex flex-col divide-y divide-line-subtle" aria-label={`People eligible for ${tool.name}`}>
        {shown.map(person => <li key={person.id} className="flex items-center gap-3 py-2"><Icon name="user" size="sm" /><span className="min-w-0 flex-1"><strong className="block truncate font-sans text-body-sm font-medium text-ink">{person.name}</strong><small className="block truncate font-sans text-caption text-ink-muted">{person.jobTitle || 'Job title not recorded'} · {person.employeeNumber ?? 'Not recorded'}{tool.competencyRequired === false ? '' : ` · ${basisMark(basisFor(person))}`}{basisFor(person)?.kind === 'individual' && authorisedBy(person) ? ` · authorised by ${authorisedBy(person)}` : ''}</small></span>{canManage && <RemoveButton label={`Remove ${person.name} from ${tool.name}`} disabled={busy} onConfirm={() => void change(person, false)} />}</li>)}
        {shown.length === 0 && <li className="font-sans text-body-sm text-ink-muted">Nothing matches.</li>}
      </ul>
    </>}
    {canManage && <SuggestField label="Add a person" required={false} options={addable.map(personLabel)} value={adding} onChange={setAdding} onSelect={label => { const person = addable.find(item => personLabel(item) === label); setAdding(''); if (person) void change(person, true); }} emptyMessage="Nobody else to add." hint={authoriser ? `Recorded as trained, qualified and authorised by ${authoriser}.` : 'Recorded as trained, qualified and authorised.'} />}
  </>;
}

type EligiblePerson = { id: string; employeeNumber: string | null; name: string; department?: string; jobTitle?: string; viaSection?: string | null };
const eligibleMark = (person: EligiblePerson, open?: boolean) => open ? undefined : person.viaSection ? `by section (${person.viaSection})` : 'approved individually';

/** Everyone who may be issued this equipment, as a readable list in the tool's details. With `onIssue`, each row can start the issue straight away. */
export function EligibleEmployeesList({ people, onIssue, onOpenEmployees, open }: { people: EligiblePerson[] | undefined; onIssue?: (person: EligiblePerson) => void; onOpenEmployees?: () => void; open?: boolean }) {
  const [filter, setFilter] = useState('');
  if (people === undefined) return null;
  const sorted = [...people].sort((a, b) => a.name.localeCompare(b.name));
  const shown = sorted.filter(person => `${person.name} ${person.employeeNumber ?? ''} ${person.jobTitle || ''}`.toLowerCase().includes(filter.trim().toLowerCase()));
  return (
    <section aria-label="Eligible employees" className="flex flex-col gap-2 border-t border-line-subtle pt-5">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="font-sans text-caption font-medium text-ink-muted">Eligible employees</h3>
        <span className="font-sans text-caption text-ink-muted">{sorted.length} {sorted.length === 1 ? 'person' : 'people'}</span>
      </div>
      {sorted.length === 0
        ? <p className="font-sans text-body-sm text-ink-muted">Nobody can use this tool yet, so it cannot be issued.{onOpenEmployees ? <> <Button size="sm" variant="secondary" onClick={onOpenEmployees}>Set who can use it</Button></> : ' Add people under Employees.'}</p>
        : (
          <>
            {sorted.length > 8 && <ListFilter value={filter} onChange={setFilter} label="Filter eligible employees" />}
            {open && <p className="font-sans text-body-sm text-ink-muted">Anyone may use this tool — no approval needed.</p>}
            <ul className="flex flex-col divide-y divide-line-subtle" aria-label="Eligible employees list">
              {shown.map(person => (
                <li key={person.id} className="flex items-center gap-3 py-2">
                  <span aria-hidden="true" className="text-ink-muted"><Icon name="user" size="sm" /></span>
                  <span className="min-w-0 flex-1"><strong className="block truncate font-sans text-body-sm font-medium text-ink">{person.name}</strong><small className="block truncate font-sans text-caption text-ink-muted">{[person.jobTitle, person.employeeNumber, eligibleMark(person, open)].filter(Boolean).join(' · ')}</small></span>
                  {onIssue && <Button size="sm" aria-label={`Issue this tool to ${person.name}`} onClick={() => onIssue(person)}>Issue</Button>}
                </li>
              ))}
              {shown.length === 0 && <li className="py-2 font-sans text-body-sm text-ink-muted">Nobody matches “{filter.trim()}”.</li>}
            </ul>
          </>
        )}
    </section>
  );
}
