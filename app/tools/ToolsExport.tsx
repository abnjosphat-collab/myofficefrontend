'use client';
import { ToolsIcon as Icon } from './ToolsIcon';
import { exportTable, type ExportTable } from './toolsExports';
import s from './tools.module.css';
export function ToolsExport({data,onDone}:{data:ExportTable;onDone:()=>void}){return <div className={s.form}><p className={s.formHint}>Download the current view in the format that best fits your next task.</p><div className={s.exportChoices}><button onClick={()=>void exportTable('xlsx',data).then(onDone)}><Icon name="download"/><strong>Excel workbook</strong><span>For filtering, analysis and updates</span></button><button onClick={()=>void exportTable('docx',data).then(onDone)}><Icon name="download"/><strong>Word document</strong><span>For reports and review</span></button><button onClick={()=>void exportTable('pdf',data).then(onDone)}><Icon name="pdf"/><strong>PDF</strong><span>For a stable printable record</span></button></div></div>}
