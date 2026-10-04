// app/drivers/exportDrivers.ts — the drivers registry's own Excel and PDF exports. The PDF turns every
// phone number into a clickable tel: link. Moved out of page.tsx unchanged.
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { EXPORT_BRAND_RGB, styleExcelHeaderRow, exportFilename } from '@/lib/exportUtils';
import type { Driver } from './types';

export async function exportExcel(drivers: Driver[]) {
  const ExcelJS = (await import('exceljs')).default;
  const { saveAs } = await import('file-saver');
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Authorised Drivers');
  ws.columns = [
    { header: 'Full Name', key: 'name', width: 28 },
    { header: 'Phone Number(s)', key: 'phones', width: 30 },
    { header: 'Department', key: 'dept', width: 18 },
    { header: 'License Class', key: 'class', width: 14 },
    { header: 'License Expiry', key: 'expiry', width: 16 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Notes', key: 'notes', width: 32 },
  ];
  styleExcelHeaderRow(ws.getRow(1));
  drivers.forEach(d => ws.addRow({
    name: d.full_name, phones: (d.phone_numbers || []).join(' / '),
    dept: d.department || '', class: d.license_class || '',
    expiry: d.license_expiry || '', status: d.status, notes: d.notes || '',
  }));
  const buf = await wb.xlsx.writeBuffer();
  saveAs(
    new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    `${exportFilename('Authorised_Drivers')}.xlsx`,
  );
  toast.success('Excel downloaded');
}

export function exportPDF(drivers: Driver[], filterLabel: string) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  doc.setFillColor(...EXPORT_BRAND_RGB);
  doc.rect(0, 0, pageW, 22, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14); doc.setFont('helvetica', 'bold');
  doc.text('Authorised Drivers Registry', 14, 9);
  doc.setFontSize(8); doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${new Date().toLocaleString('en-GB')}  ·  ${filterLabel}  ·  ${drivers.length} driver${drivers.length !== 1 ? 's' : ''}`, 14, 16);

  const phonePositions: { x: number; y: number; w: number; h: number; tel: string }[] = [];
  const body = drivers.map(d => [
    d.full_name, (d.phone_numbers || []).join('\n'), d.department || '—', d.license_class || '—',
    d.license_expiry ? new Date(d.license_expiry).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—', d.status.toUpperCase(), d.notes || '',
  ]);

  autoTable(doc, {
    startY: 26,
    head: [['Full Name', 'Phone Number(s)', 'Department', 'Licence Class', 'Expiry', 'Status', 'Notes']],
    body,
    styles: { fontSize: 8.5, cellPadding: { top: 3, right: 4, bottom: 3, left: 4 }, textColor: [30, 30, 30], lineColor: [220, 230, 240], lineWidth: 0.25 },
    headStyles: { fillColor: EXPORT_BRAND_RGB, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    alternateRowStyles: { fillColor: [245, 249, 253] },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 44 }, 1: { cellWidth: 46, textColor: [30, 90, 160] }, 2: { cellWidth: 32 }, 3: { cellWidth: 24 }, 4: { cellWidth: 22 }, 5: { cellWidth: 20, halign: 'center', fontStyle: 'bold' }, 6: { cellWidth: 'auto' } },
    didDrawCell(data) {
      if (data.section === 'body' && data.column.index === 1) {
        const driver = drivers[data.row.index];
        if (!driver) return;
        const phones = driver.phone_numbers || [];
        if (phones.length === 0) return;
        const lineH = data.cell.height / Math.max(phones.length, 1);
        phones.forEach((phone, i) => {
          const raw = phone.replace(/\s/g, '');
          if (!raw) return;
          phonePositions.push({ x: data.cell.x, y: data.cell.y + i * lineH, w: data.cell.width, h: lineH, tel: `tel:${raw}` });
        });
      }
    },
    margin: { left: 14, right: 14 },
  });

  phonePositions.forEach(pos => doc.link(pos.x, pos.y, pos.w, pos.h, { url: pos.tel }));

  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7); doc.setTextColor(160, 160, 160);
    doc.text('Ozech MyOffice — Confidential', 14, doc.internal.pageSize.getHeight() - 6);
    doc.text(`Page ${i} of ${totalPages}`, pageW - 14, doc.internal.pageSize.getHeight() - 6, { align: 'right' });
  }

  doc.save(`Authorised_Drivers_${new Date().toISOString().slice(0, 10)}.pdf`);
  toast.success('PDF downloaded — phone numbers are clickable links');
}
