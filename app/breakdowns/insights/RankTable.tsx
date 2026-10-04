// app/breakdowns/insights/RankTable.tsx — a ranked list as a table: position, name, and the figures that rank it. Every number is
// printed; the table scrolls sideways on a phone rather than dropping a column.
'use client';

import { Card, DataTable, EmptyState, type Column } from '@/components/ui-system';

export function RankTable<T extends { rank: number }>({ title, description, caption, rows, columns, empty }: { title: string; description?: string; caption: string; rows: T[]; columns: Column<T>[]; empty: string }) {
  return (
    <Card padding="lg" className="flex flex-col gap-3">
      <div><h2 className="font-display text-title font-semibold text-ink">{title}</h2>{description && <p className="font-sans text-body-sm text-ink-muted">{description}</p>}</div>
      {rows.length === 0 ? <EmptyState icon="analytics" title={empty} /> : <DataTable caption={caption} rows={rows} columns={columns} getRowId={r => String(r.rank)} />}
    </Card>
  );
}
