// components/ui-system/hooks/useBulkSelection.test.ts — one register's ticks: kept through filtering (and counted as hidden),
// dropped when the record is gone, "Select all shown" adds only what the filters show, and the card tick toggles one record.
import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { rowId, useBulkSelection } from './useBulkSelection';

type Row = { id: number; name: string };
const A: Row = { id: 1, name: 'A' };
const B: Row = { id: 2, name: 'B' };
const C: Row = { id: 3, name: 'C' };

describe('useBulkSelection', () => {
  it('selects all shown, keeps hidden ticks counted, and hands back the chosen records in register order', () => {
    const { result, rerender } = renderHook(({ all, shown }) => useBulkSelection(all, shown, rowId), { initialProps: { all: [A, B, C], shown: [A, C] } });
    act(() => result.current.bar.onSelectAllShown());
    expect([...result.current.selected]).toEqual(['1', '3']);
    expect(result.current.bar).toMatchObject({ visible: true, selectedCount: 2, hiddenCount: 0, shownCount: 2 });
    rerender({ all: [A, B, C], shown: [A] });
    expect(result.current.bar).toMatchObject({ selectedCount: 2, hiddenCount: 1 });
    expect(result.current.chosen).toEqual([A, C]);
  });

  it('drops a ticked record once it no longer exists', () => {
    const { result, rerender } = renderHook(({ all }) => useBulkSelection(all, all, rowId), { initialProps: { all: [A, B] } });
    act(() => result.current.table.onSelectedChange(new Set(['1', '2'])));
    rerender({ all: [A] });
    expect(result.current.chosen).toEqual([A]);
    expect(result.current.bar.selectedCount).toBe(1);
  });

  it('a card tick toggles its record, and clear empties the selection', () => {
    const { result } = renderHook(() => useBulkSelection([A, B], [A, B], rowId));
    const card = result.current.card(B, 'Select B');
    expect(card).toMatchObject({ selectable: true, selected: false, selectLabel: 'Select B' });
    act(() => card.onSelectedChange());
    expect(result.current.card(B, 'Select B').selected).toBe(true);
    act(() => result.current.clear());
    expect(result.current.bar.visible).toBe(false);
  });
});
