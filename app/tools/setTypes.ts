// app/tools/setTypes.ts — set types (the catalogue) and physical-set pieces: one pure place for
// parsing pasted lines and grouping pieces, so the forms and the drawer share it.
export const PIECE_CONDITIONS = ['Good', 'Damaged', 'Missing parts'] as const;
export type SetTypeLineDraft = { name: string; size?: string; qty: number; notes?: string };

export type ParsedPaste = { lines: SetTypeLineDraft[]; skipped: number; unreadable: number };

/** Parse tab-separated rows pasted from Excel: name, optional size, optional quantity. */
export function parsePastedLines(text: string): ParsedPaste {
  const lines: SetTypeLineDraft[] = [];
  let skipped = 0;
  let unreadable = 0;
  for (const raw of text.split(/\r?\n/)) {
    if (!raw.trim()) { skipped += 1; continue; }
    const cells = raw.split('\t').map(cell => cell.trim());
    const [name = '', size = '', qtyText = ''] = cells;
    if (!name) { unreadable += 1; continue; }
    let qty = 1;
    if (qtyText) {
      const parsed = Number(qtyText);
      if (!Number.isInteger(parsed) || parsed < 1 || parsed > 500) { unreadable += 1; continue; }
      qty = parsed;
    }
    lines.push({ name, size: size || undefined, qty });
  }
  return { lines, skipped, unreadable };
}

export type SetPieceState = 'present' | 'missing' | 'damaged';

export type SetPiece = {
  id: string;
  lineNo?: number | null;
  pieceNumber?: string | null;
  name: string;
  size?: string | null;
  condition: string;
  status: SetPieceState;
};

/** Group pieces by tool name for the drawer's piece list, keeping line order inside each group. */
export function groupPieces(pieces: SetPiece[]): Array<{ name: string; pieces: SetPiece[] }> {
  const groups = new Map<string, SetPiece[]>();
  for (const piece of pieces) {
    const list = groups.get(piece.name) ?? [];
    list.push(piece);
    groups.set(piece.name, list);
  }
  return [...groups.entries()]
    .map(([name, list]) => ({ name, pieces: list.sort((a, b) => (a.lineNo ?? 0) - (b.lineNo ?? 0)) }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** A piece matches the drawer search on its number, name or size. */
export function pieceMatches(piece: SetPiece, query: string): boolean {
  const haystack = `${piece.pieceNumber ?? ''} ${piece.name} ${piece.size ?? ''}`.toLowerCase();
  return query.trim().toLowerCase().split(/\s+/).every(word => haystack.includes(word));
}

/** The next free line slot after the highest line number in use. */
export function nextPieceNumber(registerNumber: string, pieces: SetPiece[]): string {
  const highest = pieces.reduce((top, piece) => Math.max(top, piece.lineNo ?? 0), 0);
  return `${registerNumber}/${String(highest + 1).padStart(3, '0')}`;
}
