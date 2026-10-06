// app/sop-library/page.tsx — SOP Library: the living, persisted replacement for static SOP Word
// documents. The persisted sop_documents / sop_revisions rows are the single source of truth: the cards,
// the viewer and the Word/PDF exports are renderings of that same saved data, never a separate copy.
'use client';

import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AppShell } from '@/components/app-shell';
import {
  Button, DataRegion, EmptyState, MetricGrid, MetricTile, PageHeader, SearchField, Segmented, Select, Toolbar, deriveDataStatus, isTransientStatus, useConfirm,
  type DataStatus, FilterField
} from '@/components/ui-system';
import { useAuth } from '@/lib/auth-context';
import { ApiError } from '@/lib/apiClient';
import { useSopsData } from './useSopsData';
import { SopCard } from '@/components/sop-library/SopCard';
import { SopViewer } from '@/components/sop-library/SopViewer';
import { SopFormDialog } from '@/components/sop-library/SopFormDialog';
import { exportSopToWord } from '@/lib/sops/exportWord';
import { exportSopToPdf } from '@/lib/sops/exportPdf';
import { SOP_STATUSES, SOP_STATUS_LABEL, isReviewDueSoon, isReviewOverdue, type SopDocument, type SopFormValues, type SopRevision } from '@/lib/sops/types';
import { fetchSop } from '@/lib/sops/api';

const ALL = '__all__';

function SopLibraryContent() {
  const { isAtLeast } = useAuth();
  const confirm = useConfirm();
  const canEdit = isAtLeast('manager');
  const canApprove = isAtLeast('admin');
  const { sops, loading, error, load, archived, archivedLoading, loadArchived, create, update, archive, restore, refreshOne } = useSopsData();

  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState(ALL);
  const [status, setStatus] = useState(ALL);
  const [owner, setOwner] = useState(ALL);
  const [review, setReview] = useState(ALL);
  const [scope, setScope] = useState<'library' | 'archive'>('library');
  const [viewing, setViewing] = useState<SopDocument | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SopDocument | undefined>(undefined);

  const departments = useMemo(() => [...new Set(sops.map(s => s.department).filter(Boolean))].sort(), [sops]);
  const owners = useMemo(() => [...new Set(sops.map(s => s.owner).filter(Boolean))].sort(), [sops]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sops.filter(s =>
      (!q || s.code.toLowerCase().includes(q) || s.title.toLowerCase().includes(q) || s.summary.toLowerCase().includes(q))
      && (department === ALL || s.department === department)
      && (status === ALL || s.status === status)
      && (owner === ALL || s.owner === owner)
      && (review === ALL || (review === 'overdue' ? isReviewOverdue(s) : isReviewDueSoon(s))));
  }, [sops, search, department, status, owner, review]);

  const counts = useMemo(() => ({
    total: sops.length,
    effective: sops.filter(s => s.status === 'effective').length,
    draft: sops.filter(s => s.status === 'draft').length,
    dueForReview: sops.filter(s => isReviewOverdue(s) || isReviewDueSoon(s)).length,
  }), [sops]);

  const loaded = sops.length > 0 || (!loading && !error);
  const libraryStatus: DataStatus = deriveDataStatus({ loaded, loading, error, errorStatus: null, count: filtered.length, transient: isTransientStatus(null) });
  const archiveStatus: DataStatus = archivedLoading ? 'loading' : archived.length === 0 ? 'empty' : 'ready';
  const hasFilters = !!search || department !== ALL || status !== ALL || owner !== ALL || review !== ALL;

  const openCreate = () => { setEditing(undefined); setFormOpen(true); };
  const openEdit = (sop: SopDocument) => { setViewing(null); setEditing(sop); setFormOpen(true); };

  /** Resolves true when saved. create/update report their own failure with a toast and resolve null. */
  const submit = async (values: SopFormValues): Promise<boolean> => {
    if (editing) {
      if (values.status === 'effective' && !canApprove) { toast.error('Marking an SOP as effective needs an admin role.'); return false; }
      return (await update(editing.id, values)) !== null;
    }
    return (await create(values)) !== null;
  };

  const handleArchive = async (sop: SopDocument) => {
    if (await confirm({ title: `Archive ${sop.code}?`, message: 'Archived SOPs move out of the main library and can be restored at any time by a manager. Nothing is deleted.', confirmLabel: 'Archive', destructive: true })) {
      setViewing(null);
      await archive(sop);
    }
  };
  const handleRestore = async (sop: SopDocument) => {
    if (await confirm({ title: `Restore ${sop.code}?`, message: 'It will reappear in the main library.', confirmLabel: 'Restore' })) await restore(sop);
  };
  const exportWord = async (sop: SopDocument) => { const fresh = await refreshOne(sop.id); if (fresh) await exportSopToWord(fresh.sop); };
  const exportPdf = async (sop: SopDocument) => { const fresh = await refreshOne(sop.id); if (fresh) await exportSopToPdf(fresh.sop); };

  const loadRevisions = useCallback(async (sopId: string): Promise<SopRevision[] | null> => {
    try { return (await fetchSop(sopId)).revisions; }
    catch (e) { toast.error(e instanceof ApiError ? e.message : 'Could not load revision history.'); return null; }
  }, []);

  const showArchive = scope === 'archive';
  const switchScope = (next: 'library' | 'archive') => { setScope(next); if (next === 'archive' && archived.length === 0) loadArchived(); };
  const list = showArchive ? archived : filtered;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        breadcrumbs={[{ label: 'MyOffice' }, { label: 'SOP library' }]}
        title="SOP library"
        description="Living, versioned standard operating procedures, replacing static Word documents as the source of truth."
        actions={canEdit ? <Button variant="primary" icon="plus" onClick={openCreate}>New SOP</Button> : undefined}
      />

      <MetricGrid compact>
        <MetricTile compact label="SOPs" value={counts.total} loading={loading && !loaded} unavailable={!loaded && !loading} />
        <MetricTile compact label="Effective" tone="success" value={counts.effective} loading={loading && !loaded} unavailable={!loaded && !loading} />
        <MetricTile compact label="Draft" value={counts.draft} loading={loading && !loaded} unavailable={!loaded && !loading} />
        <MetricTile compact label="Due for review" tone="warning" value={counts.dueForReview} loading={loading && !loaded} unavailable={!loaded && !loading} />
      </MetricGrid>

      <Toolbar
        filtered={hasFilters}
        activeCount={(owner !== ALL ? 1 : 0) + (review !== ALL ? 1 : 0)}
        trailing={<Segmented label="Library scope" value={scope} onValueChange={switchScope} options={[{ value: 'library', label: 'Library' }, { value: 'archive', label: 'Archive' }]} />}
        moreFilters={!showArchive ? (
          <>
            <FilterField label="Owner"><Select aria-label="Filter by owner" value={owner} onValueChange={setOwner} options={[{ value: ALL, label: 'All owners' }, ...owners.map(o => ({ value: o, label: o }))]} /></FilterField>
            <FilterField label="Review date"><Select aria-label="Filter by review date" value={review} onValueChange={setReview} options={[{ value: ALL, label: 'Any review date' }, { value: 'overdue', label: 'Review overdue' }, { value: 'due_soon', label: 'Due within 30 days' }]} /></FilterField>
          </>
        ) : undefined}
      >
        {!showArchive && (
          <>
            <SearchField value={search} onValueChange={setSearch} placeholder="Search code, title or summary" wrapperClassName="min-w-56 max-w-sm flex-1 max-md:max-w-none max-md:basis-full" />
            <Select className="w-44" aria-label="Filter by department" value={department} onValueChange={setDepartment} options={[{ value: ALL, label: 'All departments' }, ...departments.map(d => ({ value: d, label: d }))]} />
            <Select className="w-40" aria-label="Filter by status" value={status} onValueChange={setStatus} options={[{ value: ALL, label: 'All statuses' }, ...SOP_STATUSES.map(s => ({ value: s, label: SOP_STATUS_LABEL[s] }))]} />
          </>
        )}
      </Toolbar>

      <DataRegion
        status={showArchive ? archiveStatus : libraryStatus}
        subject={showArchive ? 'archived SOPs' : 'SOPs'}
        error={error ?? undefined}
        onRetry={() => load()}
        empty={showArchive
          ? <EmptyState icon="archive" title="Nothing archived" description="Archived SOPs show up here and can be restored at any time." />
          : hasFilters
            ? <EmptyState icon="search" title="No SOPs match these filters" description="Try clearing a filter or the search." action={<Button onClick={() => { setSearch(''); setDepartment(ALL); setStatus(ALL); setOwner(ALL); setReview(ALL); }}>Clear filters</Button>} />
            : <EmptyState icon="documents" title="No SOPs yet" description={canEdit ? 'Create the first SOP to start replacing static Word documents.' : 'Nothing has been published to the library yet.'} action={canEdit ? <Button variant="primary" icon="plus" onClick={openCreate}>New SOP</Button> : undefined} />}
      >
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          {list.map(sop => (
            <SopCard
              key={sop.id}
              sop={sop}
              canEdit={canEdit}
              archived={showArchive}
              onOpen={() => setViewing(sop)}
              onEdit={() => openEdit(sop)}
              onExportWord={() => exportWord(sop)}
              onExportPdf={() => exportPdf(sop)}
              onArchive={() => handleArchive(sop)}
              onRestore={() => handleRestore(sop)}
            />
          ))}
        </div>
      </DataRegion>

      <SopViewer
        sop={viewing}
        onClose={() => setViewing(null)}
        loadRevisions={loadRevisions}
        canEdit={canEdit}
        archived={showArchive}
        onEdit={openEdit}
        onExportWord={exportWord}
        onExportPdf={exportPdf}
      />
      <SopFormDialog open={formOpen} onOpenChange={setFormOpen} sop={editing} onSubmit={submit} />
    </div>
  );
}

export default function SopLibraryPage() {
  return <AppShell migrated><SopLibraryContent /></AppShell>;
}
