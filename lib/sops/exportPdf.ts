// lib/sops/exportPdf.ts — generates a PDF snapshot of one SopDocument via
// @react-pdf/renderer (already an installed dependency — no new package). Same
// canonical DTO as exportWord.ts and the on-screen card; this is a rendering of
// the saved data, not a screenshot/HTML scrape of the UI.
import { pdf, Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { createElement as h } from 'react';
import { saveAs } from 'file-saver';
import { SOP_SECTION_LABELS, SOP_STATUS_LABEL, SOP_RISK_TIER_LABEL, type SopDocument } from './types';

const BRAND = '#7c3aed';
const MUTED = '#6b7280';
const BORDER = '#e5e7eb';

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: 'Helvetica', color: '#111827' },
  eyebrow: { fontSize: 10, color: MUTED, marginBottom: 4 },
  title: { fontSize: 22, fontWeight: 700, color: BRAND, marginBottom: 4 },
  subtitle: { fontSize: 11, color: MUTED, marginBottom: 16 },
  metaTable: { borderWidth: 1, borderColor: BORDER, marginBottom: 16 },
  metaRow: { flexDirection: 'row', borderBottomWidth: 1, borderColor: BORDER },
  metaRowLast: { flexDirection: 'row' },
  metaLabel: { width: '30%', backgroundColor: '#f3f4f6', padding: 6, fontWeight: 700, fontSize: 9 },
  metaValue: { width: '70%', padding: 6, fontSize: 9 },
  h2: { fontSize: 13, fontWeight: 700, color: BRAND, marginTop: 14, marginBottom: 6 },
  body: { fontSize: 10, lineHeight: 1.5, marginBottom: 4 },
  footer: { position: 'absolute', bottom: 24, left: 40, right: 40, fontSize: 8, color: MUTED, borderTopWidth: 1, borderColor: BORDER, paddingTop: 8 },
});

function MetaRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return h(View, { style: last ? styles.metaRowLast : styles.metaRow }, [
    h(Text, { style: styles.metaLabel, key: 'l' }, label),
    h(Text, { style: styles.metaValue, key: 'v' }, value || '—'),
  ]);
}

function buildSopPdfDocument(sop: SopDocument) {
  const meta: [string, string][] = [
    ['Department', sop.department],
    ['Owner', sop.owner],
    ['Approver', sop.approver ?? ''],
    ['Classification', sop.classification],
    ['Risk Tier', sop.risk_tier ? SOP_RISK_TIER_LABEL[sop.risk_tier] : ''],
    ['Effective Date', sop.effective_date ?? ''],
    ['Next Review Date', sop.next_review_date ?? ''],
    ['Supersedes', sop.supersedes ?? ''],
    ['Tags', sop.tags.join(', ')],
  ];

  return h(Document, {}, h(Page, { size: 'A4', style: styles.page }, [
    h(Text, { style: styles.eyebrow, key: 'eyebrow' }, 'Ozech Investments'),
    h(Text, { style: styles.title, key: 'title' }, sop.title),
    h(Text, { style: styles.subtitle, key: 'subtitle' }, `${sop.code} · ${SOP_STATUS_LABEL[sop.status]} · v${sop.version}`),

    h(View, { style: styles.metaTable, key: 'meta' },
      meta.map(([label, value], i) => h(MetaRow, { key: label, label, value, last: i === meta.length - 1 })),
    ),

    h(Text, { style: styles.h2, key: 'summary-h' }, 'Summary'),
    h(Text, { style: styles.body, key: 'summary-b' }, sop.summary || 'No summary provided.'),

    ...SOP_SECTION_LABELS.flatMap(({ key, label }) => {
      const text = sop.sections[key]?.trim() || 'Not yet documented.';
      return [
        h(Text, { style: styles.h2, key: `${key}-h` }, label),
        ...text.split('\n').map((line, i) => h(Text, { style: styles.body, key: `${key}-${i}` }, line)),
      ];
    }),

    h(View, { style: styles.footer, key: 'footer', fixed: true }, [
      h(Text, { key: '1' }, `Exported ${new Date().toLocaleString()} · saved version ${sop.version} · last updated ${new Date(sop.updated_at).toLocaleString()}`),
      h(Text, { key: '2' }, 'This is a versioned snapshot as saved at export time — future changes will not update this downloaded file.'),
    ]),
  ]));
}

export async function exportSopToPdf(sop: SopDocument): Promise<void> {
  const blob = await pdf(buildSopPdfDocument(sop)).toBlob();
  saveAs(blob, `${sop.code || 'SOP'}-v${sop.version}.pdf`);
}
