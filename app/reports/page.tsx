// app/reports/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import type { ElementType } from 'react';
import Link from 'next/link';
import {
  FilePieChart, Download, Calendar, TrendingUp, Wrench,
  Calculator, Shield, Building, Eye, MoreHorizontal,
  Search, Plus, FileText, Trash2, RefreshCw, File,
  Table as TableIcon, ChevronRight, Sparkles, DownloadCloud,
  BarChart, Grid, List, X, SlidersHorizontal, Users,
} from 'lucide-react';
import { PageShell } from '@/components/PageShell';
import {
  HeroPanel, GlassPanel, GlassStatCard, GlassBadge, GlassButton,
  GlassInput, GlassSelect, GlassTabs, EmptyState, StatItem, GlassTab,
  usePageCollapse, MasterCollapseButton,
} from '@/components/shared';

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

const TYPE_META: Record<string, { icon: ElementType; badge: 'purple' | 'info' | 'warning' | 'success' | 'neutral' }> = {
  overtime:    { icon: Calculator, badge: 'purple'  },
  personnel:   { icon: Users,      badge: 'info'    },
  assets:      { icon: Wrench,     badge: 'info'    },
  safety:      { icon: Shield,     badge: 'info'    },
  maintenance: { icon: Building,   badge: 'warning' },
  financial:   { icon: BarChart,   badge: 'success' },
};
const FORMAT_ICON: Record<string, ElementType> = {
  pdf: File, excel: TableIcon, word: FileText, csv: FileText,
};
const getTypeMeta = (t: string) => TYPE_META[t] ?? { icon: FileText, badge: 'neutral' as const };

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
  const [menuOpen, setMenuOpen] = useState(false);
  const { icon: TypeIcon, badge } = getTypeMeta(report.type);
  const FormatIcon = FORMAT_ICON[report.format] ?? FileText;
  const fmtDate = new Date(report.generatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  const fmtTime = new Date(report.generatedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const records = report.metadata?.totalRecords ?? report.data?.length ?? 0;

  return (
    <div className="oz-glass-panel rounded-2xl overflow-hidden flex flex-col group hover:border-[#86BBD8]/25 transition-all border border-white/[0.07]">
      {/* Header */}
      <div className="p-4 flex items-start justify-between gap-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 rounded-lg bg-[#2A4D69]/40 border border-[#86BBD8]/15 shrink-0">
            <TypeIcon className="h-4 w-4 text-[#86BBD8]" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-white text-sm truncate group-hover:text-[#86BBD8] transition-colors">
              {report.title}
            </h3>
            <p className="text-[11px] text-white/40 mt-0.5 line-clamp-1">
              {report.description || 'No description provided'}
            </p>
          </div>
        </div>
        <div className="relative shrink-0">
          <GlassButton size="xs" variant="ghost" onClick={() => setMenuOpen(m => !m)}>
            <MoreHorizontal className="h-3.5 w-3.5" />
          </GlassButton>
          {menuOpen && (
            <div className="absolute right-0 top-8 z-20 oz-glass-dark rounded-xl border border-white/[0.12] shadow-2xl min-w-[140px] py-1 overflow-hidden">
              <button type="button" onClick={() => { onDownload(report); setMenuOpen(false); }} disabled={isLoading}
                className="flex items-center gap-2 w-full px-3 py-2 text-xs text-white/70 hover:bg-white/[0.08] hover:text-white transition-colors">
                <Download className="h-3 w-3" /> Download
              </button>
              <button type="button" onClick={() => { onDelete(report.id); setMenuOpen(false); }}
                className="flex items-center gap-2 w-full px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 transition-colors">
                <Trash2 className="h-3 w-3" /> Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Metadata */}
      <div className="px-4 py-3 flex items-center justify-between gap-2 text-xs text-white/45">
        <div className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {fmtDate} · {fmtTime}
        </div>
        <div className="flex items-center gap-2">
          <GlassBadge variant={badge} size="sm">{report.type}</GlassBadge>
          <span className="flex items-center gap-1"><FormatIcon className="h-3 w-3" /> {(report.format ?? 'json').toUpperCase()}</span>
          <span>{records} rows</span>
        </div>
      </div>

      {/* Actions */}
      <div className="px-4 pb-4 flex gap-2">
        <Link href={`/reports/view/${report.id}`} className="flex-1">
          <GlassButton size="sm" variant="secondary" icon={Eye} className="w-full">View</GlassButton>
        </Link>
        <GlassButton size="sm" variant="primary" icon={DownloadCloud} loading={isLoading} onClick={() => onDownload(report)} className="flex-1">
          Export
        </GlassButton>
      </div>
    </div>
  );
}

function ReportListItem({ report, onDownload, onDelete, isLoading }: ReportCardProps) {
  const { icon: TypeIcon, badge } = getTypeMeta(report.type);
  const FormatIcon = FORMAT_ICON[report.format] ?? FileText;
  const fmtDate = new Date(report.generatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  const records = report.metadata?.totalRecords ?? report.data?.length ?? 0;

  return (
    <div className="oz-glass-panel rounded-2xl border border-white/[0.07] px-5 py-4 flex items-center gap-4">
      <div className="p-2 rounded-lg bg-[#2A4D69]/40 border border-[#86BBD8]/15 shrink-0">
        <TypeIcon className="h-4 w-4 text-[#86BBD8]" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="font-semibold text-white text-sm truncate">{report.title}</span>
          <GlassBadge variant={badge} size="sm">{report.type}</GlassBadge>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-white/40">
          <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{fmtDate}</span>
          <span className="flex items-center gap-1"><FormatIcon className="h-3 w-3" />{(report.format ?? 'json').toUpperCase()}</span>
          <span>{records} rows</span>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Link href={`/reports/view/${report.id}`}>
          <GlassButton size="sm" variant="secondary" icon={Eye}>View</GlassButton>
        </Link>
        <GlassButton size="sm" variant="primary" icon={DownloadCloud} loading={isLoading} onClick={() => onDownload(report)}>Export</GlassButton>
        <GlassButton size="sm" variant="ghost" icon={Trash2} onClick={() => onDelete(report.id)} className="text-red-400 hover:text-red-300" />
      </div>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const sections = usePageCollapse({ hero: true, searchFilters: true });
  const [reports, setReports]           = useState<Report[]>([]);
  const [searchTerm, setSearchTerm]     = useState('');
  const [isLoading, setIsLoading]       = useState(false);
  const [sortBy, setSortBy]             = useState('newest');
  const [viewMode, setViewMode]         = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters]   = useState(false);
  const [selectedTypes, setSelectedTypes]   = useState<string[]>([]);
  const [selectedFormats, setSelectedFormats] = useState<string[]>([]);
  const [dateRange, setDateRange]       = useState('all');

  useEffect(() => { loadReports(); }, []);

  const sortFn = (list: Report[], by: string) => {
    const s = [...list];
    if (by === 'newest') return s.sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime());
    if (by === 'oldest') return s.sort((a, b) => new Date(a.generatedAt).getTime() - new Date(b.generatedAt).getTime());
    if (by === 'name')   return s.sort((a, b) => a.title.localeCompare(b.title));
    return s;
  };

  const loadReports = () => {
    try {
      const stored = localStorage.getItem(REPORTS_STORAGE_KEY);
      setReports(sortFn(stored ? JSON.parse(stored) : generateSampleReports(), sortBy));
    } catch { setReports(sortFn(generateSampleReports(), sortBy)); }
  };

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
      if (report.format === 'pdf')   exportToPDF(ed, report.title);
      else if (report.format === 'excel') exportToExcel(ed, report.title);
      else if (report.format === 'word')  exportToWord(ed, report.title);
      else {
        downloadBlob(new Blob([JSON.stringify(report.data, null, 2)], { type: 'application/json' }), `${report.title.replace(/\s+/g, '_')}.json`);
      }
    } finally { setIsLoading(false); }
  };

  const isInRange = (dateStr: string) => {
    const d = new Date(dateStr), now = new Date();
    if (dateRange === 'today') return d.toDateString() === now.toDateString();
    if (dateRange === 'week')  { const w = new Date(now); w.setDate(w.getDate() - 7); return d >= w; }
    if (dateRange === 'month') { const m = new Date(now); m.setMonth(m.getMonth() - 1); return d >= m; }
    return true;
  };

  const filtered = reports.filter(r => {
    const s = searchTerm.toLowerCase();
    return (
      (!s || r.title.toLowerCase().includes(s) || r.type.toLowerCase().includes(s) || r.description?.toLowerCase().includes(s)) &&
      (selectedTypes.length === 0   || selectedTypes.includes(r.type)) &&
      (selectedFormats.length === 0 || selectedFormats.includes(r.format ?? 'json')) &&
      isInRange(r.generatedAt)
    );
  });

  const clearFilters = () => { setSelectedTypes([]); setSelectedFormats([]); setDateRange('all'); setSearchTerm(''); };

  const heroStats: StatItem[] = [
    { label: 'Total Reports', value: reports.length },
    { label: 'This Week',    value: reports.filter(r => isInRange(r.generatedAt)).length, textClass: 'text-emerald-400' },
    { label: 'Last Generated', value: reports[0] ? new Date(reports[0].generatedAt).toLocaleDateString() : '—', textClass: 'text-[#86BBD8]' },
  ];

  const TYPE_TABS = ['all', 'overtime', 'personnel', 'assets', 'safety', 'maintenance', 'financial'];

  const renderReports = (list: Report[]) =>
    list.length === 0 ? (
      <EmptyState icon={FilePieChart} title="No reports found"
        message={reports.length === 0 ? 'Get started by creating your first report.' : 'No reports match your current filters.'}
        action={{ label: 'Create Report', onClick: () => {} }} />
    ) : viewMode === 'grid' ? (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {list.map(r => <ReportCard key={r.id} report={r} onDownload={downloadReport} onDelete={deleteReport} isLoading={isLoading} />)}
      </div>
    ) : (
      <div className="space-y-2">
        {list.map(r => <ReportListItem key={r.id} report={r} onDownload={downloadReport} onDelete={deleteReport} isLoading={isLoading} />)}
      </div>
    );

  const tabs: GlassTab[] = TYPE_TABS.map(type => ({
    key: type,
    label: type === 'all' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1),
    icon: type === 'all' ? FilePieChart : getTypeMeta(type).icon,
    count: type === 'all' ? filtered.length : filtered.filter(r => r.type === type).length,
    content: renderReports(type === 'all' ? filtered : filtered.filter(r => r.type === type)),
  }));

  const CHECKBOX_TYPES    = ['overtime', 'personnel', 'assets', 'safety', 'maintenance', 'financial'];
  const CHECKBOX_FORMATS  = ['pdf', 'excel', 'word', 'csv', 'json'];

  return (
    <PageShell>
      <main className="container mx-auto px-4 sm:px-6 py-8 space-y-4">

        <HeroPanel
          icon={FilePieChart}
          title="Reports & Analytics"
          subtitle="Manage, analyse, and export your operational reports."
          onRefresh={loadReports}
          loading={isLoading}
          onNew={() => { }}
          newLabel="New Report"
          stats={heroStats}
          {...sections.panel('hero')}
          actions={
            <>
              <MasterCollapseButton collapse={sections} />
              <GlassButton variant={viewMode === 'grid' ? 'primary' : 'secondary'} size="sm" icon={Grid} onClick={() => setViewMode('grid')} />
              <GlassButton variant={viewMode === 'list' ? 'primary' : 'secondary'} size="sm" icon={List} onClick={() => setViewMode('list')} />
              <GlassSelect
                value={sortBy}
                onChange={e => { setSortBy(e.target.value); setReports(sortFn(reports, e.target.value)); }}
                options={[
                  { value: 'newest', label: 'Newest First' },
                  { value: 'oldest', label: 'Oldest First' },
                  { value: 'name',   label: 'Name A–Z'    },
                ]}
                className="w-36"
              />
              <Link href="/reports/generate">
                <GlassButton variant="primary" icon={Plus} size="sm">New Report</GlassButton>
              </Link>
            </>
          }
        />

        {/* Search + filters panel */}
        <GlassPanel icon={Search} title="Search & Filters" variant="panel" defaultOpen {...sections.panel('searchFilters')}>
          <div className="px-5 pb-4 pt-2 space-y-3">
            <div className="flex gap-3">
              <GlassInput
                icon={Search}
                className="flex-1"
                placeholder="Search reports by name, type, or description…"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
              <GlassButton
                variant={showFilters ? 'primary' : 'secondary'}
                icon={SlidersHorizontal}
                onClick={() => setShowFilters(f => !f)}
              >
                Filters
                {(selectedTypes.length + selectedFormats.length + (dateRange !== 'all' ? 1 : 0)) > 0 && (
                  <span className="ml-1 px-1 rounded bg-[#86BBD8]/25 text-[10px]">
                    {selectedTypes.length + selectedFormats.length + (dateRange !== 'all' ? 1 : 0)}
                  </span>
                )}
              </GlassButton>
            </div>

            {showFilters && (
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-white/50 uppercase tracking-wider">Filter Options</span>
                  <GlassButton size="xs" variant="ghost" icon={X} onClick={clearFilters}>Clear All</GlassButton>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-[11px] text-white/40 uppercase tracking-wider mb-2">Report Type</p>
                    <div className="space-y-1.5">
                      {CHECKBOX_TYPES.map(t => (
                        <label key={t} className="flex items-center gap-2 cursor-pointer text-xs text-white/60 hover:text-white/90">
                          <input type="checkbox" checked={selectedTypes.includes(t)} onChange={e => setSelectedTypes(p => e.target.checked ? [...p, t] : p.filter(x => x !== t))}
                            className="rounded border-white/20 bg-white/[0.07] accent-[#86BBD8]" />
                          {t.charAt(0).toUpperCase() + t.slice(1)}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] text-white/40 uppercase tracking-wider mb-2">Format</p>
                    <div className="space-y-1.5">
                      {CHECKBOX_FORMATS.map(f => (
                        <label key={f} className="flex items-center gap-2 cursor-pointer text-xs text-white/60 hover:text-white/90">
                          <input type="checkbox" checked={selectedFormats.includes(f)} onChange={e => setSelectedFormats(p => e.target.checked ? [...p, f] : p.filter(x => x !== f))}
                            className="rounded border-white/20 bg-white/[0.07] accent-[#86BBD8]" />
                          {f.toUpperCase()}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] text-white/40 uppercase tracking-wider mb-2">Date Range</p>
                    <GlassSelect
                      value={dateRange}
                      onChange={e => setDateRange(e.target.value)}
                      options={[
                        { value: 'all',   label: 'All Time'   },
                        { value: 'today', label: 'Today'      },
                        { value: 'week',  label: 'Past Week'  },
                        { value: 'month', label: 'Past Month' },
                      ]}
                    />
                  </div>
                </div>
              </div>
            )}

            <p className="text-xs text-white/30">
              Showing {filtered.length} of {reports.length} reports
            </p>
          </div>
        </GlassPanel>

        {/* Reports tabs */}
        <GlassTabs tabs={tabs} defaultTab="all" />

      </main>
    </PageShell>
  );
}
