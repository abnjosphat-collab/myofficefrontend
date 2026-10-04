// app/quotations/exportQuotation.ts — the quotation as a PDF or a Word file. Both are built in the browser from the draft on screen;
// nothing is sent anywhere. The PDF uses a table that breaks across pages (a long description wraps instead of being cut) and
// puts the notes and terms after it, starting a new page when they would not fit.
import { amountOf, clientLabel, fileNameOf, money, themeOf, totalsOf, usedLines, type Company, type Draft } from './quotationLogic';

const NUMBER = (v: string) => { const n = parseFloat(v); return Number.isFinite(n) ? n : 0; };
const place = (c: { address: string; city: string; country: string }) => [c.address, c.city, c.country].filter(Boolean).join(', ');
const qty = (v: string) => String(NUMBER(v));

export async function exportPdf(d: Draft, company: Company): Promise<string> {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');
  const theme = themeOf(d.theme);
  const totals = totalsOf(d);
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = 210; const M = 18;
  doc.setProperties({ title: `Quotation ${d.number}`, author: company.name || undefined });

  // Header band
  doc.setFillColor(...theme.rgb); doc.rect(0, 0, W, 44, 'F');
  let textX = M;
  if (company.logo) { try { doc.addImage(company.logo, company.logo.includes('image/png') ? 'PNG' : 'JPEG', M, 9, 26, 26); textX = M + 32; } catch { /* a logo that cannot be drawn is left out */ } }
  doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.text(company.name || 'Your company', textX, 17);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
  [company.tagline, [company.email, company.phone].filter(Boolean).join('  ·  '), place(company), company.taxId ? `Tax ID ${company.taxId}` : ''].filter(Boolean).slice(0, 4).forEach((l, i) => doc.text(l, textX, 24 + i * 5));
  doc.setFont('helvetica', 'bold'); doc.setFontSize(20); doc.text('QUOTATION', W - M, 17, { align: 'right' });
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
  doc.text(`Number ${d.number}`, W - M, 25, { align: 'right' }); doc.text(`Date ${d.date}`, W - M, 31, { align: 'right' }); if (d.validUntil) doc.text(`Valid until ${d.validUntil}`, W - M, 37, { align: 'right' });

  // Bill to
  doc.setTextColor(0, 0, 0); doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.text('FOR', M, 56);
  doc.setFont('helvetica', 'normal');
  const who = [d.client.name, d.client.company, d.client.email, d.client.phone, place(d.client)].filter(Boolean);
  who.forEach((l, i) => doc.text(l, M, 62 + i * 5));
  doc.setFont('helvetica', 'bold'); doc.text('TERMS', 120, 56); doc.setFont('helvetica', 'normal');
  doc.text(`Payment: ${d.paymentTerms}`, 120, 62); doc.text(`Delivery: ${d.deliveryTime}`, 120, 67);

  // Items
  autoTable(doc, {
    startY: 62 + Math.max(who.length, 2) * 5 + 6, margin: { left: M, right: M },
    head: [['Description', 'Qty', 'Rate', 'Amount']],
    body: usedLines(d).map(l => [l.description, qty(l.quantity), money(NUMBER(l.rate), d.currency), money(amountOf(l), d.currency)]),
    styles: { fontSize: 9, cellPadding: 2.5, overflow: 'linebreak' }, headStyles: { fillColor: theme.rgb, textColor: 255, fontStyle: 'bold' }, alternateRowStyles: { fillColor: [245, 245, 245] },
    columnStyles: { 0: { cellWidth: 'auto' }, 1: { halign: 'right', cellWidth: 18 }, 2: { halign: 'right', cellWidth: 30 }, 3: { halign: 'right', cellWidth: 32 } },
  });
  let y = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 120) + 8;

  // Totals
  if (y > 240) { doc.addPage(); y = 20; }
  const rows: [string, string, boolean][] = [['Subtotal', money(totals.subtotal, d.currency), false], [`Tax (${NUMBER(d.taxRate)}%)`, money(totals.tax, d.currency), false], [`Discount (${NUMBER(d.discount)}%)`, `-${money(totals.discount, d.currency)}`, false], ['Total', money(totals.total, d.currency), true]];
  rows.forEach(([label, value, bold]) => { doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setFontSize(bold ? 12 : 10); doc.text(label, 128, y); doc.text(value, W - M, y, { align: 'right' }); y += bold ? 8 : 6; });
  y += 4;

  // Notes and terms, new page when they do not fit
  const block = (title: string, body: string) => {
    if (!body.trim()) return;
    const lines = doc.splitTextToSize(body, W - 2 * M) as string[];
    doc.setFontSize(10);
    if (y + 12 > 275) { doc.addPage(); y = 20; }
    doc.setFont('helvetica', 'bold'); doc.text(title, M, y); y += 5; doc.setFont('helvetica', 'normal');
    lines.forEach(line => { if (y > 280) { doc.addPage(); y = 20; } doc.text(line, M, y); y += 4.6; });
    y += 4;
  };
  block('Notes', d.notes); block('Terms and conditions', d.terms);

  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) { doc.setPage(p); doc.setFontSize(8); doc.setTextColor(120, 120, 120); doc.text(`${company.name || 'Quotation'}  ·  ${d.number}  ·  page ${p} of ${pages}`, W / 2, 290, { align: 'center' }); }
  const name = fileNameOf(d, 'pdf');
  doc.save(name);
  return name;
}

export async function exportWord(d: Draft, company: Company): Promise<string> {
  const { Document, Packer, Paragraph, TextRun, AlignmentType, Table, TableCell, TableRow, WidthType, BorderStyle, ShadingType } = await import('docx');
  const { saveAs } = await import('file-saver');
  const theme = themeOf(d.theme);
  const totals = totalsOf(d);
  const p = (text: string, o: { bold?: boolean; size?: number; color?: string; align?: (typeof AlignmentType)[keyof typeof AlignmentType]; after?: number; before?: number } = {}) =>
    new Paragraph({ alignment: o.align, spacing: { after: o.after ?? 80, before: o.before ?? 0 }, children: [new TextRun({ text, bold: o.bold, size: o.size, color: o.color })] });
  const border = { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' } as const;
  const cell = (text: string, o: { head?: boolean; right?: boolean; width?: number } = {}) => new TableCell({
    width: o.width ? { size: o.width, type: WidthType.PERCENTAGE } : undefined, borders: { top: border, bottom: border, left: border, right: border },
    shading: o.head ? { type: ShadingType.CLEAR, fill: theme.hex, color: 'auto' } : undefined,
    children: [new Paragraph({ alignment: o.right ? AlignmentType.RIGHT : AlignmentType.LEFT, children: [new TextRun({ text, bold: o.head, color: o.head ? 'FFFFFF' : undefined })] })],
  });
  const para = (title: string, body: string) => (body.trim() ? [p(title, { bold: true, before: 240 }), ...body.split(/\r?\n/).map(l => p(l))] : []);
  const doc = new Document({
    creator: company.name || 'MyOffice', title: `Quotation ${d.number}`,
    sections: [{
      children: [
        p(company.name || 'Your company', { bold: true, size: 32, color: theme.hex }),
        ...[company.tagline, [company.email, company.phone].filter(Boolean).join('  ·  '), place(company), company.taxId ? `Tax ID ${company.taxId}` : ''].filter(Boolean).map(l => p(l, { color: '6B7280' })),
        p('QUOTATION', { bold: true, size: 36, color: theme.hex, align: AlignmentType.RIGHT, before: 200 }),
        p(`Number ${d.number}`, { bold: true, align: AlignmentType.RIGHT }), p(`Date ${d.date}`, { align: AlignmentType.RIGHT }), ...(d.validUntil ? [p(`Valid until ${d.validUntil}`, { align: AlignmentType.RIGHT })] : []),
        p('For', { bold: true, before: 240 }), ...[d.client.name, d.client.company, d.client.email, d.client.phone, place(d.client)].filter(Boolean).map(l => p(l)),
        p(`Payment: ${d.paymentTerms}    Delivery: ${d.deliveryTime}`, { before: 160, after: 200 }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({ tableHeader: true, children: [cell('Description', { head: true, width: 52 }), cell('Qty', { head: true, right: true, width: 10 }), cell('Rate', { head: true, right: true, width: 18 }), cell('Amount', { head: true, right: true, width: 20 })] }),
            ...usedLines(d).map(l => new TableRow({ children: [cell(l.description), cell(qty(l.quantity), { right: true }), cell(money(NUMBER(l.rate), d.currency), { right: true }), cell(money(amountOf(l), d.currency), { right: true })] })),
          ],
        }),
        p(`Subtotal  ${money(totals.subtotal, d.currency)}`, { align: AlignmentType.RIGHT, before: 240 }), p(`Tax (${NUMBER(d.taxRate)}%)  ${money(totals.tax, d.currency)}`, { align: AlignmentType.RIGHT }),
        p(`Discount (${NUMBER(d.discount)}%)  -${money(totals.discount, d.currency)}`, { align: AlignmentType.RIGHT }), p(`Total  ${money(totals.total, d.currency)}`, { bold: true, size: 26, align: AlignmentType.RIGHT }),
        ...para('Notes', d.notes), ...para('Terms and conditions', d.terms),
        p(`${clientLabel(d.client)}  ·  ${d.number}`, { color: '9CA3AF', size: 16, align: AlignmentType.CENTER, before: 400 }),
      ],
    }],
  });
  const name = fileNameOf(d, 'docx');
  saveAs(await Packer.toBlob(doc), name);
  return name;
}
