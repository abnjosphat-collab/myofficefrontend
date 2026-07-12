// app/reports/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import type { ElementType } from 'react';
import Link from 'next/link';
import {
  FilePieChart, Download, Calendar, Wrench,
  Calculator, Shield, Building, Eye, MoreHorizontal,
  Search, Plus, FileText, Trash2, RefreshCw, File,
  Table as TableIcon, Sparkles, DownloadCloud,
  BarChart, LayoutGrid, List, X, SlidersHorizontal, Users, Hash,
} from '@/components/shared/theme';
import { AppShell } from '@/components/app-shell';
import {
  useTheme, PageHero, StatTile, StatusBadge, SearchInput, ViewToggle, PrimaryButton,
  EmptyState, useCollapseSection, GlowCard, SelectField,
} from '@/components/shared/theme';

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface ReportMetadata { totalRecords: number; columns: string[]; }
interface Report {
  id: string; title: string; type: string; format: string;
  description?: string; generatedAt: string;
  data: Record<string, unknown>[];
  columns?: string[]; metadata?: ReportMetadata;
}
interface ReportCardProps {
  report: Report;
  onDownload: (r: Report) => Promise<void>;
  onDelete: (id: string) => void;
  isLoading: boolean;
}

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const REPORTS_STORAGE_KEY = 'generated-reports';

const TYPE_META: Record<string, { icon: ElementType; hex: string }> = {
  overtime: { icon: Calculator, hex: '#a78bfa' },
  personnel: { icon: Users, hex: '#60a5fa' },
  assets: { icon: Wrench, hex: '#60a5fa' },
  safety: { icon: Shield, hex: '#60a5fa' },
  maintenance: { icon: Building, hex: '#f59e0b' },
  financial: { icon: BarChart, hex: '#34d399' },
};
const FORMAT_ICON: Record<string, ElementType> = { pdf: File, excel: TableIcon, word: FileText, csv: FileText };
const getTypeMeta = (t: string) => TYPE_META[t] ?? { icon: FileText, hex: '#94a3b8' };

// ─── EXPORT HELPERS ───────────────────────────────────────────────────────────

interface ExportData { data: Record<string, unknown>[]; columns: string[]; totalRecords: number; }

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

const exportToPDF = (ed: ExportData, name: string) => {
  const content = [`Report: ${name}`, `Generated: ${new Date().toLocaleDateString()}`, '', `Total Records: ${ed.totalRecords}`, '', ...ed.data.slice(0, 10).map((r, i) => `${i + 1}. ${JSON.stringify(r)}`)].join('\n');
  downloadBlob(new Blob([content], { type: 'application/pdf' }), `${name.replace(/[^a-z0-9]/gi, '_')}.pdf`);
};
const exportToExcel = (ed: ExportData, name: string) => {
  const csv = [ed.columns.join(','), ...ed.data.map(r => ed.columns.map(c => `"${String(r[c] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
  downloadBlob(new Blob([csv], { type: 'text/csv' }), `${name.replace(/[^a-z0-9]/gi, '_')}.csv`);
};
const exportToWord = (ed: ExportData, name: string) => {
  const content = [name, `Generated: ${new Date().toLocaleDateString()}`, '', JSON.stringify(ed.data, null, 2)].join('\n');
  downloadBlob(new Blob([content], { type: 'application/msword' }), `${name.replace(/[^a-z0-9]/gi, '_')}.doc`);
};

// ─── SAMPLE DATA ─────────────────────────────────────────────────────────────

const generateSampleReports = (): Report[] => {
  const samples: Report[] = [
    { id: '1', title: 'Monthly Overtime Report', type: 'overtime', format: 'pdf', description: 'Comprehensive overtime analysis for current month', generatedAt: new Date().toISOString(), data: Array.from({ length: 15 }, (_, i) => ({ id: i + 1, employee: `Employee ${i + 1}`, department: ['Engineering', 'Operations', 'Maintenance'][i % 3], hours: Math.floor(Math.random() * 20) + 5 })), metadata: { totalRecords: 15, columns: ['id', 'employee', 'department', 'hours'] } },
    { id: '2', title: 'Equipment Maintenance Schedule', type: 'maintenance', format: 'excel', description: 'Upcoming maintenance tasks and schedules', generatedAt: new Date(Date.now() - 86400000).toISOString(), data: Array.from({ length: 10 }, (_, i) => ({ id: i + 1, equipment: `Equipment ${i + 1}`, status: ['Pending', 'Completed', 'Overdue'][i % 3] })), metadata: { totalRecords: 10, columns: ['id', 'equipment', 'status'] } },
  ];
  localStorage.setItem(REPORTS_STORAGE_KEY, JSON.stringify(samples));
  return samples;
};

// ─── REPORT CARD ──────────────────────────────────────────────────────────────

function ReportCard({ report, onDownload, onDelete, isLoading }: ReportCardProps) {
  const t = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const { icon: TypeIcon, hex } = getTypeMeta(report.type);
  const FormatIcon = FORMAT_ICON[report.format] ?? FileText;
  const fmtDate = new Date(report.generatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  const fmtTime = new Date(report.generatedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const records = report.metadata?.totalRecords ?? report.data?.length ?? 0;

  return (
    <GlowCard color={hex} surface={`${t.glass} rounded-2xl`} className="overflow-hidden flex flex-col group">
      <div className={`p-4 flex items-start justify-between gap-3 border-b ${t.border}`}>
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 rounded-lg shrink-0" style={{ background: `${hex}20`, border: `1px solid ${hex}35` }}>
            <TypeIcon className="h-4 w-4" style={{ color: hex }} />
          </div>
          <div className="min-w-0">
            <h3 className={`font-semibold text-sm truncate ${t.textPrimary}`}>{report.title}</h3>
            <p className={`text-[11px] mt-0.5 line-clamp-1 ${t.textFaint}`}>{report.description || 'No description provided'}</p>
          </div>
        </div>
        <div className="relative shrink-0">
          <button type="button" title="More actions" onClick={() => setMenuOpen(m => !m)}
            className={`h-7 w-7 flex items-center justify-center rounded-lg ${t.hoverBg} ${t.textFaint} ${t.hoverText}`}>
            <MoreHorizontal className="h-3.5 w-3.5" />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className={`absolute right-0 top-8 z-20 rounded-xl ${t.glass} ${t.shadow} min-w-[140px] py-1 overflow-hidden`}>
                <button type="button" onClick={() => { onDownload(report); setMenuOpen(false); }} disabled={isLoading}
                  className={`flex items-center gap-2 w-full px-3 py-2 text-xs ${t.textMuted} ${t.hoverBg} transition-colors`}>
                  <Download className="h-3 w-3" /> Download
                </button>
                <button type="button" onClick={() => { onDelete(report.id); setMenuOpen(false); }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-xs text-rose-500 hover:bg-rose-500/10 transition-colors">
                  <Trash2 className="h-3 w-3" /> Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className={`px-4 py-3 flex items-center justify-between gap-2 text-xs flex-wrap ${t.textFaint}`}>
        <div className="flex items-center gap-1"><Calendar className="h-3 w-3" />{fmtDate} · {fmtTime}</div>
        <div className="flex items-center gap-2">
          <StatusBadge color={hex} label={report.type} />
          <span className="flex items-center gap-1"><FormatIcon className="h-3 w-3" /> {(report.format ?? 'json').toUpperCase()}</span>
          <span>{records} rows</span>
        </div>
      </div>

      <div className="px-4 pb-4 flex gap-2">
        <Link href={`/reports/view/${report.id}`} className={`flex-1 py-1.5 rounded-lg text-xs font-medium text-center ${t.chipBg} ${t.hoverBg} ${t.textMuted} inline-flex items-center justify-center gap-1.5`}>
          <Eye className="h-3.5 w-3.5" /> View
        </Link>
        <PrimaryButton icon={DownloadCloud} accent="violet" submitting={isLoading} onClick={() => onDownload(report)} className="flex-1">Export</PrimaryButton>
      </div>
    </GlowCard>
  );
}

function ReportListItem({ report, onDownload, onDelete, isLoading }: ReportCardProps) {
  const t = useTheme();
  const { icon: TypeIcon, hex } = getTypeMeta(report.type);
  const FormatIcon = FORMAT_ICON[report.format] ?? FileText;
  const fmtDate = new Date(report.generatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  const records = report.metadata?.totalRecords ?? report.data?.length ?? 0;

  return (
    <GlowCard color={hex} surface={`${t.glass} rounded-2xl ${t.shadow}`} className="px-5 py-4 flex items-center gap-4">
      <div className="p-2 rounded-lg shrink-0" style={{ background: `${hex}20`, border: `1px solid ${hex}35` }}>
        <TypeIcon className="h-4 w-4" style={{ color: hex }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className={`font-semibold text-sm truncate ${t.textPrimary}`}>{report.title}</span>
          <StatusBadge color={hex} label={report.type} />
        </div>
        <div className={`flex items-center gap-3 text-[11px] ${t.textFaint}`}>
          <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{fmtDate}</span>
          <span className="flex items-center gap-1"><FormatIcon className="h-3 w-3" />{(report.format ?? 'json').toUpperCase()}</span>
          <span>{records} rows</span>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Link href={`/reports/view/${report.id}`} className={`h-8 px-3 rounded-lg text-xs font-medium ${t.chipBg} ${t.hoverBg} ${t.textMuted} inline-flex items-center gap-1.5`}>
          <Eye className="h-3.5 w-3.5" /> View
        </Link>
        <PrimaryButton icon={DownloadCloud} accent="violet" submitting={isLoading} onClick={() => onDownload(report)}>Export</PrimaryButton>
        <button type="button" title="Delete" onClick={() => onDelete(report.id)}
          className={`h-8 w-8 flex items-center justify-center rounded-lg ${t.hoverBg} text-rose-500`}>
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </GlowCard>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

function ReportsPageContent() {
  const t = useTheme();
  const sections = useCollapseSection({ hero: true, searchFilters: true });
  const [reports, setReports] = useState<Report[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sortBy, setSortBy] = useState('newest');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedFormats, setSelectedFormats] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState('all');
  const [activeTab, setActiveTab] = useState('all');

  const sortFn = (list: Report[], by: string) => {
    const s = [...list];
    if (by === 'newest') return s.sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime());
    if (by === 'oldest') return s.sort((a, b) => new Date(a.generatedAt).getTime() - new Date(b.generatedAt).getTime());
    if (by === 'name') return s.sort((a, b) => a.title.localeCompare(b.title));
    return s;
  };

  const loadReports = () => {
    try {
      const stored = localStorage.getItem(REPORTS_STORAGE_KEY);
      setReports(sortFn(stored ? JSON.parse(stored) : generateSampleReports(), sortBy));
    } catch { setReports(sortFn(generateSampleReports(), sortBy)); }
  };

  useEffect(() => { loadReports(); }, []);

  const saveReports = (next: Report[]) => {
    localStorage.setItem(REPORTS_STORAGE_KEY, JSON.stringify(next));
    setReports(sortFn(next, sortBy));
  };

  const deleteReport = (id: string) => {
    if (!confirm('Delete this report? This cannot be undone.')) return;
    saveReports(reports.filter(r => r.id !== id));
  };

  const downloadReport = async (report: Report) => {
    setIsLoading(true);
    try {
      const ed: ExportData = {
        data: report.data ?? [],
        columns: report.columns ?? report.metadata?.columns ?? [],
        totalRecords: report.data?.length ?? report.metadata?.totalRecords ?? 0,
      };
      if (report.format === 'pdf') exportToPDF(ed, report.title);
      else if (report.format === 'excel') exportToExcel(ed, report.title);
      else if (report.format === 'word') exportToWord(ed, report.title);
      else downloadBlob(new Blob([JSON.stringify(report.data, null, 2)], { type: 'application/json' }), `${report.title.replace(/\s+/g, '_')}.json`);
    } finally { setIsLoading(false); }
  };

  const isInRange = (dateStr: string) => {
    const d = new Date(dateStr), now = new Date();
    if (dateRange === 'today') return d.toDateString() === now.toDateString();
    if (dateRange === 'week') { const w = new Date(now); w.setDate(w.getDate() - 7); return d >= w; }
    if (dateRange === 'month') { const m = new Date(now); m.setMonth(m.getMonth() - 1); return d >= m; }
    return true;
  };

  const filtered = reports.filter(r => {
    const s = searchTerm.toLowerCase();
    return (
      (!s || r.title.toLowerCase().includes(s) || r.type.toLowerCase().includes(s) || r.description?.toLowerCase().includes(s)) &&
      (selectedTypes.length === 0 || selectedTypes.includes(r.type)) &&
      (selectedFormats.length === 0 || selectedFormats.includes(r.format ?? 'json')) &&
      isInRange(r.generatedAt)
    );
  });

  const clearFilters = () => { setSelectedTypes([]); setSelectedFormats([]); setDateRange('all'); setSearchTerm(''); };

  const TYPE_TABS = ['all', 'overtime', 'personnel', 'assets', 'safety', 'maintenance', 'financial'];
  const CHECKBOX_TYPES = ['overtime', 'personnel', 'assets', 'safety', 'maintenance', 'financial'];
  const CHECKBOX_FORMATS = ['pdf', 'excel', 'word', 'csv', 'json'];
  const activeFilterCount = selectedTypes.length + selectedFormats.length + (dateRange !== 'all' ? 1 : 0);
  const tabList = activeTab === 'all' ? filtered : filtered.filter(r => r.type === activeTab);
  const selectCls = `h-9 px-3 rounded-lg text-xs outline-none transition-colors ${t.inputBg}`;

  return (
    <main className="max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <PageHero
        icon={FilePieChart}
        accent="violet"
        crumbs={['Analytics & Insights', 'Reports']}
        title="Reports & Analytics"
        description="Manage, analyse, and export your operational reports."
        statsOpen={sections.expanded.hero}
        actions={
          <>
            <button type="button" onClick={loadReports} title="Refresh"
              className={`h-8 w-8 flex items-center justify-center rounded-lg ${t.hoverBg} ${t.textFaint} ${t.hoverText}`}>
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <ViewToggle value={viewMode} onChange={setViewMode} options={[{ value: 'grid', icon: LayoutGrid, label: 'Grid view' }, { value: 'list', icon: List, label: 'List view' }]} />
            <SelectField size="filter" value={sortBy} title="Sort by" onChange={v => { setSortBy(v); setReports(sortFn(reports, v)); }}
              options={[{ value: 'newest', label: 'Newest First' }, { value: 'oldest', label: 'Oldest First' }, { value: 'name', label: 'Name A–Z' }]} />
            <Link href="/reports/generate">
              <PrimaryButton icon={Plus} accent="violet">New Report</PrimaryButton>
            </Link>
          </>
        }
      >
        <div className="grid grid-cols-3 gap-3">
          <StatTile icon={Hash} color="#60a5fa" label="Total Reports" value={reports.length} />
          <StatTile icon={Sparkles} color="#34d399" label="This Week" value={reports.filter(r => isInRange(r.generatedAt)).length} />
          <StatTile icon={Calendar} color="#86BBD8" label="Last Generated" value={reports[0] ? new Date(reports[0].generatedAt).toLocaleDateString() : '—'} />
        </div>
      </PageHero>

      {sections.expanded.searchFilters && (
        <div className={`${t.glass} rounded-2xl ${t.shadow} overflow-hidden`}>
          <div className={`px-5 py-3 border-b ${t.border} flex items-center gap-2`}>
            <Search className="h-3.5 w-3.5 text-blue-400" />
            <span className={`font-semibold text-sm ${t.textPrimary}`}>Search & Filters</span>
          </div>
          <div className="p-5 space-y-3">
            <div className="flex gap-3">
              <SearchInput value={searchTerm} onChange={setSearchTerm} placeholder="Search reports by name, type, or description…" className="flex-1" />
              <button type="button" onClick={() => setShowFilters(f => !f)}
                className={`h-8 px-3 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 transition-all ${showFilters ? 'bg-blue-500/15 text-blue-500' : `${t.chipBg} ${t.hoverBg} ${t.textMuted}`}`}>
                <SlidersHorizontal className="h-3.5 w-3.5" /> Filters
                {activeFilterCount > 0 && <span className="ml-1 px-1 rounded bg-blue-500/25 text-[10px]">{activeFilterCount}</span>}
              </button>
            </div>

            {showFilters && (
              <div className={`rounded-xl border ${t.border} ${t.chipBg} p-4`}>
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-xs font-semibold uppercase tracking-wider ${t.textFaint}`}>Filter Options</span>
                  <button type="button" onClick={clearFilters} className={`text-xs ${t.textFaint} ${t.hoverText} inline-flex items-center gap-1`}><X className="h-3 w-3" /> Clear All</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className={`text-[11px] uppercase tracking-wider mb-2 ${t.textFaint}`}>Report Type</p>
                    <div className="space-y-1.5">
                      {CHECKBOX_TYPES.map(ty => (
                        <label key={ty} className={`flex items-center gap-2 cursor-pointer text-xs ${t.textMuted} ${t.hoverText}`}>
                          <input type="checkbox" checked={selectedTypes.includes(ty)} onChange={e => setSelectedTypes(p => e.target.checked ? [...p, ty] : p.filter(x => x !== ty))} className="accent-blue-600" />
                          {ty.charAt(0).toUpperCase() + ty.slice(1)}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className={`text-[11px] uppercase tracking-wider mb-2 ${t.textFaint}`}>Format</p>
                    <div className="space-y-1.5">
                      {CHECKBOX_FORMATS.map(f => (
                        <label key={f} className={`flex items-center gap-2 cursor-pointer text-xs ${t.textMuted} ${t.hoverText}`}>
                          <input type="checkbox" checked={selectedFormats.includes(f)} onChange={e => setSelectedFormats(p => e.target.checked ? [...p, f] : p.filter(x => x !== f))} className="accent-blue-600" />
                          {f.toUpperCase()}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className={`text-[11px] uppercase tracking-wider mb-2 ${t.textFaint}`}>Date Range</p>
                    <SelectField size="filter" value={dateRange} title="Date range" onChange={setDateRange}
                      options={[
                        { value: 'all', label: 'All Time' },
                        { value: 'today', label: 'Today' },
                        { value: 'week', label: 'Past Week' },
                        { value: 'month', label: 'Past Month' },
                      ]} />
                  </div>
                </div>
              </div>
            )}
            <p className={`text-xs ${t.textFaint}`}>Showing {filtered.length} of {reports.length} reports</p>
          </div>
        </div>
      )}

      <div className={`${t.glassSoft} rounded-xl p-1 flex gap-1 flex-wrap`}>
        {TYPE_TABS.map(type => {
          const count = type === 'all' ? filtered.length : filtered.filter(r => r.type === type).length;
          const Icon = type === 'all' ? FilePieChart : getTypeMeta(type).icon;
          return (
            <button key={type} type="button" onClick={() => setActiveTab(type)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${activeTab === type ? 'bg-blue-500/15 text-blue-500' : `${t.textFaint} ${t.hoverBg} ${t.hoverText}`}`}>
              <Icon className="h-3.5 w-3.5" /> {type === 'all' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1)}
              <span className={`text-[10px] px-1 rounded-full ${t.chipBg}`}>{count}</span>
            </button>
          );
        })}
      </div>

      {tabList.length === 0 ? (
        <div className={`${t.glass} rounded-2xl overflow-hidden`}>
          <EmptyState icon={FilePieChart} title="No reports found"
            message={reports.length === 0 ? 'Get started by creating your first report.' : 'No reports match your current filters.'}
            action={{ label: 'Create Report', onClick: () => {} }} />
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {tabList.map(r => <ReportCard key={r.id} report={r} onDownload={downloadReport} onDelete={deleteReport} isLoading={isLoading} />)}
        </div>
      ) : (
        <div className="space-y-2">
          {tabList.map(r => <ReportListItem key={r.id} report={r} onDownload={downloadReport} onDelete={deleteReport} isLoading={isLoading} />)}
        </div>
      )}
    </main>
  );
}

export default function ReportsPage() {
  return <AppShell><ReportsPageContent /></AppShell>;
}
