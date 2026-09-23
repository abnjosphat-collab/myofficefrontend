import ExcelJS from 'exceljs';
import { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun } from 'docx';
import { saveAs } from 'file-saver';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export type ExportFormat='xlsx'|'docx'|'pdf';
export type ExportTable={title:string;headers:string[];rows:(string|number)[][]};
const safe=(value:string|number)=>String(value??'');
export async function exportTable(format:ExportFormat,data:ExportTable){
 const filename=data.title.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
 if(format==='xlsx'){const book=new ExcelJS.Workbook();book.creator='MyOffice Tools & Equipment';const sheet=book.addWorksheet(data.title.slice(0,31));sheet.addRow(data.headers);data.rows.forEach(row=>sheet.addRow(row));sheet.getRow(1).font={bold:true,color:{argb:'FFFFFFFF'}};sheet.getRow(1).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF6D4AFF'}};sheet.columns.forEach((column,index)=>{column.width=Math.min(42,Math.max(14,...data.rows.map(row=>safe(row[index]).length+2)));});saveAs(new Blob([await book.xlsx.writeBuffer()]),`${filename}.xlsx`);return;}
 if(format==='docx'){const table=new Table({rows:[new TableRow({children:data.headers.map(value=>new TableCell({children:[new Paragraph({children:[new TextRun({text:value,bold:true})]})]}))}),...data.rows.map(row=>new TableRow({children:row.map(value=>new TableCell({children:[new Paragraph(safe(value))]}))}))]});const doc=new Document({sections:[{children:[new Paragraph({children:[new TextRun({text:data.title,bold:true,size:32})]}),new Paragraph(`Generated ${new Date().toLocaleString()}`),table]}]});saveAs(await Packer.toBlob(doc),`${filename}.docx`);return;}
 const pdf=new jsPDF({orientation:data.headers.length>6?'landscape':'portrait'});pdf.setFontSize(18);pdf.text(data.title,14,18);pdf.setFontSize(9);pdf.text(`Generated ${new Date().toLocaleString()}`,14,25);autoTable(pdf,{head:[data.headers],body:data.rows.map(row=>row.map(safe)),startY:30,styles:{fontSize:8},headStyles:{fillColor:[109,74,255]}});pdf.save(`${filename}.pdf`);
}
