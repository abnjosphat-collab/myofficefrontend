// app/documents/FileList.tsx — the files of the current view as cards or a table: tick to select, click to open, a menu per file.
// A match is highlighted where it was found, and a file found only by the words inside it says so. The load state comes from the
// page, so a failed load is an error with a retry, never an empty folder.
'use client';

import { useMemo, useState, type ReactNode } from 'react';
import {
  Checkbox, DataRegion, Icon, DataTable, EmptyState, IconButton, Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger, MotionList, MotionListItem, Pagination, RecordCard,
  StatusBadge, Tag, ZoomLink, deriveDataStatus, isTransientStatus, pageSlice, sortRows, type Column, type SortState,
} from '@/components/ui-system';
import { fmtDateTime } from '@/components/shared/utils';
import { formatSize, highlightParts, shortLocation, typeMeta } from './documentLogic';
import type { DocumentFile } from './types';

export interface FileActions {
  onOpen: (d: DocumentFile) => void;
  onStar: (d: DocumentFile) => void;
  onDownload: (d: DocumentFile) => void;
  onEdit: (d: DocumentFile) => void;
  onMove: (d: DocumentFile) => void;
  onTrash: (d: DocumentFile) => void;
  onRestore: (d: DocumentFile) => void;
  onPurge: (d: DocumentFile) => void;
}

const PAGE_SIZE = 25;

function Marked({ text, terms }: { text: string; terms: readonly string[] }) {
  return <>{highlightParts(text, terms).map((p, i) => (p.hit ? <mark key={i} className="rounded-xs bg-warning-soft px-0.5 text-ink">{p.text}</mark> : <span key={i}>{p.text}</span>))}</>;
}

function FileMenu({ doc, a, isManager }: { doc: DocumentFile; a: FileActions; isManager: boolean }) {
  const trashed = !!doc.deletedAt;
  return (
    <span className="inline-flex items-center gap-1">
      {!trashed && <IconButton icon="starred" size="sm" variant="ghost" label={doc.starred ? `Remove ${doc.name} from starred` : `Star ${doc.name}`} pressed={doc.starred} className={doc.starred ? 'text-warning' : undefined} onClick={() => a.onStar(doc)} />}
      <Menu>
        <MenuTrigger asChild><IconButton icon="more-vertical" size="sm" variant="ghost" label={`More actions for ${doc.name}`} /></MenuTrigger>
        <MenuContent>
          <MenuItem icon="eye" onSelect={() => a.onOpen(doc)}>Preview</MenuItem>
          <MenuItem icon="download" onSelect={() => a.onDownload(doc)}>Download</MenuItem>
          {trashed ? (
            <>
              <MenuSeparator />
              <MenuItem icon="undo" onSelect={() => a.onRestore(doc)}>Restore</MenuItem>
              {isManager && <MenuItem icon="delete" tone="danger" onSelect={() => a.onPurge(doc)}>Delete for good</MenuItem>}
            </>
          ) : (
            <>
              <MenuItem icon="edit" onSelect={() => a.onEdit(doc)}>Edit details</MenuItem>
              <MenuItem icon="move" onSelect={() => a.onMove(doc)}>Move to a folder</MenuItem>
              {isManager && <><MenuSeparator /><MenuItem icon="delete" tone="danger" onSelect={() => a.onTrash(doc)}>Delete</MenuItem></>}
            </>
          )}
        </MenuContent>
      </Menu>
    </span>
  );
}

export function FileList({ items, terms, view, state, subject, actions: a, selected, onSelectedChange, showLocation, isManager, emptyHint, empty, calmKey }: {
  items: readonly DocumentFile[]; terms: readonly string[]; view: 'cards' | 'table';
  state: { loaded: boolean; loading: boolean; error: string | null; errorStatus: number | null; refetch: () => Promise<void> };
  subject: string; actions: FileActions; selected: ReadonlySet<string>; onSelectedChange: (s: Set<string>) => void; showLocation: boolean; isManager: boolean;
  /** Said under "no files" when nothing is narrowing the list. */
  emptyHint: ReactNode; empty?: ReactNode; calmKey?: string;
}) {
  const [sort, setSort] = useState<SortState>(null);
  const [page, setPage] = useState(1);
  const rows = useMemo(() => sortRows(items, sort, (d, id) => (id === 'size' ? d.size : id === 'added' ? new Date(d.createdAt).getTime() || 0 : id === 'type' ? d.type : d.name.toLowerCase())), [items, sort]);
  const lastPage = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const current = Math.min(page, lastPage);
  const visible = pageSlice(rows, current, PAGE_SIZE);
  const listCalm = JSON.stringify([calmKey ?? null, sort, current]);
  const status = deriveDataStatus({ loaded: state.loaded, loading: state.loading, error: state.error, errorStatus: state.errorStatus, count: items.length, transient: isTransientStatus(state.errorStatus) });

  const COLUMNS: Column<DocumentFile>[] = [
    { id: 'name', header: 'Name', sortable: true, sticky: true, cell: d => (
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-1.5 font-medium text-ink [overflow-wrap:anywhere]"><Marked text={d.name} terms={terms} />{d.starred && <span className="text-warning" role="img" aria-label="Starred"><Icon name="starred" size="xs" /></span>}{d.foundInside && <StatusBadge tone="info">Found inside</StatusBadge>}</p>
        {d.tags.length > 0 && <p className="mt-0.5 flex flex-wrap gap-1">{d.tags.slice(0, 4).map(t => <Tag key={t}>{t}</Tag>)}</p>}
      </div>
    ) },
    ...(showLocation ? [{ id: 'where', header: 'Folder', hideBelow: 'md' as const, cell: (d: DocumentFile) => <span className="text-ink-muted [overflow-wrap:anywhere]" title={d.folderPath || 'Unfiled'}>{shortLocation(d.folderPath)}</span> }] : []),
    { id: 'type', header: 'Type', sortable: true, hideBelow: 'md', cell: d => <StatusBadge tone={typeMeta(d.type).tone}>{typeMeta(d.type).label}</StatusBadge> },
    { id: 'size', header: 'Size', sortable: true, numeric: true, hideBelow: 'md', cell: d => <span className="tabular">{formatSize(d.size)}</span> },
    { id: 'added', header: 'Added', sortable: true, hideBelow: 'lg', cell: d => <span className="whitespace-nowrap tabular">{fmtDateTime(d.createdAt)}</span> },
  ];

  const toggleOne = (id: string, on: boolean) => { const next = new Set(selected); if (on) next.add(id); else next.delete(id); onSelectedChange(next); };

  return (
    <DataRegion
      status={status} subject={subject} error={state.error} onRetry={() => state.refetch()}
      empty={empty ?? <EmptyState icon="documents" title="No files here" description={emptyHint} />}
    >
      {view === 'table' ? (
        <div className="flex flex-col gap-3">
          <DataTable
            caption={`Files in ${subject}`} stillKey={listCalm} rows={visible} columns={COLUMNS} getRowId={d => d.id} sort={sort} onSortChange={setSort}
            selected={selected} onSelectedChange={onSelectedChange} rowSelectLabel={d => `Select ${d.name}`} onRowActivate={a.onOpen}
            rowActions={d => <FileMenu doc={d} a={a} isManager={isManager} />}
          />
          {rows.length > PAGE_SIZE && <Pagination page={current} pageSize={PAGE_SIZE} total={rows.length} onPageChange={setPage} />}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <MotionList as="ul" calmKey={listCalm} className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label={`Files in ${subject}`}>
            {visible.map(d => {
              const m = typeMeta(d.type);
              return (
                <MotionListItem as="li" key={d.id} className="relative">
                  <Checkbox className="absolute left-3.5 top-3.5 z-10" aria-label={`Select ${d.name}`} checked={selected.has(d.id)} onChange={e => toggleOne(d.id, e.target.checked)} />
                  <ZoomLink zoomId={`documents:rec:${d.id}`}>
                  <RecordCard
                    eyebrow={<span className="pl-7">{m.label}</span>} title={<Marked text={d.name} terms={terms} />} openLabel={`Preview ${d.name}`} onOpen={() => a.onOpen(d)} selected={selected.has(d.id)}
                    subtitle={d.originalName && d.originalName !== d.name ? d.originalName : undefined}
                    status={<span className="inline-flex flex-wrap gap-1">{d.foundInside && <StatusBadge tone="info">Found inside</StatusBadge>}{d.starred && <StatusBadge tone="warning">Starred</StatusBadge>}</span>}
                    facts={[
                      { label: 'Size', value: formatSize(d.size) }, { label: 'Added', value: fmtDateTime(d.createdAt) },
                      ...(showLocation ? [{ label: 'Folder', value: shortLocation(d.folderPath) }] : []),
                      ...(d.description ? [{ label: 'Comment', value: <span className="line-clamp-2"><Marked text={d.description} terms={terms} /></span> }] : []),
                    ]}
                    meta={d.tags.length > 0 ? <span className="flex flex-wrap gap-1">{d.tags.slice(0, 4).map(t => <Tag key={t}>{t}</Tag>)}</span> : undefined}
                    action={<FileMenu doc={d} a={a} isManager={isManager} />}
                  />
                  </ZoomLink>
                </MotionListItem>
              );
            })}
          </MotionList>
          {rows.length > PAGE_SIZE && <Pagination page={current} pageSize={PAGE_SIZE} total={rows.length} onPageChange={setPage} />}
        </div>
      )}
    </DataRegion>
  );
}

