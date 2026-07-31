// app/issues/page.tsx — Stock Issues: record & analyse items issued to personnel
'use client';

import { AppShell } from '@/components/app-shell';
import { api } from '@/lib/apiClient';
import { formatCurrency, formatCurrencyShort, nowLocal, fmtDateTime as formatDateTime, lineTotal as calcLineTotal } from '@/components/shared/utils';
import { EXPORT_BRAND_ARGB, EXPORT_BRAND_RGB } from '@/lib/exportUtils';
import {
  useTheme, PageHero, StatTile, StatCard, FormField, SearchInput, PrimaryButton,
  useCollapseSection, ACCENT_HEX, Combobox, type ComboOption,
} from '@/components/shared/theme';
import React, { useState, useMemo, useCallback } from 'react';
import {
  PackageMinus, Search, Plus, Trash2, RefreshCw,
  ChevronDown, ChevronUp, Loader2, Check, X,
  ClipboardList, Package, BarChart3, TrendingUp, TrendingDown,
  Activity, Users, DollarSign, Download, FileSpreadsheet, FileDown,
  Hash, Target, Layers, Gauge, useConfirm,
} from '@/components/shared/theme';
import { toast } from 'sonner';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell,
} from 'recharts';
import type { DescStats, IssueItemRow, Period, PeriodPoint, Spare, Stats, StockIssue } from './types';
import { apiCreateIssue, apiDeleteIssue, useIssuesData } from './useIssuesData';

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const uid = () => Math.random().toString(36).slice(2);

// ─── ANALYTICS HELPERS ────────────────────────────────────────────────────────

const issueCost = (issue: StockIssue): number =>
  issue.items.reduce((sum, item) => sum + calcLineTotal(item.qty, item.unit_price || 0), 0);

const addDays = (date: Date, days: number) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

const startOfWeek = (d: Date) => {
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  const mon = new Date(d);
  mon.setDate(d.getDate() + diff);
  mon.setHours(0, 0, 0, 0);
  return mon;
};

const isoDate = (d: Date) => d.toISOString().slice(0, 10);
const isoMonth = (d: Date) => d.toISOString().slice(0, 7);

function buildTimeSeries(issues: StockIssue[], period: Period): PeriodPoint[] {
  const map = new Map<string, PeriodPoint>();
  const now = new Date();
  const keys: string[] = [];

  if (period === 'day') {
    for (let i = 29; i >= 0; i--) {
      const d = addDays(now, -i);
      const k = isoDate(d);
      const lbl = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
      keys.push(k);
      map.set(k, { key: k, label: lbl, cost: 0, count: 0, costWithPrice: 0, itemCount: 0 });
    }
  } else if (period === 'week') {
    for (let i = 12; i >= 0; i--) {
      const mon = startOfWeek(addDays(now, -i * 7));
      const k = isoDate(mon);
      const lbl = mon.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
      if (!map.has(k)) {
        keys.push(k);
        map.set(k, { key: k, label: `W/c ${lbl}`, cost: 0, count: 0, costWithPrice: 0, itemCount: 0 });
      }
    }
  } else {
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const k = isoMonth(d);
      const lbl = d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
      keys.push(k);
      map.set(k, { key: k, label: lbl, cost: 0, count: 0, costWithPrice: 0, itemCount: 0 });
    }
  }

  for (const issue of issues) {
    const d = new Date(issue.issued_at);
    let k: string;
    if (period === 'day') k = isoDate(d);
    else if (period === 'week') k = isoDate(startOfWeek(d));
    else k = isoMonth(d);

    if (map.has(k)) {
      const pt = map.get(k)!;
      const cost = issueCost(issue);
      const hasPrice = issue.items.some(item => (item.unit_price || 0) > 0);
      pt.cost += cost;
      pt.count += 1;
      if (hasPrice) pt.costWithPrice += cost;
      pt.itemCount += issue.items.length;
    }
  }

  return keys.map(k => map.get(k)!);
}

function calcStats(costs: number[], allIssues: StockIssue[]): DescStats {
  if (costs.length === 0) return { total: 0, count: 0, mean: 0, median: 0, stdDev: 0, min: 0, max: 0, costed: 0 };
  const sorted = [...costs].sort((a, b) => a - b);
  const total = costs.reduce((a, b) => a + b, 0);
  const mean = total / costs.length;
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  const variance = costs.reduce((a, b) => a + (b - mean) ** 2, 0) / costs.length;
  const stdDev = Math.sqrt(variance);
  return {
    total, count: costs.length, mean, median, stdDev,
    min: sorted[0], max: sorted[sorted.length - 1],
    costed: allIssues.filter(i => i.items.some(item => (item.unit_price || 0) > 0)).length,
  };
}

function topBy(issues: StockIssue[], key: 'recipient_name' | 'description', n = 8) {
  const map = new Map<string, { cost: number; count: number }>();
  for (const issue of issues) {
    if (key === 'recipient_name') {
      const name = issue.recipient_name;
      const cost = issueCost(issue);
      const e = map.get(name) || { cost: 0, count: 0 };
      e.cost += cost;
      e.count += issue.items.length;
      map.set(name, e);
    } else {
      for (const item of issue.items) {
        const desc = item.stock_code ? `${item.stock_code} · ${item.description.slice(0, 28)}` : item.description.slice(0, 35);
        const cost = calcLineTotal(item.qty, item.unit_price || 0);
        const e = map.get(desc) || { cost: 0, count: 0 };
        e.cost += cost;
        e.count += item.qty;
        map.set(desc, e);
      }
    }
  }
  return [...map.entries()]
    .map(([name, d]) => ({ name, ...d }))
    .sort((a, b) => b.cost - a.cost)
    .slice(0, n);
}

// ─── COMBO FIELD ─────────────────────────────────────────────────────────────

const ComboField = React.memo(({
  fetchUrl, mapOptions, value, onChange, placeholder,
}: {
  fetchUrl: string;
  mapOptions: (d: any[]) => { label: string; sub?: string }[];
  value: string; onChange: (v: string) => void;
  placeholder?: string;
}) => {
  const [options, setOptions] = useState<{ label: string; sub?: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  const load = useCallback(async () => {
    if (fetched) return;
    setLoading(true);
    try {
      const data = await api.get<any>(fetchUrl);
      setOptions(mapOptions(Array.isArray(data) ? data : []));
    } catch {} finally { setLoading(false); setFetched(true); }
  }, [fetched, fetchUrl, mapOptions]);

  const filtered = useMemo<ComboOption[]>(() => {
    const q = value.toLowerCase();
    const base = !q ? options.slice(0, 10)
      : options.filter(o => o.label.toLowerCase().includes(q) || (o.sub || '').toLowerCase().includes(q)).slice(0, 10);
    return base.map(o => ({ value: o.label, label: o.label, sub: o.sub }));
  }, [value, options]);

  return (
    <Combobox
      value={value}
      onChange={onChange}
      onSelect={o => onChange(o.value)}
      options={filtered}
      loading={loading}
      onFocusLoad={load}
      placeholder={placeholder}
      size="form"
    />
  );
});
ComboField.displayName = 'ComboField';

// ─── SPARE PICKER ─────────────────────────────────────────────────────────────

const SparePicker = React.memo(({
  spares, value, onSelect, placeholder,
}: {
  spares: Spare[]; value: string;
  onSelect: (s: Spare | null, text: string) => void;
  placeholder?: string;
}) => {
  const t = useTheme();
  const filtered = useMemo(() => {
    const q = value.toLowerCase();
    if (!q) return spares.slice(0, 12);
    return spares.filter(s =>
      s.stock_code.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q) ||
      (s.category || '').toLowerCase().includes(q)
    ).slice(0, 12);
  }, [value, spares]);

  const byCode = useMemo(() => {
    const m = new Map<string, Spare>();
    filtered.forEach(s => m.set(s.stock_code, s));
    return m;
  }, [filtered]);

  const options = useMemo<ComboOption[]>(
    () => filtered.map(s => ({ value: s.stock_code, label: s.stock_code, sub: s.description })),
    [filtered],
  );

  return (
    <Combobox
      value={value}
      onChange={txt => onSelect(null, txt)}
      onSelect={o => { const s = byCode.get(o.value); onSelect(s ?? null, s ? s.stock_code : o.value); }}
      options={options}
      size="filter"
      minWidth={320}
      placeholder={placeholder}
      inputClassName="font-mono"
      renderOption={(o) => {
        const s = byCode.get(o.value);
        if (!s) return <span className={t.textMuted}>{o.label}</span>;
        return (
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <span className="font-mono text-[#86BBD8] font-semibold">{s.stock_code}</span>
              <span className={`${t.textMuted} ml-2`}>{s.description.slice(0, 46)}</span>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0 text-[10px]">
              <span className="text-[#86BBD8]/80">{formatCurrency(s.unit_price)}</span>
              <span className={s.current_quantity <= 0 ? 'text-rose-500' : t.textFaint}>qty: {s.current_quantity}</span>
            </div>
          </div>
        );
      }}
    />
  );
});
SparePicker.displayName = 'SparePicker';

// ─── CHART TOOLTIP STYLE ─────────────────────────────────────────────────────

function useChartStyle() {
  const t = useTheme();
  return useMemo(() => ({
    tooltipStyle: {
      contentStyle: {
        background: t.light ? 'rgba(255,255,255,0.98)' : 'rgba(4,12,24,0.97)',
        border: t.light ? '1px solid rgba(15,23,42,0.12)' : '1px solid rgba(255,255,255,0.15)',
        borderRadius: '12px',
        color: t.light ? 'rgba(15,23,42,0.85)' : 'rgba(255,255,255,0.85)',
        fontSize: '12px',
      },
      itemStyle: { color: '#86BBD8' },
      labelStyle: { color: t.light ? 'rgba(15,23,42,0.5)' : 'rgba(255,255,255,0.5)', marginBottom: 4 },
    },
    axisProps: {
      tick: { fill: t.light ? 'rgba(15,23,42,0.45)' : 'rgba(255,255,255,0.35)', fontSize: 10 },
      axisLine: { stroke: t.light ? 'rgba(15,23,42,0.1)' : 'rgba(255,255,255,0.08)' },
      tickLine: false as const,
    },
    gridProps: {
      stroke: t.light ? 'rgba(15,23,42,0.08)' : 'rgba(255,255,255,0.06)',
      strokeDasharray: '3 3',
    },
  }), [t.light]);
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

function IssuesPageContent() {
  const t = useTheme();
  const confirm = useConfirm();
  const { tooltipStyle, axisProps, gridProps } = useChartStyle();
  const sections = useCollapseSection({ stats: false, records: true });
  const { issues, serverStats, spares, loading, refreshing, refresh: loadData } = useIssuesData();
  const [submitting, setSubmitting] = useState(false);

  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [logTab, setLogTab] = useState<'log' | 'analytics'>('log');

  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [period, setPeriod] = useState<Period>('week');

  const [recipient, setRecipient] = useState('');
  const [issuedBy, setIssuedBy] = useState(() => {
    if (typeof window !== 'undefined') {
      try { return JSON.parse(localStorage.getItem('user') || '{}').name || ''; } catch { return ''; }
    }
    return '';
  });
  const [issuedAt, setIssuedAt] = useState(nowLocal);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<IssueItemRow[]>([
    { id: uid(), stockCode: '', description: '', qty: 1, unit: 'UN', unit_price: 0 },
  ]);

  const addItem = () =>
    setItems(p => [...p, { id: uid(), stockCode: '', description: '', qty: 1, unit: 'UN', unit_price: 0 }]);

  const removeItem = (id: string) => {
    if (items.length === 1) return;
    setItems(p => p.filter(i => i.id !== id));
  };

  const updateItem = (id: string, patch: Partial<IssueItemRow>) =>
    setItems(p => p.map(i => i.id === id ? { ...i, ...patch } : i));

  const handleSpareSelect = (rowId: string, spare: Spare | null, text: string) => {
    if (spare) {
      updateItem(rowId, {
        stockCode: spare.stock_code,
        description: spare.description,
        unit: spare.unit_of_measure || 'UN',
        unit_price: spare.unit_price,
      });
    } else {
      updateItem(rowId, { stockCode: text, unit_price: 0 });
    }
  };

  const handleSubmit = async () => {
    if (!recipient.trim()) { toast.error('Recipient name is required'); return; }
    const validItems = items.filter(i => i.description.trim() || i.stockCode.trim());
    if (validItems.length === 0) { toast.error('Add at least one item'); return; }
    setSubmitting(true);
    try {
      await apiCreateIssue({
        issued_at: new Date(issuedAt).toISOString(),
        recipient_name: recipient.trim(),
        issued_by: issuedBy.trim() || null,
        items: validItems.map(i => ({
          stock_code: i.stockCode || null,
          description: (i.description || i.stockCode).trim(),
          qty: i.qty,
          unit: i.unit || 'UN',
          unit_price: i.unit_price || null,
        })),
        notes: notes.trim() || null,
      });
      toast.success('Issue recorded');
      setRecipient('');
      setNotes('');
      setIssuedAt(nowLocal());
      setItems([{ id: uid(), stockCode: '', description: '', qty: 1, unit: 'UN', unit_price: 0 }]);
      await loadData(true);
    } catch (e: any) {
      toast.error(e.message || 'Failed to record issue');
    } finally { setSubmitting(false); }
  };

  const handleDelete = async (id: number) => {
    if (!await confirm({ title: 'Delete this issue record?', message: 'This cannot be undone.', destructive: true })) return;
    try { await apiDeleteIssue(id); toast.success('Deleted'); await loadData(true); }
    catch (e: any) { toast.error(e.message); }
  };

  const toggleRow = (id: number) =>
    setExpandedRows(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const filteredIssues = useMemo(() => {
    let list = issues;
    if (dateFrom) list = list.filter(i => i.issued_at >= dateFrom);
    if (dateTo) list = list.filter(i => i.issued_at.slice(0, 10) <= dateTo);
    if (search.trim()) {
      const s = search.toLowerCase();
      list = list.filter(i =>
        i.recipient_name.toLowerCase().includes(s) ||
        (i.recipient_id || '').toLowerCase().includes(s) ||
        (i.issued_by || '').toLowerCase().includes(s) ||
        (i.notes || '').toLowerCase().includes(s) ||
        i.items.some(item =>
          item.description.toLowerCase().includes(s) ||
          (item.stock_code || '').toLowerCase().includes(s)
        )
      );
    }
    return list;
  }, [issues, search, dateFrom, dateTo]);

  const timeSeries = useMemo(() => buildTimeSeries(issues, period), [issues, period]);
  const allCosts = useMemo(() => issues.map(issueCost), [issues]);
  const descStats = useMemo(() => calcStats(allCosts, issues), [allCosts, issues]);
  const topRecipients = useMemo(() => topBy(issues, 'recipient_name', 8), [issues]);
  const topItems = useMemo(() => topBy(issues, 'description', 8), [issues]);
  const totalCostTracked = useMemo(() => issues.reduce((s, i) => s + issueCost(i), 0), [issues]);
  const periodPeak = useMemo(() => timeSeries.reduce((best, pt) => pt.cost > best.cost ? pt : best, { cost: 0, label: '—' } as any), [timeSeries]);

  const BAR_COLORS = ['#86BBD8', '#a78bfa', '#34d399', '#f59e0b', '#60a5fa', '#f43f5e', '#fb923c', '#2dd4bf'];

  const [showDlMenu, setShowDlMenu] = useState(false);

  const downloadIssuesExcel = async () => {
    setShowDlMenu(false);
    if (!issues.length) { toast.warning('No data to export'); return; }
    try {
      const ExcelJS = (await import('exceljs')).default;
      const { saveAs } = await import('file-saver');
      const wb = new ExcelJS.Workbook();
      wb.creator = 'Ozech MyOffice';
      const ws = wb.addWorksheet('Stock Issues');
      ws.columns = [
        { header: 'Issue Date', key: 'date', width: 20 },
        { header: 'Recipient', key: 'recipient', width: 26 },
        { header: 'Recipient ID', key: 'rid', width: 14 },
        { header: 'Issued By', key: 'issuedby', width: 22 },
        { header: 'Items (count)', key: 'items', width: 14 },
        { header: 'Total Cost', key: 'cost', width: 14 },
        { header: 'Notes', key: 'notes', width: 34 },
      ];
      const hdr = ws.getRow(1);
      hdr.eachCell(cell => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EXPORT_BRAND_ARGB } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      });
      hdr.height = 18;
      issues.forEach((issue, i) => {
        const cost = issueCost(issue);
        const row = ws.addRow({
          date: issue.issued_at ? new Date(issue.issued_at).toLocaleString('en-GB') : '',
          recipient: issue.recipient_name,
          rid: issue.recipient_id || '',
          issuedby: issue.issued_by || '',
          items: issue.items.length,
          cost,
          notes: issue.notes || '',
        });
        if (i % 2 === 1) row.eachCell(cell => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F4F8' } }; });
        row.getCell('cost').numFmt = '"$"#,##0.00';
      });
      ws.autoFilter = { from: 'A1', to: 'G1' };
      ws.views = [{ state: 'frozen', ySplit: 1 }];
      const ws2 = wb.addWorksheet('Line Items');
      ws2.columns = [
        { header: 'Issue Date', key: 'date', width: 20 },
        { header: 'Recipient', key: 'recipient', width: 26 },
        { header: 'Stock Code', key: 'code', width: 16 },
        { header: 'Description', key: 'desc', width: 36 },
        { header: 'Qty', key: 'qty', width: 8 },
        { header: 'Unit', key: 'unit', width: 8 },
        { header: 'Unit Price', key: 'uprice', width: 14 },
        { header: 'Line Total', key: 'total', width: 14 },
      ];
      const hdr2 = ws2.getRow(1);
      hdr2.eachCell(cell => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EXPORT_BRAND_ARGB } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      });
      hdr2.height = 18;
      let rowIdx = 0;
      issues.forEach(issue => {
        issue.items.forEach(item => {
          const lineTotal = calcLineTotal(item.qty, item.unit_price || 0);
          const row = ws2.addRow({
            date: issue.issued_at ? new Date(issue.issued_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '',
            recipient: issue.recipient_name,
            code: item.stock_code || '',
            desc: item.description,
            qty: item.qty,
            unit: item.unit || '',
            uprice: item.unit_price ?? '',
            total: lineTotal,
          });
          if (rowIdx % 2 === 1) row.eachCell(cell => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F4F8' } }; });
          ['uprice', 'total'].forEach(k => { row.getCell(k).numFmt = '"$"#,##0.00'; });
          rowIdx++;
        });
      });
      ws2.autoFilter = { from: 'A1', to: 'H1' };
      ws2.views = [{ state: 'frozen', ySplit: 1 }];
      const buf = await wb.xlsx.writeBuffer();
      saveAs(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
        `Stock_Issues_${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success(`Excel exported — ${issues.length} issues`);
    } catch (err: any) { toast.error(`Export failed: ${err.message}`); }
  };

  const downloadIssuesPDF = async () => {
    setShowDlMenu(false);
    if (!issues.length) { toast.warning('No data to export'); return; }
    try {
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      doc.setFontSize(14); doc.setTextColor(...EXPORT_BRAND_RGB);
      doc.text('Stock Issues Register', 14, 14);
      doc.setFontSize(8); doc.setTextColor(100, 100, 100);
      doc.text(
        `Generated ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}  ·  ${issues.length} issues  ·  Total cost: ${formatCurrency(totalCostTracked)}`,
        14, 20
      );
      autoTable(doc, {
        startY: 25,
        head: [['Issue Date', 'Recipient', 'Recipient ID', 'Issued By', 'Items', 'Total Cost', 'Notes']],
        body: issues.map(issue => [
          issue.issued_at ? new Date(issue.issued_at).toLocaleString('en-GB') : '',
          issue.recipient_name,
          issue.recipient_id || '',
          issue.issued_by || '',
          issue.items.length,
          formatCurrency(issueCost(issue)),
          issue.notes || '',
        ]),
        headStyles: { fillColor: EXPORT_BRAND_RGB, textColor: 255, fontStyle: 'bold', fontSize: 7.5 },
        bodyStyles: { fontSize: 7.5 },
        alternateRowStyles: { fillColor: [240, 244, 248] },
        styles: { cellPadding: 1.5 },
        margin: { left: 10, right: 10 },
      });
      doc.save(`Stock_Issues_${new Date().toISOString().slice(0, 10)}.pdf`);
      toast.success(`PDF exported — ${issues.length} issues`);
    } catch (err: any) { toast.error(`Export failed: ${err.message}`); }
  };

  const employeeMapOptions = useCallback(
    (d: any[]) => d.map((e: any) => ({
      label: `${e.first_name} ${e.last_name}`,
      sub: [e.employee_id, e.designation].filter(Boolean).join(' · '),
    })),
    []
  );

  const inputCls = `w-full h-9 px-3 rounded-lg text-sm outline-none transition-colors ${t.inputBg}`;
  const rowInputCls = `w-full px-2.5 py-1.5 text-xs rounded-lg outline-none transition-colors ${t.inputBg}`;

  return (
    <main className="max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <PageHero
        icon={PackageMinus}
        accent="violet"
        crumbs={['Inventory', 'Stock Issues']}
        title="Stock Issues"
        description="Record & track items issued to personnel"
        statsOpen={sections.expanded.stats}
        actions={
          <>
            <button type="button" onClick={() => loadData(true)} disabled={refreshing} title="Refresh"
              className={`h-8 w-8 flex items-center justify-center rounded-lg ${t.hoverBg} ${t.textFaint} ${t.hoverText} transition-all disabled:opacity-40`}>
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <div className="relative">
              <button type="button" onClick={() => setShowDlMenu(p => !p)} disabled={issues.length === 0}
                className={`h-8 px-3 flex items-center gap-1.5 text-xs rounded-lg font-semibold ${t.chipBg} ${t.hoverBg} ${t.textMuted} ${t.hoverText} transition-all disabled:opacity-40`}>
                <Download className="h-3.5 w-3.5" /> Download
              </button>
              {showDlMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowDlMenu(false)} />
                  <div className={`absolute right-0 top-full mt-1 z-50 rounded-xl overflow-hidden w-48 ${t.glass} ${t.shadow}`}>
                    <button type="button" onClick={downloadIssuesExcel}
                      className={`w-full flex items-center gap-2.5 px-4 py-3 text-xs ${t.textMuted} ${t.hoverBg} transition-all border-b ${t.border}`}>
                      <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-500" /> Export Excel (.xlsx)
                    </button>
                    <button type="button" onClick={downloadIssuesPDF}
                      className={`w-full flex items-center gap-2.5 px-4 py-3 text-xs ${t.textMuted} ${t.hoverBg} transition-all`}>
                      <FileDown className="h-3.5 w-3.5 text-rose-500" /> Export PDF
                    </button>
                  </div>
                </>
              )}
            </div>
            <button type="button" title={sections.expanded.stats ? 'Hide stats' : 'Show stats'} onClick={() => sections.toggle('stats')}
              className={`h-8 w-8 flex items-center justify-center rounded-lg ${t.hoverBg} ${t.textFaint} ${t.hoverText} transition-all`}>
              {sections.expanded.stats ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
          </>
        }
      >
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <StatTile icon={Hash} color="#86BBD8" label="Total Records" value={serverStats.total} />
          <StatTile icon={Activity} color="#34d399" label="Today" value={serverStats.today} />
          <StatTile icon={Layers} color="#a78bfa" label="This Week" value={serverStats.this_week} />
          <StatTile icon={Users} color="#f59e0b" label="Recipients" value={serverStats.unique_recipients} />
          <StatTile icon={DollarSign} color="#60a5fa" label="Total Cost" value={formatCurrencyShort(totalCostTracked)} />
        </div>
      </PageHero>

      {sections.expanded.records && <>
        {/* Record new issue */}
        <div className={`${t.glass} rounded-2xl ${t.shadow} overflow-hidden`}>
          <div className={`px-5 py-3 border-b ${t.border} flex items-center gap-2`}>
            <ClipboardList className="h-3.5 w-3.5 text-[#86BBD8]" />
            <span className={`text-xs font-semibold uppercase tracking-wider ${t.textMuted}`}>Record New Issue</span>
          </div>
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <FormField label="Issued To" required>
                <ComboField fetchUrl="/api/employees" mapOptions={employeeMapOptions}
                  value={recipient} onChange={setRecipient}
                  placeholder="Name or employee ID…" />
              </FormField>
              <FormField label="Date & Time">
                <input type="datetime-local" value={issuedAt} onChange={e => setIssuedAt(e.target.value)} title="Date and time"
                  className={inputCls} />
              </FormField>
              <FormField label="Issued By">
                <ComboField fetchUrl="/api/employees" mapOptions={employeeMapOptions}
                  value={issuedBy} onChange={setIssuedBy}
                  placeholder="Your name or employee ID…" />
              </FormField>
              <FormField label="Notes">
                <input type="text" value={notes} onChange={e => setNotes(e.target.value)}
                  className={inputCls} placeholder="Reason, job no., project…" />
              </FormField>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-[11px] font-semibold uppercase tracking-wider ${t.textFaint}`}>Items to Issue</span>
                <button type="button" onClick={addItem}
                  className={`inline-flex items-center gap-1 h-6 px-2.5 text-[11px] rounded-lg font-medium ${t.chipBg} ${t.hoverBg} ${t.textMuted} transition-all`}>
                  <Plus className="h-2.5 w-2.5" /> Add Item
                </button>
              </div>

              <div className={`grid gap-2 px-1 mb-1 text-[10px] uppercase tracking-wider ${t.textFaint}`}
                style={{ gridTemplateColumns: '160px 1fr 88px 72px 88px 28px' }}>
                <div>Stock Code</div><div>Description</div>
                <div className="text-right">Qty</div><div className="text-center">Unit</div>
                <div className="text-right">Unit Cost</div><div />
              </div>

              <div className="space-y-1.5">
                {items.map(item => (
                  <div key={item.id}
                    className={`grid gap-2 items-center rounded-xl p-2 ${t.chipBg} border ${t.border} transition-all`}
                    style={{ gridTemplateColumns: '160px 1fr 88px 72px 88px 28px' }}>
                    <SparePicker spares={spares} value={item.stockCode}
                      onSelect={(s, text) => handleSpareSelect(item.id, s, text)}
                      placeholder="Code or search…" />
                    <input type="text" value={item.description}
                      onChange={e => updateItem(item.id, { description: e.target.value })}
                      placeholder="Description…" className={rowInputCls} />
                    <input type="number" min="0.01" step="any" value={item.qty} title="Quantity"
                      onChange={e => updateItem(item.id, { qty: Math.max(0.01, parseFloat(e.target.value) || 1) })}
                      className={`${rowInputCls} text-right`} />
                    <input type="text" value={item.unit} title="Unit"
                      onChange={e => updateItem(item.id, { unit: e.target.value })}
                      placeholder="UN" className={`${rowInputCls} text-center`} />
                    <div className="relative">
                      <span className={`absolute left-2 top-1/2 -translate-y-1/2 text-[10px] ${t.textFaint}`}>$</span>
                      <input type="number" min="0" step="0.01" value={item.unit_price} title="Unit price"
                        onChange={e => updateItem(item.id, { unit_price: parseFloat(e.target.value) || 0 })}
                        className={`${rowInputCls} pl-5 text-right`} />
                    </div>
                    <button type="button" title="Remove item" onClick={() => removeItem(item.id)} disabled={items.length === 1}
                      className={`h-6 w-6 flex items-center justify-center rounded ${t.hoverBg} ${t.textFaint} hover:text-rose-500 disabled:opacity-20 disabled:cursor-not-allowed transition-all`}>
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>

              {items.some(i => i.unit_price > 0) && (
                <div className="flex justify-end mt-2 pr-8">
                  <div className={`text-xs ${t.textFaint}`}>
                    Issue total: <span className={`${t.textPrimary} font-semibold ml-1`}>
                      {formatCurrency(items.reduce((s, i) => s + calcLineTotal(i.qty, i.unit_price), 0))}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className={`text-[11px] ${t.textFaint}`}>
                {items.filter(i => i.description.trim() || i.stockCode.trim()).length} item{items.filter(i => i.description.trim() || i.stockCode.trim()).length !== 1 ? 's' : ''} to{' '}
                <span className={t.textMuted}>{recipient || '—'}</span>
              </div>
              <PrimaryButton icon={submitting ? undefined : Check} accent="violet" onClick={handleSubmit} disabled={submitting} submitting={submitting}>
                Record Issue
              </PrimaryButton>
            </div>
          </div>
        </div>

        {/* Log / analytics */}
        <div className={`${t.glass} rounded-2xl ${t.shadow} overflow-hidden`}>
          <div className={`px-5 py-3 border-b ${t.border} flex items-center justify-between gap-3 flex-wrap`}>
            <div className="flex items-center gap-1">
              {([
                { id: 'log', label: 'Issue Log', icon: Package },
                { id: 'analytics', label: 'Analytics', icon: BarChart3 },
              ] as const).map(tab => (
                <button key={tab.id} type="button" onClick={() => setLogTab(tab.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${logTab === tab.id ? 'bg-brand-500/15 text-brand-500' : `${t.textFaint} ${t.hoverBg} ${t.hoverText}`}`}>
                  <tab.icon className="h-3 w-3" />
                  {tab.label}
                </button>
              ))}
            </div>
            {logTab === 'log' && (
              <span className={`text-[11px] ${t.textFaint}`}>{filteredIssues.length} record{filteredIssues.length !== 1 ? 's' : ''}</span>
            )}
            {logTab === 'analytics' && (
              <div className="flex items-center gap-1">
                {(['day', 'week', 'month'] as const).map(p => (
                  <button key={p} type="button" onClick={() => setPeriod(p)}
                    className={`h-6 px-2.5 text-[11px] rounded-lg capitalize transition-all ${period === p ? 'bg-brand-500/15 text-brand-500' : `${t.chipBg} ${t.textFaint} ${t.hoverText}`}`}>
                    {p === 'day' ? 'Daily' : p === 'week' ? 'Weekly' : 'Monthly'}
                  </button>
                ))}
              </div>
            )}
          </div>

          {logTab === 'log' && (
            <>
              <div className={`px-5 py-3 border-b ${t.border} grid grid-cols-1 sm:grid-cols-3 gap-2`}>
                <SearchInput value={search} onChange={setSearch} placeholder="Search recipient, item, notes…" />
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} title="From date"
                  className={`px-3 py-1.5 text-xs rounded-lg outline-none transition-colors ${t.inputBg}`} />
                <div className="flex gap-2">
                  <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} title="To date"
                    className={`flex-1 px-3 py-1.5 text-xs rounded-lg outline-none transition-colors ${t.inputBg}`} />
                  {(search || dateFrom || dateTo) && (
                    <button type="button" onClick={() => { setSearch(''); setDateFrom(''); setDateTo(''); }}
                      className={`h-7 px-2.5 rounded-lg ${t.chipBg} ${t.hoverBg} ${t.textFaint} text-xs transition-all flex items-center gap-1`}>
                      <X className="h-3 w-3" /> Clear
                    </button>
                  )}
                </div>
              </div>

              {loading ? (
                <div className={`flex items-center justify-center py-20 ${t.textFaint} gap-2`}>
                  <Loader2 className="h-5 w-5 animate-spin" /> Loading…
                </div>
              ) : filteredIssues.length === 0 ? (
                <div className={`text-center py-20 ${t.textFaint}`}>
                  <PackageMinus className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <div className={`text-sm font-medium ${t.textMuted}`}>No issue records</div>
                  <div className="text-xs mt-1">
                    {search || dateFrom || dateTo ? 'No records match your filters' : 'Use the form above to record the first issue'}
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className={`border-b ${t.border}`}>
                        {['Date & Time', 'Issued To', 'Items', 'Cost', 'Issued By', 'Notes', ''].map((h, i) => (
                          <th key={i} className={`py-2.5 text-[10px] font-semibold uppercase tracking-wider ${t.textFaint} ${i === 0 ? 'pl-5 pr-3 text-left' : i === 3 ? 'px-3 text-right' : i === 6 ? 'px-3 w-16' : 'px-3 text-left'}`}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredIssues.map(issue => {
                        const expanded = expandedRows.has(issue.id);
                        const cost = issueCost(issue);
                        const hasCost = issue.items.some(i => (i.unit_price || 0) > 0);
                        return (
                          <React.Fragment key={issue.id}>
                            <tr className={`border-b ${t.border} cursor-pointer transition-colors ${expanded ? t.chipBg : t.hoverBg}`}
                              onClick={() => toggleRow(issue.id)}>
                              <td className={`pl-5 pr-3 py-3 text-xs ${t.textMuted} whitespace-nowrap`}>{formatDateTime(issue.issued_at)}</td>
                              <td className="px-3 py-3">
                                <div className={`text-xs font-semibold ${t.textPrimary}`}>{issue.recipient_name}</div>
                                {issue.recipient_id && <div className={`text-[10px] mt-0.5 font-mono ${t.textFaint}`}>{issue.recipient_id}</div>}
                              </td>
                              <td className="px-3 py-3">
                                <div className={`text-xs ${t.textMuted}`}>
                                  <span className={`font-semibold ${t.textPrimary}`}>{issue.items.length}</span> item{issue.items.length !== 1 ? 's' : ''}
                                </div>
                                {issue.items[0] && (
                                  <div className={`text-[10px] mt-0.5 truncate max-w-[180px] ${t.textFaint}`}>
                                    {issue.items[0].stock_code && <span className="font-mono text-[#86BBD8] mr-1">{issue.items[0].stock_code}</span>}
                                    {issue.items[0].description.slice(0, 35)}{issue.items.length > 1 && ' …'}
                                  </div>
                                )}
                              </td>
                              <td className="px-3 py-3 text-right">
                                {hasCost
                                  ? <span className={`text-xs font-semibold ${t.textPrimary}`}>{formatCurrency(cost)}</span>
                                  : <span className={`text-[10px] ${t.textFaint}`}>—</span>
                                }
                              </td>
                              <td className={`px-3 py-3 text-xs ${t.textFaint}`}>{issue.issued_by || '—'}</td>
                              <td className={`px-3 py-3 text-xs ${t.textFaint} max-w-[160px]`}><div className="truncate">{issue.notes || '—'}</div></td>
                              <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                                <div className="flex items-center justify-end gap-1">
                                  <button type="button" title={expanded ? 'Collapse' : 'Expand'}
                                    onClick={e => { e.stopPropagation(); toggleRow(issue.id); }}
                                    className={`h-6 w-6 flex items-center justify-center rounded ${t.textFaint} ${t.hoverText} transition-all`}>
                                    {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                                  </button>
                                  <button type="button" title="Delete record"
                                    onClick={e => { e.stopPropagation(); handleDelete(issue.id); }}
                                    className={`h-6 w-6 flex items-center justify-center rounded ${t.hoverBg} ${t.textFaint} hover:text-rose-500 transition-all`}>
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                            {expanded && (
                              <tr className={`border-b ${t.border}`}>
                                <td colSpan={7} className="pl-5 pr-5 py-3">
                                  <div className={`text-[10px] uppercase tracking-wider mb-2 ${t.textFaint}`}>Items Issued</div>
                                  <div className="space-y-1">
                                    {issue.items.map((item, i) => (
                                      <div key={i} className={`flex items-center gap-4 text-xs px-3 py-2 rounded-lg ${t.chipBg} border ${t.border}`}>
                                        {item.stock_code && <span className="font-mono text-[#86BBD8] font-semibold flex-shrink-0 w-24 truncate">{item.stock_code}</span>}
                                        <span className={`${t.textMuted} flex-1`}>{item.description}</span>
                                        <span className={`${t.textPrimary} font-semibold flex-shrink-0`}>{item.qty}</span>
                                        <span className={`${t.textFaint} flex-shrink-0 w-8 text-right`}>{item.unit || 'UN'}</span>
                                        {(item.unit_price || 0) > 0
                                          ? <span className="text-[#86BBD8] flex-shrink-0 w-20 text-right font-medium">{formatCurrency(calcLineTotal(item.qty, item.unit_price || 0))}</span>
                                          : <span className={`${t.textFaint} flex-shrink-0 w-20 text-right text-[10px]`}>no price</span>
                                        }
                                      </div>
                                    ))}
                                  </div>
                                  {cost > 0 && (
                                    <div className="flex justify-end mt-2 pr-1">
                                      <span className={`text-xs ${t.textFaint}`}>Total: <span className={`${t.textPrimary} font-semibold ml-1`}>{formatCurrency(cost)}</span></span>
                                    </div>
                                  )}
                                  {issue.notes && <div className={`mt-2 text-[11px] italic ${t.textFaint}`}>Note: {issue.notes}</div>}
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
            </>
          )}

          {logTab === 'analytics' && (
            <div className="p-5 space-y-6">
              {issues.length === 0 ? (
                <div className={`text-center py-16 ${t.textFaint}`}>
                  <Activity className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <div className="text-sm">No data to analyse yet</div>
                </div>
              ) : (
                <>
                  <div>
                    <div className={`text-[11px] uppercase tracking-wider mb-2.5 ${t.textFaint}`}>Descriptive Statistics · All Time</div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                      <StatCard icon={DollarSign} accent="blue" label="Total Cost" value={formatCurrency(descStats.total)} />
                      <StatCard icon={Layers} accent="violet" label="Issues Tracked" value={`${descStats.costed} / ${descStats.count}`} />
                      <StatCard icon={TrendingUp} accent="emerald" label="Mean / Issue" value={formatCurrency(descStats.mean)} />
                      <StatCard icon={Target} accent="cyan" label="Median / Issue" value={formatCurrency(descStats.median)} />
                      <StatCard icon={Gauge} accent="amber" label="Std Deviation" value={formatCurrency(descStats.stdDev)} />
                      <StatCard icon={TrendingDown} accent="amber" label="Range" value={`${formatCurrencyShort(descStats.min)} – ${formatCurrencyShort(descStats.max)}`} />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className={`text-[11px] uppercase tracking-wider ${t.textFaint}`}>Cost Over Time</div>
                        <div className={`text-[10px] mt-0.5 ${t.textFaint}`}>
                          {period === 'day' ? 'Last 30 days' : period === 'week' ? 'Last 13 weeks' : 'Last 12 months'}
                          {periodPeak.cost > 0 && ` · Peak: ${periodPeak.label} (${formatCurrency(periodPeak.cost)})`}
                        </div>
                      </div>
                    </div>
                    <div className={`rounded-xl ${t.chipBg} border ${t.border} p-4`} style={{ height: 260 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={timeSeries} margin={{ top: 4, right: 12, bottom: 0, left: 8 }}>
                          <defs>
                            <linearGradient id="costGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#86BBD8" stopOpacity={0.30} />
                              <stop offset="95%" stopColor="#86BBD8" stopOpacity={0.02} />
                            </linearGradient>
                            <linearGradient id="countGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.20} />
                              <stop offset="95%" stopColor="#a78bfa" stopOpacity={0.01} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid {...gridProps} />
                          <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" />
                          <YAxis yAxisId="cost" {...axisProps} axisLine={false} tickFormatter={formatCurrencyShort} width={56} />
                          <YAxis yAxisId="count" orientation="right" {...axisProps} axisLine={false} width={28} />
                          <Tooltip
                            {...tooltipStyle}
                            formatter={(value: any, name: string) =>
                              name === 'cost' ? [formatCurrency(Number(value)), 'Cost'] : [value, 'Issues']
                            }
                          />
                          <Legend
                            wrapperStyle={{ fontSize: 11, color: t.light ? 'rgba(15,23,42,0.5)' : 'rgba(255,255,255,0.4)', paddingTop: 8 }}
                            formatter={(v) => v === 'cost' ? 'Total Cost' : 'Issue Count'}
                          />
                          <Area yAxisId="cost" type="monotone" dataKey="cost" stroke="#86BBD8" strokeWidth={2}
                            fill="url(#costGrad)" dot={false} activeDot={{ r: 4, fill: '#86BBD8' }} />
                          <Area yAxisId="count" type="monotone" dataKey="count" stroke="#a78bfa" strokeWidth={1.5}
                            strokeDasharray="4 3" fill="url(#countGrad)" dot={false} activeDot={{ r: 3, fill: '#a78bfa' }} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div>
                      <div className={`text-[11px] uppercase tracking-wider mb-3 flex items-center gap-2 ${t.textFaint}`}>
                        <Users className="h-3 w-3" /> Top Recipients by Cost
                      </div>
                      {topRecipients.length === 0 ? (
                        <div className={`text-center py-8 ${t.textFaint} text-xs`}>No cost data yet</div>
                      ) : (
                        <div className={`rounded-xl ${t.chipBg} border ${t.border} p-4`}
                          style={{ height: Math.max(180, topRecipients.length * 38 + 40) }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={topRecipients} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 8 }}>
                              <CartesianGrid {...gridProps} horizontal={false} />
                              <XAxis type="number" {...axisProps} axisLine={false} tickFormatter={formatCurrencyShort} />
                              <YAxis type="category" dataKey="name" {...axisProps} axisLine={false} width={110}
                                tick={{ fill: t.light ? 'rgba(15,23,42,0.6)' : 'rgba(255,255,255,0.55)', fontSize: 11 }} />
                              <Tooltip {...tooltipStyle} formatter={(v: any) => [formatCurrency(Number(v)), 'Total Cost']} />
                              <Bar dataKey="cost" radius={[0, 4, 4, 0]} maxBarSize={22}>
                                {topRecipients.map((_, i) => (
                                  <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} fillOpacity={0.85} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </div>

                    <div>
                      <div className={`text-[11px] uppercase tracking-wider mb-3 flex items-center gap-2 ${t.textFaint}`}>
                        <Package className="h-3 w-3" /> Top Items by Cost
                      </div>
                      {topItems.filter(i => i.cost > 0).length === 0 ? (
                        <div className={`text-center py-8 ${t.textFaint} text-xs`}>No costed items yet — add unit prices to spares</div>
                      ) : (
                        <div className={`rounded-xl ${t.chipBg} border ${t.border} p-4`}
                          style={{ height: Math.max(180, Math.min(topItems.filter(i => i.cost > 0).length, 8) * 38 + 40) }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={topItems.filter(i => i.cost > 0)} layout="vertical"
                              margin={{ top: 0, right: 16, bottom: 0, left: 8 }}>
                              <CartesianGrid {...gridProps} horizontal={false} />
                              <XAxis type="number" {...axisProps} axisLine={false} tickFormatter={formatCurrencyShort} />
                              <YAxis type="category" dataKey="name" {...axisProps} axisLine={false} width={130}
                                tick={{ fill: t.light ? 'rgba(15,23,42,0.6)' : 'rgba(255,255,255,0.55)', fontSize: 10 }} />
                              <Tooltip {...tooltipStyle} formatter={(v: any, name: string) =>
                                name === 'cost' ? [formatCurrency(Number(v)), 'Total Cost'] : [v, 'Qty Issued']
                              } />
                              <Bar dataKey="cost" radius={[0, 4, 4, 0]} maxBarSize={22}>
                                {topItems.filter(i => i.cost > 0).map((_, i) => (
                                  <Cell key={i} fill={BAR_COLORS[(i + 3) % BAR_COLORS.length]} fillOpacity={0.85} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className={`text-[11px] uppercase tracking-wider mb-3 ${t.textFaint}`}>
                      {period === 'day' ? 'Daily' : period === 'week' ? 'Weekly' : 'Monthly'} Breakdown
                    </div>
                    <div className={`rounded-xl ${t.chipBg} border ${t.border} overflow-hidden`}>
                      <table className="w-full">
                        <thead>
                          <tr className={`border-b ${t.border}`}>
                            {['Period', 'Issues', 'Items', 'Total Cost', 'Avg Cost / Issue'].map((h, i) => (
                              <th key={i} className={`py-2.5 px-4 text-[10px] font-semibold uppercase tracking-wider ${t.textFaint} ${i === 0 ? 'text-left' : 'text-right'}`}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {[...timeSeries].reverse().filter(pt => pt.count > 0 || pt.cost > 0).slice(0, 20).map((pt, i) => (
                            <tr key={pt.key} className={`border-b ${t.border} ${i % 2 === 0 ? '' : t.chipBg}`}>
                              <td className={`px-4 py-2 text-xs ${t.textMuted}`}>{pt.label}</td>
                              <td className={`px-4 py-2 text-xs ${t.textMuted} text-right`}>{pt.count || '—'}</td>
                              <td className={`px-4 py-2 text-xs ${t.textMuted} text-right`}>{pt.itemCount || '—'}</td>
                              <td className="px-4 py-2 text-xs text-right font-medium" style={{ color: pt.cost > 0 ? '#86BBD8' : undefined }}>
                                {pt.cost > 0 ? formatCurrency(pt.cost) : <span className={t.textFaint}>—</span>}
                              </td>
                              <td className={`px-4 py-2 text-xs ${t.textFaint} text-right`}>
                                {pt.count > 0 && pt.cost > 0 ? formatCurrency(pt.cost / pt.count) : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </>}
    </main>
  );
}

export default function IssuesPage() {
  return <AppShell><IssuesPageContent /></AppShell>;
}
