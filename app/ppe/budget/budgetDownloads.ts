// app/ppe/budget/budgetDownloads.ts — the Budget view's XLSX (7 sheets) and PDF downloads.
// Built on the same libraries and brand as the other exports (exceljs, jsPDF,
// file-saver, EXPORT_BRAND_*), and the file name says the year and date via exportFilename.
// XLSX totals are real SUM formulas; budgetDownloads.test.ts reads them back and
// confirms they evaluate to the screen's totals.
'use client';

import { toast } from 'sonner';
import { EXPORT_BRAND_ARGB, EXPORT_BRAND_RGB, exportFilename, styleExcelHeaderRow } from '@/lib/exportUtils';
import { formatDate } from '@/lib/format';
import type { BudgetCalendar, BudgetResult, BudgetSettings } from './budgetCalc';

export const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function usd(n: number): string {
  return `USD ${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export interface BudgetDownloadMeta {
  year: number;
  people: number;
  useProvisional: boolean;
}

function pickQtyCost(line: BudgetResult['lines'][number], m: number, useProvisional: boolean) {
  const cell = line.months[m];
  return useProvisional ? { qty: cell.qty, cost: cell.cost } : { qty: cell.qtyBase, cost: cell.costBase };
}

function lineYear(line: BudgetResult['lines'][number], useProvisional: boolean) {
  return useProvisional ? { qty: line.yearQty, cost: line.yearCost } : { qty: line.yearQtyBase, cost: line.yearCostBase };
}

type Xlsx = typeof import('exceljs');

/** Build the workbook (pure apart from the exceljs import): sheets with real SUM totals. */
export function buildBudgetWorkbook(ExcelJS: Xlsx, result: BudgetResult, calendar: BudgetCalendar, settings: BudgetSettings, meta: BudgetDownloadMeta) {
  const { year, people, useProvisional } = meta;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Ozech MyOffice';
  wb.created = new Date();
  const money = (c: { numFmt?: string }) => { c.numFmt = '"USD" #,##0.00'; };

  const titleBlock = (ws: import('exceljs').Worksheet, title: string, subtitle: string, cols: number) => {
    const t = ws.addRow([title]);
    t.height = 24;
    t.getCell(1).font = { bold: true, size: 14, color: { argb: EXPORT_BRAND_ARGB } };
    ws.mergeCells(1, 1, 1, cols);
    const s = ws.addRow([subtitle]);
    s.getCell(1).font = { size: 9, italic: true, color: { argb: 'FF6B7B8E' } };
    ws.mergeCells(2, 1, 2, cols);
    ws.addRow([]);
    return 4; // first data row
  };

  // ── 1. Summary ──────────────────────────────────────────────────────────
  {
    const totalCost = useProvisional ? result.monthlyCost.reduce((a, b) => a + b, 0) : result.monthlyCostBase.reduce((a, b) => a + b, 0);
    const noPrice = result.lines.filter(l => l.noPrice).length;
    const biggest = result.byItem[0];
    const ws = wb.addWorksheet('Summary');
    const first = titleBlock(ws, `PPE Budget ${year}`, `${people} people${useProvisional ? ' (provisional starters included)' : ''} · ${formatDate(new Date())}`, 4);
    const head = ws.getRow(first);
    ['Metric', 'Value'].forEach((h, i) => { head.getCell(i + 1).value = h; });
    styleExcelHeaderRow(head);
    const rows: [string, string | number][] = [
      ['Total cost', totalCost],
      [`Lines without a price`, noPrice],
      ['Budget lines', result.lines.length],
      ['People', people],
      ['Biggest line', biggest ? `${biggest.item} (${usd(useProvisional ? biggest.cost : biggest.costBase)})` : '—'],
    ];
    rows.forEach(([k, v]) => {
      const r = ws.addRow([k, v]);
      if (typeof v === 'number') money(r.getCell(2));
    });
    ws.columns = [{ width: 26 }, { width: 30 }, { width: 16 }, { width: 18 }];
    const m0 = ws.rowCount + 2;
    const mh = ws.getRow(m0);
    ['Month', 'Quantity', 'Cost (USD)'].forEach((h, i) => { mh.getCell(i + 1).value = h; });
    styleExcelHeaderRow(mh);
    const monthly = useProvisional ? result.monthlyQty.map((q, i) => ({ q, c: result.monthlyCost[i] })) : result.monthlyQtyBase.map((q, i) => ({ q, c: result.monthlyCostBase[i] }));
    monthly.forEach((m, i) => {
      const r = ws.addRow([MONTH_SHORT[i], m.q, m.c]);
      money(r.getCell(3));
    });
    const totalRow = m0 + 13; // header at m0, 12 month rows at m0+1..m0+12, total below them
    const tr = ws.addRow(['Total', { formula: `SUM(B${m0 + 1}:B${totalRow - 1})` }, { formula: `SUM(C${m0 + 1}:C${totalRow - 1})` }]);
    tr.font = { bold: true };
    money(tr.getCell(3));
  }

  // ── 2. Monthly by line (quantity and cost) ──────────────────────────────
  {
    const ws = wb.addWorksheet('Monthly by line');
    const cols = 1 + 12 * 2 + 2;
    const first = titleBlock(ws, `PPE Budget ${year} — monthly by line`, result.lines.length + ' lines · quantities round up per month', cols);
    const head = ws.getRow(first);
    const headers = ['Item'];
    MONTH_SHORT.forEach(m => { headers.push(`${m} qty`, `${m} cost`); });
    headers.push('Year qty', 'Year cost');
    headers.forEach((h, i) => { head.getCell(i + 1).value = h; });
    styleExcelHeaderRow(head);
    ws.views = [{ state: 'frozen', ySplit: first, xSplit: 1 }];
    const colLetter = (n: number): string => {
      let s = '';
      while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); }
      return s;
    };
    result.lines.forEach((line, li) => {
      const rowNum = first + 1 + li;
      const vals: (string | number | { formula: string })[] = [line.item];
      let yearQty = 0, yearCost = 0;
      for (let m = 0; m < 12; m++) {
        const { qty, cost } = pickQtyCost(line, m, useProvisional);
        vals.push(qty, cost);
        yearQty += qty; yearCost += cost;
      }
      void yearQty; void yearCost;
      // Year totals are real formulas over the row's own month cells.
      const qtyCells = Array.from({ length: 12 }, (_, m) => `${colLetter(2 + m * 2)}${rowNum}`);
      const costCells = Array.from({ length: 12 }, (_, m) => `${colLetter(3 + m * 2)}${rowNum}`);
      const r = ws.addRow([...vals, { formula: `SUM(${qtyCells.join(',')})` }, { formula: `SUM(${costCells.join(',')})` }]);
      for (let m = 0; m < 12; m++) money(r.getCell(3 + m * 2));
      money(r.getCell(cols));
    });
    ws.columns = [{ width: 28 }, ...Array.from({ length: cols - 1 }, () => ({ width: 12 }))];
  }

  // ── 3. By section ───────────────────────────────────────────────────────
  {
    const ws = wb.addWorksheet('By section');
    const first = titleBlock(ws, `PPE Budget ${year} — by section`, 'Consumables split by qualifying headcount; card items by holder section', 3);
    const head = ws.getRow(first);
    ['Section', 'Quantity', 'Cost (USD)'].forEach((h, i) => { head.getCell(i + 1).value = h; });
    styleExcelHeaderRow(head);
    const rows = [...result.bySection].sort((a, b) => b.cost - a.cost);
    // The section split is headcount-based, so the base variant scales by the global base/full ratios.
    const factor = (base: number, full: number) => (useProvisional || full === 0 ? 1 : base / full);
    const qFactor = factor(result.monthlyQtyBase.reduce((a, b) => a + b, 0), result.monthlyQty.reduce((a, b) => a + b, 0));
    const cFactor = factor(result.monthlyCostBase.reduce((a, b) => a + b, 0), result.monthlyCost.reduce((a, b) => a + b, 0));
    rows.forEach(s => {
      const r = ws.addRow([s.section, Math.round(s.qty * qFactor), Math.round(s.cost * cFactor * 100) / 100]);
      money(r.getCell(3));
    });
    ws.columns = [{ width: 24 }, { width: 14 }, { width: 18 }];
  }

  // ── 4. Order by size (card items) ───────────────────────────────────────
  {
    const ws = wb.addWorksheet('Order by size');
    const first = titleBlock(ws, `PPE Budget ${year} — order by size`, 'Card items with each holder’s last size (boots, worksuits)', 4);
    const head = ws.getRow(first);
    ['Item', 'Holder', 'Size', 'Quantity'].forEach((h, i) => { head.getCell(i + 1).value = h; });
    styleExcelHeaderRow(head);
    for (const line of result.lines) {
      if (line.kind !== 'card') continue;
      for (const s of line.sizes) ws.addRow([line.item, s.personName, s.size || '—', s.qty]);
    }
    ws.columns = [{ width: 24 }, { width: 26 }, { width: 10 }, { width: 12 }];
  }

  // ── 5. New starters ─────────────────────────────────────────────────────
  {
    const ws = wb.addWorksheet('New starters');
    const first = titleBlock(ws, `PPE Budget ${year} — new starters`, 'Kit: ' + (result.starterKit.join(', ') || 'none'), 5);
    const head = ws.getRow(first);
    ['Group', 'Count', 'Start month', 'Boilermakers', 'Kit quantity each'].forEach((h, i) => { head.getCell(i + 1).value = h; });
    styleExcelHeaderRow(head);
    const groups: [string, BudgetSettings['confirmed']][] = [['Confirmed', settings.confirmed], ['Provisional', settings.provisional]];
    for (const [label, g] of groups) {
      ws.addRow([label, g.count, MONTH_SHORT[g.start_month - 1], g.boilermakers, result.starterKit.length]);
    }
    ws.columns = [{ width: 14 }, { width: 10 }, { width: 13 }, { width: 14 }, { width: 18 }];
  }

  // ── 6. Gaps ─────────────────────────────────────────────────────────────
  {
    const ws = wb.addWorksheet('Gaps');
    const first = titleBlock(ws, `PPE Budget ${year} — gaps`, settings.add_gaps_in_january ? 'Added in January: yes' : 'Added in January: no', 4);
    const head = ws.getRow(first);
    ['Person', 'Job title', 'Missing type', 'Added in January'].forEach((h, i) => { head.getCell(i + 1).value = h; });
    styleExcelHeaderRow(head);
    for (const g of result.gaps) ws.addRow([g.personName, g.title, g.type, settings.add_gaps_in_january ? 'Yes' : 'No']);
    ws.columns = [{ width: 26 }, { width: 22 }, { width: 20 }, { width: 16 }];
  }

  // ── 7. Assumptions ──────────────────────────────────────────────────────
  {
    const ws = wb.addWorksheet('Assumptions');
    const first = titleBlock(ws, `PPE Budget ${year} — assumptions`, 'Same strings the screen shows', 1);
    void first;
    for (const a of result.assumptions) ws.addRow([a]);
    ws.getColumn(1).width = 140;
  }

  return wb;
}

export async function downloadBudgetXlsx(result: BudgetResult, calendar: BudgetCalendar, settings: BudgetSettings, meta: BudgetDownloadMeta): Promise<boolean> {
  try {
    const ExcelJS = (await import('exceljs')).default;
    const { saveAs } = await import('file-saver');
    const wb = buildBudgetWorkbook(ExcelJS, result, calendar, settings, meta);
    const buf = await wb.xlsx.writeBuffer();
    saveAs(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `${exportFilename(`PPE_Budget_${meta.year}`)}.xlsx`);
    toast.success('Budget Excel downloaded.');
    return true;
  } catch (err) {
    toast.error(`Download failed: ${(err as Error).message}`);
    return false;
  }
}

/** Render a Recharts SVG element to a PNG data URL for the PDF. */
export async function svgToPng(svg: SVGSVGElement): Promise<string> {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  const rect = svg.getBoundingClientRect();
  clone.setAttribute('width', String(Math.max(1, Math.round(rect.width || 600))));
  clone.setAttribute('height', String(Math.max(1, Math.round(rect.height || 240))));
  const text = new XMLSerializer().serializeToString(clone);
  const url = URL.createObjectURL(new Blob([text], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('chart image failed to load'));
      img.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth || 600;
    canvas.height = img.naturalHeight || 240;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas unavailable');
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
    return canvas.toDataURL('image/png');
  } finally {
    URL.revokeObjectURL(url);
  }
}

export interface BudgetChartImages {
  monthlyCost: string;
  ranked: string;
}

export async function downloadBudgetPdf(
  result: BudgetResult,
  settings: BudgetSettings,
  meta: BudgetDownloadMeta,
  images: BudgetChartImages,
): Promise<boolean> {
  try {
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');
    const { year, people, useProvisional } = meta;
    const totalCost = useProvisional ? result.monthlyCost.reduce((a, b) => a + b, 0) : result.monthlyCostBase.reduce((a, b) => a + b, 0);
    const noPrice = result.lines.filter(l => l.noPrice).length;
    const biggest = result.byItem[0];
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 12;

    doc.setFontSize(14);
    doc.setTextColor(...EXPORT_BRAND_RGB);
    doc.setFont('helvetica', 'bold');
    doc.text(`PPE Budget ${year}`, 14, y);
    y += 6;
    doc.setFontSize(9);
    doc.setTextColor(90, 100, 110);
    doc.setFont('helvetica', 'normal');
    doc.text(`${formatDate(new Date())} · ${people} people${useProvisional ? ' (provisional starters included)' : ''}`, 14, y);
    y += 6;
    doc.setFontSize(10);
    doc.setTextColor(20, 30, 40);
    doc.text(`Total cost ${usd(totalCost)}${noPrice > 0 ? `  ·  +${noPrice} line${noPrice === 1 ? '' : 's'} without a price` : ''}  ·  ${result.lines.length} lines  ·  Biggest line: ${biggest ? `${biggest.item} (${usd(useProvisional ? biggest.cost : biggest.costBase)})` : '—'}`, 14, y);
    y += 8;

    const imgWidth = (pageWidth - 42) / 2;
    doc.addImage(images.monthlyCost, 'PNG', 14, y, imgWidth, imgWidth * 0.42);
    doc.addImage(images.ranked, 'PNG', 28 + imgWidth, y, imgWidth, imgWidth * 0.42);
    y += imgWidth * 0.42 + 8;

    doc.setFontSize(11);
    doc.setTextColor(...EXPORT_BRAND_RGB);
    doc.setFont('helvetica', 'bold');
    doc.text('Monthly grid (cost, USD)', 14, y);
    y += 2;
    const head = [['Item', ...MONTH_SHORT, 'Year']];
    const body = result.lines.map(l => {
      const cells = [l.item];
      for (let m = 0; m < 12; m++) cells.push(String(Math.round((useProvisional ? l.months[m].cost : l.months[m].costBase) * 100) / 100));
      const yt = lineYear(l, useProvisional);
      cells.push(String(Math.round(yt.cost * 100) / 100));
      return cells;
    });
    autoTable(doc, {
      startY: y,
      head, body,
      styles: { fontSize: 6.5, cellPadding: 1.5 },
      headStyles: { fillColor: EXPORT_BRAND_RGB, textColor: 255, fontStyle: 'bold', fontSize: 6.5 },
      alternateRowStyles: { fillColor: [245, 248, 252] },
      margin: { left: 14, right: 14 },
      showHead: 'everyPage',
    });

    doc.addPage('a4', 'landscape');
    let y2 = 12;
    doc.setFontSize(11);
    doc.setTextColor(...EXPORT_BRAND_RGB);
    doc.setFont('helvetica', 'bold');
    doc.text('Assumptions', 14, y2);
    y2 += 6;
    doc.setFontSize(8.5);
    doc.setTextColor(40, 50, 60);
    doc.setFont('helvetica', 'normal');
    for (const a of result.assumptions) {
      const wrapped = doc.splitTextToSize(`• ${a}`, pageWidth - 28);
      if (y2 + wrapped.length * 4.5 > 195) { doc.addPage('a4', 'landscape'); y2 = 12; }
      doc.text(wrapped, 14, y2);
      y2 += wrapped.length * 4.5 + 2;
    }
    void settings;

    doc.save(`${exportFilename(`PPE_Budget_${year}`)}.pdf`);
    toast.success('Budget PDF downloaded.');
    return true;
  } catch (err) {
    toast.error(`Download failed: ${(err as Error).message}`);
    return false;
  }
}
