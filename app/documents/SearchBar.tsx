// app/documents/SearchBar.tsx — the one place to find a file: words (matched in names, comments, tags, folders and inside the files),
// the scope (this folder or the whole library), the filters, the order and the way the list is drawn. Active filters show as chips
// underneath, each removable.
'use client';

import { Button, CountBadge, Popover, PopoverContent, PopoverTrigger, SearchField, Segmented, Select, Tag, ViewToggle, VIEW_CARDS_TABLE } from '@/components/ui-system';
import { FilterPanel, filterCount } from './FilterPanel';
import { NO_FILTERS, SORTS, filterChips, isNarrowed, removeChip } from './documentLogic';
import type { DocFilters, Facets, Place } from './types';

export function SearchBar({ place, filters, facets, view, onViewChange, onChange, pending }: {
  place: Place; filters: DocFilters; facets: Facets; view: 'cards' | 'table'; onViewChange: (v: 'cards' | 'table') => void; onChange: (patch: Partial<DocFilters>) => void;
  /** Words are typed that the list does not answer yet. */
  pending: boolean;
}) {
  const inFolder = place.kind === 'folder';
  const count = filterCount(filters);
  const chips = filterChips(filters);
  const searching = filters.q.trim() !== '';
  const sorts = SORTS.filter(s => s.value !== 'relevance' || searching).map(s => ({ value: s.value, label: s.value === 'auto' ? (searching ? 'Order: best match' : 'Order: newest') : s.label }));

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <SearchField
          value={filters.q} onValueChange={q => onChange({ q })} label="Search documents" loading={pending}
          placeholder={inFolder && !filters.everywhere ? 'Search this folder and below' : 'Search names, tags and the words inside files'}
          wrapperClassName="min-w-56 flex-1"
        />
        {inFolder && isNarrowed(filters) && (
          <Segmented label="Search where" value={filters.everywhere ? 'all' : 'here'} onValueChange={v => onChange({ everywhere: v === 'all' })} options={[{ value: 'here', label: 'This folder' }, { value: 'all', label: 'Everywhere' }]} />
        )}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="secondary" icon="filter" aria-label={count ? `Filters, ${count} on` : 'Filters'}>
              Filters{count > 0 && <CountBadge value={count} tone="brand" className="ml-1.5" />}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-[min(26rem,calc(100vw-1.5rem))]">
            <FilterPanel filters={filters} facets={facets} inFolder={inFolder} onChange={onChange} onClear={() => onChange({ ...NO_FILTERS, q: filters.q, everywhere: filters.everywhere, sort: filters.sort })} />
          </PopoverContent>
        </Popover>
        <Select aria-label="Order" className="w-44" value={filters.sort} onValueChange={v => onChange({ sort: v as DocFilters['sort'] })} options={sorts} />
        <ViewToggle value={view} onValueChange={onViewChange} options={VIEW_CARDS_TABLE} />
      </div>

      {chips.length > 0 && (
        <ul className="flex flex-wrap items-center gap-1.5" aria-label="Filters in use">
          {chips.map(c => <li key={c.id}><Tag onRemove={() => onChange(removeChip(filters, c.id))} removeLabel={`${c.label} filter`}>{c.label}</Tag></li>)}
          <li><Button size="sm" variant="ghost" icon="close" onClick={() => onChange({ ...NO_FILTERS, q: filters.q, everywhere: filters.everywhere, sort: filters.sort })}>Clear all</Button></li>
        </ul>
      )}
    </div>
  );
}
