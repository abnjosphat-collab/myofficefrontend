// app/reports/generate/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, FilePieChart, Download, Filter, Users, Calculator,
  Shield, Settings, Eye, Plus, X, FileText,
  AlertCircle, ToolCase, ChevronDown, ChevronUp, ChevronsUp, ChevronsDown,
} from '@/components/shared/theme';
import { AppShell } from '@/components/app-shell';
import { formatDate } from '@/lib/format';
import { useTheme, PageHero, FormField, PrimaryButton, useCollapseSection, SelectField } from '@/components/shared/theme';

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface ReportFilter { field: string; operator: string; value: string; }
interface PreviewColumn { id: string; label: string; type: string; }
interface PreviewData { totalRecords: number; columns: PreviewColumn[]; sampleData: Record<string, unknown>[]; }

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const REPORTS_STORAGE_KEY = 'generated-reports';

const TEMPLATES = {
  overtime: { name: 'Overtime Summary', description: 'Comprehensive overtime analysis including hours, costs, and approval status', icon: Calculator, defaultColumns: ['employee', 'department', 'date', 'hours', 'status', 'approvedBy'] },
  personnel: { name: 'Personnel Report', description: 'Employee information, department structure, and role analysis', icon: Users, defaultColumns: ['name', 'employeeId', 'department', 'position', 'hireDate', 'status'] },
  assets: { name: 'Asset Utilization', description: 'Equipment performance, maintenance history, and utilization metrics', icon: ToolCase, defaultColumns: ['assetId', 'name', 'category', 'status', 'utilization', 'lastMaintenance'] },
  safety: { name: 'Safety Compliance', description: 'Incident reports, safety audits, and compliance tracking', icon: Shield, defaultColumns: ['incidentId', 'type', 'severity', 'date', 'location', 'status'] },
  maintenance: { name: 'Maintenance Schedule', description: 'Preventive maintenance, work orders, and equipment servicing', icon: Settings, defaultColumns: ['workOrder', 'asset', 'type', 'scheduledDate', 'status', 'assignedTo'] },
  financial: { name: 'Financial Overview', description: 'Cost analysis, budget tracking, and financial performance', icon: FileText, defaultColumns: ['category', 'period', 'budget', 'actual', 'variance', 'status'] },
};

const COLUMNS: Record<string, PreviewColumn[]> = {
  overtime: [{ id: 'employee', label: 'Employee Name', type: 'text' }, { id: 'employeeId', label: 'Employee ID', type: 'text' }, { id: 'department', label: 'Department', type: 'text' }, { id: 'date', label: 'Date', type: 'date' }, { id: 'hours', label: 'Hours', type: 'number' }, { id: 'rate', label: 'Hourly Rate', type: 'currency' }, { id: 'totalCost', label: 'Total Cost', type: 'currency' }, { id: 'reason', label: 'Reason', type: 'text' }, { id: 'status', label: 'Status', type: 'status' }, { id: 'approvedBy', label: 'Approved By', type: 'text' }],
  personnel: [{ id: 'name', label: 'Full Name', type: 'text' }, { id: 'employeeId', label: 'Employee ID', type: 'text' }, { id: 'department', label: 'Department', type: 'text' }, { id: 'position', label: 'Position', type: 'text' }, { id: 'hireDate', label: 'Hire Date', type: 'date' }, { id: 'email', label: 'Email', type: 'text' }, { id: 'phone', label: 'Phone', type: 'text' }, { id: 'status', label: 'Employment Status', type: 'status' }, { id: 'salary', label: 'Salary', type: 'currency' }, { id: 'location', label: 'Location', type: 'text' }],
  assets: [{ id: 'assetId', label: 'Asset ID', type: 'text' }, { id: 'name', label: 'Asset Name', type: 'text' }, { id: 'category', label: 'Category', type: 'text' }, { id: 'status', label: 'Status', type: 'status' }, { id: 'location', label: 'Location', type: 'text' }, { id: 'utilization', label: 'Utilization %', type: 'number' }, { id: 'lastMaintenance', label: 'Last Maintenance', type: 'date' }, { id: 'nextMaintenance', label: 'Next Maintenance', type: 'date' }, { id: 'purchaseCost', label: 'Purchase Cost', type: 'currency' }],
  safety: [{ id: 'incidentId', label: 'Incident ID', type: 'text' }, { id: 'type', label: 'Incident Type', type: 'text' }, { id: 'severity', label: 'Severity', type: 'text' }, { id: 'date', label: 'Date', type: 'date' }, { id: 'location', label: 'Location', type: 'text' }, { id: 'status', label: 'Status', type: 'status' }, { id: 'reportedBy', label: 'Reported By', type: 'text' }],
  maintenance: [{ id: 'workOrder', label: 'Work Order', type: 'text' }, { id: 'asset', label: 'Asset', type: 'text' }, { id: 'type', label: 'Maintenance Type', type: 'text' }, { id: 'scheduledDate', label: 'Scheduled Date', type: 'date' }, { id: 'completedDate', label: 'Completed Date', type: 'date' }, { id: 'status', label: 'Status', type: 'status' }, { id: 'assignedTo', label: 'Assigned To', type: 'text' }, { id: 'cost', label: 'Cost', type: 'currency' }],
  financial: [{ id: 'category', label: 'Category', type: 'text' }, { id: 'period', label: 'Period', type: 'text' }, { id: 'budget', label: 'Budget', type: 'currency' }, { id: 'actual', label: 'Actual', type: 'currency' }, { id: 'variance', label: 'Variance', type: 'currency' }, { id: 'variancePercent', label: 'Variance %', type: 'number' }, { id: 'status', label: 'Status', type: 'status' }],
};

const FORMAT_OPTIONS = [{ value: 'pdf', label: 'PDF Document' }, { value: 'excel', label: 'Excel Spreadsheet' }, { value: 'csv', label: 'CSV File' }, { value: 'html', label: 'Web Page' }];
const OPERATOR_OPTIONS = [{ value: 'equals', label: 'Equals' }, { value: 'contains', label: 'Contains' }, { value: 'greater', label: 'Greater than' }, { value: 'less', label: 'Less than' }];

// ─── LOCAL PRIMITIVES ─────────────────────────────────────────────────────────

function Panel({ id, title, icon: Icon, sections, children }: {
  id: string; title: string; icon: React.ElementType; sections: ReturnType<typeof useCollapseSection>; children: React.ReactNode;
}) {
  const t = useTheme();
  const open = sections.expanded[id];
  return (
    <div className={`${t.glass} rounded-2xl ${t.shadow} overflow-hidden`}>
      <button type="button" onClick={() => sections.toggle(id)} className={`w-full flex items-center justify-between gap-2 px-4 py-3 border-b ${t.border}`}>
        <div className="flex items-center gap-2 min-w-0"><Icon className="h-3.5 w-3.5 text-brand-400 shrink-0" /><span className={`text-sm font-semibold ${t.textPrimary}`}>{title}</span></div>
        {open ? <ChevronUp className={`h-3.5 w-3.5 ${t.textFaint}`} /> : <ChevronDown className={`h-3.5 w-3.5 ${t.textFaint}`} />}
      </button>
      {open && <div className="p-4">{children}</div>}
    </div>
  );
}

function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string }) {
  const t = useTheme();
  return (
    <div className="flex items-center justify-between py-2">
      <div><p className={`text-sm font-medium ${t.textMuted}`}>{label}</p>{description && <p className={`text-xs mt-0.5 ${t.textFaint}`}>{description}</p>}</div>
      <button type="button" role="switch" title={label} aria-checked={checked} onClick={() => onChange(!checked)}
        className={`relative h-6 w-10 rounded-full transition-all ${checked ? 'bg-brand-500' : t.chipBg}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${checked ? 'left-4' : 'left-0.5'}`} />
      </button>
    </div>
  );
}

function generateData(reportType: string, selectedColumns: string[]): Record<string, unknown>[] {
  const cols = COLUMNS[reportType] ?? [];
  return Array.from({ length: Math.floor(Math.random() * 50) + 10 }, () => {
    const rec: Record<string, unknown> = {};
    selectedColumns.forEach(colId => {
      const col = cols.find(c => c.id === colId);
      if (!col) return;
      if (col.type === 'number') rec[colId] = Math.floor(Math.random() * 100);
      else if (col.type === 'currency') rec[colId] = `$${(Math.random() * 1000).toFixed(2)}`;
      else if (col.type === 'date') { const d = new Date(); d.setDate(d.getDate() - Math.floor(Math.random() * 30)); rec[colId] = d.toISOString().split('T')[0]; }
      else if (col.type === 'status') rec[colId] = ['Active', 'Pending', 'Completed', 'Approved', 'Rejected'][Math.floor(Math.random() * 5)];
      else rec[colId] = `Sample ${col.label}`;
    });
    return rec;
  });
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

function GenerateReportContent() {
  const t = useTheme();
  const sections = useCollapseSection({ template: true, reportDetails: true, dataColumns: true, advancedOptions: false, reportSummary: true, dataPreview: true, quickActions: true });
  const router = useRouter();
  const [reportType, setReportType] = useState('overtime');
  const [reportName, setReportName] = useState('');
  const [description, setDescription] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [filters, setFilters] = useState<ReportFilter[]>([]);
  const [format, setFormat] = useState('pdf');
  const [includeCharts, setIncludeCharts] = useState(true);
  const [includeSummary, setIncludeSummary] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);

  useEffect(() => {
    const tmpl = TEMPLATES[reportType as keyof typeof TEMPLATES];
    if (tmpl) {
      setReportName(`${tmpl.name} - ${formatDate(new Date())}`);
      setDescription(tmpl.description);
      setSelectedColumns(tmpl.defaultColumns);
    }
  }, [reportType]);

  const toggleColumn = (id: string) => setSelectedColumns(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const addFilter = () => setFilters(p => [...p, { field: '', operator: 'equals', value: '' }]);
  const updateFilter = (i: number, key: string, val: string) => setFilters(p => p.map((f, idx) => idx === i ? { ...f, [key]: val } : f));
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
  const inputCls = `w-full h-9 px-3 rounded-lg text-sm outline-none transition-colors ${t.inputBg}`;

  return (
    <main className="max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <PageHero
        icon={FilePieChart}
        accent="violet"
        crumbs={['Analytics & Insights', 'Reports', 'Generate']}
        title="Generate Report"
        description="Configure and generate operational reports"
        actions={
          <>
            <button type="button" onClick={sections.toggleAll} title={sections.allOpen ? 'Collapse all sections' : 'Expand all sections'}
              className={`h-8 w-8 flex items-center justify-center rounded-lg ${t.hoverBg} ${t.textFaint} ${t.hoverText}`}>
              {sections.allOpen ? <ChevronsUp className="h-3.5 w-3.5" /> : <ChevronsDown className="h-3.5 w-3.5" />}
            </button>
            <Link href="/reports" className={`h-8 px-3 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 ${t.chipBg} ${t.hoverBg} ${t.textMuted}`}><ArrowLeft className="h-3.5 w-3.5" /> Back</Link>
            <button type="button" onClick={generatePreview} disabled={isGenerating}
              className={`h-8 px-3 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 ${t.chipBg} ${t.hoverBg} ${t.textMuted} disabled:opacity-50`}><Eye className="h-3.5 w-3.5" /> Preview</button>
            <PrimaryButton icon={Download} accent="violet" submitting={isGenerating} disabled={!reportName} onClick={generateReport}>Generate Report</PrimaryButton>
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Panel id="template" title="Report Template" icon={FilePieChart} sections={sections}>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {Object.entries(TEMPLATES).map(([key, tmplItem]) => {
                const Icon = tmplItem.icon;
                const active = reportType === key;
                return (
                  <button key={key} type="button" onClick={() => setReportType(key)}
                    className={`p-4 rounded-xl text-left transition-all border ${active ? 'border-brand-500/40 bg-brand-500/10' : `${t.border} ${t.chipBg} hover:border-brand-400/30`}`}>
                    <div className={`p-2 rounded-lg ${t.chipBg} w-fit mb-2`}><Icon className={`h-4 w-4 ${active ? 'text-brand-500' : t.textFaint}`} /></div>
                    <h3 className={`font-semibold text-xs mb-0.5 ${t.textMuted}`}>{tmplItem.name}</h3>
                    <p className={`text-[11px] line-clamp-2 ${t.textFaint}`}>{tmplItem.description}</p>
                  </button>
                );
              })}
            </div>
          </Panel>

          <Panel id="reportDetails" title="Report Details" icon={FileText} sections={sections}>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <FormField label="Report Name" required><input value={reportName} onChange={e => setReportName(e.target.value)} placeholder="Enter report name" className={inputCls} /></FormField>
                <FormField label="Output Format">
                  <SelectField size="form" title="Output format" value={format} onChange={setFormat}
                    options={FORMAT_OPTIONS.map(o => ({ value: o.value, label: o.label }))} />
                </FormField>
              </div>
              <FormField label="Description">
                <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe the purpose of this report" rows={2}
                  className={`w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors resize-none ${t.inputBg}`} />
              </FormField>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <FormField label="Start Date"><input type="date" title="Start date" value={dateRange.start} onChange={e => setDateRange(p => ({ ...p, start: e.target.value }))} className={inputCls} /></FormField>
                <FormField label="End Date"><input type="date" title="End date" value={dateRange.end} onChange={e => setDateRange(p => ({ ...p, end: e.target.value }))} className={inputCls} /></FormField>
              </div>
            </div>
          </Panel>

          <Panel id="dataColumns" title="Data Columns" icon={Filter} sections={sections}>
            {selectedColumns.length === 0 && (
              <div className="flex items-center gap-2 text-amber-500 text-xs mb-3"><AlertCircle className="h-3.5 w-3.5 shrink-0" /> Select at least one column.</div>
            )}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {cols.map(col => (
                <label key={col.id} className={`flex items-center gap-2 cursor-pointer text-xs py-1 ${t.textMuted} ${t.hoverText}`}>
                  <input type="checkbox" checked={selectedColumns.includes(col.id)} onChange={() => toggleColumn(col.id)} className="accent-brand-600" />
                  {col.label}
                </label>
              ))}
            </div>
          </Panel>

          <Panel id="advancedOptions" title="Advanced Options" icon={Settings} sections={sections}>
            <div className="space-y-5">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs font-semibold uppercase tracking-wider ${t.textFaint}`}>Data Filters</span>
                  <button type="button" onClick={addFilter} className={`h-7 px-2.5 rounded-lg text-xs font-medium ${t.chipBg} ${t.hoverBg} ${t.textMuted} inline-flex items-center gap-1`}><Plus className="h-3 w-3" /> Add Filter</button>
                </div>
                {filters.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 mb-2">
                    <SelectField size="form" title="Filter field" value={f.field} onChange={v => updateFilter(i, 'field', v)} className="w-36"
                      placeholder="Field…" options={cols.map(c => ({ value: c.id, label: c.label }))} />
                    <SelectField size="form" title="Filter operator" value={f.operator} onChange={v => updateFilter(i, 'operator', v)} className="w-32"
                      options={OPERATOR_OPTIONS.map(o => ({ value: o.value, label: o.label }))} />
                    <input value={f.value} onChange={e => updateFilter(i, 'value', e.target.value)} placeholder="Value" className={`${inputCls} flex-1`} />
                    <button type="button" title="Remove filter" onClick={() => removeFilter(i)} className={`h-9 w-9 flex items-center justify-center rounded-lg ${t.hoverBg} ${t.textFaint} hover:text-rose-500`}><X className="h-3.5 w-3.5" /></button>
                  </div>
                ))}
                {filters.length === 0 && <p className={`text-xs py-2 ${t.textFaint}`}>No filters configured.</p>}
              </div>
              <div className={`border-t ${t.border} pt-4 space-y-1`}>
                <Toggle checked={includeCharts} onChange={setIncludeCharts} label="Include Charts" description="Add visual charts and graphs to the report" />
                <Toggle checked={includeSummary} onChange={setIncludeSummary} label="Include Summary" description="Add executive summary section" />
              </div>
            </div>
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel id="reportSummary" title="Report Summary" icon={TemplateIcon} sections={sections}>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-brand-500/10 border border-brand-500/20"><TemplateIcon className="h-5 w-5 text-brand-500" /></div>
                <div><p className={`font-semibold text-sm ${t.textPrimary}`}>{reportName || 'Untitled Report'}</p><p className={`text-xs ${t.textFaint}`}>{tmpl?.name}</p></div>
              </div>
              <div className="space-y-2 text-xs">
                {[
                  { k: 'Columns', v: `${selectedColumns.length} selected` },
                  { k: 'Date Range', v: dateRange.start && dateRange.end ? `${formatDate(dateRange.start)} – ${formatDate(dateRange.end)}` : 'All dates' },
                  { k: 'Format', v: format.toUpperCase() },
                  { k: 'Filters', v: `${filters.length}` },
                ].map(row => (
                  <div key={row.k} className="flex justify-between"><span className={t.textFaint}>{row.k}</span><span className={`font-medium ${t.textMuted}`}>{row.v}</span></div>
                ))}
              </div>
              {previewData && (
                <div className={`border-t ${t.border} pt-3 space-y-1 text-xs`}>
                  <p className={`font-semibold uppercase tracking-wider text-[10px] mb-1.5 ${t.textFaint}`}>Preview Info</p>
                  <div className="flex justify-between"><span className={t.textFaint}>Total Records</span><span className={t.textMuted}>{previewData.totalRecords}</span></div>
                  <div className="flex justify-between"><span className={t.textFaint}>Sample Size</span><span className={t.textMuted}>{previewData.sampleData.length} rows</span></div>
                </div>
              )}
            </div>
          </Panel>

          {previewData && (
            <Panel id="dataPreview" title="Data Preview" icon={Eye} sections={sections}>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead><tr className={`border-b ${t.border}`}>
                    {previewData.columns.map(c => <th key={c.id} className={`px-3 py-2 text-left font-semibold uppercase tracking-wider text-[10px] ${t.textFaint}`}>{c.label}</th>)}
                  </tr></thead>
                  <tbody>
                    {previewData.sampleData.map((row, i) => (
                      <tr key={i} className={`border-b ${t.border} ${t.hoverBg}`}>
                        {previewData.columns.map(c => <td key={c.id} className={`px-3 py-2 ${t.textMuted}`}>{String(row[c.id] ?? '')}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          )}

          <Panel id="quickActions" title="Quick Actions" icon={Settings} sections={sections}>
            <div className="space-y-2">
              <Link href="/reports" className={`w-full px-3 py-2 rounded-lg text-xs font-medium ${t.chipBg} ${t.hoverBg} ${t.textMuted} flex items-center gap-2`}><FileText className="h-3.5 w-3.5" /> View Existing Reports</Link>
              <button type="button" onClick={generatePreview} disabled={isGenerating} className={`w-full px-3 py-2 rounded-lg text-xs font-medium ${t.chipBg} ${t.hoverBg} ${t.textMuted} flex items-center gap-2 disabled:opacity-50`}><Eye className="h-3.5 w-3.5" /> Refresh Preview</button>
              <button type="button" onClick={clearForm} className={`w-full px-3 py-2 rounded-lg text-xs font-medium ${t.hoverBg} ${t.textFaint} ${t.hoverText} flex items-center gap-2`}><X className="h-3.5 w-3.5" /> Clear Form</button>
            </div>
          </Panel>
        </div>
      </div>
    </main>
  );
}

export default function GenerateReportPage() {
  return <AppShell><GenerateReportContent /></AppShell>;
}
