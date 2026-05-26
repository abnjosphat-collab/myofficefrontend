// app/availabilities/page.tsx — Equipment Availability Tracker
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  Activity, AlertTriangle, BarChart3, Calendar, Check, Clock,
  FileText, Gauge, LineChart, Pencil, Percent, Plus, Search, Trash2,
} from 'lucide-react';
import { PageShell } from '@/components/PageShell';
import {
  HeroPanel, GlassPanel, GlassStatCard, GlassBadge, GlassButton,
  GlassInput, GlassSelect, GlassTextarea, GlassTable, GlassTabs, GlassProgress,
  GlassModal, LoadingPane, MasterCollapseButton, DownloadButton, DeleteDialog,
  usePageCollapse, EmptyState,
  type StatItem, type GlassColumn, type GlassTab, type DLColumn,
} from '@/components/shared';

const API = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000').replace(/\/$/, '');

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface Equipment {
  id: number | string;
  equipment_id: string;
  name: string;
  category?: string;
  department?: string;
  location?: string;
  status?: string;
}

interface AvailRecord {
  id: number | string;
  equipment_id: number | string;
  equipment_name?: string;
  date: string;
  operational_hours: number;
  breakdown_hours: number;
  availability_percentage: number;
  notes?: string;
  created_at?: string;
  source?: 'breakdown' | 'manual';
}

interface EqSummaryRow {
  id: string;
  name: string;
  category: string;
  department: string;
  pct: number;
  opH: number;
  bdH: number;
  lastDate: string;
}

interface PeriodRow {
  periodKey: string;
  label: string;
  avgAvailability: number;
  totalOpHours: number;
  totalBdHours: number;
  recordCount: number;
}

interface FormData {
  equipment_id: string;
  date: string;
  operational_hours: string;
  breakdown_hours: string;
  notes: string;
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function calcPct(op: number, bd: number): number {
  if (op <= 0) return 100;
  return Math.max(0, Math.min(100, ((op - bd) / op) * 100));
}

function avColor(pct: number) {
  if (pct >= 95) return 'text-emerald-400';
  if (pct >= 90) return 'text-amber-400';
  return 'text-red-400';
}

function avVariant(pct: number): 'success' | 'warning' | 'danger' {
  if (pct >= 95) return 'success';
  if (pct >= 90) return 'warning';
  return 'danger';
}

function getWeekLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const jan1 = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
  return `W${String(week).padStart(2, '0')} ${d.getFullYear()}`;
}

function getMonthLabel(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
}

const EMPTY_FORM: FormData = {
  equipment_id: '',
  date: new Date().toISOString().slice(0, 10),
  operational_hours: '24',
  breakdown_hours: '0',
  notes: '',
};

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function AvailabilitiesPage() {
  const sections = usePageCollapse({ hero: false, filters: false });

  const [equipment, setEquipment]   = useState<Equipment[]>([]);
  const [records, setRecords]       = useState<AvailRecord[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]           = useState('');

  // Filters
  const [search, setSearch]         = useState('');
  const [eqFilter, setEqFilter]     = useState('all');
  const [deptFilter, setDeptFilter] = useState('all');
  const [catFilter, setCatFilter]   = useState('all');
  const [period, setPeriod]         = useState<'day' | 'week' | 'month'>('week');
  const [dateFrom, setDateFrom]     = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().slice(0, 10);
  });
  const [dateTo, setDateTo]         = useState(new Date().toISOString().slice(0, 10));

  // Modal
  const [modalOpen, setModalOpen]   = useState(false);
  const [editRec, setEditRec]       = useState<AvailRecord | null>(null);
  const [form, setForm]             = useState<FormData>(EMPTY_FORM);
  const [saving, setSaving]         = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AvailRecord | null>(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchAll = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    setRefreshing(true);
    try {
      const [eqRes, bdRes, manualRes] = await Promise.all([
        fetch(`${API}/api/equipment`).catch(() => null),
        fetch(`${API}/api/availability-records/from-breakdowns`).catch(() => null),
        fetch(`${API}/api/availability-records`).catch(() => null),
      ]);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (eqRes?.ok) setEquipment(await eqRes.json());

      const bdRecords: AvailRecord[]     = bdRes?.ok     ? await bdRes.json()     : [];
      const manualRecords: AvailRecord[] = manualRes?.ok ? await manualRes.json() : [];

      // Manual records override auto-computed ones for the same equipment+date
      const manualKeys = new Set(manualRecords.map(r => `${r.equipment_id}_${r.date}`));
      const merged = [
        ...manualRecords,
        ...bdRecords.filter(r => !manualKeys.has(`${r.equipment_id}_${r.date}`)),
      ];
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRecords(merged);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Derived maps ───────────────────────────────────────────────────────────

  const eqMap = useMemo(() => {
    const m = new Map<string, Equipment>();
    equipment.forEach(e => m.set(String(e.id), e));
    return m;
  }, [equipment]);

  const depts = useMemo(() => [...new Set(equipment.map(e => e.department).filter(Boolean) as string[])], [equipment]);
  const cats  = useMemo(() => [...new Set(equipment.map(e => e.category).filter(Boolean) as string[])], [equipment]);

  // ── Filtered records ───────────────────────────────────────────────────────

  const filtered = useMemo(() => records.filter(r => {
    if (dateFrom && r.date < dateFrom) return false;
    if (dateTo   && r.date > dateTo)   return false;
    if (eqFilter !== 'all' && String(r.equipment_id) !== eqFilter) return false;
    const eq = eqMap.get(String(r.equipment_id));
    if (deptFilter !== 'all' && eq?.department !== deptFilter) return false;
    if (catFilter  !== 'all' && eq?.category   !== catFilter)  return false;
    if (search) {
      const q = search.toLowerCase();
      const name = r.equipment_name ?? eq?.name ?? '';
      if (!name.toLowerCase().includes(q)) return false;
    }
    return true;
  }), [records, dateFrom, dateTo, eqFilter, deptFilter, catFilter, search, eqMap]);

  // ── Per-equipment summary (latest record per machine) ─────────────────────

  const eqSummary = useMemo((): EqSummaryRow[] => {
    const map = new Map<string, EqSummaryRow>();
    filtered.forEach(r => {
      const key = String(r.equipment_id);
      const eq  = eqMap.get(key);
      const cur = map.get(key);
      if (!cur || r.date > cur.lastDate) {
        map.set(key, {
          id:         key,
          name:       r.equipment_name ?? eq?.name ?? `Equipment #${key}`,
          category:   eq?.category   ?? '—',
          department: eq?.department ?? '—',
          pct:        r.availability_percentage,
          opH:        r.operational_hours,
          bdH:        r.breakdown_hours,
          lastDate:   r.date,
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.pct - b.pct);
  }, [filtered, eqMap]);

  // ── Period aggregation ─────────────────────────────────────────────────────

  const periodRows = useMemo((): PeriodRow[] => {
    const grouped = new Map<string, { sum: number; count: number; opH: number; bdH: number }>();
    filtered.forEach(r => {
      const key = period === 'day'   ? r.date
                : period === 'week'  ? getWeekLabel(r.date)
                : getMonthLabel(r.date);
      const ex = grouped.get(key) ?? { sum: 0, count: 0, opH: 0, bdH: 0 };
      grouped.set(key, { sum: ex.sum + r.availability_percentage, count: ex.count + 1, opH: ex.opH + r.operational_hours, bdH: ex.bdH + r.breakdown_hours });
    });
    return Array.from(grouped.entries())
      .map(([k, v]) => ({ periodKey: k, label: k, avgAvailability: v.sum / v.count, totalOpHours: v.opH, totalBdHours: v.bdH, recordCount: v.count }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [filtered, period]);

  // ── Fleet stats ────────────────────────────────────────────────────────────

  const fleet = useMemo(() => ({
    avgAv:   eqSummary.length > 0 ? eqSummary.reduce((s, e) => s + e.pct, 0) / eqSummary.length : 0,
    totalBd: filtered.reduce((s, r) => s + r.breakdown_hours, 0),
    below90: eqSummary.filter(e => e.pct < 90).length,
    count:   filtered.length,
  }), [eqSummary, filtered]);

  const heroStats: StatItem[] = [
    { label: 'Equipment',        value: equipment.length },
    { label: 'Avg Availability', value: `${fleet.avgAv.toFixed(1)}%`,      textClass: avColor(fleet.avgAv) },
    { label: 'Below 90%',        value: fleet.below90,                       textClass: fleet.below90 > 0 ? 'text-red-400' : 'text-emerald-400' },
    { label: 'Total Downtime',   value: `${fleet.totalBd.toFixed(0)}h`,    textClass: 'text-amber-400' },
    { label: 'Records (period)', value: fleet.count },
  ];

  // ── CRUD handlers ──────────────────────────────────────────────────────────

  async function prefillFromBreakdowns(eqId: string, date: string) {
    if (!eqId || !date) return;
    try {
      const res = await fetch(
        `${API}/api/availability-records/from-breakdowns?equipment_id=${eqId}&date_from=${date}&date_to=${date}`
      );
      if (res.ok) {
        const data: AvailRecord[] = await res.json();
        if (data.length > 0) {
          setForm(f => ({ ...f, breakdown_hours: String(data[0].breakdown_hours) }));
        }
      }
    } catch { /* silent — manual entry still works */ }
  }

  function openNew() { setEditRec(null); setForm(EMPTY_FORM); setModalOpen(true); }

  function openEdit(r: AvailRecord) {
    setEditRec(r);
    setForm({ equipment_id: String(r.equipment_id), date: r.date, operational_hours: String(r.operational_hours), breakdown_hours: String(r.breakdown_hours), notes: r.notes ?? '' });
    setModalOpen(true);
  }

  async function saveRecord() {
    setSaving(true);
    try {
      const op = parseFloat(form.operational_hours) || 0;
      const bd = Math.min(parseFloat(form.breakdown_hours) || 0, op);
      const payload = { equipment_id: parseInt(form.equipment_id), date: form.date, operational_hours: op, breakdown_hours: bd, availability_percentage: calcPct(op, bd), notes: form.notes };
      const url    = editRec ? `${API}/api/availability-records/${editRec.id}` : `${API}/api/availability-records`;
      const method = editRec ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.detail ?? `HTTP ${res.status}`); }
      setModalOpen(false);
      fetchAll(true);
    } catch (e) {
      setError(`Save failed: ${(e as Error).message}`);
    } finally {
      setSaving(false);
    }
  }

  async function doDelete() {
    if (!deleteTarget) return;
    const res = await fetch(`${API}/api/availability-records/${deleteTarget.id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    setDeleteTarget(null);
    fetchAll(true);
  }

  // ── Table columns ──────────────────────────────────────────────────────────

  const overviewCols: GlassColumn<EqSummaryRow>[] = [
    { key: 'name',       header: 'Equipment',   render: r => <span className="font-medium text-white">{r.name}</span> },
    { key: 'category',   header: 'Category',    render: r => <span className="text-white/70">{r.category}</span> },
    { key: 'department', header: 'Department',  render: r => <span className="text-white/70">{r.department}</span> },
    {
      key: 'pct', header: 'Availability', align: 'right',
      render: r => (
        <div className="flex items-center gap-2 justify-end">
          <span className={`font-bold text-sm ${avColor(r.pct)}`}>{r.pct.toFixed(1)}%</span>
          <GlassProgress value={r.pct} className="w-20" />
        </div>
      ),
    },
    { key: 'opH',      header: 'Op. Hours', align: 'right', render: r => `${r.opH.toFixed(1)}h` },
    { key: 'bdH',      header: 'Downtime',  align: 'right', render: r => <span className="text-red-400">{r.bdH.toFixed(1)}h</span> },
    { key: 'lastDate', header: 'Last Entry', render: r => <span className="text-white/50 text-xs">{r.lastDate}</span> },
  ];

  const periodCols: GlassColumn<PeriodRow>[] = [
    {
      key: 'label',
      header: period === 'day' ? 'Date' : period === 'week' ? 'Week' : 'Month',
      render: r => <span className="font-medium text-white">{r.label}</span>,
    },
    {
      key: 'avgAvailability', header: 'Avg Availability', align: 'right',
      render: r => (
        <div className="flex items-center gap-2 justify-end">
          <span className={`font-bold text-sm ${avColor(r.avgAvailability)}`}>{r.avgAvailability.toFixed(1)}%</span>
          <GlassProgress value={r.avgAvailability} className="w-20" />
        </div>
      ),
    },
    { key: 'totalOpHours', header: 'Op. Hours', align: 'right', render: r => `${r.totalOpHours.toFixed(1)}h` },
    { key: 'totalBdHours', header: 'Downtime',  align: 'right', render: r => <span className="text-red-400">{r.totalBdHours.toFixed(1)}h</span> },
    { key: 'recordCount',  header: 'Records',   align: 'center', render: r => <GlassBadge variant="neutral">{r.recordCount}</GlassBadge> },
  ];

  const recordCols: GlassColumn<AvailRecord>[] = [
    { key: 'date', header: 'Date', render: r => <span className="text-white/80 text-xs font-mono">{r.date}</span> },
    {
      key: 'equipment_name', header: 'Equipment',
      render: r => {
        const name = r.equipment_name ?? eqMap.get(String(r.equipment_id))?.name ?? `#${r.equipment_id}`;
        return <span className="font-medium text-white">{name}</span>;
      },
    },
    {
      key: 'availability_percentage', header: 'Availability', align: 'right',
      render: r => (
        <div className="flex items-center gap-2 justify-end">
          <span className={`font-bold text-xs ${avColor(r.availability_percentage)}`}>{r.availability_percentage.toFixed(1)}%</span>
          <GlassProgress value={r.availability_percentage} className="w-16" />
        </div>
      ),
    },
    { key: 'operational_hours', header: 'Op. Hrs',   align: 'right', render: r => `${r.operational_hours}h` },
    { key: 'breakdown_hours',   header: 'Down. Hrs', align: 'right', render: r => <span className="text-red-400">{r.breakdown_hours}h</span> },
    {
      key: 'notes', header: 'Source / Notes',
      render: r => r.source === 'breakdown'
        ? <GlassBadge variant="neutral" size="sm">Auto</GlassBadge>
        : <span className="text-white/50 text-xs">{r.notes || '—'}</span>,
    },
    {
      key: 'actions', header: '',
      render: r => r.source === 'breakdown' ? null : (
        <div className="flex gap-1">
          <GlassButton size="xs" variant="ghost" icon={Pencil} onClick={() => openEdit(r)} />
          <GlassButton size="xs" variant="danger" icon={Trash2} onClick={() => setDeleteTarget(r)} />
        </div>
      ),
    },
  ];

  // ── Download columns ───────────────────────────────────────────────────────

  const dlRecordCols: DLColumn[] = [
    { key: 'date',                    label: 'Date' },
    { key: 'equipment_name',          label: 'Equipment',       format: (v, row) => String(v ?? row.equipment_id) },
    { key: 'availability_percentage', label: 'Availability %',  format: v => `${Number(v).toFixed(1)}%` },
    { key: 'operational_hours',       label: 'Op Hours',        format: v => `${v}h` },
    { key: 'breakdown_hours',         label: 'Downtime Hours',  format: v => `${v}h` },
    { key: 'notes',                   label: 'Notes',           format: v => String(v ?? '') },
  ];

  const dlPeriodCols: DLColumn[] = [
    { key: 'label',           label: period === 'day' ? 'Date' : period === 'week' ? 'Week' : 'Month' },
    { key: 'avgAvailability', label: 'Avg Availability %', format: v => `${Number(v).toFixed(1)}%` },
    { key: 'totalOpHours',    label: 'Total Op Hours',     format: v => `${Number(v).toFixed(1)}h` },
    { key: 'totalBdHours',    label: 'Total Downtime',     format: v => `${Number(v).toFixed(1)}h` },
    { key: 'recordCount',     label: 'Record Count' },
  ];

  // ── Dept averages for analytics ────────────────────────────────────────────

  const deptStats = useMemo(() => {
    const map = new Map<string, { sum: number; count: number }>();
    eqSummary.forEach(({ pct, department }) => {
      const d = department || 'Unknown';
      const ex = map.get(d) ?? { sum: 0, count: 0 };
      map.set(d, { sum: ex.sum + pct, count: ex.count + 1 });
    });
    return Array.from(map.entries())
      .map(([dept, { sum, count }]) => ({ dept, avg: sum / count }))
      .sort((a, b) => b.avg - a.avg);
  }, [eqSummary]);

  // ── Period toggle (used as `actions` prop in GlassPanel) ──────────────────

  const periodToggle = (
    <div className="flex gap-1">
      {(['day', 'week', 'month'] as const).map(p => (
        <button
          key={p}
          type="button"
          onClick={() => setPeriod(p)}
          className={`px-2.5 py-1 text-[11px] rounded-lg font-semibold transition-all ${
            period === p
              ? 'bg-[#2A4D69]/70 text-[#86BBD8] border border-[#86BBD8]/30'
              : 'text-white/50 hover:text-white hover:bg-white/10'
          }`}
        >
          {p.charAt(0).toUpperCase() + p.slice(1)}
        </button>
      ))}
    </div>
  );

  // ── Tabs ───────────────────────────────────────────────────────────────────

  const tabs: GlassTab[] = [
    {
      key: 'overview',
      label: 'Overview',
      icon: Gauge,
      content: (
        <GlassPanel title="Equipment Availability — Latest Entry" icon={Gauge} variant="dark">
          {eqSummary.length === 0
            ? <EmptyState icon={Gauge} title="No Records Yet" message="Log your first availability record using the button above." action={{ label: 'Log Record', onClick: openNew }} />
            : <GlassTable<EqSummaryRow> columns={overviewCols} data={eqSummary} keyField="id" stickyHeader maxHeight="480px" />
          }
        </GlassPanel>
      ),
    },
    {
      key: 'period',
      label: 'By Period',
      icon: Calendar,
      content: (
        <GlassPanel
          title={`By ${period.charAt(0).toUpperCase() + period.slice(1)}`}
          icon={Calendar}
          variant="dark"
          actions={periodToggle}
        >
          {periodRows.length === 0
            ? <EmptyState icon={Calendar} title="No Data" message="No records match the current date range." />
            : <GlassTable<PeriodRow> columns={periodCols} data={periodRows} keyField="periodKey" stickyHeader maxHeight="480px" />
          }
        </GlassPanel>
      ),
    },
    {
      key: 'analytics',
      label: 'Analytics',
      icon: BarChart3,
      content: (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Department comparison */}
          <GlassPanel title="By Department" icon={BarChart3} variant="dark">
            <div className="p-5 space-y-3">
              {deptStats.length === 0
                ? <p className="text-sm text-white/30 text-center py-8">No data — log records first</p>
                : deptStats.map(({ dept, avg }) => (
                  <div key={dept}>
                    <div className="flex justify-between mb-1">
                      <span className="text-xs text-white/70">{dept}</span>
                      <span className={`text-xs font-bold ${avColor(avg)}`}>{avg.toFixed(1)}%</span>
                    </div>
                    <GlassProgress value={avg} />
                  </div>
                ))
              }
            </div>
          </GlassPanel>

          {/* Attention required */}
          <GlassPanel title="Attention Required" icon={AlertTriangle} variant="dark">
            <div className="p-5 space-y-3">
              {eqSummary.filter(e => e.pct < 95).length === 0
                ? (
                  <div className="text-center py-8">
                    <Check className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
                    <p className="text-sm text-emerald-400 font-semibold">All equipment above 95%</p>
                  </div>
                )
                : eqSummary.filter(e => e.pct < 95).slice(0, 6).map(e => (
                  <div key={e.id} className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between mb-0.5">
                        <span className="text-xs text-white truncate">{e.name}</span>
                        <span className={`text-xs font-bold ml-2 ${avColor(e.pct)}`}>{e.pct.toFixed(1)}%</span>
                      </div>
                      <GlassProgress value={e.pct} />
                    </div>
                    <span className="text-xs text-red-400 shrink-0">{e.bdH.toFixed(1)}h↓</span>
                  </div>
                ))
              }
            </div>
          </GlassPanel>

          {/* Period summary */}
          <GlassPanel title="Period Summary" icon={LineChart} variant="dark">
            <div className="p-5 space-y-3 text-sm">
              {periodRows.length > 0 ? (() => {
                const avgs = periodRows.map(r => r.avgAvailability);
                const best  = Math.max(...avgs);
                const worst = Math.min(...avgs);
                const bestLabel  = periodRows.find(r => r.avgAvailability === best)?.label;
                const worstLabel = periodRows.find(r => r.avgAvailability === worst)?.label;
                const totalBd    = filtered.reduce((s, r) => s + r.breakdown_hours, 0);
                const totalOp    = filtered.reduce((s, r) => s + r.operational_hours, 0);
                return (
                  <>
                    <div className="flex justify-between text-white/70">
                      <span>Best {period}</span>
                      <span className={`font-bold ${avColor(best)}`}>{best.toFixed(1)}%
                        <span className="text-white/40 font-normal ml-1 text-xs">({bestLabel})</span>
                      </span>
                    </div>
                    <div className="flex justify-between text-white/70">
                      <span>Worst {period}</span>
                      <span className={`font-bold ${avColor(worst)}`}>{worst.toFixed(1)}%
                        <span className="text-white/40 font-normal ml-1 text-xs">({worstLabel})</span>
                      </span>
                    </div>
                    <div className="flex justify-between text-white/70">
                      <span>Total downtime (period)</span>
                      <span className="font-bold text-red-400">{totalBd.toFixed(1)}h</span>
                    </div>
                    <div className="flex justify-between text-white/70">
                      <span>Total operational</span>
                      <span className="font-bold text-emerald-400">{totalOp.toFixed(1)}h</span>
                    </div>
                  </>
                );
              })()
                : <p className="text-white/30 text-center py-8">No data in selected period</p>
              }
            </div>
          </GlassPanel>

          {/* Fleet gauge */}
          <GlassPanel title="Fleet Health" icon={Activity} variant="dark">
            <div className="p-5 flex flex-col items-center gap-4">
              <div className="relative w-36 h-36 flex items-center justify-center">
                <svg viewBox="0 0 100 100" className="w-36 h-36 -rotate-90">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="12" />
                  <circle
                    cx="50" cy="50" r="40" fill="none"
                    stroke={fleet.avgAv >= 95 ? '#10b981' : fleet.avgAv >= 90 ? '#f59e0b' : '#ef4444'}
                    strokeWidth="12"
                    strokeDasharray={`${(fleet.avgAv / 100) * 251} 251`}
                    strokeLinecap="round"
                    className="transition-[stroke-dasharray] duration-500 ease-in-out"
                  />
                </svg>
                <div className="absolute text-center">
                  <p className={`text-2xl font-black leading-none ${avColor(fleet.avgAv)}`}>{fleet.avgAv.toFixed(0)}%</p>
                  <p className="text-[11px] text-white/40 mt-0.5">fleet avg</p>
                </div>
              </div>
              <div className="w-full space-y-2 text-xs text-white/70">
                <div className="flex justify-between"><span>Equipment tracked</span><span className="text-white font-semibold">{eqSummary.length} / {equipment.length}</span></div>
                <div className="flex justify-between"><span>Records in period</span><span className="text-white font-semibold">{filtered.length}</span></div>
                <div className="flex justify-between"><span>Below 90%</span><span className={`font-semibold ${fleet.below90 > 0 ? 'text-red-400' : 'text-emerald-400'}`}>{fleet.below90} machines</span></div>
              </div>
            </div>
          </GlassPanel>

        </div>
      ),
    },
    {
      key: 'records',
      label: 'Records',
      icon: FileText,
      content: (
        <GlassPanel
          title={`All Records (${filtered.length})`}
          icon={FileText}
          variant="dark"
          actions={<GlassButton size="xs" icon={Plus} variant="primary" onClick={openNew}>Log Record</GlassButton>}
        >
          {filtered.length === 0
            ? <EmptyState icon={FileText} title="No Records" message="No availability records match the current filters." action={{ label: 'Log Record', onClick: openNew }} />
            : <GlassTable<AvailRecord> columns={recordCols} data={filtered} keyField="id" stickyHeader maxHeight="480px" />
          }
        </GlassPanel>
      ),
    },
  ];

  // ── Live availability preview in modal ─────────────────────────────────────

  const formPct = calcPct(parseFloat(form.operational_hours) || 0, parseFloat(form.breakdown_hours) || 0);

  // ── RENDER ─────────────────────────────────────────────────────────────────

  return (
    <PageShell>
      <main className="container mx-auto px-4 py-8 space-y-4">

        <HeroPanel
          icon={Gauge}
          title="Equipment Availability"
          subtitle="Availability = (Operational Hours − Downtime) ÷ Operational Hours × 100"
          onRefresh={() => fetchAll(true)}
          loading={refreshing}
          stats={heroStats}
          {...sections.panel('hero')}
          actions={
            <>
              <MasterCollapseButton collapse={sections} />
              <DownloadButton
                data={filtered as unknown as Record<string, unknown>[]}
                columns={dlRecordCols}
                filename={`Availability_Records_${dateFrom}_to_${dateTo}`}
                title="Equipment Availability Records"
                subtitle={`Period: ${dateFrom} to ${dateTo}`}
              />
              <Link href="/breakdowns">
                <GlassButton variant="secondary" icon={AlertTriangle} size="sm">Breakdowns</GlassButton>
              </Link>
              <GlassButton variant="primary" icon={Plus} size="sm" onClick={openNew}>Log Record</GlassButton>
            </>
          }
        />

        {/* Error banner */}
        {error && (
          <div className="oz-glass-panel rounded-2xl p-4 flex items-center gap-3 border border-red-500/30">
            <AlertTriangle className="h-5 w-5 text-red-400 shrink-0" />
            <p className="text-sm text-red-300">{error}</p>
            <button type="button" onClick={() => setError('')} className="ml-auto text-white/40 hover:text-white text-xl leading-none">×</button>
          </div>
        )}

        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <GlassStatCard label="Fleet Availability" value={`${fleet.avgAv.toFixed(1)}%`} icon={Percent} valueClass={avColor(fleet.avgAv)}>
            <GlassProgress value={fleet.avgAv} className="mt-2" />
          </GlassStatCard>
          <GlassStatCard label="Total Downtime"   value={`${fleet.totalBd.toFixed(0)}h`} icon={Clock}          valueClass="text-red-400" />
          <GlassStatCard label="Below 90%"         value={fleet.below90}                    icon={AlertTriangle}  valueClass={fleet.below90 > 0 ? 'text-red-400' : 'text-emerald-400'} />
          <GlassStatCard label="Records (period)"  value={fleet.count}                      icon={Activity} />
        </div>

        {/* Filters */}
        <GlassPanel icon={Search} title="Filters" variant="panel" {...sections.panel('filters')}>
          <div className="px-5 pb-4 pt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <GlassInput icon={Search} placeholder="Search equipment…" value={search} onChange={e => setSearch(e.target.value)} />
            <GlassSelect
              value={eqFilter}
              onChange={e => setEqFilter(e.target.value)}
              options={[{ value: 'all', label: 'All Equipment' }, ...equipment.map(e => ({ value: String(e.id), label: e.name }))]}
            />
            <GlassSelect
              value={deptFilter}
              onChange={e => setDeptFilter(e.target.value)}
              options={[{ value: 'all', label: 'All Departments' }, ...depts.map(d => ({ value: d, label: d }))]}
            />
            <GlassSelect
              value={catFilter}
              onChange={e => setCatFilter(e.target.value)}
              options={[{ value: 'all', label: 'All Categories' }, ...cats.map(c => ({ value: c, label: c }))]}
            />
            <GlassInput type="date" label="From" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
            <GlassInput type="date" label="To"   value={dateTo}   onChange={e => setDateTo(e.target.value)} />
            <div className="flex items-end gap-2 sm:col-span-2">
              <DownloadButton
                data={periodRows as unknown as Record<string, unknown>[]}
                columns={dlPeriodCols}
                filename={`Availability_by_${period}_${dateFrom}_to_${dateTo}`}
                title={`Availability by ${period.charAt(0).toUpperCase() + period.slice(1)}`}
                subtitle={`${dateFrom} → ${dateTo}`}
              />
              <span className="text-xs text-white/40 pb-0.5">{filtered.length} records in filter</span>
            </div>
          </div>
        </GlassPanel>

        {/* Main tabs */}
        {loading
          ? <LoadingPane message="Loading availability data…" />
          : <GlassTabs tabs={tabs} defaultTab="overview" />
        }

      </main>

      {/* Log / Edit record modal */}
      <GlassModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editRec ? 'Edit Availability Record' : 'Log Availability Record'}
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <GlassButton variant="secondary" onClick={() => setModalOpen(false)}>Cancel</GlassButton>
            <GlassButton variant="primary" onClick={saveRecord} disabled={saving || !form.equipment_id || !form.date}>
              {saving ? 'Saving…' : editRec ? 'Update' : 'Save Record'}
            </GlassButton>
          </div>
        }
      >
        <div className="space-y-4">
          <GlassSelect
            label="Equipment *"
            value={form.equipment_id}
            onChange={e => {
              const id = e.target.value;
              setForm(f => ({ ...f, equipment_id: id }));
              if (!editRec) prefillFromBreakdowns(id, form.date);
            }}
            options={[{ value: '', label: 'Select equipment…' }, ...equipment.map(e => ({ value: String(e.id), label: e.name }))]}
          />
          <GlassInput
            type="date" label="Date *" value={form.date}
            onChange={e => {
              const d = e.target.value;
              setForm(f => ({ ...f, date: d }));
              if (!editRec) prefillFromBreakdowns(form.equipment_id, d);
            }}
          />
          <div className="grid grid-cols-2 gap-3">
            <GlassInput type="number" label="Operational Hours" value={form.operational_hours} min="0" step="0.5" onChange={e => setForm(f => ({ ...f, operational_hours: e.target.value }))} />
            <GlassInput type="number" label="Downtime Hours"    value={form.breakdown_hours}   min="0" step="0.5" onChange={e => setForm(f => ({ ...f, breakdown_hours: e.target.value }))} />
          </div>

          {/* Live availability preview */}
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 flex items-center gap-5">
            <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
              <svg viewBox="0 0 100 100" className="w-16 h-16 -rotate-90">
                <circle cx="50" cy="50" r="38" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="16" />
                <circle
                  cx="50" cy="50" r="38" fill="none"
                  stroke={formPct >= 95 ? '#10b981' : formPct >= 90 ? '#f59e0b' : '#ef4444'}
                  strokeWidth="16"
                  strokeDasharray={`${(formPct / 100) * 239} 239`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute">
                <p className={`text-[11px] font-black leading-none ${avColor(formPct)}`}>{formPct.toFixed(0)}%</p>
              </div>
            </div>
            <div>
              <p className={`text-2xl font-black ${avColor(formPct)}`}>{formPct.toFixed(1)}%</p>
              <p className="text-xs text-white/50 mb-1.5">Calculated availability</p>
              <GlassBadge variant={avVariant(formPct)}>
                {formPct >= 95 ? 'Excellent' : formPct >= 90 ? 'Acceptable' : 'Needs Attention'}
              </GlassBadge>
            </div>
          </div>

          <GlassTextarea label="Notes (optional)" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Any remarks about this period…" />
        </div>
      </GlassModal>

      {/* Delete confirmation */}
      <DeleteDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onDelete={doDelete}
        title="Delete Availability Record"
        description={`Delete the availability record for "${deleteTarget?.equipment_name ?? `equipment #${deleteTarget?.equipment_id}`}" on ${deleteTarget?.date}? This cannot be undone.`}
      />

    </PageShell>
  );
}
