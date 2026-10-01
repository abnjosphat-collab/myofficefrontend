'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { AnimatedSelect } from './AnimatedSelect';
import { ToolsIcon as Icon } from './ToolsIcon';
import { AnimatedText } from './ToolsUI';
import { ToolsDateInput } from './ToolsDateInput';
import type { CompetencyRecord, IncidentRecord, InspectionRecord, InspectionType } from './complianceTypes';
import type { Employee, Tool } from './prototype';
import s from './tools.module.css';

const INSPECTION_LABELS:Record<InspectionType,string>={pre_use:'Pre-use check',weekly:'Weekly check',monthly:'Monthly inspection',quarterly:'Quarterly colour inspection',calibration:'Calibration',maintenance:'Maintenance',storage_audit:'Storage audit',repair:'Repair verification'};
export const INCIDENT_LABELS:Record<IncidentRecord['incident_type'],string>={lost:'Lost equipment',damaged:'Damage',stolen:'Suspected theft',missing_components:'Missing components',late_return:'Late return'};

type InspectionInput={inspection_type:InspectionType;outcome:'passed'|'conditional'|'failed';next_due_at?:string;condition?:string;defects?:string;notes?:string;repair_quote?:number;new_equipment_price?:number};
type IncidentInput={incident_type:IncidentRecord['incident_type'];occurred_at:string;employee_id?:string;explanation:string};
type IncidentCloseInput={investigation_outcome:string;negligence_confirmed:boolean;replacement_cost?:number;recovery_months?:number};

export function ToolsCompliance({tools,employees,competencies,inspections,incidents,canManage,onSaveCompetency,onRecordInspection,onReportIncident,onCloseIncident}:{
  tools:Tool[];
  employees:Employee[];
  competencies:CompetencyRecord[];
  inspections:InspectionRecord[];
  incidents:IncidentRecord[];
  canManage:boolean;
  onSaveCompetency:(value:{employee_id:string;tool_id:string;trained:boolean;qualified:boolean;authorized:boolean;training_certificate_ref?:string;training_expires_at?:string;qualification_ref?:string;qualification_expires_at?:string;authorization_expires_at?:string;notes?:string})=>Promise<void>;
  onRecordInspection:(toolId:string,value:InspectionInput)=>Promise<void>;
  onReportIncident:(toolId:string,value:IncidentInput)=>Promise<void>;
  onCloseIncident:(incidentId:string,value:IncidentCloseInput)=>Promise<void>;
}) {
  const activeTools=tools.filter(tool=>!tool.archived&&tool.backendId);
  const activeEmployees=employees.filter(employee=>employee.active&&employee.backendId);
  const openIncidents=incidents.filter(incident=>incident.status!=='closed');
  const [toolId,setToolId]=useState(activeTools[0]?.backendId||'');
  const [employeeId,setEmployeeId]=useState(activeEmployees[0]?.backendId||'');
  const [trained,setTrained]=useState(true);
  const [qualified,setQualified]=useState(true);
  const [authorized,setAuthorized]=useState(true);
  const [trainingRef,setTrainingRef]=useState('');
  const [trainingExpiry,setTrainingExpiry]=useState('');
  const [qualificationRef,setQualificationRef]=useState('');
  const [qualificationExpiry,setQualificationExpiry]=useState('');
  const [authorizationExpiry,setAuthorizationExpiry]=useState('');
  const [competencyNotes,setCompetencyNotes]=useState('');
  const [inspectionToolId,setInspectionToolId]=useState(activeTools[0]?.backendId||'');
  const [inspectionType,setInspectionType]=useState<InspectionType>('monthly');
  const [outcome,setOutcome]=useState<'passed'|'conditional'|'failed'>('passed');
  const [nextDue,setNextDue]=useState('');
  const [defects,setDefects]=useState('');
  const [inspectionNotes,setInspectionNotes]=useState('');
  const [repairQuote,setRepairQuote]=useState('');
  const [newPrice,setNewPrice]=useState('');
  const [incidentToolId,setIncidentToolId]=useState(activeTools[0]?.backendId||'');
  const [incidentType,setIncidentType]=useState<IncidentRecord['incident_type']>('damaged');
  const [occurredAt,setOccurredAt]=useState('');
  const [incidentEmployeeId,setIncidentEmployeeId]=useState('');
  const [explanation,setExplanation]=useState('');
  const [closingIncidentId,setClosingIncidentId]=useState(openIncidents[0]?.id||'');
  const [investigationOutcome,setInvestigationOutcome]=useState('');
  const [negligenceConfirmed,setNegligenceConfirmed]=useState(false);
  const [replacementCost,setReplacementCost]=useState('');
  const [recoveryMonths,setRecoveryMonths]=useState('6');
  const employeeById=useMemo(()=>new Map(employees.map(employee=>[employee.backendId,employee])),[employees]);
  const toolById=useMemo(()=>new Map(activeTools.map(tool=>[tool.backendId,tool])),[activeTools]);
  const dueTools=activeTools.filter(tool=>(tool.inspectionDue||[]).length);
  const eligibleCount=competencies.filter(item=>item.trained&&item.qualified&&item.authorized).length;
  const repairPercentage=repairQuote&&newPrice&&Number(newPrice)>0?Number(repairQuote)/Number(newPrice)*100:undefined;

  async function submitCompetency(event:FormEvent){
    event.preventDefault();
    if(!toolId||!employeeId)return;
    await onSaveCompetency({employee_id:employeeId,tool_id:toolId,trained,qualified,authorized,training_certificate_ref:trainingRef||undefined,training_expires_at:trainingExpiry?new Date(`${trainingExpiry}T23:59:59`).toISOString():undefined,qualification_ref:qualificationRef||undefined,qualification_expires_at:qualificationExpiry?new Date(`${qualificationExpiry}T23:59:59`).toISOString():undefined,authorization_expires_at:authorizationExpiry?new Date(`${authorizationExpiry}T23:59:59`).toISOString():undefined,notes:competencyNotes||undefined});
  }
  async function submitInspection(event:FormEvent){
    event.preventDefault();
    if(!inspectionToolId)return;
    await onRecordInspection(inspectionToolId,{inspection_type:inspectionType,outcome,next_due_at:nextDue?new Date(`${nextDue}T23:59:59`).toISOString():undefined,defects:defects||undefined,notes:inspectionNotes||undefined,repair_quote:inspectionType==='repair'&&repairQuote?Number(repairQuote):undefined,new_equipment_price:inspectionType==='repair'&&newPrice?Number(newPrice):undefined});
    setDefects('');setInspectionNotes('');setRepairQuote('');setNewPrice('');
  }
  async function submitIncident(event:FormEvent){
    event.preventDefault();
    if(!incidentToolId||!occurredAt||!explanation.trim())return;
    await onReportIncident(incidentToolId,{incident_type:incidentType,occurred_at:new Date(occurredAt).toISOString(),employee_id:incidentEmployeeId||undefined,explanation:explanation.trim()});
    setExplanation('');setOccurredAt('');
  }
  async function submitCloseIncident(event:FormEvent){
    event.preventDefault();
    if(!closingIncidentId||!investigationOutcome.trim())return;
    await onCloseIncident(closingIncidentId,{investigation_outcome:investigationOutcome.trim(),negligence_confirmed:negligenceConfirmed,replacement_cost:negligenceConfirmed&&replacementCost?Number(replacementCost):undefined,recovery_months:negligenceConfirmed?Number(recoveryMonths):undefined});
    setInvestigationOutcome('');setNegligenceConfirmed(false);setReplacementCost('');setRecoveryMonths('6');
  }

  return <div className={s.complianceGrid}>
    <section className={`${s.accountAccess} ${s.accountAccessDashboard}`}>
      <div className={s.accountAccessHeader}><div><h2>Inspection and maintenance control</h2><p>Required weekly, monthly, quarterly, calibration and maintenance work stays visible until completed.</p></div><div className={s.accountAccessSummary}><span><strong><AnimatedText value={dueTools.length}>{dueTools.length}</AnimatedText></strong>{dueTools.length===1?'Item due':'Items due'}</span><span><strong><AnimatedText value={inspections.length}>{inspections.length}</AnimatedText></strong>{inspections.length===1?'Record':'Records'}</span><span><strong><AnimatedText value={eligibleCount}>{eligibleCount}</AnimatedText></strong>{eligibleCount===1?'Competency':'Competencies'}</span><span><strong><AnimatedText value={openIncidents.length}>{openIncidents.length}</AnimatedText></strong>{openIncidents.length===1?'Open incident':'Open incidents'}</span></div></div>
      {dueTools.length?<div className={s.complianceCards}>{dueTools.map(tool=><article key={tool.id} className={s.complianceCard} data-severity="due"><div><strong>{tool.id} · {tool.name}</strong><small>{tool.location}</small></div><div className={s.complianceTags}>{tool.inspectionDue?.map(item=><span key={item}>{item.replaceAll('_',' ')}</span>)}</div></article>)}</div>:<div className={s.formContext}><Icon name="check"/><span><strong>No scheduled checks are overdue</strong><small>Current requirements are derived from each equipment record.</small></span></div>}
      <div className={s.complianceCards}>{activeTools.map(tool=>{const quarterly=tool.latestInspections?.quarterly;return <article key={tool.id} className={s.complianceCard}><div><strong>{tool.id}</strong><small>{tool.name}</small></div><div className={s.inspectionColour} data-colour={(quarterly?.colour_code||'none').toLowerCase()}><i/>{quarterly?`${quarterly.colour_code} · ${new Date(quarterly.inspected_at).toLocaleDateString()}`:'Quarterly inspection not recorded'}</div><small>{tool.maintenanceRequirements||'Maintenance requirements not recorded'}</small></article>;})}</div>
    </section>

    {canManage&&<div className={s.complianceForms}>
      <form className={`${s.form} ${s.formSection}`} onSubmit={submitCompetency}>
        <div className={s.fieldHeading}><strong>Training and authorization</strong><span>All three criteria are required before issue</span></div>
        <div className={s.formColumns}><div className={s.field}><label htmlFor="competency-employee">Employee</label><AnimatedSelect id="competency-employee" ariaLabel="Competency employee" value={employeeId} onChange={setEmployeeId} options={activeEmployees.map(item=>({value:item.backendId!,label:`${item.name} · ${item.employeeNumber}`}))}/></div><div className={s.field}><label htmlFor="competency-tool">Equipment</label><AnimatedSelect id="competency-tool" ariaLabel="Competency equipment" value={toolId} onChange={setToolId} options={activeTools.map(item=>({value:item.backendId!,label:`${item.id} · ${item.name}`}))}/></div></div>
        <div className={s.condition}><label data-selected={trained}><input type="checkbox" checked={trained} onChange={event=>setTrained(event.target.checked)}/><span>Trained</span></label><label data-selected={qualified}><input type="checkbox" checked={qualified} onChange={event=>setQualified(event.target.checked)}/><span>Qualified</span></label><label data-selected={authorized}><input type="checkbox" checked={authorized} onChange={event=>setAuthorized(event.target.checked)}/><span>Authorized</span></label></div>
        <div className={s.formColumns}><div className={s.field}><label htmlFor="training-ref">Training certificate</label><input id="training-ref" value={trainingRef} onChange={event=>setTrainingRef(event.target.value)} placeholder="Certificate or trainer reference"/></div><div className={s.field}><label htmlFor="training-expiry">Training expiry <small>Optional</small></label><ToolsDateInput id="training-expiry" value={trainingExpiry} onChange={event=>setTrainingExpiry(event.target.value)}/></div><div className={s.field}><label htmlFor="qualification-ref">Qualification reference</label><input id="qualification-ref" value={qualificationRef} onChange={event=>setQualificationRef(event.target.value)} placeholder="Trade or competency reference"/></div><div className={s.field}><label htmlFor="qualification-expiry">Qualification expiry <small>Optional</small></label><ToolsDateInput id="qualification-expiry" value={qualificationExpiry} onChange={event=>setQualificationExpiry(event.target.value)}/></div><div className={s.field}><label htmlFor="authorization-expiry">Authorization expiry <small>Optional</small></label><ToolsDateInput id="authorization-expiry" value={authorizationExpiry} onChange={event=>setAuthorizationExpiry(event.target.value)}/></div><div className={s.field}><label htmlFor="competency-notes">Notes <small>Optional</small></label><input id="competency-notes" value={competencyNotes} onChange={event=>setCompetencyNotes(event.target.value)}/></div></div>
        <div className={s.formFooter}><button className={s.primary} type="submit" disabled={!employeeId||!toolId}>Save competency</button></div>
      </form>

      <form className={`${s.form} ${s.formSection}`} onSubmit={submitInspection}>
        <div className={s.fieldHeading}><strong>Record inspection or maintenance</strong><span>Failed checks place equipment on hold</span></div>
        <div className={s.formColumns}><div className={s.field}><label htmlFor="inspection-tool">Equipment</label><AnimatedSelect id="inspection-tool" ariaLabel="Inspection equipment" value={inspectionToolId} onChange={setInspectionToolId} options={activeTools.map(item=>({value:item.backendId!,label:`${item.id} · ${item.name}`}))}/></div><div className={s.field}><label htmlFor="inspection-type">Check type</label><AnimatedSelect id="inspection-type" ariaLabel="Inspection type" value={inspectionType} onChange={value=>setInspectionType(value as InspectionType)} options={Object.entries(INSPECTION_LABELS).map(([value,label])=>({value,label}))}/></div><div className={s.field}><label htmlFor="inspection-outcome">Outcome</label><AnimatedSelect id="inspection-outcome" ariaLabel="Inspection outcome" value={outcome} onChange={value=>setOutcome(value as typeof outcome)} options={[{value:'passed',label:'Passed · fit for use'},{value:'conditional',label:'Conditional · follow-up required'},{value:'failed',label:'Failed · quarantine'}]}/></div><div className={s.field}><label htmlFor="inspection-due">Next due <small>Optional</small></label><ToolsDateInput id="inspection-due" value={nextDue} onChange={event=>setNextDue(event.target.value)}/></div><div className={s.field}><label htmlFor="inspection-defects">Defects <small>Required if failed</small></label><input id="inspection-defects" required={outcome==='failed'} value={defects} onChange={event=>setDefects(event.target.value)}/></div><div className={s.field}><label htmlFor="inspection-notes">Work completed or notes</label><input id="inspection-notes" value={inspectionNotes} onChange={event=>setInspectionNotes(event.target.value)}/></div>{inspectionType==='repair'&&<><div className={s.field}><label htmlFor="repair-quote">Repair quotation</label><input id="repair-quote" required type="number" min="0" step="0.01" value={repairQuote} onChange={event=>setRepairQuote(event.target.value)}/></div><div className={s.field}><label htmlFor="new-price">New equipment price</label><input id="new-price" required type="number" min="0.01" step="0.01" value={newPrice} onChange={event=>setNewPrice(event.target.value)}/></div></>}</div>
        {inspectionType==='repair'&&repairPercentage!==undefined&&<div className={s.formContext} data-severity={repairPercentage<=60?'ok':'warning'}><Icon name={repairPercentage<=60?'check':'alert'}/><span><strong>{repairPercentage<=60?'Repair is within the 60% limit':'Replacement review required'}</strong><small>Repair quotation is {repairPercentage.toFixed(1)}% of the new-equipment price.</small></span></div>}
        <div className={s.formFooter}><button className={s.primary} type="submit" disabled={!inspectionToolId}>Record check</button></div>
      </form>

      <form className={`${s.form} ${s.formSection}`} onSubmit={submitIncident}>
        <div className={s.fieldHeading}><strong>Report loss, damage or theft</strong><span>Investigation is due within 24 hours</span></div>
        <div className={s.formColumns}><div className={s.field}><label htmlFor="incident-tool">Equipment</label><AnimatedSelect id="incident-tool" ariaLabel="Incident equipment" value={incidentToolId} onChange={setIncidentToolId} options={activeTools.map(item=>({value:item.backendId!,label:`${item.id} · ${item.name}`}))}/></div><div className={s.field}><label htmlFor="incident-type">Incident type</label><AnimatedSelect id="incident-type" ariaLabel="Incident type" value={incidentType} onChange={value=>setIncidentType(value as IncidentRecord['incident_type'])} options={Object.entries(INCIDENT_LABELS).map(([value,label])=>({value,label}))}/></div><div className={s.field}><label htmlFor="incident-time">Occurred at</label><ToolsDateInput id="incident-time" required type="datetime-local" value={occurredAt} onChange={event=>setOccurredAt(event.target.value)}/></div><div className={s.field}><label htmlFor="incident-employee">Employee involved <small>Optional</small></label><AnimatedSelect id="incident-employee" ariaLabel="Employee involved" value={incidentEmployeeId} onChange={setIncidentEmployeeId} options={[{value:'',label:'Not assigned'},...activeEmployees.map(item=>({value:item.backendId!,label:`${item.name} · ${item.employeeNumber}`}))]}/></div></div><div className={s.field}><label htmlFor="incident-explanation">Immediate report</label><textarea id="incident-explanation" required minLength={5} rows={4} value={explanation} onChange={event=>setExplanation(event.target.value)} placeholder="What happened, where, when, and what immediate action was taken?"/></div>
        <div className={s.formFooter}><button className={s.primary} type="submit" disabled={!incidentToolId||!occurredAt||explanation.trim().length<5}>Report incident</button></div>
      </form>

      <form className={`${s.form} ${s.formSection}`} onSubmit={submitCloseIncident}>
        <div className={s.fieldHeading}><strong>Close investigation</strong><span>Record accountability and recovery terms</span></div>
        <div className={s.field}><label htmlFor="closing-incident">Open incident</label><AnimatedSelect id="closing-incident" ariaLabel="Open incident" value={closingIncidentId} onChange={setClosingIncidentId} options={openIncidents.map(item=>({value:item.id,label:`${toolById.get(item.tool_id)?.id||'Equipment'} · ${INCIDENT_LABELS[item.incident_type]}`}))}/></div><div className={s.field}><label htmlFor="investigation-outcome">Investigation outcome</label><textarea id="investigation-outcome" required minLength={5} rows={4} value={investigationOutcome} onChange={event=>setInvestigationOutcome(event.target.value)}/></div><label className={s.checkRow}><input type="checkbox" checked={negligenceConfirmed} onChange={event=>setNegligenceConfirmed(event.target.checked)}/><span><strong>Negligence confirmed</strong><small>Replacement recovery may be scheduled over no more than six months.</small></span></label>{negligenceConfirmed&&<div className={s.formColumns}><div className={s.field}><label htmlFor="replacement-cost">Replacement cost</label><input id="replacement-cost" required type="number" min="0" step="0.01" value={replacementCost} onChange={event=>setReplacementCost(event.target.value)}/></div><div className={s.field}><label htmlFor="recovery-months">Recovery period</label><input id="recovery-months" required type="number" min="1" max="6" value={recoveryMonths} onChange={event=>setRecoveryMonths(event.target.value)}/></div></div>}
        <div className={s.formFooter}><button className={s.primary} type="submit" disabled={!closingIncidentId||investigationOutcome.trim().length<5||(negligenceConfirmed&&!replacementCost)}>Close investigation</button></div>
      </form>
    </div>}

    <section className={`${s.accountAccess} ${s.accountAccessDashboard}`}><div className={s.accountAccessHeader}><div><h2>Open incident register</h2><p>Loss, damage, theft, missing components and late returns remain visible until investigation is closed.</p></div></div><div className={s.complianceCards}>{openIncidents.map(item=>{const tool=toolById.get(item.tool_id);const employee=employeeById.get(item.employee_id);const overdue=new Date(item.investigation_due_at)<new Date();return <article key={item.id} className={s.complianceCard} data-severity={overdue?'due':undefined}><div><strong>{tool?.id||'Equipment'} · {INCIDENT_LABELS[item.incident_type]}</strong><small>{tool?.name||item.tool_id}{employee?` · ${employee.name}`:''}</small></div><p>{item.explanation}</p><small>Reported by {item.reported_by} · investigation due {new Date(item.investigation_due_at).toLocaleString()}</small></article>;})}{!openIncidents.length&&<p className={s.formHint}>No open equipment incidents.</p>}</div></section>
    <section className={`${s.accountAccess} ${s.accountAccessDashboard}`}><div className={s.accountAccessHeader}><div><h2>Current competency register</h2><p>Issue selections show only employees whose training, qualification and authorization are all current.</p></div></div><div className={s.accountAccessList}>{competencies.map(item=>{const employee=employeeById.get(item.employee_id);const tool=toolById.get(item.tool_id);return <div className={s.accountAccessRow} key={item.id}><div><strong>{employee?.name||'Unknown employee'}</strong><small>{employee?.employeeNumber} · {tool?.id||item.category} · {tool?.name||item.category}</small></div><div className={s.complianceTags}><span data-ok={item.trained}>Trained</span><span data-ok={item.qualified}>Qualified</span><span data-ok={item.authorized}>Authorized</span></div><div><small>Authorized by</small><strong>{item.authorized_by||'Not recorded'}</strong></div><div><small>Updated</small><strong>{new Date(item.updated_at).toLocaleDateString()}</strong></div></div>;})}{!competencies.length&&<p className={s.formHint}>No competency records yet. Equipment cannot be issued until one is saved.</p>}</div></section>
  </div>;
}
