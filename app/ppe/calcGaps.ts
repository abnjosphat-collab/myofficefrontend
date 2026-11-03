// app/ppe/calcGaps.ts — TEMPORARY Mining data-cleanup view (2026-11).
//
// Pure gap detection over the register holders: implausible issue dates,
// missing sizes, people with no PPE, missing job titles, plus the static
// import-quarantine and cross-listed info lists. Delete this file, GapsView,
// and the Mining "gaps" tab wiring in page.tsx to remove the feature.
import type { EmployeeWithPPE, PPERecord } from './types';
import { typeName } from './ppeMeta';

export interface GapRow {
  key: string;
  employeeId: string;
  employeeName: string;
  detail: string;
  item: string;
  date: string;
}

export interface GapSection {
  id: 'dates' | 'sizes' | 'no-ppe' | 'no-title' | 'quarantine' | 'cross-listed';
  title: string;
  blurb: string;
  rows: GapRow[];
}

/** Import cells refused as unreadable: kept out of the register until the true value arrives. */
export const QUARANTINED: GapRow[] = [
  { key: 'C0892-safety_shoes', employeeId: 'C0892', employeeName: '', item: 'Safety Shoes', date: '3/31/2003/26', detail: 'Unreadable issue date in the source file; row refused at import.' },
];

/** Mine numbers that also exist in Engineering: they stay there until HR resolves them. */
export const CROSS_LISTED: GapRow[] = [
  'C0335', 'C0912', 'C0896', 'C1760', 'C0790', 'C0791', 'C0656', 'C1088',
  'C1162', 'C1409', 'C1517', 'C0897', 'C1423', 'C1758', 'C0498', 'C0507',
].map(n => ({ key: n, employeeId: n, employeeName: '', item: '', date: '', detail: 'Also on the Engineering register; excluded from the Mining import.' }));

const yearOf = (iso: string): number | null => {
  const m = /^(\d{4})-\d{2}-\d{2}$/.exec((iso || '').slice(0, 10));
  return m ? Number(m[1]) : null;
};

const rowKey = (r: PPERecord) => String(r.id);

/** Flag issue years before minYear or after maxYear (defaults: 2023 through this year). */
export function calcGaps(holders: EmployeeWithPPE[], now = new Date(), minYear = 2023): GapSection[] {
  const maxYear = now.getFullYear();
  const dates: GapRow[] = [];
  const sizes: GapRow[] = [];
  const noPpe: GapRow[] = [];
  const noTitle: GapRow[] = [];
  for (const h of holders) {
    if ((h.position || '').trim() === '') {
      noTitle.push({ key: h.employee_id, employeeId: h.employee_id, employeeName: h.employee_name, detail: 'No job title on the register.', item: '', date: '' });
    }
    if (h.records.length === 0) {
      noPpe.push({ key: h.employee_id, employeeId: h.employee_id, employeeName: h.employee_name, detail: 'No PPE records at all.', item: '', date: '' });
    }
    for (const r of h.records) {
      const y = yearOf(r.issue_date);
      if (y !== null && (y < minYear || y > maxYear)) {
        dates.push({ key: rowKey(r), employeeId: h.employee_id, employeeName: h.employee_name, item: typeName(r.ppe_type), date: r.issue_date, detail: `Issued ${r.issue_date}, outside ${minYear}–${maxYear}.` });
      }
      if ((r.size || '').trim() === '') {
        sizes.push({ key: rowKey(r), employeeId: h.employee_id, employeeName: h.employee_name, item: typeName(r.ppe_type), date: r.issue_date, detail: 'No size recorded.' });
      }
    }
  }
  const byDate = (a: GapRow, b: GapRow) => a.date.localeCompare(b.date) || a.employeeId.localeCompare(b.employeeId);
  dates.sort(byDate);
  sizes.sort(byDate);
  return [
    { id: 'dates', title: 'Implausible issue dates', blurb: `Issued before ${minYear} or in the future. Fix at source, then re-import fills just that cell.`, rows: dates },
    { id: 'sizes', title: 'Missing sizes', blurb: 'The workbook never carried sizes. Capture them on the next issue or a size census.', rows: sizes },
    { id: 'no-ppe', title: 'No PPE at all', blurb: 'People on the register with zero records — first issues outstanding.', rows: noPpe },
    { id: 'no-title', title: 'No job title', blurb: 'The workbook never carried titles; a later HR re-import fills blanks.', rows: noTitle },
    { id: 'quarantine', title: 'Import quarantine', blurb: 'Cells refused at import. Nothing was invented for them.', rows: QUARANTINED },
    { id: 'cross-listed', title: 'Also in Engineering', blurb: 'Excluded from the Mining import until HR resolves them.', rows: CROSS_LISTED },
  ];
}
