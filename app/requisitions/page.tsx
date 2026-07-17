// app/requisitions/page.tsx
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { api } from '@/lib/apiClient';
import { formatDate } from '@/lib/format';
import {
  ShoppingCart, Plus, Pencil, Trash2, Eye, Search, Filter,
  Zap, Wrench, Flag, DollarSign, FileText, BarChart3, X,
  CheckCircle2, Clock, XCircle,
} from '@/components/shared/theme';
import { AppShell } from '@/components/app-shell';
import {
  useTheme, PageHero, StatTile, StatusBadge, SearchInput,
  FormField, FormActions, useCollapseSection, CenterModal, ProgressBar, ACCENT_HEX, SelectField, LoadingState, AutofillInput,
} from '@/components/shared/theme';
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

const STATUS_CONFIG: Record<Requisition['status'], { color: string; icon: typeof CheckCircle2 }> = {
  Approved:   { color: '#34d399', icon: CheckCircle2 },
  Completed:  { color: '#34d399', icon: CheckCircle2 },
  Pending:    { color: '#f59e0b', icon: Clock },
  Processing: { color: '#f59e0b', icon: Clock },
  Rejected:   { color: '#f43f5e', icon: XCircle },
  Draft:      { color: '#94a3b8', icon: FileText },
};

const PRIORITY_COLOR: Record<Requisition['priority'], string> = {
  Critical: '#f43f5e', High: '#f97316', Medium: ACCENT_HEX.blue, Low: '#94a3b8',
};

function formatCurrency(v: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(v || 0);
}
const fmtDate = (d?: string) => formatDate(d);

// ─── API ──────────────────────────────────────────────────────────────────────


function fromBackend(d: Record<string, unknown>): Requisition {
  return {
    id: String(d.id),
    date: String(d.date ?? ''),
    requester: String(d.requester ?? ''),
    section: (d.section as Requisition['section']) ?? 'Mechanical',
    required_for: String(d.required_for ?? ''),
    priority: (d.priority as Requisition['priority']) ?? 'Medium',
    status: (d.status as Requisition['status']) ?? 'Draft',
    requisitionNumber: String(d.requisition_number ?? ''),
    notes: String(d.notes ?? ''),
    items: ((d.requisition_items ?? []) as Record<string, unknown>[]).map(i => ({
      description: String(i.description ?? ''),
      costPerUnit: Number(i.cost_per_unit ?? 0),
      quantity: Number(i.quantity ?? 1),
      reason: String(i.reason ?? ''),
    })),
    lineNumber: Number(d.line_number ?? 0),
    createdAt: String(d.created_at ?? ''),
    updatedAt: String(d.updated_at ?? ''),
  };
}

async function apiGet(): Promise<Requisition[]> {
  const data = await api.get<unknown[]>('/api/requisitions');
  return (Array.isArray(data) ? data : []).map(d => fromBackend(d as Record<string, unknown>));
}
async function apiCreate(body: object): Promise<Requisition> {
  return fromBackend(await api.post<Record<string, unknown>>('/api/requisitions', body));
}
async function apiUpdate(id: string, body: object): Promise<Requisition> {
  return fromBackend(await api.patch<Record<string, unknown>>(`/api/requisitions/${id}`, body));
}
async function apiDelete(id: string): Promise<void> {
  await api.delete(`/api/requisitions/${id}`);
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const itemTotal = (items: RequisitionItem[]) => items.reduce((s, i) => s + i.costPerUnit * i.quantity, 0);
const newItem = (): RequisitionItem => ({ description: '', costPerUnit: 0, quantity: 1, reason: '' });
const blankForm = (): Partial<Requisition> => ({
  date: new Date().toISOString().slice(0, 10),
  requester: '', section: 'Mechanical', required_for: '',
  priority: 'Medium', status: 'Draft',
  requisitionNumber: `REQ-${Date.now().toString().slice(-6)}`,
  items: [newItem()], notes: '',
});

// ─── Linked lookups ───────────────────────────────────────────────────────────

interface EmpOption { id: string; label: string; section: string; }
interface EquipOption { id: string; label: string; section: string; }

function useReqData(open: boolean) {
  const [employees, setEmployees] = useState<EmpOption[]>([]);
  const [equipment, setEquipment] = useState<EquipOption[]>([]);

  useEffect(() => {
    if (!open) return;
    Promise.all([
      api.get<any[]>('/api/employees').catch(() => []),
      api.get<any[]>('/api/equipment').catch(() => []),
    ]).then(([emps, equip]) => {
      setEmployees((Array.isArray(emps) ? emps : []).map((e: Record<string, unknown>) => ({
        id: String(e.employee_id ?? e.id ?? ''),
        label: `${e.first_name ?? ''} ${e.last_name ?? ''}`.trim() || String(e.name ?? ''),
        section: String(e.department ?? e.section ?? ''),
      })));
      setEquipment((Array.isArray(equip) ? equip : []).map((e: Record<string, unknown>) => ({
        id: String(e.id ?? ''),
        label: String(e.name ?? ''),
        section: String(e.location ?? e.department ?? e.category ?? ''),
      })));
    }).catch(() => {});
  }, [open]);

  return { employees, equipment };
}

// ─── Form modal ───────────────────────────────────────────────────────────────

function ReqModal({ open, onClose, onSave, editing }: {
  open: boolean; onClose: () => void; onSave: (data: object) => Promise<void>; editing: Requisition | null;
}) {
  const t = useTheme();
  const [form, setForm] = useState<Partial<Requisition>>(blankForm());
  const [saving, setSaving] = useState(false);
  const [empSearch, setEmpSearch] = useState('');
  const { employees, equipment } = useReqData(open);

  useEffect(() => {
    setForm(editing ? { ...editing, items: editing.items.length ? editing.items : [newItem()] } : blankForm());
  }, [editing, open]);

  const set = (p: Partial<Requisition>) => setForm(f => ({ ...f, ...p }));
  const setItem = (i: number, p: Partial<RequisitionItem>) =>
    setForm(f => ({ ...f, items: f.items!.map((it, idx) => idx === i ? { ...it, ...p } : it) }));
  const addItem = () => setForm(f => ({ ...f, items: [...(f.items ?? []), newItem()] }));
  const rmItem = (i: number) => setForm(f => ({ ...f, items: f.items!.filter((_, idx) => idx !== i) }));

  const total = itemTotal(form.items ?? []);
  const inputCls = `w-full h-9 px-3 rounded-lg text-sm ${t.inputBg} focus:outline-none`;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
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
          description: it.description, cost_per_unit: it.costPerUnit, quantity: it.quantity, reason: it.reason,
        })),
      };
      await onSave(payload);
      onClose();
    } catch (e2) { toast.error((e2 as Error).message); }
    finally { setSaving(false); }
  }

  return (
    <CenterModal open={open} onClose={onClose} title={editing ? `Edit ${editing.requisitionNumber}` : 'New Purchase Requisition'} accent="violet" width="max-w-3xl">
      <form onSubmit={handleSave} className="p-5 space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div className="md:col-span-2 relative">
            <FormField label="Requester" required>
              <input
                className={inputCls} placeholder="Type name to search employees…" autoComplete="off"
                value={form.requester ?? ''}
                onChange={e => { set({ requester: e.target.value }); setEmpSearch(e.target.value); }}
                onFocus={e => setEmpSearch(e.target.value)}
                onBlur={() => setTimeout(() => setEmpSearch(''), 200)}
              />
            </FormField>
            {empSearch.length >= 1 && (() => {
              const q = empSearch.toLowerCase();
              const hits = employees.filter(e => e.label.toLowerCase().includes(q)).slice(0, 6);
              if (!hits.length) return null;
              return (
                <div className={`absolute z-50 top-full left-0 right-0 mt-1 rounded-xl ${t.glass} ${t.shadow} overflow-hidden`}>
                  {hits.map(e => (
                    <button key={e.id} type="button"
                      onMouseDown={() => { set({ requester: e.label, section: (SECTIONS.includes(e.section as Requisition['section']) ? e.section : form.section) as Requisition['section'] }); setEmpSearch(''); }}
                      className={`w-full flex items-center justify-between px-3 py-2 text-xs ${t.hoverBgSoft} transition-colors text-left`}>
                      <span className={`font-medium ${t.textPrimary}`}>{e.label}</span>
                      <span className={`ml-3 truncate ${t.textFaint}`}>{e.id}{e.section ? ` · ${e.section}` : ''}</span>
                    </button>
                  ))}
                </div>
              );
            })()}
          </div>

          <FormField label="Date" required>
            <input type="date" title="Requisition date" className={inputCls} value={form.date ?? ''} onChange={e => set({ date: e.target.value })} />
          </FormField>

          <FormField label="Section">
            <SelectField size="form" title="Section" value={form.section ?? 'Mechanical'} onChange={v => set({ section: v as Requisition['section'] })}
              options={SECTIONS.map(s => ({ value: s, label: s }))} />
          </FormField>
          <FormField label="Priority">
            <SelectField size="form" title="Priority" value={form.priority ?? 'Medium'} onChange={v => set({ priority: v as Requisition['priority'] })}
              options={PRIORITIES.map(p => ({ value: p, label: p }))} />
          </FormField>
          <FormField label="Status">
            <SelectField size="form" title="Status" value={form.status ?? 'Draft'} onChange={v => set({ status: v as Requisition['status'] })}
              options={STATUSES.map(s => ({ value: s, label: s }))} />
          </FormField>

          <div className="md:col-span-2">
            <FormField label="Required For (Equipment / Asset)">
              <SelectField size="form" title="Required for" value={form.required_for ?? ''}
                onChange={v => {
                  const eq = equipment.find(x => x.label === v);
                  set({ required_for: v, ...(eq && SECTIONS.includes(eq.section as Requisition['section']) ? { section: eq.section as Requisition['section'] } : {}) });
                }}
                options={[{ value: '', label: '— Select equipment or type below —' }, ...equipment.map(eq => ({ value: eq.label, label: `${eq.label}${eq.section ? ` (${eq.section})` : ''}` }))]} />
              <input className={`${inputCls} mt-1.5`} placeholder="Or type manually (project, work order, other…)"
                value={equipment.find(eq => eq.label === form.required_for) ? '' : (form.required_for ?? '')}
                onChange={e => set({ required_for: e.target.value })} />
            </FormField>
          </div>

          <FormField label="Requisition #">
            <input className={inputCls} placeholder="e.g. REQ-001" value={form.requisitionNumber ?? ''} onChange={e => set({ requisitionNumber: e.target.value })} />
          </FormField>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-semibold uppercase tracking-wider ${t.textFaint}`}>Line Items</span>
            <button type="button" onClick={addItem} className="flex items-center gap-1 h-7 px-2.5 rounded-lg text-xs font-medium bg-brand-500/15 text-brand-400 hover:bg-brand-500/25 transition-colors">
              <Plus className="h-3 w-3" /> Add Item
            </button>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {(form.items ?? []).map((it, i) => (
              <div key={i} className={`grid grid-cols-12 gap-2 p-3 rounded-xl ${t.chipBg}`}>
                <div className="col-span-5">
                  <FormField label="Description" required>
                    <AutofillInput field="item_description" className={inputCls} placeholder="Item description" value={it.description} onChange={v => setItem(i, { description: v })} />
                  </FormField>
                </div>
                <div className="col-span-2">
                  <FormField label="Unit Cost">
                    <input type="number" min="0" step="0.01" title="Unit cost" placeholder="0.00" className={inputCls} value={it.costPerUnit} onChange={e => setItem(i, { costPerUnit: parseFloat(e.target.value) || 0 })} />
                  </FormField>
                </div>
                <div className="col-span-2">
                  <FormField label="Qty">
                    <input type="number" min="1" title="Quantity" placeholder="1" className={inputCls} value={it.quantity} onChange={e => setItem(i, { quantity: parseInt(e.target.value) || 1 })} />
                  </FormField>
                </div>
                <div className="col-span-2">
                  <FormField label="Reason">
                    <input className={inputCls} placeholder="Optional" value={it.reason} onChange={e => setItem(i, { reason: e.target.value })} />
                  </FormField>
                </div>
                <div className="col-span-1 flex items-end pb-0.5">
                  <button type="button" title="Remove item" aria-label="Remove item" onClick={() => rmItem(i)} disabled={(form.items?.length ?? 0) <= 1}
                    className={`h-9 w-9 flex items-center justify-center rounded-lg ${t.textFaint} hover:text-rose-500 hover:bg-rose-500/10 transition-all disabled:opacity-20`}>
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-end mt-2">
            <span className={`text-xs ${t.textFaint}`}>
              {(form.items ?? []).length} item{(form.items ?? []).length !== 1 ? 's' : ''} · <span className={`font-semibold ${t.textPrimary}`}>{formatCurrency(total)}</span>
            </span>
          </div>
        </div>

        <FormField label="Notes (optional)">
          <textarea value={form.notes ?? ''} onChange={e => set({ notes: e.target.value })} rows={2} placeholder="Any additional notes…" className={`${inputCls} h-auto py-2 resize-none`} />
        </FormField>

        <div className={`flex items-center justify-between pt-2 border-t ${t.border}`}>
          <span className={`text-sm ${t.textFaint}`}>Total: <span className={`font-bold ${t.textPrimary}`}>{formatCurrency(total)}</span></span>
        </div>
        <FormActions onCancel={onClose} submitting={saving} submitLabel={editing ? 'Update' : 'Create'} accent="violet" />
      </form>
    </CenterModal>
  );
}

// ─── Detail modal ─────────────────────────────────────────────────────────────

function ReqDetailModal({ req, onClose, onEdit }: { req: Requisition; onClose: () => void; onEdit: () => void; }) {
  const t = useTheme();
  const total = itemTotal(req.items);
  const SIcon = req.section === 'Electrical' ? Zap : Wrench;
  const sCfg = STATUS_CONFIG[req.status];

  return (
    <CenterModal open onClose={onClose} title={`Requisition ${req.requisitionNumber}`} accent="violet" width="max-w-2xl">
      <div className="p-5 space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Requester', value: req.requester },
            { label: 'Date', value: fmtDate(req.date) },
            { label: 'Required For', value: req.required_for || '—' },
            { label: 'Ref#', value: `#${req.lineNumber}` },
          ].map(({ label, value }) => (
            <div key={label} className={`${t.chipBg} rounded-xl p-3`}>
              <p className={`text-[10px] uppercase tracking-wide mb-0.5 ${t.textFaint}`}>{label}</p>
              <p className={`text-sm font-medium ${t.textMuted}`}>{value}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-2 flex-wrap">
          <StatusBadge color={sCfg.color} label={req.status} dot />
          <StatusBadge color={PRIORITY_COLOR[req.priority]} label={req.priority} />
          <StatusBadge color={ACCENT_HEX.blue} label={req.section} />
          <StatusBadge color="#34d399" label={formatCurrency(total)} />
        </div>

        <div className={`rounded-xl ${t.chipBg} overflow-hidden`}>
          <table className="w-full text-xs">
            <thead>
              <tr className={`border-b ${t.border}`}>
                {['Description', 'Reason', 'Unit Cost', 'Qty', 'Total'].map(h => (
                  <th key={h} className={`px-3 py-2 text-left font-semibold uppercase tracking-wider text-[10px] ${t.textFaint}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {req.items.map((it, i) => (
                <tr key={i} className={`border-b ${t.border} ${t.hoverBgSoft}`}>
                  <td className={`px-3 py-2 font-medium ${t.textMuted}`}>{it.description}</td>
                  <td className={`px-3 py-2 ${t.textFaint}`}>{it.reason || '—'}</td>
                  <td className={`px-3 py-2 ${t.textMuted}`}>{formatCurrency(it.costPerUnit)}</td>
                  <td className={`px-3 py-2 ${t.textMuted}`}>{it.quantity}</td>
                  <td className={`px-3 py-2 font-semibold ${t.textPrimary}`}>{formatCurrency(it.costPerUnit * it.quantity)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className={`border-t ${t.border}`}>
                <td colSpan={4} className={`px-3 py-2 text-right text-xs font-semibold ${t.textFaint}`}>TOTAL</td>
                <td className={`px-3 py-2 font-bold ${t.textPrimary}`}>{formatCurrency(total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        {req.notes && (
          <div className={`${t.chipBg} rounded-xl p-3`}>
            <p className={`text-[10px] uppercase tracking-wide mb-1 ${t.textFaint}`}>Notes</p>
            <p className={`text-sm ${t.textMuted}`}>{req.notes}</p>
          </div>
        )}

        <div className="flex gap-2">
          <button type="button" onClick={onClose} className={`flex-1 py-2.5 rounded-xl text-sm ${t.textMuted} ${t.hoverText} border ${t.border} transition-all`}>Close</button>
          <button type="button" onClick={() => { onClose(); onEdit(); }}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-br from-brand-500 to-brand-700 hover:brightness-110 transition-all inline-flex items-center justify-center gap-2">
            <Pencil className="h-4 w-4" /> Edit
          </button>
        </div>
      </div>
    </CenterModal>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

function RequisitionsPageContent() {
  const t = useTheme();
  const sections = useCollapseSection({ hero: true });

  const [reqs, setReqs] = useState<Requisition[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<'records' | 'analytics'>('records');

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [priority, setPriority] = useState('all');
  const [section, setSection] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Requisition | null>(null);
  const [viewing, setViewing] = useState<Requisition | null>(null);
  const [delTarget, setDelTarget] = useState<Requisition | null>(null);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true); else setRefreshing(true);
    try { setReqs(await apiGet()); }
    catch (e) { toast.error(`Load failed: ${(e as Error).message}`); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => reqs.filter(r => {
    if (status !== 'all' && r.status !== status) return false;
    if (priority !== 'all' && r.priority !== priority) return false;
    if (section !== 'all' && r.section !== section) return false;
    if (dateFrom && r.date < dateFrom) return false;
    if (dateTo && r.date > dateTo) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!r.requester.toLowerCase().includes(q) &&
          !r.requisitionNumber.toLowerCase().includes(q) &&
          !r.required_for.toLowerCase().includes(q) &&
          !r.items.some(i => i.description.toLowerCase().includes(q))) return false;
    }
    return true;
  }), [reqs, status, priority, section, dateFrom, dateTo, search]);

  const stats = useMemo(() => {
    const totalCost = filtered.reduce((s, r) => s + itemTotal(r.items), 0);
    const pending = filtered.filter(r => r.status === 'Pending').length;
    const approved = filtered.filter(r => r.status === 'Approved').length;
    const critical = filtered.filter(r => r.priority === 'Critical').length;
    return { totalCost, pending, approved, critical, total: filtered.length };
  }, [filtered]);

  const byStatus = useMemo(() => STATUSES.map(s => ({
    label: s, count: filtered.filter(r => r.status === s).length,
    cost: filtered.filter(r => r.status === s).reduce((a, r) => a + itemTotal(r.items), 0),
  })).filter(s => s.count > 0), [filtered]);

  const byPriority = useMemo(() => PRIORITIES.map(p => ({
    label: p, count: filtered.filter(r => r.priority === p).length,
  })).filter(p => p.count > 0), [filtered]);

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
    setDelTarget(null);
  }

  const clearFilters = () => { setSearch(''); setStatus('all'); setPriority('all'); setSection('all'); setDateFrom(''); setDateTo(''); };
  const hasFilters = search !== '' || status !== 'all' || priority !== 'all' || section !== 'all' || !!dateFrom || !!dateTo;

  return (
    <main className="max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <PageHero
        icon={ShoppingCart}
        accent="violet"
        crumbs={['Operations & Maintenance', 'Requisitions']}
        title="Purchase Requisitions"
        description="Raise, track and approve purchase requests"
        statsOpen={sections.expanded.hero}
        actions={
          <button type="button" onClick={() => { setEditing(null); setFormOpen(true); }}
            className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-[13px] font-semibold text-white bg-gradient-to-br from-brand-500 to-brand-700 hover:brightness-110 transition-all">
            <Plus className="h-3.5 w-3.5" /> New Requisition
          </button>
        }
      >
        <div className="flex flex-wrap gap-1">
          <StatTile icon={ShoppingCart} color={ACCENT_HEX.blue} value={stats.total} label="Total" />
          <StatTile icon={Clock} color="#f59e0b" value={stats.pending} label="Pending" onClick={() => setStatus('Pending')} />
          <StatTile icon={CheckCircle2} color="#34d399" value={stats.approved} label="Approved" onClick={() => setStatus('Approved')} />
          <StatTile icon={Flag} color="#f43f5e" value={stats.critical} label="Critical" onClick={() => setPriority('Critical')} />
          <StatTile icon={DollarSign} color={ACCENT_HEX.violet} value={formatCurrency(stats.totalCost)} label="Total Value" />
        </div>
      </PageHero>

      {/* Filters */}
      <div className={`${t.glass} rounded-2xl ${t.shadow} p-4 space-y-4`}>
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <SearchInput value={search} onChange={setSearch} placeholder="Search requisitions…" className="flex-1" />
          <div className="flex gap-2 flex-wrap items-center">
            <button type="button" onClick={() => setShowFilters(v => !v)}
              className={`flex items-center gap-1.5 h-8 px-3 rounded-lg text-[13px] font-medium transition-colors ${showFilters ? 'bg-brand-500/15 text-brand-400' : `${t.textMuted} ${t.glassSoft} ${t.hoverText}`}`}>
              <Filter className="h-3.5 w-3.5" /> Filters
            </button>
            {hasFilters && (
              <button type="button" onClick={clearFilters} className={`flex items-center gap-1.5 h-8 px-3 rounded-lg text-[13px] font-medium ${t.textFaint} ${t.hoverText} ${t.hoverBg} transition-colors`}>
                <X className="h-3.5 w-3.5" /> Clear
              </button>
            )}
          </div>
        </div>
        {showFilters && (
          <div className={`pt-4 border-t ${t.border} grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3`}>
            <FormField label="Status">
              <SelectField size="filter" title="Status" value={status} onChange={setStatus}
                options={[{ value: 'all', label: 'All Statuses' }, ...STATUSES.map(s => ({ value: s, label: s }))]} />
            </FormField>
            <FormField label="Priority">
              <SelectField size="filter" title="Priority" value={priority} onChange={setPriority}
                options={[{ value: 'all', label: 'All Priorities' }, ...PRIORITIES.map(p => ({ value: p, label: p }))]} />
            </FormField>
            <FormField label="Section">
              <SelectField size="filter" title="Section" value={section} onChange={setSection}
                options={[{ value: 'all', label: 'All Sections' }, ...SECTIONS.map(s => ({ value: s, label: s }))]} />
            </FormField>
            <FormField label="From">
              <input type="date" title="From date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className={`w-full h-8 px-2 rounded text-[13px] ${t.inputBg} focus:outline-none`} />
            </FormField>
            <FormField label="To">
              <input type="date" title="To date" value={dateTo} onChange={e => setDateTo(e.target.value)} className={`w-full h-8 px-2 rounded text-[13px] ${t.inputBg} focus:outline-none`} />
            </FormField>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className={`flex gap-1 ${t.glassSoft} rounded-lg p-1 w-fit`}>
        {([{ id: 'records', label: 'Records', icon: FileText }, { id: 'analytics', label: 'Analytics', icon: BarChart3 }] as const).map(tb => (
          <button key={tb.id} type="button" onClick={() => setTab(tb.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${tab === tb.id ? 'bg-brand-500/20 text-brand-400' : `${t.textFaint} ${t.hoverText}`}`}>
            <tb.icon className="h-3.5 w-3.5" /> {tb.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className={`${t.glass} rounded-2xl p-16 text-center`}>
          <LoadingState />
        </div>
      ) : tab === 'records' ? (
        <div className={`${t.glass} rounded-2xl ${t.shadow} overflow-hidden`}>
          <div className={`flex items-center justify-between px-4 py-3 border-b ${t.border}`}>
            <h3 className={`text-sm font-semibold ${t.textPrimary}`}>Requisitions ({filtered.length})</h3>
            <button type="button" onClick={() => { setEditing(null); setFormOpen(true); }}
              className="flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-xs font-medium bg-brand-500/15 text-brand-400 hover:bg-brand-500/25 transition-colors">
              <Plus className="h-3 w-3" /> New Req
            </button>
          </div>
          {filtered.length === 0 ? (
            <div className="p-12 text-center">
              <ShoppingCart className={`h-12 w-12 ${t.textFaint} mx-auto mb-4`} />
              <h3 className={`text-lg font-semibold ${t.textPrimary} mb-2`}>No requisitions</h3>
              <p className={`text-sm mb-4 ${t.textFaint}`}>Adjust filters or create your first requisition.</p>
              <button type="button" onClick={() => { setEditing(null); setFormOpen(true); }}
                className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg text-[13px] font-semibold text-white bg-gradient-to-br from-brand-500 to-brand-700 hover:brightness-110 transition-all">
                <Plus className="h-3.5 w-3.5" /> New Req
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className={`border-b ${t.border}`}>
                    {['Req #', 'Date', 'Requester', 'Section', 'Priority', 'Status', 'Cost', ''].map(h => (
                      <th key={h} className={`text-left p-3 text-xs font-semibold uppercase tracking-wide ${t.textFaint}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(r => {
                    const c = STATUS_CONFIG[r.status];
                    const SecIcon = r.section === 'Electrical' ? Zap : Wrench;
                    return (
                      <tr key={r.id} className={`border-b ${t.border} ${t.hoverBgSoft} cursor-pointer`} onClick={() => setViewing(r)}>
                        <td className="p-3">
                          <p className="font-mono text-xs font-semibold text-brand-400">{r.requisitionNumber}</p>
                          <p className={`text-[10px] ${t.textFaint}`}>#{r.lineNumber}</p>
                        </td>
                        <td className={`p-3 text-xs ${t.textMuted}`}>{fmtDate(r.date)}</td>
                        <td className={`p-3 font-medium ${t.textMuted}`}>{r.requester}</td>
                        <td className="p-3"><span className={`inline-flex items-center gap-1 text-xs ${t.textFaint}`}><SecIcon className="h-3 w-3" />{r.section}</span></td>
                        <td className="p-3"><StatusBadge color={PRIORITY_COLOR[r.priority]} label={r.priority} /></td>
                        <td className="p-3"><StatusBadge color={c.color} label={r.status} dot /></td>
                        <td className={`p-3 font-semibold text-sm ${t.textPrimary}`}>{formatCurrency(itemTotal(r.items))}</td>
                        <td className="p-3" onClick={e => e.stopPropagation()}>
                          <div className="flex gap-1 justify-end">
                            <button type="button" title="View" onClick={() => setViewing(r)} className={`h-7 w-7 flex items-center justify-center rounded-lg ${t.hoverBg} ${t.textFaint} ${t.hoverText}`}><Eye className="h-3.5 w-3.5" /></button>
                            <button type="button" title="Edit" onClick={() => { setEditing(r); setFormOpen(true); }} className="h-7 w-7 flex items-center justify-center rounded-lg bg-brand-500/10 hover:bg-brand-500/20 text-brand-400"><Pencil className="h-3.5 w-3.5" /></button>
                            <button type="button" title="Delete" onClick={() => setDelTarget(r)} className={`h-7 w-7 flex items-center justify-center rounded-lg ${t.hoverBg} ${t.textFaint} hover:text-rose-500`}><Trash2 className="h-3.5 w-3.5" /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className={`${t.glass} rounded-2xl ${t.shadow} p-5`}>
            <h3 className={`text-sm font-semibold mb-3 ${t.textPrimary}`}>By Status</h3>
            <div className="space-y-3">
              {byStatus.map(({ label, count, cost }) => {
                const c = STATUS_CONFIG[label as Requisition['status']];
                const pct = stats.total > 0 ? (count / stats.total) * 100 : 0;
                return (
                  <div key={label}>
                    <div className="flex justify-between text-xs mb-1">
                      <StatusBadge color={c.color} label={label} />
                      <div className="text-right">
                        <span className={`font-semibold ${t.textPrimary}`}>{count}</span>
                        <span className={`ml-2 ${t.textFaint}`}>{formatCurrency(cost)}</span>
                      </div>
                    </div>
                    <ProgressBar value={pct} color={c.color} showValue={false} />
                  </div>
                );
              })}
              {byStatus.length === 0 && <p className={`text-sm text-center py-6 ${t.textFaint}`}>No data</p>}
            </div>
          </div>

          <div className={`${t.glass} rounded-2xl ${t.shadow} p-5`}>
            <h3 className={`text-sm font-semibold mb-3 ${t.textPrimary}`}>By Priority</h3>
            <div className="space-y-3">
              {byPriority.map(({ label, count }) => {
                const maxP = Math.max(1, ...byPriority.map(p => p.count));
                return (
                  <div key={label}>
                    <div className="flex justify-between mb-1 text-xs">
                      <span className="font-semibold" style={{ color: PRIORITY_COLOR[label as Requisition['priority']] }}>{label}</span>
                      <span className={`font-bold ${t.textPrimary}`}>{count}</span>
                    </div>
                    <ProgressBar value={(count / maxP) * 100} color={PRIORITY_COLOR[label as Requisition['priority']]} showValue={false} />
                  </div>
                );
              })}
              {byPriority.length === 0 && <p className={`text-sm text-center py-6 ${t.textFaint}`}>No data</p>}
            </div>
          </div>

          <div className={`${t.glass} rounded-2xl ${t.shadow} p-5`}>
            <h3 className={`text-sm font-semibold mb-3 ${t.textPrimary}`}>Section Split</h3>
            <div className="space-y-4">
              {SECTIONS.map(s => {
                const cnt = filtered.filter(r => r.section === s).length;
                const cost = filtered.filter(r => r.section === s).reduce((a, r) => a + itemTotal(r.items), 0);
                const pct = stats.total > 0 ? (cnt / stats.total) * 100 : 0;
                const Icon = s === 'Electrical' ? Zap : Wrench;
                return (
                  <div key={s}>
                    <div className="flex items-center justify-between mb-1 text-xs">
                      <span className={`flex items-center gap-1.5 ${t.textMuted}`}><Icon className="h-3 w-3" />{s}</span>
                      <span className={`font-semibold ${t.textPrimary}`}>{cnt} <span className={t.textFaint}>({formatCurrency(cost)})</span></span>
                    </div>
                    <ProgressBar value={pct} color={ACCENT_HEX.blue} showValue={false} />
                  </div>
                );
              })}
            </div>
          </div>

          <div className={`${t.glass} rounded-2xl ${t.shadow} p-5`}>
            <h3 className={`text-sm font-semibold mb-3 ${t.textPrimary}`}>Value Summary</h3>
            <div className="space-y-2 text-sm">
              {[
                { label: 'Total filtered value', val: formatCurrency(stats.totalCost), c: ACCENT_HEX.violet },
                { label: 'Avg per requisition', val: formatCurrency(stats.total > 0 ? stats.totalCost / stats.total : 0), c: undefined },
                { label: 'Pending value', val: formatCurrency(filtered.filter(r => r.status === 'Pending').reduce((a, r) => a + itemTotal(r.items), 0)), c: '#f59e0b' },
                { label: 'Approved value', val: formatCurrency(filtered.filter(r => r.status === 'Approved').reduce((a, r) => a + itemTotal(r.items), 0)), c: '#34d399' },
              ].map(({ label, val, c }) => (
                <div key={label} className={`flex justify-between ${t.textMuted}`}>
                  <span>{label}</span>
                  <span className="font-bold" style={c ? { color: c } : undefined}>{val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <ReqModal open={formOpen} onClose={() => { setFormOpen(false); setEditing(null); }} onSave={handleSave} editing={editing} />

      {viewing && (
        <ReqDetailModal req={viewing} onClose={() => setViewing(null)} onEdit={() => { setEditing(viewing); setFormOpen(true); setViewing(null); }} />
      )}

      <CenterModal open={!!delTarget} onClose={() => setDelTarget(null)} title="Delete Requisition" accent="amber" width="max-w-sm">
        <div className="p-5 space-y-4">
          <p className={`text-sm ${t.textMuted}`}>Delete requisition {delTarget?.requisitionNumber}? This cannot be undone.</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setDelTarget(null)} className={`flex-1 py-2.5 rounded-xl text-sm ${t.textMuted} ${t.hoverText} border ${t.border} transition-all`}>Cancel</button>
            <button type="button" onClick={handleDelete} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-br from-rose-500 to-rose-700 hover:brightness-110 transition-all inline-flex items-center justify-center gap-2">
              <Trash2 className="h-4 w-4" /> Delete
            </button>
          </div>
        </div>
      </CenterModal>
    </main>
  );
}

export default function RequisitionsPage() {
  return (
    <AppShell>
      <RequisitionsPageContent />
    </AppShell>
  );
}
