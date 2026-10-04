// app/documents/FileBrowser.tsx — the files in one place (a folder, or a category's top level): search and filters, cards or a
// table, star / rename / download / delete per file, and bulk delete from the table. The load state comes from the page, so a
// failed load is an error with a retry, never an empty folder.
'use client';

import { useMemo, useState } from 'react';
import {
  Button, DataRegion, DataTable, EmptyState, IconButton, Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger, Pagination, RecordCard,
  SearchField, Select, StatusBadge, Toolbar, ViewToggle, VIEW_CARDS_TABLE, deriveDataStatus, isTransientStatus, pageSlice, sortRows, useViewPreference,
  type Column, type SortState,
} from '@/components/ui-system';
import { fmtDateTime } from '@/components/shared/utils';
import type { ApiListState } from '@/lib/useApiList';
import { FILE_TYPES, NO_FILTERS, filterDocuments, formatSize, isFiltered, sortDocuments, typeMeta, type DocFilters, type SortKey } from './documentLogic';
import type { DocumentFile } from './types';

export interface FileActions {
  onOpen: (d: DocumentFile) => void;
  onStar: (d: DocumentFile) => void;
  onRename: (d: DocumentFile) => void;
  onDownload: (d: DocumentFile) => void;
  onDelete: (d: DocumentFile) => void;
  onBulkDelete: (ds: DocumentFile[]) => void;
  onUpload: () => void;
}

const SHOW = [{ value: 'all', label: 'All files' }, { value: 'starred', label: 'Starred' }, { value: 'recent', label: 'Recently updated' }];
const TYPES = [{ value: 'all', label: 'Every type' }, ...Object.entries(FILE_TYPES).map(([value, m]) => ({ value, label: m.label }))];
const ADDED = [{ value: 'all', label: 'Any date' }, { value: 'today', label: 'Today' }, { value: 'week', label: 'Last 7 days' }, { value: 'month', label: 'Last 30 days' }];
const SIZES = [{ value: 'all', label: 'Any size' }, { value: 'small', label: 'Under 1 MB' }, { value: 'medium', label: '1 to 10 MB' }, { value: 'large', label: 'Over 10 MB' }];
const SORTS = [{ value: 'date', label: 'Newest first' }, { value: 'name', label: 'Name, A to Z' }, { value: 'size', label: 'Largest first' }, { value: 'type', label: 'Type' }];
const SORT_OF: Record<string, { key: SortKey; dir: 'asc' | 'desc' }> = { date: { key: 'date', dir: 'desc' }, name: { key: 'name', dir: 'asc' }, size: { key: 'size', dir: 'desc' }, type: { key: 'type', dir: 'asc' } };
const PAGE_SIZE = 25;

function FileMenu({ doc, a }: { doc: DocumentFile; a: FileActions }) {
  return (
    <span className="inline-flex items-center gap-1">
      <IconButton icon="starred" size="sm" variant="ghost" label={doc.starred ? `Remove ${doc.name} from starred` : `Star ${doc.name}`} aria-pressed={doc.starred} className={doc.starred ? 'text-warning' : undefined} onClick={() => a.onStar(doc)} />
      <Menu>
        <MenuTrigger asChild><IconButton icon="more-vertical" size="sm" variant="ghost" label={`More actions for ${doc.name}`} /></MenuTrigger>
        <MenuContent>
          <MenuItem icon="eye" onSelect={() => a.onOpen(doc)}>Preview</MenuItem>
          <MenuItem icon="download" onSelect={() => a.onDownload(doc)}>Download</MenuItem>
          <MenuItem icon="edit" onSelect={() => a.onRename(doc)}>Rename</MenuItem>
          <MenuSeparator />
          <MenuItem icon="delete" onSelect={() => a.onDelete(doc)}>Delete</MenuItem>
        </MenuContent>
      </Menu>
    </span>
  );
}

export function FileBrowser({ list, subject, actions: a }: { list: ApiListState<DocumentFile>; subject: string; actions: FileActions }) {
  const [view, setView] = useViewPreference('documents', VIEW_CARDS_TABLE);
  const [filters, setFilters] = useState<DocFilters>(NO_FILTERS);
  const [order, setOrder] = useState('date');
  const [sort, setSort] = useState<SortState>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const set = (patch: Partial<DocFilters>) => { setFilters(f => ({ ...f, ...patch })); setPage(1); };
  const filtered = isFiltered(filters);

  const docs = list.items;
  const matches = useMemo(() => filterDocuments(docs, filters), [docs, filters]);
  const ordered = useMemo(() => sortDocuments(matches, SORT_OF[order].key, SORT_OF[order].dir), [matches, order]);
  const rows = useMemo(() => sortRows(ordered, sort, (d, id) => (id === 'size' ? d.size : id === 'added' ? new Date(d.createdAt).getTime() || 0 : id === 'type' ? d.type : d.name.toLowerCase())), [ordered, sort]);
  const visible = pageSlice(rows, page, PAGE_SIZE);
  const live = useMemo(() => new Set(docs.map(d => d.id)), [docs]);
  const chosen = useMemo(() => docs.filter(d => selected.has(d.id) && live.has(d.id)), [docs, selected, live]);
  const status = deriveDataStatus({ loaded: list.loaded, loading: list.loading, error: list.error, errorStatus: list.errorStatus, count: matches.length, transient: isTransientStatus(list.errorStatus) });

  const COLUMNS: Column<DocumentFile>[] = [
    { id: 'name', header: 'Name', sortable: true, sticky: true, cell: d => (
      <div className="min-w-0"><p className="flex items-center gap-1.5 font-medium text-ink [overflow-wrap:anywhere]">{d.name}{d.starred && <span className="text-warning" role="img" aria-label="Starred">★</span>}</p>{d.originalName && d.originalName !== d.name && <p className="text-caption text-ink-muted [overflow-wrap:anywhere]">{d.originalName}</p>}</div>
    ) },
    { id: 'type', header: 'Type', sortable: true, cell: d => <StatusBadge tone={typeMeta(d.type).tone}>{typeMeta(d.type).label}</StatusBadge> },
    { id: 'size', header: 'Size', sortable: true, numeric: true, cell: d => <span className="tabular">{formatSize(d.size)}</span> },
    { id: 'added', header: 'Added', sortable: true, hideBelow: 'md', cell: d => <span className="whitespace-nowrap tabular">{fmtDateTime(d.createdAt)}</span> },
    { id: 'comment', header: 'Comment', hideBelow: 'lg', cell: d => <span className="line-clamp-2 max-w-[18rem]">{d.description || <span className="text-ink-muted">None</span>}</span> },
  ];

  return (
    <div className="flex flex-col gap-4">
      <Toolbar
        filtered={filtered}
        trailing={<ViewToggle value={view} onValueChange={setView} options={VIEW_CARDS_TABLE} />}
      >
        <SearchField value={filters.search} onValueChange={search => set({ search })} placeholder="Search name or comment" wrapperClassName="min-w-48 max-w-md flex-1" />
        <Select aria-label="Show" className="w-44" value={filters.view} onValueChange={v => set({ view: v as DocFilters['view'] })} options={SHOW} />
        <Select aria-label="File type" className="w-36" value={filters.type} onValueChange={type => set({ type })} options={TYPES} />
        <Select aria-label="Date added" className="w-32" value={filters.added} onValueChange={v => set({ added: v as DocFilters['added'] })} options={ADDED} />
        <Select aria-label="File size" className="w-32" value={filters.size} onValueChange={v => set({ size: v as DocFilters['size'] })} options={SIZES} />
        <Select aria-label="Order" className="w-36" value={order} onValueChange={v => { setOrder(v); setSort(null); }} options={SORTS} />
        {filtered && <Button variant="ghost" icon="close" onClick={() => { setFilters(NO_FILTERS); setPage(1); }}>Clear filters</Button>}
      </Toolbar>

      <DataRegion
        status={status} subject={subject} error={list.error} onRetry={() => list.refetch()}
        empty={filtered
          ? <EmptyState icon="search" title="No files match" description="Try a different search or clear the filters." action={<Button onClick={() => setFilters(NO_FILTERS)}>Clear filters</Button>} />
          : <EmptyState icon="documents" title="No files here yet" description="Upload the first one." action={<Button variant="primary" icon="upload" onClick={a.onUpload}>Upload files</Button>} />}
      >
        <p className="font-sans text-caption text-ink-muted">{matches.length} {matches.length === 1 ? 'file' : 'files'}{matches.length !== docs.length ? ` of ${docs.length}` : ''}</p>
        {view === 'table' ? (
          <div className="flex flex-col gap-3">
            {chosen.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 rounded-control border border-line bg-action-soft/50 px-4 py-2.5" role="region" aria-label="Bulk actions">
                <span className="font-sans text-label font-semibold text-ink">{chosen.length} selected</span>
                <Button size="sm" variant="danger" icon="delete" onClick={() => a.onBulkDelete(chosen)}>Delete selected</Button>
                <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Clear selection</Button>
              </div>
            )}
            <DataTable
              caption={`Files in ${subject}`} rows={visible} columns={COLUMNS} getRowId={d => d.id} sort={sort} onSortChange={setSort}
              selected={selected} onSelectedChange={setSelected} onRowActivate={a.onOpen}
              rowActions={d => <FileMenu doc={d} a={a} />}
            />
            {rows.length > PAGE_SIZE && <Pagination page={page} pageSize={PAGE_SIZE} total={rows.length} onPageChange={setPage} />}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label={`Files in ${subject}`}>
              {visible.map(d => {
                const m = typeMeta(d.type);
                return (
                  <li key={d.id} className="relative">
                    <RecordCard
                      eyebrow={m.label} title={d.name} openLabel={`Preview ${d.name}`} onOpen={() => a.onOpen(d)}
                      subtitle={d.originalName && d.originalName !== d.name ? d.originalName : undefined}
                      status={<StatusBadge tone={m.tone}>{m.label}</StatusBadge>}
                      facts={[{ label: 'Size', value: formatSize(d.size) }, { label: 'Added', value: fmtDateTime(d.createdAt) }, ...(d.description ? [{ label: 'Comment', value: <span className="line-clamp-2">{d.description}</span> }] : [])]}
                      action={<FileMenu doc={d} a={a} />}
                    />
                  </li>
                );
              })}
            </ul>
            {rows.length > PAGE_SIZE && <Pagination page={page} pageSize={PAGE_SIZE} total={rows.length} onPageChange={setPage} />}
          </div>
        )}
      </DataRegion>
    </div>
  );
}
