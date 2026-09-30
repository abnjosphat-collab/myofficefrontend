'use client';

import { useMemo, useState } from 'react';
import type { CompetencyRecord } from './complianceTypes';
import { ToolsIcon as Icon } from './ToolsIcon';
import { ToolsDialog } from './ToolsUI';
import type { Employee, Tool } from './prototype';
import { competencyForEmployeeTool, groupEmployeesByDepartment, isCurrentCompetency } from './toolEligibility';
import s from './tools.module.css';

type SaveCompetency = (value: {
  employee_id: string;
  tool_id: string;
  trained: boolean;
  qualified: boolean;
  authorized: boolean;
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

export function ToolsPeople({ employees, tools, competencies, search, canManage, onAdd, onIssue, onSaveCompetency }: {
  employees: Employee[];
  tools: Tool[];
  competencies: CompetencyRecord[];
  search: string;
  canManage: boolean;
  onAdd: () => void;
  onIssue: (employee:Employee) => void;
  onSaveCompetency: SaveCompetency;
}) {
  const [selected,setSelected]=useState<Employee|null>(null);
  const [toolSearch,setToolSearch]=useState('');
  const query = search.trim().toLowerCase();
  const visible = employees.filter(employee => `${employee.name} ${employee.employeeNumber} ${employee.department} ${employee.jobTitle || ''} ${employee.supervisorName || ''}`.toLowerCase().includes(query));
  const groups = groupEmployeesByDepartment(visible);
  const held=selected?tools.filter(tool=>tool.holder===selected.name||tool.holder?.startsWith(`${selected.name} ·`)):[];
  const employeeTools=useMemo(()=>selected?tools
    .filter(tool=>!tool.archived&&tool.backendId&&(!tool.department||tool.department===selected.department))
    .filter(tool=>`${tool.id} ${tool.name} ${tool.category}`.toLowerCase().includes(toolSearch.trim().toLowerCase())):[],[selected,toolSearch,tools]);
  const eligibleTools=selected?tools.filter(tool=>isCurrentCompetency(competencyForEmployeeTool(selected,tool,competencies))):[];

  if (!employees.length) return <div className={s.empty}><Icon name="user" size={32}/><h2>Build your employee register</h2><p>Add the people who may receive tools and equipment. This register is separate from MyOffice.</p><button className={s.primary} onClick={onAdd}><Icon name="plus" size={16}/>Add the first employee</button></div>;
  return <>
    <div className={s.peopleDepartmentGroups}>
      {groups.map(group=><section key={group.department} className={s.peopleDepartmentSection} aria-labelledby={`people-${group.department.replaceAll(' ','-')}`}>
        <header className={s.peopleDepartmentHeading}><div><span className={s.departmentMark}><Icon name="department" size={17}/></span><div><h2 id={`people-${group.department.replaceAll(' ','-')}`}>{group.department}</h2><p>{group.employees.length} {group.employees.length===1?'employee':'employees'}</p></div></div></header>
        <div className={s.peopleRegister}>{group.employees.map(employee=><button type="button" key={employee.id} className={s.personCard} onClick={()=>{setSelected(employee);setToolSearch('');}} aria-label={`View ${employee.name}`}><span className={s.personAvatar}><Icon name="user" size={20}/></span><div><strong>{employee.name}</strong><small>{employee.employeeNumber}</small>{employee.jobTitle&&<p>{employee.jobTitle}</p>}{employee.supervisorName&&<p>Supervisor: {employee.supervisorName}</p>}</div><span className={s.personState}>{employee.active?'Active':'Inactive'}</span><Icon name="chevron" size={16}/></button>)}</div>
      </section>)}
      {!visible.length&&<div className={s.empty}><Icon name="search" size={28}/><h2>No matching employees</h2><p>Try a name, employee number, supervisor or department.</p></div>}
    </div>
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
