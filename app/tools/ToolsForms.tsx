'use client';

import { useEffect, useId, useRef, useState, type CSSProperties, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { CATEGORIES, DEPARTMENTS, JOBS, PEOPLE, defaultEquipmentKind, departmentOf, equipmentTypesForCategory, type ActionKind, type Employee, type EquipmentKind, type Movement, type Tool, type Evidence } from './prototype';
import { ToolsIcon as Icon } from './ToolsIcon';
import { AnimatedSelect } from './AnimatedSelect';
import { announceToolsPopover, TOOLS_POPOVER_EVENT } from './toolsPopover';
import { EvidencePicker, Help, type AddEvidence } from './ToolsUI';
import s from './tools.module.css';

export function SuggestField({ label, options, value, onChange, required = true, hint, disabled = false }: { label: string; options: string[]; value: string; onChange: (value: string) => void; required?: boolean; hint?: string; disabled?: boolean }) {
  const id = useId();
  const popoverId = `suggest-${id}`;
  const root = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [placement, setPlacement] = useState<'down' | 'up'>('down');
  const [floatingStyle, setFloatingStyle] = useState<CSSProperties & Record<string, string | number | undefined>>({});
  const matches = options.filter(option => option.toLowerCase().includes(value.toLowerCase())).slice(0, 8);
  const choose = (option: string) => { onChange(option); setOpen(false); setActive(0); };
  const show = () => {
    announceToolsPopover(popoverId);
    const rect = input.current?.getBoundingClientRect();
    if (rect) {
      const estimatedHeight = Math.min(244, Math.max(54, matches.length * 38 + 12));
      const roomBelow = window.innerHeight - rect.bottom;
      const nextPlacement = roomBelow < estimatedHeight && rect.top > roomBelow ? 'up' : 'down';
      const width = Math.min(Math.max(rect.width, 220), window.innerWidth - 28);
      const left = Math.max(14, Math.min(rect.left, window.innerWidth - width - 14));
      const computed = root.current ? window.getComputedStyle(root.current) : null;
      const theme: Record<string, string> = {};
      for (const property of ['--paper','--canvas','--ink','--muted-ink','--brand','--brand-soft','--line','--soft','--font-scale','--tools-font']) {
        const computedValue = computed?.getPropertyValue(property);
        if (computedValue) theme[property] = computedValue;
      }
      setPlacement(nextPlacement);
      setFloatingStyle({
        ...theme,
        left,
        width,
        maxHeight: Math.max(72, Math.min(244, nextPlacement === 'down' ? roomBelow - 12 : rect.top - 12)),
        top: nextPlacement === 'down' ? rect.bottom + 5 : undefined,
        bottom: nextPlacement === 'up' ? window.innerHeight - rect.top + 5 : undefined,
        fontFamily: computed?.fontFamily,
        fontSize: computed?.fontSize,
        colorScheme: computed?.colorScheme,
      });
    }
    setOpen(true);
  };
  useEffect(() => {
    const closeAnother = (event: Event) => { if ((event as CustomEvent<string>).detail !== popoverId) setOpen(false); };
    const closeOutside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node) && !panel.current?.contains(event.target as Node)) setOpen(false); };
    const closeOnViewportChange = (event: Event) => {
      if (event.type === 'scroll' && (root.current?.contains(event.target as Node) || panel.current?.contains(event.target as Node))) return;
      setOpen(false);
    };
    window.addEventListener(TOOLS_POPOVER_EVENT, closeAnother);
    document.addEventListener('pointerdown', closeOutside);
    window.addEventListener('resize', closeOnViewportChange);
    window.addEventListener('scroll', closeOnViewportChange, true);
    return () => {
      window.removeEventListener(TOOLS_POPOVER_EVENT, closeAnother);
      document.removeEventListener('pointerdown', closeOutside);
      window.removeEventListener('resize', closeOnViewportChange);
      window.removeEventListener('scroll', closeOnViewportChange, true);
    };
  }, [popoverId]);
  const suggestions = typeof document !== 'undefined' ? createPortal(
    <AnimatePresence>{open && <motion.div ref={panel} className={`${s.suggestions} ${s.suggestionsPortal}`} style={floatingStyle} data-placement={placement} id={`${id}-options`} role="listbox" aria-label={`${label} suggestions`} initial={{height:0,opacity:0,y:reduced?0:placement === 'down' ? -4 : 4}} animate={{height:'auto',opacity:1,y:0}} exit={{height:0,opacity:0,y:reduced?0:placement === 'down' ? -4 : 4}} transition={{duration:reduced?0:.2,ease:[.2,.8,.2,1]}}>
      {matches.length ? matches.map((option, i) => <button key={option} id={`${id}-${i}`} tabIndex={-1} type="button" role="option" aria-selected={active === i} data-active={active === i} onMouseDown={e => e.preventDefault()} onClick={() => choose(option)}>{option}{value === option && <Icon name="check" size={14} />}</button>) : <p>No suggestions for this text.</p>}
    </motion.div>}</AnimatePresence>,
    document.body,
  ) : null;
  return <div className={s.field}>
    <div className={s.fieldHeading}><label htmlFor={id}>{label}{!required && <small>Optional</small>}</label>{hint && <Help label={label}>{hint}</Help>}</div>
    <div ref={root} className={s.suggest} role="presentation" onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false); }}>
      <input ref={input} id={id} aria-label={label} disabled={disabled} value={value} required={required} autoComplete="off" placeholder={`Search ${label.toLowerCase()}…`} role="combobox" aria-autocomplete="list" aria-expanded={open} aria-controls={open ? `${id}-options` : undefined} aria-activedescendant={open && matches[active] ? `${id}-${active}` : undefined}
        onFocus={show} onChange={e => { onChange(e.target.value); setActive(0); show(); }}
        onKeyDown={e => {
          if (e.key === 'ArrowDown') { e.preventDefault(); if (!open) show(); setActive(a => open ? Math.min(a + 1, Math.max(0, matches.length - 1)) : 0); }
          if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(a - 1, 0)); }
          if (e.key === 'Enter' && open && matches[active]) { e.preventDefault(); choose(matches[active]); }
          if (e.key === 'Escape' && open) { e.preventDefault(); e.stopPropagation(); setOpen(false); }
        }} />
      <Icon name="down" size={14} />
      {suggestions}
    </div>
  </div>;
}
export function MultiSuggestField({label,options,value,onChange,hint}:{label:string;options:string[];value:string[];onChange:(value:string[])=>void;hint?:string}) {
  const [draft,setDraft]=useState('');
  const add=(entry:string)=>{const clean=entry.trim();if(clean&&!value.some(item=>item.toLowerCase()===clean.toLowerCase()))onChange([...value,clean]);setDraft('');};
  return <div className={s.field}><div className={s.fieldHeading}><label>{label}</label>{hint&&<Help label={label}>{hint}</Help>}</div><div className={s.tagField}>{value.length>0&&<div className={s.tags}>{value.map(item=><span key={item}>{item}<button type="button" aria-label={`Remove ${item}`} onClick={()=>onChange(value.filter(entry=>entry!==item))}><Icon name="close" size={12}/></button></span>)}</div>}<div className={s.tagEntry}><SuggestField label={`Add ${label}`} options={options.filter(option=>!value.includes(option))} value={draft} onChange={setDraft} required={false}/><button type="button" className={s.secondary} disabled={!draft.trim()} onClick={()=>add(draft)}>Add</button></div></div></div>;
}
export const TITLES: Record<ActionKind, string> = { issue: 'Issue tool', return: 'Record a return', transfer: 'Change custodian', extend: 'Change return date' };
// Only called by the submit event, never during rendering.
function isFuture(value: string) { const time = Date.parse(value); return Number.isFinite(time) && time > Date.now(); }

export function MovementForm({ kind, initialTool, initialEmployee, tools, employees = PEOPLE.map((label,index)=>({id:String(index),employeeNumber:label.split(' · ')[1],name:label.split(' · ')[0],department:'Engineering',active:true})), locationSuggestions=[], equipmentSuggestions=[], issuerDepartment, addFiles, onSave, onCancel }: { kind: ActionKind; initialTool?: Tool; initialEmployee?:Employee; tools: Tool[]; employees?: Employee[]; locationSuggestions?:string[]; equipmentSuggestions?:string[]; issuerDepartment?:string; addFiles: AddEvidence; onSave: (input: Movement) => void; onCancel: () => void }) {
  const candidates = tools.filter(t => (!issuerDepartment||departmentOf(t)===issuerDepartment) && !t.archived && (kind === 'issue' ? t.status === 'available' : ['issued', 'overdue'].includes(t.status)));
  const [toolLabel, setToolLabel] = useState(initialTool ? `${initialTool.id} · ${initialTool.name}` : '');
  const [person, setPerson] = useState(initialEmployee?`${initialEmployee.name} · ${initialEmployee.employeeNumber}`:'');
  const [location, setLocation] = useState('');
  const [job, setJob] = useState(initialTool?.job ?? '');
  const [assignedEquipment,setAssignedEquipment]=useState<string[]>(initialTool?.assignedEquipment||[]);
  const [condition, setCondition] = useState('Good');
  const [notes, setNotes] = useState('');
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [calibration, setCalibration] = useState('Not verified');
  const [movementScope, setMovementScope] = useState('Within the operation');
  const [gatePass, setGatePass] = useState('');
  const [approvalRef, setApprovalRef] = useState('');
  const [department, setDepartment] = useState(initialTool ? departmentOf(initialTool) : initialEmployee?.department||issuerDepartment||'Engineering');
  const [error, setError] = useState('');
  const tool = candidates.find(t => `${t.id} · ${t.name}` === toolLabel);
  const employeeOptions = employees.filter(employee=>employee.active&&(!issuerDepartment||employee.department===issuerDepartment)).map(employee=>`${employee.name} · ${employee.employeeNumber}`);
  const needsCalibration = !!tool && ['digital-multimeter', 'clamp-meter', 'torque-wrench', 'test-instrument'].includes(tool.kind);
  const notesRequired = kind === 'extend' || (kind === 'return' && condition !== 'Good');
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const due = String(new FormData(event.currentTarget).get('due') || '');
    if (!tool) return setError('Choose a tool from the suggestions.');
    if (['issue', 'transfer'].includes(kind) && !employeeOptions.includes(person)) return setError('Choose an employee from this workspace register.');
    if (kind !== 'extend' && !location.trim()) return setError('Add the work or return location.');
    if (['issue', 'transfer'].includes(kind) && !job.trim()) return setError('Add the work order or job reference.');
    if (['issue', 'extend'].includes(kind) && !isFuture(due)) return setError('Choose a return time in the future.');
    if (kind === 'extend' && tool.dueISO && Date.parse(due) <= Date.parse(tool.dueISO)) return setError('The new return time must be later than the current deadline.');
    if (notesRequired && !notes.trim()) return setError('Add a short note so the next person has the context.');
    if (kind === 'transfer' && (!gatePass.trim() || !approvalRef.trim())) return setError('Record the gate pass and existing approval reference.');
    const displayDue = due ? new Date(due).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
    onSave({ kind, toolId: tool.id, person, location: location.trim(), due: displayDue, dueISO: due ? new Date(due).toISOString() : undefined, job: job.trim(), assignedEquipment, condition, notes: notes.trim(), evidence, calibration: kind === 'return' && needsCalibration ? calibration : undefined, gatePass, approvalRef, movementScope, department });
  }
  return <form onSubmit={handleSubmit} className={s.form}>
    <SuggestField label="Tool" options={candidates.map(t => `${t.id} · ${t.name}`)} value={toolLabel} onChange={setToolLabel} hint="Search by tool name or ID. Only tools eligible for this action appear." />
    {tool && <div className={s.formContext}><Icon name={tool.holder ? 'user' : 'department'} /><span>{tool.holder ? <>With <strong>{tool.holder.split(' · ')[0]}</strong></> : departmentOf(tool)}<small>{tool.holder ? `Expected ${tool.due}` : `${tool.location} · ${tool.condition}`}</small></span></div>}
    <div className={s.formColumns}>
      {['issue', 'transfer'].includes(kind) && <SuggestField label="Employee" options={employeeOptions} value={person} onChange={setPerson} hint="Select a person from this standalone employee register. Employee numbers keep similar names distinct." />}
      {kind !== 'extend' && <SuggestField label={kind==='return'?'Return location':'Current work location'} options={locationSuggestions} value={location} onChange={setLocation} hint="Start typing to reuse a known location, or enter the exact place freely because teams and tools move frequently."/>}
      {['issue', 'transfer'].includes(kind) && <SuggestField label="Work order / job" options={JOBS} value={job} onChange={setJob} hint="Select a suggested work order or enter the job reference from the paper record." />}
      {['issue', 'extend'].includes(kind) && <div className={s.field}><div className={s.fieldHeading}><label htmlFor="tools-due">Expected return</label><Help label="Expected return">Enter local date and time. Overdue notifications will be delivered by the backend in the operational system.</Help></div><input aria-label="Expected return" id="tools-due" name="due" type="datetime-local" required /></div>}
    </div>
    {['issue','transfer'].includes(kind)&&<MultiSuggestField label="Equipment being worked on" options={equipmentSuggestions} value={assignedEquipment} onChange={setAssignedEquipment} hint="Add one or more machines or fixed assets this portable tool will be used on. Type a new name or choose a previous entry."/>}
    {kind === 'transfer' && <div className={s.formSection}>
      <div className={s.fieldHeading}><strong>Movement references</strong><Help label="Movement references">Record an existing approval; this form does not grant approval. Internal movement requires HOS approval and external movement requires GM approval.</Help></div>
      <div className={s.formColumns}><SuggestField label="Receiving department" options={DEPARTMENTS} value={department} onChange={setDepartment} /><div className={s.field}><label htmlFor="tools-scope">Movement</label><AnimatedSelect id="tools-scope" ariaLabel="Movement" value={movementScope} onChange={setMovementScope} options={['Within the operation','Outside the operation'].map(value=>({value,label:value}))}/></div><div className={s.field}><label htmlFor="tools-pass">Gate pass reference</label><input id="tools-pass" aria-label="Gate pass reference" required value={gatePass} onChange={e => setGatePass(e.target.value)} placeholder="Existing gate pass number" /></div><div className={s.field}><label htmlFor="tools-approval">{movementScope.startsWith('Outside') ? 'GM' : 'HOS'} approval reference</label><input id="tools-approval" aria-label="Approval reference" required value={approvalRef} onChange={e => setApprovalRef(e.target.value)} placeholder="Recorded approval reference" /></div></div><p className={s.formHint}>The owning department and original return deadline stay with the tool.</p>
    </div>}
    {kind === 'return' && <><fieldset className={s.condition}><legend>Condition on return</legend>{['Good', 'Damaged', 'Missing parts'].map(c => <label key={c} data-selected={condition === c}><input aria-label={c} type="radio" name="tools-condition" value={c} checked={condition === c} onChange={() => setCondition(c)} /><span>{c}</span></label>)}</fieldset>{needsCalibration && <div className={s.field}><div className={s.fieldHeading}><label htmlFor="tools-calibration">Calibration check</label><Help label="Calibration check">Record the check against the existing certificate or calibration matrix. Unknown or expired calibration keeps this instrument on hold.</Help></div><AnimatedSelect id="tools-calibration" ariaLabel="Calibration check" value={calibration} onChange={setCalibration} options={['Not verified','Verified current','Expired'].map(value=>({value,label:value}))}/></div>}</>}
    {notesRequired && <div className={s.field}><label htmlFor="tools-notes">{kind === 'extend' ? 'Reason for extension' : 'Describe the condition'}</label><textarea id="tools-notes" aria-label="Required notes" required rows={2} placeholder="A brief, useful explanation…" value={notes} onChange={e => setNotes(e.target.value)} /></div>}
    {kind === 'return' && (condition !== 'Good' || (needsCalibration && calibration !== 'Verified current')) && <p className={s.warning}><Icon name="alert" />This tool will be held for attention.</p>}
    <details className={s.disclosure}><summary><Icon name="attachment" />Notes & attachments <span>Optional</span><Icon name="down" size={14} /></summary><div className={s.disclosureBody}>{!notesRequired && <div className={s.field}><label htmlFor="tools-notes">Notes</label><textarea id="tools-notes" aria-label="Notes" rows={2} placeholder="Anything the next person should know…" value={notes} onChange={e => setNotes(e.target.value)} /></div>}<EvidencePicker value={evidence} onChange={setEvidence} addFiles={addFiles} /></div></details>
    {error && <p className={s.warning} role="alert">{error}</p>}
    <div className={s.formFooter}><button type="button" className={s.secondary} onClick={onCancel}>Cancel</button><button type="submit" className={s.primary}>{TITLES[kind]}<Icon name="arrow" size={16} /></button></div>
    <p className={s.demoNote}>This action is saved in the equipment history.</p>
  </form>;
}

export function ToolForm({ initialTool, defaultDepartment, addFiles, onSave, onCancel }: { initialTool?: Tool; defaultDepartment: string; addFiles: AddEvidence; onSave: (tool: Tool) => void; onCancel: () => void }) {
  const [name, setName] = useState(initialTool?.name || '');
  const [make, setMake] = useState(initialTool?.make || '');
  const [id, setId] = useState(initialTool?.id || '');
  const [serial, setSerial] = useState(initialTool?.serial || '');
  const [department, setDepartment] = useState(initialTool ? departmentOf(initialTool) : defaultDepartment);
  const [section, setSection] = useState(initialTool?.section || '');
  const [category, setCategory] = useState(initialTool?.category || CATEGORIES[0]);
  const [equipmentKind, setEquipmentKind] = useState<EquipmentKind>(initialTool?.kind || defaultEquipmentKind(CATEGORIES[0]));
  const [location, setLocation] = useState(initialTool?.location || '');
  const [notes, setNotes] = useState(initialTool?.notes || '');
  const [approvalRef, setApprovalRef] = useState(initialTool?.approvalRef || '');
  const [specificationText,setSpecificationText]=useState(Object.entries(initialTool?.specifications||{}).map(([key,value])=>`${key}: ${value}`).join('\n'));
  const [evidence, setEvidence] = useState<Evidence[]>(initialTool?.evidence || []);
  const equipmentTypes = equipmentTypesForCategory(category);
  function changeCategory(nextCategory: string) {
    setCategory(nextCategory);
    if (!equipmentTypesForCategory(nextCategory).some(type => type.value === equipmentKind)) setEquipmentKind(defaultEquipmentKind(nextCategory));
  }
  return <form className={s.form} onSubmit={e => { e.preventDefault(); if (!name.trim() || !make.trim() || !department.trim()) return; const specifications=Object.fromEntries(specificationText.split('\n').map(line=>{const colon=line.indexOf(':');return colon<0?[line,'']:[line.slice(0,colon),line.slice(colon+1)];}).filter(parts=>parts[0]?.trim()&&parts[1]?.trim()).map(parts=>[parts[0].trim(),parts[1].trim()])); onSave({ ...initialTool, id: id.trim(), name: name.trim(), make: make.trim(), serial: serial.trim() || 'Not recorded', department: department.trim(), section: section.trim(), category, kind: equipmentKind, location, status: initialTool?.status || 'available', condition: initialTool?.condition || 'Good', notes: notes.trim(), approvalRef: approvalRef.trim(), evidence, specifications }); }}>
    <div className={s.formColumns}><div className={s.field}><label htmlFor="tools-name">Tool name</label><input aria-label="Tool name" id="tools-name" value={name} required pattern=".*\S.*" onChange={e => setName(e.target.value)} placeholder="Cordless impact driver" /></div><div className={s.field}><label htmlFor="tools-model">Make & model</label><input aria-label="Make and model" id="tools-model" value={make} required pattern=".*\S.*" onChange={e => setMake(e.target.value)} placeholder="Bosch GDX 18V" /></div><SuggestField label="Department" options={DEPARTMENTS} value={department} onChange={setDepartment} hint="The department that owns this record. Start with Engineering; add other departments as they join." /><div className={s.field}><label htmlFor="tools-category">Category</label><AnimatedSelect id="tools-category" ariaLabel="Category" value={category} onChange={changeCategory} options={CATEGORIES.map(value=>({value,label:value}))}/></div><div className={s.field}><div className={s.fieldHeading}><label htmlFor="tools-equipment-type">Equipment type</label><Help label="Equipment type">Choose the closest physical form. This controls the register pictogram and keeps different tools visually distinct.</Help></div><AnimatedSelect id="tools-equipment-type" ariaLabel="Equipment type" value={equipmentKind} onChange={value=>setEquipmentKind(value as EquipmentKind)} options={equipmentTypes}/></div><div className={s.field}><div className={s.fieldHeading}><label htmlFor="tools-id">Tool ID <small>Optional</small></label><Help label="Tool ID">Use the existing physical label. Leave blank to generate a prototype ID. Existing IDs cannot be changed here.</Help></div><input id="tools-id" aria-label="Tool ID" value={id} disabled={!!initialTool} onChange={e => setId(e.target.value)} placeholder="Existing tool number" /></div><div className={s.field}><label htmlFor="tools-serial">Serial number <small>Optional</small></label><input id="tools-serial" aria-label="Serial number" value={serial} onChange={e => setSerial(e.target.value)} placeholder="Manufacturer serial number" /></div><div className={s.field}><div className={s.fieldHeading}><label htmlFor="tool-location">Storage location</label><Help label="Storage location">Enter the location as free text. Use the description people actually use on site.</Help></div><input id="tool-location" aria-label="Storage location" disabled={!!initialTool?.holder} value={location} onChange={event=>setLocation(event.target.value)} placeholder="Main workshop, electrical cage…" required /></div><div className={s.field}><label htmlFor="tools-section">Section <small>Optional</small></label><input aria-label="Section" id="tools-section" value={section} onChange={e => setSection(e.target.value)} placeholder="Mechanical, electrical…" /></div></div>
    <EvidencePicker value={evidence} onChange={setEvidence} addFiles={addFiles} toolPhoto />
    <div className={s.field}><div className={s.fieldHeading}><label htmlFor="tool-specifications">Technical specifications</label><Help label="Technical specifications">Record every specification needed to identify and safely use the item. Use one “Label: value” entry per line; the design accepts different specifications for different equipment types.</Help></div><textarea id="tool-specifications" aria-label="Technical specifications" rows={5} value={specificationText} onChange={event=>setSpecificationText(event.target.value)} placeholder={'Voltage: 18 V\nChuck capacity: 13 mm\nNo-load speed: 0–1,800 rpm\nWeight: 1.8 kg'}/></div>
    <details className={s.disclosure}><summary><Icon name="attachment" />Notes & approval <Icon name="down" size={14} /></summary><div className={s.disclosureBody}><div className={s.field}><label htmlFor="tools-endorsement">Register endorsement / approval reference</label><input id="tools-endorsement" aria-label="Register approval reference" value={approvalRef} onChange={e => setApprovalRef(e.target.value)} placeholder="Existing department endorsement or GM approval" /></div><div className={s.field}><label htmlFor="tool-edit-notes">Notes</label><textarea id="tool-edit-notes" aria-label="Notes" rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Condition, missing components or useful context…" /></div></div></details>
    <div className={s.formFooter}><button type="button" className={s.secondary} onClick={onCancel}>Cancel</button><button className={s.primary} type="submit">{initialTool ? 'Save changes' : 'Add tool'}<Icon name={initialTool ? 'check' : 'plus'} size={16} /></button></div><p className={s.demoNote}>One identified tool or kit per record · standalone prototype</p>
  </form>;
}

export function MarkReadyForm({tool,onSave,onCancel}:{tool:Tool;onSave:(resolutionNote:string)=>void;onCancel:()=>void}) {
  const [resolutionNote,setResolutionNote]=useState('');
  function submit(event:FormEvent) { event.preventDefault(); const note=resolutionNote.trim(); if (note) onSave(note); }
  return <form className={s.form} onSubmit={submit}><div className={s.formContext}><Icon name="check" size={19}/><span><strong>{tool.name}</strong><small>Currently held in Needs attention</small></span></div><div className={s.field}><label htmlFor="ready-resolution">Repair or inspection completed</label><textarea id="ready-resolution" aria-label="Repair or inspection completed" rows={4} required minLength={2} value={resolutionNote} onChange={event=>setResolutionNote(event.target.value)} placeholder="For example: Trigger switch replaced and function tested."/><p className={s.formHint}>This explanation is saved in the permanent history. The tool will return to Ready to use with condition Good.</p></div><div className={s.formFooter}><button type="button" className={s.secondary} onClick={onCancel}>Cancel</button><button type="submit" className={s.primary} disabled={!resolutionNote.trim()}><Icon name="check" size={16}/>Mark ready for use</button></div></form>;
}

export function EmployeeForm({ onSave, onCancel }: { onSave: (employee: Employee) => void; onCancel: () => void }) {
  const [name,setName]=useState(''); const [employeeNumber,setEmployeeNumber]=useState(''); const [department,setDepartment]=useState('Engineering'); const [jobTitle,setJobTitle]=useState(''); const [supervisorName,setSupervisorName]=useState('');
  return <form className={s.form} onSubmit={event=>{event.preventDefault();onSave({id:crypto.randomUUID(),name:name.trim(),employeeNumber:employeeNumber.trim(),department:department.trim(),jobTitle:jobTitle.trim(),supervisorName:supervisorName.trim(),active:true});}}><div className={s.formColumns}><div className={s.field}><label htmlFor="employee-name">Full name</label><input id="employee-name" aria-label="Full name" required value={name} onChange={event=>setName(event.target.value)} placeholder="Employee name"/></div><div className={s.field}><label htmlFor="employee-number">Employee ID / number</label><input id="employee-number" aria-label="Employee ID or number" required value={employeeNumber} onChange={event=>setEmployeeNumber(event.target.value)} placeholder="EMP-001"/></div><SuggestField label="Department" options={DEPARTMENTS} value={department} onChange={setDepartment}/><div className={s.field}><label htmlFor="employee-role">Job title <small>Optional</small></label><input id="employee-role" aria-label="Job title" value={jobTitle} onChange={event=>setJobTitle(event.target.value)} placeholder="Artisan, supervisor…"/></div><div className={s.field}><label htmlFor="employee-supervisor">Supervisor name <small>Optional</small></label><input id="employee-supervisor" aria-label="Supervisor name" value={supervisorName} onChange={event=>setSupervisorName(event.target.value)} placeholder="Immediate supervisor"/></div></div><p className={s.formHint}>This employee register belongs to the Tools &amp; Equipment workspace.</p><div className={s.formFooter}><button type="button" className={s.secondary} onClick={onCancel}>Cancel</button><button type="submit" className={s.primary}>Add employee<Icon name="plus" size={16}/></button></div></form>;
}


