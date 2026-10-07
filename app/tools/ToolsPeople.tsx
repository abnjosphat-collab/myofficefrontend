'use client';

import { useMemo, useState } from 'react';
import type { CompetencyRecord } from './complianceTypes';
import { ToolsIcon as Icon } from './ToolsIcon';
import { ToolsDialog } from './ToolsUI';
import { EligibilityByEquipment, EligibilityByPerson } from './ToolsEligibility';
import type { Employee, Tool } from './prototype';
import { buildEligibility, competencyForEmployeeTool, isCurrentCompetency, latestAuthoriser } from './toolEligibility';
import s from './tools.module.css';

type SaveCompetency = (value: {
  employee_id: string;
  tool_id: string;
  trained: boolean;
  qualified: boolean;
  authorized: boolean;
  authorized_by?: string;
}) => Promise<void>;

function EmployeeToolEligibilityRow({ employee, tool, record, canManage, onSave }: {
  employee: Employee;
  tool: Tool;
  record?: CompetencyRecord;
  canManage: boolean;
  onSave: SaveCompetency;
}) {
  const [trained, setTrained] = useState(record?.trained || false);
  const [qualified, setQualified] = useState(record?.qualified || false);
  const [authorized, setAuthorized] = useState(record?.authorized || false);
  const [saving, setSaving] = useState(false);
  const eligible = isCurrentCompetency(record);
  const changed = trained !== !!record?.trained || qualified !== !!record?.qualified || authorized !== !!record?.authorized;
  const inherited = !!record?.category && !record.tool_id;

  async function save() {
    if (!employee.backendId || !tool.backendId) return;
    setSaving(true);
    try {
      await onSave({ employee_id: employee.backendId, tool_id: tool.backendId, trained, qualified, authorized });
    } finally {
      setSaving(false);
    }
  }

  return <article className={s.eligibilityRow} data-eligible={eligible}>
    <div className={s.eligibilityTool}>
      <span className={s.eligibilityIcon}><Icon name="box" size={17}/></span>
      <span><strong>{tool.id} · {tool.name}</strong><small>{tool.category}{inherited ? ' · inherited category approval' : ''}</small></span>
    </div>
    <div className={s.eligibilityChecks} aria-label={`${tool.name} competency requirements`}>
      <label data-selected={trained}><input aria-label="Trained" type="checkbox" checked={trained} disabled={!canManage} onChange={event=>setTrained(event.target.checked)}/><span>Trained</span></label>
      <label data-selected={qualified}><input aria-label="Qualified" type="checkbox" checked={qualified} disabled={!canManage} onChange={event=>setQualified(event.target.checked)}/><span>Qualified</span></label>
      <label data-selected={authorized}><input aria-label="Authorized" type="checkbox" checked={authorized} disabled={!canManage} onChange={event=>setAuthorized(event.target.checked)}/><span>Authorized</span></label>
    </div>
    <div className={s.eligibilityAction}>
      <span data-eligible={eligible}>{eligible ? 'Eligible to receive' : 'Not eligible'}</span>
      {canManage&&<button type="button" className={s.secondary} disabled={!changed||saving} onClick={()=>void save()}>{saving?'Saving…':'Save'}</button>}
    </div>
  </article>;
}

export function ToolsPeople({ employees, tools, competencies, approvals, search, canManage, onAdd, onIssue, onSaveCompetency, onSetActive }: {
  employees: Employee[];
  tools: Tool[];
  competencies: CompetencyRecord[];
  /** Whether the approvals have loaded: until they have, nobody's eligibility is known, which is not the same as having none. */
  approvals: { state: 'ready' | 'loading' | 'failed'; message?: string; onRetry: () => void };
  search: string;
  canManage: boolean;
  onAdd: () => void;
  onIssue: (employee:Employee) => void;
  onSaveCompetency: SaveCompetency;
  /** Deactivate or reactivate a person: nothing is deleted, they simply stop being offered. */
  onSetActive: (employee: Employee, active: boolean) => Promise<void>;
}) {
  const [selected,setSelected]=useState<Employee|null>(null);
  const [toolSearch,setToolSearch]=useState('');
  const [view,setView]=useState<'person'|'equipment'>('person');
  const [showInactive,setShowInactive]=useState(false);
  const [authoriserEdit,setAuthoriserEdit]=useState<string|null>(()=>{try{return typeof window==='undefined'?null:window.localStorage.getItem('tools-authoriser');}catch{return null;}});
  const authoriser=authoriserEdit??latestAuthoriser(competencies);
  const setAuthoriser=(value:string)=>{setAuthoriserEdit(value);try{window.localStorage.setItem('tools-authoriser',value);}catch{/* storage unavailable */}};
  const eligibility=useMemo(()=>buildEligibility(employees,tools,competencies),[employees,tools,competencies]);
  const query = search.trim().toLowerCase();
  const inactiveCount=employees.filter(employee=>!employee.active).length;
  const visible = employees.filter(employee => (showInactive||employee.active) && `${employee.name} ${employee.employeeNumber} ${employee.department} ${employee.jobTitle || ''} ${employee.supervisorName || ''}`.toLowerCase().includes(query));
  const held=selected?tools.filter(tool=>tool.holder===selected.name||tool.holder?.startsWith(`${selected.name} ·`)):[];
  const employeeTools=useMemo(()=>selected?tools
    .filter(tool=>!tool.archived&&tool.backendId&&(!tool.department||tool.department===selected.department))
    .filter(tool=>`${tool.id} ${tool.name} ${tool.category}`.toLowerCase().includes(toolSearch.trim().toLowerCase())):[],[selected,toolSearch,tools]);
  const eligibleTools=selected?tools.filter(tool=>isCurrentCompetency(competencyForEmployeeTool(selected,tool,competencies))):[];

  if (!employees.length) return <div className={s.empty}><Icon name="user" size={32}/><h2>Build your employee register</h2><p>Add the people who may receive tools and equipment. This register is separate from MyOffice.</p><button className={s.primary} onClick={onAdd}><Icon name="plus" size={16}/>Add the first employee</button></div>;
  return <>
    <div className={s.eligToolbar}>
      <div className={s.eligSwitch} role="group" aria-label="Show eligibility">
        <button type="button" aria-pressed={view==='person'} onClick={()=>setView('person')}><Icon name="user" size={15}/>By person</button>
        <button type="button" aria-pressed={view==='equipment'} onClick={()=>setView('equipment')}><Icon name="box" size={15}/>By equipment</button>
      </div>
      {inactiveCount>0&&<button type="button" className={s.textButton} aria-pressed={showInactive} onClick={()=>setShowInactive(value=>!value)}>{showInactive?'Hide inactive people':`Show ${inactiveCount} inactive ${inactiveCount===1?'person':'people'}`}</button>}
      {canManage&&<label className={s.eligAuthoriser}><span>Authorised by</span><input aria-label="Authorised by" value={authoriser} onChange={event=>setAuthoriser(event.target.value)} placeholder="Name of the authorising officer"/></label>}
    </div>
    {approvals.state!=='ready'&&<div className={`${s.formContext} ${s.formContextWarning}`} role="status"><Icon name="alert"/><span><strong>{approvals.state==='loading'?'Loading approvals…':'The approvals could not be loaded'}</strong><small>{approvals.state==='loading'?'Who is eligible for what will appear in a moment.':`${approvals.message||'The server did not answer.'} Eligibility is not shown until they load, so nobody is listed as having none.`}</small></span>{approvals.state==='failed'&&<button type="button" className={s.secondary} onClick={approvals.onRetry}>Try again</button>}</div>}
    {view==='person'
      ? (visible.length
        ? <EligibilityByPerson employees={visible} tools={tools} eligibility={eligibility} competencies={competencies} ready={approvals.state==='ready'} canManage={canManage&&approvals.state==='ready'} authoriser={authoriser.trim()} onGrant={onSaveCompetency} onOpenApprovals={employee=>{setSelected(employee);setToolSearch('');}} onIssue={onIssue} onSetActive={onSetActive}/>
        : <div className={s.empty}><Icon name="search" size={28}/><h2>No matching employees</h2><p>Try a name, employee number, supervisor or department.</p></div>)
      : <EligibilityByEquipment employees={employees} tools={tools} eligibility={eligibility} competencies={competencies} ready={approvals.state==='ready'} search={search} canManage={canManage&&approvals.state==='ready'} authoriser={authoriser.trim()} onGrant={onSaveCompetency}/>}
    <ToolsDialog open={!!selected} onClose={()=>setSelected(null)} title={selected?.name||'Employee details'} description={selected?`${selected.employeeNumber} · ${selected.department}`:''} wide>
      {selected&&<div className={s.employeeDetail}>
        <div className={s.employeeIdentity}><span className={s.personAvatar}><Icon name="user" size={22}/></span><div><strong>{selected.jobTitle||'Job title not recorded'}</strong><p>{selected.active?'Active employee':'Inactive employee'} · {selected.department}</p>{selected.supervisorName&&<p>Supervisor: {selected.supervisorName}</p>}</div><span className={s.eligibilitySummary}><strong>{eligibleTools.length}</strong><small>approved {eligibleTools.length===1?'item':'items'}</small></span></div>
        <section><div className={s.fieldHeading}><h3>Currently assigned</h3><span>{held.length} {held.length===1?'item':'items'}</span></div>{held.length?<div className={s.employeeTools}>{held.map(tool=><div key={tool.id}><Icon name="box" size={16}/><span><strong>{tool.name}</strong><small>{tool.id} · {tool.location}</small></span></div>)}</div>:<p className={s.formHint}>No tools or equipment are currently assigned to this person.</p>}</section>
        <section className={s.eligibilitySection}>
          <div className={s.fieldHeading}><div><h3>Tool eligibility</h3><p>All three requirements must be current before this employee appears in the Issue tool list.</p></div><span>{eligibleTools.length} eligible</span></div>
          <label className={s.eligibilitySearch}><Icon name="search" size={16}/><input aria-label="Find equipment" type="search" value={toolSearch} onChange={event=>setToolSearch(event.target.value)} placeholder="Find equipment by name, ID or category…"/></label>
          <div className={s.eligibilityList}>{employeeTools.map(tool=>{const record=competencyForEmployeeTool(selected,tool,competencies);return <EmployeeToolEligibilityRow key={`${selected.id}-${tool.id}-${record?.updated_at||'new'}`} employee={selected} tool={tool} record={record} canManage={canManage} onSave={onSaveCompetency}/>;})}{!employeeTools.length&&<p className={s.formHint}>No equipment in {selected.department} matches this search.</p>}</div>
          {!canManage&&<p className={s.formHint}>Only an administrator or issuer can update competency approvals.</p>}
        </section>
        <div className={s.formFooter}><button className={s.secondary} onClick={()=>setSelected(null)}>Close</button><button className={s.primary} disabled={!selected.active||!eligibleTools.length} title={!selected.active?'This employee is inactive.':!eligibleTools.length?'Approve at least one equipment item first.':undefined} onClick={()=>{const employee=selected;setSelected(null);onIssue(employee);}}><Icon name="out" size={16}/>Issue a tool</button></div>
      </div>}
    </ToolsDialog>
  </>;
}
