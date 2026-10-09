// app/overtime/insights/CategoryTable.tsx — the recurring reasons the analysis found: instances, hours, average, share of the total,
// and the usual weekday, person and spare. Each row opens to the individual records behind its numbers; the headings sort.
// Built on the shared DataTable (sorting, sticky header, the row toggle) inside a Panel.
'use client';

import { useState } from 'react';
import { DataTable, Panel, sortRows, type Column, type SortState } from '@/components/ui-system';
import { formatDate } from '@/lib/format';
import type { OTCategoryDetail } from '../types';

const COLUMNS: Column<OTCategoryDetail>[] = [
  { id: 'category', header: 'Reason', cell: c => <span className="font-medium [overflow-wrap:anywhere]">“{c.category}”</span> },
  { id: 'instances', header: 'Instances', numeric: true, sortable: true, cell: c => c.instances },
  { id: 'hours', header: 'Hours', numeric: true, sortable: true, cell: c => <span className="font-semibold">{c.hours}h</span> },
  { id: 'avg_hours', header: 'Average', numeric: true, sortable: true, cell: c => `${c.avg_hours}h` },
  { id: 'pct_of_total', header: 'Share', numeric: true, sortable: true, cell: c => `${c.pct_of_total}%` },
  { id: 'top_weekday', header: 'Usual day', hideBelow: 'md', cell: c => c.top_weekday ?? 'None' },
  { id: 'top_employee', header: 'Usual person', hideBelow: 'lg', cell: c => <span className="block max-w-[10rem] truncate">{c.top_employee ?? 'None'}</span> },
  { id: 'top_spare', header: 'Usual spare', hideBelow: 'lg', cell: c => <span className="block max-w-[10rem] truncate">{c.top_spare ?? 'None'}</span> },
];

function Records({ category }: { category: OTCategoryDetail }) {
  return (
    <ul className="flex flex-col gap-1.5" aria-label={`Records for ${category.category}`}>
      {category.records.map((r, i) => (
        <li key={i} className="flex items-baseline justify-between gap-3 rounded-control bg-surface px-3 py-1.5">
          <span className="min-w-0 [overflow-wrap:anywhere]">
            <span className="font-medium">{r.employee_name}</span> <span className="text-ink-muted">{formatDate(r.date)}</span>
            {r.reason && <span className="block text-caption text-ink-muted">{r.reason}</span>}
          </span>
          <span className="shrink-0 font-semibold tabular">{r.hours}h</span>
        </li>
      ))}
    </ul>
  );
}

export function CategoryTable({ categories }: { categories: OTCategoryDetail[] }) {
  const [sort, setSort] = useState<SortState>({ id: 'hours', direction: 'desc' });
  if (!categories.length) return null;
  const rows = sortRows(categories, sort, (c, id) => c[id as keyof OTCategoryDetail]);
  return (
    <Panel title="Recurring reasons" description="Open a row to see the records behind it. Choose a heading to sort." className="overflow-hidden" bodyClassName="px-0 pb-0 sm:px-0 sm:pb-0">
      <DataTable
        caption="Recurring overtime reasons"
        rows={rows}
        columns={COLUMNS}
        getRowId={c => c.category}
        sort={sort}
        onSortChange={setSort}
        density="compact"
        className="rounded-none border-0"
        renderExpanded={c => <Records category={c} />}
        expandLabel={(c, open) => `${open ? 'Hide' : 'Show'} the records for ${c.category}`}
      />
    </Panel>
  );
}
