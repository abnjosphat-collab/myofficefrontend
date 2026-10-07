// app/tools/toolsExports.ts — downloads of whatever table the Tools workspace is showing, as Excel, Word or PDF.
// All three share one look: a deep-green title band over a quiet grey subtitle, a solid header row, softly striped body rows, status
// words in a colour that matches the screen, and page numbers. Type pairing: a serif for the title (Cambria in Excel and Word, Times
// in the PDF) over a clean sans for the table (Calibri in Excel and Word, Helvetica in the PDF); each is the most refined pair that
// ships on the machine that opens the file, so nothing depends on a font being installed.
import ExcelJS from 'exceljs';
import {
  AlignmentType, BorderStyle, Document, Footer, Header, HeadingLevel, Packer, PageNumber, PageOrientation, Paragraph, ShadingType,
  Table, TableCell, TableRow, TextRun, VerticalAlign, WidthType,
} from 'docx';
import { saveAs } from 'file-saver';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export type ExportFormat = 'xlsx' | 'docx' | 'pdf';
export type ExportTable = {
  title: string;
  headers: string[];
  rows: (string | number)[][];
  /** A line under the title, such as the scope and the number of items. The date it was produced is added after it. */
  subtitle?: string;
};

const ORGANISATION = 'Dallaglio Portable Tools and Equipment';
const INK = '233B31';          // deep green: title band, header row
const STRIPE = 'F4F7F5';       // body stripe
const RULE = 'DDE5E0';         // hairline between rows
const MUTED = '6B7A72';        // subtitle, footer
const STATUS_COLOURS: Record<string, string> = {
  'ready to use': '1F6B4F', 'with an employee': '2B5C99', 'return overdue': 'A13F47', 'needs attention': '8A5D18', archived: '6B7A72',
};
const text = (value: string | number | undefined | null) => String(value ?? '');
const statusColour = (value: string | number) => STATUS_COLOURS[text(value).trim().toLowerCase()];
const statusColumn = (headers: string[]) => headers.findIndex(header => header.trim().toLowerCase() === 'status');
const generated = () => new Date().toLocaleString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const metaLine = (data: ExportTable) => [data.subtitle, `Generated ${generated()}`].filter(Boolean).join('  ·  ');
const fileName = (title: string) => title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const hex = (value: string) => value.replace('#', '');
const argb = (value: string) => `FF${hex(value)}`;
const widths = (data: ExportTable) => data.headers.map((header, index) => Math.min(44, Math.max(12, header.length + 4, ...data.rows.map(row => text(row[index]).length + 3))));

export async function exportTable(format: ExportFormat, data: ExportTable) {
  if (format === 'xlsx') return saveAs(await workbook(data), `${fileName(data.title)}.xlsx`);
  if (format === 'docx') return saveAs(await wordDocument(data), `${fileName(data.title)}.docx`);
  return pdfDocument(data).save(`${fileName(data.title)}.pdf`);
}

// ─── Excel ───────────────────────────────────────────────────────────────────────────

/** The row the column headings sit on: a title, a subtitle and one spacer sit above it. */
export const EXCEL_HEADER_ROW = 4;

async function workbook(data: ExportTable): Promise<Blob> {
  const book = new ExcelJS.Workbook();
  book.creator = ORGANISATION;
  book.created = new Date();
  const sheet = book.addWorksheet(data.title.slice(0, 31), {
    views: [{ state: 'frozen', ySplit: EXCEL_HEADER_ROW, showGridLines: false }],
    pageSetup: { orientation: data.headers.length > 6 ? 'landscape' : 'portrait', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0, margins: { left: 0.5, right: 0.5, top: 0.6, bottom: 0.7, header: 0.3, footer: 0.3 }, printTitlesRow: `${EXCEL_HEADER_ROW}:${EXCEL_HEADER_ROW}` },
    headerFooter: { oddFooter: `&L&"Calibri,Regular"&8${ORGANISATION}&R&"Calibri,Regular"&8Page &P of &N` },
  });
  const last = data.headers.length;
  widths(data).forEach((width, index) => { sheet.getColumn(index + 1).width = width; });

  sheet.mergeCells(1, 1, 1, last);
  const title = sheet.getCell(1, 1);
  title.value = data.title;
  title.font = { name: 'Cambria', size: 20, bold: true, color: { argb: argb(INK) } };
  title.alignment = { vertical: 'middle' };
  sheet.getRow(1).height = 34;
  sheet.mergeCells(2, 1, 2, last);
  const subtitle = sheet.getCell(2, 1);
  subtitle.value = metaLine(data);
  subtitle.font = { name: 'Calibri', size: 10, color: { argb: argb(MUTED) } };
  subtitle.alignment = { vertical: 'middle' };
  sheet.getRow(2).height = 18;
  sheet.getRow(3).height = 8;

  const header = sheet.getRow(EXCEL_HEADER_ROW);
  header.values = data.headers;
  header.height = 28;
  header.eachCell(cell => {
    cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb(INK) } };
    cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true, indent: 1 };
  });

  const status = statusColumn(data.headers);
  data.rows.forEach((values, index) => {
    const row = sheet.getRow(EXCEL_HEADER_ROW + 1 + index);
    row.values = values.map(text);
    row.height = 21;
    row.eachCell({ includeEmpty: true }, (cell, column) => {
      cell.font = { name: 'Calibri', size: 10.5, color: { argb: 'FF1C2622' } };
      cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true, indent: 1 };
      cell.border = { bottom: { style: 'thin', color: { argb: argb(RULE) } } };
      if (index % 2 === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argb(STRIPE) } };
      if (column - 1 === status && statusColour(values[status])) cell.font = { name: 'Calibri', size: 10.5, bold: true, color: { argb: argb(statusColour(values[status])!) } };
    });
  });

  if (data.rows.length) sheet.autoFilter = { from: { row: EXCEL_HEADER_ROW, column: 1 }, to: { row: EXCEL_HEADER_ROW + data.rows.length, column: last } };
  const footer = sheet.getRow(EXCEL_HEADER_ROW + data.rows.length + 2);
  footer.getCell(1).value = `${data.rows.length} ${data.rows.length === 1 ? 'item' : 'items'}`;
  footer.getCell(1).font = { name: 'Calibri', size: 9, italic: true, color: { argb: argb(MUTED) } };
  return new Blob([await book.xlsx.writeBuffer()], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

// ─── Word ────────────────────────────────────────────────────────────────────────────

// Printable width in twips on A4 (landscape 16838, portrait 11906) less the 1000-twip margins either side.
const TWIPS_LANDSCAPE = 16838 - 2 * 1000;
const TWIPS_PORTRAIT = 11906 - 2 * 1000;

async function wordDocument(data: ExportTable): Promise<Blob> {
  const landscape = data.headers.length > 6;
  const total = landscape ? TWIPS_LANDSCAPE : TWIPS_PORTRAIT;
  const weights = widths(data);
  const sum = weights.reduce((a, b) => a + b, 0);
  const columnWidths = weights.map(weight => Math.floor((weight / sum) * total));
  const status = statusColumn(data.headers);
  const line = { style: BorderStyle.SINGLE, size: 4, color: RULE };
  const none = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
  const cell = (value: string | number, column: number, options: { head?: boolean; shade?: boolean }) => new TableCell({
    width: { size: columnWidths[column], type: WidthType.DXA },
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 70, bottom: 70, left: 110, right: 90 },
    shading: options.head ? { type: ShadingType.CLEAR, color: 'auto', fill: INK } : options.shade ? { type: ShadingType.CLEAR, color: 'auto', fill: STRIPE } : undefined,
    borders: { top: none, left: none, right: none, bottom: options.head ? none : line },
    children: [new Paragraph({ children: [new TextRun({
      text: text(value), font: 'Calibri', size: options.head ? 21 : 20, bold: options.head || (column === status && !!statusColour(value)),
      color: options.head ? 'FFFFFF' : column === status && statusColour(value) ? statusColour(value) : '1C2622',
    })] })],
  });
  const table = new Table({
    width: { size: total, type: WidthType.DXA },
    columnWidths,
    rows: [
      new TableRow({ tableHeader: true, cantSplit: true, children: data.headers.map((header, column) => cell(header, column, { head: true })) }),
      ...data.rows.map((row, index) => new TableRow({ cantSplit: true, children: data.headers.map((_, column) => cell(row[column] ?? '', column, { shade: index % 2 === 1 })) })),
    ],
  });
  const document = new Document({
    creator: ORGANISATION,
    title: data.title,
    styles: { default: { document: { run: { font: 'Calibri', size: 20 } } } },
    sections: [{
      properties: { page: { size: { orientation: landscape ? PageOrientation.LANDSCAPE : PageOrientation.PORTRAIT }, margin: { top: 1000, bottom: 1000, left: 1000, right: 1000 } } },
      headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: ORGANISATION, font: 'Calibri', size: 16, color: MUTED })] })] }) },
      footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: 'Page ', font: 'Calibri', size: 16, color: MUTED }), new TextRun({ children: [PageNumber.CURRENT], font: 'Calibri', size: 16, color: MUTED }), new TextRun({ text: ' of ', font: 'Calibri', size: 16, color: MUTED }), new TextRun({ children: [PageNumber.TOTAL_PAGES], font: 'Calibri', size: 16, color: MUTED })] })] }) },
      children: [
        new Paragraph({ heading: HeadingLevel.TITLE, spacing: { after: 60 }, children: [new TextRun({ text: data.title, font: 'Cambria', size: 44, bold: true, color: INK })] }),
        new Paragraph({ spacing: { after: 240 }, border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: INK, space: 6 } }, children: [new TextRun({ text: metaLine(data), font: 'Calibri', size: 19, color: MUTED })] }),
        table,
        new Paragraph({ spacing: { before: 160 }, children: [new TextRun({ text: `${data.rows.length} ${data.rows.length === 1 ? 'item' : 'items'}`, font: 'Calibri', size: 17, italics: true, color: MUTED })] }),
      ],
    }],
  });
  return Packer.toBlob(document);
}

// ─── PDF ─────────────────────────────────────────────────────────────────────────────

const rgb = (value: string): [number, number, number] => [parseInt(value.slice(0, 2), 16), parseInt(value.slice(2, 4), 16), parseInt(value.slice(4, 6), 16)];

function pdfDocument(data: ExportTable): jsPDF {
  const landscape = data.headers.length > 6;
  const pdf = new jsPDF({ orientation: landscape ? 'landscape' : 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  // title band
  pdf.setFillColor(...rgb(INK));
  pdf.rect(0, 0, pageWidth, 26, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('times', 'bold');
  pdf.setFontSize(20);
  pdf.text(data.title, 14, 14);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(214, 226, 219);
  pdf.text(metaLine(data), 14, 21);
  const status = statusColumn(data.headers);
  autoTable(pdf, {
    head: [data.headers],
    body: data.rows.map(row => data.headers.map((_, column) => text(row[column]))),
    startY: 32,
    margin: { left: 14, right: 14, bottom: 16 },
    theme: 'striped',
    styles: { font: 'helvetica', fontSize: 8.5, cellPadding: { top: 2.6, bottom: 2.6, left: 3, right: 3 }, textColor: rgb('1C2622'), lineColor: rgb(RULE), lineWidth: 0 },
    headStyles: { fillColor: rgb(INK), textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
    alternateRowStyles: { fillColor: rgb(STRIPE) },
    didParseCell: hook => {
      if (hook.section === 'body' && hook.column.index === status) {
        const colour = statusColour(hook.cell.raw as string);
        if (colour) { hook.cell.styles.textColor = rgb(colour); hook.cell.styles.fontStyle = 'bold'; }
      }
    },
  });
  const pages = pdf.getNumberOfPages();
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(...rgb(MUTED));
  for (let page = 1; page <= pages; page++) {
    pdf.setPage(page);
    pdf.text(ORGANISATION, 14, pageHeight - 8);
    pdf.text(`Page ${page} of ${pages}`, pageWidth - 14, pageHeight - 8, { align: 'right' });
  }
  return pdf;
}
