// app/noticeboard/page.tsx
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { AppShell } from '@/components/app-shell';
import { fmtDate as formatDate, fmtDateTime as formatDateTime } from '@/components/shared/utils';
import {
  useTheme, PageHero, StatTile, StatusBadge, ProgressBar, FormField, FormActions,
  SearchInput, ViewToggle, CenterModal, PrimaryButton, EmptyState, useCollapseSection,
  GlowCard, ACCENT_HEX, SelectField, TYPE_WEIGHT,
} from '@/components/shared/theme';
import { DownloadButton, type DLColumn } from '@/components/shared/DownloadButton';
import { exportFilename } from '@/lib/exportUtils';
import { toast } from 'sonner';
import {
  Bell, Plus, Search, Trash2, Edit, FileText, AlertTriangle, RefreshCw,
  Calendar, Tag, Paperclip, Download, AlertCircle, CheckCircle,
  Eye, ChevronDown, ChevronUp, X, User, Building, LayoutGrid, Table as TableIcon,
  Save, Upload, Link as LinkIcon, Clock, Share2, Copy, BarChart3, Pin, PinOff, Clock4, Archive, EyeOff,
  useConfirm,
} from '@/components/shared/theme';
import type { Notice, NoticeFormData, NoticeFilters, CalculatedStats } from './types';
import { useNoticeboardData, createNotice, updateNotice, deleteNotice, togglePin, archiveNotice, uploadNoticeAttachment } from './useNoticeboardData';

// ==================== CONSTANTS ====================

const CATEGORIES = ['HR', 'Safety', 'IT', 'General', 'Operations', 'Finance'];
const PRIORITIES = ['Critical', 'High', 'Medium', 'Low'];
const STATUSES = ['Draft', 'Active', 'Archived'];
const DEPARTMENTS = ['HR', 'IT', 'Operations', 'Finance', 'Marketing', 'Sales', 'General'];
const TARGET_AUDIENCE = ['All Employees', 'Management Only', 'Department Specific', 'Remote Workers', 'New Hires'];
const NOTIFICATION_TYPES = ['General Announcement', 'System Alert', 'Training', 'Policy Update', 'Event', 'Reminder'];

const PRIORITY_HEX: Record<string, string> = { Critical: '#f43f5e', High: '#f97316', Medium: '#60a5fa', Low: '#94a3b8' };
const STATUS_HEX: Record<string, string> = { Active: '#34d399', Draft: '#94a3b8', Archived: '#64748b' };

const truncateText = (text: string | null | undefined, maxLength = 100) => {
  if (!text) return '';
  return text.length <= maxLength ? text : text.substring(0, maxLength) + '…';
};

function calculateClientSideStats(notices: Notice[]): CalculatedStats {
  const statusBreakdown: Record<string, number> = {};
  const priorityBreakdown: Record<string, number> = {};
  const categoryBreakdown: Record<string, number> = {};
  let pinned = 0, expired = 0, expiringSoon = 0;
  const now = new Date();
  notices.forEach(n => {
    statusBreakdown[n.status || 'Draft'] = (statusBreakdown[n.status || 'Draft'] || 0) + 1;
    priorityBreakdown[n.priority || 'Medium'] = (priorityBreakdown[n.priority || 'Medium'] || 0) + 1;
    categoryBreakdown[n.category || 'General'] = (categoryBreakdown[n.category || 'General'] || 0) + 1;
    if (n.is_pinned) pinned++;
    if (n.expires_at) {
      const d = new Date(n.expires_at);
      if (!isNaN(d.getTime())) {
        if (d < now) expired++;
        else if (Math.floor((d.getTime() - now.getTime()) / 86400000) <= 7) expiringSoon++;
      }
    }
  });
  return { total_notices: notices.length, status_breakdown: statusBreakdown, priority_breakdown: priorityBreakdown, category_breakdown: categoryBreakdown, pinned_count: pinned, expired_count: expired, expiring_soon_count: expiringSoon };
}

// ==================== NOTICE DETAILS MODAL ====================

function NoticeDetailsModal({ isOpen, onClose, notice, onDelete, onEdit, onTogglePin }: {
  isOpen: boolean; onClose: () => void; notice: Notice | null;
  onDelete: (id: string) => void; onEdit: (n: Notice) => void; onTogglePin: (id: string, s: boolean) => void;
}) {
  const t = useTheme();
  const confirm = useConfirm();
  const [now] = useState(() => Date.now());
  if (!isOpen || !notice) return null;
  const isExpired = notice.expires_at ? new Date(notice.expires_at).getTime() < now : false;
  const expiresSoon = notice.expires_at ? (new Date(notice.expires_at).getTime() > now && new Date(notice.expires_at).getTime() <= now + 7 * 86400000) : false;

  const handleShare = () => {
    if (navigator.share) navigator.share({ title: notice.title, text: truncateText(notice.content, 200), url: window.location.href });
    else { navigator.clipboard.writeText(`${notice.title}\n\n${notice.content}`); toast.success('Notice copied to clipboard'); }
  };

  const handleTogglePin = async () => {
    try { await togglePin(notice.id, notice.is_pinned); onTogglePin(notice.id, !notice.is_pinned); }
    catch { toast.error('Failed to toggle pin'); }
  };

  return (
    <CenterModal open={isOpen} onClose={onClose} title={notice.title} width="max-w-2xl">
      <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
        <div className={`flex flex-wrap items-center gap-3 text-xs ${t.textFaint}`}>
          <span className="flex items-center gap-1"><User className="h-3.5 w-3.5" />{notice.author || 'Unknown'}</span>
          <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{formatDate(notice.date)}</span>
          {notice.department && <span className="flex items-center gap-1"><Building className="h-3.5 w-3.5" />{notice.department}</span>}
          {notice.is_pinned && <StatusBadge color="#f59e0b" label="Pinned" />}
          <div className="ml-auto flex items-center gap-1.5">
            <StatusBadge color={PRIORITY_HEX[notice.priority] ?? '#94a3b8'} label={notice.priority} />
            <StatusBadge color={STATUS_HEX[notice.status] ?? '#94a3b8'} label={notice.status} />
          </div>
        </div>

        <div className={`rounded-lg p-4 text-sm whitespace-pre-wrap leading-relaxed ${t.chipBg} ${t.textMuted}`}>{notice.content}</div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
          <div><p className={t.textFaint}>Target Audience</p><p className={`${TYPE_WEIGHT.medium} mt-0.5 ${t.textMuted}`}>{notice.target_audience || 'All Employees'}</p></div>
          <div><p className={t.textFaint}>Notification Type</p><p className={`${TYPE_WEIGHT.medium} mt-0.5 ${t.textMuted}`}>{notice.notification_type || 'General'}</p></div>
          <div><p className={t.textFaint}>Acknowledgment</p><p className={`${TYPE_WEIGHT.medium} mt-0.5 ${t.textMuted}`}>{notice.requires_acknowledgment ? 'Required' : 'Not Required'}</p></div>
          <div>
            <p className={t.textFaint}>Expires</p>
            <p className={`${TYPE_WEIGHT.medium} mt-0.5 ${isExpired ? 'text-rose-500' : expiresSoon ? 'text-amber-500' : t.textMuted}`}>
              {notice.expires_at ? formatDate(notice.expires_at) : 'Never'}{isExpired && ' (Expired)'}{expiresSoon && !isExpired && ' (Soon)'}
            </p>
          </div>
          {notice.created_at && <div><p className={t.textFaint}>Created</p><p className={`${TYPE_WEIGHT.medium} mt-0.5 ${t.textMuted}`}>{formatDateTime(notice.created_at)}</p></div>}
          {notice.updated_at && <div><p className={t.textFaint}>Last Updated</p><p className={`${TYPE_WEIGHT.medium} mt-0.5 ${t.textMuted}`}>{formatDateTime(notice.updated_at)}</p></div>}
        </div>

        {(notice.attachment_name || notice.attachment_url) && (
          <div className={`rounded-lg p-3 flex items-center justify-between gap-3 ${t.chipBg}`}>
            <div className="flex items-center gap-2 min-w-0">
              <Paperclip className="h-4 w-4 text-brand-500 shrink-0" />
              <div className="min-w-0">
                <p className={`text-sm ${TYPE_WEIGHT.medium} truncate ${t.textPrimary}`}>{notice.attachment_name || 'Unnamed file'}</p>
                {notice.attachment_size && <p className={`text-[11px] ${t.textFaint}`}>{notice.attachment_size}</p>}
              </div>
            </div>
            {notice.attachment_url && (
              <a href={notice.attachment_url} target="_blank" rel="noopener noreferrer" title="Download attachment"
                className={`h-8 w-8 flex items-center justify-center rounded-lg shrink-0 ${t.hoverBg} ${t.textFaint} hover:text-brand-500`}>
                <Download className="h-4 w-4" />
              </a>
            )}
          </div>
        )}

        <div className={`flex flex-wrap gap-1.5 pt-2 border-t ${t.border}`}>
          <button type="button" onClick={handleShare} className={`px-3 py-1.5 rounded-lg text-xs ${t.chipBg} ${t.hoverBg} ${t.textMuted} inline-flex items-center gap-1.5`}><Share2 className="h-3.5 w-3.5" /> Share</button>
          <button type="button" onClick={() => { navigator.clipboard.writeText(`${notice.title}\n\n${notice.content}`); toast.success('Copied'); }} className={`px-3 py-1.5 rounded-lg text-xs ${t.chipBg} ${t.hoverBg} ${t.textMuted} inline-flex items-center gap-1.5`}><Copy className="h-3.5 w-3.5" /> Copy</button>
          <button type="button" onClick={handleTogglePin} className={`px-3 py-1.5 rounded-lg text-xs ${t.chipBg} ${t.hoverBg} ${t.textMuted} inline-flex items-center gap-1.5`}>
            {notice.is_pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />} {notice.is_pinned ? 'Unpin' : 'Pin'}
          </button>
          <button type="button" onClick={async () => { if (await confirm({ title: 'Delete this notice?', destructive: true })) { onDelete(notice.id); onClose(); } }}
            className="px-3 py-1.5 rounded-lg text-xs bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 inline-flex items-center gap-1.5 ml-auto"><Trash2 className="h-3.5 w-3.5" /> Delete</button>
        </div>
      </div>
      <div className={`px-5 py-4 border-t ${t.border} flex justify-end gap-2`}>
        <button type="button" onClick={onClose} className={`px-4 py-2 rounded-xl text-sm ${t.textFaint} ${t.hoverText} border ${t.border}`}>Close</button>
        <PrimaryButton icon={Edit} accent="violet" size="md" onClick={() => { onEdit(notice); onClose(); }}>Edit Notice</PrimaryButton>
      </div>
    </CenterModal>
  );
}

// ==================== NOTICE CARD ====================

function NoticeCard({ notice, onView, onEdit, onDelete }: {
  notice: Notice; onView: (n: Notice) => void; onEdit: (n: Notice) => void; onDelete: (id: string) => void;
}) {
  const t = useTheme();
  const confirm = useConfirm();
  const [now] = useState(() => Date.now());
  const isExpired = notice.expires_at ? new Date(notice.expires_at).getTime() < now : false;
  const expiresSoon = notice.expires_at ? (new Date(notice.expires_at).getTime() > now && new Date(notice.expires_at).getTime() <= now + 7 * 86400000) : false;

  return (
    <GlowCard onClick={() => onView(notice)} color={notice.is_pinned ? '#f59e0b' : ACCENT_HEX.violet}
      surface={`${t.glass} rounded-2xl`}
      className="overflow-hidden">
      <div className={`px-4 pt-3.5 pb-2 border-b ${t.border}`}>
        <div className="flex items-start justify-between gap-2">
          <p className={`text-sm ${TYPE_WEIGHT.semibold} line-clamp-1 ${t.textPrimary}`}>{notice.title}</p>
          {notice.is_pinned && <StatusBadge color="#f59e0b" label="Pinned" />}
        </div>
        <div className={`flex items-center gap-3 flex-wrap text-[11px] mt-1 ${t.textFaint}`}>
          <span className="flex items-center gap-1"><User className="h-3 w-3" />{notice.author || 'Not specified'}</span>
          <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{formatDate(notice.date)}</span>
        </div>
      </div>
      <div className="px-4 py-3">
        <p className={`text-xs line-clamp-2 mb-3 ${t.textMuted}`}>{notice.content}</p>
        <div className="flex items-center gap-1.5 flex-wrap">
          <StatusBadge color="#64748b" label={notice.category} />
          {isExpired && <StatusBadge color="#f43f5e" label="Expired" />}
          {expiresSoon && !isExpired && <StatusBadge color="#f59e0b" label="Expires Soon" />}
          {notice.attachment_name && <Paperclip className="h-3.5 w-3.5 text-brand-500" />}
        </div>
      </div>
      <div className={`px-4 py-2.5 border-t ${t.border} flex items-center justify-between`}>
        <div className="flex items-center gap-1.5">
          <StatusBadge color={PRIORITY_HEX[notice.priority] ?? '#94a3b8'} label={notice.priority} />
          <StatusBadge color={STATUS_HEX[notice.status] ?? '#94a3b8'} label={notice.status} />
        </div>
        <div className="flex items-center gap-1">
          <button type="button" title="Edit" aria-label="Edit notice" onClick={e => { e.stopPropagation(); onEdit(notice); }} className={`h-7 w-7 flex items-center justify-center rounded ${t.hoverBg} ${t.textFaint} hover:text-brand-500`}><Edit className="h-3.5 w-3.5" /></button>
          <button type="button" title="Delete" aria-label="Delete notice" onClick={async e => { e.stopPropagation(); if (await confirm({ title: 'Delete this notice?', destructive: true })) onDelete(notice.id); }} className={`h-7 w-7 flex items-center justify-center rounded ${t.hoverBg} ${t.textFaint} hover:text-rose-500`}><Trash2 className="h-3.5 w-3.5" /></button>
        </div>
      </div>
    </GlowCard>
  );
}

// ==================== EDIT NOTICE MODAL ====================

const blankForm = (): NoticeFormData => ({
  title: '', content: '', date: new Date().toISOString().split('T')[0], category: 'General', priority: 'Medium', status: 'Draft',
  is_pinned: false, requires_acknowledgment: false, author: '', department: 'General', expires_at: '',
  target_audience: 'All Employees', notification_type: 'General Announcement', attachment_name: '', attachment_url: '', attachment_size: '',
});

function EditNoticeModal({ isOpen, onClose, notice, onSave, isLoading }: {
  isOpen: boolean; onClose: () => void; notice: Notice | null; onSave: (d: NoticeFormData) => Promise<void>; isLoading: boolean;
}) {
  const t = useTheme();
  const [form, setForm] = useState<NoticeFormData>(blankForm());
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const inputCls = `w-full h-9 px-3 rounded-lg text-sm outline-none transition-colors ${t.inputBg}`;

  useEffect(() => {
    if (!isOpen) return;
    setForm(notice ? {
      title: notice.title || '', content: notice.content || '', date: notice.date ? notice.date.split('T')[0] : new Date().toISOString().split('T')[0],
      category: notice.category || 'General', priority: notice.priority || 'Medium', status: notice.status || 'Draft',
      is_pinned: notice.is_pinned || false, author: notice.author || '', department: notice.department || 'General',
      expires_at: notice.expires_at ? notice.expires_at.split('T')[0] : '', target_audience: notice.target_audience || 'All Employees',
      notification_type: notice.notification_type || 'General Announcement', requires_acknowledgment: notice.requires_acknowledgment || false,
      attachment_name: notice.attachment_name || '', attachment_url: notice.attachment_url || '', attachment_size: notice.attachment_size || '',
    } : blankForm());
  }, [notice, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim() || !form.date || !form.category) { toast.error('Please fill in all required fields'); return; }
    await onSave(form);
  };

  // Previously read the picked File's name/size straight into the form and never
  // uploaded it anywhere — attachment_url stayed blank, so "Download attachment" on
  // the finished notice had nothing to link to (looked like it worked; silently
  // didn't). Now actually uploads via /api/notices/upload-attachment (a broad,
  // still-explicit allowlist — see backend/app/uploads.py's NOTICE_ATTACHMENT_EXTS)
  // and fills the three fields from the server's response.
  const handleAttachmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-picking the same file after a failed upload
    if (!file) return;
    setIsUploadingAttachment(true);
    try {
      const uploaded = await uploadNoticeAttachment(file);
      setForm(p => ({ ...p, ...uploaded }));
      toast.success('Attachment uploaded');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to upload attachment');
    } finally {
      setIsUploadingAttachment(false);
    }
  };

  const clearAttachment = () => setForm(p => ({ ...p, attachment_name: '', attachment_url: '', attachment_size: '' }));

  return (
    <CenterModal open={isOpen} onClose={onClose} title={notice ? 'Edit Notice' : 'Create New Notice'} width="max-w-2xl">
      <form onSubmit={handleSubmit}>
        <div className="px-5 py-4 space-y-4 max-h-[65vh] overflow-y-auto">
          <FormField label="Title" required>
            <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Enter notice title" aria-label="Title" className={inputCls} />
          </FormField>
          <FormField label="Content" required>
            <textarea value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} rows={5}
              placeholder="Enter notice content" aria-label="Content" className={`w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors resize-none ${t.inputBg}`} />
          </FormField>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FormField label="Publish Date" required>
              <input type="date" value={form.date} title="Publish date" aria-label="Publish date" onChange={e => setForm(p => ({ ...p, date: e.target.value }))} className={inputCls} />
            </FormField>
            <FormField label="Category" required>
              <SelectField size="form" value={form.category} title="Category" onChange={v => setForm(p => ({ ...p, category: v }))}
                options={CATEGORIES.map(c => ({ value: c, label: c }))} />
            </FormField>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FormField label="Priority">
              <SelectField size="form" value={form.priority} title="Priority" onChange={v => setForm(p => ({ ...p, priority: v }))}
                options={PRIORITIES.map(p => ({ value: p, label: p }))} />
            </FormField>
            <FormField label="Status">
              <SelectField size="form" value={form.status} title="Status" onChange={v => setForm(p => ({ ...p, status: v }))}
                options={STATUSES.map(s => ({ value: s, label: s }))} />
            </FormField>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FormField label="Author"><input value={form.author} onChange={e => setForm(p => ({ ...p, author: e.target.value }))} placeholder="Enter author name" aria-label="Author" className={inputCls} /></FormField>
            <FormField label="Department">
              <SelectField size="form" value={form.department} title="Department" onChange={v => setForm(p => ({ ...p, department: v }))}
                options={DEPARTMENTS.map(d => ({ value: d, label: d }))} />
            </FormField>
            <FormField label="Target Audience">
              <SelectField size="form" value={form.target_audience} title="Target audience" onChange={v => setForm(p => ({ ...p, target_audience: v }))}
                options={TARGET_AUDIENCE.map(a => ({ value: a, label: a }))} />
            </FormField>
            <FormField label="Notification Type">
              <SelectField size="form" value={form.notification_type} title="Notification type" onChange={v => setForm(p => ({ ...p, notification_type: v }))}
                options={NOTIFICATION_TYPES.map(n => ({ value: n, label: n }))} />
            </FormField>
          </div>
          <FormField label="Expiry Date">
            <input type="date" value={form.expires_at} title="Expiry date" aria-label="Expiry date" min={form.date} onChange={e => setForm(p => ({ ...p, expires_at: e.target.value }))} className={inputCls} />
          </FormField>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <FormField label="Attachment Name"><input value={form.attachment_name} onChange={e => setForm(p => ({ ...p, attachment_name: e.target.value }))} placeholder="e.g. policy.pdf" aria-label="Attachment name" className={inputCls} /></FormField>
            <FormField label="Attachment URL"><input value={form.attachment_url} onChange={e => setForm(p => ({ ...p, attachment_url: e.target.value }))} placeholder="https://…" aria-label="Attachment URL" className={inputCls} /></FormField>
            <FormField label="File Size"><input value={form.attachment_size} onChange={e => setForm(p => ({ ...p, attachment_size: e.target.value }))} placeholder="e.g. 2.5 MB" aria-label="File size" className={inputCls} /></FormField>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="notice-attachment-file"
              className={`flex items-center gap-2 text-xs ${t.textMuted} ${t.chipBg} rounded-lg px-3 py-2 w-fit ${isUploadingAttachment ? 'opacity-60 cursor-wait' : 'cursor-pointer'}`}>
              {isUploadingAttachment ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
              {isUploadingAttachment ? 'Uploading…' : 'Upload File'}
              <input id="notice-attachment-file" type="file" className="hidden" disabled={isUploadingAttachment}
                title="Upload attachment file" aria-label="Upload attachment file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.txt,.rtf,.odt,.ods,.odp,.jpg,.jpeg,.png,.gif,.webp,.svg,.bmp,.tif,.tiff,.heic,.zip,.rar,.7z,.tar,.gz,.mp3,.wav,.m4a,.ogg,.aac,.mp4,.mov,.avi,.webm,.mkv,.json,.xml"
                onChange={handleAttachmentUpload} />
            </label>
            {form.attachment_name && (
              <button type="button" onClick={clearAttachment} className={`flex items-center gap-1 text-xs ${t.textFaint} hover:text-rose-500 transition-colors`}>
                <X className="h-3 w-3" /> Remove
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-6">
            <label htmlFor="notice-is-pinned" className="flex items-center gap-2 cursor-pointer">
              <input id="notice-is-pinned" type="checkbox" checked={form.is_pinned} onChange={e => setForm(p => ({ ...p, is_pinned: e.target.checked }))} aria-label="Pin to top" className="h-4 w-4 accent-brand-600" />
              <span className={`text-sm ${t.textMuted}`}>Pin to top</span>
            </label>
            <label htmlFor="notice-requires-ack" className="flex items-center gap-2 cursor-pointer">
              <input id="notice-requires-ack" type="checkbox" checked={form.requires_acknowledgment} onChange={e => setForm(p => ({ ...p, requires_acknowledgment: e.target.checked }))} aria-label="Require acknowledgment" className="h-4 w-4 accent-brand-600" />
              <span className={`text-sm ${t.textMuted}`}>Require acknowledgment</span>
            </label>
          </div>
        </div>
        <FormActions onCancel={onClose} submitting={isLoading} submitLabel={notice ? 'Save Changes' : 'Create Notice'} />
      </form>
    </CenterModal>
  );
}

// ==================== MAIN PAGE ====================

function NoticeboardContent() {
  const t = useTheme();
  const confirm = useConfirm();
  const sections = useCollapseSection({ records: true });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null);
  const [editingNotice, setEditingNotice] = useState<Notice | null>(null);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [filters, setFilters] = useState<NoticeFilters>({ category: 'all', priority: 'all', status: 'all', department: 'all', is_pinned: null });
  // View-only — filters the grid/table below without touching the hero KPI tiles or
  // Quick Actions counts, which stay true totals (same convention as every other
  // filter on this page not touching the stats up top).
  const [hideExpired, setHideExpired] = useState(false);
  const { data, setData, isLoading, setIsLoading, loadError, refresh: fetchNotices } = useNoticeboardData(filters, search);

  // isLoading deliberately doubles as this modal's `submitting` flag (see the
  // EditNoticeModal render below) — preserved from the original, not a new coupling.
  const handleSaveNotice = async (noticeData: NoticeFormData) => {
    setIsLoading(true);
    try {
      if (editingNotice) await updateNotice(editingNotice.id, noticeData);
      else await createNotice(noticeData);
      await fetchNotices();
      setIsModalOpen(false); setEditingNotice(null);
      toast.success(`Notice ${editingNotice ? 'updated' : 'created'} successfully`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save notice');
    } finally { setIsLoading(false); }
  };

  const handleDeleteNotice = async (id: string) => {
    try {
      await deleteNotice(id);
      setData(prev => prev.filter(n => n.id !== id));
      if (selectedNotice?.id === id) { setIsDetailsModalOpen(false); setSelectedNotice(null); }
      toast.success('Notice deleted');
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Failed to delete notice'); }
  };

  const handleTogglePin = (id: string, newPinState: boolean) => {
    setData(prev => prev.map(n => n.id === id ? { ...n, is_pinned: newPinState } : n));
    if (selectedNotice?.id === id) setSelectedNotice(prev => prev ? { ...prev, is_pinned: newPinState } : prev);
  };

  const calculatedStats = useMemo(() => calculateClientSideStats(data), [data]);
  const expiredNotices = data.filter(n => n.expires_at && new Date(n.expires_at) < new Date());
  const displayNotices = hideExpired ? data.filter(n => !expiredNotices.includes(n)) : data;
  const pinnedNotices = displayNotices.filter(n => n.is_pinned);
  const regularNotices = displayNotices.filter(n => !n.is_pinned);
  const selectCls = `h-9 px-3 rounded-lg text-xs outline-none transition-colors ${t.inputBg}`;
  const hasFilters = search || Object.values(filters).some(f => f !== 'all' && f !== null);

  // Both previously rendered with no onClick at all — clicking them did nothing.
  const handleArchiveAllExpired = async () => {
    const targets = expiredNotices.filter(n => n.status !== 'Archived');
    if (targets.length === 0) { toast.info('No expired notices to archive'); return; }
    const results = await Promise.allSettled(targets.map(n => archiveNotice(n.id)));
    const ok = results.filter(r => r.status === 'fulfilled').length;
    const fail = results.length - ok;
    if (ok > 0) toast.success(`Archived ${ok} expired notice${ok !== 1 ? 's' : ''}`);
    if (fail > 0) toast.warning(`${fail} failed to archive`);
    await fetchNotices();
  };

  const handleUnpinAll = async () => {
    if (pinnedNotices.length === 0) { toast.info('No pinned notices'); return; }
    const targets = [...pinnedNotices];
    const results = await Promise.allSettled(targets.map(n => togglePin(n.id, true)));
    const ok = results.filter(r => r.status === 'fulfilled').length;
    const fail = results.length - ok;
    if (ok > 0) toast.success(`Unpinned ${ok} notice${ok !== 1 ? 's' : ''}`);
    if (fail > 0) toast.warning(`${fail} failed to unpin`);
    await fetchNotices();
  };

  const exportColumns: DLColumn[] = [
    { key: 'title', label: 'Title', width: 30 },
    { key: 'category', label: 'Category', width: 16 },
    { key: 'priority', label: 'Priority', width: 12 },
    { key: 'status', label: 'Status', width: 12 },
    { key: 'author', label: 'Author', width: 18 },
    { key: 'department', label: 'Department', width: 18 },
    { key: 'date', label: 'Date', width: 14, format: v => v ? formatDate(v as string) : '' },
    { key: 'expires_at', label: 'Expires', width: 14, format: v => v ? formatDate(v as string) : '' },
  ];

  return (
    <main className="max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <PageHero
        icon={Bell}
        accent="violet"
        crumbs={['Communications', 'Noticeboard']}
        title="Noticeboard"
        description="Create, manage, and monitor all company notices and announcements."
        statsOpen={sections.expanded.records}
        actions={
          <>
            {data.length > 0 && (
              <DownloadButton
                data={data as unknown as Record<string, unknown>[]}
                columns={exportColumns}
                filename={exportFilename('Noticeboard')}
                title="Noticeboard"
                statusColumn="priority"
                statusColor={(_v, row) => PRIORITY_HEX[row.priority as string]?.replace('#', '')}
              />
            )}
            <PrimaryButton icon={Plus} accent="violet" onClick={() => { setEditingNotice(null); setIsModalOpen(true); }}>Create Notice</PrimaryButton>
          </>
        }
      >
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatTile icon={FileText} color="#60a5fa" label="Total Notices" value={data.length} />
          <StatTile icon={CheckCircle} color="#34d399" label="Active" value={data.filter(n => n.status === 'Active').length} />
          <StatTile icon={Pin} color="#f59e0b" label="Pinned" value={pinnedNotices.length} />
          <StatTile icon={Clock4} color="#f43f5e" label="Expired" value={expiredNotices.length} />
        </div>
      </PageHero>

      {calculatedStats.total_notices > 0 && (
        <div className={`${t.glass} rounded-2xl ${t.shadow} p-5`}>
          <h3 className={`text-sm ${TYPE_WEIGHT.semibold} mb-3 flex items-center gap-2 ${t.textPrimary}`}><BarChart3 className="h-4 w-4" /> Priority Breakdown</h3>
          <div className="space-y-2.5">
            {PRIORITIES.map(priority => {
              const count = calculatedStats.priority_breakdown[priority] || 0;
              const pct = data.length > 0 ? (count / data.length) * 100 : 0;
              return (
                <div key={priority} className="flex items-center gap-3">
                  <span className={`text-xs w-16 shrink-0 ${t.textMuted}`}>{priority}</span>
                  <div className="flex-1"><ProgressBar value={Math.round(pct)} color={PRIORITY_HEX[priority]} showValue={false} /></div>
                  <span className={`text-xs ${TYPE_WEIGHT.medium} w-6 text-right ${t.textPrimary}`}>{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className={`${t.glass} rounded-2xl ${t.shadow} p-4 space-y-3`}>
        <div className="flex flex-wrap items-center gap-2">
          <SearchInput value={search} onChange={setSearch} placeholder="Search notices by title or content…" className="flex-1 min-w-[220px]" />
          <ViewToggle value={viewMode} onChange={setViewMode} options={[{ value: 'grid', icon: LayoutGrid, label: 'Grid view' }, { value: 'table', icon: TableIcon, label: 'Table view' }]} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
          <SelectField size="filter" value={filters.category} title="Category filter" onChange={v => setFilters(p => ({ ...p, category: v }))}
            options={[{ value: 'all', label: 'All Categories' }, ...CATEGORIES.map(c => ({ value: c, label: c }))]} />
          <SelectField size="filter" value={filters.priority} title="Priority filter" onChange={v => setFilters(p => ({ ...p, priority: v }))}
            options={[{ value: 'all', label: 'All Priorities' }, ...PRIORITIES.map(p => ({ value: p, label: p }))]} />
          <SelectField size="filter" value={filters.status} title="Status filter" onChange={v => setFilters(p => ({ ...p, status: v }))}
            options={[{ value: 'all', label: 'All Statuses' }, ...STATUSES.map(s => ({ value: s, label: s }))]} />
          <SelectField size="filter" value={filters.department} title="Department filter" onChange={v => setFilters(p => ({ ...p, department: v }))}
            options={[{ value: 'all', label: 'All Departments' }, ...DEPARTMENTS.map(d => ({ value: d, label: d }))]} />
          <SelectField size="filter" value={filters.is_pinned === null ? 'all' : String(filters.is_pinned)} title="Pinned filter"
            onChange={v => setFilters(p => ({ ...p, is_pinned: v === 'all' ? null : v === 'true' }))}
            options={[{ value: 'all', label: 'All Notices' }, { value: 'true', label: 'Pinned Only' }, { value: 'false', label: 'Not Pinned' }]} />
        </div>
        {hasFilters && (
          <div className="flex gap-2">
            <button type="button" onClick={() => { setFilters({ category: 'all', priority: 'all', status: 'all', department: 'all', is_pinned: null }); setSearch(''); }}
              className={`h-7 px-2.5 flex items-center gap-1 text-[11px] rounded-lg ${t.chipBg} ${t.hoverBg} ${t.textFaint}`}><X className="h-3 w-3" /> Clear Filters</button>
            <button type="button" onClick={fetchNotices} className={`h-7 px-2.5 flex items-center gap-1 text-[11px] rounded-lg ${t.chipBg} ${t.hoverBg} ${t.textFaint}`}><RefreshCw className="h-3 w-3" /> Refresh</button>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className={`flex items-center justify-center py-16 ${t.textFaint}`}><RefreshCw className="h-5 w-5 animate-spin mr-2" /> Loading notices…</div>
      ) : loadError && data.length === 0 ? (
        // A failed fetch used to fall straight through to the "no notices" empty
        // state below — indistinguishable from a genuinely empty noticeboard. This
        // is the real error state (only shown when there's nothing already on
        // screen to fall back to; a failed *refresh* just toasts and keeps showing
        // the stale list, same as PPE's recordsError pattern).
        <div className={`${t.glass} rounded-2xl overflow-hidden text-center py-16`}>
          <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-amber-500" />
          <p className={`text-sm ${TYPE_WEIGHT.semibold} ${t.textMuted} mb-1`}>Couldn&apos;t load notices</p>
          <p className={`text-xs ${t.textFaint} mb-4`}>The server may still be starting up — try again in a moment.</p>
          <button type="button" onClick={fetchNotices}
            className={`inline-flex items-center gap-1.5 text-xs px-4 py-2 rounded-lg ${TYPE_WEIGHT.semibold} text-white bg-gradient-to-br from-brand-500 to-brand-700 hover:brightness-110 transition-all`}>
            <RefreshCw className="h-3.5 w-3.5" /> Retry
          </button>
        </div>
      ) : data.length === 0 ? (
        <div className={`${t.glass} rounded-2xl overflow-hidden`}>
          <EmptyState icon={FileText} title="No notices found" message={hasFilters ? 'Try adjusting your search or filters' : 'Get started by creating your first notice'}
            action={!hasFilters ? { label: 'Create Your First Notice', onClick: () => { setEditingNotice(null); setIsModalOpen(true); } } : undefined} />
        </div>
      ) : viewMode === 'table' ? (
        <div className={`${t.glass} rounded-2xl ${t.shadow} overflow-hidden overflow-x-auto`}>
          <table className="w-full">
            <thead><tr className={`border-b ${t.border}`}>
              {['Title', 'Category', 'Priority', 'Status', 'Author', 'Date', ''].map(h => (
                <th key={h} className={`px-3 py-2.5 text-[10px] ${TYPE_WEIGHT.semibold} uppercase tracking-wider text-left ${t.textFaint}`}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {[...pinnedNotices, ...regularNotices].map(notice => (
                <tr key={notice.id} className={`border-b ${t.border} ${t.hoverBg} cursor-pointer transition-colors`} onClick={() => { setSelectedNotice(notice); setIsDetailsModalOpen(true); }}>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      {notice.is_pinned && <Pin className="h-3.5 w-3.5 text-amber-500 shrink-0" />}
                      <div className="min-w-0"><p className={`text-sm ${TYPE_WEIGHT.medium} truncate ${t.textPrimary}`}>{notice.title}</p><p className={`text-xs truncate ${t.textFaint}`}>{truncateText(notice.content, 60)}</p></div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5"><StatusBadge color="#64748b" label={notice.category} /></td>
                  <td className="px-3 py-2.5"><StatusBadge color={PRIORITY_HEX[notice.priority] ?? '#94a3b8'} label={notice.priority} /></td>
                  <td className="px-3 py-2.5"><StatusBadge color={STATUS_HEX[notice.status] ?? '#94a3b8'} label={notice.status} /></td>
                  <td className={`px-3 py-2.5 text-xs ${t.textMuted}`}>{notice.author || '-'}</td>
                  <td className={`px-3 py-2.5 text-xs ${t.textMuted}`}>{formatDate(notice.date)}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center justify-end gap-1">
                      <button type="button" title="Edit" aria-label="Edit notice" onClick={e => { e.stopPropagation(); setEditingNotice(notice); setIsModalOpen(true); }} className={`h-7 w-7 flex items-center justify-center rounded ${t.hoverBg} ${t.textFaint} hover:text-brand-500`}><Edit className="h-3.5 w-3.5" /></button>
                      <button type="button" title="Delete" aria-label="Delete notice" onClick={async e => { e.stopPropagation(); if (await confirm({ title: 'Delete this notice?', destructive: true })) handleDeleteNotice(notice.id); }} className={`h-7 w-7 flex items-center justify-center rounded ${t.hoverBg} ${t.textFaint} hover:text-rose-500`}><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="space-y-6">
          {pinnedNotices.length > 0 && (
            <div>
              <h3 className={`text-sm ${TYPE_WEIGHT.semibold} mb-3 flex items-center gap-2 ${t.textPrimary}`}><Bell className="h-4 w-4 text-amber-500" /> Pinned Notices <StatusBadge color="#f59e0b" label={String(pinnedNotices.length)} /></h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pinnedNotices.map(n => <NoticeCard key={n.id} notice={n} onView={n2 => { setSelectedNotice(n2); setIsDetailsModalOpen(true); }} onEdit={n2 => { setEditingNotice(n2); setIsModalOpen(true); }} onDelete={handleDeleteNotice} />)}
              </div>
            </div>
          )}
          <div>
            <h3 className={`text-sm ${TYPE_WEIGHT.semibold} mb-3 ${t.textPrimary}`}>All Notices ({regularNotices.length})</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {regularNotices.map(n => <NoticeCard key={n.id} notice={n} onView={n2 => { setSelectedNotice(n2); setIsDetailsModalOpen(true); }} onEdit={n2 => { setEditingNotice(n2); setIsModalOpen(true); }} onDelete={handleDeleteNotice} />)}
            </div>
          </div>
        </div>
      )}

      <div className={`${t.glass} rounded-2xl ${t.shadow} p-5`}>
        <h3 className={`text-sm ${TYPE_WEIGHT.semibold} mb-3 ${t.textPrimary}`}>Quick Actions</h3>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={handleArchiveAllExpired}
            title={`${expiredNotices.filter(n => n.status !== 'Archived').length} expired, not yet archived`}
            className={`px-3 py-1.5 rounded-lg text-xs ${t.chipBg} ${t.hoverBg} ${t.textMuted} inline-flex items-center gap-1.5`}>
            <Archive className="h-3.5 w-3.5" /> Archive All Expired
          </button>
          <button type="button" onClick={() => setHideExpired(v => !v)}
            className={`px-3 py-1.5 rounded-lg text-xs inline-flex items-center gap-1.5 transition-all ${
              hideExpired ? 'bg-brand-500/15 text-brand-500' : `${t.chipBg} ${t.hoverBg} ${t.textMuted}`
            }`}>
            <EyeOff className="h-3.5 w-3.5" /> {hideExpired ? 'Showing Non-Expired Only' : 'Hide Expired Notices'}
          </button>
          <button type="button" onClick={handleUnpinAll}
            title={`${pinnedNotices.length} currently pinned`}
            className={`px-3 py-1.5 rounded-lg text-xs ${t.chipBg} ${t.hoverBg} ${t.textMuted} inline-flex items-center gap-1.5`}>
            <PinOff className="h-3.5 w-3.5" /> Unpin All
          </button>
        </div>
      </div>

      <EditNoticeModal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingNotice(null); }} notice={editingNotice} onSave={handleSaveNotice} isLoading={isLoading} />
      <NoticeDetailsModal isOpen={isDetailsModalOpen} onClose={() => { setIsDetailsModalOpen(false); setSelectedNotice(null); }} notice={selectedNotice}
        onDelete={handleDeleteNotice} onEdit={n => { setIsDetailsModalOpen(false); setEditingNotice(n); setIsModalOpen(true); }} onTogglePin={handleTogglePin} />
    </main>
  );
}

export default function NoticeboardManagement() {
  return <AppShell><NoticeboardContent /></AppShell>;
}
