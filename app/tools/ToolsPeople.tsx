'use client';

import { ToolsIcon as Icon } from './ToolsIcon';
import type { Employee } from './prototype';
import s from './tools.module.css';

export function ToolsPeople({ employees, search, onAdd }: { employees: Employee[]; search: string; onAdd: () => void }) {
  const query = search.trim().toLowerCase();
  const visible = employees.filter(employee => `${employee.name} ${employee.employeeNumber} ${employee.department} ${employee.jobTitle || ''}`.toLowerCase().includes(query));
  if (!employees.length) return <div className={s.empty}><Icon name="user" size={32}/><h2>Build your employee register</h2><p>Add the people who may receive tools and equipment. This register is separate from MyOffice.</p><button className={s.primary} onClick={onAdd}><Icon name="plus" size={16}/>Add the first employee</button></div>;
  return <div className={s.peopleRegister}>{visible.map(employee=><article key={employee.id} className={s.personCard}><span className={s.personAvatar}>{employee.name.split(/\s+/).slice(0,2).map(part=>part[0]).join('').toUpperCase()}</span><div><strong>{employee.name}</strong><small>{employee.employeeNumber} · {employee.department}</small>{employee.jobTitle&&<p>{employee.jobTitle}</p>}</div><span className={s.personState}>{employee.active?'Active':'Inactive'}</span></article>)}{!visible.length&&<div className={s.empty}><Icon name="search" size={28}/><h2>No matching employees</h2><p>Try a name, employee number or department.</p></div>}</div>;
}
