// app/issues/exportIssues.ts — the stock-issues Excel (issues and line items) and PDF register exports. Both libraries
// are loaded only when an export is asked for. Every issue is exported, not just the filtered ones.
import { EXPORT_BRAND_ARGB, EXPORT_BRAND_RGB } from '@/lib/exportUtils';
import { formatCurrency, lineTotal } from '@/components/shared/utils';
import { issueCost } from './analytics';
import type { StockIssue } from './types';

const stamp = () => new Date().toISOString().slice(0, 10);
const when = (s: string) => (s ? new Date(s).toLocaleString('en-GB') : '');

export async function exportIssuesExcel(issues: StockIssue[]): Promise<void> {
  const ExcelJS = (await import('exceljs')).default;
  const { saveAs } = await import('file-saver');
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Ozech MyOffice';
  const head = (ws: import('exceljs').Worksheet) => {
    const row = ws.getRow(1);
    row.eachCell(cell => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EXPORT_BRAND_ARGB } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });
    row.height = 18;
    ws.views = [{ state: 'frozen', ySplit: 1 }];
  };
  const band = (row: import('exceljs').Row, i: number) => { if (i % 2 === 1) row.eachCell(cell => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F4F8' } }; }); };

  const ws = wb.addWorksheet('Stock Issues');
  ws.columns = [
    { header: 'Issue Date', key: 'date', width: 20 }, { header: 'Recipient', key: 'recipient', width: 26 }, { header: 'Recipient ID', key: 'rid', width: 14 },
    { header: 'Issued By', key: 'issuedby', width: 22 }, { header: 'Items (count)', key: 'items', width: 14 }, { header: 'Total Cost', key: 'cost', width: 14 }, { header: 'Notes', key: 'notes', width: 34 },
  ];
  head(ws);
  issues.forEach((issue, i) => {
    const row = ws.addRow({ date: when(issue.issued_at), recipient: issue.recipient_name, rid: issue.recipient_id || '', issuedby: issue.issued_by || '', items: (issue.items ?? []).length, cost: issueCost(issue), notes: issue.notes || '' });
    band(row, i);
    row.getCell('cost').numFmt = '"$"#,##0.00';
  });
  ws.autoFilter = { from: 'A1', to: 'G1' };

  const ws2 = wb.addWorksheet('Line Items');
  ws2.columns = [
    { header: 'Issue Date', key: 'date', width: 20 }, { header: 'Recipient', key: 'recipient', width: 26 }, { header: 'Stock Code', key: 'code', width: 16 }, { header: 'Description', key: 'desc', width: 36 },
    { header: 'Qty', key: 'qty', width: 8 }, { header: 'Unit', key: 'unit', width: 8 }, { header: 'Unit Price', key: 'uprice', width: 14 }, { header: 'Line Total', key: 'total', width: 14 },
  ];
  head(ws2);
  let n = 0;
  for (const issue of issues) {
    for (const item of issue.items ?? []) {
      const row = ws2.addRow({ date: when(issue.issued_at), recipient: issue.recipient_name, code: item.stock_code || '', desc: item.description, qty: item.qty, unit: item.unit || '', uprice: item.unit_price ?? '', total: lineTotal(item.qty, item.unit_price || 0) });
      band(row, n++);
      ['uprice', 'total'].forEach(k => { row.getCell(k).numFmt = '"$"#,##0.00'; });
    }
  }
  ws2.autoFilter = { from: 'A1', to: 'H1' };
  const buf = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `Stock_Issues_${stamp()}.xlsx`);
}

export async function exportIssuesPdf(issues: StockIssue[]): Promise<void> {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const total = issues.reduce((s, i) => s + issueCost(i), 0);
  doc.setFontSize(14); doc.setTextColor(...EXPORT_BRAND_RGB);
  doc.text('Stock Issues Register', 14, 14);
  doc.setFontSize(8); doc.setTextColor(100, 100, 100);
  doc.text(`Generated ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}  ·  ${issues.length} issues  ·  Total cost: ${formatCurrency(total)}`, 14, 20);
  autoTable(doc, {
    startY: 25,
    head: [['Issue Date', 'Recipient', 'Recipient ID', 'Issued By', 'Items', 'Total Cost', 'Notes']],
    body: issues.map(issue => [when(issue.issued_at), issue.recipient_name, issue.recipient_id || '', issue.issued_by || '', (issue.items ?? []).length, formatCurrency(issueCost(issue)), issue.notes || '']),
    headStyles: { fillColor: EXPORT_BRAND_RGB, textColor: 255, fontStyle: 'bold', fontSize: 7.5 },
    bodyStyles: { fontSize: 7.5 },
    alternateRowStyles: { fillColor: [240, 244, 248] },
    styles: { cellPadding: 1.5 },
    margin: { left: 10, right: 10 },
  });
  doc.save(`Stock_Issues_${stamp()}.pdf`);
}
