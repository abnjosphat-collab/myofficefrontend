// app/near_miss/page.tsx — Near Miss Reporting
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  AlertTriangle, Calendar, Clock, MapPin, Building2, User,
  Users, RefreshCw, ChevronDown, ChevronUp, BarChart3,
} from 'lucide-react';
import { PageShell } from '@/components/PageShell';
import { toast } from 'sonner';
import {
  API_URL, glassInput, glassLabel, glassTextarea,
  SafetyHero, SafetyPanel, SafetyControls, SafetySearchBar,
  FilterPills, SafetyModal, FormField, ModalActions,
  SafetyTable, SectionBadge, RowActions,
  LoadingState, EmptyState, DateRangeFilter, ClearFiltersButton,
  safetyFetch,
} from '@/components/safety';
import { usePageCollapse, MasterCollapseButton } from '@/components/shared';

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

// ─── API ─────────────────────────────────────────────────────────────────────

async function getReports(): Promise<NearMissReport[]> {
  try {
    const data = await safetyFetch<any>('/api/nearmiss/');
    return Array.isArray(data) ? data : [];
  } catch { return []; }
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

function calcStats(reports: NearMissReport[]) {
  const bySection: Record<string, number> = { Mechanical: 0, Electrical: 0, General: 0 };
  const byReporter: Record<string, number> = {};
  reports.forEach(r => {
    if (r.section in bySection) bySection[r.section]++;
    if (r.reporterName?.trim()) byReporter[r.reporterName.trim()] = (byReporter[r.reporterName.trim()] || 0) + 1;
  });
  return { total: reports.length, bySection, byReporter };
}

// ─── FORM MODAL ───────────────────────────────────────────────────────────────

function ReportFormModal({ open, onClose, onSave, report }: {
  open: boolean; onClose: () => void;
  onSave: (data: Partial<NearMissReport>) => Promise<void>;
  report?: NearMissReport | null;
}) {
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
        department: '', section: 'General',
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

  return (
    <SafetyModal open={open} onClose={onClose} icon={AlertTriangle} accentColor="#f59e0b"
      title={report ? 'Edit Near Miss Report' : 'New Near Miss Report'} width="max-w-2xl">
      <form onSubmit={handleSubmit}>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Department" required>
              <input type="text" value={form.department || ''} onChange={e => set('department', e.target.value)}
                placeholder="Department where incident occurred" className={glassInput} />
            </FormField>
            <FormField label="Section">
              <select value={form.section || 'General'} onChange={e => set('section', e.target.value as any)}
                title="Section" className={glassInput} style={{ colorScheme: 'dark' }}>
                <option value="Mechanical">Mechanical</option>
                <option value="Electrical">Electrical</option>
                <option value="General">General / Other</option>
              </select>
            </FormField>
            <FormField label="Date" required>
              <input type="date" value={form.date || ''} onChange={e => set('date', e.target.value)}
                title="Incident date" placeholder="Date" className={glassInput} style={{ colorScheme: 'dark' }} />
            </FormField>
            <FormField label="Time" required>
              <input type="time" value={form.time || ''} onChange={e => set('time', e.target.value)}
                title="Incident time" placeholder="Time" className={glassInput} style={{ colorScheme: 'dark' }} />
            </FormField>
            <FormField label="Location" required className="col-span-2">
              <input type="text" value={form.location || ''} onChange={e => set('location', e.target.value)}
                placeholder="Specific location details" className={glassInput} />
            </FormField>
          </div>
          <FormField label="Description of Incident" required>
            <textarea value={form.description || ''} onChange={e => set('description', e.target.value)}
              placeholder="Describe what happened, as it occurred…" rows={4} className={glassTextarea} />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Witness Details">
              <input type="text" value={form.witnessDetails || ''} onChange={e => set('witnessDetails', e.target.value)}
                placeholder="Names and contact info" className={glassInput} />
            </FormField>
            <FormField label="Reporter Name">
              <input type="text" value={form.reporterName || ''} onChange={e => set('reporterName', e.target.value)}
                placeholder="Your name (optional)" className={glassInput} />
            </FormField>
          </div>
        </div>
        <ModalActions onCancel={onClose} submitting={saving}
          submitLabel={report ? 'Update Report' : 'Submit Report'} />
      </form>
    </SafetyModal>
  );
}

// ─── DETAIL MODAL ─────────────────────────────────────────────────────────────

function ReportDetailModal({ report, open, onClose, onEdit, onDelete }: {
  report: NearMissReport | null; open: boolean; onClose: () => void;
  onEdit: (r: NearMissReport) => void; onDelete: (id: string) => void;
}) {
  if (!report) return null;
  return (
    <SafetyModal open={open} onClose={onClose} icon={AlertTriangle} accentColor="#f59e0b"
      title="Near Miss Report Details" width="max-w-2xl">
      <div className="p-5 space-y-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          {[
            { label: 'Department', value: report.department },
            { label: 'Section', value: <SectionBadge section={report.section} /> },
            { label: 'Date', value: fmtDate(report.date) },
            { label: 'Time', value: fmtTime(report.time) },
            { label: 'Location', value: report.location, full: true },
            { label: 'Reporter', value: report.reporterName || 'Anonymous' },
          ].map((f: any) => (
            <div key={f.label} className={f.full ? 'col-span-2' : ''}>
              <div className={glassLabel}>{f.label}</div>
              <div className="text-white/80">{f.value}</div>
            </div>
          ))}
        </div>
        <div className="rounded-xl p-3 bg-white/[0.04] border border-white/[0.07]">
          <div className={glassLabel + ' mb-1.5'}>Description of Incident</div>
          <p className="text-sm text-white/75 whitespace-pre-wrap leading-relaxed">{report.description}</p>
        </div>
        {report.witnessDetails && (
          <div className="rounded-xl p-3 bg-white/[0.04] border border-white/[0.07]">
            <div className={glassLabel + ' mb-1.5'}>Witness Details</div>
            <p className="text-sm text-white/75">{report.witnessDetails}</p>
          </div>
        )}
      </div>
      <div className="flex gap-2 px-5 py-4 border-t border-white/[0.08]">
        <button type="button" onClick={onClose}
          className="flex-1 py-2 rounded-xl text-sm text-white/50 hover:text-white border border-white/10 hover:border-white/20 transition-all">
          Close
        </button>
        <button type="button" onClick={() => { onClose(); onEdit(report); }}
          className="flex-1 py-2 rounded-xl text-sm font-medium text-[#86BBD8] hover:text-white border border-[#86BBD8]/25 hover:border-[#86BBD8]/50 transition-all">
          Edit
        </button>
        <button type="button" onClick={() => { onClose(); onDelete(report.id); }}
          className="flex-1 py-2 rounded-xl text-sm font-medium text-rose-400 hover:text-white border border-rose-500/25 hover:bg-rose-500/20 transition-all">
          Delete
        </button>
      </div>
    </SafetyModal>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function NearMissPage() {
  const sections = usePageCollapse({ stats: true, records: true });
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
    try {
      const data = await getReports();
      setReports(data);
    } catch { toast.error('Failed to load reports'); }
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

  const toggleRow = (id: string) =>
    setExpandedRows(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const clearFilters = () => { setSearch(''); setSectionFilter('all'); setDateFrom(''); setDateTo(''); };
  const hasFilters = search || sectionFilter !== 'all' || dateFrom || dateTo;

  const heroStats = [
    { label: 'Total Reports', value: stats.total, color: '#f59e0b' },
    { label: 'Mechanical', value: stats.bySection.Mechanical || 0, color: '#86BBD8' },
    { label: 'Electrical', value: stats.bySection.Electrical || 0, color: '#f59e0b' },
    { label: 'General', value: stats.bySection.General || 0, color: '#a78bfa' },
    { label: 'Unique Reporters', value: Object.keys(stats.byReporter).length, color: '#34d399' },
  ];

  return (
    <PageShell>
      <main className="container mx-auto px-4 py-8 space-y-4">

        <SafetyHero
          icon={AlertTriangle} accentColor="#f59e0b"
          title="Near Miss Reporting"
          subtitle="Report dangerous occurrences — every report helps prevent future incidents"
          stats={heroStats}
          showStats={sections.expanded.stats} onToggleStats={() => sections.toggle('stats')}
          onRefresh={() => loadReports(true)} refreshing={refreshing}
          actions={
            <div className="flex items-center gap-2">
            <MasterCollapseButton collapse={sections} />
            <button type="button" onClick={() => { setEditingReport(null); setFormOpen(true); }}
              className="h-8 px-3 flex items-center gap-1.5 text-xs rounded-xl font-semibold text-white transition-all hover:-translate-y-0.5"
              style={{ background: 'linear-gradient(135deg,#b45309,#92400e)', border: '1px solid rgba(245,158,11,0.4)' }}>
              <AlertTriangle className="h-3.5 w-3.5" /> New Report
            </button>
            </div>
          }
        />

        {sections.expanded.records && <>
        {/* Controls */}
        <SafetyControls>
          <SafetySearchBar value={search} onChange={setSearch} placeholder="Search department, reporter, location…" />
          <FilterPills accentColor="#f59e0b" value={sectionFilter} onChange={setSectionFilter}
            options={[
              { value: 'all', label: 'All Sections' },
              { value: 'Mechanical', label: 'Mechanical' },
              { value: 'Electrical', label: 'Electrical' },
              { value: 'General', label: 'General' },
            ]} />
          <DateRangeFilter from={dateFrom} to={dateTo} onFromChange={setDateFrom} onToChange={setDateTo} />
          {hasFilters && <ClearFiltersButton onClick={clearFilters} />}
        </SafetyControls>

        {/* By-reporter strip */}
        {Object.keys(stats.byReporter).length > 0 && (
          <div className="oz-glass-panel rounded-2xl px-5 py-3 flex flex-wrap items-center gap-2">
            <span className="text-[10px] text-white/30 uppercase tracking-wider mr-1 flex items-center gap-1">
              <Users className="h-3 w-3" /> By Reporter:
            </span>
            {Object.entries(stats.byReporter).sort((a, b) => b[1] - a[1]).map(([name, count]) => (
              <span key={name} className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full bg-white/[0.07] border border-white/[0.10] text-white/60">
                {name} <span className="font-bold text-[#f59e0b]">{count}</span>
              </span>
            ))}
          </div>
        )}

        {/* Table */}
        <SafetyPanel label="Near Miss Reports" count={filteredReports.length}>
          {loading ? (
            <LoadingState />
          ) : filteredReports.length === 0 ? (
            <EmptyState icon={AlertTriangle} title="No reports found"
              message={hasFilters ? 'No records match your filters' : 'Submit the first near miss report using the button above'}
              onAdd={hasFilters ? undefined : () => { setEditingReport(null); setFormOpen(true); }}
              addLabel="New Report" />
          ) : (
            <SafetyTable headers={[
              { label: 'Date & Time', className: 'pl-5 pr-3 text-left' },
              { label: 'Department', className: 'px-3 text-left' },
              { label: 'Section', className: 'px-3 text-left' },
              { label: 'Location', className: 'px-3 text-left' },
              { label: 'Reporter', className: 'px-3 text-left' },
              { label: '', className: 'px-3 w-24' },
            ]}>
              {filteredReports.map(report => {
                const expanded = expandedRows.has(report.id);
                return (
                  <React.Fragment key={report.id}>
                    <tr className={`border-b border-white/[0.04] cursor-pointer transition-colors ${expanded ? 'bg-white/[0.06]' : 'hover:bg-white/[0.03]'}`}
                      onClick={() => { setSelectedReport(report); setDetailOpen(true); }}>
                      <td className="pl-5 pr-3 py-3 whitespace-nowrap">
                        <div className="text-xs text-white/70">{fmtDate(report.date)}</div>
                        <div className="text-[10px] text-white/35 mt-0.5">{fmtTime(report.time)}</div>
                      </td>
                      <td className="px-3 py-3 text-sm font-medium text-white">{report.department}</td>
                      <td className="px-3 py-3"><SectionBadge section={report.section} /></td>
                      <td className="px-3 py-3 text-xs text-white/60 max-w-[160px] truncate">{report.location}</td>
                      <td className="px-3 py-3 text-xs text-white/55">{report.reporterName || <span className="text-white/25 italic">Anonymous</span>}</td>
                      <td className="px-3 py-3">
                        <RowActions
                          expanded={expanded} onToggle={() => toggleRow(report.id)}
                          onEdit={() => { setEditingReport(report); setFormOpen(true); }}
                          onDelete={() => handleDelete(report.id)} />
                      </td>
                    </tr>
                    {expanded && (
                      <tr className="border-b border-white/[0.04]">
                        <td colSpan={6} className="pl-5 pr-5 py-4">
                          <div className="text-[10px] text-white/30 uppercase tracking-wider mb-1.5">Description</div>
                          <p className="text-sm text-white/70 whitespace-pre-wrap leading-relaxed">{report.description}</p>
                          {report.witnessDetails && (
                            <>
                              <div className="text-[10px] text-white/30 uppercase tracking-wider mt-3 mb-1">Witness Details</div>
                              <p className="text-xs text-white/55">{report.witnessDetails}</p>
                            </>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </SafetyTable>
          )}
        </SafetyPanel>
        </>}

        <ReportFormModal open={formOpen} onClose={() => { setFormOpen(false); setEditingReport(null); }}
          onSave={handleSave} report={editingReport} />
        <ReportDetailModal report={selectedReport} open={detailOpen}
          onClose={() => setDetailOpen(false)} onEdit={r => { setEditingReport(r); setFormOpen(true); }}
          onDelete={handleDelete} />
      </main>
    </PageShell>
  );
}
