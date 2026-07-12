// app/near_miss/page.tsx — Near Miss Reporting
'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  AlertTriangle, RefreshCw, Users, X,
} from '@/components/shared/theme';
import { AppShell } from '@/components/app-shell';
import { toast } from 'sonner';
import {
  useTheme, PageHero, StatTile, StatusBadge, SearchInput, FormField, FormActions,
  useCollapseSection, CenterModal, PrimaryButton, EmptyState, ACCENT_HEX, SelectField,
} from '@/components/shared/theme';

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface NearMissReport {
  id: string;
  department: string;
  section: 'Mechanical' | 'Electrical' | 'General';
  date: string;
  time: string;
  location: string;
  description: string;
  witnessDetails: string;
  reporterName: string;
  submittedAt: string;
}

interface EmployeeItem { id: string; employee_id?: string; first_name: string; last_name: string; department?: string; }

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://myofficebackend.onrender.com';

// ─── API ─────────────────────────────────────────────────────────────────────

async function safetyFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { headers: { 'Content-Type': 'application/json' }, ...init });
  if (!res.ok) throw new Error(await res.text());
  return res.status === 204 ? (undefined as T) : res.json();
}
async function getReports(): Promise<NearMissReport[]> {
  try { const data = await safetyFetch<NearMissReport[]>('/api/nearmiss/'); return Array.isArray(data) ? data : []; }
  catch { return []; }
}
async function createReport(report: Partial<NearMissReport>): Promise<NearMissReport | null> {
  try { return await safetyFetch<NearMissReport>('/api/nearmiss/', { method: 'POST', body: JSON.stringify(report) }); }
  catch { return null; }
}
async function updateReport(id: string, report: Partial<NearMissReport>): Promise<NearMissReport | null> {
  try { return await safetyFetch<NearMissReport>(`/api/nearmiss/${id}`, { method: 'PATCH', body: JSON.stringify(report) }); }
  catch { return null; }
}
async function deleteReport(id: string): Promise<boolean> {
  try { await safetyFetch(`/api/nearmiss/${id}`, { method: 'DELETE' }); return true; }
  catch { return false; }
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const fmtDate = (s: string) => s ? new Date(s).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
const fmtTime = (s: string) => { try { return new Date(`2000-01-01T${s}`).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }); } catch { return s; } };
const SECTION_HEX: Record<NearMissReport['section'], string> = { Mechanical: '#86BBD8', Electrical: '#fbbf24', General: '#a78bfa' };

function calcStats(reports: NearMissReport[]) {
  const bySection: Record<string, number> = { Mechanical: 0, Electrical: 0, General: 0 };
  const byReporter: Record<string, number> = {};
  reports.forEach(r => {
    if (r.section in bySection) bySection[r.section]++;
    if (r.reporterName?.trim()) byReporter[r.reporterName.trim()] = (byReporter[r.reporterName.trim()] || 0) + 1;
  });
  return { total: reports.length, bySection, byReporter };
}

// ─── PREDICTIVE TEXT (localStorage history) ──────────────────────────────────

function usePredictiveHistory(key: string) {
  const [history, setHistory] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try { return JSON.parse(localStorage.getItem(`nm_hist_${key}`) || '[]'); } catch { return []; }
  });
  const remember = (val: string) => {
    if (!val.trim()) return;
    setHistory(prev => {
      const next = [val, ...prev.filter(v => v !== val)].slice(0, 20);
      localStorage.setItem(`nm_hist_${key}`, JSON.stringify(next));
      return next;
    });
  };
  return { history, remember };
}

function PredictiveField({ historyKey, value, onChange, placeholder, hints, multiline, rows = 3 }: {
  historyKey: string; value: string; onChange: (v: string) => void; placeholder?: string; hints?: string[]; multiline?: boolean; rows?: number;
}) {
  const t = useTheme();
  const { history, remember } = usePredictiveHistory(historyKey);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const allOptions = useMemo(() => [...new Set([...history, ...(hints || [])])], [history, hints]);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h);
  }, []);

  const q = value.toLowerCase();
  const suggestions = q.length === 0 ? allOptions.slice(0, 6) : allOptions.filter(o => o.toLowerCase().includes(q) && o.toLowerCase() !== q).slice(0, 6);
  const inputCls = `w-full rounded-lg px-3 py-1.5 text-sm outline-none transition-colors ${t.inputBg}`;

  const Field = multiline ? 'textarea' : 'input';

  return (
    <div className="relative" ref={ref}>
      <Field
        value={value}
        rows={multiline ? rows : undefined}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => { if (value.trim()) remember(value.trim()); }}
        placeholder={placeholder}
        className={`${inputCls} ${multiline ? 'resize-none' : ''}`}
      />
      {open && suggestions.length > 0 && (
        <div className={`absolute z-50 w-full mt-1 rounded-xl overflow-hidden ${t.glass} ${t.shadow}`}>
          <div className="max-h-40 overflow-y-auto">
            {suggestions.map(s => (
              <button key={s} type="button" onMouseDown={() => { onChange(s); setOpen(false); }}
                className={`w-full text-left px-3 py-2 text-xs ${t.textMuted} ${t.hoverBgSoft} transition-colors truncate`}>{s}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

let _empCache: EmployeeItem[] = [];
let _empFetched = false;
function useEmployees() {
  const [list, setList] = useState<EmployeeItem[]>(_empCache);
  useEffect(() => {
    if (_empFetched) return;
    fetch(`${API_BASE}/api/employees`).then(r => r.json()).then((d: EmployeeItem[]) => { if (Array.isArray(d)) { _empCache = d; setList(d); } _empFetched = true; }).catch(() => { _empFetched = true; });
  }, []);
  return list;
}

function EmployeeField({ value, onChange, placeholder }: { value: string; onChange: (name: string, emp?: EmployeeItem) => void; placeholder?: string }) {
  const t = useTheme();
  const employees = useEmployees();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h);
  }, []);

  const q = value.toLowerCase();
  const suggestions = q.length === 0 ? employees.slice(0, 6) : employees.filter(e => `${e.first_name} ${e.last_name}`.toLowerCase().includes(q)).slice(0, 6);

  return (
    <div className="relative" ref={ref}>
      <input value={value} onChange={e => { onChange(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)}
        placeholder={placeholder} className={`w-full rounded-lg px-3 py-1.5 text-sm outline-none transition-colors ${t.inputBg}`} />
      {open && suggestions.length > 0 && (
        <div className={`absolute z-50 w-full mt-1 rounded-xl overflow-hidden ${t.glass} ${t.shadow}`}>
          <div className="max-h-40 overflow-y-auto">
            {suggestions.map(e => {
              const full = `${e.first_name} ${e.last_name}`;
              return <button key={e.id} type="button" onMouseDown={() => { onChange(full, e); setOpen(false); }} className={`w-full text-left px-3 py-2 text-xs ${t.textMuted} ${t.hoverBgSoft} transition-colors truncate`}>{full}{e.department ? ` · ${e.department}` : ''}</button>;
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── FORM MODAL ───────────────────────────────────────────────────────────────

function ReportFormModal({ open, onClose, onSave, report }: {
  open: boolean; onClose: () => void;
  onSave: (data: Partial<NearMissReport>) => Promise<void>;
  report?: NearMissReport | null;
}) {
  const t = useTheme();
  const [form, setForm] = useState<Partial<NearMissReport>>({});
  const [saving, setSaving] = useState(false);
  const set = (k: keyof NearMissReport, v: string) => setForm(p => ({ ...p, [k]: v }));

  useEffect(() => {
    if (open) {
      setForm(report ? {
        department: report.department, section: report.section, date: report.date,
        time: report.time, location: report.location, description: report.description,
        witnessDetails: report.witnessDetails || '', reporterName: report.reporterName || '',
      } : {
        department: 'Engineering', section: 'General',
        date: new Date().toISOString().slice(0, 10),
        time: new Date().toTimeString().slice(0, 5),
        location: '', description: '', witnessDetails: '', reporterName: '',
      });
    }
  }, [open, report]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.department?.trim()) { toast.error('Department is required'); return; }
    if (!form.location?.trim()) { toast.error('Location is required'); return; }
    if (!form.description?.trim()) { toast.error('Description is required'); return; }
    setSaving(true);
    try { await onSave(form); } finally { setSaving(false); }
  };

  const inputCls = `w-full rounded-lg px-3 py-1.5 text-sm outline-none transition-colors ${t.inputBg}`;

  return (
    <CenterModal open={open} onClose={onClose} title={report ? 'Edit Near Miss Report' : 'New Near Miss Report'} accent="amber" width="max-w-2xl">
      <form onSubmit={handleSubmit}>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Department" required>
              <PredictiveField historyKey="nm_department" value={form.department || ''} onChange={v => set('department', v)}
                placeholder="e.g. Engineering" hints={['Engineering', 'Mechanical', 'Electrical', 'Mining', 'Processing', 'Safety', 'Maintenance', 'Operations', 'HR', 'Administration']} />
            </FormField>
            <FormField label="Section">
              <SelectField size="form" value={form.section || 'General'} onChange={v => set('section', v as NearMissReport['section'])}
                title="Section"
                options={[
                  { value: 'Mechanical', label: 'Mechanical' },
                  { value: 'Electrical', label: 'Electrical' },
                  { value: 'General', label: 'General / Other' },
                ]} />
            </FormField>
            <FormField label="Date" required>
              <input type="date" value={form.date || ''} onChange={e => set('date', e.target.value)} title="Incident date" className={inputCls} />
            </FormField>
            <FormField label="Time" required>
              <input type="time" value={form.time || ''} onChange={e => set('time', e.target.value)} title="Incident time" className={inputCls} />
            </FormField>
            <div className="col-span-2">
              <FormField label="Location" required>
                <PredictiveField historyKey="nm_location" value={form.location || ''} onChange={v => set('location', v)}
                  placeholder="Specific location details" hints={['Main Workshop', 'Crusher Bay', 'Processing Plant', 'Pit Area', 'Electrical Substation', 'Compressor Room', 'Conveyor Belt', 'Administration Block']} />
              </FormField>
            </div>
          </div>
          <FormField label="Description of Incident" required>
            <PredictiveField historyKey="nm_description" value={form.description || ''} onChange={v => set('description', v)} multiline rows={4}
              placeholder="Describe what happened, as it occurred…" hints={['While operating equipment', 'During routine maintenance', 'While working at height', 'Near moving machinery', 'Slipped on wet surface', 'Electrical flash observed']} />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Witness Details">
              <PredictiveField historyKey="nm_witness" value={form.witnessDetails || ''} onChange={v => set('witnessDetails', v)} placeholder="Names and contact info" />
            </FormField>
            <FormField label="Reporter Name">
              <EmployeeField value={form.reporterName || ''} onChange={(name, emp) => { set('reporterName', name); if (emp?.department && !form.department?.trim()) set('department', emp.department); }} placeholder="Select or type name (optional)" />
            </FormField>
          </div>
        </div>
        <FormActions onCancel={onClose} submitting={saving} submitLabel={report ? 'Update Report' : 'Submit Report'} accent="amber" />
      </form>
    </CenterModal>
  );
}

// ─── DETAIL MODAL ─────────────────────────────────────────────────────────────

function ReportDetailModal({ report, open, onClose, onEdit, onDelete }: {
  report: NearMissReport | null; open: boolean; onClose: () => void;
  onEdit: (r: NearMissReport) => void; onDelete: (id: string) => void;
}) {
  const t = useTheme();
  if (!report) return null;
  const fields = [
    { label: 'Department', value: report.department },
    { label: 'Section', value: <StatusBadge color={SECTION_HEX[report.section]} label={report.section} /> },
    { label: 'Date', value: fmtDate(report.date) },
    { label: 'Time', value: fmtTime(report.time) },
    { label: 'Location', value: report.location, full: true },
    { label: 'Reporter', value: report.reporterName || 'Anonymous' },
  ];
  return (
    <CenterModal open={open} onClose={onClose} title="Near Miss Report Details" accent="amber" width="max-w-2xl">
      <div className="p-5 space-y-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          {fields.map(f => (
            <div key={f.label} className={f.full ? 'col-span-2' : ''}>
              <div className={`text-[10px] uppercase tracking-wide mb-0.5 ${t.textFaint}`}>{f.label}</div>
              <div className={t.textMuted}>{f.value}</div>
            </div>
          ))}
        </div>
        <div className={`rounded-xl p-3 ${t.chipBg}`}>
          <div className={`text-[10px] uppercase tracking-wide mb-1.5 ${t.textFaint}`}>Description of Incident</div>
          <p className={`text-sm whitespace-pre-wrap leading-relaxed ${t.textMuted}`}>{report.description}</p>
        </div>
        {report.witnessDetails && (
          <div className={`rounded-xl p-3 ${t.chipBg}`}>
            <div className={`text-[10px] uppercase tracking-wide mb-1.5 ${t.textFaint}`}>Witness Details</div>
            <p className={`text-sm ${t.textMuted}`}>{report.witnessDetails}</p>
          </div>
        )}
      </div>
      <div className={`flex gap-2 px-5 py-4 border-t ${t.border}`}>
        <button type="button" onClick={onClose} className={`flex-1 py-2 rounded-xl text-sm ${t.textMuted} ${t.hoverText} border ${t.border} transition-all`}>Close</button>
        <button type="button" onClick={() => { onClose(); onEdit(report); }} className="flex-1 py-2 rounded-xl text-sm font-medium text-blue-400 hover:text-blue-300 border border-blue-400/25 transition-all">Edit</button>
        <button type="button" onClick={() => { onClose(); onDelete(report.id); }} className="flex-1 py-2 rounded-xl text-sm font-medium text-rose-400 hover:bg-rose-500/20 border border-rose-500/25 transition-all">Delete</button>
      </div>
    </CenterModal>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

function NearMissContent() {
  const t = useTheme();
  const sections = useCollapseSection({ hero: true, records: true });
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [reports, setReports] = useState<NearMissReport[]>([]);

  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<NearMissReport | null>(null);
  const [selectedReport, setSelectedReport] = useState<NearMissReport | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const [search, setSearch] = useState('');
  const [sectionFilter, setSectionFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const loadReports = async (quiet = false) => {
    if (!quiet) setLoading(true);
    setRefreshing(true);
    try { setReports(await getReports()); }
    catch { toast.error('Failed to load reports'); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { loadReports(); }, []);

  const stats = useMemo(() => calcStats(reports), [reports]);

  const filteredReports = useMemo(() => reports.filter(r => {
    const matchSearch = !search || r.department?.toLowerCase().includes(search.toLowerCase()) ||
      (r.reporterName || '').toLowerCase().includes(search.toLowerCase()) ||
      r.location?.toLowerCase().includes(search.toLowerCase());
    const matchSection = sectionFilter === 'all' || r.section === sectionFilter;
    const matchFrom = !dateFrom || r.date >= dateFrom;
    const matchTo = !dateTo || r.date <= dateTo;
    return matchSearch && matchSection && matchFrom && matchTo;
  }), [reports, search, sectionFilter, dateFrom, dateTo]);

  const handleSave = async (formData: Partial<NearMissReport>) => {
    try {
      if (editingReport) {
        const updated = await updateReport(editingReport.id, formData);
        if (updated) { setReports(p => p.map(r => r.id === updated.id ? updated : r)); toast.success('Report updated'); }
        else toast.error('Failed to update');
      } else {
        const created = await createReport(formData);
        if (created) { setReports(p => [created, ...p]); toast.success('Report submitted'); }
        else toast.error('Failed to submit');
      }
      setFormOpen(false); setEditingReport(null);
    } catch { toast.error('Failed to save report'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this report? This cannot be undone.')) return;
    const ok = await deleteReport(id);
    if (ok) { setReports(p => p.filter(r => r.id !== id)); toast.success('Deleted'); }
    else toast.error('Failed to delete');
  };

  const toggleRow = (id: string) => setExpandedRows(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const clearFilters = () => { setSearch(''); setSectionFilter('all'); setDateFrom(''); setDateTo(''); };
  const hasFilters = !!(search || sectionFilter !== 'all' || dateFrom || dateTo);

  const selCls = `h-9 rounded-lg px-2.5 text-xs outline-none transition-colors ${t.inputBg}`;
  const thCls = `text-left px-3 py-2 text-[10px] uppercase tracking-wide font-medium ${t.textFaint}`;

  return (
    <main className="max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <PageHero
        icon={AlertTriangle}
        accent="violet"
        crumbs={['Safety & Compliance', 'Near Miss']}
        title="Near Miss Reporting"
        description="Report dangerous occurrences — every report helps prevent future incidents"
        statsOpen={sections.expanded.hero}
        actions={
          <>
            <button type="button" onClick={() => loadReports(true)} title="Refresh" className={`h-8 w-8 flex items-center justify-center rounded-lg ${t.hoverBg} ${t.textFaint} ${t.hoverText}`}><RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} /></button>
            <PrimaryButton icon={AlertTriangle} accent="amber" onClick={() => { setEditingReport(null); setFormOpen(true); }}>New Report</PrimaryButton>
          </>
        }
      >
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <StatTile icon={AlertTriangle} color="#fbbf24" label="Total Reports" value={stats.total} />
          <StatTile icon={AlertTriangle} color={ACCENT_HEX.blue} label="Mechanical" value={stats.bySection.Mechanical || 0} />
          <StatTile icon={AlertTriangle} color="#fbbf24" label="Electrical" value={stats.bySection.Electrical || 0} />
          <StatTile icon={AlertTriangle} color="#a78bfa" label="General" value={stats.bySection.General || 0} />
          <StatTile icon={Users} color="#34d399" label="Unique Reporters" value={Object.keys(stats.byReporter).length} />
        </div>
      </PageHero>

      {sections.expanded.records && <>
        <div className={`${t.glass} rounded-2xl ${t.shadow} overflow-hidden`}>
          <div className="px-5 py-3 flex flex-wrap items-center gap-2">
            <SearchInput value={search} onChange={setSearch} placeholder="Search department, reporter, location…" className="w-56" />
            <SelectField size="filter" title="Section" value={sectionFilter} onChange={setSectionFilter}
              options={[{ value: 'all', label: 'All Sections' }, { value: 'Mechanical', label: 'Mechanical' }, { value: 'Electrical', label: 'Electrical' }, { value: 'General', label: 'General' }]} />
            <input type="date" title="From date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className={selCls} />
            <input type="date" title="To date" value={dateTo} onChange={e => setDateTo(e.target.value)} className={selCls} />
            {hasFilters && <button type="button" onClick={clearFilters} className={`flex items-center gap-1 text-xs px-2 py-1.5 rounded-lg transition-colors ${t.chipBg} ${t.textFaint} ${t.hoverBg} ${t.hoverText}`}><X className="h-3 w-3" /> Clear</button>}
            <span className={`text-[11px] ml-auto ${t.textFaint}`}>{filteredReports.length} of {reports.length}</span>
          </div>
        </div>

        {Object.keys(stats.byReporter).length > 0 && (
          <div className={`${t.glass} rounded-2xl px-5 py-3 flex flex-wrap items-center gap-2`}>
            <span className={`text-[10px] uppercase tracking-wider mr-1 flex items-center gap-1 ${t.textFaint}`}><Users className="h-3 w-3" /> By Reporter:</span>
            {Object.entries(stats.byReporter).sort((a, b) => b[1] - a[1]).map(([name, count]) => (
              <span key={name} className={`inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full ${t.chipBg} ${t.textMuted}`}>{name} <span className="font-bold text-amber-400">{count}</span></span>
            ))}
          </div>
        )}

        <div className={`${t.glass} rounded-2xl ${t.shadow} overflow-hidden`}>
          <div className={`flex items-center gap-2 px-5 py-3 border-b ${t.border}`}><AlertTriangle className="h-4 w-4 text-amber-400" /><span className={`font-semibold text-sm ${t.textPrimary}`}>Near Miss Reports</span><span className={`ml-auto text-xs ${t.textFaint}`}>{filteredReports.length}</span></div>
          {loading ? (
            <div className="flex items-center justify-center py-16"><RefreshCw className={`h-6 w-6 animate-spin ${t.textFaint}`} /></div>
          ) : filteredReports.length === 0 ? (
            <EmptyState icon={AlertTriangle} title="No reports found"
              message={hasFilters ? 'No records match your filters' : 'Submit the first near miss report using the button above'}
              action={hasFilters ? undefined : { label: 'New Report', onClick: () => { setEditingReport(null); setFormOpen(true); } }} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className={`border-b ${t.border}`}>
                  <tr><th className={thCls}>Date & Time</th><th className={thCls}>Department</th><th className={thCls}>Section</th><th className={thCls}>Location</th><th className={thCls}>Reporter</th><th className={thCls}></th></tr>
                </thead>
                <tbody>
                  {filteredReports.map(report => {
                    const expanded = expandedRows.has(report.id);
                    return (
                      <React.Fragment key={report.id}>
                        <tr className={`border-b ${t.border} cursor-pointer transition-colors ${expanded ? t.chipBg : t.hoverBgSoft}`} onClick={() => { setSelectedReport(report); setDetailOpen(true); }}>
                          <td className="px-3 py-3 whitespace-nowrap"><div className={`text-xs ${t.textMuted}`}>{fmtDate(report.date)}</div><div className={`text-[10px] mt-0.5 ${t.textFaint}`}>{fmtTime(report.time)}</div></td>
                          <td className={`px-3 py-3 text-sm font-medium ${t.textPrimary}`}>{report.department}</td>
                          <td className="px-3 py-3"><StatusBadge color={SECTION_HEX[report.section]} label={report.section} /></td>
                          <td className={`px-3 py-3 text-xs max-w-[160px] truncate ${t.textFaint}`}>{report.location}</td>
                          <td className={`px-3 py-3 text-xs ${t.textFaint}`}>{report.reporterName || <span className="italic opacity-60">Anonymous</span>}</td>
                          <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                            <div className="flex gap-1 justify-end">
                              <button type="button" title={expanded ? 'Collapse' : 'Expand'} onClick={() => toggleRow(report.id)} className={`p-1.5 rounded ${t.chipBg} ${t.hoverBg} ${t.textFaint} transition-colors`}>{expanded ? '−' : '+'}</button>
                              <button type="button" title="Edit" onClick={() => { setEditingReport(report); setFormOpen(true); }} className={`p-1.5 rounded ${t.chipBg} ${t.hoverBg} ${t.textFaint} transition-colors`}>✎</button>
                              <button type="button" title="Delete" onClick={() => handleDelete(report.id)} className={`p-1.5 rounded ${t.chipBg} hover:bg-rose-500/15 ${t.textFaint} hover:text-rose-400 transition-colors`}>×</button>
                            </div>
                          </td>
                        </tr>
                        {expanded && (
                          <tr className={`border-b ${t.border}`}>
                            <td colSpan={6} className="px-5 py-4">
                              <div className={`text-[10px] uppercase tracking-wider mb-1.5 ${t.textFaint}`}>Description</div>
                              <p className={`text-sm whitespace-pre-wrap leading-relaxed ${t.textMuted}`}>{report.description}</p>
                              {report.witnessDetails && (
                                <>
                                  <div className={`text-[10px] uppercase tracking-wider mt-3 mb-1 ${t.textFaint}`}>Witness Details</div>
                                  <p className={`text-xs ${t.textFaint}`}>{report.witnessDetails}</p>
                                </>
                              )}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </>}

      <ReportFormModal open={formOpen} onClose={() => { setFormOpen(false); setEditingReport(null); }} onSave={handleSave} report={editingReport} />
      <ReportDetailModal report={selectedReport} open={detailOpen} onClose={() => setDetailOpen(false)} onEdit={r => { setEditingReport(r); setFormOpen(true); }} onDelete={handleDelete} />
    </main>
  );
}

export default function NearMissPage() {
  return (
    <AppShell>
      <NearMissContent />
    </AppShell>
  );
}
