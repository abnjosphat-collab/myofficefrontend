'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { AnimatedSelect } from './AnimatedSelect';
import { ToolsIcon as Icon } from './ToolsIcon';
import { AnimatedText } from './ToolsUI';
import { ApprovalsView, IncidentsView, InspectionsView, INCIDENT_NAMES } from './ToolsComplianceViews';
import { ToolsDateInput } from './ToolsDateInput';
import type { CompetencyRecord, IncidentRecord, InspectionRecord, InspectionType } from './complianceTypes';
import type { Employee, Tool } from './prototype';
import s from './tools.module.css';

const INSPECTION_LABELS:Record<InspectionType,string>={pre_use:'Pre-use check',weekly:'Weekly check',monthly:'Monthly inspection',quarterly:'Quarterly colour inspection',calibration:'Calibration',maintenance:'Maintenance',storage_audit:'Storage audit',repair:'Repair verification'};
export const INCIDENT_LABELS=INCIDENT_NAMES;

type InspectionInput={inspection_type:InspectionType;outcome:'passed'|'conditional'|'failed';next_due_at?:string;condition?:string;defects?:string;notes?:string;repair_quote?:number;new_equipment_price?:number};
type IncidentInput={incident_type:IncidentRecord['incident_type'];occurred_at:string;employee_id?:string;explanation:string};
type IncidentCloseInput={investigation_outcome:string;negligence_confirmed:boolean;replacement_cost?:number;recovery_months?:number};

export function ToolsCompliance({tools,employees,competencies,inspections,incidents,canManage,onSaveCompetency,onRecordInspection,onReportIncident,onCloseIncident,onOpenEmployees}:{
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
  /** Go to the Employees tab, where who may use what is managed. */
  onOpenEmployees?:()=>void;
}) {
  const [section,setSection]=useState<'inspections'|'incidents'|'approvals'|'record'>('inspections');
  const [openForm,setOpenForm]=useState<'competency'|'inspection'|'incident'|'close'|null>(null);
  const toggleForm=(name:'competency'|'inspection'|'incident'|'close',open:boolean)=>setOpenForm(current=>open?name:current===name?null:current);
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

  const summary=[{one:'Check overdue',many:'Checks overdue',value:dueTools.length},{one:'Open incident',many:'Open incidents',value:openIncidents.length},{one:'Approval',many:'Approvals',value:eligibleCount},{one:'Inspection record',many:'Inspection records',value:inspections.length}];
  const sections:Array<{value:'inspections'|'incidents'|'approvals'|'record';label:string}>=[{value:'inspections',label:'Inspections'},{value:'incidents',label:openIncidents.length?`Incidents (${openIncidents.length})`:'Incidents'},{value:'approvals',label:'Approvals'},...(canManage?[{value:'record' as const,label:'Record'}]:[])];
  const recordCheck=(tool:Tool)=>{setInspectionToolId(tool.backendId||'');setOpenForm('inspection');setSection('record');};
  const closeInvestigation=(incident:IncidentRecord)=>{setClosingIncidentId(incident.id);setOpenForm('close');setSection('record');};

  return <section className={s.acct} aria-labelledby="compliance-title">
    <header className={s.acctHeader}><div><h2 id="compliance-title">Compliance</h2><p>Inspections, incidents and approvals for the equipment register, with anything overdue shown first.</p></div>
      <dl className={s.acctSummary}>{summary.map(item=><div key={item.many}><dd><AnimatedText value={item.value}>{item.value}</AnimatedText></dd><dt>{item.value===1?item.one:item.many}</dt></div>)}</dl></header>
    <div className={s.eligSwitch} role="group" aria-label="Compliance sections">{sections.map(item=><button key={item.value} type="button" aria-pressed={section===item.value} onClick={()=>setSection(item.value)}>{item.label}</button>)}</div>
    {section==='inspections'&&<InspectionsView tools={activeTools} onRecord={canManage?recordCheck:undefined}/>}
    {section==='incidents'&&<IncidentsView incidents={openIncidents} toolById={toolById} employeeById={employeeById} onClose={canManage?closeInvestigation:undefined}/>}
    {section==='approvals'&&<ApprovalsView tools={activeTools} competencies={competencies} toolById={toolById} employeeById={employeeById} onOpenEmployees={onOpenEmployees}/>}
    {section==='record'&&canManage&&<div className={s.complianceForms}>
      <details className={s.disclosureCard} open={openForm==='competency'} onToggle={event=>toggleForm('competency',event.currentTarget.open)}><summary><span><strong>Training and authorization</strong><small>All three criteria are required before issue</small></span><Icon name="chevron" size={15}/></summary>
      <form className={`${s.form} ${s.formSection}`} onSubmit={submitCompetency}>
        <div className={s.formColumns}><div className={s.field}><label htmlFor="competency-employee">Employee</label><AnimatedSelect id="competency-employee" ariaLabel="Competency employee" value={employeeId} onChange={setEmployeeId} options={activeEmployees.map(item=>({value:item.backendId!,label:`${item.name} · ${item.employeeNumber}`}))}/></div><div className={s.field}><label htmlFor="competency-tool">Equipment</label><AnimatedSelect id="competency-tool" ariaLabel="Competency equipment" value={toolId} onChange={setToolId} options={activeTools.map(item=>({value:item.backendId!,label:`${item.id} · ${item.name}`}))}/></div></div>
        <div className={s.condition}><label data-selected={trained}><input type="checkbox" checked={trained} onChange={event=>setTrained(event.target.checked)}/><span>Trained</span></label><label data-selected={qualified}><input type="checkbox" checked={qualified} onChange={event=>setQualified(event.target.checked)}/><span>Qualified</span></label><label data-selected={authorized}><input type="checkbox" checked={authorized} onChange={event=>setAuthorized(event.target.checked)}/><span>Authorized</span></label></div>
        <div className={s.formColumns}><div className={s.field}><label htmlFor="training-ref">Training certificate</label><input id="training-ref" value={trainingRef} onChange={event=>setTrainingRef(event.target.value)} placeholder="Certificate or trainer reference"/></div><div className={s.field}><label htmlFor="training-expiry">Training expiry <small>Optional</small></label><ToolsDateInput id="training-expiry" value={trainingExpiry} onChange={event=>setTrainingExpiry(event.target.value)}/></div><div className={s.field}><label htmlFor="qualification-ref">Qualification reference</label><input id="qualification-ref" value={qualificationRef} onChange={event=>setQualificationRef(event.target.value)} placeholder="Trade or competency reference"/></div><div className={s.field}><label htmlFor="qualification-expiry">Qualification expiry <small>Optional</small></label><ToolsDateInput id="qualification-expiry" value={qualificationExpiry} onChange={event=>setQualificationExpiry(event.target.value)}/></div><div className={s.field}><label htmlFor="authorization-expiry">Authorization expiry <small>Optional</small></label><ToolsDateInput id="authorization-expiry" value={authorizationExpiry} onChange={event=>setAuthorizationExpiry(event.target.value)}/></div><div className={s.field}><label htmlFor="competency-notes">Notes <small>Optional</small></label><input id="competency-notes" value={competencyNotes} onChange={event=>setCompetencyNotes(event.target.value)}/></div></div>
        <div className={s.formFooter}><button className={s.primary} type="submit" disabled={!employeeId||!toolId}>Save competency</button></div>
      </form></details>

      <details className={s.disclosureCard} open={openForm==='inspection'} onToggle={event=>toggleForm('inspection',event.currentTarget.open)}><summary><span><strong>Record inspection or maintenance</strong><small>Failed checks place equipment on hold</small></span><Icon name="chevron" size={15}/></summary>
      <form className={`${s.form} ${s.formSection}`} onSubmit={submitInspection}>
        <div className={s.formColumns}><div className={s.field}><label htmlFor="inspection-tool">Equipment</label><AnimatedSelect id="inspection-tool" ariaLabel="Inspection equipment" value={inspectionToolId} onChange={setInspectionToolId} options={activeTools.map(item=>({value:item.backendId!,label:`${item.id} · ${item.name}`}))}/></div><div className={s.field}><label htmlFor="inspection-type">Check type</label><AnimatedSelect id="inspection-type" ariaLabel="Inspection type" value={inspectionType} onChange={value=>setInspectionType(value as InspectionType)} options={Object.entries(INSPECTION_LABELS).map(([value,label])=>({value,label}))}/></div><div className={s.field}><label htmlFor="inspection-outcome">Outcome</label><AnimatedSelect id="inspection-outcome" ariaLabel="Inspection outcome" value={outcome} onChange={value=>setOutcome(value as typeof outcome)} options={[{value:'passed',label:'Passed · fit for use'},{value:'conditional',label:'Conditional · follow-up required'},{value:'failed',label:'Failed · quarantine'}]}/></div><div className={s.field}><label htmlFor="inspection-due">Next due <small>Optional</small></label><ToolsDateInput id="inspection-due" value={nextDue} onChange={event=>setNextDue(event.target.value)}/></div><div className={s.field}><label htmlFor="inspection-defects">Defects <small>Required if failed</small></label><input id="inspection-defects" required={outcome==='failed'} value={defects} onChange={event=>setDefects(event.target.value)}/></div><div className={s.field}><label htmlFor="inspection-notes">Work completed or notes</label><input id="inspection-notes" value={inspectionNotes} onChange={event=>setInspectionNotes(event.target.value)}/></div>{inspectionType==='repair'&&<><div className={s.field}><label htmlFor="repair-quote">Repair quotation</label><input id="repair-quote" required type="number" min="0" step="0.01" value={repairQuote} onChange={event=>setRepairQuote(event.target.value)}/></div><div className={s.field}><label htmlFor="new-price">New equipment price</label><input id="new-price" required type="number" min="0.01" step="0.01" value={newPrice} onChange={event=>setNewPrice(event.target.value)}/></div></>}</div>
        {inspectionType==='repair'&&repairPercentage!==undefined&&<div className={s.formContext} data-severity={repairPercentage<=60?'ok':'warning'}><Icon name={repairPercentage<=60?'check':'alert'}/><span><strong>{repairPercentage<=60?'Repair is within the 60% limit':'Replacement review required'}</strong><small>Repair quotation is {repairPercentage.toFixed(1)}% of the new-equipment price.</small></span></div>}
        <div className={s.formFooter}><button className={s.primary} type="submit" disabled={!inspectionToolId}>Record check</button></div>
      </form></details>

      <details className={s.disclosureCard} open={openForm==='incident'} onToggle={event=>toggleForm('incident',event.currentTarget.open)}><summary><span><strong>Report loss, damage or theft</strong><small>Investigation is due within 24 hours</small></span><Icon name="chevron" size={15}/></summary>
      <form className={`${s.form} ${s.formSection}`} onSubmit={submitIncident}>
        <div className={s.formColumns}><div className={s.field}><label htmlFor="incident-tool">Equipment</label><AnimatedSelect id="incident-tool" ariaLabel="Incident equipment" value={incidentToolId} onChange={setIncidentToolId} options={activeTools.map(item=>({value:item.backendId!,label:`${item.id} · ${item.name}`}))}/></div><div className={s.field}><label htmlFor="incident-type">Incident type</label><AnimatedSelect id="incident-type" ariaLabel="Incident type" value={incidentType} onChange={value=>setIncidentType(value as IncidentRecord['incident_type'])} options={Object.entries(INCIDENT_LABELS).map(([value,label])=>({value,label}))}/></div><div className={s.field}><label htmlFor="incident-time">Occurred at</label><ToolsDateInput id="incident-time" required type="datetime-local" value={occurredAt} onChange={event=>setOccurredAt(event.target.value)}/></div><div className={s.field}><label htmlFor="incident-employee">Employee involved <small>Optional</small></label><AnimatedSelect id="incident-employee" ariaLabel="Employee involved" value={incidentEmployeeId} onChange={setIncidentEmployeeId} options={[{value:'',label:'Not assigned'},...activeEmployees.map(item=>({value:item.backendId!,label:`${item.name} · ${item.employeeNumber}`}))]}/></div></div><div className={s.field}><label htmlFor="incident-explanation">Immediate report</label><textarea id="incident-explanation" required minLength={5} rows={4} value={explanation} onChange={event=>setExplanation(event.target.value)} placeholder="What happened, where, when, and what immediate action was taken?"/></div>
        <div className={s.formFooter}><button className={s.primary} type="submit" disabled={!incidentToolId||!occurredAt||explanation.trim().length<5}>Report incident</button></div>
      </form></details>

      <details className={s.disclosureCard} open={openForm==='close'} onToggle={event=>toggleForm('close',event.currentTarget.open)}><summary><span><strong>Close investigation</strong><small>Record accountability and recovery terms</small></span><Icon name="chevron" size={15}/></summary>
      <form className={`${s.form} ${s.formSection}`} onSubmit={submitCloseIncident}>
        <div className={s.field}><label htmlFor="closing-incident">Open incident</label><AnimatedSelect id="closing-incident" ariaLabel="Open incident" value={closingIncidentId} onChange={setClosingIncidentId} options={openIncidents.map(item=>({value:item.id,label:`${toolById.get(item.tool_id)?.id||'Equipment'} · ${INCIDENT_LABELS[item.incident_type]}`}))}/></div><div className={s.field}><label htmlFor="investigation-outcome">Investigation outcome</label><textarea id="investigation-outcome" required minLength={5} rows={4} value={investigationOutcome} onChange={event=>setInvestigationOutcome(event.target.value)}/></div><label className={s.checkRow}><input type="checkbox" checked={negligenceConfirmed} onChange={event=>setNegligenceConfirmed(event.target.checked)}/><span><strong>Negligence confirmed</strong><small>Replacement recovery may be scheduled over no more than six months.</small></span></label>{negligenceConfirmed&&<div className={s.formColumns}><div className={s.field}><label htmlFor="replacement-cost">Replacement cost</label><input id="replacement-cost" required type="number" min="0" step="0.01" value={replacementCost} onChange={event=>setReplacementCost(event.target.value)}/></div><div className={s.field}><label htmlFor="recovery-months">Recovery period</label><input id="recovery-months" required type="number" min="1" max="6" value={recoveryMonths} onChange={event=>setRecoveryMonths(event.target.value)}/></div></div>}
        <div className={s.formFooter}><button className={s.primary} type="submit" disabled={!closingIncidentId||investigationOutcome.trim().length<5||(negligenceConfirmed&&!replacementCost)}>Close investigation</button></div>
      </form></details>
    </div>}

  </section>;
}
