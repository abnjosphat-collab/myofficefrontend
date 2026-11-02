// app/tools/setExportTables.ts — shape set data into ExportTables for toolsExports.exportTable.
// Pure builders: definition, allocation register, printable inspection checklist and unresolved findings.
import type { ExportTable } from './toolsExports';

export interface SetLineInput {
  line_no: number; name: string; size?: string | null; qty: number; notes?: string | null;
}

export interface PhysicalSetInput {
  register_number: string;
  custodian_name?: string | null;
  custodian_number?: string | null;
  department?: string | null;
  location?: string | null;
  status: string;
  issued_at?: string | null;
  pieces?: Array<{ piece_number?: string | null; name: string; size?: string | null; condition: string; status: string }>;
}

const text = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  return String(value);
};

/** One complete set definition with its itemized contents and the printed piece total. */
export function setDefinitionTable(title: string, lines: SetLineInput[]): ExportTable {
  const total = lines.reduce((sum, line) => sum + line.qty, 0);
  return {
    title: `${title} — Set definition`,
    subtitle: `${lines.length} lines · ${total} printed pieces`,
    headers: ['Line', 'Item', 'Size', 'Qty', 'Notes'],
    rows: lines.map(line => [line.line_no, line.name, text(line.size), line.qty, text(line.notes)]),
  };
}

/** Every physical set with its current custodian; totals reconcile to the register scope. */
export function allocationRegisterTable(title: string, sets: PhysicalSetInput[]): ExportTable {
  const out = sets.filter(s => s.custodian_name).length;
  return {
    title: `${title} — Allocation register`,
    subtitle: `${sets.length} sets · ${out} issued`,
    headers: ['Set No.', 'Custodian', 'Mine No.', 'Department', 'Location', 'Status', 'Issued'],
    rows: sets.map(s => [
      s.register_number, text(s.custodian_name), text(s.custodian_number),
      text(s.department), text(s.location), s.status, text(s.issued_at),
    ]),
  };
}

/** Printable checklist: one row per piece with write-in Present/Missing/Damaged columns and sign-off rows. */
export function inspectionChecklistTable(
  title: string, setNumber: string, custodian: string, lines: SetLineInput[],
): ExportTable {
  const body: (string | number)[][] = lines.map(line => [
    line.line_no, line.name, text(line.size), line.qty, '', '', '', '',
  ]);
  body.push(
    ['', '', '', '', '', '', '', ''],
    ['Inspected by', '', '', 'Date', '', '', 'Signature', ''],
  );
  return {
    title: `${title} — Inspection checklist ${setNumber}`,
    subtitle: `Set ${setNumber} · Custodian ${custodian || 'Unassigned'} · tick Present, Missing or Damaged per piece`,
    headers: ['Line', 'Item', 'Size', 'Expected', 'Present', 'Missing', 'Damaged', 'Notes'],
    rows: body,
  };
}

/** Unresolved missing/damaged pieces across physical sets; empty means nothing outstanding. */
export function findingsTable(title: string, sets: PhysicalSetInput[]): ExportTable {
  const rows: (string | number)[][] = [];
  for (const set of sets) {
    for (const piece of set.pieces ?? []) {
      if (piece.status === 'present' && piece.condition === 'Good') continue;
      rows.push([
        set.register_number, text(set.custodian_name),
        text(piece.piece_number), piece.name, text(piece.size), piece.condition, piece.status,
      ]);
    }
  }
  return {
    title: `${title} — Unresolved findings`,
    subtitle: `${rows.length} unresolved ${rows.length === 1 ? 'piece' : 'pieces'}`,
    headers: ['Set No.', 'Custodian', 'Piece', 'Item', 'Size', 'Condition', 'Status'],
    rows,
  };
}
