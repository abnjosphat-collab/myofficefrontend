'use client';
import { useState } from 'react';
import * as XLSX from 'xlsx';
import mammoth from 'mammoth';
import { ToolsIcon as Icon } from './ToolsIcon';
import type { Employee, Tool } from './prototype';
import { defaultEquipmentKind } from './prototype';
import s from './tools.module.css';

type Target='equipment'|'employees'; type Row=Record<string,string>;
const aliases:Record<string,string>={'tool id':'register_number','equipment id':'register_number','register number':'register_number','employee number':'employee_number','employee no':'employee_number','tool':'name','equipment':'name','make/model':'make_model','model':'make_model','serial number':'serial_number','serial':'serial_number','location':'storage_location','storage location':'storage_location','job title':'job_title'};
const clean=(value:string)=>aliases[value.trim().toLowerCase()]||value.trim().toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'');
function normalize(matrix:unknown[][]){const headers=(matrix[0]||[]).map(value=>clean(String(value??'')));return matrix.slice(1).filter(row=>row.some(Boolean)).map(row=>Object.fromEntries(headers.map((key,index)=>[key,String(row[index]??'').trim()])));}
async function readFile(file:File){
  if(file.name.toLowerCase().endsWith('.docx')){const result=await mammoth.convertToHtml({arrayBuffer:await file.arrayBuffer()});const doc=new DOMParser().parseFromString(result.value,'text/html');const table=doc.querySelector('table');if(!table)throw new Error('The Word file needs a table with column headings.');return normalize([...table.querySelectorAll('tr')].map(row=>[...row.querySelectorAll('th,td')].map(cell=>cell.textContent||'')));}
  const book=XLSX.read(await file.arrayBuffer(),{type:'array'});return normalize(XLSX.utils.sheet_to_json(book.Sheets[book.SheetNames[0]],{header:1,defval:''}) as unknown[][]);
}
export function ToolsImport({onApply,onCancel}:{onApply:(target:Target,tools:Tool[],employees:Employee[])=>void;onCancel:()=>void}){
 const [target,setTarget]=useState<Target>('equipment');const [rows,setRows]=useState<Row[]>([]);const [name,setName]=useState('');const [error,setError]=useState('');
 const required=target==='equipment'?['register_number','name','storage_location']:['employee_number','name','department']; const valid=rows.filter(row=>required.every(key=>row[key]));
 async function pick(file?:File){if(!file)return;setError('');try{setRows(await readFile(file));setName(file.name);}catch(reason){setRows([]);setError(reason instanceof Error?reason.message:'This file could not be read.');}}
 function apply(){const tools:Tool[]=target==='equipment'?valid.map(row=>({id:row.register_number,name:row.name,make:row.make_model||'',serial:row.serial_number||'',category:row.category||'Other equipment',kind:defaultEquipmentKind(row.category||'Other equipment'),status:'available',location:row.storage_location,department:row.department||'Engineering',condition:'Good'})):[];const employees:Employee[]=target==='employees'?valid.map(row=>({id:crypto.randomUUID(),employeeNumber:row.employee_number,name:row.name,department:row.department,jobTitle:row.job_title,active:true})):[];onApply(target,tools,employees);}
 return <div className={s.form}><div className={s.authMode}><button type="button" aria-pressed={target==='equipment'} onClick={()=>{setTarget('equipment');setRows([]);}}>Equipment</button><button type="button" aria-pressed={target==='employees'} onClick={()=>{setTarget('employees');setRows([]);}}>Employees</button></div><label className={s.importDrop}><Icon name="upload" size={24}/><strong>{name||'Choose a register file'}</strong><span>XLSX, XLSM, CSV or a Word table</span><input aria-label="Choose register file" type="file" accept=".xlsx,.xlsm,.csv,.docx" onChange={event=>void pick(event.target.files?.[0])}/></label>{error&&<p className={s.warning}>{error}</p>}{rows.length>0&&<><div className={s.importSummary}><strong>{valid.length} ready</strong><span>{rows.length-valid.length} need attention</span></div><div className={s.importPreview}><table><thead><tr>{required.map(key=><th key={key}>{key.replaceAll('_',' ')}</th>)}</tr></thead><tbody>{rows.slice(0,8).map((row,index)=><tr key={index} data-invalid={!required.every(key=>row[key])}>{required.map(key=><td key={key}>{row[key]||'Missing'}</td>)}</tr>)}</tbody></table></div><p className={s.formHint}>Review before importing. Existing register numbers are skipped, and no record is issued automatically.</p></>}<div className={s.formFooter}><button type="button" className={s.secondary} onClick={onCancel}>Cancel</button><button type="button" className={s.primary} disabled={!valid.length} onClick={apply}>Import {valid.length||''} records<Icon name="arrow" size={16}/></button></div></div>;
}
