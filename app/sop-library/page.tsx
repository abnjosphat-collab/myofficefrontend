// app/sop-library/page.tsx — SOP Library: the living, persisted replacement for
// static SOP Word documents. AppShell + the shared design system throughout;
// the persisted sop_documents/sop_revisions rows are the single source of truth
// — the cards here and the Word/PDF exports are two renderings of that same
// saved data, never a separately-maintained copy.
'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { AppShell } from '@/components/app-shell';
import {
  useTheme, PageHero, StatStrip, SearchInput, SelectField, EmptyState, PrimaryButton,
  LoadingState, useConfirm, staggerContainer, fadeUp,
} from '@/components/shared/theme';
import { BookOpen, Plus, FileWarning, Archive as ArchiveIcon } from '@/components/shared/theme';
import { useAuth } from '@/lib/auth-context';
import { useSopsData } from './useSopsData';
import { SopCard } from '@/components/sop-library/SopCard';
import { SopFormModal } from '@/components/sop-library/SopFormModal';
import { exportSopToWord } from '@/lib/sops/exportWord';
import { exportSopToPdf } from '@/lib/sops/exportPdf';
import {
  SOP_STATUSES, SOP_STATUS_LABEL, isReviewOverdue, isReviewDueSoon,
  type SopDocument, type SopFormValues, type SopRevision,
} from '@/lib/sops/types';
import { fetchSop } from '@/lib/sops/api';
import { toast } from 'sonner';
import { ApiError } from '@/lib/apiClient';

export default function SopLibraryPage() {
  const t = useTheme();
  const { isAtLeast } = useAuth();
  const confirm = useConfirm();
  const canEdit = isAtLeast('manager');
  const canApprove = isAtLeast('admin');

  const {
    sops, loading, error,
    archived, archivedLoading, loadArchived,
    create, update, archive, restore, refreshOne,
  } = useSopsData();

  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('');
  const [reviewFilter, setReviewFilter] = useState<'' | 'overdue' | 'due_soon'>('');

  const [showArchive, setShowArchive] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingSop, setEditingSop] = useState<SopDocument | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);
  // Bumped on every open so SopFormModal remounts fresh (its own form state is
  // seeded once, lazily, on mount — see its comment) instead of needing an effect
  // to re-sync state when switching between "create" and "edit an SOP that's
  // already open" without the modal ever fully closing in between.
  const [formKey, setFormKey] = useState(0);

  const departments = useMemo(() => Array.from(new Set(sops.map(s => s.department).filter(Boolean))).sort(), [sops]);
  const owners = useMemo(() => Array.from(new Set(sops.map(s => s.owner).filter(Boolean))).sort(), [sops]);

  const filtered = useMemo(() => sops.filter(s => {
    if (search) {
      const q = search.toLowerCase();
      if (!s.code.toLowerCase().includes(q) && !s.title.toLowerCase().includes(q) && !s.summary.toLowerCase().includes(q)) return false;
    }
    if (departmentFilter && s.department !== departmentFilter) return false;
    if (statusFilter && s.status !== statusFilter) return false;
    if (ownerFilter && s.owner !== ownerFilter) return false;
    if (reviewFilter === 'overdue' && !isReviewOverdue(s)) return false;
    if (reviewFilter === 'due_soon' && !isReviewDueSoon(s)) return false;
    return true;
  }), [sops, search, departmentFilter, statusFilter, ownerFilter, reviewFilter]);

  const counts = useMemo(() => ({
    total: sops.length,
    effective: sops.filter(s => s.status === 'effective').length,
    draft: sops.filter(s => s.status === 'draft').length,
    dueForReview: sops.filter(s => isReviewOverdue(s) || isReviewDueSoon(s)).length,
  }), [sops]);

  const openCreate = () => { setEditingSop(undefined); setFormKey(k => k + 1); setFormOpen(true); };
  const openEdit = (sop: SopDocument) => { setEditingSop(sop); setFormKey(k => k + 1); setFormOpen(true); };

  const handleSubmit = async (values: SopFormValues) => {
    setSubmitting(true);
    try {
      if (editingSop) {
        if (values.status === 'effective' && !canApprove) {
          toast.error('Marking an SOP Effective requires an admin role.');
          return;
        }
        await update(editingSop.id, values);
      } else {
        await create(values);
      }
      setFormOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleArchive = async (sop: SopDocument) => {
    const ok = await confirm({
      title: `Archive ${sop.code}?`,
      message: 'Archived SOPs move out of the main library but can be restored at any time by a manager — nothing is deleted.',
      confirmLabel: 'Archive',
      destructive: true,
    });
    if (ok) await archive(sop);
  };

  const handleExportWord = async (sop: SopDocument) => {
    const fresh = await refreshOne(sop.id);
    if (fresh) await exportSopToWord(fresh.sop);
  };
  const handleExportPdf = async (sop: SopDocument) => {
    const fresh = await refreshOne(sop.id);
    if (fresh) await exportSopToPdf(fresh.sop);
  };

  const loadRevisionsFor = (sopId: string) => async (): Promise<SopRevision[]> => {
    try {
      const { revisions } = await fetchSop(sopId);
      return revisions;
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Could not load revision history.');
      return [];
    }
  };

  const toggleArchivePanel = () => {
    setShowArchive(v => !v);
    if (!showArchive && archived.length === 0) loadArchived();
  };

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        <PageHero
          icon={BookOpen}
          accent="violet"
          crumbs={['MyOffice', 'SOP Library']}
          title="SOP Library"
          description="The Ozech Operating System — living, versioned standard operating procedures, replacing static Word documents as the source of truth."
          statsOpen
          actions={
            <>
              <PrimaryButton icon={ArchiveIcon} onClick={toggleArchivePanel} accent="violet" className={showArchive ? 'brightness-110' : ''}>
                {showArchive ? 'Hide Archive' : 'Archive'}
              </PrimaryButton>
              {canEdit && <PrimaryButton icon={Plus} onClick={openCreate} accent="violet">New SOP</PrimaryButton>}
            </>
          }
        >
          <StatStrip items={[
            { label: 'SOPs', value: counts.total },
            { label: 'Effective', value: counts.effective },
            { label: 'Draft', value: counts.draft },
            { label: 'Due for Review', value: counts.dueForReview },
          ]} />
        </PageHero>

        <div className={`${t.glass} rounded-2xl ${t.shadow} p-4 flex flex-wrap items-center gap-2`}>
          <SearchInput value={search} onChange={setSearch} placeholder="Search code, title, summary…" className="w-full sm:w-64" />
          <SelectField value={departmentFilter} onChange={setDepartmentFilter} options={departments} size="filter" placeholder="All Departments" className="w-44" />
          <SelectField
            value={statusFilter} onChange={setStatusFilter} size="filter" placeholder="All Statuses" className="w-40"
            options={SOP_STATUSES.map(s => ({ value: s, label: SOP_STATUS_LABEL[s] }))}
          />
          <SelectField value={ownerFilter} onChange={setOwnerFilter} options={owners} size="filter" placeholder="All Owners" className="w-40" />
          <SelectField
            value={reviewFilter} onChange={v => setReviewFilter(v as typeof reviewFilter)} size="filter" placeholder="Any Review Date" className="w-44"
            options={[{ value: 'overdue', label: 'Review Overdue' }, { value: 'due_soon', label: 'Due Within 30 Days' }]}
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 text-sm text-rose-500 px-1">
            <FileWarning className="h-4 w-4 shrink-0" /> {error}
          </div>
        )}

        {loading ? (
          <LoadingState label="Loading the SOP library…" />
        ) : showArchive ? (
          <ArchivePanel
            archived={archived} loading={archivedLoading} canEdit={canEdit}
            onRestore={sop => confirm({ title: `Restore ${sop.code}?`, message: 'It will reappear in the main library.', confirmLabel: 'Restore' }).then(ok => { if (ok) restore(sop); })}
            onExportWord={handleExportWord} onExportPdf={handleExportPdf}
            loadRevisionsFor={loadRevisionsFor}
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title={sops.length === 0 ? 'No SOPs yet' : 'No SOPs match these filters'}
            message={sops.length === 0
              ? (canEdit ? 'Create the first SOP to start replacing static Word documents.' : 'Nothing has been published to the library yet.')
              : 'Try clearing a filter or search term.'}
            action={sops.length === 0 && canEdit ? { label: 'New SOP', onClick: openCreate } : undefined}
          />
        ) : (
          <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-3">
            {filtered.map(sop => (
              <motion.div key={sop.id} variants={fadeUp}>
                <SopCard
                  sop={sop}
                  canEdit={canEdit}
                  canArchive={canEdit}
                  onEdit={() => openEdit(sop)}
                  onExportWord={() => handleExportWord(sop)}
                  onExportPdf={() => handleExportPdf(sop)}
                  onArchive={() => handleArchive(sop)}
                  loadRevisions={loadRevisionsFor(sop.id)}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      <SopFormModal key={formKey} open={formOpen} onClose={() => setFormOpen(false)} sop={editingSop} onSubmit={handleSubmit} submitting={submitting} />
    </AppShell>
  );
}

function ArchivePanel({
  archived, loading, canEdit, onRestore, onExportWord, onExportPdf, loadRevisionsFor,
}: {
  archived: SopDocument[];
  loading: boolean;
  canEdit: boolean;
  onRestore: (sop: SopDocument) => void;
  onExportWord: (sop: SopDocument) => void;
  onExportPdf: (sop: SopDocument) => void;
  loadRevisionsFor: (sopId: string) => () => Promise<SopRevision[]>;
}) {
  if (loading) return <LoadingState label="Loading archived SOPs…" />;
  if (archived.length === 0) {
    return <EmptyState icon={ArchiveIcon} title="Nothing archived" message="Archived SOPs will show up here, restorable at any time." />;
  }
  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-3">
      {archived.map(sop => (
        <motion.div key={sop.id} variants={fadeUp}>
          <SopCard
            sop={sop}
            archived
            canEdit={canEdit}
            canArchive={canEdit}
            onEdit={() => {}}
            onExportWord={() => onExportWord(sop)}
            onExportPdf={() => onExportPdf(sop)}
            onRestore={() => onRestore(sop)}
            loadRevisions={loadRevisionsFor(sop.id)}
          />
        </motion.div>
      ))}
    </motion.div>
  );
}
