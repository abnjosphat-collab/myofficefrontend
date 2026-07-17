// app/services/page.tsx — Services Tracker with backend, pipeline, attachments & OCR
'use client';

import { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/apiClient';
import {
  Wrench, ClipboardList, DollarSign, Package, CheckCheck, Tag,
  Building2, Hash, Calendar, Phone,
  Trash2, Edit2, ChevronDown, ChevronUp, CheckCircle2, Circle,
  Filter, ArrowRight, Paperclip, Upload, X, FileDown, Download,
  ChevronsDown, ChevronsUp, Table2, LayoutGrid, FileSpreadsheet,
  Eye, AlertCircle, Loader2, Plus, Scan,
} from '@/components/shared/theme';
import { AppShell } from '@/components/app-shell';
import { formatDate } from '@/lib/format';
import {
  useTheme, PageHero, StatTile, StatusBadge, SearchInput, ViewToggle,
  FormField, FormActions, useCollapseSection, CenterModal, ProgressBar, ACCENT_HEX, GlowCard, SelectField,
} from '@/components/shared/theme';
import { Toaster, toast } from 'sonner';

// ─── API ──────────────────────────────────────────────────────────────────────

// ─── Types ────────────────────────────────────────────────────────────────────

interface StageData  { signed: boolean; signed_by: string; signed_date: string; comments: string; }
interface StoresStage extends StageData { grv_number: string; }
interface PaymentStage { done: boolean; paid_by: string; payment_date: string; payment_reference: string; comments: string; }

interface ServiceRecord {
  id: string;
  created_at: string;
  date: string;
  description: string;
  supplier: string;
  contact_person: string;
  requisition_number: string;
  invoice_number: string;
  order_number: string;
  amount: string;
  category: string;
  planning: StageData;
  engineering_manager: StageData;
  finance: StageData;
  gm: StageData;
  stores: StoresStage;
  payment: PaymentStage;
  general_comments: string;
}

interface Attachment {
  id: string;
  service_id: string;
  created_at: string;
  filename: string;
  file_url: string;
  file_size: number;
  mime_type: string;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const CATS = [
  'Maintenance', 'Electrical', 'Civil / Construction', 'IT / Technology',
  'Cleaning', 'Security', 'Transport', 'Catering', 'Consulting', 'Other',
];

const STAGES = [
  { key: 'planning'            as const, label: 'Planning',           short: 'Plan',    icon: ClipboardList },
  { key: 'engineering_manager' as const, label: 'Engineering Manager',short: 'Eng Mgr', icon: Tag           },
  { key: 'finance'             as const, label: 'Finance',            short: 'Finance', icon: DollarSign    },
  { key: 'gm'                  as const, label: 'General Manager',    short: 'GM',      icon: CheckCheck    },
  { key: 'stores'              as const, label: 'Stores / GRV',       short: 'Stores',  icon: Package       },
  { key: 'payment'             as const, label: 'Payment',            short: 'Payment', icon: DollarSign    },
];
type StageKey = typeof STAGES[number]['key'];

// ─── API ↔ frontend converters ────────────────────────────────────────────────

function toApi(r: ServiceRecord): Record<string, unknown> {
  return {
    date: r.date || null,
    description: r.description,          supplier: r.supplier,
    contact_person: r.contact_person,    requisition_number: r.requisition_number,
    invoice_number: r.invoice_number,    order_number: r.order_number,
    amount: r.amount,                    category: r.category,
    general_comments: r.general_comments,
    planning_signed: r.planning.signed,        planning_signed_by: r.planning.signed_by,
    planning_signed_date: r.planning.signed_date || null,
    planning_comments: r.planning.comments,
    eng_mgr_signed: r.engineering_manager.signed,
    eng_mgr_signed_by: r.engineering_manager.signed_by,
    eng_mgr_signed_date: r.engineering_manager.signed_date || null,
    eng_mgr_comments: r.engineering_manager.comments,
    finance_signed: r.finance.signed,          finance_signed_by: r.finance.signed_by,
    finance_signed_date: r.finance.signed_date || null,
    finance_comments: r.finance.comments,
    gm_signed: r.gm.signed,                   gm_signed_by: r.gm.signed_by,
    gm_signed_date: r.gm.signed_date || null,  gm_comments: r.gm.comments,
    stores_signed: r.stores.signed,            stores_signed_by: r.stores.signed_by,
    stores_signed_date: r.stores.signed_date || null,
    stores_comments: r.stores.comments,        stores_grv_number: r.stores.grv_number,
    payment_done: r.payment.done,              payment_paid_by: r.payment.paid_by,
    payment_date: r.payment.payment_date || null,
    payment_reference: r.payment.payment_reference,
    payment_comments: r.payment.comments,
  };
}

function fromApi(d: Record<string, unknown>): ServiceRecord {
  const s = (v: unknown) => String(v ?? '');
  const b = (v: unknown) => v === true || v === 'true';
  return {
    id: s(d.id), created_at: s(d.created_at),
    date: s(d.date), description: s(d.description), supplier: s(d.supplier),
    contact_person: s(d.contact_person), requisition_number: s(d.requisition_number),
    invoice_number: s(d.invoice_number), order_number: s(d.order_number),
    amount: s(d.amount), category: s(d.category), general_comments: s(d.general_comments),
    planning:            { signed: b(d.planning_signed),  signed_by: s(d.planning_signed_by),  signed_date: s(d.planning_signed_date),  comments: s(d.planning_comments) },
    engineering_manager: { signed: b(d.eng_mgr_signed),   signed_by: s(d.eng_mgr_signed_by),   signed_date: s(d.eng_mgr_signed_date),   comments: s(d.eng_mgr_comments) },
    finance:             { signed: b(d.finance_signed),   signed_by: s(d.finance_signed_by),   signed_date: s(d.finance_signed_date),   comments: s(d.finance_comments) },
    gm:                  { signed: b(d.gm_signed),        signed_by: s(d.gm_signed_by),        signed_date: s(d.gm_signed_date),        comments: s(d.gm_comments) },
    stores:              { signed: b(d.stores_signed),    signed_by: s(d.stores_signed_by),    signed_date: s(d.stores_signed_date),    comments: s(d.stores_comments), grv_number: s(d.stores_grv_number) },
    payment:             { done: b(d.payment_done),       paid_by: s(d.payment_paid_by),       payment_date: s(d.payment_date),         payment_reference: s(d.payment_reference), comments: s(d.payment_comments) },
  };
}

function emptyRecord(): ServiceRecord {
  const stage  = (): StageData   => ({ signed: false, signed_by: '', signed_date: '', comments: '' });
  const stores = (): StoresStage => ({ ...stage(), grv_number: '' });
  const pay    = (): PaymentStage => ({ done: false, paid_by: '', payment_date: '', payment_reference: '', comments: '' });
  return {
    id: crypto.randomUUID(), created_at: new Date().toISOString(),
    date: new Date().toISOString().slice(0, 10),
    description: '', supplier: '', contact_person: '',
    requisition_number: '', invoice_number: '', order_number: '',
    amount: '', category: '', general_comments: '',
    planning: stage(), engineering_manager: stage(), finance: stage(),
    gm: stage(), stores: stores(), payment: pay(),
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function stagesDone(r: ServiceRecord): number {
  return [r.planning.signed, r.engineering_manager.signed, r.finance.signed,
    r.gm.signed, r.stores.signed, r.payment.done].filter(Boolean).length;
}
function isStageDone(r: ServiceRecord, key: StageKey): boolean {
  return key === 'payment' ? r.payment.done : (r[key] as StageData).signed;
}
function thisMonth(d: string): boolean {
  const now = new Date(); const dt = new Date(d);
  return dt.getMonth() === now.getMonth() && dt.getFullYear() === now.getFullYear();
}
function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
// fmtDate was identical to the shared formatDate — alias to the single source.
const fmtDate = formatDate;

// ─── Stage Row ────────────────────────────────────────────────────────────────

function StageRow({ stage, record, onUpdate }: { stage: typeof STAGES[number]; record: ServiceRecord; onUpdate: (r: ServiceRecord) => void; }) {
  const t = useTheme();
  const [open, setOpen] = useState(false);
  const isPay = stage.key === 'payment';
  const isStores = stage.key === 'stores';
  const done = isStageDone(record, stage.key);
  const Icon = stage.icon;
  const inputCls = `w-full h-9 px-3 rounded-lg text-sm ${t.inputBg} focus:outline-none`;

  const data = isPay ? null
    : record[stage.key as keyof Pick<ServiceRecord, 'planning' | 'engineering_manager' | 'finance' | 'gm' | 'stores'>] as StageData | StoresStage;

  function toggle() {
    if (isPay) {
      const next = !record.payment.done;
      onUpdate({ ...record, payment: { ...record.payment, done: next } });
      if (next) setOpen(true);
    } else {
      const cur = record[stage.key as 'planning'] as StageData;
      const next = !cur.signed;
      onUpdate({ ...record, [stage.key]: { ...cur, signed: next } });
      if (next) setOpen(true);
    }
  }
  function setPay(f: string, v: string) { onUpdate({ ...record, payment: { ...record.payment, [f]: v } }); }
  function setData(f: string, v: string) {
    const cur = record[stage.key as 'planning'] as StageData | StoresStage;
    onUpdate({ ...record, [stage.key]: { ...cur, [f]: v } });
  }

  const summary = isPay
    ? [record.payment.paid_by, record.payment.payment_date ? fmtDate(record.payment.payment_date) : '', record.payment.payment_reference ? `Ref: ${record.payment.payment_reference}` : ''].filter(Boolean).join(' · ')
    : data ? [data.signed_by, data.signed_date ? fmtDate(data.signed_date) : '', isStores ? ((data as StoresStage).grv_number ? `GRV: ${(data as StoresStage).grv_number}` : '') : ''].filter(Boolean).join(' · ') : '';

  return (
    <div className={`rounded-xl overflow-hidden transition-all ${done ? 'bg-brand-500/[0.07]' : t.chipBg}`}>
      <div className="flex items-center gap-3 px-4 py-2.5">
        <button type="button" onClick={toggle} title={done ? `Unmark ${stage.label}` : `Mark ${stage.label} as complete`} className="shrink-0 transition-transform hover:scale-110">
          {done ? <CheckCircle2 className="h-5 w-5 text-brand-400" /> : <Circle className={`h-5 w-5 ${t.textFaint}`} />}
        </button>
        <div className={`p-1.5 rounded-md ${t.chipBg} shrink-0`}>
          <Icon className="h-3.5 w-3.5 text-brand-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium ${done ? t.textPrimary : t.textFaint}`}>{stage.label}</p>
          {done && summary && <p className={`text-[11px] mt-0.5 truncate ${t.textFaint}`}>{summary}</p>}
          {!done && <p className={`text-[11px] mt-0.5 ${t.textFaint}`}>Tap the circle when this stage is complete</p>}
        </div>
        <button type="button" onClick={() => setOpen(o => !o)} title={open ? 'Hide details' : 'Show details'}
          className={`h-7 w-7 flex items-center justify-center rounded-lg ${t.hoverBg} ${t.textFaint} ${t.hoverText} transition-all shrink-0`}>
          {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
      </div>
      {open && (
        <div className={`px-4 pb-4 pt-2 space-y-3 border-t ${t.border}`}>
          {isPay ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Paid by"><input className={inputCls} placeholder="Name of person who made payment" value={record.payment.paid_by} onChange={e => setPay('paid_by', e.target.value)} /></FormField>
                <FormField label="Date of payment"><input type="date" title="Date of payment" className={inputCls} value={record.payment.payment_date} onChange={e => setPay('payment_date', e.target.value)} /></FormField>
              </div>
              <FormField label="Payment reference / transaction number"><input className={inputCls} placeholder="e.g. EFT-2024-001 or cheque number" value={record.payment.payment_reference} onChange={e => setPay('payment_reference', e.target.value)} /></FormField>
              <FormField label="Payment comments"><textarea rows={2} placeholder="Any notes about this payment…" value={record.payment.comments} onChange={e => setPay('comments', e.target.value)} className={`${inputCls} h-auto py-2 resize-none`} /></FormField>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Signed / approved by"><input className={inputCls} placeholder="Full name of approver" value={(data as StageData).signed_by} onChange={e => setData('signed_by', e.target.value)} /></FormField>
                <FormField label="Date signed"><input type="date" title="Date signed" className={inputCls} value={(data as StageData).signed_date} onChange={e => setData('signed_date', e.target.value)} /></FormField>
              </div>
              {isStores && (
                <FormField label="GRV Number (Goods Received Voucher)"><input className={inputCls} placeholder="e.g. GRV-2024-001" value={(data as StoresStage).grv_number} onChange={e => setData('grv_number', e.target.value)} /></FormField>
              )}
              <FormField label="Comments for this stage"><textarea rows={2} placeholder="e.g. Document handed to [name], awaiting countersignature…" value={(data as StageData).comments} onChange={e => setData('comments', e.target.value)} className={`${inputCls} h-auto py-2 resize-none`} /></FormField>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Attachment Panel ─────────────────────────────────────────────────────────

function AttachmentPanel({ serviceId }: { serviceId: string }) {
  const t = useTheme();
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.get<Attachment[]>(`/api/services/${serviceId}/attachments`)
      .then(data => { setAttachments(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [serviceId]);

  async function upload(file: File) {
    setUploading(true);
    try {
      const fd = new FormData(); fd.append('file', file);
      const att = await api.post<Attachment>(`/api/services/${serviceId}/attachments`, fd);
      setAttachments(prev => [att, ...prev]);
      toast.success('File attached');
    } catch (e) { toast.error(`Upload failed: ${e}`); }
    finally { setUploading(false); }
  }
  async function remove() {
    if (!deleteId) return;
    try {
      await api.delete(`/api/services/${serviceId}/attachments/${deleteId}`);
      setAttachments(prev => prev.filter(a => a.id !== deleteId));
      toast.success('Attachment removed');
    } catch { toast.error('Delete failed'); }
    finally { setDeleteId(null); }
  }

  if (loading) return <div className={`py-6 text-center text-xs flex items-center justify-center gap-2 ${t.textFaint}`}><Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…</div>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className={`text-xs font-medium ${t.textMuted}`}>Scanned hard copies &amp; supporting documents</p>
          <p className={`text-[11px] mt-0.5 ${t.textFaint}`}>Upload completion certificates, invoices, GRVs, or any other documents.</p>
        </div>
        <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading}
          className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold text-white bg-gradient-to-br from-brand-500 to-brand-700 hover:brightness-110 transition-all disabled:opacity-50">
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          {uploading ? 'Uploading…' : 'Attach file'}
        </button>
        <input ref={inputRef} type="file" title="Attach file" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ''; }} />
      </div>

      {attachments.length === 0 ? (
        <div className={`py-6 text-center border border-dashed ${t.border} rounded-xl`}>
          <Paperclip className={`h-6 w-6 mx-auto mb-2 ${t.textFaint}`} />
          <p className={`text-xs ${t.textFaint}`}>No attachments yet</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {attachments.map(a => (
            <div key={a.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl ${t.chipBg} group`}>
              <Paperclip className="h-3.5 w-3.5 text-brand-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-medium truncate ${t.textMuted}`}>{a.filename}</p>
                <p className={`text-[11px] ${t.textFaint}`}>{fmtBytes(a.file_size)} · {fmtDate(a.created_at)}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                {a.file_url && (
                  <a href={a.file_url} target="_blank" rel="noopener noreferrer" title="Download" className={`h-6 w-6 flex items-center justify-center rounded-md ${t.hoverBg} ${t.textFaint} hover:text-brand-400`}>
                    <Download className="h-3 w-3" />
                  </a>
                )}
                <button type="button" onClick={() => setDeleteId(a.id)} title="Remove attachment" className={`h-6 w-6 flex items-center justify-center rounded-md ${t.hoverBg} ${t.textFaint} hover:text-rose-500`}>
                  <X className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <CenterModal open={deleteId !== null} onClose={() => setDeleteId(null)} title="Remove Attachment" accent="amber" width="max-w-sm">
        <div className="p-5 space-y-4">
          <p className={`text-sm ${t.textMuted}`}>This file will be permanently deleted.</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setDeleteId(null)} className={`flex-1 py-2.5 rounded-xl text-sm ${t.textMuted} ${t.hoverText} border ${t.border}`}>Cancel</button>
            <button type="button" onClick={remove} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-br from-rose-500 to-rose-700 hover:brightness-110">Remove</button>
          </div>
        </div>
      </CenterModal>
    </div>
  );
}

// ─── Service Card ──────────────────────────────────────────────────────────────

function ServiceCard({ record, expanded, onToggle, onUpdate, onEdit, onDelete }: {
  record: ServiceRecord; expanded: boolean; onToggle: () => void; onUpdate: (r: ServiceRecord) => void; onEdit: (r: ServiceRecord) => void; onDelete: (id: string) => void;
}) {
  const t = useTheme();
  const [pipeTab, setPipeTab] = useState<'pipeline' | 'attachments'>('pipeline');
  const done = stagesDone(record);
  const statusInfo = done === 6 ? { color: '#34d399', label: 'Completed' } : done === 0 ? { color: '#94a3b8', label: 'Not Started' } : { color: '#f59e0b', label: `Stage ${done + 1} of 6` };

  return (
    <GlowCard color={statusInfo.color} surface={`${t.glass} rounded-2xl`} className="overflow-hidden flex flex-col">
      <div className="px-4 sm:px-5 pt-4 pb-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <StatusBadge color={statusInfo.color} label={statusInfo.label} dot />
            {record.category && <StatusBadge color={ACCENT_HEX.blue} label={record.category} />}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button type="button" onClick={() => onEdit(record)} title="Edit record" className={`h-7 w-7 flex items-center justify-center rounded-lg ${t.chipBg} ${t.textFaint} ${t.hoverText}`}><Edit2 className="h-3.5 w-3.5" /></button>
            <button type="button" onClick={() => onDelete(record.id)} title="Delete record" className={`h-7 w-7 flex items-center justify-center rounded-lg ${t.chipBg} ${t.textFaint} hover:text-rose-500`}><Trash2 className="h-3.5 w-3.5" /></button>
          </div>
        </div>

        <h3 className={`text-sm font-semibold leading-snug mb-1.5 ${t.textPrimary}`}>{record.description || '—'}</h3>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {record.supplier && <span className={`flex items-center gap-1 text-xs ${t.textFaint}`}><Building2 className="h-3 w-3 shrink-0" />{record.supplier}</span>}
          {record.contact_person && <span className={`flex items-center gap-1 text-xs ${t.textFaint}`}><Phone className="h-3 w-3 shrink-0" />{record.contact_person}</span>}
          {record.date && <span className={`flex items-center gap-1 text-xs ${t.textFaint}`}><Calendar className="h-3 w-3 shrink-0" />{fmtDate(record.date)}</span>}
          {record.amount && <span className="text-xs font-semibold text-brand-400 ml-auto">{record.amount}</span>}
        </div>

        {(record.requisition_number || record.invoice_number || record.order_number) && (
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
            {record.requisition_number && <span className={`text-[11px] flex items-center gap-1 ${t.textFaint}`}><Hash className="h-2.5 w-2.5" />REQ: {record.requisition_number}</span>}
            {record.invoice_number && <span className={`text-[11px] flex items-center gap-1 ${t.textFaint}`}><Hash className="h-2.5 w-2.5" />INV: {record.invoice_number}</span>}
            {record.order_number && <span className={`text-[11px] flex items-center gap-1 ${t.textFaint}`}><Hash className="h-2.5 w-2.5" />PO: {record.order_number}</span>}
          </div>
        )}

        <div className="mt-3">
          <ProgressBar value={(done / 6) * 100} color={done === 6 ? '#34d399' : done > 0 ? ACCENT_HEX.blue : '#94a3b8'} label="Approval pipeline" />
          <div className="flex items-center gap-1 mt-2">
            {STAGES.map(s => (
              <div key={s.key} className="flex-1 text-center">
                <div className={`mx-auto h-2 w-2 rounded-full transition-all ${isStageDone(record, s.key) ? 'bg-brand-400' : t.chipBg}`} title={s.label} />
                <span className={`hidden sm:block text-[9px] mt-0.5 truncate ${t.textFaint}`}>{s.short}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className={`border-t ${t.border}`}>
        <button type="button" onClick={onToggle} className={`w-full flex items-center justify-between px-4 sm:px-5 py-2.5 text-xs ${t.textFaint} ${t.hoverText} ${t.hoverBgSoft} transition-all`}>
          <span className="font-medium">{expanded ? 'Collapse' : 'Pipeline & Attachments'}</span>
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
        {expanded && (
          <div className={`px-4 sm:px-5 pb-5 pt-1 border-t ${t.border}`}>
            <div className={`flex gap-1 ${t.glassSoft} rounded-lg p-1 w-fit mb-3`}>
              {(['pipeline', 'attachments'] as const).map(k => (
                <button key={k} type="button" onClick={() => setPipeTab(k)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors ${pipeTab === k ? 'bg-brand-500/20 text-brand-400' : `${t.textFaint} ${t.hoverText}`}`}>
                  {k}
                </button>
              ))}
            </div>
            {pipeTab === 'pipeline' ? (
              <div className="space-y-2">
                <p className={`text-[11px] mb-3 ${t.textFaint}`}>Tap the circle on each stage to mark it complete, then expand to record details.</p>
                {STAGES.map(s => <StageRow key={s.key} stage={s} record={record} onUpdate={onUpdate} />)}
                {record.general_comments && (
                  <div className={`mt-1 p-3 rounded-xl ${t.chipBg}`}>
                    <p className={`text-[11px] uppercase tracking-wider mb-1 ${t.textFaint}`}>General Comments</p>
                    <p className={`text-xs ${t.textMuted}`}>{record.general_comments}</p>
                  </div>
                )}
              </div>
            ) : <AttachmentPanel serviceId={record.id} />}
          </div>
        )}
      </div>
    </GlowCard>
  );
}

// ─── List View ─────────────────────────────────────────────────────────────────

function ListView({ records, onEdit, onDelete, onView }: { records: ServiceRecord[]; onEdit: (r: ServiceRecord) => void; onDelete: (id: string) => void; onView: (r: ServiceRecord) => void; }) {
  const t = useTheme();
  if (records.length === 0) return <p className={`py-12 text-center text-sm ${t.textFaint}`}>No service records found.</p>;
  return (
    <div className={`${t.glass} rounded-2xl overflow-x-auto`}>
      <table className="w-full text-sm">
        <thead>
          <tr className={`border-b ${t.border}`}>
            {['Date', 'Description', 'REQ #', 'Amount', 'Pipeline', 'Category', ''].map(h => (
              <th key={h} className={`text-left p-3 text-xs font-semibold uppercase tracking-wide ${t.textFaint}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {records.map(r => {
            const d = stagesDone(r);
            return (
              <tr key={r.id} className={`border-b ${t.border} ${t.hoverBgSoft} cursor-pointer`} onClick={() => onView(r)}>
                <td className={`p-3 text-xs ${t.textMuted}`}>{fmtDate(r.date)}</td>
                <td className="p-3 min-w-0">
                  <p className={`text-sm font-medium truncate ${t.textPrimary}`}>{r.description || '—'}</p>
                  {r.supplier && <p className={`text-[11px] truncate flex items-center gap-1 ${t.textFaint}`}><Building2 className="h-2.5 w-2.5 shrink-0" />{r.supplier}</p>}
                </td>
                <td className={`p-3 text-xs ${t.textFaint}`}>{r.requisition_number || '—'}</td>
                <td className="p-3 text-xs font-semibold text-brand-400 text-right">{r.amount || '—'}</td>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <ProgressBar value={(d / 6) * 100} color={d === 6 ? '#34d399' : d > 0 ? ACCENT_HEX.blue : '#94a3b8'} showValue={false} />
                    <span className={`text-[11px] shrink-0 ${t.textFaint}`}>{d}/6</span>
                  </div>
                </td>
                <td className="p-3">{r.category ? <StatusBadge color={ACCENT_HEX.blue} label={r.category} /> : <span className={`text-xs ${t.textFaint}`}>—</span>}</td>
                <td className="p-3" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-1">
                    <button type="button" onClick={() => onView(r)} title="View pipeline" className={`h-6 w-6 flex items-center justify-center rounded-md ${t.textFaint} hover:text-brand-400 ${t.hoverBg}`}><Eye className="h-3 w-3" /></button>
                    <button type="button" onClick={() => onEdit(r)} title="Edit" className={`h-6 w-6 flex items-center justify-center rounded-md ${t.textFaint} ${t.hoverText} ${t.hoverBg}`}><Edit2 className="h-3 w-3" /></button>
                    <button type="button" onClick={() => onDelete(r.id)} title="Delete" className={`h-6 w-6 flex items-center justify-center rounded-md ${t.textFaint} hover:text-rose-500 ${t.hoverBg}`}><Trash2 className="h-3 w-3" /></button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Service Form ──────────────────────────────────────────────────────────────

function ServiceForm({ initial, onSave, onClose }: { initial: ServiceRecord; onSave: (r: ServiceRecord) => void; onClose: () => void; }) {
  const t = useTheme();
  const [form, setForm] = useState(initial);
  const set = (f: keyof ServiceRecord) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [f]: e.target.value }));
  const inputCls = `w-full h-9 px-3 rounded-lg text-sm ${t.inputBg} focus:outline-none`;

  return (
    <form onSubmit={e => { e.preventDefault(); onSave(form); }} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Date of service"><input type="date" title="Date of service" className={inputCls} value={form.date} onChange={set('date')} /></FormField>
        <FormField label="Category">
          <SelectField size="form" title="Category" value={form.category} onChange={v => setForm(p => ({ ...p, category: v }))}
            placeholder="Select a category…" options={CATS.map(c => ({ value: c, label: c }))} />
        </FormField>
      </div>
      <FormField label="Description of service" required>
        <textarea placeholder="Describe what service was performed — e.g. 'Replaced hydraulic pump on Compressor #3'" rows={3} value={form.description} onChange={set('description')} className={`${inputCls} h-auto py-2 resize-none`} />
      </FormField>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Supplier / Contractor"><input className={inputCls} placeholder="Company name" value={form.supplier} onChange={set('supplier')} /></FormField>
        <FormField label="Contact person"><input className={inputCls} placeholder="Representative's name" value={form.contact_person} onChange={set('contact_person')} /></FormField>
      </div>
      <div className={`p-3 rounded-xl ${t.chipBg} space-y-3`}>
        <p className={`text-[11px] font-semibold uppercase tracking-wider ${t.textFaint}`}>Reference Numbers</p>
        <div className="grid grid-cols-3 gap-3">
          <FormField label="Requisition No."><input className={inputCls} placeholder="REQ-..." value={form.requisition_number} onChange={set('requisition_number')} /></FormField>
          <FormField label="Invoice No."><input className={inputCls} placeholder="INV-..." value={form.invoice_number} onChange={set('invoice_number')} /></FormField>
          <FormField label="Order / PO No."><input className={inputCls} placeholder="PO-..." value={form.order_number} onChange={set('order_number')} /></FormField>
        </div>
      </div>
      <FormField label="Total amount"><input className={inputCls} placeholder="e.g. $1,500.00" value={form.amount} onChange={set('amount')} /></FormField>
      <FormField label="General comments / notes"><textarea placeholder="Any additional context…" rows={2} value={form.general_comments} onChange={set('general_comments')} className={`${inputCls} h-auto py-2 resize-none`} /></FormField>
      <FormActions onCancel={onClose} submitLabel={initial.description ? 'Save Changes' : 'Add Service Record'} accent="violet" />
    </form>
  );
}

// ─── Excel Import Modal ────────────────────────────────────────────────────────

const EXCEL_MAP: Record<string, keyof ServiceRecord> = {
  date: 'date', 'service date': 'date',
  description: 'description', service: 'description', 'service description': 'description',
  supplier: 'supplier', contractor: 'supplier', vendor: 'supplier',
  contact: 'contact_person', 'contact person': 'contact_person',
  req: 'requisition_number', requisition: 'requisition_number', 'req #': 'requisition_number', 'req no': 'requisition_number',
  inv: 'invoice_number', invoice: 'invoice_number', 'inv #': 'invoice_number', 'invoice no': 'invoice_number',
  po: 'order_number', order: 'order_number', 'purchase order': 'order_number', 'po #': 'order_number',
  amount: 'amount', cost: 'amount', price: 'amount', value: 'amount', total: 'amount',
  category: 'category', type: 'category',
  comments: 'general_comments', comment: 'general_comments', notes: 'general_comments', note: 'general_comments', remarks: 'general_comments',
};
const SPREADSHEET_EXTS = new Set(['.xlsx', '.xls', '.csv']);
function fileMode(file: File): 'spreadsheet' | 'document' {
  const ext = '.' + (file.name.split('.').pop() ?? '').toLowerCase();
  return SPREADSHEET_EXTS.has(ext) ? 'spreadsheet' : 'document';
}

function ExcelImportModal({ onImport, onExtracted, onClose }: {
  onImport: (rows: ServiceRecord[]) => Promise<void>; onExtracted: (partial: Partial<ServiceRecord>) => void; onClose: () => void;
}) {
  const t = useTheme();
  const [rows, setRows] = useState<ServiceRecord[]>([]);
  const [preview, setPreview] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState('');

  async function handleFile(file: File) {
    setScanError('');
    if (fileMode(file) === 'document') {
      setScanning(true);
      try {
        const fd = new FormData(); fd.append('file', file);
        const data = await api.post<any>('/api/services/ocr', fd);
        const partial: Partial<ServiceRecord> = {
          date: data.date ?? '', description: data.description ?? '', supplier: data.supplier ?? '',
          contact_person: data.contact_person ?? '', requisition_number: data.requisition_number ?? '',
          invoice_number: data.invoice_number ?? '', order_number: data.order_number ?? '', amount: data.amount ?? '',
          category: data.category ?? '', general_comments: data.general_comments ?? '',
        };
        if (data.grv_number) partial.stores = { signed: false, signed_by: '', signed_date: '', comments: '', grv_number: data.grv_number };
        if (data.payment_reference) partial.payment = { done: false, paid_by: '', payment_date: '', payment_reference: data.payment_reference, comments: '' };
        onExtracted(partial);
        onClose();
      } catch (e: unknown) { setScanError(e instanceof Error ? e.message : 'Extraction failed — try a clearer scan.'); }
      finally { setScanning(false); }
      return;
    }
    const XLSX = await import('xlsx');
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' });
    if (!raw.length) { toast.error('No data found in the file'); return; }
    const hdrs = Object.keys(raw[0]);
    setHeaders(hdrs);
    setPreview(raw.slice(0, 5).map(r => hdrs.map(h => String(r[h] ?? ''))));
    setRows(raw.map(row => {
      const rec = emptyRecord();
      Object.entries(row).forEach(([col, val]) => {
        const field = EXCEL_MAP[col.toLowerCase().trim()];
        if (field) (rec as unknown as Record<string, unknown>)[field] = String(val ?? '').trim();
      });
      return rec;
    }));
  }

  async function doImport(e: React.FormEvent) { e.preventDefault(); setImporting(true); try { await onImport(rows); onClose(); } finally { setImporting(false); } }

  return (
    <form onSubmit={doImport} className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <div className={`p-3 rounded-xl ${t.chipBg}`}>
          <p className={`text-xs font-semibold mb-1 flex items-center gap-1.5 ${t.textMuted}`}><FileSpreadsheet className="h-3.5 w-3.5" /> Spreadsheet</p>
          <p className={`text-[11px] leading-relaxed ${t.textFaint}`}>Excel (.xlsx, .xls) or CSV with headers: Date, Description, Supplier, Contact, REQ #, INV #, PO #, Amount, Category, Comments.</p>
        </div>
        <div className={`p-3 rounded-xl ${t.chipBg}`}>
          <p className={`text-xs font-semibold mb-1 flex items-center gap-1.5 ${t.textMuted}`}><Eye className="h-3.5 w-3.5" /> Document / Scan</p>
          <p className={`text-[11px] leading-relaxed ${t.textFaint}`}>PDF, JPEG, PNG, TIFF, WEBP — OCR will read the text and pre-fill the form for you to review.</p>
        </div>
      </div>

      <div className={`border-2 border-dashed ${t.border} rounded-xl p-6 text-center hover:border-brand-400/40 transition-colors`}>
        {scanning ? (
          <div className="space-y-2"><Loader2 className="h-8 w-8 text-brand-400 mx-auto animate-spin" /><p className={`text-sm ${t.textMuted}`}>Reading document…</p></div>
        ) : (
          <>
            <Upload className={`h-8 w-8 mx-auto mb-2 ${t.textFaint}`} />
            <p className={`text-sm mb-1 ${t.textMuted}`}>Choose a spreadsheet, PDF, or image</p>
            <p className={`text-[11px] mb-3 ${t.textFaint}`}>.xlsx · .xls · .csv · .pdf · .jpg · .png · .tiff · .webp</p>
            <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-br from-brand-500 to-brand-700 hover:brightness-110 transition-all">
              <Upload className="h-4 w-4" /> Browse file
              <input type="file" accept=".xlsx,.xls,.csv,.pdf,.jpg,.jpeg,.png,.webp,.tiff,.tif,.bmp" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.currentTarget.value = ''; }} />
            </label>
          </>
        )}
      </div>

      {scanError && <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-500/10 text-rose-400 text-xs"><AlertCircle className="h-4 w-4 shrink-0 mt-0.5" /> {scanError}</div>}

      {preview.length > 0 && (
        <div>
          <p className={`text-xs font-semibold mb-2 ${t.textMuted}`}>Preview — first {preview.length} rows ({rows.length} total will be imported)</p>
          <div className={`overflow-x-auto rounded-xl ${t.chipBg}`}>
            <table className="w-full text-xs">
              <thead><tr className={`border-b ${t.border}`}>{headers.map(h => <th key={h} className={`px-3 py-2 text-left font-semibold whitespace-nowrap ${t.textFaint}`}>{h}</th>)}</tr></thead>
              <tbody>{preview.map((row, i) => <tr key={i} className={`border-b ${t.border}`}>{row.map((cell, j) => <td key={j} className={`px-3 py-2 whitespace-nowrap max-w-[160px] truncate ${t.textMuted}`}>{cell}</td>)}</tr>)}</tbody>
            </table>
          </div>
        </div>
      )}

      <FormActions onCancel={onClose} submitting={importing} submitLabel={`Import ${rows.length > 0 ? `${rows.length} records` : ''}`} accent="violet" />
    </form>
  );
}

// ─── OCR Upload Modal ──────────────────────────────────────────────────────────

function OcrUploadModal({ onExtracted, onClose }: { onExtracted: (partial: Partial<ServiceRecord>) => void; onClose: () => void; }) {
  const t = useTheme();
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');

  async function handleFile(file: File) {
    setScanning(true); setError('');
    try {
      const fd = new FormData(); fd.append('file', file);
      const data = await api.post<any>('/api/services/ocr', fd);
      const partial: Partial<ServiceRecord> = {
        date: data.date ?? '', description: data.description ?? '', supplier: data.supplier ?? '',
        contact_person: data.contact_person ?? '', requisition_number: data.requisition_number ?? '',
        invoice_number: data.invoice_number ?? '', order_number: data.order_number ?? '', amount: data.amount ?? '',
        category: data.category ?? '', general_comments: data.general_comments ?? '',
      };
      if (data.grv_number) partial.stores = { signed: false, signed_by: '', signed_date: '', comments: '', grv_number: data.grv_number };
      if (data.payment_reference) partial.payment = { done: false, paid_by: '', payment_date: '', payment_reference: data.payment_reference, comments: '' };
      onExtracted(partial);
      onClose();
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Extraction failed. Please try a clearer scan.'); }
    finally { setScanning(false); }
  }

  return (
    <div className="space-y-4">
      <div className={`p-4 rounded-xl ${t.chipBg}`}>
        <p className={`text-xs font-semibold mb-1 ${t.textMuted}`}>How this works</p>
        <p className={`text-[11px] leading-relaxed ${t.textFaint}`}>
          Upload a scanned completion certificate, invoice, or any service document. OCR will extract the text and pre-fill the form — review and edit before saving.
          <br />Supported: PDF, JPEG, PNG, WEBP · Max 20 MB
        </p>
      </div>
      <div className={`border-2 border-dashed ${t.border} rounded-xl p-8 text-center hover:border-brand-400/40 transition-colors`}>
        {scanning ? (
          <div className="space-y-3">
            <Loader2 className="h-8 w-8 text-brand-400 mx-auto animate-spin" />
            <p className={`text-sm ${t.textMuted}`}>Reading document…</p>
            <p className={`text-[11px] ${t.textFaint}`}>This may take a few seconds</p>
          </div>
        ) : (
          <>
            <FileDown className={`h-8 w-8 mx-auto mb-2 ${t.textFaint}`} />
            <p className={`text-sm mb-3 ${t.textMuted}`}>Choose a scanned document to extract data from</p>
            <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-br from-brand-500 to-brand-700 hover:brightness-110 transition-all">
              <Upload className="h-4 w-4" /> Choose file
              <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            </label>
          </>
        )}
      </div>
      {error && <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-500/10 text-rose-400 text-xs"><AlertCircle className="h-4 w-4 shrink-0 mt-0.5" /> {error}</div>}
      <div className="flex justify-end">
        <button type="button" onClick={onClose} className={`h-9 px-4 rounded-xl text-sm ${t.textMuted} ${t.hoverText} border ${t.border}`}>Cancel</button>
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

function ServicesPageContent() {
  const t = useTheme();
  const sections = useCollapseSection({ hero: true });
  const [records, setRecords] = useState<ServiceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState('');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [showFilters, setShowFilters] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [formOpen, setFormOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<ServiceRecord | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [ocrOpen, setOcrOpen] = useState(false);
  const [viewRecord, setViewRecord] = useState<ServiceRecord | null>(null);
  const [viewTab, setViewTab] = useState<'pipeline' | 'attachments'>('pipeline');

  const syncTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    api.get<Record<string, unknown>[]>('/api/services')
      .then(data => { setRecords(data.map(fromApi)); setLoading(false); })
      .catch(e => { setApiError(`Could not connect to backend: ${e.message}`); setLoading(false); });
  }, []);

  const total = records.length;
  const inProg = records.filter(r => { const d = stagesDone(r); return d > 0 && d < 6; }).length;
  const completed = records.filter(r => stagesDone(r) === 6).length;
  const notStarted = records.filter(r => stagesDone(r) === 0).length;
  const monthCount = records.filter(r => thisMonth(r.date)).length;

  const q = search.toLowerCase();
  const processed = records
    .filter(r => {
      if (q && ![r.description, r.supplier, r.requisition_number, r.invoice_number, r.order_number, r.stores.grv_number, r.contact_person].some(v => v.toLowerCase().includes(q))) return false;
      if (dateFrom && r.date < dateFrom) return false;
      if (dateTo && r.date > dateTo) return false;
      if (filterCat && r.category !== filterCat) return false;
      if (filterStatus) {
        const d = stagesDone(r);
        if (filterStatus === 'not_started' && d !== 0) return false;
        if (filterStatus === 'in_progress' && (d === 0 || d === 6)) return false;
        if (filterStatus === 'completed' && d !== 6) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'newest') return b.created_at.localeCompare(a.created_at);
      if (sortBy === 'oldest') return a.created_at.localeCompare(b.created_at);
      if (sortBy === 'date_desc') return b.date.localeCompare(a.date);
      if (sortBy === 'date_asc') return a.date.localeCompare(b.date);
      if (sortBy === 'supplier') return a.supplier.localeCompare(b.supplier);
      if (sortBy === 'progress_desc') return stagesDone(b) - stagesDone(a);
      return 0;
    });

  const allExpanded = processed.length > 0 && processed.every(r => expandedIds.has(r.id));
  function expandAll() { setExpandedIds(new Set(processed.map(r => r.id))); }
  function collapseAll() { setExpandedIds(new Set()); }
  function toggleCard(id: string) { setExpandedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; }); }

  async function handleSave(r: ServiceRecord) {
    const isNew = !records.find(x => x.id === r.id);
    try {
      if (isNew) {
        const saved = fromApi(await api.post<Record<string, unknown>>('/api/services', toApi(r)));
        setRecords(prev => [saved, ...prev]);
        toast.success('Service record added');
      } else {
        const saved = fromApi(await api.put<Record<string, unknown>>(`/api/services/${r.id}`, toApi(r)));
        setRecords(prev => prev.map(x => x.id === saved.id ? saved : x));
        toast.success('Record updated');
      }
    } catch (e) { toast.error(`Save failed: ${e}`); }
    setFormOpen(false); setEditRecord(null);
  }

  function handleUpdate(r: ServiceRecord) {
    setRecords(prev => prev.map(x => x.id === r.id ? r : x));
    if (syncTimers.current[r.id]) clearTimeout(syncTimers.current[r.id]);
    syncTimers.current[r.id] = setTimeout(async () => {
      try {
        await api.put(`/api/services/${r.id}`, toApi(r));
      } catch { toast.error('Auto-save failed — your changes may not be synced'); }
    }, 1200);
  }

  async function handleDelete() {
    if (!deleteId) return;
    try {
      await api.delete(`/api/services/${deleteId}`);
      setRecords(prev => prev.filter(r => r.id !== deleteId));
      toast.success('Record deleted');
    } catch { toast.error('Delete failed'); }
    setDeleteId(null);
  }

  async function handleBulkImport(rows: ServiceRecord[]) {
    let ok = 0;
    for (const row of rows) {
      try {
        const saved = fromApi(await api.post<Record<string, unknown>>('/api/services', toApi(row)));
        setRecords(prev => [saved, ...prev]); ok++;
      } catch { /* continue */ }
    }
    toast.success(`Imported ${ok} of ${rows.length} records`);
  }

  function handleOcrExtracted(partial: Partial<ServiceRecord>) {
    setEditRecord({ ...emptyRecord(), ...partial } as ServiceRecord);
    setFormOpen(true);
    toast.success('Document scanned — review and save the extracted data');
  }
  function openEdit(r: ServiceRecord) { setEditRecord(r); setFormOpen(true); setViewRecord(null); }

  const anyFilter = !!(search || dateFrom || dateTo || filterCat || filterStatus);
  const clearFilters = () => { setSearch(''); setDateFrom(''); setDateTo(''); setFilterCat(''); setFilterStatus(''); };

  return (
    <main className="max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <Toaster position="top-right" richColors />

      <PageHero
        icon={Wrench}
        accent="violet"
        crumbs={['Operations & Maintenance', 'Services']}
        title="Services Tracker"
        description="Track service completion, approval pipeline, suppliers and invoices"
        statsOpen={sections.expanded.hero}
        actions={
          <>
            <button type="button" onClick={() => setOcrOpen(true)} title="Scan a document to extract data"
              className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold text-white bg-gradient-to-br from-violet-500 to-violet-700 hover:brightness-110 transition-all">
              <Scan className="h-3.5 w-3.5" /> Scan
            </button>
            <button type="button" onClick={() => setImportOpen(true)} title="Import records from Excel"
              className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold ${t.textMuted} ${t.glassSoft} ${t.hoverText} transition-all`}>
              <FileSpreadsheet className="h-3.5 w-3.5" /> Import
            </button>
            <button type="button" onClick={() => { setEditRecord(null); setFormOpen(true); }}
              className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-[13px] font-semibold text-white bg-gradient-to-br from-brand-500 to-brand-700 hover:brightness-110 transition-all">
              <Plus className="h-3.5 w-3.5" /> New Service
            </button>
          </>
        }
      >
        <div className="flex flex-wrap gap-1">
          <StatTile icon={Wrench} color={ACCENT_HEX.blue} value={total} label="Total" />
          <StatTile icon={Loader2} color="#f59e0b" value={inProg} label="In Progress" />
          <StatTile icon={CheckCircle2} color="#34d399" value={completed} label="Completed" />
          <StatTile icon={Circle} color="#94a3b8" value={notStarted} label="Not Started" />
          <StatTile icon={Calendar} color={ACCENT_HEX.violet} value={monthCount} label="This Month" />
        </div>
      </PageHero>

      {apiError && (
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-rose-500/10 text-rose-400 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <div><p className="font-semibold">Backend not reachable</p><p className="text-xs opacity-80 mt-0.5">{apiError} — Make sure the backend is running.</p></div>
        </div>
      )}

      {/* Filters */}
      <div className={`${t.glass} rounded-2xl ${t.shadow} p-4 space-y-4`}>
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <SearchInput value={search} onChange={setSearch} placeholder="Search description, supplier, REQ, INV, GRV…" className="flex-1" />
          <div className="flex gap-2 flex-wrap items-center">
            <button type="button" onClick={() => setShowFilters(v => !v)}
              className={`flex items-center gap-1.5 h-8 px-3 rounded-lg text-[13px] font-medium transition-colors ${showFilters ? 'bg-brand-500/15 text-brand-400' : `${t.textMuted} ${t.glassSoft} ${t.hoverText}`}`}>
              <Filter className="h-3.5 w-3.5" /> Filters
            </button>
            {anyFilter && <button type="button" onClick={clearFilters} className={`flex items-center gap-1.5 h-8 px-3 rounded-lg text-[13px] font-medium ${t.textFaint} ${t.hoverText} ${t.hoverBg}`}><X className="h-3.5 w-3.5" /> Clear</button>}
            <ViewToggle value={viewMode} onChange={setViewMode} options={[{ value: 'grid', icon: LayoutGrid, label: 'Grid view' }, { value: 'table', icon: Table2, label: 'Table view' }]} />
          </div>
        </div>
        {showFilters && (
          <div className={`pt-4 border-t ${t.border} grid grid-cols-2 sm:grid-cols-4 gap-3`}>
            <FormField label="Date from"><input type="date" title="Date from" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className={`w-full h-8 px-2 rounded text-[13px] ${t.inputBg} focus:outline-none`} /></FormField>
            <FormField label="Date to"><input type="date" title="Date to" value={dateTo} onChange={e => setDateTo(e.target.value)} className={`w-full h-8 px-2 rounded text-[13px] ${t.inputBg} focus:outline-none`} /></FormField>
            <FormField label="Category">
              <SelectField size="filter" title="Category" value={filterCat} onChange={setFilterCat}
                options={[{ value: '', label: 'All categories' }, ...CATS.map(c => ({ value: c, label: c }))]} />
            </FormField>
            <FormField label="Pipeline status">
              <SelectField size="filter" title="Pipeline status" value={filterStatus} onChange={setFilterStatus}
                options={[{ value: '', label: 'All statuses' }, { value: 'not_started', label: 'Not Started' }, { value: 'in_progress', label: 'In Progress' }, { value: 'completed', label: 'Completed' }]} />
            </FormField>
          </div>
        )}
      </div>

      {/* Records */}
      <div className="space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <p className={`text-sm ${t.textFaint}`}>Showing <span className={`font-semibold ${t.textPrimary}`}>{processed.length}</span> of {total}</p>
          <div className="flex items-center gap-2">
            <SelectField size="filter" title="Sort by" value={sortBy} onChange={setSortBy}
              options={[
                { value: 'newest', label: 'Newest first' },
                { value: 'oldest', label: 'Oldest first' },
                { value: 'date_desc', label: 'Date ↓' },
                { value: 'date_asc', label: 'Date ↑' },
                { value: 'supplier', label: 'Supplier A–Z' },
                { value: 'progress_desc', label: 'Most progress' },
              ]} />
            {viewMode === 'grid' && processed.length > 0 && (
              <button type="button" onClick={allExpanded ? collapseAll : expandAll} title={allExpanded ? 'Collapse all' : 'Expand all'}
                className={`h-8 px-2 text-xs flex items-center gap-1 rounded-lg ${t.glassSoft} ${t.textFaint} ${t.hoverText}`}>
                {allExpanded ? <><ChevronsUp className="h-3 w-3" /> Collapse all</> : <><ChevronsDown className="h-3 w-3" /> Expand all</>}
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className={`${t.glass} rounded-2xl p-16 text-center flex items-center justify-center gap-2 ${t.textFaint}`}><Loader2 className="h-5 w-5 animate-spin" /> Loading services…</div>
        ) : processed.length === 0 ? (
          <div className={`${t.glass} rounded-2xl p-12 text-center`}>
            <Wrench className={`h-12 w-12 ${t.textFaint} mx-auto mb-4`} />
            <h3 className={`text-lg font-semibold ${t.textPrimary} mb-2`}>{anyFilter ? 'No records match your filters' : 'No service records yet'}</h3>
            <p className={`text-sm mb-4 ${t.textFaint}`}>{anyFilter ? 'Adjust your search or clear the filters.' : 'Click "New Service" to log the first record, or import from Excel.'}</p>
            {!anyFilter && (
              <button type="button" onClick={() => { setEditRecord(null); setFormOpen(true); }} className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg text-[13px] font-semibold text-white bg-gradient-to-br from-brand-500 to-brand-700 hover:brightness-110">
                <Plus className="h-3.5 w-3.5" /> Add Service
              </button>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
            {processed.map(r => (
              <ServiceCard key={r.id} record={r} expanded={expandedIds.has(r.id)} onToggle={() => toggleCard(r.id)} onUpdate={handleUpdate} onEdit={openEdit} onDelete={setDeleteId} />
            ))}
          </div>
        ) : (
          <ListView records={processed} onEdit={openEdit} onDelete={setDeleteId} onView={r => setViewRecord(r)} />
        )}
      </div>

      {/* Pipeline legend */}
      <div className={`${t.glass} rounded-2xl ${t.shadow} p-5`}>
        <h3 className={`text-sm font-semibold mb-1 ${t.textPrimary}`}>Approval Pipeline — Stage Order</h3>
        <p className={`text-[11px] mb-3 ${t.textFaint}`}>Records progress through these stages in order. Each stage must be signed off before payment is processed.</p>
        <div className="flex flex-wrap gap-2">
          {STAGES.map((s, i) => (
            <div key={s.key} className={`flex items-center gap-2 px-3 py-2 rounded-xl ${t.chipBg}`}>
              <span className={`text-[11px] font-semibold ${t.textFaint}`}>{i + 1}.</span>
              <s.icon className="h-3.5 w-3.5 text-brand-400" />
              <span className={`text-xs ${t.textMuted}`}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Add / Edit form */}
      <CenterModal open={formOpen} onClose={() => { setFormOpen(false); setEditRecord(null); }} title={editRecord?.description ? 'Edit Service Record' : 'New Service Record'} accent="violet" width="max-w-2xl">
        <div className="p-5">
          <ServiceForm initial={editRecord ?? emptyRecord()} onSave={handleSave} onClose={() => { setFormOpen(false); setEditRecord(null); }} />
        </div>
      </CenterModal>

      {/* View / pipeline modal */}
      <CenterModal open={viewRecord !== null} onClose={() => setViewRecord(null)} title={viewRecord?.description ?? 'Service Record'} accent="violet" width="max-w-2xl">
        {viewRecord && (
          <div className="p-5 space-y-3">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              {(() => { const d = stagesDone(viewRecord);
                const info = d === 6 ? { color: '#34d399', label: 'Completed' } : d === 0 ? { color: '#94a3b8', label: 'Not Started' } : { color: '#f59e0b', label: `Stage ${d + 1} of 6` };
                return <StatusBadge color={info.color} label={info.label} dot />;
              })()}
              {viewRecord.category && <StatusBadge color={ACCENT_HEX.blue} label={viewRecord.category} />}
              {viewRecord.amount && <span className="text-sm font-semibold text-brand-400">{viewRecord.amount}</span>}
            </div>
            <div className={`flex gap-1 ${t.glassSoft} rounded-lg p-1 w-fit`}>
              {(['pipeline', 'attachments'] as const).map(k => (
                <button key={k} type="button" onClick={() => setViewTab(k)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors ${viewTab === k ? 'bg-brand-500/20 text-brand-400' : `${t.textFaint} ${t.hoverText}`}`}>{k}</button>
              ))}
            </div>
            {viewTab === 'pipeline' ? (
              <div className="space-y-2">
                {STAGES.map(s => <StageRow key={s.key} stage={s} record={viewRecord} onUpdate={r => { handleUpdate(r); setViewRecord(r); }} />)}
              </div>
            ) : <AttachmentPanel serviceId={viewRecord.id} />}
            <div className={`flex justify-end gap-2 pt-2 border-t ${t.border}`}>
              <button type="button" onClick={() => openEdit(viewRecord)} className={`h-9 px-4 rounded-xl text-sm ${t.textMuted} ${t.glassSoft} ${t.hoverText} inline-flex items-center gap-1.5`}><Edit2 className="h-3.5 w-3.5" /> Edit Info</button>
            </div>
          </div>
        )}
      </CenterModal>

      {/* Import */}
      <CenterModal open={importOpen} onClose={() => setImportOpen(false)} title="Import Records" accent="violet" width="max-w-2xl">
        <div className="p-5"><ExcelImportModal onImport={handleBulkImport} onExtracted={handleOcrExtracted} onClose={() => setImportOpen(false)} /></div>
      </CenterModal>

      {/* OCR scan */}
      <CenterModal open={ocrOpen} onClose={() => setOcrOpen(false)} title="Scan Document — Extract Data" accent="violet" width="max-w-lg">
        <div className="p-5"><OcrUploadModal onExtracted={handleOcrExtracted} onClose={() => setOcrOpen(false)} /></div>
      </CenterModal>

      {/* Delete confirm */}
      <CenterModal open={deleteId !== null} onClose={() => setDeleteId(null)} title="Delete Service Record" accent="amber" width="max-w-sm">
        <div className="p-5 space-y-4">
          <p className={`text-sm ${t.textMuted}`}>This service record and all its pipeline data will be permanently deleted.</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setDeleteId(null)} className={`flex-1 py-2.5 rounded-xl text-sm ${t.textMuted} ${t.hoverText} border ${t.border}`}>Cancel</button>
            <button type="button" onClick={handleDelete} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-br from-rose-500 to-rose-700 hover:brightness-110 inline-flex items-center justify-center gap-2"><Trash2 className="h-4 w-4" /> Delete</button>
          </div>
        </div>
      </CenterModal>
    </main>
  );
}

export default function ServicesPage() {
  return (
    <AppShell>
      <ServicesPageContent />
    </AppShell>
  );
}
