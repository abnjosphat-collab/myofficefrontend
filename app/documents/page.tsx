// app/documents/page.tsx — the document library. Folders in a tree (the Asset Management System structure and your own), one search
// that finds any file by name, comment, tag, folder or the words inside it, filters and ordering, bulk actions, and every file
// previewed, opened and printed in the page. The state lives here; each piece of the screen is its own component.
'use client';

import { useCallback, useMemo, useState } from 'react';
import { AppShell, useRouteSidebarCollapsed } from '@/components/app-shell';
import { Button, Drawer, EmptyState, IconButton, Notice, PageHeader, VIEW_CARDS_TABLE, useViewPreference } from '@/components/ui-system';
import { useAuth } from '@/lib/auth-context';
import { BulkBar } from './BulkBar';
import { BulkTagsDialog, EditFileDialog, type TagsSubject } from './FileDialogs';
import { FileList, type FileActions } from './FileList';
import { FolderFormDialog, MoveDialog, type FolderTarget, type MoveSubject } from './FolderDialogs';
import { FolderGrid } from './FolderGrid';
import { FolderTree } from './FolderTree';
import { LocationHeader } from './LocationHeader';
import { SearchBar } from './SearchBar';
import { SetupBanner } from './SetupBanner';
import { UploadDialog } from './UploadDialog';
import { NO_FILTERS, buildTree, flattenTree, isNarrowed } from './documentLogic';
import type { DocFilters, DocFolder, DocumentFile, Place } from './types';
import { useDocumentSearch, useOverview } from './useDocumentsData';
import { useFileDrop } from './useFileDrop';
import { useLibraryActions } from './useLibraryActions';
import { DocumentViewer } from './viewer/DocumentViewer';

const EMPTY_FOLDERS: DocFolder[] = [];

/** The place and words a shared link opened with (?folder=… and ?q=…). */
function fromLink(): { place: Place; q: string } {
  if (typeof window === 'undefined') return { place: { kind: 'home' }, q: '' };
  const p = new URLSearchParams(window.location.search);
  const view = p.get('view');
  const place: Place = p.get('folder') ? { kind: 'folder', id: p.get('folder')! } : view === 'recent' || view === 'starred' || view === 'unfiled' || view === 'trash' ? { kind: view } : { kind: 'home' };
  return { place, q: p.get('q') ?? '' };
}

function DocumentsContent() {
  // The folder tree is the navigation here; the shell sidebar would be a second one.
  useRouteSidebarCollapsed();
  const { isAtLeast } = useAuth();
  const isManager = isAtLeast('manager');
  const overview = useOverview();
  const [initial] = useState(fromLink);
  const [place, setPlace] = useState<Place>(initial.place);
  const [filters, setFilters] = useState<DocFilters>({ ...NO_FILTERS, q: initial.q });
  const [view, setView] = useViewPreference('documents', VIEW_CARDS_TABLE);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [seed, setSeed] = useState<DocumentFile | null>(null);
  const [folderTarget, setFolderTarget] = useState<FolderTarget | null>(null);
  const [moving, setMoving] = useState<MoveSubject | null>(null);
  const [editing, setEditing] = useState<DocumentFile | null>(null);
  const [tagging, setTagging] = useState<TagsSubject | null>(null);
  const [treeOpen, setTreeOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dropped, setDropped] = useState<File[]>([]);

  const folders = overview.overview?.folders ?? EMPTY_FOLDERS;
  const tree = useMemo(() => buildTree(folders), [folders]);
  const flat = useMemo(() => flattenTree(tree), [tree]);
  const facets = overview.overview?.facets ?? { types: {}, exts: [], tags: [], uploaders: [] };
  const counts = overview.overview?.counts ?? { all: 0, unfiled: 0, trashed: 0, starred: 0, unindexed: 0 };
  const search = useDocumentSearch(place, filters);
  const items = useMemo(() => search.result?.items ?? [], [search.result]);
  const chosen = useMemo(() => items.filter(d => selected.has(d.id)), [items, selected]);
  const viewing = previewId ? items.find(d => d.id === previewId) ?? (seed?.id === previewId ? seed : null) : null;
  const folderHere = place.kind === 'folder' ? flat.find(f => f.id === place.id) : undefined;
  const narrowed = isNarrowed(filters);
  const tagNames = useMemo(() => facets.tags.map(t => t.tag), [facets.tags]);

  const refresh = useCallback(() => Promise.all([search.refetch(), overview.refetch()]), [search, overview]);
  const gone = useCallback((ids: string[]) => { setSelected(s => new Set([...s].filter(id => !ids.includes(id)))); setPreviewId(p => (p && ids.includes(p) ? null : p)); }, []);
  const act = useLibraryActions(refresh, gone);

  const go = (next: Place) => {
    setPlace(next); setSelected(new Set()); setPreviewId(null); setTreeOpen(false);
    setFilters(f => ({ ...NO_FILTERS, q: f.q, sort: f.sort }));
    if (typeof window !== 'undefined') {
      const url = next.kind === 'folder' ? `?folder=${next.id}` : next.kind === 'home' ? window.location.pathname : `?view=${next.kind}`;
      window.history.replaceState(null, '', url);
    }
  };
  const change = (patch: Partial<DocFilters>) => { setFilters(f => ({ ...f, ...patch })); setSelected(new Set()); };

  const onFiles = useCallback((files: File[]) => { setDropped(files); setUploading(true); }, []);
  const blocked = uploading || !!folderTarget || !!moving || !!editing || !!tagging;
  const dragging = useFileDrop(!blocked && !overview.upgradeNeeded, onFiles);

  const open = (d: DocumentFile) => { setSeed(d); setPreviewId(d.id); };
  const showFolder = (d: DocumentFile) => { if (d.folderId) { go({ kind: 'folder', id: d.folderId }); } };
  const fileActions: FileActions = {
    onOpen: open, onStar: act.star, onDownload: d => { void act.download([d]); }, onEdit: setEditing,
    onMove: d => setMoving({ kind: 'files', ids: [d.id], names: [d.name], currentFolder: d.folderId }),
    onTrash: d => { void act.trash([d]); }, onRestore: d => { void act.restore([d]); }, onPurge: d => { void act.purge([d]); },
  };
  const bulkMove = () => setMoving({ kind: 'files', ids: chosen.map(d => d.id), names: chosen.map(d => d.name), currentFolder: chosen.every(d => d.folderId === chosen[0].folderId) ? chosen[0].folderId : null });
  const bulkTags = () => setTagging({ ids: chosen.map(d => d.id), count: chosen.length, present: [...new Set(chosen.flatMap(d => d.tags))] });

  const deleteFolderThen = async (f: DocFolder) => {
    if (await act.removeFolder(f)) go(f.parentId ? { kind: 'folder', id: f.parentId } : { kind: 'home' });
  };
  const subfolders = place.kind === 'folder' ? (folderHere?.children ?? []) : place.kind === 'home' ? tree : [];
  const trashView = place.kind === 'trash';

  const emptyState = narrowed
    ? <EmptyState icon="search" title="No files match" description="Try fewer words, or clear the filters." action={<span className="inline-flex flex-wrap gap-2"><Button onClick={() => change({ ...NO_FILTERS, sort: filters.sort })}>Clear search and filters</Button>{place.kind === 'folder' && !filters.everywhere && <Button variant="primary" onClick={() => change({ everywhere: true })}>Search everywhere</Button>}</span>} />
    : trashView ? <EmptyState icon="delete" title="The trash is empty" description="Deleted files wait here until a manager deletes them for good." />
    : place.kind === 'starred' ? <EmptyState icon="starred" title="Nothing starred" description="Star a file to keep it close." />
    : place.kind === 'unfiled' ? <EmptyState icon="documents" title="Nothing is unfiled" description="Every file is in a folder." />
    : <EmptyState icon="documents" title={place.kind === 'folder' ? 'No files in this folder' : 'No files yet'} description="Upload files, drop them on this page, or paste a picture." action={<Button variant="primary" icon="upload" onClick={() => { setDropped([]); setUploading(true); }}>Upload files</Button>} />;

  const treeNav = <FolderTree tree={tree} flat={flat} place={place} counts={counts} onSelect={go} />;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        breadcrumbs={[{ label: 'Core Management' }, { label: 'Documents' }]} title="Documents"
        description="Find any document: search names, comments, tags and the words inside files. Preview, open and print without downloading."
        actions={(
          <>
            <IconButton icon="refresh" label="Refresh documents" variant="shell" pending={(search.loading && search.loaded) || (overview.loading && overview.loaded)} onClick={() => { void refresh(); }} />
            <Button icon="folder-add" disabled={!overview.overview} onClick={() => setFolderTarget({ mode: 'create', parentId: place.kind === 'folder' ? place.id : null })}>New folder</Button>
            <Button variant="primary" icon="upload" disabled={!overview.overview} onClick={() => { setDropped([]); setUploading(true); }}>Upload</Button>
          </>
        )}
      />

      {overview.upgradeNeeded ? (
        <Notice tone="warning" title="The document library needs a one-time upgrade">{overview.error} Nothing is lost: all files are kept, and after the upgrade they are placed in real folders.</Notice>
      ) : overview.error && !overview.overview ? (
        <Notice tone="danger" title="The library could not be loaded" action={<Button size="sm" icon="refresh" onClick={() => { void overview.refetch(); }}>Try again</Button>}>{overview.error}</Notice>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[17rem_minmax(0,1fr)]">
          <aside className="hidden lg:block"><div className="sticky top-4 max-h-[calc(100dvh-7rem)] overflow-y-auto pr-1">{treeNav}</div></aside>
          <div className="flex min-w-0 flex-col gap-4">
            <div className="lg:hidden"><Button icon="folder" onClick={() => setTreeOpen(true)}>Browse folders</Button></div>
            {place.kind === 'home' && !narrowed && <SetupBanner isManager={isManager} amsMissing={overview.overview?.amsMissing ?? 0} unindexed={counts.unindexed} onChanged={() => { void refresh(); }} />}
            <LocationHeader
              place={place} folders={folders} isManager={isManager} onGo={go}
              onNewSub={f => setFolderTarget({ mode: 'create', parentId: f.id })} onRename={f => setFolderTarget({ mode: 'rename', folder: f })}
              onMove={f => setMoving({ kind: 'folder', folder: f })} onDelete={f => { void deleteFolderThen(f); }}
            />
            <SearchBar place={place} filters={filters} facets={facets} view={view} onViewChange={setView} onChange={change} pending={search.pending} />

            {!narrowed && subfolders.length > 0 && (
              <section aria-labelledby="folders-h" className="flex flex-col gap-2">
                <h3 id="folders-h" className="font-sans text-label font-medium text-ink-muted">Folders</h3>
                <FolderGrid
                  folders={subfolders} isManager={isManager} onOpen={f => go({ kind: 'folder', id: f.id })} onNewSub={f => setFolderTarget({ mode: 'create', parentId: f.id })}
                  onRename={f => setFolderTarget({ mode: 'rename', folder: f })} onMove={f => setMoving({ kind: 'folder', folder: f })} onDelete={f => { void deleteFolderThen(f); }}
                />
              </section>
            )}

            {search.upgradeNeeded ? null : (
              <section aria-label="Files" className="flex flex-col gap-3">
                {search.result && (
                  <p className="font-sans text-caption text-ink-muted" role="status">
                    {search.result.total} {search.result.total === 1 ? 'file' : 'files'}{filters.q.trim() ? ` for “${filters.q.trim()}”` : ''}
                    {search.result.truncated ? `. Showing the first ${items.length}; narrow the search to see the rest.` : ''}
                  </p>
                )}
                <BulkBar
                  count={chosen.length} total={items.length} trash={trashView} isManager={isManager}
                  onSelectAll={() => setSelected(new Set(items.map(d => d.id)))} onClear={() => setSelected(new Set())} onMove={bulkMove} onTags={bulkTags}
                  onStar={() => { void act.setStars(chosen, 'star'); }} onUnstar={() => { void act.setStars(chosen, 'unstar'); }} onDownload={() => { void act.download(chosen); }}
                  onTrash={() => { void act.trash(chosen); }} onRestore={() => { void act.restore(chosen); }} onPurge={() => { void act.purge(chosen); }}
                />
                <FileList
                  items={items} terms={search.result?.terms ?? []} view={view} state={search} subject={folderHere?.name ?? 'the library'} actions={fileActions}
                  selected={selected} onSelectedChange={setSelected} showLocation={place.kind !== 'folder' || narrowed} isManager={isManager} emptyHint="Nothing to show here." empty={emptyState}
                />
              </section>
            )}
          </div>
        </div>
      )}

      <Drawer open={treeOpen} onOpenChange={setTreeOpen} title="Folders" description="Choose a folder or a view">{treeNav}</Drawer>

      <DocumentViewer
        doc={viewing} list={items} onNavigate={setPreviewId} onClose={() => setPreviewId(null)} isManager={isManager}
        actions={{
          onStar: d => { void act.star(d).then(() => setSeed(s => (s && s.id === d.id ? { ...s, starred: !d.starred } : s))); }, onEdit: d => { setPreviewId(null); setEditing(d); },
          onMove: d => { setPreviewId(null); setMoving({ kind: 'files', ids: [d.id], names: [d.name], currentFolder: d.folderId }); },
          onTrash: d => { void act.trash([d]); }, onRestore: d => { void act.restore([d]); }, onPurge: d => { void act.purge([d]); }, onShowFolder: showFolder,
        }}
      />

      <UploadDialog
        open={uploading} flat={flat} defaultFolderId={place.kind === 'folder' ? place.id : null} initialFiles={dropped} tagSuggestions={tagNames}
        onOpenChange={o => { setUploading(o); if (!o) setDropped([]); }} onUpload={act.upload} onUploaded={() => { void refresh(); }}
      />
      <FolderFormDialog
        target={folderTarget} flat={flat} onOpenChange={o => { if (!o) setFolderTarget(null); }}
        onSave={async (t, name, parentId, description) => {
          if (t.mode === 'create') { const made = await act.makeFolder(parentId, name, description); go({ kind: 'folder', id: made.id }); }
          else await act.renameFolder(t.folder, name, description);
        }}
      />
      <MoveDialog
        subject={moving} flat={flat} onOpenChange={o => { if (!o) setMoving(null); }}
        onMove={async (s, folderId) => { if (s.kind === 'folder') await act.moveFolder(s.folder, folderId); else { await act.moveFiles(s.ids, folderId); setSelected(new Set()); } }}
      />
      <EditFileDialog doc={editing} suggestions={tagNames} onOpenChange={o => { if (!o) setEditing(null); }} onSave={act.saveDetails} />
      <BulkTagsDialog subject={tagging} suggestions={tagNames} onOpenChange={o => { if (!o) setTagging(null); }} onApply={async (s, mode, tags) => { await act.applyTags(s.ids, mode, tags); setSelected(new Set()); }} />

      {dragging && (
        <div className="pointer-events-none fixed inset-0 z-dialog flex items-center justify-center bg-surface/80 backdrop-blur-sm" role="status">
          <p className="rounded-panel border-2 border-dashed border-action bg-surface px-8 py-6 font-display text-section font-semibold text-ink">Drop files to upload{place.kind === 'folder' ? ` into ${folderHere?.name ?? 'this folder'}` : ''}</p>
        </div>
      )}
    </div>
  );
}

export default function DocumentsPage() {
  return <AppShell migrated><DocumentsContent /></AppShell>;
}

