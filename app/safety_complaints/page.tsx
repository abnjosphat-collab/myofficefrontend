// app/safety_complaints/page.tsx — Safety Complaints Register
'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  MessageSquareWarning, Plus, Search, X, RefreshCw, Loader2, Check,
  ChevronDown, ChevronUp, ChevronRight, Calendar, User, ClipboardList,
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Clock,
  BarChart3, PieChart, ArrowUpRight, Pencil, Trash2, Filter,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageShell } from '@/components/PageShell';
import {
  SafetyHero, SafetyControls, SafetySearchBar, SafetyPanel,
  SafetyTable, FilterPills, AddButton, ClearFiltersButton,
  DateRangeFilter, StatusBadge, PriorityBadge, safetyFetch,
  LoadingState, EmptyState, FormField, ModalActions, SafetyModal,
  glassInput, glassLabel, glassSelect, glassTextarea,
} from '@/components/safety';
import { usePageCollapse, MasterCollapseButton } from '@/components/shared';

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface Complaint {
  id: string;
  date: string;
  raisedBy: string;
  issueRaised: string;
  category: string;
  priority: string;
  section: string;
  location: string;
  actionPlan: string;
  byWho: string;
  byWhen: string;
  supervisorName: string;
  supervisorSignature: string;
  dateClosed: string | null;
  status: string;
  submittedAt: string;
}

type Tab = 'records' | 'analytics';

const CATEGORIES = ['Safety', 'Health', 'Environment', 'Quality', 'General', 'Other'];
const PRIORITIES = ['low', 'medium', 'high', 'critical'];
const SECTIONS   = ['Mechanical', 'Electrical', 'General'];
const STATUSES   = ['open', 'in-progress', 'closed', 'overdue'];

const ACCENT = '#f43f5e'; // rose — complaint / alert colour

// ─── API ──────────────────────────────────────────────────────────────────────

const BASE = '/api/safety-complaints';

// The backend uses snake_case; the frontend Complaint interface uses camelCase.
// This converts before every POST / PATCH.
function toSnake(d: Partial<Complaint>): Record<string, unknown> {
  return {
    date:                d.date,
    raised_by:           d.raisedBy           ?? '',
    issue_raised:        d.issueRaised         ?? '',
    category:            d.category            ?? 'General',
    priority:            d.priority            ?? 'medium',
    section:             d.section             ?? 'General',
    location:            d.location            ?? '',
    action_plan:         d.actionPlan          ?? '',
    by_who:              d.byWho               ?? '',
    by_when:             d.byWhen              ?? '',
    supervisor_name:     d.supervisorName      ?? '',
    supervisor_signature:d.supervisorSignature ?? '',
    date_closed:         d.dateClosed || null,
    status:              d.status              ?? 'open',
  };
}

const api = {
  list: () => safetyFetch<Complaint[]>(BASE + '/'),
  create: (d: Partial<Complaint>) => safetyFetch<Complaint>(BASE + '/', {
    method: 'POST', body: JSON.stringify(toSnake(d)),
  }),
  update: (id: string, d: Partial<Complaint>) => safetyFetch<Complaint>(`${BASE}/${id}`, {
    method: 'PATCH', body: JSON.stringify(toSnake(d)),
  }),
  remove: (id: string) => safetyFetch<void>(`${BASE}/${id}`, { method: 'DELETE' }),
};

// ─── STATS ────────────────────────────────────────────────────────────────────

interface Stats {
  total: number; open: number; inProgress: number;
  closed: number; overdue: number;
  closureRate: number;
  byCategory: Record<string, number>;
  bySection: Record<string, number>;
  bySupervisor: Record<string, number>;
  byPriority: Record<string, number>;
  monthlyTrend: { month: string; total: number; closed: number }[];
}

function calcStats(complaints: Complaint[]): Stats {
  const total     = complaints.length;
  const open      = complaints.filter(c => c.status === 'open').length;
  const inProgress = complaints.filter(c => c.status === 'in-progress').length;
  const closed    = complaints.filter(c => c.status === 'closed').length;
  const overdue   = complaints.filter(c => c.status === 'overdue').length;
  const closureRate = total > 0 ? Math.round((closed / total) * 100) : 0;

  const byCategory:   Record<string, number> = {};
  const bySection:    Record<string, number> = {};
  const bySupervisor: Record<string, number> = {};
  const byPriority:   Record<string, number> = {};
  const monthMap:     Record<string, { total: number; closed: number }> = {};

  for (const c of complaints) {
    if (c.category)       byCategory[c.category]   = (byCategory[c.category]   || 0) + 1;
    if (c.section)        bySection[c.section]     = (bySection[c.section]     || 0) + 1;
    if (c.priority)       byPriority[c.priority]   = (byPriority[c.priority]   || 0) + 1;
    if (c.supervisorName) bySupervisor[c.supervisorName] = (bySupervisor[c.supervisorName] || 0) + 1;

    if (c.date) {
      const m = c.date.slice(0, 7); // YYYY-MM
      if (!monthMap[m]) monthMap[m] = { total: 0, closed: 0 };
      monthMap[m].total++;
      if (c.status === 'closed') monthMap[m].closed++;
    }
  }

  const monthlyTrend = Object.entries(monthMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([month, v]) => ({ month, ...v }));

  return { total, open, inProgress, closed, overdue, closureRate, byCategory, bySection, bySupervisor, byPriority, monthlyTrend };
}

// ─── FORM ─────────────────────────────────────────────────────────────────────

const blank = (): Partial<Complaint> => ({
  date: new Date().toISOString().slice(0, 10),
  raisedBy: '', issueRaised: '', category: 'General',
  priority: 'medium', section: 'General', location: '',
  actionPlan: '', byWho: '', byWhen: '',
  supervisorName: '', supervisorSignature: '',
  dateClosed: '', status: 'open',
});

function ComplaintForm({
  open, onClose, initial, onSave,
}: {
  open: boolean; onClose: () => void;
  initial?: Partial<Complaint>; onSave: (d: Partial<Complaint>) => Promise<void>;
}) {
  const [form, setForm] = useState<Partial<Complaint>>(blank);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(initial ? { ...blank(), ...initial } : blank());
  }, [initial, open]);

  const set = (k: keyof Complaint, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    if (!form.issueRaised?.trim()) { toast.error('Issue description is required'); return; }
    if (!form.date) { toast.error('Date is required'); return; }
    setSaving(true);
    try { await onSave(form); onClose(); }
    catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  if (!open) return null;
  return (
    <SafetyModal open={open} onClose={onClose} title={initial?.id ? 'Edit Complaint' : 'New Safety Complaint'}
      icon={MessageSquareWarning} accentColor={ACCENT}>
      <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
        {/* Row 1 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField label="Date" required>
            <input type="date" value={form.date || ''} onChange={e => set('date', e.target.value)}
              className={glassInput} style={{ colorScheme: 'dark' }} />
          </FormField>
          <FormField label="Raised By (optional)">
            <input type="text" value={form.raisedBy || ''} onChange={e => set('raisedBy', e.target.value)}
              placeholder="Name of person raising" className={glassInput} />
          </FormField>
        </div>

        {/* Issue */}
        <FormField label="Issue Raised" required>
          <textarea value={form.issueRaised || ''} onChange={e => set('issueRaised', e.target.value)}
            placeholder="Describe the safety complaint in detail…" rows={3}
            className={glassTextarea} />
        </FormField>

        {/* Row 2 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <FormField label="Category">
            <select value={form.category || 'General'} onChange={e => set('category', e.target.value)}
              className={glassSelect} style={{ colorScheme: 'dark' }}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </FormField>
          <FormField label="Section">
            <select value={form.section || 'General'} onChange={e => set('section', e.target.value)}
              className={glassSelect} style={{ colorScheme: 'dark' }}>
              {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </FormField>
          <FormField label="Priority">
            <select value={form.priority || 'medium'} onChange={e => set('priority', e.target.value)}
              className={glassSelect} style={{ colorScheme: 'dark' }}>
              {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
            </select>
          </FormField>
        </div>

        <FormField label="Location">
          <input type="text" value={form.location || ''} onChange={e => set('location', e.target.value)}
            placeholder="Where was the complaint raised?" className={glassInput} />
        </FormField>

        {/* Action Plan */}
        <FormField label="Action Plan">
          <textarea value={form.actionPlan || ''} onChange={e => set('actionPlan', e.target.value)}
            placeholder="Describe the corrective action plan…" rows={2}
            className={glassTextarea} />
        </FormField>

        {/* Row 3 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField label="By Who">
            <input type="text" value={form.byWho || ''} onChange={e => set('byWho', e.target.value)}
              placeholder="Responsible person" className={glassInput} />
          </FormField>
          <FormField label="By When">
            <input type="date" value={form.byWhen || ''} onChange={e => set('byWhen', e.target.value)}
              className={glassInput} style={{ colorScheme: 'dark' }} />
          </FormField>
        </div>

        {/* Supervisor */}
        <div className="rounded-xl p-3 bg-white/[0.03] border border-white/[0.07] space-y-3">
          <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">Foreman / Supervisor</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="Name">
              <input type="text" value={form.supervisorName || ''} onChange={e => set('supervisorName', e.target.value)}
                placeholder="Supervisor / Foreman name" className={glassInput} />
            </FormField>
            <FormField label="Signature (initials)">
              <input type="text" value={form.supervisorSignature || ''} onChange={e => set('supervisorSignature', e.target.value)}
                placeholder="e.g. J.D." className={glassInput} />
            </FormField>
          </div>
        </div>

        {/* Status + Close date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField label="Status">
            <select value={form.status || 'open'} onChange={e => set('status', e.target.value)}
              className={glassSelect} style={{ colorScheme: 'dark' }}>
              {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
          </FormField>
          <FormField label="Date Closed">
            <input type="date" value={form.dateClosed || ''} onChange={e => set('dateClosed', e.target.value)}
              className={glassInput} style={{ colorScheme: 'dark' }} />
          </FormField>
        </div>
      </div>
      <ModalActions onCancel={onClose} onSubmit={handleSubmit}
        submitLabel={initial?.id ? 'Update' : 'Submit'} submitting={saving} />
    </SafetyModal>
  );
}

// ─── DETAIL MODAL ─────────────────────────────────────────────────────────────

function DetailModal({ complaint, onClose, onEdit }: {
  complaint: Complaint | null; onClose: () => void; onEdit: (c: Complaint) => void;
}) {
  if (!complaint) return null;
  const Row = ({ label, value, full }: { label: string; value?: string | null; full?: boolean }) => (
    value ? (
      <div className={full ? 'col-span-2' : ''}>
        <p className={glassLabel}>{label}</p>
        <p className="text-sm text-white/85">{value}</p>
      </div>
    ) : null
  );
  return (
    <SafetyModal open={!!complaint} onClose={onClose} title="Complaint Detail"
      icon={MessageSquareWarning} accentColor={ACCENT} width="max-w-2xl">
      <div className="px-5 py-4 space-y-4 max-h-[72vh] overflow-y-auto">
        {/* Badges row */}
        <div className="flex flex-wrap gap-2">
          <StatusBadge status={complaint.status} />
          <PriorityBadge priority={complaint.priority} />
          <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full"
            style={{ color: '#86BBD8', background: '#86BBD820', border: '1px solid #86BBD835' }}>
            {complaint.category}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-3">
          <Row label="Date"         value={complaint.date} />
          <Row label="Raised By"    value={complaint.raisedBy || 'Anonymous'} />
          <Row label="Section"      value={complaint.section} />
          <Row label="Location"     value={complaint.location} />
          <Row label="Issue Raised" value={complaint.issueRaised} full />
          <Row label="Action Plan"  value={complaint.actionPlan} full />
          <Row label="By Who"       value={complaint.byWho} />
          <Row label="By When"      value={complaint.byWhen} />
          <Row label="Supervisor"   value={complaint.supervisorName} />
          <Row label="Signature"    value={complaint.supervisorSignature} />
          <Row label="Date Closed"  value={complaint.dateClosed || undefined} />
        </div>
      </div>
      <div className="flex gap-2 px-5 py-4 border-t border-white/[0.08]">
        <button type="button" onClick={onClose}
          className="flex-1 py-2.5 rounded-xl text-sm text-white/50 hover:text-white border border-white/10 hover:border-white/20 transition-all">
          Close
        </button>
        <button type="button" onClick={() => { onClose(); onEdit(complaint); }}
          className="flex-1 py-2.5 rounded-xl text-sm font-medium text-[#86BBD8] hover:text-white border border-[#86BBD8]/25 hover:border-[#86BBD8]/50 transition-all">
          Edit
        </button>
      </div>
    </SafetyModal>
  );
}

// ─── MINI CHART COMPONENTS ────────────────────────────────────────────────────

function BarChart({ data, color = '#86BBD8', label }: {
  data: { key: string; value: number }[]; color?: string; label: string;
}) {
  if (!data.length) return <p className="text-xs text-white/30 py-6 text-center">No data</p>;
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div>
      <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-3">{label}</p>
      <div className="space-y-2">
        {data.map(d => (
          <div key={d.key} className="flex items-center gap-2">
            <span className="text-[11px] text-white/55 w-24 truncate shrink-0">{d.key}</span>
            <div className="flex-1 h-5 rounded bg-white/[0.06] overflow-hidden">
              <div
                className="h-full rounded transition-all duration-700"
                style={{ width: `${(d.value / max) * 100}%`, background: color }}
              />
            </div>
            <span className="text-[11px] font-semibold w-6 text-right shrink-0" style={{ color }}>{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ClosureGauge({ rate, total, closed }: { rate: number; total: number; closed: number }) {
  const r = 42;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (rate / 100) * circumference;
  const color = rate >= 80 ? '#34d399' : rate >= 50 ? '#f59e0b' : '#f43f5e';
  return (
    <div className="flex flex-col items-center gap-2 py-2">
      <div className="relative">
        <svg width="110" height="110" className="-rotate-90">
          <circle cx="55" cy="55" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="10" />
          <circle cx="55" cy="55" r={r} fill="none" stroke={color} strokeWidth="10"
            strokeDasharray={circumference} strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1s ease' }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-white leading-none">{rate}%</span>
          <span className="text-[10px] text-white/40 mt-0.5">closed</span>
        </div>
      </div>
      <div className="flex items-center gap-4 text-xs text-white/50">
        <span><span className="text-white font-semibold">{closed}</span> closed</span>
        <span><span className="text-white font-semibold">{total}</span> total</span>
      </div>
    </div>
  );
}

function TrendChart({ data }: { data: { month: string; total: number; closed: number }[] }) {
  if (!data.length) return <p className="text-xs text-white/30 py-6 text-center">No data</p>;
  const max = Math.max(...data.map(d => d.total), 1);
  return (
    <div>
      <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-3">Monthly Trend (last 6 months)</p>
      <div className="flex items-end gap-2 h-28 mt-1">
        {data.map(d => (
          <div key={d.month} className="flex-1 flex flex-col items-center gap-1">
            <div className="relative w-full flex flex-col items-center gap-0.5" style={{ height: '80px' }}>
              {/* Total bar */}
              <div className="absolute bottom-0 w-full rounded-t bg-white/10"
                style={{ height: `${(d.total / max) * 80}px` }} />
              {/* Closed bar */}
              <div className="absolute bottom-0 w-full rounded-t transition-all duration-700"
                style={{ height: `${(d.closed / max) * 80}px`, background: '#34d399' }} />
            </div>
            <span className="text-[9px] text-white/30 truncate w-full text-center">
              {d.month.slice(5)}
            </span>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-4 mt-2 text-[10px] text-white/45">
        <span><span className="inline-block h-2 w-3 rounded-sm bg-white/20 mr-1" />Total</span>
        <span><span className="inline-block h-2 w-3 rounded-sm bg-emerald-400 mr-1" />Closed</span>
      </div>
    </div>
  );
}

// ─── ANALYTICS TAB ───────────────────────────────────────────────────────────

function AnalyticsTab({ stats }: { stats: Stats }) {
  const categoryData = Object.entries(stats.byCategory)
    .map(([key, value]) => ({ key, value }))
    .sort((a, b) => b.value - a.value);

  const supervisorData = Object.entries(stats.bySupervisor)
    .map(([key, value]) => ({ key, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  const priorityColors: Record<string, string> = {
    critical: '#f43f5e', high: '#fb923c', medium: '#f59e0b', low: '#34d399',
  };
  const priorityData = Object.entries(stats.byPriority)
    .map(([key, value]) => ({ key, value }))
    .sort((a, b) => ['critical','high','medium','low'].indexOf(a.key) - ['critical','high','medium','low'].indexOf(b.key));

  const sectionData = Object.entries(stats.bySection)
    .map(([key, value]) => ({ key, value }))
    .sort((a, b) => b.value - a.value);

  const kpis = [
    { label: 'Total Complaints', value: stats.total, color: '#86BBD8', icon: ClipboardList },
    { label: 'Open', value: stats.open, color: '#f43f5e', icon: AlertTriangle },
    { label: 'In Progress', value: stats.inProgress, color: '#f59e0b', icon: Clock },
    { label: 'Closed', value: stats.closed, color: '#34d399', icon: CheckCircle2 },
    { label: 'Overdue', value: stats.overdue, color: '#fb923c', icon: TrendingDown },
    { label: 'Closure Rate', value: `${stats.closureRate}%`, color: stats.closureRate >= 80 ? '#34d399' : stats.closureRate >= 50 ? '#f59e0b' : '#f43f5e', icon: TrendingUp },
  ];

  return (
    <div className="space-y-4">
      {/* KPI strip */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {kpis.map(k => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="oz-glass-panel rounded-xl p-3 text-center">
              <Icon className="h-4 w-4 mx-auto mb-1" style={{ color: k.color }} />
              <div className="text-xl font-bold leading-none" style={{ color: k.color }}>{k.value}</div>
              <div className="text-[10px] text-white/40 mt-1 leading-tight">{k.label}</div>
            </div>
          );
        })}
      </div>

      {/* Row 1: Closure gauge + Monthly trend */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="oz-glass-panel rounded-2xl p-5">
          <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-3">Overall Closure Rate</p>
          <ClosureGauge rate={stats.closureRate} total={stats.total} closed={stats.closed} />
          {stats.overdue > 0 && (
            <div className="mt-3 flex items-center gap-2 rounded-lg px-3 py-2 bg-rose-500/10 border border-rose-500/20">
              <AlertTriangle className="h-3.5 w-3.5 text-rose-400 shrink-0" />
              <span className="text-xs text-rose-300">{stats.overdue} overdue item{stats.overdue !== 1 ? 's' : ''} require attention</span>
            </div>
          )}
        </div>
        <div className="oz-glass-panel rounded-2xl p-5">
          <TrendChart data={stats.monthlyTrend} />
        </div>
      </div>

      {/* Row 2: Category + Priority */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="oz-glass-panel rounded-2xl p-5">
          <BarChart data={categoryData} color='#86BBD8' label="Issues by Category" />
        </div>
        <div className="oz-glass-panel rounded-2xl p-5">
          <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-3">Issues by Priority</p>
          {priorityData.length === 0 ? (
            <p className="text-xs text-white/30 py-6 text-center">No data</p>
          ) : (
            <div className="space-y-2">
              {priorityData.map(d => {
                const color = priorityColors[d.key] || '#86BBD8';
                const max = Math.max(...priorityData.map(x => x.value), 1);
                return (
                  <div key={d.key} className="flex items-center gap-2">
                    <span className="text-[11px] text-white/55 w-16 truncate shrink-0 capitalize">{d.key}</span>
                    <div className="flex-1 h-5 rounded bg-white/[0.06] overflow-hidden">
                      <div className="h-full rounded transition-all duration-700"
                        style={{ width: `${(d.value / max) * 100}%`, background: color }} />
                    </div>
                    <span className="text-[11px] font-semibold w-6 text-right shrink-0" style={{ color }}>{d.value}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Row 3: By Supervisor + By Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="oz-glass-panel rounded-2xl p-5">
          <BarChart data={supervisorData} color='#a78bfa' label="Issues by Supervisor / Foreman" />
        </div>
        <div className="oz-glass-panel rounded-2xl p-5">
          <BarChart data={sectionData} color='#34d399' label="Issues by Section" />
        </div>
      </div>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function SafetyComplaintsPage() {
  const sections = usePageCollapse({ stats: true, records: true });
  const [tab, setTab] = useState<Tab>('records');
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [search, setSearch]         = useState('');
  const [statusF, setStatusF]       = useState('all');
  const [sectionF, setSectionF]     = useState('all');
  const [priorityF, setPriorityF]   = useState('all');
  const [categoryF, setCategoryF]   = useState('all');
  const [byWhoF, setByWhoF]         = useState('all');
  const [locationF, setLocationF]   = useState('all');
  const [dateFrom, setDateFrom]     = useState('');
  const [dateTo, setDateTo]         = useState('');

  // Modals
  const [formOpen, setFormOpen]         = useState(false);
  const [editing, setEditing]           = useState<Complaint | null>(null);
  const [detail, setDetail]             = useState<Complaint | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const load = async (quiet = false) => {
    if (!quiet) setLoading(true);
    setRefreshing(true);
    try {
      const data = await api.list();
      setComplaints(data);
    } catch { toast.error('Failed to load complaints'); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { load(); }, []);

  const stats = useMemo(() => calcStats(complaints), [complaints]);

  // Derived option lists for dynamic filters
  const byWhoOptions = useMemo(() => {
    const vals = [...new Set(complaints.map(c => c.byWho).filter(Boolean))].sort();
    return [{ value: 'all', label: 'All' }, ...vals.map(v => ({ value: v, label: v }))];
  }, [complaints]);

  const locationOptions = useMemo(() => {
    const vals = [...new Set(complaints.map(c => c.location).filter(Boolean))].sort();
    return [{ value: 'all', label: 'All' }, ...vals.map(v => ({ value: v, label: v }))];
  }, [complaints]);

  const filtered = useMemo(() => complaints.filter(c => {
    if (statusF !== 'all' && c.status !== statusF) return false;
    if (sectionF !== 'all' && c.section !== sectionF) return false;
    if (priorityF !== 'all' && c.priority !== priorityF) return false;
    if (categoryF !== 'all' && c.category !== categoryF) return false;
    if (byWhoF !== 'all' && c.byWho !== byWhoF) return false;
    if (locationF !== 'all' && c.location !== locationF) return false;
    if (dateFrom && c.date < dateFrom) return false;
    if (dateTo && c.date > dateTo) return false;
    if (search) {
      const s = search.toLowerCase();
      return (
        c.issueRaised.toLowerCase().includes(s) ||
        (c.raisedBy || '').toLowerCase().includes(s) ||
        (c.supervisorName || '').toLowerCase().includes(s) ||
        (c.byWho || '').toLowerCase().includes(s) ||
        (c.location || '').toLowerCase().includes(s) ||
        (c.category || '').toLowerCase().includes(s)
      );
    }
    return true;
  }), [complaints, search, statusF, sectionF, priorityF, categoryF, byWhoF, locationF, dateFrom, dateTo]);

  const handleSave = async (form: Partial<Complaint>) => {
    if (editing) {
      const updated = await api.update(editing.id, form);
      setComplaints(p => p.map(c => c.id === updated.id ? updated : c));
      toast.success('Complaint updated');
    } else {
      const created = await api.create(form);
      setComplaints(p => [created, ...p]);
      toast.success('Complaint submitted');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this complaint? This cannot be undone.')) return;
    await api.remove(id);
    setComplaints(p => p.filter(c => c.id !== id));
    toast.success('Deleted');
  };

  const clearFilters = () => {
    setSearch(''); setStatusF('all'); setSectionF('all');
    setPriorityF('all'); setCategoryF('all');
    setByWhoF('all'); setLocationF('all');
    setDateFrom(''); setDateTo('');
  };
  const hasFilters = search || statusF !== 'all' || sectionF !== 'all' || priorityF !== 'all' || categoryF !== 'all' || byWhoF !== 'all' || locationF !== 'all' || dateFrom || dateTo;

  const heroStats = [
    { label: 'Total',       value: stats.total,       color: '#86BBD8' },
    { label: 'Open',        value: stats.open,        color: '#f43f5e' },
    { label: 'In Progress', value: stats.inProgress,  color: '#f59e0b' },
    { label: 'Closed',      value: stats.closed,      color: '#34d399' },
    { label: 'Overdue',     value: stats.overdue,     color: '#fb923c' },
    { label: 'Closure %',   value: `${stats.closureRate}%`, color: stats.closureRate >= 80 ? '#34d399' : '#f59e0b' },
  ];

  const toggleRow = (id: string) =>
    setExpandedRows(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const headers = [
    { label: 'Date' },
    { label: 'Raised By' },
    { label: 'Issue' },
    { label: 'Category' },
    { label: 'Priority' },
    { label: 'Supervisor' },
    { label: 'By When' },
    { label: 'Status' },
    { label: '' },
  ];

  return (
    <PageShell>
      <main className="container mx-auto px-4 py-6 space-y-4">
        <SafetyHero
          icon={MessageSquareWarning}
          title="Safety Complaints"
          subtitle="Register, track, and resolve safety complaints with full accountability"
          accentColor={ACCENT}
          stats={heroStats}
          onRefresh={() => load(true)}
          refreshing={refreshing}
          showStats={sections.expanded.stats}
          onToggleStats={() => sections.toggle('stats')}
          actions={
            <div className="flex items-center gap-1.5 sm:gap-2">
              <MasterCollapseButton collapse={sections} />
              {/* Tab switcher */}
              <div className="flex rounded-lg overflow-hidden border border-white/[0.15] text-xs">
                <button type="button" onClick={() => setTab('records')}
                  className={`px-3 py-1.5 sm:py-1 transition-colors ${tab === 'records' ? 'bg-white/20 text-white' : 'text-white/50 hover:text-white hover:bg-white/10'}`}>
                  Records
                </button>
                <button type="button" onClick={() => setTab('analytics')}
                  className={`px-3 py-1.5 sm:py-1 transition-colors flex items-center gap-1 ${tab === 'analytics' ? 'bg-white/20 text-white' : 'text-white/50 hover:text-white hover:bg-white/10'}`}>
                  <BarChart3 className="h-3 w-3" /> Analytics
                </button>
              </div>
            </div>
          }
        />

        {tab === 'records' && sections.expanded.records && (
          <>
            {/* Controls */}
            <SafetyControls>
              <SafetySearchBar value={search} onChange={setSearch} placeholder="Search complaints…" />
              <FilterPills
                label="Status" value={statusF} onChange={setStatusF} accentColor={ACCENT}
                options={[{ value: 'all', label: 'All' }, ...STATUSES.map(s => ({ value: s, label: s }))]}
              />
              <FilterPills
                label="Section" value={sectionF} onChange={setSectionF}
                options={[{ value: 'all', label: 'All' }, ...SECTIONS.map(s => ({ value: s, label: s }))]}
              />
              <FilterPills
                label="Priority" value={priorityF} onChange={setPriorityF}
                options={[{ value: 'all', label: 'All' }, ...PRIORITIES.map(p => ({ value: p, label: p }))]}
              />
              <FilterPills
                label="Category" value={categoryF} onChange={setCategoryF}
                options={[{ value: 'all', label: 'All' }, ...CATEGORIES.map(c => ({ value: c, label: c }))]}
              />
              {byWhoOptions.length > 1 && (
                <FilterPills
                  label="Responsible" value={byWhoF} onChange={setByWhoF}
                  options={byWhoOptions}
                />
              )}
              {locationOptions.length > 1 && (
                <FilterPills
                  label="Location" value={locationF} onChange={setLocationF}
                  options={locationOptions}
                />
              )}
              <DateRangeFilter from={dateFrom} to={dateTo} onFromChange={setDateFrom} onToChange={setDateTo} />
              {hasFilters && <ClearFiltersButton onClick={clearFilters} />}
              <AddButton label="New Complaint" onClick={() => { setEditing(null); setFormOpen(true); }}
                icon={Plus} />
            </SafetyControls>

            {/* Records table */}
            <SafetyPanel label="Complaints Register" count={filtered.length}>
              {loading ? (
                <LoadingState message="Loading complaints…" />
              ) : filtered.length === 0 ? (
                <EmptyState icon={MessageSquareWarning} title="No complaints found"
                  message={hasFilters ? 'Try adjusting your filters.' : 'No safety complaints have been logged yet.'}
                  onAdd={() => { setEditing(null); setFormOpen(true); }} addLabel="Log First Complaint" />
              ) : (
                <SafetyTable headers={headers}>
                  {filtered.map(c => {
                    const isExpanded = expandedRows.has(c.id);
                    return (
                      <>
                        <tr key={c.id}
                          className="border-b border-white/[0.05] hover:bg-white/[0.04] cursor-pointer transition-colors"
                          onClick={() => setDetail(c)}>
                          <td className="pl-5 pr-3 py-3 text-xs text-white/70 whitespace-nowrap">{c.date}</td>
                          <td className="px-3 py-3 text-xs text-white/70">{c.raisedBy || <span className="text-white/25 italic">Anonymous</span>}</td>
                          <td className="px-3 py-3 text-xs text-white/85 max-w-[200px]">
                            <span className="line-clamp-2">{c.issueRaised}</span>
                          </td>
                          <td className="px-3 py-3 text-xs text-white/60">{c.category}</td>
                          <td className="px-3 py-3"><PriorityBadge priority={c.priority} /></td>
                          <td className="px-3 py-3">
                            <div className="flex flex-col">
                              <span className="text-xs text-white/75">{c.supervisorName || '—'}</span>
                              {c.supervisorSignature && (
                                <span className="text-[10px] text-white/40 italic">{c.supervisorSignature}</span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-3 text-xs text-white/60 whitespace-nowrap">{c.byWhen || '—'}</td>
                          <td className="px-3 py-3"><StatusBadge status={c.status} /></td>
                          <td className="px-3 pr-5 py-3">
                            <div className="flex items-center justify-end gap-0.5" onClick={e => e.stopPropagation()}>
                              <button type="button" title="Expand"
                                onClick={e => { e.stopPropagation(); toggleRow(c.id); }}
                                className="h-9 w-9 sm:h-7 sm:w-7 flex items-center justify-center rounded text-white/25 hover:text-white/70 transition-all">
                                {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                              </button>
                              <button type="button" title="Edit"
                                onClick={e => { e.stopPropagation(); setEditing(c); setFormOpen(true); }}
                                className="h-9 w-9 sm:h-7 sm:w-7 flex items-center justify-center rounded hover:bg-[#86BBD8]/15 text-white/25 hover:text-[#86BBD8] transition-all">
                                <Pencil className="h-3.5 w-3.5 sm:h-3 sm:w-3" />
                              </button>
                              <button type="button" title="Delete"
                                onClick={e => { e.stopPropagation(); handleDelete(c.id); }}
                                className="h-9 w-9 sm:h-7 sm:w-7 flex items-center justify-center rounded hover:bg-rose-500/20 text-white/20 hover:text-rose-400 transition-all">
                                <Trash2 className="h-3.5 w-3.5 sm:h-3 sm:w-3" />
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* Expanded detail row */}
                        {isExpanded && (
                          <tr key={`${c.id}-detail`} className="bg-white/[0.02] border-b border-white/[0.04]">
                            <td colSpan={9} className="px-5 py-3">
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                                {c.issueRaised && (
                                  <div className="sm:col-span-2 lg:col-span-3">
                                    <span className="text-white/35 font-semibold uppercase text-[10px] tracking-wider">Issue Raised</span>
                                    <p className="text-white/80 mt-0.5">{c.issueRaised}</p>
                                  </div>
                                )}
                                {c.actionPlan && (
                                  <div className="sm:col-span-2 lg:col-span-3">
                                    <span className="text-white/35 font-semibold uppercase text-[10px] tracking-wider">Action Plan</span>
                                    <p className="text-white/80 mt-0.5">{c.actionPlan}</p>
                                  </div>
                                )}
                                {c.location && <div><span className="text-white/35">Location: </span><span className="text-white/75">{c.location}</span></div>}
                                {c.section  && <div><span className="text-white/35">Section: </span><span className="text-white/75">{c.section}</span></div>}
                                {c.byWho    && <div><span className="text-white/35">Responsible: </span><span className="text-white/75">{c.byWho}</span></div>}
                                {c.dateClosed && <div><span className="text-white/35">Date Closed: </span><span className="text-white/75">{c.dateClosed}</span></div>}
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </SafetyTable>
              )}
            </SafetyPanel>
          </>
        )}

        {tab === 'analytics' && (
          <AnalyticsTab stats={stats} />
        )}

        {/* Modals */}
        <ComplaintForm
          open={formOpen}
          onClose={() => { setFormOpen(false); setEditing(null); }}
          initial={editing ?? undefined}
          onSave={handleSave}
        />
        <DetailModal
          complaint={detail}
          onClose={() => setDetail(null)}
          onEdit={c => { setEditing(c); setFormOpen(true); }}
        />
      </main>
    </PageShell>
  );
}
