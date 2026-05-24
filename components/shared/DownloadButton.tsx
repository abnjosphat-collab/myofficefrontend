'use client';

import { useState, useRef, useEffect } from 'react';
import { Download, FileSpreadsheet, FileDown } from 'lucide-react';

export interface DLColumn {
  key: string;
  label: string;
  /** Custom formatter: receives the raw cell value and the full row */
  format?: (val: unknown, row: Record<string, unknown>) => string;
  /** Excel column width (characters). Defaults to max(label.length+4, 16) */
  width?: number;
}

interface DownloadButtonProps {
  data: Record<string, unknown>[];
  columns: DLColumn[];
  filename: string;
  /** Heading shown in the PDF and as the Excel sheet name */
  title?: string;
  subtitle?: string;
  className?: string;
}

function getVal(row: Record<string, unknown>, col: DLColumn): string {
  const raw = row[col.key];
  if (col.format) return col.format(raw, row);
  if (raw === null || raw === undefined) return '';
  if (Array.isArray(raw)) return raw.join(', ');
  return String(raw);
}

export function DownloadButton({
  data, columns, filename, title, subtitle, className = '',
}: DownloadButtonProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const downloadExcel = async () => {
    setOpen(false);
    const ExcelJS = (await import('exceljs')).default;
    const { saveAs } = await import('file-saver');

    const wb = new ExcelJS.Workbook();
    wb.creator = 'Ozech MyOffice';
    wb.created = new Date();
    const ws = wb.addWorksheet(title ?? filename, { views: [{ state: 'frozen', ySplit: 1 }] });

    ws.columns = columns.map(c => ({
      header: c.label, key: c.key,
      width: c.width ?? Math.max(c.label.length + 4, 16),
    }));

    const headerRow = ws.getRow(1);
    headerRow.height = 22;
    headerRow.eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2A4D69' } };
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11, name: 'Calibri' };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: false };
      cell.border = { bottom: { style: 'medium', color: { argb: 'FF86BBD8' } } };
    });

    data.forEach((row, i) => {
      const values: Record<string, string> = {};
      columns.forEach(c => { values[c.key] = getVal(row, c); });
      const exRow = ws.addRow(values);
      exRow.height = 18;
      exRow.eachCell(cell => {
        if (i % 2 === 1) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D1F2E' } };
        }
        cell.font = { color: { argb: 'FFD0D8E0' }, size: 10, name: 'Calibri' };
        cell.alignment = { vertical: 'middle' };
      });
    });

    ws.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: columns.length },
    };

    const buf = await wb.xlsx.writeBuffer();
    saveAs(
      new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
      `${filename}.xlsx`,
    );
  };

  const downloadPDF = async () => {
    setOpen(false);
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    let y = 12;

    if (title) {
      doc.setFontSize(14);
      doc.setTextColor(42, 77, 105);
      doc.setFont('helvetica', 'bold');
      doc.text(title, 14, y);
      y += 7;
    }
    if (subtitle) {
      doc.setFontSize(8);
      doc.setTextColor(120, 130, 140);
      doc.setFont('helvetica', 'normal');
      doc.text(subtitle, 14, y);
      y += 6;
    }
    doc.setFontSize(7);
    doc.setTextColor(160, 170, 180);
    doc.text(`Generated ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} · ${data.length} records`, 14, y);
    y += 4;

    autoTable(doc, {
      startY: y,
      head: [columns.map(c => c.label)],
      body: data.map(row => columns.map(c => getVal(row, c))),
      styles: { fontSize: 8, cellPadding: { top: 2, bottom: 2, left: 3, right: 3 } },
      headStyles: {
        fillColor: [42, 77, 105], textColor: 255,
        fontStyle: 'bold', fontSize: 8,
      },
      alternateRowStyles: { fillColor: [245, 248, 252] },
      margin: { left: 14, right: 14 },
      tableLineColor: [200, 210, 220],
      tableLineWidth: 0.1,
    });

    doc.save(`${filename}.pdf`);
  };

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold text-white border transition-all hover:-translate-y-0.5 bg-emerald-500/20 border-emerald-500/35 hover:bg-emerald-500/30"
      >
        <Download className="h-3.5 w-3.5" />
        Download
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 z-50 min-w-[160px] rounded-xl border border-white/[0.12] bg-[#0d1f33]/95 backdrop-blur-xl shadow-2xl overflow-hidden">
          <button
            type="button"
            onClick={downloadExcel}
            className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-white/80 hover:bg-white/[0.08] hover:text-white transition-colors text-left"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-400 shrink-0" />
            Export Excel
          </button>
          <div className="h-px bg-white/[0.07]" />
          <button
            type="button"
            onClick={downloadPDF}
            className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-white/80 hover:bg-white/[0.08] hover:text-white transition-colors text-left"
          >
            <FileDown className="h-4 w-4 text-rose-400 shrink-0" />
            Export PDF
          </button>
        </div>
      )}
    </div>
  );
}
