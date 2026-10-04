// app/overtime/insights/CategoryTable.tsx — the recurring reasons the analysis found: instances, hours, average, share of the total,
// and the usual weekday, person and spare. Each row opens to the individual records behind its numbers; the headings sort.
'use client';

import { Fragment, useState } from 'react';
import { IconButton, Icon, cn } from '@/components/ui-system';
import { formatDate } from '@/lib/format';
import type { OTCategoryDetail } from '../types';

type Key = 'instances' | 'hours' | 'avg_hours' | 'pct_of_total';
const HEADS: { key: Key; label: string }[] = [{ key: 'instances', label: 'Instances' }, { key: 'hours', label: 'Hours' }, { key: 'avg_hours', label: 'Average' }, { key: 'pct_of_total', label: 'Share' }];

export function CategoryTable({ categories }: { categories: OTCategoryDetail[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const [sort, setSort] = useState<{ key: Key; dir: 'asc' | 'desc' }>({ key: 'hours', dir: 'desc' });
  if (!categories.length) return null;
  const rows = [...categories].sort((a, b) => (a[sort.key] - b[sort.key]) * (sort.dir === 'asc' ? 1 : -1));
  const by = (key: Key) => setSort(s => (s.key === key ? { key, dir: s.dir === 'desc' ? 'asc' : 'desc' } : { key, dir: 'desc' }));
  return (
    <section aria-labelledby="cat" className="rounded-card border border-line bg-surface shadow-card">
      <div className="border-b border-line px-5 py-3"><h2 id="cat" className="font-display text-title font-semibold text-ink">Recurring reasons</h2><p className="font-sans text-body-sm text-ink-muted">Open a row to see the records behind it. Choose a heading to sort.</p></div>
      {/* A scrollable region must be keyboard-focusable so keyboard users can scroll it. */}
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
      <div className="max-w-full overflow-auto" tabIndex={0} role="region" aria-label="Recurring reasons (scrollable)">
        <table className="w-full border-collapse font-sans text-body-sm text-ink">
          <caption className="sr-only">Recurring overtime reasons</caption>
          <thead>
            <tr className="bg-surface-subtle text-left">
              <th scope="col" className="px-4 py-2 font-semibold">Reason</th>
              {HEADS.map(h => (
                <th key={h.key} scope="col" aria-sort={sort.key === h.key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'} className="px-3 py-2 text-right font-semibold">
                  <button type="button" onClick={() => by(h.key)} className="focus-ring inline-flex items-center gap-1 rounded-xs">{h.label}{sort.key === h.key && <Icon name={sort.dir === 'desc' ? 'chevron-down' : 'chevron-up'} size="xs" />}</button>
                </th>
              ))}
              <th scope="col" className="hidden px-3 py-2 font-semibold md:table-cell">Usual day</th>
              <th scope="col" className="hidden px-3 py-2 font-semibold lg:table-cell">Usual person</th>
              <th scope="col" className="hidden px-3 py-2 font-semibold lg:table-cell">Usual spare</th>
              <th scope="col" className="w-10 px-2 py-2"><span className="sr-only">Show records</span></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(c => {
              const on = open === c.category;
              return (
                <Fragment key={c.category}>
                  <tr className="border-t border-line-subtle">
                    <td className="px-4 py-2 font-medium [overflow-wrap:anywhere]">“{c.category}”</td>
                    <td className="px-3 py-2 text-right tabular">{c.instances}</td>
                    <td className="px-3 py-2 text-right font-semibold tabular">{c.hours}h</td>
                    <td className="px-3 py-2 text-right tabular">{c.avg_hours}h</td>
                    <td className="px-3 py-2 text-right tabular">{c.pct_of_total}%</td>
                    <td className="hidden px-3 py-2 md:table-cell">{c.top_weekday ?? 'None'}</td>
                    <td className="hidden max-w-[10rem] truncate px-3 py-2 lg:table-cell">{c.top_employee ?? 'None'}</td>
                    <td className="hidden max-w-[10rem] truncate px-3 py-2 lg:table-cell">{c.top_spare ?? 'None'}</td>
                    <td className="px-2 py-1"><IconButton icon={on ? 'chevron-up' : 'chevron-down'} size="sm" variant="ghost" label={`${on ? 'Hide' : 'Show'} the records for ${c.category}`} aria-expanded={on} onClick={() => setOpen(on ? null : c.category)} /></td>
                  </tr>
                  {on && (
                    <tr><td colSpan={9} className="bg-surface-subtle px-4 py-3">
                      <ul className="flex flex-col gap-1.5" aria-label={`Records for ${c.category}`}>
                        {c.records.map((r, i) => <li key={i} className={cn('flex items-baseline justify-between gap-3 rounded-control bg-surface px-3 py-1.5')}><span className="min-w-0 [overflow-wrap:anywhere]"><span className="font-medium">{r.employee_name}</span> <span className="text-ink-muted">{formatDate(r.date)}</span>{r.reason && <span className="block text-caption text-ink-muted">{r.reason}</span>}</span><span className="shrink-0 font-semibold tabular">{r.hours}h</span></li>)}
                      </ul>
                    </td></tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
