'use client';

import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { Download, FileSpreadsheet, FileDown } from '@/components/shared/theme';
import { EXPORT_BRAND_ARGB, EXPORT_BRAND_RGB } from '@/lib/exportUtils';

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
  /** Which formats to offer. Default both. A single format renders one direct
   *  trigger button instead of a dropdown. */
  formats?: ('excel' | 'pdf')[];
  /** PDF-specific column set, when a page's PDF intentionally shows fewer
   *  columns than its Excel export (e.g. a landscape table can't fit every
   *  field). Falls back to `columns` when omitted. */
  pdfColumns?: DLColumn[];
  /** Key of the column whose displayed value should drive its own text color
   *  (e.g. a status/priority chip: green=approved, red=rejected). */
  statusColumn?: string;
  /** Maps that column's displayed value (plus the full source row, for
   *  colors that depend on a different field, e.g. an expiry date) to a
   *  6-digit hex color (no '#'), or undefined for no override. Applied to
   *  both the Excel cell font and the PDF table cell text color. */
  statusColor?: (value: string, row: Record<string, unknown>) => string | undefined;
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function getVal(row: Record<string, unknown>, col: DLColumn): string {
  const raw = row[col.key];
  if (col.format) return col.format(raw, row);
  if (raw === null || raw === undefined) return '';
  if (Array.isArray(raw)) return raw.join(', ');
  return String(raw);
}

export function DownloadButton({
  data, columns, filename, title, subtitle, className = '', formats = ['excel', 'pdf'], pdfColumns,
  statusColumn, statusColor,
}: DownloadButtonProps) {
  const pdfCols = pdfColumns ?? columns;
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
    try {
      const ExcelJS = (await import('exceljs')).default;
      const { saveAs } = await import('file-saver');

      const wb = new ExcelJS.Workbook();
      wb.creator = 'Ozech MyOffice';
      wb.created = new Date();
      const ws = wb.addWorksheet(title ?? filename);

      // ── Optional title + subtitle rows ──────────────────────────────────
      let headerRowNum = 1;

      if (title) {
        const titleRow = ws.addRow([title]);
        titleRow.height = 26;
        const tc = titleRow.getCell(1);
        tc.font = { bold: true, size: 14, color: { argb: EXPORT_BRAND_ARGB }, name: 'Calibri' };
        ws.mergeCells(1, 1, 1, columns.length);
        headerRowNum++;
      }
      if (subtitle) {
        const subRow = ws.addRow([subtitle]);
        subRow.height = 16;
        subRow.getCell(1).font = { size: 9, color: { argb: 'FF6B7B8E' }, italic: true, name: 'Calibri' };
        ws.mergeCells(headerRowNum, 1, headerRowNum, columns.length);
        headerRowNum++;
      }
      if (title || subtitle) {
        ws.addRow([]);   // blank spacer
        headerRowNum++;
      }

      // ── Column definitions ───────────────────────────────────────────────
      ws.columns = columns.map(c => ({
        header: c.label,
        key:    c.key,
        width:  c.width ?? Math.max(c.label.length + 6, 18),
      }));

      // ── Header row styling ───────────────────────────────────────────────
      const hdr = ws.getRow(headerRowNum);
      hdr.height = 24;
      hdr.eachCell(cell => {
        cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: EXPORT_BRAND_ARGB } };
        cell.font      = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11, name: 'Calibri' };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border    = {
          top:    { style: 'thin',   color: { argb: 'FF1A3650' } },
          bottom: { style: 'medium', color: { argb: 'FF86BBD8' } },
        };
      });

      ws.views = [{ state: 'frozen', ySplit: headerRowNum }];

      // ── Data rows — readable light-mode two-tone ─────────────────────────
      // Numbers/booleans are written as-is (not stringified) so Excel keeps
      // them sortable/filterable and numeric-formattable, unless a column's
      // `format` explicitly overrides the value (that string wins then).
      data.forEach((row, i) => {
        const values: Record<string, unknown> = {};
        columns.forEach(c => {
          const raw = row[c.key];
          values[c.key] = c.format ? c.format(raw, row) : (Array.isArray(raw) ? raw.join(', ') : raw ?? '');
        });
        const exRow = ws.addRow(values);
        exRow.height = 18;
        const bg = i % 2 === 0 ? 'FFFFFFFF' : 'FFEFF6FA';  // white / very-light-blue
        exRow.eachCell(cell => {
          cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
          cell.font      = { color: { argb: 'FF1A2F44' }, size: 10, name: 'Calibri' };  // dark navy — readable on any bg
          cell.alignment = { vertical: 'middle' };
          cell.border    = { bottom: { style: 'hair', color: { argb: 'FFCDDDE8' } } };
        });
        if (statusColumn && statusColor) {
          const color = statusColor(String(values[statusColumn] ?? ''), row);
          if (color) exRow.getCell(statusColumn).font = { color: { argb: `FF${color}` }, bold: true };
        }
      });

      // ── Footer metadata ──────────────────────────────────────────────────
      ws.addRow([]);
      const footer = ws.addRow([
        `Generated ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })} · ${data.length} record${data.length !== 1 ? 's' : ''} · Ozech MyOffice`,
      ]);
      footer.getCell(1).font = { size: 8, color: { argb: 'FF9BAAB8' }, italic: true, name: 'Calibri' };
      ws.mergeCells(footer.number, 1, footer.number, columns.length);

      ws.autoFilter = {
        from: { row: headerRowNum, column: 1 },
        to:   { row: headerRowNum, column: columns.length },
      };

      const buf = await wb.xlsx.writeBuffer();
      saveAs(
        new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
        `${filename}.xlsx`,
      );
      toast.success(`Excel exported — ${data.length} record${data.length !== 1 ? 's' : ''}`);
    } catch (err) {
      toast.error(`Export failed: ${(err as Error).message}`);
    }
  };

  const downloadPDF = async () => {
    setOpen(false);
    try {
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');

      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      let y = 12;

      if (title) {
        doc.setFontSize(14);
        doc.setTextColor(...EXPORT_BRAND_RGB);
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

      const statusColIdx = statusColumn ? pdfCols.findIndex(c => c.key === statusColumn) : -1;
      autoTable(doc, {
        startY: y,
        head: [pdfCols.map(c => c.label)],
        body: data.map(row => pdfCols.map(c => getVal(row, c))),
        styles: { fontSize: 8, cellPadding: { top: 2, bottom: 2, left: 3, right: 3 } },
        headStyles: {
          fillColor: EXPORT_BRAND_RGB, textColor: 255,
          fontStyle: 'bold', fontSize: 8,
        },
        alternateRowStyles: { fillColor: [245, 248, 252] },
        didParseCell: statusColIdx < 0 ? undefined : (cellData) => {
          if (cellData.section !== 'body' || cellData.column.index !== statusColIdx) return;
          const color = statusColor!(String(cellData.cell.raw ?? ''), data[cellData.row.index]);
          if (color) cellData.cell.styles.textColor = hexToRgb(color);
        },
        margin: { left: 14, right: 14 },
        tableLineColor: [200, 210, 220],
        tableLineWidth: 0.1,
      });

      doc.save(`${filename}.pdf`);
      toast.success(`PDF exported — ${data.length} record${data.length !== 1 ? 's' : ''}`);
    } catch (err) {
      toast.error(`Export failed: ${(err as Error).message}`);
    }
  };

  // A single offered format needs no dropdown — one direct-trigger button.
  if (formats.length === 1) {
    const onlyFormat = formats[0];
    const Icon = onlyFormat === 'excel' ? FileSpreadsheet : FileDown;
    return (
      <button
        type="button"
        onClick={onlyFormat === 'excel' ? downloadExcel : downloadPDF}
        className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold text-white border transition-all hover:-translate-y-0.5 bg-emerald-500/20 border-emerald-500/35 hover:bg-emerald-500/30 ${className}`}
      >
        <Icon className="h-3.5 w-3.5" />
        Download
      </button>
    );
  }

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
