// app/documents/HomeView.tsx — the hub's front door: search across every category, or open one of the seven ISO 55001 clauses.
// A search that reaches the server's cap says so, because the list may then be missing matches.
'use client';

import { useState } from 'react';
import { Button, DataRegion, DataTable, EmptyState, Notice, RecordCard, SearchField, StatusBadge, deriveDataStatus, isTransientStatus, type Column } from '@/components/ui-system';
import { Icon } from '@/components/ui-system';
import { CATEGORIES } from './categories';
import { SEARCH_LIMIT, formatSize, typeMeta } from './documentLogic';
import { useDocumentSearch } from './useDocumentsData';
import type { DocumentFile } from './types';

const COLUMNS: Column<DocumentFile>[] = [
  { id: 'name', header: 'Name', sticky: true, cell: d => <span className="font-medium text-ink [overflow-wrap:anywhere]">{d.name}</span> },
  { id: 'where', header: 'Location', cell: d => <span className="text-ink-muted [overflow-wrap:anywhere]">{d.categoryName}{d.folder ? ` / ${d.folder}` : ''}</span> },
  { id: 'type', header: 'Type', hideBelow: 'md', cell: d => <StatusBadge tone={typeMeta(d.type).tone}>{typeMeta(d.type).label}</StatusBadge> },
  { id: 'size', header: 'Size', numeric: true, hideBelow: 'md', cell: d => <span className="tabular">{formatSize(d.size)}</span> },
];

export function HomeView({ onOpenCategory, onLocate }: { onOpenCategory: (id: string) => void; onLocate: (d: DocumentFile) => void }) {
  const [query, setQuery] = useState('');
  const search = useDocumentSearch(query);
  const searching = query.trim() !== '';
  const status = deriveDataStatus({ loaded: search.loaded && !search.pending, loading: search.loading || search.pending, error: search.error, errorStatus: search.errorStatus, count: search.items.length, transient: isTransientStatus(search.errorStatus) });

  return (
    <div className="flex flex-col gap-6">
      <SearchField value={query} onValueChange={setQuery} placeholder="Search all documents" wrapperClassName="w-full max-w-xl" />
      {searching ? (
        <DataRegion
          status={status} subject="search results" error={search.error} onRetry={() => search.refetch()}
          empty={<EmptyState icon="search" title="No documents match" description={`Nothing is called or commented “${query.trim()}”. Try fewer words.`} action={<Button onClick={() => setQuery('')}>Clear search</Button>} />}
        >
          <div className="flex flex-col gap-3">
            {search.items.length >= SEARCH_LIMIT && <Notice tone="warning" title={`Showing the first ${SEARCH_LIMIT} matches`}>There may be more. Add words to narrow the search.</Notice>}
            <p className="font-sans text-caption text-ink-muted" role="status">{search.items.length} {search.items.length === 1 ? 'result' : 'results'}</p>
            <DataTable caption="Search results" rows={search.items} columns={COLUMNS} getRowId={d => d.id} onRowActivate={onLocate} />
          </div>
        </DataRegion>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Document categories">
          {CATEGORIES.map(c => (
            <li key={c.id} className="relative">
              <RecordCard
                eyebrow={`Clause ${Number(c.id) + 3}`} title={c.name} subtitle={c.description} openLabel={`Open ${c.name}`} onOpen={() => onOpenCategory(c.id)}
                meta={<span className="inline-flex items-center gap-1.5"><Icon name={c.icon} size="sm" />{c.folders.length} built-in folders</span>}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
