// app/services/page.tsx — Services Tracker with backend, pipeline, attachments & OCR
'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Wrench, ClipboardList, DollarSign, Package, CheckCheck, Tag,
  Building2, Hash, Calendar, MessageSquare, Phone,
  Trash2, Edit2, ChevronDown, ChevronUp, CheckCircle2, Circle,
  Filter, ArrowRight, Paperclip, Upload, X, FileDown, Download,
  ChevronsDown, ChevronsUp, Table2, LayoutGrid, FileSpreadsheet,
  Eye, AlertCircle, Loader2,
} from 'lucide-react';
import { PageShell } from '@/components/PageShell';
import {
  HeroPanel, GlassPanel, GlassModal, GlassInput, GlassSelect, GlassTextarea,
  GlassBadge, GlassProgress, GlassTable, EmptyState, DeleteDialog,
  DownloadButton, RecordsPanelHeader, GlassTabs,
  PRIMARY_BTN, SECONDARY_BTN, fmtDate,
  type DLColumn, type StatItem, type GlassColumn,
} from '@/components/shared';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';

// ─── API ──────────────────────────────────────────────────────────────────────

const API = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000').replace(/\/$/, '');

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
  if (n < 1024)       return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

// ─── Stage Row ────────────────────────────────────────────────────────────────

interface StageRowProps {
  stage: typeof STAGES[number];
  record: ServiceRecord;
  onUpdate: (r: ServiceRecord) => void;
}

function StageRow({ stage, record, onUpdate }: StageRowProps) {
  const [open, setOpen] = useState(false);
  const isPay   = stage.key === 'payment';
  const isStores = stage.key === 'stores';
  const done = isStageDone(record, stage.key);
  const Icon = stage.icon;

  const data = isPay ? null
    : record[stage.key as keyof Pick<ServiceRecord, 'planning'|'engineering_manager'|'finance'|'gm'|'stores'>] as StageData | StoresStage;

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
    <div className={`rounded-xl border overflow-hidden transition-all ${done ? 'border-[#86BBD8]/25 bg-[#86BBD8]/[0.07]' : 'border-white/[0.08] bg-white/[0.03]'}`}>
      <div className="flex items-center gap-3 px-4 py-2.5">
        <button type="button" onClick={toggle} title={done ? `Unmark ${stage.label}` : `Mark ${stage.label} as complete`} className="shrink-0 transition-transform hover:scale-110">
          {done ? <CheckCircle2 className="h-5 w-5 text-[#86BBD8]" /> : <Circle className="h-5 w-5 text-white/20" />}
        </button>
        <div className="p-1.5 rounded-md bg-white/[0.06] border border-white/[0.10] shrink-0">
          <Icon className="h-3.5 w-3.5 text-[#86BBD8]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium ${done ? 'text-white' : 'text-white/55'}`}>{stage.label}</p>
          {done && summary && <p className="text-[11px] text-white/40 mt-0.5 truncate">{summary}</p>}
          {!done && <p className="text-[11px] text-white/25 mt-0.5">Tap the circle when this stage is complete</p>}
        </div>
        <button type="button" onClick={() => setOpen(o => !o)} title={open ? 'Hide details' : 'Show details'}
          className="h-7 w-7 flex items-center justify-center rounded-lg bg-white/[0.07] hover:bg-white/[0.13] text-white/35 border border-white/[0.09] transition-all shrink-0">
          {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
      </div>
      {open && (
        <div className="px-4 pb-4 pt-2 space-y-3 border-t border-white/[0.07]">
          {isPay ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <GlassInput label="Paid by" placeholder="Name of person who made payment" value={record.payment.paid_by} onChange={e => setPay('paid_by', e.target.value)} />
                <GlassInput label="Date of payment" type="date" value={record.payment.payment_date} onChange={e => setPay('payment_date', e.target.value)} />
              </div>
              <GlassInput label="Payment reference / transaction number" placeholder="e.g. EFT-2024-001 or cheque number" value={record.payment.payment_reference} onChange={e => setPay('payment_reference', e.target.value)} />
              <GlassTextarea label="Payment comments" rows={2} placeholder="Any notes about this payment…" value={record.payment.comments} onChange={e => setPay('comments', e.target.value)} />
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <GlassInput label="Signed / approved by" placeholder="Full name of approver" value={(data as StageData).signed_by} onChange={e => setData('signed_by', e.target.value)} />
                <GlassInput label="Date signed" type="date" value={(data as StageData).signed_date} onChange={e => setData('signed_date', e.target.value)} />
              </div>
              {isStores && (
                <GlassInput label="GRV Number (Goods Received Voucher)" placeholder="e.g. GRV-2024-001  —  issued by Stores on receipt" value={(data as StoresStage).grv_number} onChange={e => setData('grv_number', e.target.value)} />
              )}
              <GlassTextarea label="Comments for this stage" rows={2} placeholder="e.g. Document handed to [name], awaiting countersignature…" value={(data as StageData).comments} onChange={e => setData('comments', e.target.value)} />
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Attachment Panel ─────────────────────────────────────────────────────────

function AttachmentPanel({ serviceId }: { serviceId: string }) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading]   = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch(`${API}/api/services/${serviceId}/attachments`)
      .then(r => r.json())
      .then(data => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setAttachments(Array.isArray(data) ? data : []);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLoading(false);
      })
      .catch(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLoading(false);
      });
  }, [serviceId]);

  async function upload(file: File) {
    setUploading(true);
    try {
      const fd = new FormData(); fd.append('file', file);
      const r = await fetch(`${API}/api/services/${serviceId}/attachments`, { method: 'POST', body: fd });
      if (!r.ok) throw new Error(await r.text());
      const att: Attachment = await r.json();
      setAttachments(prev => [att, ...prev]);
      toast.success('File attached');
    } catch (e) {
      toast.error(`Upload failed: ${e}`);
    } finally {
      setUploading(false);
    }
  }

  async function remove() {
    if (!deleteId) return;
    try {
      await fetch(`${API}/api/services/${serviceId}/attachments/${deleteId}`, { method: 'DELETE' });
      setAttachments(prev => prev.filter(a => a.id !== deleteId));
      toast.success('Attachment removed');
    } catch { toast.error('Delete failed'); }
    finally { setDeleteId(null); }
  }

  if (loading) return <div className="py-6 text-center text-white/30 text-xs flex items-center justify-center gap-2"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…</div>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-white/60 font-medium">Scanned hard copies &amp; supporting documents</p>
          <p className="text-[11px] text-white/30 mt-0.5">Upload completion certificates, invoices, GRVs, or any other documents for this service.</p>
        </div>
        <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading}
          className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold text-white border transition-all hover:-translate-y-0.5 bg-[#2A4D69]/60 border-[#86BBD8]/25 hover:bg-[#2A4D69]/90 disabled:opacity-50">
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          {uploading ? 'Uploading…' : 'Attach file'}
        </button>
        <input ref={inputRef} type="file" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ''; }} />
      </div>

      {attachments.length === 0 ? (
        <div className="py-6 text-center border border-dashed border-white/10 rounded-xl">
          <Paperclip className="h-6 w-6 text-white/15 mx-auto mb-2" />
          <p className="text-xs text-white/30">No attachments yet</p>
          <p className="text-[11px] text-white/20 mt-0.5">Click "Attach file" to upload a scanned document</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {attachments.map(a => (
            <div key={a.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.07] group">
              <Paperclip className="h-3.5 w-3.5 text-[#86BBD8]/60 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-white/80 font-medium truncate">{a.filename}</p>
                <p className="text-[11px] text-white/30">{fmtBytes(a.file_size)} · {fmtDate(a.created_at)}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                {a.file_url && (
                  <a href={a.file_url} target="_blank" rel="noopener noreferrer" title="Download"
                    className="h-6 w-6 flex items-center justify-center rounded-md bg-white/[0.07] hover:bg-[#86BBD8]/20 text-white/40 hover:text-[#86BBD8] transition-all">
                    <Download className="h-3 w-3" />
                  </a>
                )}
                <button type="button" onClick={() => setDeleteId(a.id)} title="Remove attachment"
                  className="h-6 w-6 flex items-center justify-center rounded-md bg-white/[0.07] hover:bg-red-500/15 text-white/40 hover:text-red-400 transition-all">
                  <X className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <DeleteDialog open={deleteId !== null} onClose={() => setDeleteId(null)} onDelete={remove}
        title="Remove Attachment" description="This file will be permanently deleted." confirmLabel="Remove" />
    </div>
  );
}

// ─── Service Card ──────────────────────────────────────────────────────────────

interface CardProps {
  record: ServiceRecord;
  expanded: boolean;
  onToggle: () => void;
  onUpdate: (r: ServiceRecord) => void;
  onEdit: (r: ServiceRecord) => void;
  onDelete: (id: string) => void;
}

function ServiceCard({ record, expanded, onToggle, onUpdate, onEdit, onDelete }: CardProps) {
  const done = stagesDone(record);
  const statusInfo =
    done === 6 ? { v: 'success' as const, label: 'Completed' } :
    done === 0 ? { v: 'neutral' as const, label: 'Not Started' } :
                 { v: 'warning' as const, label: `Stage ${done + 1} of 6` };

  const pipelineContent = (
    <div className="space-y-2">
      <p className="text-[11px] text-white/35 mb-3">Tap the circle on each stage to mark it complete, then expand to record details.</p>
      {STAGES.map(s => <StageRow key={s.key} stage={s} record={record} onUpdate={onUpdate} />)}
      {record.general_comments && (
        <div className="mt-1 p-3 rounded-xl bg-white/[0.04] border border-white/[0.06]">
          <p className="text-[11px] text-white/40 uppercase tracking-wider mb-1">General Comments</p>
          <p className="text-xs text-white/65">{record.general_comments}</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="oz-glass-panel rounded-2xl overflow-hidden flex flex-col">
      {/* Card header */}
      <div className="px-4 sm:px-5 pt-4 pb-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <GlassBadge variant={statusInfo.v} size="sm">{statusInfo.label}</GlassBadge>
            {record.category && <GlassBadge variant="info" size="sm">{record.category}</GlassBadge>}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button type="button" onClick={() => onEdit(record)} title="Edit record"
              className="h-7 w-7 flex items-center justify-center rounded-lg bg-white/[0.07] border border-white/[0.09] text-white/35 hover:text-white/80 hover:bg-white/[0.13] transition-all">
              <Edit2 className="h-3.5 w-3.5" />
            </button>
            <button type="button" onClick={() => onDelete(record.id)} title="Delete record"
              className="h-7 w-7 flex items-center justify-center rounded-lg bg-white/[0.07] border border-white/[0.09] text-white/35 hover:text-red-400 hover:bg-red-500/[0.12] transition-all">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <h3 className="text-sm font-semibold text-white leading-snug mb-1.5">{record.description || '—'}</h3>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {record.supplier     && <span className="flex items-center gap-1 text-xs text-white/50"><Building2  className="h-3 w-3 shrink-0" />{record.supplier}</span>}
          {record.contact_person && <span className="flex items-center gap-1 text-xs text-white/40"><Phone      className="h-3 w-3 shrink-0" />{record.contact_person}</span>}
          {record.date         && <span className="flex items-center gap-1 text-xs text-white/40"><Calendar   className="h-3 w-3 shrink-0" />{fmtDate(record.date)}</span>}
          {record.amount       && <span className="text-xs font-semibold text-[#86BBD8] ml-auto">{record.amount}</span>}
        </div>

        {(record.requisition_number || record.invoice_number || record.order_number) && (
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
            {record.requisition_number && <span className="text-[11px] text-white/35 flex items-center gap-1"><Hash className="h-2.5 w-2.5" />REQ: {record.requisition_number}</span>}
            {record.invoice_number     && <span className="text-[11px] text-white/35 flex items-center gap-1"><Hash className="h-2.5 w-2.5" />INV: {record.invoice_number}</span>}
            {record.order_number       && <span className="text-[11px] text-white/35 flex items-center gap-1"><Hash className="h-2.5 w-2.5" />PO: {record.order_number}</span>}
          </div>
        )}

        {/* Progress */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-[11px] mb-1.5">
            <span className="text-white/35">Approval pipeline</span>
            <span className="text-white/50 font-medium">{done}/6 stages</span>
          </div>
          <GlassProgress value={done} max={6} size="sm" colorClass={done === 6 ? 'bg-emerald-400' : done > 0 ? 'bg-[#86BBD8]' : undefined} />
          <div className="flex items-center gap-1 mt-2">
            {STAGES.map(s => (
              <div key={s.key} className="flex-1 text-center">
                <div className={`mx-auto h-2 w-2 rounded-full transition-all ${isStageDone(record, s.key) ? 'bg-[#86BBD8]' : 'bg-white/12'}`} title={s.label} />
                <span className="hidden sm:block text-[9px] text-white/25 mt-0.5 truncate">{s.short}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Expand toggle */}
      <div className="border-t border-white/[0.07]">
        <button type="button" onClick={onToggle}
          className="w-full flex items-center justify-between px-4 sm:px-5 py-2.5 text-xs text-white/45 hover:text-white/75 hover:bg-white/[0.04] transition-all">
          <span className="font-medium">{expanded ? 'Collapse' : 'Pipeline & Attachments'}</span>
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>

        {expanded && (
          <div className="px-4 sm:px-5 pb-5 pt-1 border-t border-white/[0.05]">
            <GlassTabs
              variant="pills"
              tabs={[
                { key: 'pipeline',    label: 'Pipeline',    icon: ClipboardList, content: pipelineContent },
                { key: 'attachments', label: 'Attachments', icon: Paperclip,     content: <AttachmentPanel serviceId={record.id} /> },
              ]}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── List View ─────────────────────────────────────────────────────────────────

interface ListViewProps {
  records: ServiceRecord[];
  onEdit: (r: ServiceRecord) => void;
  onDelete: (id: string) => void;
  onView: (r: ServiceRecord) => void;
}

function ListView({ records, onEdit, onDelete, onView }: ListViewProps) {
  const columns: GlassColumn<ServiceRecord>[] = [
    { key: 'date',        header: 'Date',        width: '100px', render: r => <span className="text-white/70 text-xs">{fmtDate(r.date)}</span> },
    { key: 'description', header: 'Description', render: r => (
        <div className="min-w-0">
          <p className="text-sm text-white/90 font-medium truncate">{r.description || '—'}</p>
          {r.supplier && <p className="text-[11px] text-white/40 truncate flex items-center gap-1"><Building2 className="h-2.5 w-2.5 shrink-0" />{r.supplier}</p>}
        </div>
      )},
    { key: 'requisition_number', header: 'REQ #',   width: '110px', render: r => <span className="text-xs text-white/50">{r.requisition_number || '—'}</span> },
    { key: 'amount',      header: 'Amount',      width: '110px', align: 'right', render: r => <span className="text-xs font-semibold text-[#86BBD8]">{r.amount || '—'}</span> },
    { key: 'pipeline',    header: 'Pipeline',    width: '130px', align: 'center', render: r => {
        const d = stagesDone(r);
        return (
          <div className="flex items-center gap-2">
            <GlassProgress value={d} max={6} size="xs" colorClass={d === 6 ? 'bg-emerald-400' : d > 0 ? 'bg-[#86BBD8]' : undefined} className="flex-1" />
            <span className="text-[11px] text-white/40 shrink-0">{d}/6</span>
          </div>
        );
      }},
    { key: 'category', header: 'Category', width: '120px', render: r => r.category ? <GlassBadge variant="info" size="sm">{r.category}</GlassBadge> : <span className="text-white/25 text-xs">—</span> },
    { key: 'actions', header: '', width: '90px', align: 'right', render: r => (
        <div className="flex items-center justify-end gap-1">
          <button type="button" onClick={e => { e.stopPropagation(); onView(r); }} title="View pipeline"
            className="h-6 w-6 flex items-center justify-center rounded-md text-white/35 hover:text-[#86BBD8] hover:bg-[#86BBD8]/10 transition-all">
            <Eye className="h-3 w-3" />
          </button>
          <button type="button" onClick={e => { e.stopPropagation(); onEdit(r); }} title="Edit"
            className="h-6 w-6 flex items-center justify-center rounded-md text-white/35 hover:text-white/80 hover:bg-white/[0.10] transition-all">
            <Edit2 className="h-3 w-3" />
          </button>
          <button type="button" onClick={e => { e.stopPropagation(); onDelete(r.id); }} title="Delete"
            className="h-6 w-6 flex items-center justify-center rounded-md text-white/35 hover:text-red-400 hover:bg-red-500/10 transition-all">
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      )},
  ];

  return (
    <GlassTable
      columns={columns}
      data={records}
      keyField="id"
      onRowClick={onView}
      emptyMessage="No service records found."
      stickyHeader
      maxHeight="560px"
    />
  );
}

// ─── Service Form ──────────────────────────────────────────────────────────────

interface FormProps { initial: ServiceRecord; onSave: (r: ServiceRecord) => void; onClose: () => void; }

function ServiceForm({ initial, onSave, onClose }: FormProps) {
  const [form, setForm] = useState(initial);
  const set = (f: keyof ServiceRecord) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [f]: e.target.value }));
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <GlassInput label="Date of service" type="date" value={form.date} onChange={set('date')} />
          <p className="text-[11px] text-white/30 mt-1">When was the service completed?</p>
        </div>
        <div>
          <GlassSelect label="Category" value={form.category} onChange={set('category')}
            options={[{ value: '', label: 'Select a category…' }, ...CATS.map(c => ({ value: c, label: c }))]} />
          <p className="text-[11px] text-white/30 mt-1">Type of service performed</p>
        </div>
      </div>
      <div>
        <GlassTextarea label="Description of service *" placeholder="Describe what service was performed — be specific, e.g. 'Replaced hydraulic pump on Compressor #3'" rows={3} value={form.description} onChange={set('description')} />
        <p className="text-[11px] text-white/30 mt-1">Required. This appears as the record title on the tracker.</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <GlassInput label="Supplier / Contractor" placeholder="Company name" value={form.supplier} onChange={set('supplier')} icon={Building2} />
          <p className="text-[11px] text-white/30 mt-1">Who performed or supplied the service?</p>
        </div>
        <div>
          <GlassInput label="Contact person" placeholder="Representative's name" value={form.contact_person} onChange={set('contact_person')} icon={Phone} />
          <p className="text-[11px] text-white/30 mt-1">Person to contact at the supplier</p>
        </div>
      </div>
      <div className="p-3 rounded-xl bg-white/[0.04] border border-white/[0.07] space-y-3">
        <p className="text-[11px] text-white/50 font-semibold uppercase tracking-wider">Reference Numbers</p>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <GlassInput label="Requisition No." placeholder="REQ-..." icon={Hash} value={form.requisition_number} onChange={set('requisition_number')} />
            <p className="text-[10px] text-white/25 mt-1">Purchase requisition</p>
          </div>
          <div>
            <GlassInput label="Invoice No." placeholder="INV-..." icon={Hash} value={form.invoice_number} onChange={set('invoice_number')} />
            <p className="text-[10px] text-white/25 mt-1">Supplier's invoice</p>
          </div>
          <div>
            <GlassInput label="Order / PO No." placeholder="PO-..." icon={Hash} value={form.order_number} onChange={set('order_number')} />
            <p className="text-[10px] text-white/25 mt-1">Purchase order</p>
          </div>
        </div>
      </div>
      <div>
        <GlassInput label="Total amount" placeholder="e.g. $1,500.00 or ZAR 18,500" value={form.amount} onChange={set('amount')} />
        <p className="text-[11px] text-white/30 mt-1">Include currency symbol. This is for reference only — finance will confirm the figure.</p>
      </div>
      <div>
        <GlassTextarea label="General comments / notes" placeholder="Any additional context — e.g. scope changes, verbal agreements, reference to email thread…" rows={2} value={form.general_comments} onChange={set('general_comments')} />
      </div>
      <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.07]">
        <button type="button" onClick={onClose} className={SECONDARY_BTN}>Cancel</button>
        <button type="button" onClick={() => onSave(form)} disabled={!form.description.trim()} className={PRIMARY_BTN}>
          {initial.description ? 'Save Changes' : 'Add Service Record'}
        </button>
      </div>
    </div>
  );
}

// ─── Excel Import Modal ────────────────────────────────────────────────────────

const EXCEL_MAP: Record<string, keyof ServiceRecord> = {
  date:'date', 'service date':'date',
  description:'description', service:'description', 'service description':'description',
  supplier:'supplier', contractor:'supplier', vendor:'supplier',
  contact:'contact_person', 'contact person':'contact_person',
  req:'requisition_number', requisition:'requisition_number', 'req #':'requisition_number', 'req no':'requisition_number',
  inv:'invoice_number', invoice:'invoice_number', 'inv #':'invoice_number', 'invoice no':'invoice_number',
  po:'order_number', order:'order_number', 'purchase order':'order_number', 'po #':'order_number',
  amount:'amount', cost:'amount', price:'amount', value:'amount', total:'amount',
  category:'category', type:'category',
  comments:'general_comments', comment:'general_comments', notes:'general_comments', note:'general_comments', remarks:'general_comments',
};

const SPREADSHEET_EXTS = new Set(['.xlsx', '.xls', '.csv']);
const DOC_EXTS         = new Set(['.pdf', '.jpg', '.jpeg', '.png', '.webp', '.tiff', '.tif', '.bmp']);

function fileMode(file: File): 'spreadsheet' | 'document' {
  const ext = '.' + (file.name.split('.').pop() ?? '').toLowerCase();
  if (SPREADSHEET_EXTS.has(ext)) return 'spreadsheet';
  return 'document';
}

interface ImportModalProps {
  onImport: (rows: ServiceRecord[]) => Promise<void>;
  onExtracted: (partial: Partial<ServiceRecord>) => void;
  onClose: () => void;
}

function ExcelImportModal({ onImport, onExtracted, onClose }: ImportModalProps) {
  const [rows, setRows]         = useState<ServiceRecord[]>([]);
  const [preview, setPreview]   = useState<string[][]>([]);
  const [headers, setHeaders]   = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [scanning, setScanning]  = useState(false);
  const [scanError, setScanError] = useState('');

  async function handleFile(file: File) {
    setScanError('');
    if (fileMode(file) === 'document') {
      // PDF / image → OCR extraction
      setScanning(true);
      try {
        const fd = new FormData(); fd.append('file', file);
        const r  = await fetch(`${API}/api/services/ocr`, { method: 'POST', body: fd });
        if (!r.ok) { const e = await r.json(); throw new Error(e.detail || 'Extraction failed'); }
        const data = await r.json();
        const partial: Partial<ServiceRecord> = {
          date: data.date ?? '', description: data.description ?? '',
          supplier: data.supplier ?? '', contact_person: data.contact_person ?? '',
          requisition_number: data.requisition_number ?? '', invoice_number: data.invoice_number ?? '',
          order_number: data.order_number ?? '', amount: data.amount ?? '',
          category: data.category ?? '', general_comments: data.general_comments ?? '',
        };
        if (data.grv_number)        partial.stores  = { signed: false, signed_by: '', signed_date: '', comments: '', grv_number: data.grv_number };
        if (data.payment_reference) partial.payment = { done: false, paid_by: '', payment_date: '', payment_reference: data.payment_reference, comments: '' };
        onExtracted(partial);
        onClose();
      } catch (e: unknown) {
        setScanError(e instanceof Error ? e.message : 'Extraction failed — try a clearer scan.');
      } finally {
        setScanning(false);
      }
      return;
    }

    // Spreadsheet → bulk rows
    const XLSX = await import('xlsx');
    const buf  = await file.arrayBuffer();
    const wb   = XLSX.read(buf, { type: 'array' });
    const ws   = wb.Sheets[wb.SheetNames[0]];
    const raw  = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' });
    if (!raw.length) { toast.error('No data found in the file'); return; }

    const hdrs = Object.keys(raw[0]);
    setHeaders(hdrs);
    setPreview(raw.slice(0, 5).map(r => hdrs.map(h => String(r[h] ?? ''))));
    const mapped = raw.map(row => {
      const rec = emptyRecord();
      Object.entries(row).forEach(([col, val]) => {
        const field = EXCEL_MAP[col.toLowerCase().trim()];
        if (field) (rec as unknown as Record<string, unknown>)[field] = String(val ?? '').trim();
      });
      return rec;
    });
    setRows(mapped);
  }

  async function doImport() {
    setImporting(true);
    try { await onImport(rows); onClose(); }
    finally { setImporting(false); }
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-xl bg-[#86BBD8]/[0.07] border border-[#86BBD8]/20">
          <p className="text-xs text-white/70 font-semibold mb-1 flex items-center gap-1.5"><FileSpreadsheet className="h-3.5 w-3.5" /> Spreadsheet</p>
          <p className="text-[11px] text-white/45 leading-relaxed">Excel (.xlsx, .xls) or CSV with headers: Date, Description, Supplier, Contact, REQ #, INV #, PO #, Amount, Category, Comments.</p>
        </div>
        <div className="p-3 rounded-xl bg-violet-500/[0.07] border border-violet-500/20">
          <p className="text-xs text-white/70 font-semibold mb-1 flex items-center gap-1.5"><Eye className="h-3.5 w-3.5" /> Document / Scan</p>
          <p className="text-[11px] text-white/45 leading-relaxed">PDF, JPEG, PNG, TIFF, WEBP — OCR will read the text and pre-fill the form for you to review.</p>
        </div>
      </div>

      <div className="border-2 border-dashed border-white/15 rounded-xl p-6 text-center hover:border-[#86BBD8]/40 transition-colors">
        {scanning ? (
          <div className="space-y-2">
            <Loader2 className="h-8 w-8 text-[#86BBD8] mx-auto animate-spin" />
            <p className="text-sm text-white/60">Reading document…</p>
          </div>
        ) : (
          <>
            <Upload className="h-8 w-8 text-white/20 mx-auto mb-2" />
            <p className="text-sm text-white/60 mb-1">Choose a spreadsheet, PDF, or image</p>
            <p className="text-[11px] text-white/35 mb-3">.xlsx · .xls · .csv · .pdf · .jpg · .png · .tiff · .webp</p>
            <label className={`cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white ${PRIMARY_BTN}`}>
              <Upload className="h-4 w-4" /> Browse file
              <input type="file" accept=".xlsx,.xls,.csv,.pdf,.jpg,.jpeg,.png,.webp,.tiff,.tif,.bmp" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.currentTarget.value = ''; }} />
            </label>
          </>
        )}
      </div>

      {scanError && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" /> {scanError}
        </div>
      )}

      {preview.length > 0 && (
        <div>
          <p className="text-xs text-white/60 font-semibold mb-2">Preview — first {preview.length} rows ({rows.length} total will be imported)</p>
          <div className="overflow-x-auto rounded-xl border border-white/[0.09] bg-white/[0.03]">
            <table className="w-full text-xs">
              <thead><tr className="border-b border-white/[0.07]">{headers.map(h => <th key={h} className="px-3 py-2 text-left text-white/40 font-semibold whitespace-nowrap">{h}</th>)}</tr></thead>
              <tbody>{preview.map((row, i) => <tr key={i} className="border-b border-white/[0.04]">{row.map((cell, j) => <td key={j} className="px-3 py-2 text-white/70 whitespace-nowrap max-w-[160px] truncate">{cell}</td>)}</tr>)}</tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.07]">
        <button type="button" onClick={onClose} className={SECONDARY_BTN}>Cancel</button>
        <button type="button" onClick={doImport} disabled={rows.length === 0 || importing} className={PRIMARY_BTN}>
          {importing ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Importing…</> : <><FileDown className="h-3.5 w-3.5" /> Import {rows.length > 0 ? `${rows.length} records` : ''}</>}
        </button>
      </div>
    </div>
  );
}

// ─── OCR Upload Modal ──────────────────────────────────────────────────────────

function OcrUploadModal({ onExtracted, onClose }: { onExtracted: (partial: Partial<ServiceRecord>) => void; onClose: () => void; }) {
  const [scanning, setScanning] = useState(false);
  const [error, setError]       = useState('');

  async function handleFile(file: File) {
    setScanning(true); setError('');
    try {
      const fd = new FormData(); fd.append('file', file);
      const r  = await fetch(`${API}/api/services/ocr`, { method: 'POST', body: fd });
      if (!r.ok) { const e = await r.json(); throw new Error(e.detail || 'Extraction failed'); }
      const data = await r.json();
      // Map extracted data to partial record
      const partial: Partial<ServiceRecord> = {
        date:                data.date                 ?? '',
        description:         data.description          ?? '',
        supplier:            data.supplier             ?? '',
        contact_person:      data.contact_person       ?? '',
        requisition_number:  data.requisition_number   ?? '',
        invoice_number:      data.invoice_number       ?? '',
        order_number:        data.order_number         ?? '',
        amount:              data.amount               ?? '',
        category:            data.category             ?? '',
        general_comments:    data.general_comments     ?? '',
      };
      if (data.grv_number) {
        partial.stores = { signed: false, signed_by: '', signed_date: '', comments: '', grv_number: data.grv_number };
      }
      if (data.payment_reference) {
        partial.payment = { done: false, paid_by: '', payment_date: '', payment_reference: data.payment_reference, comments: '' };
      }
      onExtracted(partial);
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Extraction failed. Please try a clearer scan.');
    } finally {
      setScanning(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="p-4 rounded-xl bg-[#86BBD8]/[0.08] border border-[#86BBD8]/20">
        <p className="text-xs text-white/70 font-semibold mb-1">How this works</p>
        <p className="text-[11px] text-white/50 leading-relaxed">
          Upload a scanned completion certificate, invoice, or any service document. Python OCR (PyMuPDF + EasyOCR) will extract the text and pre-fill the form — you can then review and edit before saving.
          <br /><span className="text-white/40">Supported: PDF, JPEG, PNG, WEBP · Max 20 MB</span>
        </p>
      </div>

      <div className="border-2 border-dashed border-white/15 rounded-xl p-8 text-center hover:border-[#86BBD8]/40 transition-colors">
        {scanning ? (
          <div className="space-y-3">
            <Loader2 className="h-8 w-8 text-[#86BBD8] mx-auto animate-spin" />
            <p className="text-sm text-white/60">Reading document…</p>
            <p className="text-[11px] text-white/35">This may take a few seconds</p>
          </div>
        ) : (
          <>
            <FileDown className="h-8 w-8 text-white/20 mx-auto mb-2" />
            <p className="text-sm text-white/60 mb-3">Choose a scanned document to extract data from</p>
            <label className={`cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white ${PRIMARY_BTN}`}>
              <Upload className="h-4 w-4" /> Choose file
              <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            </label>
          </>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" /> {error}
        </div>
      )}

      <div className="flex justify-end">
        <button type="button" onClick={onClose} className={SECONDARY_BTN}>Cancel</button>
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function ServicesPage() {
  const [records,   setRecords]   = useState<ServiceRecord[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [apiError,  setApiError]  = useState('');
  const [search,    setSearch]    = useState('');
  const [dateFrom,  setDateFrom]  = useState('');
  const [dateTo,    setDateTo]    = useState('');
  const [filterCat,    setFilterCat]    = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [sortBy,    setSortBy]    = useState('newest');
  const [viewMode,  setViewMode]  = useState<'grid' | 'table'>('grid');
  const [showRecords, setShowRecords] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [expandedIds,   setExpandedIds]   = useState<Set<string>>(new Set());
  const [formOpen,     setFormOpen]     = useState(false);
  const [editRecord,   setEditRecord]   = useState<ServiceRecord | null>(null);
  const [deleteId,     setDeleteId]     = useState<string | null>(null);
  const [importOpen,   setImportOpen]   = useState(false);
  const [ocrOpen,      setOcrOpen]      = useState(false);
  const [viewRecord,   setViewRecord]   = useState<ServiceRecord | null>(null);

  // Debounce sync timers per record
  const syncTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Load on mount
  useEffect(() => {
    fetch(`${API}/api/services`)
      .then(r => { if (!r.ok) throw new Error(`${r.status}`); return r.json(); })
      .then(data => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setRecords((data as Record<string, unknown>[]).map(fromApi));
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLoading(false);
      })
      .catch(e => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setApiError(`Could not connect to backend: ${e.message}`);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLoading(false);
      });
  }, []);

  // Stats
  const total      = records.length;
  const inProg     = records.filter(r => { const d = stagesDone(r); return d > 0 && d < 6; }).length;
  const completed  = records.filter(r => stagesDone(r) === 6).length;
  const notStarted = records.filter(r => stagesDone(r) === 0).length;
  const monthCount = records.filter(r => thisMonth(r.date)).length;

  // Filter + sort
  const q = search.toLowerCase();
  const processed = records
    .filter(r => {
      if (q && ![r.description, r.supplier, r.requisition_number, r.invoice_number,
        r.order_number, r.stores.grv_number, r.contact_person].some(v => v.toLowerCase().includes(q))) return false;
      if (dateFrom && r.date < dateFrom) return false;
      if (dateTo   && r.date > dateTo)   return false;
      if (filterCat    && r.category !== filterCat)    return false;
      if (filterStatus) {
        const d = stagesDone(r);
        if (filterStatus === 'not_started' && d !== 0) return false;
        if (filterStatus === 'in_progress' && (d === 0 || d === 6)) return false;
        if (filterStatus === 'completed'   && d !== 6) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'newest')        return b.created_at.localeCompare(a.created_at);
      if (sortBy === 'oldest')        return a.created_at.localeCompare(b.created_at);
      if (sortBy === 'date_desc')     return b.date.localeCompare(a.date);
      if (sortBy === 'date_asc')      return a.date.localeCompare(b.date);
      if (sortBy === 'supplier')      return a.supplier.localeCompare(b.supplier);
      if (sortBy === 'progress_desc') return stagesDone(b) - stagesDone(a);
      return 0;
    });

  // Collapse / expand all
  const allExpanded = processed.length > 0 && processed.every(r => expandedIds.has(r.id));
  function expandAll()   { setExpandedIds(new Set(processed.map(r => r.id))); }
  function collapseAll() { setExpandedIds(new Set()); }
  function toggleCard(id: string) {
    setExpandedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  async function handleSave(r: ServiceRecord) {
    const isNew = !records.find(x => x.id === r.id);
    try {
      if (isNew) {
        const res = await fetch(`${API}/api/services`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(toApi(r)) });
        if (!res.ok) throw new Error(await res.text());
        const saved = fromApi(await res.json());
        setRecords(prev => [saved, ...prev]);
        toast.success('Service record added');
      } else {
        const res = await fetch(`${API}/api/services/${r.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(toApi(r)) });
        if (!res.ok) throw new Error(await res.text());
        const saved = fromApi(await res.json());
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
        const res = await fetch(`${API}/api/services/${r.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(toApi(r)) });
        if (!res.ok) throw new Error();
      } catch { toast.error('Auto-save failed — your changes may not be synced'); }
    }, 1200);
  }

  async function handleDelete() {
    if (!deleteId) return;
    try {
      await fetch(`${API}/api/services/${deleteId}`, { method: 'DELETE' });
      setRecords(prev => prev.filter(r => r.id !== deleteId));
      toast.success('Record deleted');
    } catch { toast.error('Delete failed'); }
  }

  async function handleBulkImport(rows: ServiceRecord[]) {
    let ok = 0;
    for (const row of rows) {
      try {
        const res = await fetch(`${API}/api/services`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(toApi(row)) });
        if (res.ok) { const saved = fromApi(await res.json()); setRecords(prev => [saved, ...prev]); ok++; }
      } catch { /* continue */ }
    }
    toast.success(`Imported ${ok} of ${rows.length} records`);
  }

  function handleOcrExtracted(partial: Partial<ServiceRecord>) {
    const base = emptyRecord();
    setEditRecord({ ...base, ...partial } as ServiceRecord);
    setFormOpen(true);
    toast.success('Document scanned — review and save the extracted data');
  }

  function openEdit(r: ServiceRecord) { setEditRecord(r); setFormOpen(true); setViewRecord(null); }

  const anyFilter = !!(search || dateFrom || dateTo || filterCat || filterStatus);

  // Download data (flat)
  const dlColumns: DLColumn[] = [
    { key: 'date',               label: 'Date',           format: v => fmtDate(String(v ?? '')) },
    { key: 'description',        label: 'Description',    width: 32 },
    { key: 'supplier',           label: 'Supplier',       width: 22 },
    { key: 'contact_person',     label: 'Contact' },
    { key: 'category',           label: 'Category' },
    { key: 'amount',             label: 'Amount' },
    { key: 'requisition_number', label: 'REQ #' },
    { key: 'invoice_number',     label: 'INV #' },
    { key: 'order_number',       label: 'PO #' },
    { key: 'planning_signed',    label: 'Planning ✓' },
    { key: 'eng_mgr_signed',     label: 'Eng. Mgr ✓' },
    { key: 'finance_signed',     label: 'Finance ✓' },
    { key: 'gm_signed',          label: 'GM ✓' },
    { key: 'grv_number',         label: 'GRV #' },
    { key: 'stores_signed',      label: 'Stores ✓' },
    { key: 'payment_done',       label: 'Payment ✓' },
    { key: 'payment_reference',  label: 'Pay Ref' },
    { key: 'general_comments',   label: 'Comments',       width: 28 },
  ];

  const dlData = processed.map(r => ({
    date: r.date,                            description: r.description,
    supplier: r.supplier,                    contact_person: r.contact_person,
    category: r.category,                    amount: r.amount,
    requisition_number: r.requisition_number,invoice_number: r.invoice_number,
    order_number: r.order_number,            planning_signed:   r.planning.signed ? 'Yes' : '—',
    eng_mgr_signed: r.engineering_manager.signed ? 'Yes' : '—',
    finance_signed:   r.finance.signed ? 'Yes' : '—',
    gm_signed:        r.gm.signed ? 'Yes' : '—',
    grv_number:       r.stores.grv_number,   stores_signed:     r.stores.signed ? 'Yes' : '—',
    payment_done:     r.payment.done ? 'Yes' : '—',
    payment_reference: r.payment.payment_reference,
    general_comments: r.general_comments,
  } as Record<string, unknown>));

  const stats: StatItem[] = [
    { label: 'Total',       value: total },
    { label: 'In Progress', value: inProg,     textClass: 'text-amber-300' },
    { label: 'Completed',   value: completed,  textClass: 'text-emerald-400' },
    { label: 'Not Started', value: notStarted, textClass: 'text-white/50' },
    { label: 'This Month',  value: monthCount, textClass: 'text-[#86BBD8]' },
  ];

  return (
    <PageShell>
      <div className="container mx-auto px-4 py-6 space-y-4">
        <Toaster position="top-right" richColors />

        {/* Hero */}
        <HeroPanel
          icon={Wrench}
          title="Services Tracker"
          subtitle="Track service completion, approval pipeline, suppliers and invoices"
          onNew={() => { setEditRecord(null); setFormOpen(true); }}
          newLabel="New Service"
          stats={stats}
          actions={
            <div className="flex items-center gap-1.5">
              <button type="button" onClick={() => setOcrOpen(true)} title="Scan a document with AI to extract data"
                className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold text-white border transition-all hover:-translate-y-0.5 bg-violet-500/20 border-violet-500/35 hover:bg-violet-500/30">
                <Eye className="h-3.5 w-3.5" /> Scan
              </button>
              <button type="button" onClick={() => setImportOpen(true)} title="Import records from Excel spreadsheet"
                className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold text-white border transition-all hover:-translate-y-0.5 bg-[#86BBD8]/15 border-[#86BBD8]/25 hover:bg-[#86BBD8]/25">
                <FileSpreadsheet className="h-3.5 w-3.5" /> Import
              </button>
              <DownloadButton data={dlData} columns={dlColumns} filename="Services_Tracker" title="Services Tracker"
                subtitle={anyFilter ? `Filtered · ${processed.length} records` : `All records · ${total}`} />
            </div>
          }
        />

        {/* API error banner */}
        {apiError && (
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Backend not reachable</p>
              <p className="text-xs text-red-300/70 mt-0.5">{apiError} — Make sure the backend is deployed and reachable at {API}.</p>
            </div>
          </div>
        )}

        {/* Filters */}
        <GlassPanel icon={Filter} title="Filters" open={showFilters} onToggle={() => setShowFilters(o => !o)} variant="panel"
          actions={anyFilter ? <button type="button" onClick={() => { setSearch(''); setDateFrom(''); setDateTo(''); setFilterCat(''); setFilterStatus(''); }} className="text-[11px] text-rose-400 hover:text-rose-300 border border-rose-500/20 bg-rose-500/10 px-2 py-0.5 rounded-lg transition-all">Clear all</button> : undefined}>
          <div className="px-5 py-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <GlassInput label="Date from" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            <GlassInput label="Date to"   type="date" value={dateTo}   onChange={e => setDateTo(e.target.value)}   />
            <GlassSelect label="Category" value={filterCat} onChange={e => setFilterCat(e.target.value)}
              options={[{ value: '', label: 'All categories' }, ...CATS.map(c => ({ value: c, label: c }))]} />
            <GlassSelect label="Pipeline status" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              options={[{ value: '', label: 'All statuses' }, { value: 'not_started', label: 'Not Started' }, { value: 'in_progress', label: 'In Progress' }, { value: 'completed', label: 'Completed' }]} />
          </div>
        </GlassPanel>

        {/* Records */}
        <div className="oz-glass-panel rounded-2xl overflow-hidden">
          <RecordsPanelHeader
            icon={ClipboardList} title="Services" count={processed.length} total={total}
            search={search} onSearch={setSearch} searchPlaceholder="Search description, supplier, REQ, INV, GRV…"
            sortValue={sortBy} onSort={setSortBy}
            sortOptions={[
              { value: 'newest',        label: 'Newest first'  },
              { value: 'oldest',        label: 'Oldest first'  },
              { value: 'date_desc',     label: 'Date ↓'        },
              { value: 'date_asc',      label: 'Date ↑'        },
              { value: 'supplier',      label: 'Supplier A–Z'  },
              { value: 'progress_desc', label: 'Most progress' },
            ]}
            viewMode={viewMode} onViewMode={setViewMode}
            show={showRecords} onToggle={() => setShowRecords(o => !o)}
            actions={
              viewMode === 'grid' && processed.length > 0 ? (
                <button type="button" onClick={allExpanded ? collapseAll : expandAll} title={allExpanded ? 'Collapse all cards' : 'Expand all cards'}
                  className="h-7 px-2 text-xs flex items-center gap-1 rounded-lg bg-white/[0.07] border border-white/[0.12] text-white/50 hover:text-white/80 hover:bg-white/[0.12] transition-all">
                  {allExpanded ? <><ChevronsUp className="h-3 w-3" /> Collapse all</> : <><ChevronsDown className="h-3 w-3" /> Expand all</>}
                </button>
              ) : undefined
            }
          />

          {showRecords && (
            <div className="p-4 sm:p-5">
              {loading ? (
                <div className="py-12 text-center flex items-center justify-center gap-2 text-white/30">
                  <Loader2 className="h-5 w-5 animate-spin" /> Loading services…
                </div>
              ) : processed.length === 0 ? (
                <EmptyState icon={Wrench}
                  title={anyFilter ? 'No records match your filters' : 'No service records yet'}
                  message={anyFilter ? 'Adjust your search or clear the filters.' : 'Click "New Service" to log the first record, or import from Excel.'}
                  action={!anyFilter ? { label: 'Add Service', onClick: () => { setEditRecord(null); setFormOpen(true); } } : undefined}
                />
              ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                  {processed.map(r => (
                    <ServiceCard key={r.id} record={r}
                      expanded={expandedIds.has(r.id)} onToggle={() => toggleCard(r.id)}
                      onUpdate={handleUpdate} onEdit={openEdit} onDelete={setDeleteId} />
                  ))}
                </div>
              ) : (
                <ListView records={processed} onEdit={openEdit} onDelete={setDeleteId} onView={r => setViewRecord(r)} />
              )}
            </div>
          )}
        </div>

        {/* Pipeline legend */}
        <GlassPanel icon={ArrowRight} title="Approval Pipeline — Stage Order" variant="panel" defaultOpen={false}>
          <div className="px-5 py-4">
            <p className="text-[11px] text-white/40 mb-3">Records progress through these stages in order. Each stage must be signed off before payment is processed.</p>
            <div className="flex flex-wrap gap-2">
              {STAGES.map((s, i) => {
                const Icon = s.icon;
                return (
                  <div key={s.key} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/[0.10] bg-white/[0.04]">
                    <span className="text-[11px] text-white/30 font-semibold">{i + 1}.</span>
                    <Icon className="h-3.5 w-3.5 text-[#86BBD8]" />
                    <span className="text-xs text-white/70">{s.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </GlassPanel>
      </div>

      {/* Add / Edit form */}
      <GlassModal isOpen={formOpen} onClose={() => { setFormOpen(false); setEditRecord(null); }}
        title={editRecord?.description ? 'Edit Service Record' : 'New Service Record'} icon={Wrench} size="lg">
        <ServiceForm initial={editRecord ?? emptyRecord()} onSave={handleSave} onClose={() => { setFormOpen(false); setEditRecord(null); }} />
      </GlassModal>

      {/* List view detail / pipeline modal */}
      <GlassModal isOpen={viewRecord !== null} onClose={() => setViewRecord(null)}
        title={viewRecord?.description ?? 'Service Record'} icon={ClipboardList} size="xl">
        {viewRecord && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap mb-4">
              {(() => { const d = stagesDone(viewRecord);
                const info = d === 6 ? { v: 'success' as const, label: 'Completed' } : d === 0 ? { v: 'neutral' as const, label: 'Not Started' } : { v: 'warning' as const, label: `Stage ${d + 1} of 6` };
                return <GlassBadge variant={info.v}>{info.label}</GlassBadge>;
              })()}
              {viewRecord.category && <GlassBadge variant="info">{viewRecord.category}</GlassBadge>}
              {viewRecord.amount && <span className="text-sm font-semibold text-[#86BBD8]">{viewRecord.amount}</span>}
            </div>
            <GlassTabs variant="pills" tabs={[
              { key: 'pipeline', label: 'Pipeline', icon: ClipboardList, content: (
                <div className="space-y-2">
                  {STAGES.map(s => <StageRow key={s.key} stage={s} record={viewRecord} onUpdate={r => { handleUpdate(r); setViewRecord(r); }} />)}
                </div>
              )},
              { key: 'attachments', label: 'Attachments', icon: Paperclip, content: <AttachmentPanel serviceId={viewRecord.id} /> },
            ]} />
            <div className="flex justify-end gap-2 pt-2 border-t border-white/[0.07]">
              <button type="button" onClick={() => openEdit(viewRecord)} className={SECONDARY_BTN}><Edit2 className="h-3.5 w-3.5" /> Edit Info</button>
            </div>
          </div>
        )}
      </GlassModal>

      {/* Import (spreadsheet or document scan) */}
      <GlassModal isOpen={importOpen} onClose={() => setImportOpen(false)} title="Import Records" icon={FileSpreadsheet} size="xl">
        <ExcelImportModal onImport={handleBulkImport} onExtracted={handleOcrExtracted} onClose={() => setImportOpen(false)} />
      </GlassModal>

      {/* OCR scan */}
      <GlassModal isOpen={ocrOpen} onClose={() => setOcrOpen(false)} title="Scan Document — Extract Data" icon={Eye} size="md">
        <OcrUploadModal onExtracted={handleOcrExtracted} onClose={() => setOcrOpen(false)} />
      </GlassModal>

      {/* Delete confirm */}
      <DeleteDialog open={deleteId !== null} onClose={() => setDeleteId(null)} onDelete={handleDelete}
        description="This service record and all its pipeline data will be permanently deleted." />
    </PageShell>
  );
}
