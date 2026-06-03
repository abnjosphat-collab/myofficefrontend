// app/requisitions/page.tsx — Glassmorphism redesign
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ShoppingCart, Plus, Pencil, Trash2, Eye, Search, Filter,
  Zap, Wrench, Flag, DollarSign, FileText, BarChart3, X,
  AlertTriangle, CheckCircle2, Clock, XCircle, Package,
  ChevronDown, RefreshCw,
} from 'lucide-react';
import { PageShell } from '@/components/PageShell';
import {
  HeroPanel, GlassPanel, GlassStatCard, GlassBadge, GlassButton,
  GlassInput, GlassSelect, GlassTextarea, GlassTable, GlassTabs,
  GlassModal, GlassProgress, LoadingPane, MasterCollapseButton,
  DownloadButton, DeleteDialog, EmptyState, usePageCollapse,
  formatCurrency, fmtDate,
  type StatItem, type GlassColumn, type GlassTab, type DLColumn,
} from '@/components/shared';
import { toast } from 'sonner';

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface RequisitionItem {
  description: string;
  costPerUnit: number;
  quantity: number;
  reason: string;
}

interface Requisition {
  id: string;
  date: string;
  requester: string;
  section: 'Electrical' | 'Mechanical';
  required_for: string;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  status: 'Draft' | 'Pending' | 'Approved' | 'Rejected' | 'Processing' | 'Completed';
  requisitionNumber: string;
  items: RequisitionItem[];
  notes?: string;
  lineNumber: number;
  createdAt: string;
  updatedAt: string;
}

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const STATUSES:   Requisition['status'][]   = ['Draft', 'Pending', 'Approved', 'Rejected', 'Processing', 'Completed'];
const PRIORITIES: Requisition['priority'][] = ['Critical', 'High', 'Medium', 'Low'];
const SECTIONS:   Requisition['section'][]  = ['Electrical', 'Mechanical'];

const STATUS_CONFIG: Record<Requisition['status'], { variant: 'success'|'warning'|'danger'|'neutral'; icon: typeof CheckCircle2 }> = {
  Approved:   { variant: 'success',  icon: CheckCircle2 },
  Completed:  { variant: 'success',  icon: CheckCircle2 },
  Pending:    { variant: 'warning',  icon: Clock },
  Processing: { variant: 'warning',  icon: Clock },
  Rejected:   { variant: 'danger',   icon: XCircle },
  Draft:      { variant: 'neutral',  icon: FileText },
};

const PRIORITY_COLOR: Record<Requisition['priority'], string> = {
  Critical: 'text-red-400',
  High:     'text-orange-400',
  Medium:   'text-blue-400',
  Low:      'text-white/40',
};

const PRIORITY_BAR: Record<Requisition['priority'], string> = {
  Critical: 'bg-red-500/70',
  High:     'bg-orange-500/70',
  Medium:   'bg-blue-500/70',
  Low:      'bg-white/20',
};

// ─── API ──────────────────────────────────────────────────────────────────────

const API = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000').replace(/\/$/, '');
const BASE = `${API}/api/requisitions`;

function fromBackend(d: Record<string, unknown>): Requisition {
  return {
    id:               String(d.id),
    date:             String(d.date ?? ''),
    requester:        String(d.requester ?? ''),
    section:          (d.section as Requisition['section']) ?? 'Mechanical',
    required_for:     String(d.required_for ?? ''),
    priority:         (d.priority as Requisition['priority']) ?? 'Medium',
    status:           (d.status as Requisition['status']) ?? 'Draft',
    requisitionNumber: String(d.requisition_number ?? ''),
    notes:            String(d.notes ?? ''),
    items:            ((d.requisition_items ?? []) as Record<string,unknown>[]).map(i => ({
      description: String(i.description ?? ''),
      costPerUnit:  Number(i.cost_per_unit ?? 0),
      quantity:     Number(i.quantity ?? 1),
      reason:       String(i.reason ?? ''),
    })),
    lineNumber:  Number(d.line_number ?? 0),
    createdAt:   String(d.created_at ?? ''),
    updatedAt:   String(d.updated_at ?? ''),
  };
}

async function apiGet(params: Record<string,string> = {}): Promise<Requisition[]> {
  const q = new URLSearchParams(Object.entries(params).filter(([,v]) => v && v !== 'all'));
  const r = await fetch(`${BASE}${q.toString() ? '?' + q : ''}`);
  if (!r.ok) throw new Error(await r.text());
  const data: unknown[] = await r.json();
  return (Array.isArray(data) ? data : []).map(d => fromBackend(d as Record<string,unknown>));
}

async function apiCreate(body: object): Promise<Requisition> {
  const r = await fetch(BASE, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(await r.text());
  return fromBackend(await r.json());
}

async function apiUpdate(id: string, body: object): Promise<Requisition> {
  const r = await fetch(`${BASE}/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(await r.text());
  return fromBackend(await r.json());
}

async function apiDelete(id: string): Promise<void> {
  const r = await fetch(`${BASE}/${id}`, { method: 'DELETE' });
  if (!r.ok) throw new Error(await r.text());
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const itemTotal = (items: RequisitionItem[]) =>
  items.reduce((s, i) => s + i.costPerUnit * i.quantity, 0);

const newItem = (): RequisitionItem => ({ description: '', costPerUnit: 0, quantity: 1, reason: '' });

const blankForm = (): Partial<Requisition> => ({
  date: new Date().toISOString().slice(0, 10),
  requester: '', section: 'Mechanical', required_for: '',
  priority: 'Medium', status: 'Draft',
  requisitionNumber: `REQ-${Date.now().toString().slice(-6)}`,
  items: [newItem()], notes: '',
});

// ─── FORM MODAL ───────────────────────────────────────────────────────────────

// ─── Lightweight data types for linked lookups ────────────────────────────────
interface EmpOption  { id: string; label: string; section: string; }
interface EquipOption { id: string; label: string; section: string; }
interface SpareOption { id: number; code: string; description: string; unit: string; price: number; }

function useReqData(open: boolean) {
  const [employees, setEmployees] = useState<EmpOption[]>([]);
  const [equipment, setEquipment] = useState<EquipOption[]>([]);
  const [spares,    setSpares]    = useState<SpareOption[]>([]);

  useEffect(() => {
    if (!open) return;
    const base = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000').replace(/\/$/, '');
    Promise.all([
      fetch(`${base}/api/employees`).then(r => r.ok ? r.json() : []),
      fetch(`${base}/api/equipment`).then(r => r.ok ? r.json() : []),
      fetch(`${base}/api/spares`).then(r => r.ok ? r.json() : []),
    ]).then(([emps, equip, sp]) => {
      setEmployees((Array.isArray(emps) ? emps : []).map((e: Record<string,unknown>) => ({
        id:      String(e.employee_id ?? e.id ?? ''),
        label:   `${e.first_name ?? ''} ${e.last_name ?? ''}`.trim() || String(e.name ?? ''),
        section: String(e.department ?? e.section ?? ''),
      })));
      setEquipment((Array.isArray(equip) ? equip : []).map((e: Record<string,unknown>) => ({
        id:      String(e.id ?? ''),
        label:   String(e.name ?? ''),
        section: String(e.location ?? e.department ?? e.category ?? ''),
      })));
      setSpares((Array.isArray(sp) ? sp : []).map((s: Record<string,unknown>) => ({
        id:          Number(s.id),
        code:        String(s.stock_code ?? ''),
        description: String(s.description ?? ''),
        unit:        String(s.unit_of_measure ?? 'UN'),
        price:       Number(s.unit_price ?? 0),
      })));
    }).catch(() => {});
  }, [open]);

  return { employees, equipment, spares };
}

function ReqModal({
  open, onClose, onSave, editing,
}: {
  open: boolean; onClose: () => void;
  onSave: (data: object) => Promise<void>;
  editing: Requisition | null;
}) {
  const [form, setForm] = useState<Partial<Requisition>>(blankForm());
  const [saving, setSaving] = useState(false);
  const [empSearch,   setEmpSearch]   = useState('');
  const [spareSearch, setSpareSearch] = useState<Record<number, string>>({});
  const [spareOpen,   setSpareOpen]   = useState<number | null>(null);
  const { employees, equipment, spares } = useReqData(open);

  useEffect(() => {
    setForm(editing
      ? { ...editing, items: editing.items.length ? editing.items : [newItem()] }
      : blankForm());
  }, [editing, open]);

  const set = (p: Partial<Requisition>) => setForm(f => ({ ...f, ...p }));

  const setItem = (i: number, p: Partial<RequisitionItem>) =>
    setForm(f => ({ ...f, items: f.items!.map((it, idx) => idx === i ? { ...it, ...p } : it) }));
  const addItem  = () => setForm(f => ({ ...f, items: [...(f.items ?? []), newItem()] }));
  const rmItem   = (i: number) => setForm(f => ({ ...f, items: f.items!.filter((_, idx) => idx !== i) }));

  const total = itemTotal(form.items ?? []);

  async function handleSave() {
    if (!form.requester?.trim()) { toast.error('Requester is required'); return; }
    if (!form.date) { toast.error('Date is required'); return; }
    if (!form.items?.length) { toast.error('Add at least one item'); return; }
    for (const [i, it] of (form.items ?? []).entries()) {
      if (!it.description.trim()) { toast.error(`Item ${i + 1}: description required`); return; }
    }
    setSaving(true);
    try {
      const payload = {
        date: form.date, requester: form.requester, section: form.section,
        required_for: form.required_for, priority: form.priority, status: form.status,
        requisition_number: form.requisitionNumber, notes: form.notes,
        items: (form.items ?? []).map(it => ({
          description: it.description, cost_per_unit: it.costPerUnit,
          quantity: it.quantity, reason: it.reason,
        })),
      };
      await onSave(payload);
      onClose();
    } catch (e) { toast.error((e as Error).message); }
    finally { setSaving(false); }
  }

  const GIN = 'bg-white/[0.07] border border-white/[0.12] text-white placeholder:text-white/30 focus:border-[#86BBD8]/50 h-9 text-sm rounded-lg px-3 w-full focus:outline-none transition-all [color-scheme:dark]';
  const LBL = 'text-white/55 text-xs font-medium block mb-1';
  const SEL = GIN + ' appearance-none';

  return (
    <GlassModal
      isOpen={open} onClose={onClose} size="xl"
      title={editing ? `Edit ${editing.requisitionNumber}` : 'New Purchase Requisition'}
      footer={
        <div className="flex justify-between items-center w-full">
          <span className="text-sm text-white/50">
            Total: <span className="font-bold text-white">{formatCurrency(total)}</span>
          </span>
          <div className="flex gap-2">
            <GlassButton variant="secondary" onClick={onClose}>Cancel</GlassButton>
            <GlassButton variant="primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Update' : 'Create'}
            </GlassButton>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Header fields */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {/* Requester — typeahead from employees */}
          <div className="md:col-span-2 relative">
            <label className={LBL}>Requester *</label>
            <input
              className={GIN} placeholder="Type name to search employees…"
              value={form.requester ?? ''} autoComplete="off"
              onChange={e => { set({ requester: e.target.value }); setEmpSearch(e.target.value); }}
              onFocus={e => setEmpSearch(e.target.value)}
              onBlur={() => setTimeout(() => setEmpSearch(''), 200)}
            />
            {empSearch.length >= 1 && (() => {
              const q = empSearch.toLowerCase();
              const hits = employees.filter(e => e.label.toLowerCase().includes(q)).slice(0, 6);
              if (!hits.length) return null;
              return (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 rounded-xl bg-[rgba(5,15,28,0.97)] border border-white/10 shadow-xl overflow-hidden">
                  {hits.map(e => (
                    <button key={e.id} type="button"
                      onMouseDown={() => { set({ requester: e.label, section: (SECTIONS.includes(e.section as Requisition['section']) ? e.section : form.section) as Requisition['section'] }); setEmpSearch(''); }}
                      className="w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-white/10 transition-colors text-left">
                      <span className="text-white font-medium">{e.label}</span>
                      <span className="text-white/35 ml-3 truncate">{e.id}{e.section ? ` · ${e.section}` : ''}</span>
                    </button>
                  ))}
                </div>
              );
            })()}
          </div>

          <div>
            <label className={LBL}>Date *</label>
            <input type="date" title="Requisition date" className={GIN} value={form.date ?? ''} onChange={e => set({ date: e.target.value })} />
          </div>

          {/* Section */}
          <div>
            <label className={LBL}>Section</label>
            <select title="Section" className={SEL} value={form.section ?? 'Mechanical'} onChange={e => set({ section: e.target.value as Requisition['section'] })}>
              {SECTIONS.map(s => <option key={s} value={s} className="bg-[#0d1f35]">{s}</option>)}
            </select>
          </div>
          <div>
            <label className={LBL}>Priority</label>
            <select title="Priority" className={SEL} value={form.priority ?? 'Medium'} onChange={e => set({ priority: e.target.value as Requisition['priority'] })}>
              {PRIORITIES.map(p => <option key={p} value={p} className="bg-[#0d1f35]">{p}</option>)}
            </select>
          </div>
          <div>
            <label className={LBL}>Status</label>
            <select title="Status" className={SEL} value={form.status ?? 'Draft'} onChange={e => set({ status: e.target.value as Requisition['status'] })}>
              {STATUSES.map(s => <option key={s} value={s} className="bg-[#0d1f35]">{s}</option>)}
            </select>
          </div>

          {/* Required For — equipment picker */}
          <div className="md:col-span-2">
            <label className={LBL}>Required For (Equipment / Asset)</label>
            <select title="Required for" className={SEL} value={form.required_for ?? ''}
              onChange={e => {
                const eq = equipment.find(x => x.label === e.target.value);
                set({ required_for: e.target.value, ...(eq && SECTIONS.includes(eq.section as Requisition['section']) ? { section: eq.section as Requisition['section'] } : {}) });
              }}>
              <option value="" className="bg-[#0d1f35]">— Select equipment or type below —</option>
              {equipment.map(eq => <option key={eq.id} value={eq.label} className="bg-[#0d1f35]">{eq.label}{eq.section ? ` (${eq.section})` : ''}</option>)}
            </select>
            {/* Fallback free-text if not in list */}
            <input className={`${GIN} mt-1.5`} placeholder="Or type manually (project, work order, other…)"
              value={equipment.find(eq => eq.label === form.required_for) ? '' : (form.required_for ?? '')}
              onChange={e => set({ required_for: e.target.value })} />
          </div>

          <div>
            <label className={LBL}>Requisition #</label>
            <input className={GIN} placeholder="e.g. REQ-001" value={form.requisitionNumber ?? ''} onChange={e => set({ requisitionNumber: e.target.value })} />
          </div>
        </div>

        {/* Line items */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-white/60 uppercase tracking-wider">Line Items</span>
            <GlassButton size="xs" icon={Plus} onClick={addItem}>Add Item</GlassButton>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {(form.items ?? []).map((it, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 p-3 rounded-xl bg-white/[0.04] border border-white/[0.07]">
                <div className="col-span-5">
                  <label className={LBL}>Description *</label>
                  <input className={GIN} placeholder="Item description" value={it.description} onChange={e => setItem(i, { description: e.target.value })} />
                </div>
                <div className="col-span-2">
                  <label className={LBL}>Unit Cost</label>
                  <input type="number" min="0" step="0.01" title="Unit cost" placeholder="0.00" className={GIN} value={it.costPerUnit} onChange={e => setItem(i, { costPerUnit: parseFloat(e.target.value) || 0 })} />
                </div>
                <div className="col-span-2">
                  <label className={LBL}>Qty</label>
                  <input type="number" min="1" title="Quantity" placeholder="1" className={GIN} value={it.quantity} onChange={e => setItem(i, { quantity: parseInt(e.target.value) || 1 })} />
                </div>
                <div className="col-span-2">
                  <label className={LBL}>Reason</label>
                  <input className={GIN} placeholder="Optional" value={it.reason} onChange={e => setItem(i, { reason: e.target.value })} />
                </div>
                <div className="col-span-1 flex items-end pb-0.5">
                  <button type="button" title="Remove item" aria-label="Remove item" onClick={() => rmItem(i)} disabled={(form.items?.length ?? 0) <= 1}
                    className="h-9 w-9 flex items-center justify-center rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-20">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-end mt-2">
            <span className="text-xs text-white/50">
              {(form.items ?? []).length} item{(form.items ?? []).length !== 1 ? 's' : ''} ·{' '}
              <span className="text-white font-semibold">{formatCurrency(total)}</span>
            </span>
          </div>
        </div>

        {/* Notes */}
        <GlassTextarea label="Notes (optional)" value={form.notes ?? ''} onChange={e => set({ notes: e.target.value })} rows={2} placeholder="Any additional notes…" />
      </div>
    </GlassModal>
  );
}

// ─── DETAIL MODAL ─────────────────────────────────────────────────────────────

function ReqDetailModal({ req, onClose, onEdit }: {
  req: Requisition; onClose: () => void; onEdit: () => void;
}) {
  const total    = itemTotal(req.items);
  const SIcon    = req.section === 'Electrical' ? Zap : Wrench;
  const sCfg     = STATUS_CONFIG[req.status];
  const StatusIcon = sCfg.icon;

  return (
    <GlassModal isOpen onClose={onClose} size="lg" title={`Requisition ${req.requisitionNumber}`}
      footer={
        <div className="flex justify-end gap-2">
          <GlassButton variant="secondary" onClick={onClose}>Close</GlassButton>
          <GlassButton variant="primary" icon={Pencil} onClick={() => { onClose(); onEdit(); }}>Edit</GlassButton>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Meta row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Requester',    value: req.requester },
            { label: 'Date',         value: fmtDate(req.date) },
            { label: 'Required For', value: req.required_for || '—' },
            { label: 'Ref#',         value: `#${req.lineNumber}` },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white/[0.04] rounded-xl p-3 border border-white/[0.07]">
              <p className="text-[10px] text-white/35 uppercase tracking-wide mb-0.5">{label}</p>
              <p className="text-sm font-medium text-white/85">{value}</p>
            </div>
          ))}
        </div>

        {/* Badges */}
        <div className="flex gap-2 flex-wrap">
          <GlassBadge variant={sCfg.variant}><StatusIcon className="h-3 w-3 mr-1" />{req.status}</GlassBadge>
          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border border-white/10 bg-white/[0.06] ${PRIORITY_COLOR[req.priority]}`}>
            <Flag className="h-3 w-3" />{req.priority}
          </span>
          <span className="inline-flex items-center gap-1 text-xs text-white/60 px-2 py-0.5 rounded-full border border-white/10 bg-white/[0.06]">
            <SIcon className="h-3 w-3" />{req.section}
          </span>
          <span className="inline-flex items-center gap-1 text-xs text-white/60 px-2 py-0.5 rounded-full border border-white/10 bg-white/[0.06]">
            <DollarSign className="h-3 w-3" />{formatCurrency(total)}
          </span>
        </div>

        {/* Items table */}
        <div className="rounded-xl border border-white/[0.08] overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/[0.07] bg-white/[0.03]">
                {['Description','Reason','Unit Cost','Qty','Total'].map(h => (
                  <th key={h} className="px-3 py-2 text-left text-white/40 font-semibold uppercase tracking-wider text-[10px]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {req.items.map((it, i) => (
                <tr key={i} className="border-b border-white/[0.05] hover:bg-white/[0.03]">
                  <td className="px-3 py-2 text-white/80 font-medium">{it.description}</td>
                  <td className="px-3 py-2 text-white/50">{it.reason || '—'}</td>
                  <td className="px-3 py-2 text-white/70">{formatCurrency(it.costPerUnit)}</td>
                  <td className="px-3 py-2 text-white/70">{it.quantity}</td>
                  <td className="px-3 py-2 font-semibold text-white">{formatCurrency(it.costPerUnit * it.quantity)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-white/[0.10] bg-white/[0.03]">
                <td colSpan={4} className="px-3 py-2 text-right text-white/50 text-xs font-semibold">TOTAL</td>
                <td className="px-3 py-2 font-bold text-white">{formatCurrency(total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Notes */}
        {req.notes && (
          <div className="bg-white/[0.04] rounded-xl p-3 border border-white/[0.07]">
            <p className="text-[10px] text-white/35 uppercase tracking-wide mb-1">Notes</p>
            <p className="text-sm text-white/65">{req.notes}</p>
          </div>
        )}
      </div>
    </GlassModal>
  );
}

// ─── DOWNLOAD COLUMNS ─────────────────────────────────────────────────────────

const DL_COLS: DLColumn[] = [
  { key: 'requisitionNumber', label: 'Req #' },
  { key: 'date',              label: 'Date' },
  { key: 'requester',         label: 'Requester' },
  { key: 'section',           label: 'Section' },
  { key: 'required_for',      label: 'Required For' },
  { key: 'priority',          label: 'Priority' },
  { key: 'status',            label: 'Status' },
  { key: 'items',             label: 'Items', format: v => (v as RequisitionItem[]).map(i => i.description).join('; ') },
  { key: 'items',             label: 'Total Cost ($)', format: v => formatCurrency(itemTotal(v as RequisitionItem[])) },
  { key: 'notes',             label: 'Notes', format: v => String(v ?? '') },
];

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function RequisitionsPage() {
  const sections = usePageCollapse({ hero: false, filters: false });

  const [reqs,       setReqs]       = useState<Requisition[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [search,    setSearch]    = useState('');
  const [status,    setStatus]    = useState('all');
  const [priority,  setPriority]  = useState('all');
  const [section,   setSection]   = useState('all');
  const [dateFrom,  setDateFrom]  = useState('');
  const [dateTo,    setDateTo]    = useState('');

  // Modals
  const [formOpen,   setFormOpen]   = useState(false);
  const [editing,    setEditing]    = useState<Requisition | null>(null);
  const [viewing,    setViewing]    = useState<Requisition | null>(null);
  const [delTarget,  setDelTarget]  = useState<Requisition | null>(null);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true); else setRefreshing(true);
    try {
      const data = await apiGet();
      setReqs(data);
    } catch (e) { toast.error(`Load failed: ${(e as Error).message}`); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Filtered list
  const filtered = useMemo(() => reqs.filter(r => {
    if (status   !== 'all' && r.status   !== status)   return false;
    if (priority !== 'all' && r.priority !== priority) return false;
    if (section  !== 'all' && r.section  !== section)  return false;
    if (dateFrom && r.date < dateFrom) return false;
    if (dateTo   && r.date > dateTo)   return false;
    if (search) {
      const q = search.toLowerCase();
      if (!r.requester.toLowerCase().includes(q) &&
          !r.requisitionNumber.toLowerCase().includes(q) &&
          !r.required_for.toLowerCase().includes(q) &&
          !r.items.some(i => i.description.toLowerCase().includes(q))) return false;
    }
    return true;
  }), [reqs, status, priority, section, dateFrom, dateTo, search]);

  // Stats
  const stats = useMemo(() => {
    const totalCost   = filtered.reduce((s, r) => s + itemTotal(r.items), 0);
    const pending     = filtered.filter(r => r.status === 'Pending').length;
    const approved    = filtered.filter(r => r.status === 'Approved').length;
    const critical    = filtered.filter(r => r.priority === 'Critical').length;
    return { totalCost, pending, approved, critical, total: filtered.length };
  }, [filtered]);

  // Analytics
  const byStatus = useMemo(() => STATUSES.map(s => ({
    label: s, count: filtered.filter(r => r.status === s).length,
    cost: filtered.filter(r => r.status === s).reduce((a, r) => a + itemTotal(r.items), 0),
  })).filter(s => s.count > 0), [filtered]);

  const byPriority = useMemo(() => PRIORITIES.map(p => ({
    label: p, count: filtered.filter(r => r.priority === p).length,
  })).filter(p => p.count > 0), [filtered]);

  const maxP = Math.max(1, ...byPriority.map(p => p.count));

  // CRUD
  async function handleSave(payload: object) {
    if (editing) {
      const updated = await apiUpdate(editing.id, payload);
      setReqs(prev => prev.map(r => r.id === updated.id ? updated : r));
      toast.success('Requisition updated');
    } else {
      const created = await apiCreate(payload);
      setReqs(prev => [created, ...prev]);
      toast.success('Requisition created');
    }
  }

  async function handleDelete() {
    if (!delTarget) return;
    await apiDelete(delTarget.id);
    setReqs(prev => prev.filter(r => r.id !== delTarget.id));
    toast.success('Deleted');
  }

  // Table columns
  const cols: GlassColumn<Requisition>[] = [
    {
      key: 'requisitionNumber', header: 'Req #',
      render: r => (
        <div>
          <p className="font-mono text-xs font-semibold text-[#86BBD8]">{r.requisitionNumber}</p>
          <p className="text-[10px] text-white/35">#{r.lineNumber}</p>
        </div>
      ),
    },
    { key: 'date',      header: 'Date',      render: r => <span className="text-xs text-white/60">{fmtDate(r.date)}</span> },
    { key: 'requester', header: 'Requester', render: r => <span className="font-medium text-white/85">{r.requester}</span> },
    {
      key: 'section', header: 'Section',
      render: r => {
        const Icon = r.section === 'Electrical' ? Zap : Wrench;
        return (
          <span className="inline-flex items-center gap-1 text-xs text-white/60">
            <Icon className="h-3 w-3" />{r.section}
          </span>
        );
      },
    },
    {
      key: 'priority', header: 'Priority',
      render: r => (
        <span className={`inline-flex items-center gap-1 text-xs font-semibold ${PRIORITY_COLOR[r.priority]}`}>
          <Flag className="h-3 w-3" />{r.priority}
        </span>
      ),
    },
    {
      key: 'status', header: 'Status',
      render: r => {
        const c = STATUS_CONFIG[r.status];
        return <GlassBadge variant={c.variant} size="sm">{r.status}</GlassBadge>;
      },
    },
    {
      key: 'items', header: 'Cost', align: 'right',
      render: r => <span className="font-semibold text-white text-sm">{formatCurrency(itemTotal(r.items))}</span>,
    },
    {
      key: 'actions', header: '', align: 'right',
      render: r => (
        <div className="flex gap-1 justify-end">
          <GlassButton size="xs" variant="ghost" icon={Eye}    onClick={() => setViewing(r)} />
          <GlassButton size="xs" variant="ghost" icon={Pencil} onClick={() => { setEditing(r); setFormOpen(true); }} />
          <GlassButton size="xs" variant="danger" icon={Trash2} onClick={() => setDelTarget(r)} />
        </div>
      ),
    },
  ];

  const heroStats: StatItem[] = [
    { label: 'Total',       value: stats.total },
    { label: 'Pending',     value: stats.pending,   textClass: 'text-amber-400' },
    { label: 'Approved',    value: stats.approved,  textClass: 'text-emerald-400' },
    { label: 'Critical',    value: stats.critical,  textClass: stats.critical > 0 ? 'text-red-400' : 'text-white' },
    { label: 'Total Value', value: formatCurrency(stats.totalCost), textClass: 'text-[#86BBD8]' },
  ];

  const tabs: GlassTab[] = [
    {
      key: 'records', label: 'Records', icon: FileText,
      content: (
        <GlassPanel
          title={`Requisitions (${filtered.length})`} icon={FileText} variant="dark"
          actions={
            <>
              <DownloadButton
                data={filtered as unknown as Record<string,unknown>[]}
                columns={DL_COLS}
                filename={`Requisitions_${status !== 'all' ? status + '_' : ''}${dateFrom || ''}${dateTo ? '_to_' + dateTo : ''}`}
                title="Purchase Requisitions"
                subtitle={[status !== 'all' && `Status: ${status}`, priority !== 'all' && `Priority: ${priority}`, search && `Search: ${search}`].filter(Boolean).join(' | ') || 'All'}
              />
              <GlassButton size="xs" variant="primary" icon={Plus} onClick={() => { setEditing(null); setFormOpen(true); }}>
                New Req
              </GlassButton>
            </>
          }
        >
          {filtered.length === 0
            ? <EmptyState icon={ShoppingCart} title="No requisitions" message="Adjust filters or create your first requisition." action={{ label: 'New Req', onClick: () => { setEditing(null); setFormOpen(true); } }} />
            : <GlassTable<Requisition> columns={cols} data={filtered} keyField="id" stickyHeader maxHeight="520px" />
          }
        </GlassPanel>
      ),
    },
    {
      key: 'analytics', label: 'Analytics', icon: BarChart3,
      content: (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Status breakdown */}
          <GlassPanel title="By Status" icon={BarChart3} variant="dark">
            <div className="p-5 space-y-3">
              {byStatus.map(({ label, count, cost }) => {
                const c = STATUS_CONFIG[label as Requisition['status']];
                const pct = stats.total > 0 ? (count / stats.total) * 100 : 0;
                return (
                  <div key={label}>
                    <div className="flex justify-between text-xs mb-1">
                      <GlassBadge variant={c.variant} size="sm">{label}</GlassBadge>
                      <div className="text-right">
                        <span className="font-semibold text-white">{count}</span>
                        <span className="text-white/40 ml-2">{formatCurrency(cost)}</span>
                      </div>
                    </div>
                    <GlassProgress value={pct} />
                  </div>
                );
              })}
              {byStatus.length === 0 && <p className="text-white/30 text-sm text-center py-6">No data</p>}
            </div>
          </GlassPanel>

          {/* Priority breakdown */}
          <GlassPanel title="By Priority" icon={Flag} variant="dark">
            <div className="p-5 space-y-3">
              {byPriority.map(({ label, count }) => (
                <div key={label}>
                  <div className="flex justify-between mb-1 text-xs">
                    <span className={`font-semibold ${PRIORITY_COLOR[label as Requisition['priority']]}`}>{label}</span>
                    <span className="font-bold text-white">{count}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className={`h-full rounded-full oz-progress-fill ${PRIORITY_BAR[label as Requisition['priority']]}`}
                      style={{ '--oz-pct': `${(count / maxP) * 100}%` } as React.CSSProperties}
                    />
                  </div>
                </div>
              ))}
              {byPriority.length === 0 && <p className="text-white/30 text-sm text-center py-6">No data</p>}
            </div>
          </GlassPanel>

          {/* Section split */}
          <GlassPanel title="Section Split" icon={Zap} variant="dark">
            <div className="p-5 space-y-4">
              {SECTIONS.map(s => {
                const cnt  = filtered.filter(r => r.section === s).length;
                const cost = filtered.filter(r => r.section === s).reduce((a, r) => a + itemTotal(r.items), 0);
                const pct  = stats.total > 0 ? (cnt / stats.total) * 100 : 0;
                const Icon = s === 'Electrical' ? Zap : Wrench;
                return (
                  <div key={s}>
                    <div className="flex items-center justify-between mb-1 text-xs">
                      <span className="flex items-center gap-1.5 text-white/70"><Icon className="h-3 w-3" />{s}</span>
                      <span className="text-white font-semibold">{cnt} <span className="text-white/40">({formatCurrency(cost)})</span></span>
                    </div>
                    <GlassProgress value={pct} />
                  </div>
                );
              })}
            </div>
          </GlassPanel>

          {/* Value summary */}
          <GlassPanel title="Value Summary" icon={DollarSign} variant="dark">
            <div className="p-5 space-y-2 text-sm">
              {[
                { label: 'Total filtered value',  val: formatCurrency(stats.totalCost),                        c: 'text-[#86BBD8]' },
                { label: 'Avg per requisition',   val: formatCurrency(stats.total > 0 ? stats.totalCost / stats.total : 0), c: 'text-white' },
                { label: 'Pending value',         val: formatCurrency(filtered.filter(r => r.status === 'Pending').reduce((a,r) => a + itemTotal(r.items), 0)), c: 'text-amber-400' },
                { label: 'Approved value',        val: formatCurrency(filtered.filter(r => r.status === 'Approved').reduce((a,r) => a + itemTotal(r.items), 0)), c: 'text-emerald-400' },
              ].map(({ label, val, c }) => (
                <div key={label} className="flex justify-between text-white/70">
                  <span>{label}</span>
                  <span className={`font-bold ${c}`}>{val}</span>
                </div>
              ))}
            </div>
          </GlassPanel>
        </div>
      ),
    },
  ];

  return (
    <PageShell>
      <main className="container mx-auto px-4 py-8 space-y-4">

        <HeroPanel
          icon={ShoppingCart}
          title="Purchase Requisitions"
          subtitle="Raise, track and approve purchase requests"
          stats={heroStats}
          onRefresh={() => load(true)}
          loading={refreshing}
          {...sections.panel('hero')}
          actions={
            <>
              <MasterCollapseButton collapse={sections} />
              <GlassButton variant="primary" icon={Plus} size="sm" onClick={() => { setEditing(null); setFormOpen(true); }}>
                New Requisition
              </GlassButton>
            </>
          }
        />

        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <GlassStatCard label="Total"       value={stats.total}                  icon={ShoppingCart} />
          <GlassStatCard label="Pending"     value={stats.pending}                icon={Clock}        valueClass="text-amber-400" />
          <GlassStatCard label="Approved"    value={stats.approved}               icon={CheckCircle2} valueClass="text-emerald-400" />
          <GlassStatCard label="Total Value" value={formatCurrency(stats.totalCost)} icon={DollarSign} valueClass="text-[#86BBD8]" />
        </div>

        {/* Filters */}
        <GlassPanel icon={Filter} title="Filters" variant="panel" {...sections.panel('filters')}>
          <div className="px-5 pb-4 pt-2 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <GlassInput icon={Search} placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} />
              <GlassSelect value={status} onChange={e => setStatus(e.target.value)}
                options={[{ value: 'all', label: 'All Statuses' }, ...STATUSES.map(s => ({ value: s, label: s }))]} />
              <GlassSelect value={priority} onChange={e => setPriority(e.target.value)}
                options={[{ value: 'all', label: 'All Priorities' }, ...PRIORITIES.map(p => ({ value: p, label: p }))]} />
              <GlassSelect value={section} onChange={e => setSection(e.target.value)}
                options={[{ value: 'all', label: 'All Sections' }, ...SECTIONS.map(s => ({ value: s, label: s }))]} />
              <GlassInput type="date" label="From" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
              <GlassInput type="date" label="To"   value={dateTo}   onChange={e => setDateTo(e.target.value)} />
              <div className="flex items-end">
                <GlassButton variant="ghost" size="sm" icon={X} onClick={() => { setSearch(''); setStatus('all'); setPriority('all'); setSection('all'); setDateFrom(''); setDateTo(''); }}>
                  Clear Filters
                </GlassButton>
              </div>
            </div>
          </div>
        </GlassPanel>

        {loading
          ? <LoadingPane message="Loading requisitions…" />
          : <GlassTabs tabs={tabs} defaultTab="records" />
        }

      </main>

      <ReqModal
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        onSave={handleSave}
        editing={editing}
      />

      {viewing && (
        <ReqDetailModal
          req={viewing}
          onClose={() => setViewing(null)}
          onEdit={() => { setEditing(viewing); setFormOpen(true); setViewing(null); }}
        />
      )}

      <DeleteDialog
        open={!!delTarget}
        onClose={() => setDelTarget(null)}
        onDelete={handleDelete}
        title="Delete Requisition"
        description={`Delete requisition ${delTarget?.requisitionNumber}? This cannot be undone.`}
      />
    </PageShell>
  );
}
