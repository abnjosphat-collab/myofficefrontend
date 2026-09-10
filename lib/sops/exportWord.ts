// lib/sops/exportWord.ts — generates a Word (.docx) snapshot of one SopDocument.
// Reuses the docx + file-saver libraries already installed for app/quotations —
// no new dependency. Generated on demand from the SAME canonical DTO the page
// and PDF exporter both read (lib/sops/types.ts) — never a separately-maintained
// copy of the content.
import { Document, Packer, Paragraph, TextRun, Table, TableCell, TableRow, WidthType, BorderStyle, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';
import { SOP_SECTION_LABELS, SOP_STATUS_LABEL, SOP_RISK_TIER_LABEL, type SopDocument } from './types';

const BRAND = '7c3aed'; // ACCENT_HEX.violet — matches the app's hero/brand accent
const MUTED = '6b7280';
const BORDER = 'd1d5db';

function metaRow(label: string, value: string) {
  return new TableRow({
    children: [
      new TableCell({
        width: { size: 30, type: WidthType.PERCENTAGE },
        shading: { fill: 'f3f4f6' },
        children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, size: 18 })] })],
      }),
      new TableCell({
        width: { size: 70, type: WidthType.PERCENTAGE },
        children: [new Paragraph({ children: [new TextRun({ text: value || '—', size: 18 })] })],
      }),
    ],
  });
}

export async function exportSopToWord(sop: SopDocument): Promise<void> {
  const cellBorders = {
    top: { style: BorderStyle.SINGLE, size: 1, color: BORDER },
    bottom: { style: BorderStyle.SINGLE, size: 1, color: BORDER },
    left: { style: BorderStyle.SINGLE, size: 1, color: BORDER },
    right: { style: BorderStyle.SINGLE, size: 1, color: BORDER },
  };

  const sectionParagraphs = SOP_SECTION_LABELS.flatMap(({ key, label }) => {
    const text = sop.sections[key]?.trim();
    return [
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: label, bold: true, size: 24, color: BRAND })],
        spacing: { before: 300, after: 120 },
      }),
      ...(text ? text.split('\n') : ['Not yet documented.']).map(
        line => new Paragraph({ children: [new TextRun({ text: line, size: 20 })], spacing: { after: 80 } }),
      ),
    ];
  });

  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({ children: [new TextRun({ text: 'Ozech Investments', bold: true, size: 20, color: MUTED })], spacing: { after: 100 } }),
        new Paragraph({ children: [new TextRun({ text: sop.title, bold: true, size: 36, color: BRAND })], spacing: { after: 60 } }),
        new Paragraph({ children: [new TextRun({ text: `${sop.code} · ${SOP_STATUS_LABEL[sop.status]} · v${sop.version}`, size: 20, color: MUTED })], spacing: { after: 300 } }),

        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: cellBorders,
          rows: [
            metaRow('Department', sop.department),
            metaRow('Owner', sop.owner),
            metaRow('Approver', sop.approver ?? ''),
            metaRow('Classification', sop.classification),
            metaRow('Risk Tier', sop.risk_tier ? SOP_RISK_TIER_LABEL[sop.risk_tier] : ''),
            metaRow('Effective Date', sop.effective_date ?? ''),
            metaRow('Next Review Date', sop.next_review_date ?? ''),
            metaRow('Supersedes', sop.supersedes ?? ''),
            metaRow('Tags', sop.tags.join(', ')),
          ],
        }),

        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun({ text: 'Summary', bold: true, size: 24, color: BRAND })],
          spacing: { before: 300, after: 120 },
        }),
        new Paragraph({ children: [new TextRun({ text: sop.summary || 'No summary provided.', size: 20 })], spacing: { after: 200 } }),

        ...sectionParagraphs,

        new Paragraph({
          children: [new TextRun({
            text: `Exported ${new Date().toLocaleString()} · saved version ${sop.version} · last updated ${new Date(sop.updated_at).toLocaleString()}`,
            size: 14, italics: true, color: MUTED,
          })],
          spacing: { before: 500 },
        }),
        new Paragraph({
          children: [new TextRun({
            text: 'This is a versioned snapshot of the SOP as saved at export time. Future changes made in MyOffice will not update this downloaded file — re-export to get the latest version.',
            size: 14, italics: true, color: MUTED,
          })],
          spacing: { before: 80 },
        }),
      ],
    }],
    styles: {
      default: { document: { run: { font: 'Calibri' } } },
    },
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${sop.code || 'SOP'}-v${sop.version}.docx`);
}
