import { describe, expect, it } from 'vitest';
import { groupPieces, nextPieceNumber, parsePastedLines, pieceMatches, type SetPiece } from './setTypes';

describe('parsePastedLines', () => {
  it('reads name, size and quantity columns', () => {
    const pasted = parsePastedLines('Spanner 13mm\t13\t2\nTorque wrench\t\t1');
    expect(pasted.lines).toEqual([
      { name: 'Spanner 13mm', size: '13', qty: 2 },
      { name: 'Torque wrench', size: undefined, qty: 1 },
    ]);
    expect(pasted.unreadable).toBe(0);
  });

  it('pastes 200 rows quickly', () => {
    const text = Array.from({ length: 200 }, (_, index) => `Piece ${index + 1}\t${(index % 40) + 6}\t1`).join('\n');
    const started = Date.now();
    const pasted = parsePastedLines(text);
    expect(pasted.lines).toHaveLength(200);
    expect(pasted.unreadable).toBe(0);
    expect(Date.now() - started).toBeLessThan(1000);
  });

  it('counts rows it could not read', () => {
    const pasted = parsePastedLines('Good spanner\t13\t1\n\t\t\n\t14\t2\nBad qty\t13\tmany');
    expect(pasted.lines).toHaveLength(1);
    expect(pasted.unreadable).toBe(2);
  });
});

describe('groupPieces', () => {
  const piece = (over: Partial<SetPiece>): SetPiece => ({ id: 'x', name: 'Spanner', condition: 'Good', status: 'present', ...over });

  it('groups by name in line order', () => {
    const groups = groupPieces([
      piece({ id: 'b', name: 'Hammer', lineNo: 2, pieceNumber: 'SET-03/002' }),
      piece({ id: 'a', name: 'Spanner', lineNo: 1, pieceNumber: 'SET-03/001' }),
      piece({ id: 'c', name: 'Spanner', lineNo: 3, pieceNumber: 'SET-03/003' }),
    ]);
    expect(groups.map(group => group.name)).toEqual(['Hammer', 'Spanner']);
    expect(groups[1].pieces.map(item => item.pieceNumber)).toEqual(['SET-03/001', 'SET-03/003']);
  });

  it('matches pieces on number, name or size', () => {
    const item = piece({ pieceNumber: 'SET-03/017', name: 'Spanner', size: '14' });
    expect(pieceMatches(item, 'SET-03/017')).toBe(true);
    expect(pieceMatches(item, 'spanner 14')).toBe(true);
    expect(pieceMatches(item, 'hammer')).toBe(false);
  });

  it('numbers the next free slot after the highest line', () => {
    expect(nextPieceNumber('SET-03', [piece({ lineNo: 1 }), piece({ lineNo: 17 })])).toBe('SET-03/018');
  });
});
