'use client';

import { useState, type FormEvent } from 'react';
import { AnimatedSelect } from './AnimatedSelect';
import { ToolsIcon as Icon } from './ToolsIcon';
import s from './tools.module.css';

export type SourceRegisterRecord={id:string;department:string;notes?:string;original_name:string;content_type:string;size_bytes:number;uploaded_by:string;uploaded_at:string;url?:string};

const formatSize=(bytes:number)=>bytes<1024?`${bytes} B`:bytes<1024*1024?`${(bytes/1024).toFixed(1)} KB`:`${(bytes/1024/1024).toFixed(1)} MB`;

export function SourceRegisterForm({departments,onSave,onCancel}:{departments:string[];onSave:(file:File,department:string,notes:string)=>void;onCancel:()=>void}) {
  const [file,setFile]=useState<File|null>(null);const [department,setDepartment]=useState(departments[0]||'Engineering');const [notes,setNotes]=useState('');
  function submit(event:FormEvent){event.preventDefault();if(file)onSave(file,department,notes.trim());}
  return <form className={s.form} onSubmit={submit}><div className={s.formContext}><Icon name="upload" size={19}/><span><strong>Keep the original register</strong><small>The source file is stored permanently and privately so it can be reviewed when updating the live register.</small></span></div><div className={s.field}><label>Department</label><AnimatedSelect ariaLabel="Source register department" value={department} onChange={setDepartment} options={departments.map(value=>({value,label:value}))}/></div><div className={s.field}><label htmlFor="source-register-file">Register file</label><input id="source-register-file" aria-label="Register file" type="file" required accept=".pdf,.xlsx,.xlsm,.xls,.csv,.docx,.doc,.ods,.odt,.jpg,.jpeg,.png,.webp" onChange={event=>setFile(event.target.files?.[0]||null)}/><p className={s.formHint}>PDF, Excel, CSV, Word, OpenDocument or a clear image. Maximum 50 MB.</p></div><div className={s.field}><label htmlFor="source-register-notes">Notes <small>optional</small></label><textarea id="source-register-notes" rows={3} value={notes} onChange={event=>setNotes(event.target.value)} placeholder="For example: Engineering opening register, received from the mechanical workshop."/></div><div className={s.formFooter}><button type="button" className={s.secondary} onClick={onCancel}>Cancel</button><button type="submit" className={s.primary} disabled={!file}><Icon name="upload" size={16}/>Upload register</button></div></form>;
}

export function ToolsSourceRegisters({items,search,onUpload}:{items:SourceRegisterRecord[];search:string;onUpload:()=>void}) {
  const query=search.trim().toLowerCase();const visible=items.filter(item=>!query||`${item.original_name} ${item.department} ${item.notes||''} ${item.uploaded_by}`.toLowerCase().includes(query));
  return <section className={s.sourceRegisters}><div className={s.sourceRegistersHeader}><div><h2>Source registers</h2><p>Original documents kept for reference while the live database is updated.</p></div><button className={s.primary} onClick={onUpload}><Icon name="upload" size={17}/>Upload register</button></div>{visible.length?<div className={s.sourceRegisterList}>{visible.map(item=><article key={item.id} className={s.sourceRegisterCard}><span className={s.sourceRegisterIcon}><Icon name={item.content_type==='application/pdf'?'pdf':'attachment'} size={22}/></span><div><strong>{item.original_name}</strong><p>{item.department}{item.notes?` · ${item.notes}`:''}</p><small>{formatSize(item.size_bytes)} · Uploaded by {item.uploaded_by} · {new Date(item.uploaded_at).toLocaleString()}</small></div>{item.url?<a className={s.secondary} href={item.url} target="_blank" rel="noreferrer"><Icon name="download" size={15}/>Open file</a>:<span className={s.formHint}>File link unavailable</span>}</article>)}</div>:<div className={s.empty}><Icon name="upload" size={30}/><h2>{items.length?'No matching source registers':'No source registers yet'}</h2><p>{items.length?'Try a different search.':'Upload the original PDF, spreadsheet, Word document or scan before updating the live register.'}</p><button className={s.primary} onClick={onUpload}>Upload the first register</button></div>}</section>;
}
