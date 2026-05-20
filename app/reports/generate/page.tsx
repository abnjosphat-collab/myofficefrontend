// app/reports/generate/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, FilePieChart, Download, Filter, Users, Calculator,
  Shield, Settings, Eye, Plus, X, BarChart3, FileText,
  Clock, AlertCircle, ToolCase,
} from 'lucide-react';
import { PageShell } from '@/components/PageShell';
import {
  HeroPanel, GlassPanel, GlassBadge, GlassButton,
  GlassInput, GlassSelect, GlassTextarea,
  usePageCollapse, MasterCollapseButton,
} from '@/components/shared';

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface Filter { field: string; operator: string; value: string; }
interface PreviewColumn { id: string; label: string; type: string; }
interface PreviewData { totalRecords: number; columns: PreviewColumn[]; sampleData: Record<string, unknown>[]; }

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const REPORTS_STORAGE_KEY = 'generated-reports';

const TEMPLATES = {
  overtime:    { name: 'Overtime Summary',      description: 'Comprehensive overtime analysis including hours, costs, and approval status', icon: Calculator, defaultColumns: ['employee', 'department', 'date', 'hours', 'status', 'approvedBy'] },
  personnel:   { name: 'Personnel Report',       description: 'Employee information, department structure, and role analysis', icon: Users,      defaultColumns: ['name', 'employeeId', 'department', 'position', 'hireDate', 'status'] },
  assets:      { name: 'Asset Utilization',      description: 'Equipment performance, maintenance history, and utilization metrics', icon: ToolCase,   defaultColumns: ['assetId', 'name', 'category', 'status', 'utilization', 'lastMaintenance'] },
  safety:      { name: 'Safety Compliance',      description: 'Incident reports, safety audits, and compliance tracking', icon: Shield,     defaultColumns: ['incidentId', 'type', 'severity', 'date', 'location', 'status'] },
  maintenance: { name: 'Maintenance Schedule',   description: 'Preventive maintenance, work orders, and equipment servicing', icon: Settings,   defaultColumns: ['workOrder', 'asset', 'type', 'scheduledDate', 'status', 'assignedTo'] },
  financial:   { name: 'Financial Overview',     description: 'Cost analysis, budget tracking, and financial performance', icon: FileText,   defaultColumns: ['category', 'period', 'budget', 'actual', 'variance', 'status'] },
};

const COLUMNS: Record<string, PreviewColumn[]> = {
  overtime:    [{ id: 'employee', label: 'Employee Name', type: 'text' }, { id: 'employeeId', label: 'Employee ID', type: 'text' }, { id: 'department', label: 'Department', type: 'text' }, { id: 'date', label: 'Date', type: 'date' }, { id: 'hours', label: 'Hours', type: 'number' }, { id: 'rate', label: 'Hourly Rate', type: 'currency' }, { id: 'totalCost', label: 'Total Cost', type: 'currency' }, { id: 'reason', label: 'Reason', type: 'text' }, { id: 'status', label: 'Status', type: 'status' }, { id: 'approvedBy', label: 'Approved By', type: 'text' }],
  personnel:   [{ id: 'name', label: 'Full Name', type: 'text' }, { id: 'employeeId', label: 'Employee ID', type: 'text' }, { id: 'department', label: 'Department', type: 'text' }, { id: 'position', label: 'Position', type: 'text' }, { id: 'hireDate', label: 'Hire Date', type: 'date' }, { id: 'email', label: 'Email', type: 'text' }, { id: 'phone', label: 'Phone', type: 'text' }, { id: 'status', label: 'Employment Status', type: 'status' }, { id: 'salary', label: 'Salary', type: 'currency' }, { id: 'location', label: 'Location', type: 'text' }],
  assets:      [{ id: 'assetId', label: 'Asset ID', type: 'text' }, { id: 'name', label: 'Asset Name', type: 'text' }, { id: 'category', label: 'Category', type: 'text' }, { id: 'status', label: 'Status', type: 'status' }, { id: 'location', label: 'Location', type: 'text' }, { id: 'utilization', label: 'Utilization %', type: 'number' }, { id: 'lastMaintenance', label: 'Last Maintenance', type: 'date' }, { id: 'nextMaintenance', label: 'Next Maintenance', type: 'date' }, { id: 'purchaseCost', label: 'Purchase Cost', type: 'currency' }],
  safety:      [{ id: 'incidentId', label: 'Incident ID', type: 'text' }, { id: 'type', label: 'Incident Type', type: 'text' }, { id: 'severity', label: 'Severity', type: 'text' }, { id: 'date', label: 'Date', type: 'date' }, { id: 'location', label: 'Location', type: 'text' }, { id: 'status', label: 'Status', type: 'status' }, { id: 'reportedBy', label: 'Reported By', type: 'text' }],
  maintenance: [{ id: 'workOrder', label: 'Work Order', type: 'text' }, { id: 'asset', label: 'Asset', type: 'text' }, { id: 'type', label: 'Maintenance Type', type: 'text' }, { id: 'scheduledDate', label: 'Scheduled Date', type: 'date' }, { id: 'completedDate', label: 'Completed Date', type: 'date' }, { id: 'status', label: 'Status', type: 'status' }, { id: 'assignedTo', label: 'Assigned To', type: 'text' }, { id: 'cost', label: 'Cost', type: 'currency' }],
  financial:   [{ id: 'category', label: 'Category', type: 'text' }, { id: 'period', label: 'Period', type: 'text' }, { id: 'budget', label: 'Budget', type: 'currency' }, { id: 'actual', label: 'Actual', type: 'currency' }, { id: 'variance', label: 'Variance', type: 'currency' }, { id: 'variancePercent', label: 'Variance %', type: 'number' }, { id: 'status', label: 'Status', type: 'status' }],
};

const FORMAT_OPTIONS = [
  { value: 'pdf',   label: 'PDF Document'    },
  { value: 'excel', label: 'Excel Spreadsheet' },
  { value: 'csv',   label: 'CSV File'        },
  { value: 'html',  label: 'Web Page'        },
];

const OPERATOR_OPTIONS = [
  { value: 'equals',   label: 'Equals'       },
  { value: 'contains', label: 'Contains'     },
  { value: 'greater',  label: 'Greater than' },
  { value: 'less',     label: 'Less than'    },
];

// ─── GLASS TOGGLE ─────────────────────────────────────────────────────────────

function GlassToggle({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string }) {
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <p className="text-sm font-medium text-white/80">{label}</p>
        {description && <p className="text-xs text-white/40 mt-0.5">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        title={label}
        aria-label={label}
        aria-checked={checked ? 'true' : 'false'}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-10 rounded-full border transition-all ${checked ? 'bg-[#2A4D69] border-[#86BBD8]/40' : 'bg-white/[0.08] border-white/[0.15]'}`}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full transition-all ${checked ? 'left-4 bg-[#86BBD8]' : 'left-0.5 bg-white/30'}`} />
      </button>
    </div>
  );
}

// ─── GENERATE DATA ────────────────────────────────────────────────────────────

function generateData(reportType: string, selectedColumns: string[]): Record<string, unknown>[] {
  const cols = COLUMNS[reportType] ?? [];
  return Array.from({ length: Math.floor(Math.random() * 50) + 10 }, () => {
    const rec: Record<string, unknown> = {};
    selectedColumns.forEach(colId => {
      const col = cols.find(c => c.id === colId);
      if (!col) return;
      if (col.type === 'number')   rec[colId] = Math.floor(Math.random() * 100);
      else if (col.type === 'currency') rec[colId] = `$${(Math.random() * 1000).toFixed(2)}`;
      else if (col.type === 'date')     { const d = new Date(); d.setDate(d.getDate() - Math.floor(Math.random() * 30)); rec[colId] = d.toISOString().split('T')[0]; }
      else if (col.type === 'status')   rec[colId] = ['Active', 'Pending', 'Completed', 'Approved', 'Rejected'][Math.floor(Math.random() * 5)];
      else rec[colId] = `Sample ${col.label}`;
    });
    return rec;
  });
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function GenerateReportPage() {
  const sections = usePageCollapse({ hero: true, template: true, reportDetails: true, dataColumns: true, advancedOptions: true, reportSummary: true, dataPreview: true, quickActions: true });
  const router = useRouter();
  const [reportType, setReportType]       = useState('overtime');
  const [reportName, setReportName]       = useState('');
  const [description, setDescription]    = useState('');
  const [dateRange, setDateRange]         = useState({ start: '', end: '' });
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [filters, setFilters]             = useState<Filter[]>([]);
  const [format, setFormat]               = useState('pdf');
  const [includeCharts, setIncludeCharts] = useState(true);
  const [includeSummary, setIncludeSummary] = useState(true);
  const [isGenerating, setIsGenerating]   = useState(false);
  const [previewData, setPreviewData]     = useState<PreviewData | null>(null);

  useEffect(() => {
    const tmpl = TEMPLATES[reportType as keyof typeof TEMPLATES];
    if (tmpl) {
      setReportName(`${tmpl.name} - ${new Date().toLocaleDateString()}`);
      setDescription(tmpl.description);
      setSelectedColumns(tmpl.defaultColumns);
    }
  }, [reportType]);

  const toggleColumn = (id: string) =>
    setSelectedColumns(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const addFilter = () => setFilters(p => [...p, { field: '', operator: 'equals', value: '' }]);
  const updateFilter = (i: number, key: string, val: string) =>
    setFilters(p => p.map((f, idx) => idx === i ? { ...f, [key]: val } : f));
  const removeFilter = (i: number) => setFilters(p => p.filter((_, idx) => idx !== i));

  const generatePreview = () => {
    setIsGenerating(true);
    setTimeout(() => {
      const data = generateData(reportType, selectedColumns);
      setPreviewData({
        totalRecords: data.length,
        columns: selectedColumns.map(id => COLUMNS[reportType]?.find(c => c.id === id) ?? { id, label: id, type: 'text' }),
        sampleData: data.slice(0, 5),
      });
      setIsGenerating(false);
    }, 800);
  };

  const generateReport = () => {
    if (!reportName.trim()) { alert('Please enter a report name'); return; }
    if (selectedColumns.length === 0) { alert('Please select at least one column'); return; }
    setIsGenerating(true);
    setTimeout(() => {
      const data = generateData(reportType, selectedColumns);
      const newReport = {
        id: Date.now().toString(), title: reportName, description, type: reportType,
        status: 'generated', generatedAt: new Date().toISOString(), format, data,
        metadata: { totalRecords: data.length, columns: selectedColumns, dateRange, filters, includeCharts, includeSummary },
      };
      const existing = JSON.parse(localStorage.getItem(REPORTS_STORAGE_KEY) || '[]');
      localStorage.setItem(REPORTS_STORAGE_KEY, JSON.stringify([newReport, ...existing]));
      setIsGenerating(false);
      router.push('/reports');
    }, 1500);
  };

  const clearForm = () => {
    const tmpl = TEMPLATES[reportType as keyof typeof TEMPLATES];
    setReportName(''); setDescription(''); setDateRange({ start: '', end: '' });
    setSelectedColumns(tmpl?.defaultColumns ?? []); setFilters([]); setPreviewData(null);
  };

  const tmpl = TEMPLATES[reportType as keyof typeof TEMPLATES];
  const TemplateIcon = tmpl?.icon ?? FilePieChart;
  const cols = COLUMNS[reportType] ?? [];
  const colOptions = cols.map(c => ({ value: c.id, label: c.label }));

  return (
    <PageShell>
      <main className="container mx-auto px-4 sm:px-6 py-8 space-y-4">

        <HeroPanel
          icon={FilePieChart}
          title="Generate Report"
          subtitle="Configure and generate operational reports"
          {...sections.panel('hero')}
          actions={
            <>
              <MasterCollapseButton collapse={sections} />
              <Link href="/reports">
                <GlassButton variant="ghost" icon={ArrowLeft} size="sm">Back</GlassButton>
              </Link>
              <GlassButton variant="secondary" icon={Eye} onClick={generatePreview} loading={isGenerating}>
                Preview
              </GlassButton>
              <GlassButton variant="primary" icon={Download} onClick={generateReport} loading={isGenerating} disabled={!reportName}>
                Generate Report
              </GlassButton>
            </>
          }
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* ── Left panel (config) ─────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-4">

            {/* Template selection */}
            <GlassPanel icon={FilePieChart} title="Report Template" variant="dark" {...sections.panel('template')}>
              <div className="px-5 pb-5 pt-2 grid grid-cols-2 md:grid-cols-3 gap-3">
                {Object.entries(TEMPLATES).map(([key, t]) => {
                  const Icon = t.icon;
                  const active = reportType === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setReportType(key)}
                      className={`p-4 rounded-xl text-left transition-all border ${
                        active
                          ? 'border-[#86BBD8]/40 bg-[#2A4D69]/40'
                          : 'border-white/[0.07] bg-white/[0.03] hover:border-white/[0.15] hover:bg-white/[0.06]'
                      }`}
                    >
                      <div className="p-2 rounded-lg bg-white/[0.08] w-fit mb-2">
                        <Icon className={`h-4 w-4 ${active ? 'text-[#86BBD8]' : 'text-white/40'}`} />
                      </div>
                      <h3 className="font-semibold text-xs text-white/80 mb-0.5">{t.name}</h3>
                      <p className="text-[11px] text-white/35 line-clamp-2">{t.description}</p>
                    </button>
                  );
                })}
              </div>
            </GlassPanel>

            {/* Report details */}
            <GlassPanel icon={FileText} title="Report Details" variant="dark" {...sections.panel('reportDetails')}>
              <div className="px-5 pb-5 pt-2 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <GlassInput label="Report Name *" value={reportName} onChange={e => setReportName(e.target.value)} placeholder="Enter report name" />
                  <GlassSelect label="Output Format" value={format} onChange={e => setFormat(e.target.value)} options={FORMAT_OPTIONS} />
                </div>
                <GlassTextarea label="Description" value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe the purpose of this report" rows={2} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <GlassInput label="Start Date" type="date" value={dateRange.start} onChange={e => setDateRange(p => ({ ...p, start: e.target.value }))} style={{ colorScheme: 'dark' }} />
                  <GlassInput label="End Date"   type="date" value={dateRange.end}   onChange={e => setDateRange(p => ({ ...p, end:   e.target.value }))} style={{ colorScheme: 'dark' }} />
                </div>
              </div>
            </GlassPanel>

            {/* Column selection */}
            <GlassPanel icon={Filter} title="Data Columns" variant="dark" {...sections.panel('dataColumns')}>
              <div className="px-5 pb-5 pt-2">
                {selectedColumns.length === 0 && (
                  <div className="flex items-center gap-2 text-amber-400 text-xs mb-3">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    Select at least one column.
                  </div>
                )}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {cols.map(col => (
                    <label key={col.id} className="flex items-center gap-2 cursor-pointer text-xs text-white/60 hover:text-white/90 py-1">
                      <input
                        type="checkbox"
                        checked={selectedColumns.includes(col.id)}
                        onChange={() => toggleColumn(col.id)}
                        className="rounded border-white/20 bg-white/[0.07] accent-[#86BBD8]"
                      />
                      {col.label}
                    </label>
                  ))}
                </div>
              </div>
            </GlassPanel>

            {/* Advanced options (collapsible by GlassPanel defaultOpen=false) */}
            <GlassPanel icon={Settings} title="Advanced Options" variant="panel" defaultOpen={false} {...sections.panel('advancedOptions')}>
              <div className="px-5 pb-5 pt-2 space-y-5">
                {/* Filters */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-white/50 uppercase tracking-wider">Data Filters</span>
                    <GlassButton size="xs" variant="secondary" icon={Plus} onClick={addFilter}>Add Filter</GlassButton>
                  </div>
                  {filters.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 mb-2">
                      <GlassSelect
                        value={f.field}
                        onChange={e => updateFilter(i, 'field', e.target.value)}
                        options={[{ value: '', label: 'Field…' }, ...colOptions]}
                        className="w-36"
                      />
                      <GlassSelect
                        value={f.operator}
                        onChange={e => updateFilter(i, 'operator', e.target.value)}
                        options={OPERATOR_OPTIONS}
                        className="w-32"
                      />
                      <GlassInput value={f.value} onChange={e => updateFilter(i, 'value', e.target.value)} placeholder="Value" className="flex-1" />
                      <GlassButton size="xs" variant="ghost" icon={X} onClick={() => removeFilter(i)} />
                    </div>
                  ))}
                  {filters.length === 0 && <p className="text-xs text-white/30 py-2">No filters configured.</p>}
                </div>

                {/* Options toggles */}
                <div className="border-t border-white/[0.07] pt-4 space-y-1">
                  <GlassToggle checked={includeCharts} onChange={setIncludeCharts} label="Include Charts" description="Add visual charts and graphs to the report" />
                  <GlassToggle checked={includeSummary} onChange={setIncludeSummary} label="Include Summary" description="Add executive summary section" />
                </div>
              </div>
            </GlassPanel>

          </div>

          {/* ── Right panel (summary + preview) ────────────────────────── */}
          <div className="space-y-4">

            {/* Summary card */}
            <GlassPanel icon={TemplateIcon} title="Report Summary" variant="dark" {...sections.panel('reportSummary')}>
              <div className="px-5 pb-5 pt-2 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-[#2A4D69]/40 border border-[#86BBD8]/20">
                    <TemplateIcon className="h-5 w-5 text-[#86BBD8]" />
                  </div>
                  <div>
                    <p className="font-semibold text-white text-sm">{reportName || 'Untitled Report'}</p>
                    <p className="text-xs text-white/40">{tmpl?.name}</p>
                  </div>
                </div>
                <div className="space-y-2 text-xs">
                  {[
                    { k: 'Columns',    v: `${selectedColumns.length} selected` },
                    { k: 'Date Range', v: dateRange.start && dateRange.end ? `${new Date(dateRange.start).toLocaleDateString()} – ${new Date(dateRange.end).toLocaleDateString()}` : 'All dates' },
                    { k: 'Format',     v: format.toUpperCase() },
                    { k: 'Filters',    v: `${filters.length}` },
                  ].map(row => (
                    <div key={row.k} className="flex justify-between">
                      <span className="text-white/40">{row.k}</span>
                      <span className="text-white/70 font-medium">{row.v}</span>
                    </div>
                  ))}
                </div>
                {previewData && (
                  <div className="border-t border-white/[0.07] pt-3 space-y-1 text-xs">
                    <p className="text-white/40 font-semibold uppercase tracking-wider text-[10px] mb-1.5">Preview Info</p>
                    <div className="flex justify-between"><span className="text-white/40">Total Records</span><span className="text-white/70">{previewData.totalRecords}</span></div>
                    <div className="flex justify-between"><span className="text-white/40">Sample Size</span><span className="text-white/70">{previewData.sampleData.length} rows</span></div>
                  </div>
                )}
              </div>
            </GlassPanel>

            {/* Data preview table */}
            {previewData && (
              <GlassPanel icon={Eye} title="Data Preview" variant="dark" {...sections.panel('dataPreview')}>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-white/[0.07]">
                        {previewData.columns.map(c => (
                          <th key={c.id} className="px-3 py-2 text-left text-white/40 font-semibold uppercase tracking-wider text-[10px]">{c.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.sampleData.map((row, i) => (
                        <tr key={i} className="border-b border-white/[0.04] hover:bg-white/[0.03]">
                          {previewData.columns.map(c => (
                            <td key={c.id} className="px-3 py-2 text-white/60">{String(row[c.id] ?? '')}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </GlassPanel>
            )}

            {/* Quick actions */}
            <GlassPanel icon={Settings} title="Quick Actions" variant="panel" {...sections.panel('quickActions')}>
              <div className="px-5 pb-5 pt-2 space-y-2">
                <Link href="/reports" className="block">
                  <GlassButton variant="secondary" icon={FileText} className="w-full justify-start">View Existing Reports</GlassButton>
                </Link>
                <GlassButton variant="secondary" icon={Eye} onClick={generatePreview} className="w-full justify-start" loading={isGenerating}>
                  Refresh Preview
                </GlassButton>
                <GlassButton variant="ghost" icon={X} onClick={clearForm} className="w-full justify-start">
                  Clear Form
                </GlassButton>
              </div>
            </GlassPanel>

          </div>
        </div>

      </main>
    </PageShell>
  );
}
