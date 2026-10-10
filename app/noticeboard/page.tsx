// app/noticeboard/page.tsx — company notices and announcements
'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AppShell } from '@/components/app-shell';
import { Button, Checkbox, ChartPanel, DataRegion, DataTable, Dialog, Distribution, EmptyState, Field, FormDialog, Icon, IconButton, Input, MetricGrid, MetricTile, PageHeader, RecordCard, SearchField, Select, StatusBadge, Textarea, Toolbar, ViewToggle, VIEW_CARDS_TABLE, deriveDataStatus, isTransientStatus, sortRows, useConfirm, useViewPreference, type Column, type IconMeaning, type SortState, type Tone, FilterField, Fact, FactList, DetailActions, RowActions } from '@/components/ui-system';
import { DownloadButton, type DLColumn } from '@/components/shared/DownloadButton';
import { exportFilename } from '@/lib/exportUtils';
import { fmtDate as formatDate, fmtDateTime as formatDateTime } from '@/components/shared/utils';
import type { Attachment, Notice, NoticeFilters, NoticeFormData } from './types';
import { archiveNotice, createNotice, deleteNotice, togglePin, updateNotice, uploadNoticeAttachment, useNoticeboardData } from './useNoticeboardData';
import { attachmentKind, isPreviewableImage, NOTICE_ATTACHMENT_ACCEPT, type AttachmentKind } from './attachments';
import { exportPriorityColor, priorityTone, statusTone } from '@/lib/status';
import { useConfirmDelete } from '@/lib/useConfirmDelete';
import { dialogKey, useResetOnOpen } from '@/lib/useResetOnOpen';

const CATEGORIES = ['HR', 'Safety', 'IT', 'General', 'Operations', 'Finance'];
const PRIORITIES = ['Critical', 'High', 'Medium', 'Low'];
const STATUSES = ['Draft', 'Active', 'Archived'];
const DEPARTMENTS = ['HR', 'IT', 'Operations', 'Finance', 'Marketing', 'Sales', 'General'];
const TARGET_AUDIENCE = ['All Employees', 'Management Only', 'Department Specific', 'Remote Workers', 'New Hires'];
const NOTIFICATION_TYPES = ['General Announcement', 'System Alert', 'Training', 'Policy Update', 'Event', 'Reminder'];
const ALL = '__all__';
const NO_FILTERS: NoticeFilters = { category: ALL, priority: ALL, status: ALL, department: ALL, is_pinned: null };

const PRIORITY_META: Record<string, { tone: Tone; icon: IconMeaning }> = {
  Critical: { tone: priorityTone('Critical'), icon: 'critical' }, High: { tone: priorityTone('High'), icon: 'warning' }, Medium: { tone: priorityTone('Medium'), icon: 'info' }, Low: { tone: priorityTone('Low'), icon: 'flag' },
};
const STATUS_META: Record<string, { tone: Tone; icon: IconMeaning }> = { Active: { tone: statusTone('Active'), icon: 'active' }, Draft: { tone: statusTone('Draft'), icon: 'draft' }, Archived: { tone: statusTone('Archived'), icon: 'archive' } };
const KIND_ICON: Record<AttachmentKind, IconMeaning> = { image: 'image', video: 'attachment', audio: 'attachment', pdf: 'pdf', spreadsheet: 'table-view', document: 'documents', archive: 'archive', file: 'attachment' };

const PriorityTag = ({ priority }: { priority: string }) => { const m = PRIORITY_META[priority]; return <StatusBadge tone={m?.tone ?? 'neutral'} icon={m?.icon}>{priority}</StatusBadge>; };
const StatusTag = ({ status }: { status: string }) => { const m = STATUS_META[status]; return <StatusBadge tone={m?.tone ?? 'neutral'} icon={m?.icon}>{status}</StatusBadge>; };
const truncate = (text: string | null | undefined, max = 100) => (!text ? '' : text.length <= max ? text : `${text.slice(0, max)}…`);
const dayOf = (v?: string | null) => (v ? v.split('T')[0] : '');
const expiry = (n: Notice, now: number) => {
  const t = n.expires_at ? new Date(n.expires_at).getTime() : NaN;
  if (Number.isNaN(t)) return { expired: false, soon: false };
  return { expired: t < now, soon: t >= now && t <= now + 7 * 86400000 };
};
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;

function Thumb({ attachment }: { attachment: Attachment }) {
  if (isPreviewableImage(attachment.name) && attachment.url) {
    // A remote storage URL for an arbitrary upload, not a build-time asset next/image can optimise.
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={attachment.url} alt="" className="size-10 shrink-0 rounded-control border border-line object-cover" />;
  }
  return <span aria-hidden="true" className="flex size-10 shrink-0 items-center justify-center rounded-control bg-surface-muted text-ink-muted"><Icon name={KIND_ICON[attachmentKind(attachment.name)]} size="lg" weight="navigation" /></span>;
}

const emptyForm = (): NoticeFormData => ({
  title: '', content: '', date: new Date().toISOString().slice(0, 10), category: 'General', priority: 'Medium', status: 'Draft', is_pinned: false, requires_acknowledgment: false,
  author: '', department: 'General', expires_at: '', target_audience: 'All Employees', notification_type: 'General Announcement', attachments: [],
});

function NoticeDialog({ notice, open, onOpenChange, onSaved }: { notice?: Notice; open: boolean; onOpenChange: (open: boolean) => void; onSaved: () => void }) {
  const [form, setForm] = useState<NoticeFormData>(emptyForm);
  const [touched, setTouched] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  useResetOnOpen(dialogKey(open, notice?.id), () => {
    setTouched(false); setUploadError(null);
    setForm(notice ? {
      title: notice.title || '', content: notice.content || '', date: dayOf(notice.date) || emptyForm().date, category: notice.category || 'General', priority: notice.priority || 'Medium',
      status: notice.status || 'Draft', is_pinned: !!notice.is_pinned, requires_acknowledgment: !!notice.requires_acknowledgment, author: notice.author || '', department: notice.department || 'General',
      expires_at: dayOf(notice.expires_at), target_audience: notice.target_audience || 'All Employees', notification_type: notice.notification_type || 'General Announcement', attachments: notice.attachments || [],
    } : emptyForm());
  });
  const set = (p: Partial<NoticeFormData>) => setForm(f => ({ ...f, ...p }));

  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = ''; // allow picking the same file again after a failed upload
    if (!files.length) return;
    setUploading(true); setUploadError(null);
    const results = await Promise.allSettled(files.map(uploadNoticeAttachment));
    const ok = results.filter((r): r is PromiseFulfilledResult<Attachment> => r.status === 'fulfilled').map(r => r.value);
    const failed = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
    if (ok.length) { setForm(f => ({ ...f, attachments: [...f.attachments, ...ok] })); toast.success(`Uploaded ${plural(ok.length, 'attachment')}.`); }
    if (failed.length) setUploadError(`${plural(failed.length, 'attachment')} could not be uploaded: ${(failed[0].reason as Error)?.message ?? 'unknown error'}`);
    setUploading(false);
  };

  const submit = async () => {
    setTouched(true);
    if (!form.title.trim() || !form.content.trim() || !form.date || !form.category) return false;
    if (uploading) throw new Error('Wait for the attachments to finish uploading.');
    if (notice) await updateNotice(notice.id, form); else await createNotice(form);
    toast.success(notice ? 'Notice updated.' : 'Notice created.');
    onSaved();
  };

  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title={notice ? 'Edit notice' : 'Create notice'} description="Title, content, publish date and category are required." submitLabel={notice ? 'Save changes' : 'Create notice'} onSubmit={submit} size="lg">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2"><Field label="Title" required error={touched && !form.title.trim() ? 'Enter a title.' : undefined}><Input value={form.title} onChange={e => set({ title: e.target.value })} placeholder="Enter notice title" /></Field></div>
        <div className="sm:col-span-2"><Field label="Content" required error={touched && !form.content.trim() ? 'Enter the notice content.' : undefined}><Textarea rows={5} value={form.content} onChange={e => set({ content: e.target.value })} placeholder="Enter notice content" /></Field></div>
        <Field label="Publish date" required error={touched && !form.date ? 'Enter the publish date.' : undefined}><Input type="date" value={form.date} onChange={e => set({ date: e.target.value })} /></Field>
        <Field label="Category" required><Select aria-label="Category" value={form.category} onValueChange={v => set({ category: v })} options={CATEGORIES.map(c => ({ value: c, label: c }))} /></Field>
        <Field label="Priority"><Select aria-label="Priority" value={form.priority} onValueChange={v => set({ priority: v })} options={PRIORITIES.map(p => ({ value: p, label: p }))} /></Field>
        <Field label="Status"><Select aria-label="Status" value={form.status} onValueChange={v => set({ status: v })} options={STATUSES.map(s => ({ value: s, label: s }))} /></Field>
        <Field label="Author" optional><Input value={form.author} onChange={e => set({ author: e.target.value })} placeholder="Enter author name" /></Field>
        <Field label="Department"><Select aria-label="Department" value={form.department} onValueChange={v => set({ department: v })} options={DEPARTMENTS.map(d => ({ value: d, label: d }))} /></Field>
        <Field label="Target audience"><Select aria-label="Target audience" value={form.target_audience} onValueChange={v => set({ target_audience: v })} options={TARGET_AUDIENCE.map(a => ({ value: a, label: a }))} /></Field>
        <Field label="Notification type"><Select aria-label="Notification type" value={form.notification_type} onValueChange={v => set({ notification_type: v })} options={NOTIFICATION_TYPES.map(n => ({ value: n, label: n }))} /></Field>
        <Field label="Expiry date" optional description="Leave blank for a notice that never expires."><Input type="date" min={form.date} value={form.expires_at} onChange={e => set({ expires_at: e.target.value })} /></Field>
        <div className="sm:col-span-2">
          <Field label={`Attachments${form.attachments.length ? ` (${form.attachments.length})` : ''}`} optional description="Several files can be added, in more than one go.">
            <Input type="file" multiple accept={NOTICE_ATTACHMENT_ACCEPT} disabled={uploading} onChange={upload} />
          </Field>
          {uploading && <p role="status" className="mt-2 font-sans text-caption text-ink-muted">Uploading…</p>}
          {uploadError && <p role="alert" className="mt-2 font-sans text-caption text-danger">{uploadError}</p>}
          {form.attachments.length > 0 && (
            <ul className="mt-2 flex flex-col gap-1.5">
              {form.attachments.map((a, i) => (
                <li key={`${a.url}-${i}`} className="flex items-center gap-3 rounded-card border border-line px-2.5 py-1.5">
                  <Thumb attachment={a} />
                  <span className="min-w-0 flex-1"><span className="block truncate font-sans text-body-sm text-ink">{a.name}</span>{a.size && <span className="block font-sans text-caption text-ink-muted">{a.size}</span>}</span>
                  <IconButton icon="close" size="sm" label={`Remove attachment ${a.name}`} onClick={() => set({ attachments: form.attachments.filter((_, j) => j !== i) })} />
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex flex-wrap gap-6 sm:col-span-2">
          <Checkbox label="Pin to top" checked={form.is_pinned} onChange={e => set({ is_pinned: e.target.checked })} />
          <Checkbox label="Require acknowledgment" checked={form.requires_acknowledgment} onChange={e => set({ requires_acknowledgment: e.target.checked })} />
        </div>
      </div>
    </FormDialog>
  );
}

function DetailDialog({ notice, now, onClose, onEdit, onDelete, onTogglePin }: { notice: Notice | null; now: number; onClose: () => void; onEdit: (n: Notice) => void; onDelete: (n: Notice) => void; onTogglePin: (n: Notice) => void }) {
  const ex = notice ? expiry(notice, now) : { expired: false, soon: false };
  const share = async () => {
    if (!notice) return;
    if (navigator.share) { try { await navigator.share({ title: notice.title, text: truncate(notice.content, 200), url: window.location.href }); } catch { /* the user dismissed the share sheet */ } return; }
    await copy();
  };
  const copy = async () => {
    if (!notice) return;
    try { await navigator.clipboard.writeText(`${notice.title}\n\n${notice.content}`); toast.success('Notice copied to the clipboard.'); } catch { toast.error('The notice could not be copied.'); }
  };
  return (
    <Dialog
      open={!!notice}
      onOpenChange={open => { if (!open) onClose(); }}
      title={notice?.title ?? 'Notice'}
      description={notice ? `${notice.author || 'Unknown author'}, ${formatDate(notice.date)}` : undefined}
      size="lg"
      footer={notice && (
        <DetailActions onDelete={() => onDelete(notice)} onClose={onClose} onEdit={() => onEdit(notice)} editLabel="Edit notice" />
      )}
    >
      {notice && (
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap gap-2">{notice.is_pinned && <StatusBadge tone="warning" icon="pinned">Pinned</StatusBadge>}<PriorityTag priority={notice.priority} /><StatusTag status={notice.status} />{ex.expired && <StatusBadge tone="danger" icon="expired">Expired</StatusBadge>}{ex.soon && <StatusBadge tone="warning" icon="due-soon">Expires soon</StatusBadge>}</div>
          <p className="whitespace-pre-wrap rounded-card bg-surface-muted p-4 font-sans text-body text-ink">{notice.content}</p>
          <FactList columns={3}>
            <Fact label="Department">{notice.department || 'Not specified'}</Fact>
            <Fact label="Target audience">{notice.target_audience || 'All Employees'}</Fact>
            <Fact label="Notification type">{notice.notification_type || 'General'}</Fact>
            <Fact label="Acknowledgment">{notice.requires_acknowledgment ? 'Required' : 'Not required'}</Fact>
            <Fact label="Expires">{notice.expires_at ? formatDate(notice.expires_at) : 'Never'}</Fact>
            {notice.created_at && <Fact label="Created">{formatDateTime(notice.created_at)}</Fact>}
            {notice.updated_at && <Fact label="Last updated">{formatDateTime(notice.updated_at)}</Fact>}
          </FactList>
          {!!notice.attachments?.length && (
            <section aria-labelledby="nb-attachments">
              <h3 id="nb-attachments" className="mb-2 font-sans text-caption text-ink-muted">Attachments ({notice.attachments.length})</h3>
              <ul className="flex flex-col gap-2">
                {notice.attachments.map((a, i) => (
                  <li key={`${a.url}-${i}`} className="flex items-center gap-3 rounded-card border border-line p-2.5">
                    <Thumb attachment={a} />
                    <span className="min-w-0 flex-1"><span className="block truncate font-sans text-body text-ink">{a.name || 'Unnamed file'}</span>{a.size && <span className="block font-sans text-caption text-ink-muted">{a.size}</span>}</span>
                    {a.url && <a href={a.url} target="_blank" rel="noopener noreferrer" className="focus-ring rounded-xs font-sans text-label font-medium text-action underline underline-offset-2">Download<span className="sr-only"> {a.name || 'attachment'}</span></a>}
                  </li>
                ))}
              </ul>
            </section>
          )}
          <div className="flex flex-wrap gap-2 border-t border-line pt-4">
            <Button icon="external" onClick={share}>Share</Button>
            <Button icon="copy" onClick={copy}>Copy</Button>
            <Button icon="pin" onClick={() => onTogglePin(notice)}>{notice.is_pinned ? 'Unpin' : 'Pin'}</Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}

const EXPORT_COLUMNS: DLColumn[] = [
  { key: 'title', label: 'Title', width: 30 },
  { key: 'category', label: 'Category', width: 16 },
  { key: 'priority', label: 'Priority', width: 12 },
  { key: 'status', label: 'Status', width: 12 },
  { key: 'author', label: 'Author', width: 18 },
  { key: 'department', label: 'Department', width: 18 },
  { key: 'date', label: 'Date', width: 14, format: v => (v ? formatDate(v as string) : '') },
  { key: 'expires_at', label: 'Expires', width: 14, format: v => (v ? formatDate(v as string) : '') },
];

function NoticeboardContent() {
  const confirm = useConfirm();
  const confirmDelete = useConfirmDelete();
  const [view, setView] = useViewPreference('noticeboard', VIEW_CARDS_TABLE);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<NoticeFilters>(NO_FILTERS);
  const [hideExpired, setHideExpired] = useState(false);
  const [sort, setSort] = useState<SortState>(null);
  const [editing, setEditing] = useState<Notice | undefined>();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [now] = useState(() => Date.now());
  const { notices, setNotices, loading, loaded, error, errorStatus, refetch } = useNoticeboardData(filters, search);
  const viewing = useMemo(() => notices.find(n => n.id === viewingId) ?? null, [notices, viewingId]);

  const expiredNotices = useMemo(() => notices.filter(n => expiry(n, now).expired), [notices, now]);
  const shown = useMemo(() => (hideExpired ? notices.filter(n => !expiry(n, now).expired) : notices), [notices, hideExpired, now]);
  const pinned = shown.filter(n => n.is_pinned);
  const regular = shown.filter(n => !n.is_pinned);
  const rows = useMemo(() => sortRows([...pinned, ...regular], sort, (n, id) => String(n[id as keyof Notice] ?? '').toLowerCase()), [pinned, regular, sort]);
  const byPriority = PRIORITIES.map(p => ({ name: p, value: shown.filter(n => n.priority === p).length })).filter(r => r.value > 0);

  const hasFilters = !!search.trim() || filters.category !== ALL || filters.priority !== ALL || filters.status !== ALL || filters.department !== ALL || filters.is_pinned !== null;
  const status = deriveDataStatus({ loaded, loading, error, errorStatus, count: shown.length, transient: isTransientStatus(errorStatus) });
  const pending = loading && !loaded;
  const unavailable = !loaded && !loading;
  const scope = hasFilters ? 'matching your filters' : undefined;
  const clearFilters = () => { setFilters(NO_FILTERS); setSearch(''); };
  const setFilter = <K extends keyof NoticeFilters>(k: K, v: NoticeFilters[K]) => setFilters(f => ({ ...f, [k]: v }));

  const openEditor = (n?: Notice) => { setViewingId(null); setEditing(n); setDialogOpen(true); };
  const remove = async (n: Notice) => {
    await confirmDelete({ title: 'Delete this notice?', message: `“${truncate(n.title, 60)}” will be removed for everyone. This cannot be undone.`, what: 'The notice', run: async () => { await deleteNotice(n.id); setViewingId(null); }, done: 'Notice deleted.', after: () => refetch() });
  };
  const pin = async (n: Notice) => {
    const before = n.is_pinned;
    setNotices(ps => ps.map(x => (x.id === n.id ? { ...x, is_pinned: !before } : x)));
    try { await togglePin(n.id, before); } catch (e) { setNotices(ps => ps.map(x => (x.id === n.id ? { ...x, is_pinned: before } : x))); toast.error(`Pin was not changed: ${(e as Error).message}`); }
  };
  const bulk = async (targets: Notice[], act: (n: Notice) => Promise<unknown>, done: string, failed: string) => {
    const results = await Promise.allSettled(targets.map(act));
    const ok = results.filter(r => r.status === 'fulfilled').length;
    if (ok) toast.success(`${done} ${plural(ok, 'notice')}.`);
    if (ok < results.length) toast.warning(`${plural(results.length - ok, 'notice')} ${failed}.`);
    await refetch();
  };
  const archiveExpired = async () => {
    const targets = expiredNotices.filter(n => n.status !== 'Archived');
    if (!targets.length) { toast.info('There are no expired notices to archive.'); return; }
    if (!await confirm({ title: `Archive ${plural(targets.length, 'expired notice')}?`, message: 'Archived notices leave the active board. You can reactivate each one by editing its status.', confirmLabel: 'Archive' })) return;
    await bulk(targets, n => archiveNotice(n.id), 'Archived', 'could not be archived');
  };
  const unpinAll = async () => {
    if (!pinned.length) { toast.info('No notices are pinned.'); return; }
    if (!await confirm({ title: `Unpin ${plural(pinned.length, 'notice')}?`, message: 'They stay on the board but lose their place at the top.', confirmLabel: 'Unpin all' })) return;
    await bulk([...pinned], n => togglePin(n.id, true), 'Unpinned', 'could not be unpinned');
  };

  const COLUMNS: Column<Notice>[] = [
    { id: 'title', header: 'Title', sortable: true, sticky: true, cell: n => <span className="block min-w-0">{n.is_pinned && <span className="mr-1.5 text-warning" title="Pinned" aria-label="Pinned"><Icon name="pinned" size="sm" /></span>}<span className="font-medium">{n.title}</span><span className="block truncate text-caption text-ink-muted">{truncate(n.content, 70)}</span></span> },
    { id: 'category', header: 'Category', sortable: true, hideBelow: 'md', cell: n => n.category },
    { id: 'priority', header: 'Priority', sortable: true, cell: n => <PriorityTag priority={n.priority} /> },
    { id: 'status', header: 'Status', sortable: true, hideBelow: 'md', cell: n => <StatusTag status={n.status} /> },
    { id: 'author', header: 'Author', sortable: true, hideBelow: 'lg', cell: n => n.author || <span className="text-ink-muted">Not specified</span> },
    { id: 'date', header: 'Date', sortable: true, cell: n => <span className="whitespace-nowrap tabular">{formatDate(n.date)}</span> },
  ];
  const card = (n: Notice) => {
    const ex = expiry(n, now);
    return (
      <RecordCard
        key={n.id}
        eyebrow={`${n.author || 'Not specified'} · ${formatDate(n.date)}`}
        title={n.title}
        status={<PriorityTag priority={n.priority} />}
        facts={[
          { label: 'Notice', value: <span className="line-clamp-2">{n.content}</span> },
          { label: 'Category', value: n.category },
          { label: 'Status', value: <span className="inline-flex flex-wrap gap-1.5"><StatusTag status={n.status} />{n.is_pinned && <StatusBadge tone="warning" icon="pinned">Pinned</StatusBadge>}{ex.expired && <StatusBadge tone="danger" icon="expired">Expired</StatusBadge>}{ex.soon && <StatusBadge tone="warning" icon="due-soon">Expires soon</StatusBadge>}</span> },
          ...(n.attachments?.length ? [{ label: 'Attachments', value: String(n.attachments.length) }] : []),
        ]}
        action={<RowActions subject={`${n.title}`} onEdit={() => openEditor(n)} onDelete={() => remove(n)} />}
        onOpen={() => setViewingId(n.id)}
        openLabel={`View notice ${n.title}`}
      />
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        breadcrumbs={[{ label: 'Communications' }, { label: 'Noticeboard' }]}
        title="Noticeboard"
        description="Create, manage and monitor company notices and announcements."
        actions={(
          <>
            <IconButton icon="refresh" label="Refresh notices" variant="shell" pending={loading && loaded} onClick={() => refetch()} />
            {notices.length > 0 && (
              <DownloadButton
                data={notices as unknown as Record<string, unknown>[]}
                columns={EXPORT_COLUMNS}
                filename={exportFilename('Noticeboard')}
                title="Noticeboard"
                statusColumn="priority"
                statusColor={(_v, row) => exportPriorityColor(String(row.priority))}
              />
            )}
            <Button variant="primary" icon="plus" disabled={unavailable} onClick={() => openEditor()}>Create notice</Button>
          </>
        )}
      />

      <MetricGrid compact>
        <MetricTile compact label="Total notices" detail={scope} value={notices.length} loading={pending} unavailable={unavailable} />
        <MetricTile compact label="Active" tone="success" detail={scope} value={notices.filter(n => n.status === 'Active').length} loading={pending} unavailable={unavailable} selected={filters.status === 'Active'} onClick={() => setFilter('status', filters.status === 'Active' ? ALL : 'Active')} />
        <MetricTile compact label="Pinned" detail={scope} value={notices.filter(n => n.is_pinned).length} loading={pending} unavailable={unavailable} selected={filters.is_pinned === true} onClick={() => setFilter('is_pinned', filters.is_pinned === true ? null : true)} />
        <MetricTile compact label="Expired" tone="danger" detail={scope} value={expiredNotices.length} loading={pending} unavailable={unavailable} selected={hideExpired === false && false} />
      </MetricGrid>

      {byPriority.length > 0 && <ChartPanel title="Priority breakdown" summary={`Notices by priority: ${byPriority.map(r => `${r.name} ${r.value}`).join(', ')}.`}><Distribution rows={byPriority} /></ChartPanel>}

      <Toolbar
        filtered={hasFilters}
        onClear={clearFilters}
        activeCount={[filters.status, filters.department].filter(v => v !== ALL).length + (filters.is_pinned !== null ? 1 : 0)}
        trailing={(<>
          <ViewToggle value={view} onValueChange={setView} options={VIEW_CARDS_TABLE} />
        </>)}
        moreFilters={(
          <>
          <FilterField label="Status"><Select aria-label="Filter by status" value={filters.status} onValueChange={v => setFilter('status', v)} options={[{ value: ALL, label: 'All statuses' }, ...STATUSES.map(s => ({ value: s, label: s }))]} /></FilterField>
          <FilterField label="Department"><Select aria-label="Filter by department" value={filters.department} onValueChange={v => setFilter('department', v)} options={[{ value: ALL, label: 'All departments' }, ...DEPARTMENTS.map(d => ({ value: d, label: d }))]} /></FilterField>
          <FilterField label="Pinned"><Select aria-label="Filter by pinned" value={filters.is_pinned === null ? ALL : String(filters.is_pinned)} onValueChange={v => setFilter('is_pinned', v === ALL ? null : v === 'true')} options={[{ value: ALL, label: 'All notices' }, { value: 'true', label: 'Pinned only' }, { value: 'false', label: 'Not pinned' }]} /></FilterField>
          </>
        )}
      >
        <SearchField value={search} onValueChange={setSearch} placeholder="Search title or content" wrapperClassName="min-w-56 max-w-sm flex-1 max-md:max-w-none max-md:basis-full" />
        <Select className="w-40" aria-label="Filter by category" value={filters.category} onValueChange={v => setFilter('category', v)} options={[{ value: ALL, label: 'All categories' }, ...CATEGORIES.map(c => ({ value: c, label: c }))]} />
        <Select className="w-40" aria-label="Filter by priority" value={filters.priority} onValueChange={v => setFilter('priority', v)} options={[{ value: ALL, label: 'All priorities' }, ...PRIORITIES.map(p => ({ value: p, label: p }))]} />
      </Toolbar>

      <DataRegion
        status={status}
        subject="notices"
        error={error}
        onRetry={() => refetch()}
        empty={hasFilters || hideExpired
          ? <EmptyState icon="search" title="No notices match" description="Try a different search or filter." action={<Button onClick={() => { clearFilters(); setHideExpired(false); }}>Clear filters</Button>} />
          : <EmptyState icon="notice" title="No notices yet" description="Create the first notice to get started." action={<Button variant="primary" icon="plus" onClick={() => openEditor()}>Create your first notice</Button>} />}
      >
        {view === 'cards' ? (
          <div className="flex flex-col gap-6">
            {pinned.length > 0 && <section aria-labelledby="nb-pinned"><h2 id="nb-pinned" className="mb-3 font-display text-section font-semibold text-ink">Pinned notices <span className="font-sans text-label font-normal text-ink-muted">{pinned.length}</span></h2><div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">{pinned.map(card)}</div></section>}
            {regular.length > 0 && <section aria-labelledby="nb-all"><h2 id="nb-all" className="mb-3 font-display text-section font-semibold text-ink">{pinned.length ? 'Other notices' : 'All notices'} <span className="font-sans text-label font-normal text-ink-muted">{regular.length}</span></h2><div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">{regular.map(card)}</div></section>}
          </div>
        ) : (
          <DataTable
            caption="Notices"
            rows={rows}
            columns={COLUMNS}
            getRowId={n => n.id}
            sort={sort}
            onSortChange={setSort}
            onRowActivate={n => setViewingId(n.id)}
            rowActions={n => (
              <RowActions subject={`${n.title}`} onEdit={() => openEditor(n)} onDelete={() => remove(n)} />
            )}
          />
        )}
      </DataRegion>

      <section aria-labelledby="nb-actions" className="flex flex-col gap-3 rounded-card border border-line p-4">
        <h2 id="nb-actions" className="font-display text-section font-semibold text-ink">Quick actions</h2>
        <div className="flex flex-wrap gap-2">
          <Button icon="archive" onClick={archiveExpired}>Archive all expired ({expiredNotices.filter(n => n.status !== 'Archived').length})</Button>
          <Button icon="hide" aria-pressed={hideExpired} variant={hideExpired ? 'primary' : 'secondary'} onClick={() => setHideExpired(v => !v)}>{hideExpired ? 'Showing non-expired only' : 'Hide expired notices'}</Button>
          <Button icon="pin" onClick={unpinAll}>Unpin all ({pinned.length})</Button>
        </div>
      </section>

      <DetailDialog notice={viewing} now={now} onClose={() => setViewingId(null)} onEdit={openEditor} onDelete={remove} onTogglePin={pin} />
      <NoticeDialog notice={editing} open={dialogOpen} onOpenChange={setDialogOpen} onSaved={() => refetch()} />
    </div>
  );
}

export default function NoticeboardManagement() {
  return <AppShell migrated><NoticeboardContent /></AppShell>;
}
