// components/ui-system/hooks/useBulkSelection.ts — the ticked records of one register, wired the same way on every page: the
// table's tick column, the card's tick box and the BulkBar's counts all read one set. A selection survives filtering (hidden
// ticks are counted as "hidden by filters") and drops records that no longer exist, so a bulk action never reaches a stale id.
'use client';

import { useCallback, useMemo, useState } from 'react';
import { pruneSelection, toggleOne } from '../patterns/tableLogic';

/**
 * `all`: every record the page holds (selection is pruned against it). `shown`: the records the filters show now ("Select all
 * shown"). `idOf`: a record's id as a string; pass a stable (module-level) function.
 */
export function useBulkSelection<T>(all: readonly T[], shown: readonly T[], idOf: (row: T) => string) {
  const [raw, setSelected] = useState<Set<string>>(() => new Set());
  const allIds = useMemo(() => all.map(idOf), [all, idOf]);
  const shownIds = useMemo(() => shown.map(idOf), [shown, idOf]);
  const selected = useMemo(() => pruneSelection(raw, allIds), [raw, allIds]);
  const chosen = useMemo(() => all.filter(row => selected.has(idOf(row))), [all, selected, idOf]);
  const hiddenCount = useMemo(() => {
    const visible = new Set(shownIds);
    return [...selected].filter(id => !visible.has(id)).length;
  }, [selected, shownIds]);
  const clear = useCallback(() => setSelected(new Set()), []);
  const toggle = useCallback((id: string) => setSelected(prev => toggleOne(id, prev)), []);

  return {
    selected,
    /** The selected records themselves, in register order. */
    chosen,
    clear,
    /** Spread on <DataTable>. */
    table: { selected, onSelectedChange: setSelected },
    /** Spread on <RecordCard>: its tick box. */
    card: (row: T, label: string) => {
      const id = idOf(row);
      return { selectable: true, selected: selected.has(id), onSelectedChange: () => toggle(id), selectLabel: label };
    },
    /** Spread on <BulkBar> (add `actions`). */
    bar: {
      visible: selected.size > 0, selectedCount: selected.size, hiddenCount, shownCount: shownIds.length,
      onSelectAllShown: () => setSelected(prev => new Set([...prev, ...shownIds])), onClear: clear,
    },
  };
}

/** The usual id: the record's `id`, as a string. Module-level, so it is stable for useBulkSelection. */
export const rowId = (row: { id: string | number }): string => String(row.id);
