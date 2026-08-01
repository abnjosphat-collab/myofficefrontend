// app/safety_complaints/page.tsx — Safety Complaints Register
'use client';

import { useState, useEffect, useMemo, ElementType, Fragment } from 'react';
import {
  MessageSquareWarning, Plus, X, RefreshCw,
  ChevronDown, ChevronUp, ClipboardList,
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Clock,
  BarChart3, Pencil, Trash2,
} from '@/components/shared/theme';
import { toast } from 'sonner';
import { AppShell } from '@/components/app-shell';
import { PredictiveInput } from '@/components/shared/PredictiveInput';
import {
  useTheme, accentText, PageHero, StatTile, StatusBadge, SearchInput, FormField, FormActions,
  useCollapseSection, CenterModal, PrimaryButton, EmptyState, ACCENT_HEX, SelectField, useConfirm,
} from '@/components/shared/theme';
import { DownloadButton, type DLColumn } from '@/components/shared/DownloadButton';
import { exportFilename } from '@/lib/exportUtils';
import { formatDate } from '@/lib/format';
import type { Complaint, Tab } from './types';
import { useSafetyComplaintsData, api } from './useSafetyComplaintsData';

const CATEGORIES = ['Safety', 'Health', 'Environment', 'Quality', 'General', 'Other'];
const PRIORITIES = ['low', 'medium', 'high', 'critical'];
const SECTIONS = ['Mechanical', 'Electrical', 'General'];
const STATUSES = ['open', 'in-progress', 'closed', 'overdue'];

const PRIORITY_HEX: Record<string, string> = { critical: '#f43f5e', high: '#fb923c', medium: '#fbbf24', low: '#34d399' };
const STATUS_HEX: Record<string, string> = { open: '#f43f5e', 'in-progress': '#fbbf24', closed: '#34d399', overdue: '#fb923c' };

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
  const total = complaints.length;
  const open = complaints.filter(c => c.status === 'open').length;
  const inProgress = complaints.filter(c => c.status === 'in-progress').length;
  const closed = complaints.filter(c => c.status === 'closed').length;
  const overdue = complaints.filter(c => c.status === 'overdue').length;
  const closureRate = total > 0 ? Math.round((closed / total) * 100) : 0;

  const byCategory: Record<string, number> = {};
  const bySection: Record<string, number> = {};
  const bySupervisor: Record<string, number> = {};
  const byPriority: Record<string, number> = {};
  const monthMap: Record<string, { total: number; closed: number }> = {};

  for (const c of complaints) {
    if (c.category) byCategory[c.category] = (byCategory[c.category] || 0) + 1;
    if (c.section) bySection[c.section] = (bySection[c.section] || 0) + 1;
    if (c.priority) byPriority[c.priority] = (byPriority[c.priority] || 0) + 1;
    if (c.supervisorName) bySupervisor[c.supervisorName] = (bySupervisor[c.supervisorName] || 0) + 1;
    if (c.date) {
      const m = c.date.slice(0, 7);
      if (!monthMap[m]) monthMap[m] = { total: 0, closed: 0 };
      monthMap[m].total++;
      if (c.status === 'closed') monthMap[m].closed++;
    }
  }

  const monthlyTrend = Object.entries(monthMap).sort(([a], [b]) => a.localeCompare(b)).slice(-6).map(([month, v]) => ({ month, ...v }));

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

function ComplaintForm({ open, onClose, initial, onSave }: {
  open: boolean; onClose: () => void;
  initial?: Partial<Complaint>; onSave: (d: Partial<Complaint>) => Promise<void>;
}) {
  const t = useTheme();
  const [form, setForm] = useState<Partial<Complaint>>(blank);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setForm(initial ? { ...blank(), ...initial } : blank()); }, [initial, open]);

  const set = (k: keyof Complaint, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.issueRaised?.trim()) { toast.error('Issue description is required'); return; }
    if (!form.date) { toast.error('Date is required'); return; }
    setSaving(true);
    try { await onSave(form); onClose(); }
    catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  const inputCls = `w-full rounded-lg px-3 py-1.5 text-sm outline-none transition-colors ${t.inputBg}`;

  return (
    <CenterModal open={open} onClose={onClose} title={initial?.id ? 'Edit Complaint' : 'New Safety Complaint'} accent="amber" width="max-w-2xl">
      <form onSubmit={handleSubmit}>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="Date" required><input type="date" title="Date" value={form.date || ''} onChange={e => set('date', e.target.value)} className={inputCls} /></FormField>
            <FormField label="Raised By (optional)"><input type="text" value={form.raisedBy || ''} onChange={e => set('raisedBy', e.target.value)} placeholder="Name of person raising" className={inputCls} /></FormField>
          </div>

          <FormField label="Issue Raised" required>
            <textarea value={form.issueRaised || ''} onChange={e => set('issueRaised', e.target.value)} placeholder="Describe the safety complaint in detail…" rows={3} className={`${inputCls} resize-none`} />
          </FormField>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <FormField label="Category">
              <SelectField size="form" title="Category" value={form.category || 'General'} onChange={v => set('category', v)}
                options={CATEGORIES.map(c => ({ value: c, label: c }))} />
            </FormField>
            <FormField label="Section">
              <SelectField size="form" title="Section" value={form.section || 'General'} onChange={v => set('section', v)}
                options={SECTIONS.map(s => ({ value: s, label: s }))} />
            </FormField>
            <FormField label="Priority">
              <SelectField size="form" title="Priority" value={form.priority || 'medium'} onChange={v => set('priority', v)}
                options={PRIORITIES.map(p => ({ value: p, label: p.charAt(0).toUpperCase() + p.slice(1) }))} />
            </FormField>
          </div>

          <FormField label="Location"><PredictiveInput historyKey="safety_complaint_location" value={form.location || ''} onChange={v => set('location', v)} placeholder="Where was the complaint raised?" inputClassName={inputCls} /></FormField>

          <FormField label="Action Plan">
            <textarea value={form.actionPlan || ''} onChange={e => set('actionPlan', e.target.value)} placeholder="Describe the corrective action plan…" rows={2} className={`${inputCls} resize-none`} />
          </FormField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="By Who"><input type="text" value={form.byWho || ''} onChange={e => set('byWho', e.target.value)} placeholder="Responsible person" className={inputCls} /></FormField>
            <FormField label="By When"><input type="date" title="By when" value={form.byWhen || ''} onChange={e => set('byWhen', e.target.value)} className={inputCls} /></FormField>
          </div>

          <div className={`rounded-xl p-3 ${t.chipBg} space-y-3`}>
            <p className={`text-[10px] font-semibold uppercase tracking-wider ${t.textFaint}`}>Foreman / Supervisor</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField label="Name"><PredictiveInput historyKey="handover_supervisor" value={form.supervisorName || ''} onChange={v => set('supervisorName', v)} placeholder="Supervisor / Foreman name" inputClassName={inputCls} /></FormField>
              <FormField label="Signature (initials)"><input type="text" value={form.supervisorSignature || ''} onChange={e => set('supervisorSignature', e.target.value)} placeholder="e.g. J.D." className={inputCls} /></FormField>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="Status">
              <SelectField size="form" title="Status" value={form.status || 'open'} onChange={v => set('status', v)}
                options={STATUSES.map(s => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }))} />
            </FormField>
            <FormField label="Date Closed"><input type="date" title="Date closed" value={form.dateClosed || ''} onChange={e => set('dateClosed', e.target.value)} className={inputCls} /></FormField>
          </div>
        </div>
        <FormActions onCancel={onClose} submitting={saving} submitLabel={initial?.id ? 'Update' : 'Submit'} accent="amber" />
      </form>
    </CenterModal>
  );
}

// ─── DETAIL MODAL ─────────────────────────────────────────────────────────────

function DetailRow({ label, value, full }: { label: string; value?: string | null; full?: boolean }) {
  const t = useTheme();
  return value ? (
    <div className={full ? 'col-span-2' : ''}>
      <p className={`text-[10px] uppercase tracking-wide mb-0.5 ${t.textFaint}`}>{label}</p>
      <p className={`text-sm ${t.textMuted}`}>{value}</p>
    </div>
  ) : null;
}

function DetailModal({ complaint, onClose, onEdit }: {
  complaint: Complaint | null; onClose: () => void; onEdit: (c: Complaint) => void;
}) {
  const t = useTheme();
  if (!complaint) return null;
  return (
    <CenterModal open={!!complaint} onClose={onClose} title="Complaint Detail" accent="amber" width="max-w-2xl">
      <div className="px-5 py-4 space-y-4">
        <div className="flex flex-wrap gap-2">
          <StatusBadge color={STATUS_HEX[complaint.status] ?? ACCENT_HEX.blue} label={complaint.status} />
          <StatusBadge color={PRIORITY_HEX[complaint.priority] ?? ACCENT_HEX.blue} label={complaint.priority} />
          <StatusBadge color={ACCENT_HEX.blue} label={complaint.category} />
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-3">
          <DetailRow label="Date" value={complaint.date} />
          <DetailRow label="Raised By" value={complaint.raisedBy || 'Anonymous'} />
          <DetailRow label="Section" value={complaint.section} />
          <DetailRow label="Location" value={complaint.location} />
          <DetailRow label="Issue Raised" value={complaint.issueRaised} full />
          <DetailRow label="Action Plan" value={complaint.actionPlan} full />
          <DetailRow label="By Who" value={complaint.byWho} />
          <DetailRow label="By When" value={complaint.byWhen} />
          <DetailRow label="Supervisor" value={complaint.supervisorName} />
          <DetailRow label="Signature" value={complaint.supervisorSignature} />
          <DetailRow label="Date Closed" value={complaint.dateClosed || undefined} />
        </div>
      </div>
      <div className={`flex gap-2 px-5 py-4 border-t ${t.border}`}>
        <button type="button" onClick={onClose} className={`flex-1 py-2.5 rounded-xl text-sm ${t.textMuted} ${t.hoverText} border ${t.border} transition-all`}>Close</button>
        <button type="button" onClick={() => { onClose(); onEdit(complaint); }} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-brand-400 hover:text-brand-300 border border-brand-400/25 transition-all">Edit</button>
      </div>
    </CenterModal>
  );
}

// ─── MINI CHART COMPONENTS ────────────────────────────────────────────────────

function BarChartList({ data, color = '#86BBD8', label }: { data: { key: string; value: number }[]; color?: string; label: string; }) {
  const t = useTheme();
  if (!data.length) return <p className={`text-xs py-6 text-center ${t.textFaint}`}>No data</p>;
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div>
      <p className={`text-[10px] font-semibold uppercase tracking-wider mb-3 ${t.textFaint}`}>{label}</p>
      <div className="space-y-2">
        {data.map(d => (
          <div key={d.key} className="flex items-center gap-2">
            <span className={`text-[11px] w-24 truncate shrink-0 ${t.textMuted}`}>{d.key}</span>
            <div className={`flex-1 h-5 rounded ${t.chipBg} overflow-hidden`}><div className="h-full rounded transition-all duration-700" style={{ width: `${(d.value / max) * 100}%`, background: color }} /></div>
            <span className="text-[11px] font-semibold w-6 text-right shrink-0" style={{ color }}>{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ClosureGauge({ rate, total, closed }: { rate: number; total: number; closed: number }) {
  const t = useTheme();
  const r = 42;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (rate / 100) * circumference;
  const color = rate >= 80 ? '#34d399' : rate >= 50 ? '#f59e0b' : '#f43f5e';
  return (
    <div className="flex flex-col items-center gap-2 py-2">
      <div className="relative">
        <svg width="110" height="110" className="-rotate-90">
          <circle cx="55" cy="55" r={r} fill="none" stroke={t.light ? 'rgba(15,23,42,0.07)' : 'rgba(255,255,255,0.07)'} strokeWidth="10" />
          <circle cx="55" cy="55" r={r} fill="none" stroke={color} strokeWidth="10" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s ease' }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-2xl font-bold leading-none ${t.textPrimary}`}>{rate}%</span>
          <span className={`text-[10px] mt-0.5 ${t.textFaint}`}>closed</span>
        </div>
      </div>
      <div className={`flex items-center gap-4 text-xs ${t.textFaint}`}>
        <span><span className={`font-semibold ${t.textPrimary}`}>{closed}</span> closed</span>
        <span><span className={`font-semibold ${t.textPrimary}`}>{total}</span> total</span>
      </div>
    </div>
  );
}

function TrendChart({ data }: { data: { month: string; total: number; closed: number }[] }) {
  const t = useTheme();
  if (!data.length) return <p className={`text-xs py-6 text-center ${t.textFaint}`}>No data</p>;
  const max = Math.max(...data.map(d => d.total), 1);
  return (
    <div>
      <p className={`text-[10px] font-semibold uppercase tracking-wider mb-3 ${t.textFaint}`}>Monthly Trend (last 6 months)</p>
      <div className="flex items-end gap-2 h-28 mt-1">
        {data.map(d => (
          <div key={d.month} className="flex-1 flex flex-col items-center gap-1">
            <div className="relative w-full flex flex-col items-center gap-0.5" style={{ height: '80px' }}>
              <div className={`absolute bottom-0 w-full rounded-t ${t.chipBg}`} style={{ height: `${(d.total / max) * 80}px` }} />
              <div className="absolute bottom-0 w-full rounded-t transition-all duration-700" style={{ height: `${(d.closed / max) * 80}px`, background: '#34d399' }} />
            </div>
            <span className={`text-[9px] truncate w-full text-center ${t.textFaint}`}>{d.month.slice(5)}</span>
          </div>
        ))}
      </div>
      <div className={`flex items-center gap-4 mt-2 text-[10px] ${t.textFaint}`}>
        <span><span className={`inline-block h-2 w-3 rounded-sm mr-1 ${t.chipBg}`} />Total</span>
        <span><span className="inline-block h-2 w-3 rounded-sm bg-emerald-400 mr-1" />Closed</span>
      </div>
    </div>
  );
}

// ─── ANALYTICS TAB ───────────────────────────────────────────────────────────

function AnalyticsTab({ stats }: { stats: Stats }) {
  const t = useTheme();
  const categoryData = Object.entries(stats.byCategory).map(([key, value]) => ({ key, value })).sort((a, b) => b.value - a.value);
  const supervisorData = Object.entries(stats.bySupervisor).map(([key, value]) => ({ key, value })).sort((a, b) => b.value - a.value).slice(0, 8);
  const priorityData = Object.entries(stats.byPriority).map(([key, value]) => ({ key, value })).sort((a, b) => ['critical', 'high', 'medium', 'low'].indexOf(a.key) - ['critical', 'high', 'medium', 'low'].indexOf(b.key));
  const sectionData = Object.entries(stats.bySection).map(([key, value]) => ({ key, value })).sort((a, b) => b.value - a.value);

  const kpis: { label: string; value: string | number; color: string; icon: ElementType }[] = [
    { label: 'Total Complaints', value: stats.total, color: ACCENT_HEX.blue, icon: ClipboardList },
    { label: 'Open', value: stats.open, color: '#f43f5e', icon: AlertTriangle },
    { label: 'In Progress', value: stats.inProgress, color: '#fbbf24', icon: Clock },
    { label: 'Closed', value: stats.closed, color: '#34d399', icon: CheckCircle2 },
    { label: 'Overdue', value: stats.overdue, color: '#fb923c', icon: TrendingDown },
    { label: 'Closure Rate', value: `${stats.closureRate}%`, color: stats.closureRate >= 80 ? '#34d399' : stats.closureRate >= 50 ? '#fbbf24' : '#f43f5e', icon: TrendingUp },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {kpis.map(k => (
          <div key={k.label} className={`${t.glass} rounded-xl p-3 text-center`}>
            <k.icon className="h-4 w-4 mx-auto mb-1" style={{ color: k.color }} />
            <div className="text-xl font-bold leading-none" style={{ color: k.color }}>{k.value}</div>
            <div className={`text-[10px] mt-1 leading-tight ${t.textFaint}`}>{k.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className={`${t.glass} rounded-2xl p-5`}>
          <p className={`text-[10px] font-semibold uppercase tracking-wider mb-3 ${t.textFaint}`}>Overall Closure Rate</p>
          <ClosureGauge rate={stats.closureRate} total={stats.total} closed={stats.closed} />
          {stats.overdue > 0 && (
            <div className="mt-3 flex items-center gap-2 rounded-lg px-3 py-2 bg-rose-500/10">
              <AlertTriangle className={`h-3.5 w-3.5 ${accentText('rose', t.light)} shrink-0`} />
              <span className={`text-xs ${accentText('rose', t.light)}`}>{stats.overdue} overdue item{stats.overdue !== 1 ? 's' : ''} require attention</span>
            </div>
          )}
        </div>
        <div className={`${t.glass} rounded-2xl p-5`}><TrendChart data={stats.monthlyTrend} /></div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className={`${t.glass} rounded-2xl p-5`}><BarChartList data={categoryData} color="#86BBD8" label="Issues by Category" /></div>
        <div className={`${t.glass} rounded-2xl p-5`}>
          <p className={`text-[10px] font-semibold uppercase tracking-wider mb-3 ${t.textFaint}`}>Issues by Priority</p>
          {priorityData.length === 0 ? <p className={`text-xs py-6 text-center ${t.textFaint}`}>No data</p> : (
            <div className="space-y-2">
              {priorityData.map(d => {
                const color = PRIORITY_HEX[d.key] || '#86BBD8';
                const max = Math.max(...priorityData.map(x => x.value), 1);
                return (
                  <div key={d.key} className="flex items-center gap-2">
                    <span className={`text-[11px] w-16 truncate shrink-0 capitalize ${t.textMuted}`}>{d.key}</span>
                    <div className={`flex-1 h-5 rounded ${t.chipBg} overflow-hidden`}><div className="h-full rounded transition-all duration-700" style={{ width: `${(d.value / max) * 100}%`, background: color }} /></div>
                    <span className="text-[11px] font-semibold w-6 text-right shrink-0" style={{ color }}>{d.value}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className={`${t.glass} rounded-2xl p-5`}><BarChartList data={supervisorData} color="#a78bfa" label="Issues by Supervisor / Foreman" /></div>
        <div className={`${t.glass} rounded-2xl p-5`}><BarChartList data={sectionData} color="#34d399" label="Issues by Section" /></div>
      </div>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

function SafetyComplaintsContent() {
  const t = useTheme();
  const confirm = useConfirm();
  const sections = useCollapseSection({ hero: true, records: true });
  const [tab, setTab] = useState<Tab>('records');
  const { complaints, setComplaints, loading, refreshing, load } = useSafetyComplaintsData();

  const [search, setSearch] = useState('');
  const [statusF, setStatusF] = useState('all');
  const [sectionF, setSectionF] = useState('all');
  const [priorityF, setPriorityF] = useState('all');
  const [categoryF, setCategoryF] = useState('all');
  const [byWhoF, setByWhoF] = useState('all');
  const [locationF, setLocationF] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Complaint | null>(null);
  const [detail, setDetail] = useState<Complaint | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  useEffect(() => { load(); }, []);

  const stats = useMemo(() => calcStats(complaints), [complaints]);

  const byWhoOptions = useMemo(() => [...new Set(complaints.map(c => c.byWho).filter(Boolean))].sort(), [complaints]);
  const locationOptions = useMemo(() => [...new Set(complaints.map(c => c.location).filter(Boolean))].sort(), [complaints]);

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
      return c.issueRaised.toLowerCase().includes(s) || (c.raisedBy || '').toLowerCase().includes(s) ||
        (c.supervisorName || '').toLowerCase().includes(s) || (c.byWho || '').toLowerCase().includes(s) ||
        (c.location || '').toLowerCase().includes(s) || (c.category || '').toLowerCase().includes(s);
    }
    return true;
  }), [complaints, search, statusF, sectionF, priorityF, categoryF, byWhoF, locationF, dateFrom, dateTo]);

  const exportColumns: DLColumn[] = [
    { key: 'date', label: 'Date', width: 14, format: v => v ? formatDate(v as string) : '' },
    { key: 'raisedBy', label: 'Raised By', width: 18, format: v => (v as string) || 'Anonymous' },
    { key: 'issueRaised', label: 'Issue', width: 30 },
    { key: 'category', label: 'Category', width: 16 },
    { key: 'section', label: 'Section', width: 14 },
    { key: 'location', label: 'Location', width: 18 },
    { key: 'priority', label: 'Priority', width: 12 },
    { key: 'supervisorName', label: 'Supervisor', width: 18 },
    { key: 'byWho', label: 'Action By', width: 16 },
    { key: 'byWhen', label: 'By When', width: 14, format: v => v ? formatDate(v as string) : '' },
    { key: 'status', label: 'Status', width: 14 },
    { key: 'dateClosed', label: 'Date Closed', width: 14, format: v => v ? formatDate(v as string) : '' },
  ];

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
    if (!await confirm({ title: 'Delete this complaint?', message: 'This cannot be undone.', destructive: true })) return;
    await api.remove(id);
    setComplaints(p => p.filter(c => c.id !== id));
    toast.success('Deleted');
  };

  const clearFilters = () => { setSearch(''); setStatusF('all'); setSectionF('all'); setPriorityF('all'); setCategoryF('all'); setByWhoF('all'); setLocationF('all'); setDateFrom(''); setDateTo(''); };
  const hasFilters = !!(search || statusF !== 'all' || sectionF !== 'all' || priorityF !== 'all' || categoryF !== 'all' || byWhoF !== 'all' || locationF !== 'all' || dateFrom || dateTo);

  const toggleRow = (id: string) => setExpandedRows(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const selCls = `h-9 rounded-lg px-2.5 text-xs outline-none transition-colors ${t.inputBg}`;
  const thCls = `text-left px-3 py-2 text-[10px] uppercase tracking-wide font-medium ${t.textFaint}`;

  return (
    <main className="max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <PageHero
        icon={MessageSquareWarning}
        accent="violet"
        crumbs={['Safety & Compliance', 'Safety Complaints']}
        title="Safety Complaints"
        description="Register, track, and resolve safety complaints with full accountability"
        statsOpen={sections.expanded.hero}
        actions={
          <>
            <button type="button" onClick={() => load(true)} title="Refresh" className={`h-8 w-8 flex items-center justify-center rounded-lg ${t.hoverBg} ${t.textFaint} ${t.hoverText}`}><RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} /></button>
            {filtered.length > 0 && (
              <DownloadButton
                data={filtered as unknown as Record<string, unknown>[]}
                columns={exportColumns}
                filename={exportFilename('Safety_Complaints')}
                title="Safety Complaints"
                statusColumn="status"
                statusColor={(_v, row) => STATUS_HEX[row.status as string]?.replace('#', '')}
              />
            )}
            <div className={`flex rounded-lg overflow-hidden ${t.chipBg} text-xs`}>
              <button type="button" onClick={() => setTab('records')} className={`px-3 py-1.5 transition-colors ${tab === 'records' ? 'bg-brand-500/20 text-brand-400' : `${t.textFaint} ${t.hoverText}`}`}>Records</button>
              <button type="button" onClick={() => setTab('analytics')} className={`px-3 py-1.5 transition-colors flex items-center gap-1 ${tab === 'analytics' ? 'bg-brand-500/20 text-brand-400' : `${t.textFaint} ${t.hoverText}`}`}><BarChart3 className="h-3 w-3" /> Analytics</button>
            </div>
            <PrimaryButton icon={Plus} accent="amber" onClick={() => { setEditing(null); setFormOpen(true); }}>New Complaint</PrimaryButton>
          </>
        }
      >
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-4">
          <StatTile icon={MessageSquareWarning} color={ACCENT_HEX.blue} label="Total" value={stats.total} />
          <StatTile icon={AlertTriangle} color="#f43f5e" label="Open" value={stats.open} />
          <StatTile icon={Clock} color="#fbbf24" label="In Progress" value={stats.inProgress} />
          <StatTile icon={CheckCircle2} color="#34d399" label="Closed" value={stats.closed} />
          <StatTile icon={TrendingDown} color="#fb923c" label="Overdue" value={stats.overdue} />
          <StatTile icon={TrendingUp} color={stats.closureRate >= 80 ? '#34d399' : '#fbbf24'} label="Closure %" value={`${stats.closureRate}%`} />
        </div>
      </PageHero>

      {tab === 'records' && sections.expanded.records && (
        <>
          <div className={`${t.glass} rounded-2xl ${t.shadow} overflow-hidden`}>
            <div className="px-5 py-3 flex flex-wrap items-center gap-2">
              <SearchInput value={search} onChange={setSearch} placeholder="Search complaints…" className="w-56" />
              <SelectField size="filter" title="Status" value={statusF} onChange={setStatusF} options={[{ value: 'all', label: 'All Status' }, ...STATUSES.map(s => ({ value: s, label: s }))]} />
              <SelectField size="filter" title="Section" value={sectionF} onChange={setSectionF} options={[{ value: 'all', label: 'All Sections' }, ...SECTIONS.map(s => ({ value: s, label: s }))]} />
              <SelectField size="filter" title="Priority" value={priorityF} onChange={setPriorityF} options={[{ value: 'all', label: 'All Priority' }, ...PRIORITIES.map(p => ({ value: p, label: p }))]} />
              <SelectField size="filter" title="Category" value={categoryF} onChange={setCategoryF} options={[{ value: 'all', label: 'All Categories' }, ...CATEGORIES.map(c => ({ value: c, label: c }))]} />
              {byWhoOptions.length > 0 && <SelectField size="filter" title="Responsible" value={byWhoF} onChange={setByWhoF} options={[{ value: 'all', label: 'All Responsible' }, ...byWhoOptions.map(v => ({ value: v, label: v }))]} />}
              {locationOptions.length > 0 && <SelectField size="filter" title="Location" value={locationF} onChange={setLocationF} options={[{ value: 'all', label: 'All Locations' }, ...locationOptions.map(v => ({ value: v, label: v }))]} />}
              <input type="date" title="From date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className={selCls} />
              <input type="date" title="To date" value={dateTo} onChange={e => setDateTo(e.target.value)} className={selCls} />
              {hasFilters && <button type="button" onClick={clearFilters} className={`flex items-center gap-1 text-xs px-2 py-1.5 rounded-lg transition-colors ${t.chipBg} ${t.textFaint} ${t.hoverBg} ${t.hoverText}`}><X className="h-3 w-3" /> Clear</button>}
              <span className={`text-[11px] ml-auto ${t.textFaint}`}>{filtered.length} of {complaints.length}</span>
            </div>
          </div>

          <div className={`${t.glass} rounded-2xl ${t.shadow} overflow-hidden`}>
            <div className={`flex items-center gap-2 px-5 py-3 border-b ${t.border}`}><MessageSquareWarning className={`h-4 w-4 ${accentText('amber', t.light)}`} /><span className={`font-semibold text-sm ${t.textPrimary}`}>Complaints Register</span><span className={`ml-auto text-xs ${t.textFaint}`}>{filtered.length}</span></div>
            {loading ? (
              <div className="flex items-center justify-center py-16"><RefreshCw className={`h-6 w-6 animate-spin ${t.textFaint}`} /></div>
            ) : filtered.length === 0 ? (
              <EmptyState icon={MessageSquareWarning} title="No complaints found"
                message={hasFilters ? 'Try adjusting your filters.' : 'No safety complaints have been logged yet.'}
                action={{ label: 'Log First Complaint', onClick: () => { setEditing(null); setFormOpen(true); } }} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className={`border-b ${t.border}`}>
                    <tr><th className={thCls}>Date</th><th className={thCls}>Raised By</th><th className={thCls}>Issue</th><th className={thCls}>Category</th><th className={thCls}>Priority</th><th className={thCls}>Supervisor</th><th className={thCls}>By When</th><th className={thCls}>Status</th><th className={thCls}></th></tr>
                  </thead>
                  <tbody>
                    {filtered.map(c => {
                      const isExpanded = expandedRows.has(c.id);
                      return (
                        <Fragment key={c.id}>
                          <tr className={`border-b ${t.border} ${t.hoverBgSoft} cursor-pointer transition-colors`} onClick={() => setDetail(c)}>
                            <td className={`px-3 py-3 text-xs whitespace-nowrap ${t.textMuted}`}>{c.date}</td>
                            <td className={`px-3 py-3 text-xs ${t.textMuted}`}>{c.raisedBy || <span className="italic opacity-60">Anonymous</span>}</td>
                            <td className={`px-3 py-3 text-xs max-w-[200px] ${t.textPrimary}`}><span className="line-clamp-2">{c.issueRaised}</span></td>
                            <td className={`px-3 py-3 text-xs ${t.textFaint}`}>{c.category}</td>
                            <td className="px-3 py-3"><StatusBadge color={PRIORITY_HEX[c.priority] ?? ACCENT_HEX.blue} label={c.priority} /></td>
                            <td className="px-3 py-3">
                              <div className="flex flex-col">
                                <span className={`text-xs ${t.textMuted}`}>{c.supervisorName || '—'}</span>
                                {c.supervisorSignature && <span className={`text-[10px] italic ${t.textFaint}`}>{c.supervisorSignature}</span>}
                              </div>
                            </td>
                            <td className={`px-3 py-3 text-xs whitespace-nowrap ${t.textFaint}`}>{c.byWhen || '—'}</td>
                            <td className="px-3 py-3"><StatusBadge color={STATUS_HEX[c.status] ?? ACCENT_HEX.blue} label={c.status} /></td>
                            <td className="px-3 py-3">
                              <div className="flex items-center justify-end gap-0.5" onClick={e => e.stopPropagation()}>
                                <button type="button" title="Expand" onClick={() => toggleRow(c.id)} className={`h-7 w-7 flex items-center justify-center rounded ${t.textFaint} ${t.hoverText} transition-all`}>{isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}</button>
                                <button type="button" title="Edit" onClick={() => { setEditing(c); setFormOpen(true); }} className={`h-7 w-7 flex items-center justify-center rounded hover:bg-brand-500/15 ${t.textFaint} hover:text-brand-400 transition-all`}><Pencil className="h-3 w-3" /></button>
                                <button type="button" title="Delete" onClick={() => handleDelete(c.id)} className={`h-7 w-7 flex items-center justify-center rounded hover:bg-rose-500/20 ${t.textFaint} hover:${t.light ? 'text-rose-600' : 'text-rose-400'} transition-all`}><Trash2 className="h-3 w-3" /></button>
                              </div>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr className={`border-b ${t.border} ${t.chipBg}`}>
                              <td colSpan={9} className="px-5 py-3">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                                  {c.issueRaised && <div className="sm:col-span-2 lg:col-span-3"><span className={`font-semibold uppercase text-[10px] tracking-wider ${t.textFaint}`}>Issue Raised</span><p className={`mt-0.5 ${t.textMuted}`}>{c.issueRaised}</p></div>}
                                  {c.actionPlan && <div className="sm:col-span-2 lg:col-span-3"><span className={`font-semibold uppercase text-[10px] tracking-wider ${t.textFaint}`}>Action Plan</span><p className={`mt-0.5 ${t.textMuted}`}>{c.actionPlan}</p></div>}
                                  {c.location && <div><span className={t.textFaint}>Location: </span><span className={t.textMuted}>{c.location}</span></div>}
                                  {c.section && <div><span className={t.textFaint}>Section: </span><span className={t.textMuted}>{c.section}</span></div>}
                                  {c.byWho && <div><span className={t.textFaint}>Responsible: </span><span className={t.textMuted}>{c.byWho}</span></div>}
                                  {c.dateClosed && <div><span className={t.textFaint}>Date Closed: </span><span className={t.textMuted}>{c.dateClosed}</span></div>}
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {tab === 'analytics' && <AnalyticsTab stats={stats} />}

      <ComplaintForm open={formOpen} onClose={() => { setFormOpen(false); setEditing(null); }} initial={editing ?? undefined} onSave={handleSave} />
      <DetailModal complaint={detail} onClose={() => setDetail(null)} onEdit={c => { setEditing(c); setFormOpen(true); }} />
    </main>
  );
}

export default function SafetyComplaintsPage() {
  return (
    <AppShell>
      <SafetyComplaintsContent />
    </AppShell>
  );
}
