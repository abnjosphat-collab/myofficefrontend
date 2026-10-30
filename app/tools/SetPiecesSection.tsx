// app/tools/SetPiecesSection.tsx — a set's page in the drawer: the header names the set number, type
// and holder; the pieces are grouped and searchable with their number, condition and status, editable
// by issuers, and downloadable as a piece list. The return flow records per-piece condition and status.
'use client';

import { useMemo, useState } from 'react';
import { Button, SearchField, Segmented } from '@/components/ui-system';
import type { Tool } from './prototype';
import { groupPieces, PIECE_CONDITIONS, pieceMatches } from './setTypes';
import { exportTable } from './toolsExports';

const PIECE_STATUS = ['present', 'missing', 'damaged'] as const;

export function SetPiecesSection({ tool, manage, onEditPiece }: {
  tool: Tool;
  manage: boolean;
  onEditPiece: (pieceId: string, patch: { condition?: string; status?: 'present' | 'missing' | 'damaged' }) => void;
}) {
  const pieces = useMemo(() => tool.pieces ?? [], [tool.pieces]);
  const [query, setQuery] = useState('');
  const groups = useMemo(() => groupPieces(pieces.filter(piece => pieceMatches(piece, query))), [pieces, query]);

  const download = (format: 'xlsx' | 'pdf') => {
    void exportTable(format, {
      title: `${tool.id} piece list`,
      subtitle: `${tool.setTypeTitle ?? 'Set'} · ${tool.holder ? `with ${tool.holder.split(' · ')[0]}` : 'in store'}`,
      headers: ['Piece', 'Name', 'Size', 'Condition', 'Status'],
      rows: [...pieces]
        .sort((a, b) => (a.lineNo ?? 0) - (b.lineNo ?? 0))
        .map(piece => [piece.pieceNumber ?? '', piece.name, piece.size ?? '', piece.condition, piece.status]),
    });
  };

  return (
    <section aria-label="Set pieces" className="flex flex-col gap-2 border-t border-line-subtle pt-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-sans text-caption font-medium text-ink-muted">Pieces ({pieces.length}){tool.setTypeTitle ? ` · ${tool.setTypeTitle}` : ''}</h3>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => download('xlsx')}>Pieces XLSX</Button>
          <Button variant="ghost" size="sm" onClick={() => download('pdf')}>Pieces PDF</Button>
        </div>
      </div>
      {pieces.length > 7 && <SearchField label="Find a piece" placeholder="Find by piece number or name" value={query} onValueChange={setQuery} />}
      {groups.length === 0 && <p className="font-sans text-body-sm text-ink-muted">{pieces.length ? 'No piece matches that search.' : 'This set has no pieces yet.'}</p>}
      {groups.map(group => (
        <details key={group.name} className="rounded-control border border-line-subtle px-3 py-2" open={groups.length <= 4}>
          <summary className="cursor-pointer font-sans text-body-sm font-medium text-ink">{group.name} ({group.pieces.length})</summary>
          <ul className="flex flex-col gap-1 py-2">
            {group.pieces.map(piece => (
              <li key={piece.id} className="flex flex-col gap-1 rounded-control px-2 py-1.5 hover:bg-surface-subtle">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-sans text-body-sm text-ink">{piece.pieceNumber ?? `#${piece.lineNo ?? ''}`} · {piece.size ?? ''}</span>
                  <span className="font-sans text-caption text-ink-muted">{piece.condition} · {piece.status}</span>
                </div>
                {manage && (
                  <div className="flex flex-wrap gap-2">
                    <Segmented label={`${piece.pieceNumber ?? piece.name} condition`} value={piece.condition} onValueChange={value => onEditPiece(piece.id, { condition: value })} options={PIECE_CONDITIONS.map(value => ({ value, label: value }))} />
                    <Segmented label={`${piece.pieceNumber ?? piece.name} status`} value={piece.status} onValueChange={value => onEditPiece(piece.id, { status: value as 'present' | 'missing' | 'damaged' })} options={PIECE_STATUS.map(value => ({ value, label: value }))} />
                  </div>
                )}
              </li>
            ))}
          </ul>
        </details>
      ))}
    </section>
  );
}
