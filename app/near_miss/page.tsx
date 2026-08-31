// app/near_miss/page.tsx — Near Miss Reporting
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  AlertTriangle, RefreshCw, Users, X,
} from '@/components/shared/theme';
import { AppShell } from '@/components/app-shell';
import { api } from '@/lib/apiClient';
import { formatDate } from '@/lib/format';
import { toast } from 'sonner';
import {
  useTheme, accentText, PageHero, StatTile, StatusBadge, SearchInput, FormField, FormActions,
  useCollapseSection, CenterModal, PrimaryButton, EmptyState, ACCENT_HEX, SelectField, useConfirm, TYPE_WEIGHT,
} from '@/components/shared/theme';
import { PredictiveInput } from '@/components/shared/PredictiveInput';
import { EmployeeNameInput } from '@/components/shared/EmployeeNameInput';
import { ListAutocomplete } from '@/components/shared/ListAutocomplete';
import { DownloadButton, type DLColumn } from '@/components/shared/DownloadButton';
import { exportFilename } from '@/lib/exportUtils';
import type { NearMissReport } from './types';
import { useNearMissData, createReport, updateReport, deleteReport } from './useNearMissData';

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const fmtDate = (s: string) => (s ? formatDate(s) : '');
// A missing/malformed time doesn't throw here — `new Date('2000-01-01Tundefined')`
// is a valid Date OBJECT, just an invalid one, and .toLocaleTimeString() on it
// returns the literal string "Invalid Date" rather than throwing, so the try/catch
// never caught it. Rendered as visible "Invalid Date" text on every row (found
// live, 2026-08-29 UI audit, audit/07-ui-polish-findings.md).
const fmtTime = (s: string) => {
  if (!s) return '';
  try {
    const d = new Date(`2000-01-01T${s}`);
    return isNaN(d.getTime()) ? '' : d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  } catch { return ''; }
};
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
              <PredictiveInput historyKey="nm_department" value={form.department || ''} onChange={v => set('department', v)}
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
              <input type="date" value={form.date || ''} onChange={e => set('date', e.target.value)} title="Incident date" aria-label="Incident date" className={inputCls} />
            </FormField>
            <FormField label="Time" required>
              <input type="time" value={form.time || ''} onChange={e => set('time', e.target.value)} title="Incident time" aria-label="Incident time" className={inputCls} />
            </FormField>
            <div className="col-span-2">
              <FormField label="Location" required>
                <ListAutocomplete listName="location" value={form.location || ''} onChange={v => set('location', v)} placeholder="Specific location details" />
              </FormField>
            </div>
          </div>
          <FormField label="Description of Incident" required>
            <PredictiveInput historyKey="nm_description" value={form.description || ''} onChange={v => set('description', v)} multiline rows={4}
              placeholder="Describe what happened, as it occurred…" hints={['While operating equipment', 'During routine maintenance', 'While working at height', 'Near moving machinery', 'Slipped on wet surface', 'Electrical flash observed']} />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Witness Details">
              <PredictiveInput historyKey="nm_witness" value={form.witnessDetails || ''} onChange={v => set('witnessDetails', v)} placeholder="Names and contact info" />
            </FormField>
            <FormField label="Reporter Name">
              <EmployeeNameInput value={form.reporterName || ''} onChange={(name, emp) => { set('reporterName', name); if (emp?.department && !form.department?.trim()) set('department', emp.department); }} placeholder="Select or type name (optional)" />
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
        <button type="button" onClick={() => { onClose(); onEdit(report); }} className={`flex-1 py-2 rounded-xl text-sm ${TYPE_WEIGHT.medium} text-brand-400 hover:text-brand-300 border border-brand-400/25 transition-all`}>Edit</button>
        <button type="button" onClick={() => { onClose(); onDelete(report.id); }} className={`flex-1 py-2 rounded-xl text-sm ${TYPE_WEIGHT.medium} ${accentText('rose', t.light)} hover:bg-rose-500/20 border border-rose-500/25 transition-all`}>Delete</button>
      </div>
    </CenterModal>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

function NearMissContent() {
  const t = useTheme();
  const confirm = useConfirm();
  const sections = useCollapseSection({ hero: true, records: true });
  const { reports, setReports, loading, loadError, refreshing, loadReports } = useNearMissData();

  const [formOpen, setFormOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<NearMissReport | null>(null);
  const [selectedReport, setSelectedReport] = useState<NearMissReport | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const [search, setSearch] = useState('');
  const [sectionFilter, setSectionFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

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
    if (!await confirm({ title: 'Delete this report?', message: 'This cannot be undone.', destructive: true })) return;
    const ok = await deleteReport(id);
    if (ok) { setReports(p => p.filter(r => r.id !== id)); toast.success('Deleted'); }
    else toast.error('Failed to delete');
  };

  const toggleRow = (id: string) => setExpandedRows(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const clearFilters = () => { setSearch(''); setSectionFilter('all'); setDateFrom(''); setDateTo(''); };
  const hasFilters = !!(search || sectionFilter !== 'all' || dateFrom || dateTo);

  const selCls = `h-9 rounded-lg px-2.5 text-xs outline-none transition-colors ${t.inputBg}`;
  const thCls = `text-left px-3 py-2 text-[10px] uppercase tracking-wide ${TYPE_WEIGHT.medium} ${t.textFaint}`;

  const exportColumns: DLColumn[] = [
    { key: 'date', label: 'Date', width: 14, format: v => v ? formatDate(v as string) : '' },
    { key: 'time', label: 'Time', width: 10 },
    { key: 'department', label: 'Department', width: 18 },
    { key: 'section', label: 'Section', width: 14 },
    { key: 'location', label: 'Location', width: 20 },
    { key: 'reporterName', label: 'Reporter', width: 18, format: v => (v as string) || 'Anonymous' },
    { key: 'description', label: 'Description', width: 34 },
    { key: 'witnessDetails', label: 'Witness Details', width: 26 },
  ];

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
            {filteredReports.length > 0 && (
              <DownloadButton
                data={filteredReports as unknown as Record<string, unknown>[]}
                columns={exportColumns}
                filename={exportFilename('Near_Miss_Reports')}
                title="Near Miss Reports"
                statusColumn="section"
                statusColor={(_v, row) => SECTION_HEX[row.section as NearMissReport['section']]?.replace('#', '')}
              />
            )}
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
            <input type="date" title="From date" aria-label="From date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className={selCls} />
            <input type="date" title="To date" aria-label="To date" value={dateTo} onChange={e => setDateTo(e.target.value)} className={selCls} />
            {hasFilters && <button type="button" onClick={clearFilters} className={`flex items-center gap-1 text-xs px-2 py-1.5 rounded-lg transition-colors ${t.chipBg} ${t.textFaint} ${t.hoverBg} ${t.hoverText}`}><X className="h-3 w-3" /> Clear</button>}
            <span className={`text-[11px] ml-auto ${t.textFaint}`}>{filteredReports.length} of {reports.length}</span>
          </div>
        </div>

        {Object.keys(stats.byReporter).length > 0 && (
          <div className={`${t.glass} rounded-2xl px-5 py-3 flex flex-wrap items-center gap-2`}>
            <span className={`text-[10px] uppercase tracking-wider mr-1 flex items-center gap-1 ${t.textFaint}`}><Users className="h-3 w-3" /> By Reporter:</span>
            {Object.entries(stats.byReporter).sort((a, b) => b[1] - a[1]).map(([name, count]) => (
              <span key={name} className={`inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full ${t.chipBg} ${t.textMuted}`}>{name} <span className={`${TYPE_WEIGHT.bold} ${accentText('amber', t.light)}`}>{count}</span></span>
            ))}
          </div>
        )}

        <div className={`${t.glass} rounded-2xl ${t.shadow} overflow-hidden`}>
          <div className={`flex items-center gap-2 px-5 py-3 border-b ${t.border}`}><AlertTriangle className={`h-4 w-4 ${accentText('amber', t.light)}`} /><span className={`${TYPE_WEIGHT.semibold} text-sm ${t.textPrimary}`}>Near Miss Reports</span><span className={`ml-auto text-xs ${t.textFaint}`}>{filteredReports.length}</span></div>
          {loading ? (
            <div className="flex items-center justify-center py-16"><RefreshCw className={`h-6 w-6 animate-spin ${t.textFaint}`} /></div>
          ) : loadError ? (
            // Never show the friendly "no reports yet" state over a failed load.
            <EmptyState icon={AlertTriangle} title="Could not load reports"
              message={loadError}
              action={{ label: 'Try again', onClick: () => loadReports() }} />
          ) : filteredReports.length === 0 ? (
            <EmptyState icon={AlertTriangle} title="No reports found"
              message={hasFilters ? 'No records match your filters' : 'Submit the first near miss report using the button above'}
              action={hasFilters ? undefined : { label: 'New Report', onClick: () => { setEditingReport(null); setFormOpen(true); } }} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className={`border-b ${t.border}`}>
                  <tr><th className={thCls}>Date & Time</th><th className={thCls}>Department</th><th className={thCls}>Section</th><th className={thCls}>Location</th><th className={thCls}>Reporter</th><th className={thCls}><span className="sr-only">Actions</span></th></tr>
                </thead>
                <tbody>
                  {filteredReports.map(report => {
                    const expanded = expandedRows.has(report.id);
                    return (
                      <React.Fragment key={report.id}>
                        <tr className={`border-b ${t.border} cursor-pointer transition-colors ${expanded ? t.chipBg : t.hoverBgSoft}`} onClick={() => { setSelectedReport(report); setDetailOpen(true); }}>
                          <td className="px-3 py-3 whitespace-nowrap"><div className={`text-xs ${t.textMuted}`}>{fmtDate(report.date)}</div><div className={`text-[10px] mt-0.5 ${t.textFaint}`}>{fmtTime(report.time)}</div></td>
                          <td className={`px-3 py-3 text-sm ${TYPE_WEIGHT.medium} ${t.textPrimary}`}>{report.department}</td>
                          <td className="px-3 py-3"><StatusBadge color={SECTION_HEX[report.section]} label={report.section} /></td>
                          <td className={`px-3 py-3 text-xs max-w-[160px] truncate ${t.textFaint}`}>{report.location}</td>
                          <td className={`px-3 py-3 text-xs ${t.textFaint}`}>{report.reporterName || <span className="italic opacity-60">Anonymous</span>}</td>
                          <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                            <div className="flex gap-1 justify-end">
                              <button type="button" title={expanded ? 'Collapse' : 'Expand'} aria-label={expanded ? 'Collapse report details' : 'Expand report details'} onClick={() => toggleRow(report.id)} className={`p-1.5 rounded ${t.chipBg} ${t.hoverBg} ${t.textFaint} transition-colors`}>{expanded ? '−' : '+'}</button>
                              <button type="button" title="Edit" aria-label="Edit near miss report" onClick={() => { setEditingReport(report); setFormOpen(true); }} className={`p-1.5 rounded ${t.chipBg} ${t.hoverBg} ${t.textFaint} transition-colors`}>✎</button>
                              <button type="button" title="Delete" aria-label="Delete near miss report" onClick={() => handleDelete(report.id)} className={`p-1.5 rounded ${t.chipBg} hover:bg-rose-500/15 ${t.textFaint} hover:${t.light ? 'text-rose-600' : 'text-rose-400'} transition-colors`}>×</button>
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
