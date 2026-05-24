// app/issues/page.tsx — Stock Issues: record & analyse items issued to personnel
'use client';

import { PageShell } from '@/components/PageShell';
import { GLASS_INPUT as glassInput, GLASS_LABEL as glassLabel, formatCurrency, formatCurrencyShort, nowLocal, fmtDateTime as formatDateTime, usePageCollapse, MasterCollapseButton } from '@/components/shared';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  PackageMinus, Search, Plus, Trash2, RefreshCw, ChevronRight,
  ChevronDown, ChevronUp, Loader2, Check, X, Clock,
  ClipboardList, Package, BarChart3, TrendingUp, TrendingDown,
  Calendar, Activity, Users, DollarSign, Download, FileSpreadsheet, FileDown,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell,
} from 'recharts';

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const uid = () => Math.random().toString(36).slice(2);


// ─── INTERFACES ───────────────────────────────────────────────────────────────

interface Spare {
  id: number;
  stock_code: string;
  description: string;
  unit_of_measure?: string;
  unit_price: number;
  category?: string;
  current_quantity: number;
}

interface IssueItemRow {
  id: string;
  stockCode: string;
  description: string;
  qty: number;
  unit: string;
  unit_price: number;
}

interface IssueItem {
  stock_code?: string;
  description: string;
  qty: number;
  unit?: string;
  unit_price?: number;
}

interface StockIssue {
  id: number;
  issued_at: string;
  recipient_name: string;
  recipient_id?: string;
  issued_by?: string;
  items: IssueItem[];
  notes?: string;
}

interface Stats {
  total: number;
  today: number;
  this_week: number;
  unique_recipients: number;
}

// ─── ANALYTICS HELPERS ────────────────────────────────────────────────────────

const issueCost = (issue: StockIssue): number =>
  issue.items.reduce((sum, item) => sum + (item.unit_price || 0) * item.qty, 0);

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

type Period = 'day' | 'week' | 'month';

interface PeriodPoint {
  key: string;
  label: string;
  cost: number;
  count: number;
  costWithPrice: number;
  itemCount: number;
}

function buildTimeSeries(issues: StockIssue[], period: Period): PeriodPoint[] {
  // Build a map of key → aggregated data
  const map = new Map<string, PeriodPoint>();

  // Determine the range of keys to fill (last 30d / 13 weeks / 13 months)
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

  // Aggregate issues into the map
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

interface DescStats {
  total: number;
  count: number;
  mean: number;
  median: number;
  stdDev: number;
  min: number;
  max: number;
  costed: number; // issues with at least one priced item
}

function calcStats(costs: number[], allIssues: StockIssue[]): DescStats {
  const nonZero = costs.filter(c => c > 0);
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
        const cost = (item.unit_price || 0) * item.qty;
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

// ─── API ─────────────────────────────────────────────────────────────────────

async function apiGetIssues(): Promise<StockIssue[]> {
  const r = await fetch(`${API_URL}/api/issues?limit=2000`);
  if (!r.ok) throw new Error(`Fetch failed: ${r.status}`);
  return r.json();
}

async function apiCreateIssue(payload: object): Promise<StockIssue> {
  const r = await fetch(`${API_URL}/api/issues`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!r.ok) { const e = await r.json(); throw new Error(e.detail || 'Failed to record'); }
  return r.json();
}

async function apiDeleteIssue(id: number): Promise<void> {
  const r = await fetch(`${API_URL}/api/issues/${id}`, { method: 'DELETE' });
  if (!r.ok) throw new Error('Failed to delete');
}

async function apiGetStats(): Promise<Stats> {
  try {
    const r = await fetch(`${API_URL}/api/issues/stats/summary`);
    if (!r.ok) throw new Error();
    return r.json();
  } catch { return { total: 0, today: 0, this_week: 0, unique_recipients: 0 }; }
}

// ─── COMBO FIELD ─────────────────────────────────────────────────────────────

const ComboField = React.memo(({
  fetchUrl, mapOptions, value, onChange, className, placeholder,
}: {
  fetchUrl: string;
  mapOptions: (d: any[]) => { label: string; sub?: string }[];
  value: string; onChange: (v: string) => void;
  className?: string; placeholder?: string;
}) => {
  const [options, setOptions] = useState<{ label: string; sub?: string }[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  const load = useCallback(async () => {
    if (fetched) return;
    setLoading(true);
    try {
      const r = await fetch(`${API_URL}${fetchUrl}`);
      const data = await r.json();
      setOptions(mapOptions(Array.isArray(data) ? data : []));
    } catch {} finally { setLoading(false); setFetched(true); }
  }, [fetched, fetchUrl, mapOptions]);

  const filtered = useMemo(() => {
    const t = value.toLowerCase();
    if (!t) return options.slice(0, 10);
    return options.filter(o => o.label.toLowerCase().includes(t) || (o.sub || '').toLowerCase().includes(t)).slice(0, 10);
  }, [value, options]);

  return (
    <div className="relative">
      <input type="text" value={value} placeholder={placeholder} className={className}
        onChange={e => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => { load(); setOpen(true); }}
        onBlur={() => setTimeout(() => setOpen(false), 160)}
        onKeyDown={e => {
          if (e.key === 'Escape') setOpen(false);
          if (e.key === 'Tab' && filtered.length > 0) { e.preventDefault(); onChange(filtered[0].label); setOpen(false); }
        }}
      />
      {open && (loading || filtered.length > 0) && (
        <div className="absolute top-full left-0 right-0 z-50 mt-0.5 rounded-xl overflow-hidden shadow-2xl max-h-52 overflow-y-auto"
          style={{ background: 'rgba(4,12,24,0.98)', border: '1px solid rgba(255,255,255,0.15)' }}>
          {loading && <div className="px-3 py-2 text-xs text-white/35 flex items-center gap-2"><Loader2 className="h-3 w-3 animate-spin" />Loading…</div>}
          {filtered.map((o, i) => (
            <button key={`${o.label}-${i}`} type="button"
              onMouseDown={e => { e.preventDefault(); onChange(o.label); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-xs hover:bg-white/[0.08] transition-all border-b border-white/[0.05] last:border-0 flex items-center justify-between gap-2">
              <div><span className="text-white/80">{o.label}</span>{o.sub && <span className="text-[10px] text-white/30 ml-2">{o.sub}</span>}</div>
              {i === 0 && <span className="text-[10px] text-white/20">Tab ↵</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
});
ComboField.displayName = 'ComboField';

// ─── SPARE PICKER ─────────────────────────────────────────────────────────────

const SparePicker = React.memo(({
  spares, value, onSelect, className, placeholder,
}: {
  spares: Spare[]; value: string;
  onSelect: (s: Spare | null, text: string) => void;
  className?: string; placeholder?: string;
}) => {
  const [open, setOpen] = useState(false);
  const filtered = useMemo(() => {
    const t = value.toLowerCase();
    if (!t) return spares.slice(0, 12);
    return spares.filter(s =>
      s.stock_code.toLowerCase().includes(t) ||
      s.description.toLowerCase().includes(t) ||
      (s.category || '').toLowerCase().includes(t)
    ).slice(0, 12);
  }, [value, spares]);

  return (
    <div className="relative">
      <input type="text" value={value} placeholder={placeholder} className={className}
        onChange={e => { onSelect(null, e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 160)}
        onKeyDown={e => {
          if (e.key === 'Escape') setOpen(false);
          if (e.key === 'Tab' && filtered.length > 0) { e.preventDefault(); onSelect(filtered[0], filtered[0].stock_code); setOpen(false); }
        }}
      />
      {open && filtered.length > 0 && (
        <div className="absolute top-full left-0 z-50 mt-0.5 rounded-xl overflow-hidden shadow-2xl max-h-52 overflow-y-auto"
          style={{ background: 'rgba(4,12,24,0.98)', border: '1px solid rgba(255,255,255,0.15)', minWidth: '300px' }}>
          {filtered.map((s, i) => (
            <button key={s.id} type="button"
              onMouseDown={e => { e.preventDefault(); onSelect(s, s.stock_code); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-xs hover:bg-white/[0.08] transition-all border-b border-white/[0.05] last:border-0">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <span className="font-mono text-[#86BBD8] font-semibold">{s.stock_code}</span>
                  <span className="text-white/55 ml-2">{s.description.slice(0, 46)}</span>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 text-[10px]">
                  <span className="text-[#86BBD8]/60">{formatCurrency(s.unit_price)}</span>
                  <span className={s.current_quantity <= 0 ? 'text-rose-400' : 'text-white/30'}>qty: {s.current_quantity}</span>
                  {i === 0 && <span className="text-white/20">Tab</span>}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
});
SparePicker.displayName = 'SparePicker';

// ─── CHART TOOLTIP STYLE ─────────────────────────────────────────────────────

const tooltipStyle = {
  contentStyle: {
    background: 'rgba(4,12,24,0.97)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '12px',
    color: 'rgba(255,255,255,0.85)',
    fontSize: '12px',
  },
  itemStyle: { color: '#86BBD8' },
  labelStyle: { color: 'rgba(255,255,255,0.5)', marginBottom: 4 },
};

const axisProps = {
  tick: { fill: 'rgba(255,255,255,0.35)', fontSize: 10 },
  axisLine: { stroke: 'rgba(255,255,255,0.08)' },
  tickLine: false as const,
};

const gridProps = {
  stroke: 'rgba(255,255,255,0.06)',
  strokeDasharray: '3 3',
};

// ─── STAT CARD ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color = '#86BBD8', trend }:
  { label: string; value: string; sub?: string; color?: string; trend?: 'up' | 'down' | 'neutral' }) {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : null;
  return (
    <div className="rounded-xl p-3.5 border border-white/[0.08] bg-white/[0.04]">
      <div className="text-[10px] text-white/35 uppercase tracking-wider mb-1.5">{label}</div>
      <div className="text-xl font-bold leading-none" style={{ color }}>{value}</div>
      {sub && (
        <div className="flex items-center gap-1 mt-1.5">
          {TrendIcon && <TrendIcon className="h-3 w-3" style={{ color }} />}
          <span className="text-[10px] text-white/35">{sub}</span>
        </div>
      )}
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function IssuesPage() {
  const sections = usePageCollapse({ stats: false, records: false });
  // Data
  const [issues, setIssues] = useState<StockIssue[]>([]);
  const [serverStats, setServerStats] = useState<Stats>({ total: 0, today: 0, this_week: 0, unique_recipients: 0 });
  const [spares, setSpares] = useState<Spare[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // UI state
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [logTab, setLogTab] = useState<'log' | 'analytics'>('log');

  // Log filters
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Analytics
  const [period, setPeriod] = useState<Period>('week');

  // Form
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

  // Load data
  const loadData = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    setRefreshing(true);
    try {
      const [issueData, statsData, spareData] = await Promise.all([
        apiGetIssues(),
        apiGetStats(),
        fetch(`${API_URL}/api/spares?limit=5000`).then(r => r.ok ? r.json() : []).catch(() => []),
      ]);
      setIssues(Array.isArray(issueData) ? issueData : []);
      setServerStats(statsData);
      setSpares(Array.isArray(spareData) ? spareData : []);
    } catch (e: any) {
      toast.error(`Failed to load: ${e.message}`);
    } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Item row handlers
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

  // Submit
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
    if (!window.confirm('Delete this issue record? This cannot be undone.')) return;
    try { await apiDeleteIssue(id); toast.success('Deleted'); await loadData(true); }
    catch (e: any) { toast.error(e.message); }
  };

  const toggleRow = (id: number) =>
    setExpandedRows(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  // ── DERIVED DATA ────────────────────────────────────────────────────────────

  const filteredIssues = useMemo(() => {
    let list = issues;
    if (dateFrom) list = list.filter(i => i.issued_at >= dateFrom);
    if (dateTo) list = list.filter(i => i.issued_at.slice(0, 10) <= dateTo);
    if (search.trim()) {
      const t = search.toLowerCase();
      list = list.filter(i =>
        i.recipient_name.toLowerCase().includes(t) ||
        (i.recipient_id || '').toLowerCase().includes(t) ||
        (i.issued_by || '').toLowerCase().includes(t) ||
        (i.notes || '').toLowerCase().includes(t) ||
        i.items.some(item =>
          item.description.toLowerCase().includes(t) ||
          (item.stock_code || '').toLowerCase().includes(t)
        )
      );
    }
    return list;
  }, [issues, search, dateFrom, dateTo]);

  // Analytics computations (uses all issues, not filtered log)
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
      // Sheet 1 — one row per issue
      const ws = wb.addWorksheet('Stock Issues');
      ws.columns = [
        { header: 'Issue Date',    key: 'date',      width: 20 },
        { header: 'Recipient',     key: 'recipient', width: 26 },
        { header: 'Recipient ID',  key: 'rid',       width: 14 },
        { header: 'Issued By',     key: 'issuedby',  width: 22 },
        { header: 'Items (count)', key: 'items',     width: 14 },
        { header: 'Total Cost',    key: 'cost',      width: 14 },
        { header: 'Notes',         key: 'notes',     width: 34 },
      ];
      const hdr = ws.getRow(1);
      hdr.eachCell(cell => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2A4D69' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      });
      hdr.height = 18;
      issues.forEach((issue, i) => {
        const cost = issueCost(issue);
        const row = ws.addRow({
          date:      issue.issued_at ? new Date(issue.issued_at).toLocaleString('en-GB') : '',
          recipient: issue.recipient_name,
          rid:       issue.recipient_id || '',
          issuedby:  issue.issued_by || '',
          items:     issue.items.length,
          cost:      cost,
          notes:     issue.notes || '',
        });
        if (i % 2 === 1) row.eachCell(cell => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F4F8' } }; });
        const costCell = row.getCell('cost');
        costCell.numFmt = '"$"#,##0.00';
      });
      ws.autoFilter = { from: 'A1', to: 'G1' };
      ws.views = [{ state: 'frozen', ySplit: 1 }];
      // Sheet 2 — one row per line item
      const ws2 = wb.addWorksheet('Line Items');
      ws2.columns = [
        { header: 'Issue Date',   key: 'date',      width: 20 },
        { header: 'Recipient',    key: 'recipient', width: 26 },
        { header: 'Stock Code',   key: 'code',      width: 16 },
        { header: 'Description',  key: 'desc',      width: 36 },
        { header: 'Qty',          key: 'qty',       width: 8  },
        { header: 'Unit',         key: 'unit',      width: 8  },
        { header: 'Unit Price',   key: 'uprice',    width: 14 },
        { header: 'Line Total',   key: 'total',     width: 14 },
      ];
      const hdr2 = ws2.getRow(1);
      hdr2.eachCell(cell => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2A4D69' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      });
      hdr2.height = 18;
      let rowIdx = 0;
      issues.forEach(issue => {
        issue.items.forEach(item => {
          const lineTotal = (item.unit_price || 0) * item.qty;
          const row = ws2.addRow({
            date:      issue.issued_at ? new Date(issue.issued_at).toLocaleDateString('en-GB') : '',
            recipient: issue.recipient_name,
            code:      item.stock_code || '',
            desc:      item.description,
            qty:       item.qty,
            unit:      item.unit || '',
            uprice:    item.unit_price ?? '',
            total:     lineTotal,
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
      doc.setFontSize(14); doc.setTextColor(42, 77, 105);
      doc.text('Stock Issues Register', 14, 14);
      doc.setFontSize(8); doc.setTextColor(100, 100, 100);
      doc.text(
        `Generated ${new Date().toLocaleDateString('en-GB')}  ·  ${issues.length} issues  ·  Total cost: ${formatCurrency(totalCostTracked)}`,
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
        headStyles: { fillColor: [42, 77, 105], textColor: 255, fontStyle: 'bold', fontSize: 7.5 },
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

  // ── RENDER ──────────────────────────────────────────────────────────────────

  return (
    <PageShell>
      <main className="container mx-auto px-4 py-8 space-y-4">

        {/* ─ PANEL 1: HERO ─────────────────────────────────────────────── */}
        <div className="oz-glass-dark rounded-2xl overflow-hidden">
          <div className="px-6 py-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2.5 rounded-xl bg-[#2A4D69]/50 border border-[#86BBD8]/20 flex-shrink-0">
                <PackageMinus className="h-5 w-5 text-[#86BBD8]" />
              </div>
              <div className="min-w-0">
                <nav className="flex items-center gap-1.5 text-xs text-white/40 mb-0.5">
                  <span>Home</span><ChevronRight className="h-3 w-3" /><span className="text-white/70 font-medium">Stock Issues</span>
                </nav>
                <h1 className="text-xl font-bold text-white font-heading tracking-tight">Stock Issues</h1>
                <p className="text-xs text-white/35 mt-0.5">Record & track items issued to personnel</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button onClick={() => loadData(true)} disabled={refreshing} title="Refresh"
                className="h-8 w-8 flex items-center justify-center rounded-lg bg-white/[0.07] hover:bg-white/[0.15] border border-white/12 text-white/50 transition-all disabled:opacity-40">
                <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              </button>

              {/* Download dropdown */}
              <div className="relative">
                <button type="button" onClick={() => setShowDlMenu(p => !p)} disabled={issues.length === 0}
                  className="h-8 px-3 flex items-center gap-1.5 text-xs rounded-xl font-semibold text-white/80 hover:text-white transition-all hover:-translate-y-0.5 bg-white/[0.07] hover:bg-white/[0.13] border border-white/[0.15] disabled:opacity-40 disabled:translate-y-0">
                  <Download className="h-3.5 w-3.5" /> Download
                </button>
                {showDlMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowDlMenu(false)} />
                    <div className="absolute right-0 top-full mt-1 z-50 rounded-xl shadow-2xl overflow-hidden w-48"
                      style={{ background: 'rgba(4,12,24,0.97)', border: '1px solid rgba(255,255,255,0.14)' }}>
                      <button type="button" onClick={downloadIssuesExcel}
                        className="w-full flex items-center gap-2.5 px-4 py-3 text-xs text-white/85 hover:bg-white/[0.10] transition-all border-b border-white/[0.07]">
                        <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" /> Export Excel (.xlsx)
                      </button>
                      <button type="button" onClick={downloadIssuesPDF}
                        className="w-full flex items-center gap-2.5 px-4 py-3 text-xs text-white/85 hover:bg-white/[0.10] transition-all">
                        <FileDown className="h-3.5 w-3.5 text-rose-400" /> Export PDF
                      </button>
                    </div>
                  </>
                )}
              </div>

              <button title={sections.expanded.stats ? 'Hide stats' : 'Show stats'} onClick={() => sections.toggle('stats')}
                className="h-8 w-8 flex items-center justify-center rounded-lg bg-white/[0.07] hover:bg-white/[0.15] border border-white/12 text-white/50 transition-all">
                {sections.expanded.stats ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
              <MasterCollapseButton collapse={sections} />
            </div>
          </div>

          {sections.expanded.stats && (
            <div className="px-6 pb-4 pt-3 border-t border-white/[0.07] grid grid-cols-2 sm:grid-cols-5 gap-3">
              {[
                { label: 'Total Records', value: serverStats.total, color: '#86BBD8' },
                { label: 'Today', value: serverStats.today, color: '#34d399' },
                { label: 'This Week', value: serverStats.this_week, color: '#a78bfa' },
                { label: 'Recipients', value: serverStats.unique_recipients, color: '#f59e0b' },
                { label: 'Total Cost', value: formatCurrencyShort(totalCostTracked), color: '#60a5fa' },
              ].map(s => (
                <div key={s.label} className="rounded-xl p-3 border border-white/[0.08] bg-white/[0.05]">
                  <div className="text-xl font-bold" style={{ color: s.color }}>{s.value}</div>
                  <div className="text-[11px] text-white/45 mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {sections.expanded.records && <>
        {/* ─ PANEL 2: RECORD NEW ISSUE ─────────────────────────────────── */}
        <div className="oz-glass-panel rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-white/[0.07] flex items-center gap-2">
            <ClipboardList className="h-3.5 w-3.5 text-[#86BBD8]" />
            <span className="text-xs font-semibold text-white/80 uppercase tracking-wider">Record New Issue</span>
          </div>
          <div className="p-5 space-y-4">
            {/* Header fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className={glassLabel}>Issued To *</label>
                <ComboField fetchUrl="/api/employees" mapOptions={employeeMapOptions}
                  value={recipient} onChange={setRecipient}
                  className={glassInput} placeholder="Name or employee ID…" />
              </div>
              <div>
                <label className={glassLabel}>Date & Time</label>
                <input type="datetime-local" value={issuedAt} onChange={e => setIssuedAt(e.target.value)}
                  className={glassInput} style={{ colorScheme: 'dark' }} />
              </div>
              <div>
                <label className={glassLabel}>Issued By</label>
                <ComboField fetchUrl="/api/employees" mapOptions={employeeMapOptions}
                  value={issuedBy} onChange={setIssuedBy}
                  className={glassInput} placeholder="Your name or employee ID…" />
              </div>
              <div>
                <label className={glassLabel}>Notes</label>
                <input type="text" value={notes} onChange={e => setNotes(e.target.value)}
                  className={glassInput} placeholder="Reason, job no., project…" />
              </div>
            </div>

            {/* Items */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-white/45 uppercase tracking-wider">Items to Issue</span>
                <button onClick={addItem}
                  className="inline-flex items-center gap-1 h-6 px-2.5 text-[11px] rounded-lg border font-medium text-white transition-all hover:-translate-y-0.5"
                  style={{ background: 'rgba(42,77,105,0.5)', borderColor: 'rgba(134,187,216,0.3)' }}>
                  <Plus className="h-2.5 w-2.5" /> Add Item
                </button>
              </div>

              {/* Column labels */}
              <div className="grid gap-2 px-1 mb-1 text-[10px] text-white/25 uppercase tracking-wider"
                style={{ gridTemplateColumns: '160px 1fr 88px 72px 88px 28px' }}>
                <div>Stock Code</div><div>Description</div>
                <div className="text-right">Qty</div><div className="text-center">Unit</div>
                <div className="text-right">Unit Cost</div><div />
              </div>

              <div className="space-y-1.5">
                {items.map(item => (
                  <div key={item.id}
                    className="grid gap-2 items-center rounded-xl p-2 bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.10] transition-all"
                    style={{ gridTemplateColumns: '160px 1fr 88px 72px 88px 28px' }}>
                    <SparePicker spares={spares} value={item.stockCode}
                      onSelect={(s, text) => handleSpareSelect(item.id, s, text)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-white/[0.05] border border-white/10 text-white font-mono placeholder:text-white/25 focus:outline-none focus:border-white/30 transition-all"
                      placeholder="Code or search…" />
                    <input type="text" value={item.description}
                      onChange={e => updateItem(item.id, { description: e.target.value })}
                      placeholder="Description…"
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-white/[0.05] border border-white/10 text-white placeholder:text-white/25 focus:outline-none focus:border-white/30 transition-all" />
                    <input type="number" min="0.01" step="any" value={item.qty}
                      onChange={e => updateItem(item.id, { qty: Math.max(0.01, parseFloat(e.target.value) || 1) })}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-white/[0.05] border border-white/10 text-white text-right focus:outline-none focus:border-white/30 transition-all" />
                    <input type="text" value={item.unit}
                      onChange={e => updateItem(item.id, { unit: e.target.value })}
                      placeholder="UN"
                      className="w-full px-2 py-1.5 text-xs rounded-lg bg-white/[0.05] border border-white/10 text-white text-center focus:outline-none focus:border-white/30 transition-all" />
                    {/* Unit price — auto-filled from spare, editable */}
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-white/30">$</span>
                      <input type="number" min="0" step="0.01" value={item.unit_price}
                        onChange={e => updateItem(item.id, { unit_price: parseFloat(e.target.value) || 0 })}
                        className="w-full pl-5 pr-2 py-1.5 text-xs rounded-lg bg-white/[0.05] border border-white/10 text-white text-right focus:outline-none focus:border-white/30 transition-all" />
                    </div>
                    <button title="Remove item" onClick={() => removeItem(item.id)} disabled={items.length === 1}
                      className="h-6 w-6 flex items-center justify-center rounded hover:bg-rose-500/20 text-white/20 hover:text-rose-400 disabled:opacity-20 disabled:cursor-not-allowed transition-all">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Running total */}
              {items.some(i => i.unit_price > 0) && (
                <div className="flex justify-end mt-2 pr-8">
                  <div className="text-xs text-white/40">
                    Issue total: <span className="text-white font-semibold ml-1">
                      {formatCurrency(items.reduce((s, i) => s + i.unit_price * i.qty, 0))}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className="text-[11px] text-white/30">
                {items.filter(i => i.description.trim() || i.stockCode.trim()).length} item{items.filter(i => i.description.trim() || i.stockCode.trim()).length !== 1 ? 's' : ''} to{' '}
                <span className="text-white/55">{recipient || '—'}</span>
              </div>
              <button onClick={handleSubmit} disabled={submitting}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-50 disabled:translate-y-0"
                style={{ background: 'linear-gradient(135deg, #2A4D69, #1e3a52)', border: '1px solid rgba(134,187,216,0.3)' }}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Record Issue
              </button>
            </div>
          </div>
        </div>

        {/* ─ PANEL 3: LOG / ANALYTICS ──────────────────────────────────── */}
        <div className="oz-glass-panel rounded-2xl overflow-hidden">
          {/* Tab header */}
          <div className="px-5 py-3 border-b border-white/[0.07] flex items-center justify-between gap-3">
            <div className="flex items-center gap-1">
              {([
                { id: 'log', label: 'Issue Log', icon: Package },
                { id: 'analytics', label: 'Analytics', icon: BarChart3 },
              ] as const).map(tab => (
                <button key={tab.id} onClick={() => setLogTab(tab.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${logTab === tab.id ? 'bg-[#86BBD8]/20 border border-[#86BBD8]/35 text-[#86BBD8]' : 'text-white/45 hover:text-white/70 hover:bg-white/[0.06] border border-transparent'}`}>
                  <tab.icon className="h-3 w-3" />
                  {tab.label}
                </button>
              ))}
            </div>
            {logTab === 'log' && (
              <span className="text-[11px] text-white/30">{filteredIssues.length} record{filteredIssues.length !== 1 ? 's' : ''}</span>
            )}
            {logTab === 'analytics' && (
              <div className="flex items-center gap-1">
                {(['day', 'week', 'month'] as const).map(p => (
                  <button key={p} onClick={() => setPeriod(p)}
                    className={`h-6 px-2.5 text-[11px] rounded-lg border capitalize transition-all ${period === p ? 'bg-[#86BBD8]/20 border-[#86BBD8]/35 text-[#86BBD8]' : 'bg-white/[0.05] border-white/10 text-white/40 hover:text-white/60'}`}>
                    {p === 'day' ? 'Daily' : p === 'week' ? 'Weekly' : 'Monthly'}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── LOG TAB ──────────────────────────────────────────────────── */}
          {logTab === 'log' && (
            <>
              <div className="px-5 py-3 border-b border-white/[0.05] grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30" />
                  <input type="text" placeholder="Search recipient, item, notes…"
                    value={search} onChange={e => setSearch(e.target.value)}
                    className="pl-8 pr-3 py-1.5 w-full text-xs rounded-lg bg-white/[0.07] border border-white/12 text-white placeholder:text-white/30 focus:outline-none focus:border-white/30 transition-all" />
                </div>
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                  className="px-3 py-1.5 text-xs rounded-lg bg-white/[0.07] border border-white/12 text-white focus:outline-none focus:border-white/30 transition-all" style={{ colorScheme: 'dark' }} />
                <div className="flex gap-2">
                  <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                    className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-white/[0.07] border border-white/12 text-white focus:outline-none focus:border-white/30 transition-all" style={{ colorScheme: 'dark' }} />
                  {(search || dateFrom || dateTo) && (
                    <button onClick={() => { setSearch(''); setDateFrom(''); setDateTo(''); }}
                      className="h-7 px-2.5 rounded-lg bg-white/[0.07] hover:bg-white/[0.15] border border-white/12 text-white/40 text-xs transition-all flex items-center gap-1">
                      <X className="h-3 w-3" /> Clear
                    </button>
                  )}
                </div>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-20 text-white/30 gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" /> Loading…
                </div>
              ) : filteredIssues.length === 0 ? (
                <div className="text-center py-20 text-white/25">
                  <PackageMinus className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <div className="text-sm font-medium">No issue records</div>
                  <div className="text-xs mt-1 text-white/20">
                    {search || dateFrom || dateTo ? 'No records match your filters' : 'Use the form above to record the first issue'}
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/[0.06]">
                        {['Date & Time', 'Issued To', 'Items', 'Cost', 'Issued By', 'Notes', ''].map((h, i) => (
                          <th key={i} className={`py-2.5 text-[10px] font-semibold text-white/35 uppercase tracking-wider ${i === 0 ? 'pl-5 pr-3 text-left' : i === 3 ? 'px-3 text-right' : i === 6 ? 'px-3 w-16' : 'px-3 text-left'}`}>
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
                            <tr className={`border-b border-white/[0.04] cursor-pointer transition-colors ${expanded ? 'bg-white/[0.06]' : 'hover:bg-white/[0.03]'}`}
                              onClick={() => toggleRow(issue.id)}>
                              <td className="pl-5 pr-3 py-3 text-xs text-white/60 whitespace-nowrap">{formatDateTime(issue.issued_at)}</td>
                              <td className="px-3 py-3">
                                <div className="text-xs font-semibold text-white">{issue.recipient_name}</div>
                                {issue.recipient_id && <div className="text-[10px] text-white/35 mt-0.5 font-mono">{issue.recipient_id}</div>}
                              </td>
                              <td className="px-3 py-3">
                                <div className="text-xs text-white/65">
                                  <span className="font-semibold text-white">{issue.items.length}</span> item{issue.items.length !== 1 ? 's' : ''}
                                </div>
                                {issue.items[0] && (
                                  <div className="text-[10px] text-white/30 mt-0.5 truncate max-w-[180px]">
                                    {issue.items[0].stock_code && <span className="font-mono text-[#86BBD8]/60 mr-1">{issue.items[0].stock_code}</span>}
                                    {issue.items[0].description.slice(0, 35)}{issue.items.length > 1 && ' …'}
                                  </div>
                                )}
                              </td>
                              <td className="px-3 py-3 text-right">
                                {hasCost
                                  ? <span className="text-xs font-semibold text-white">{formatCurrency(cost)}</span>
                                  : <span className="text-[10px] text-white/20">—</span>
                                }
                              </td>
                              <td className="px-3 py-3 text-xs text-white/45">{issue.issued_by || '—'}</td>
                              <td className="px-3 py-3 text-xs text-white/30 max-w-[160px]"><div className="truncate">{issue.notes || '—'}</div></td>
                              <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                                <div className="flex items-center justify-end gap-1">
                                  <button title={expanded ? 'Collapse' : 'Expand'}
                                    onClick={e => { e.stopPropagation(); toggleRow(issue.id); }}
                                    className="h-6 w-6 flex items-center justify-center rounded text-white/25 hover:text-white/70 transition-all">
                                    {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                                  </button>
                                  <button title="Delete record"
                                    onClick={e => { e.stopPropagation(); handleDelete(issue.id); }}
                                    className="h-6 w-6 flex items-center justify-center rounded hover:bg-rose-500/20 text-white/20 hover:text-rose-400 transition-all">
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                            {expanded && (
                              <tr className="border-b border-white/[0.04]">
                                <td colSpan={7} className="pl-5 pr-5 py-3">
                                  <div className="text-[10px] text-white/30 uppercase tracking-wider mb-2">Items Issued</div>
                                  <div className="space-y-1">
                                    {issue.items.map((item, i) => (
                                      <div key={i} className="flex items-center gap-4 text-xs px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                                        {item.stock_code && <span className="font-mono text-[#86BBD8] font-semibold flex-shrink-0 w-24 truncate">{item.stock_code}</span>}
                                        <span className="text-white/70 flex-1">{item.description}</span>
                                        <span className="text-white font-semibold flex-shrink-0">{item.qty}</span>
                                        <span className="text-white/40 flex-shrink-0 w-8 text-right">{item.unit || 'UN'}</span>
                                        {(item.unit_price || 0) > 0
                                          ? <span className="text-[#86BBD8] flex-shrink-0 w-20 text-right font-medium">{formatCurrency((item.unit_price || 0) * item.qty)}</span>
                                          : <span className="text-white/20 flex-shrink-0 w-20 text-right text-[10px]">no price</span>
                                        }
                                      </div>
                                    ))}
                                  </div>
                                  {cost > 0 && (
                                    <div className="flex justify-end mt-2 pr-1">
                                      <span className="text-xs text-white/40">Total: <span className="text-white font-semibold ml-1">{formatCurrency(cost)}</span></span>
                                    </div>
                                  )}
                                  {issue.notes && <div className="mt-2 text-[11px] text-white/35 italic">Note: {issue.notes}</div>}
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

          {/* ── ANALYTICS TAB ────────────────────────────────────────────── */}
          {logTab === 'analytics' && (
            <div className="p-5 space-y-6">
              {issues.length === 0 ? (
                <div className="text-center py-16 text-white/25">
                  <Activity className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <div className="text-sm">No data to analyse yet</div>
                </div>
              ) : (
                <>
                  {/* ── DESCRIPTIVE STATS ROW ──────────────────────────── */}
                  <div>
                    <div className="text-[11px] text-white/35 uppercase tracking-wider mb-2.5">Descriptive Statistics · All Time</div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                      <StatCard label="Total Cost" value={formatCurrency(descStats.total)} color="#86BBD8" />
                      <StatCard label="Issues Tracked" value={`${descStats.costed} / ${descStats.count}`} sub="with cost data" color="#a78bfa" />
                      <StatCard label="Mean / Issue" value={formatCurrency(descStats.mean)} color="#34d399" />
                      <StatCard label="Median / Issue" value={formatCurrency(descStats.median)} color="#60a5fa" />
                      <StatCard label="Std Deviation" value={formatCurrency(descStats.stdDev)} sub="spread of issue costs" color="#f59e0b" />
                      <StatCard label="Range" value={`${formatCurrencyShort(descStats.min)} – ${formatCurrencyShort(descStats.max)}`} sub="min to max" color="#fb923c" />
                    </div>
                  </div>

                  {/* ── COST OVER TIME CHART ───────────────────────────── */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="text-[11px] text-white/35 uppercase tracking-wider">Cost Over Time</div>
                        <div className="text-[10px] text-white/20 mt-0.5">
                          {period === 'day' ? 'Last 30 days' : period === 'week' ? 'Last 13 weeks' : 'Last 12 months'}
                          {periodPeak.cost > 0 && ` · Peak: ${periodPeak.label} (${formatCurrency(periodPeak.cost)})`}
                        </div>
                      </div>
                    </div>
                    <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4" style={{ height: 260 }}>
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
                            wrapperStyle={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', paddingTop: 8 }}
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

                  {/* ── BOTTOM CHARTS ROW ──────────────────────────────── */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                    {/* Top recipients */}
                    <div>
                      <div className="text-[11px] text-white/35 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <Users className="h-3 w-3" /> Top Recipients by Cost
                      </div>
                      {topRecipients.length === 0 ? (
                        <div className="text-center py-8 text-white/20 text-xs">No cost data yet</div>
                      ) : (
                        <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4"
                          style={{ height: Math.max(180, topRecipients.length * 38 + 40) }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={topRecipients} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 8 }}>
                              <CartesianGrid {...gridProps} horizontal={false} />
                              <XAxis type="number" {...axisProps} axisLine={false} tickFormatter={formatCurrencyShort} />
                              <YAxis type="category" dataKey="name" {...axisProps} axisLine={false} width={110}
                                tick={{ fill: 'rgba(255,255,255,0.55)', fontSize: 11 }} />
                              <Tooltip {...tooltipStyle} formatter={(v: any) => [formatCurrency(Number(v)), 'Total Cost']} />
                              <Bar dataKey="cost" radius={[0, 4, 4, 0]} maxBarSize={22}>
                                {topRecipients.map((_, i) => (
                                  <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} fillOpacity={0.75} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </div>

                    {/* Top items */}
                    <div>
                      <div className="text-[11px] text-white/35 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <Package className="h-3 w-3" /> Top Items by Cost
                      </div>
                      {topItems.filter(i => i.cost > 0).length === 0 ? (
                        <div className="text-center py-8 text-white/20 text-xs">No costed items yet — add unit prices to spares</div>
                      ) : (
                        <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4"
                          style={{ height: Math.max(180, Math.min(topItems.filter(i => i.cost > 0).length, 8) * 38 + 40) }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={topItems.filter(i => i.cost > 0)} layout="vertical"
                              margin={{ top: 0, right: 16, bottom: 0, left: 8 }}>
                              <CartesianGrid {...gridProps} horizontal={false} />
                              <XAxis type="number" {...axisProps} axisLine={false} tickFormatter={formatCurrencyShort} />
                              <YAxis type="category" dataKey="name" {...axisProps} axisLine={false} width={130}
                                tick={{ fill: 'rgba(255,255,255,0.55)', fontSize: 10 }} />
                              <Tooltip {...tooltipStyle} formatter={(v: any, name: string) =>
                                name === 'cost' ? [formatCurrency(Number(v)), 'Total Cost'] : [v, 'Qty Issued']
                              } />
                              <Bar dataKey="cost" radius={[0, 4, 4, 0]} maxBarSize={22}>
                                {topItems.filter(i => i.cost > 0).map((_, i) => (
                                  <Cell key={i} fill={BAR_COLORS[(i + 3) % BAR_COLORS.length]} fillOpacity={0.75} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ── PERIOD BREAKDOWN TABLE ────────────────────────── */}
                  <div>
                    <div className="text-[11px] text-white/35 uppercase tracking-wider mb-3">
                      {period === 'day' ? 'Daily' : period === 'week' ? 'Weekly' : 'Monthly'} Breakdown
                    </div>
                    <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] overflow-hidden">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-white/[0.06]">
                            {['Period', 'Issues', 'Items', 'Total Cost', 'Avg Cost / Issue'].map((h, i) => (
                              <th key={i} className={`py-2.5 px-4 text-[10px] font-semibold text-white/35 uppercase tracking-wider ${i === 0 ? 'text-left' : 'text-right'}`}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {[...timeSeries].reverse().filter(pt => pt.count > 0 || pt.cost > 0).slice(0, 20).map((pt, i) => (
                            <tr key={pt.key} className={`border-b border-white/[0.04] ${i % 2 === 0 ? '' : 'bg-white/[0.02]'}`}>
                              <td className="px-4 py-2 text-xs text-white/70">{pt.label}</td>
                              <td className="px-4 py-2 text-xs text-white/60 text-right">{pt.count || '—'}</td>
                              <td className="px-4 py-2 text-xs text-white/60 text-right">{pt.itemCount || '—'}</td>
                              <td className="px-4 py-2 text-xs text-right font-medium" style={{ color: pt.cost > 0 ? '#86BBD8' : 'rgba(255,255,255,0.2)' }}>
                                {pt.cost > 0 ? formatCurrency(pt.cost) : '—'}
                              </td>
                              <td className="px-4 py-2 text-xs text-white/45 text-right">
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
    </PageShell>
  );
}
