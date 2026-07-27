// app/availabilities/page.tsx — Equipment Availability Tracker
'use client';

import { useState, useEffect, useMemo, useCallback, ElementType } from 'react';
import { api } from '@/lib/apiClient';
import Link from 'next/link';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Activity, AlertTriangle, BarChart3, Calendar, Check, Clock,
  FileText, Gauge, LineChart, Pencil, Percent, Plus, Search, Trash2, RefreshCw, X,
} from '@/components/shared/theme';
import { AppShell } from '@/components/app-shell';
import {
  useTheme, PageHero, StatTile, StatusBadge, SearchInput, ProgressBar, FormField, FormActions,
  useCollapseSection, CenterModal, ACCENT_HEX, EmptyState, PrimaryButton, SelectField,
} from '@/components/shared/theme';
import { DownloadButton, type DLColumn } from '@/components/shared/DownloadButton';

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
function avHex(pct: number) {
  if (pct >= 95) return '#10b981';
  if (pct >= 90) return '#f59e0b';
  return '#ef4444';
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

// ─── SUB-COMPONENTS ──────────────────────────────────────────────────────────

function GaugeRing({ pct, size = 144, stroke = 12 }: { pct: number; size?: number; stroke?: number }) {
  const t = useTheme();
  const r = (100 - stroke) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="-rotate-90" style={{ width: size, height: size }}>
        <circle cx="50" cy="50" r={r} fill="none" stroke={t.light ? 'rgba(15,23,42,0.06)' : 'rgba(255,255,255,0.06)'} strokeWidth={stroke} />
        <circle cx="50" cy="50" r={r} fill="none" stroke={avHex(pct)} strokeWidth={stroke}
          strokeDasharray={`${(pct / 100) * circ} ${circ}`} strokeLinecap="round"
          className="transition-[stroke-dasharray] duration-500 ease-in-out" />
      </svg>
      <div className="absolute text-center">
        <p className={`font-black leading-none ${avColor(pct)}`} style={{ fontSize: size / 6 }}>{pct.toFixed(0)}%</p>
      </div>
    </div>
  );
}


// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

function AvailabilitiesContent() {
  const t = useTheme();
  const sections = useCollapseSection({ hero: true, filters: true });

  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [records, setRecords] = useState<AvailRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [eqFilter, setEqFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState('all');
  const [catFilter, setCatFilter] = useState('all');
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('week');
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().slice(0, 10);
  });
  const [dateTo, setDateTo] = useState(new Date().toISOString().slice(0, 10));

  const [modalOpen, setModalOpen] = useState(false);
  const [editRec, setEditRec] = useState<AvailRecord | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AvailRecord | null>(null);
  const [mainTab, setMainTab] = useState<'overview' | 'period' | 'analytics' | 'records'>('overview');

  const fetchAll = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    setRefreshing(true);
    try {
      const [eqData, bdRecords, manualRecords] = await Promise.all([
        api.get<any[]>('/api/equipment').catch(() => null),
        api.get<AvailRecord[]>('/api/availability-records/from-breakdowns').catch(() => [] as AvailRecord[]),
        api.get<AvailRecord[]>('/api/availability-records').catch(() => [] as AvailRecord[]),
      ]);
      if (eqData) setEquipment(eqData);

      const manualKeys = new Set(manualRecords.map(r => `${r.equipment_id}_${r.date}`));
      const merged = [
        ...manualRecords,
        ...bdRecords.filter(r => !manualKeys.has(`${r.equipment_id}_${r.date}`)),
      ];
      setRecords(merged);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const eqMap = useMemo(() => {
    const m = new Map<string, Equipment>();
    equipment.forEach(e => m.set(String(e.id), e));
    return m;
  }, [equipment]);

  const depts = useMemo(() => [...new Set(equipment.map(e => e.department).filter(Boolean) as string[])], [equipment]);
  const cats = useMemo(() => [...new Set(equipment.map(e => e.category).filter(Boolean) as string[])], [equipment]);

  const filtered = useMemo(() => records.filter(r => {
    if (dateFrom && r.date < dateFrom) return false;
    if (dateTo && r.date > dateTo) return false;
    if (eqFilter !== 'all' && String(r.equipment_id) !== eqFilter) return false;
    const eq = eqMap.get(String(r.equipment_id));
    if (deptFilter !== 'all' && eq?.department !== deptFilter) return false;
    if (catFilter !== 'all' && eq?.category !== catFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const name = r.equipment_name ?? eq?.name ?? '';
      if (!name.toLowerCase().includes(q)) return false;
    }
    return true;
  }), [records, dateFrom, dateTo, eqFilter, deptFilter, catFilter, search, eqMap]);

  const eqSummary = useMemo((): EqSummaryRow[] => {
    const map = new Map<string, EqSummaryRow>();
    filtered.forEach(r => {
      const key = String(r.equipment_id);
      const eq = eqMap.get(key);
      const cur = map.get(key);
      if (!cur || r.date > cur.lastDate) {
        map.set(key, {
          id: key,
          name: r.equipment_name ?? eq?.name ?? `Equipment #${key}`,
          category: eq?.category ?? '—',
          department: eq?.department ?? '—',
          pct: r.availability_percentage,
          opH: r.operational_hours,
          bdH: r.breakdown_hours,
          lastDate: r.date,
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.pct - b.pct);
  }, [filtered, eqMap]);

  const periodRows = useMemo((): PeriodRow[] => {
    const grouped = new Map<string, { sum: number; count: number; opH: number; bdH: number }>();
    filtered.forEach(r => {
      const key = period === 'day' ? r.date
        : period === 'week' ? getWeekLabel(r.date)
        : getMonthLabel(r.date);
      const ex = grouped.get(key) ?? { sum: 0, count: 0, opH: 0, bdH: 0 };
      grouped.set(key, { sum: ex.sum + r.availability_percentage, count: ex.count + 1, opH: ex.opH + r.operational_hours, bdH: ex.bdH + r.breakdown_hours });
    });
    return Array.from(grouped.entries())
      .map(([k, v]) => ({ periodKey: k, label: k, avgAvailability: v.sum / v.count, totalOpHours: v.opH, totalBdHours: v.bdH, recordCount: v.count }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [filtered, period]);

  const fleet = useMemo(() => ({
    avgAv: eqSummary.length > 0 ? eqSummary.reduce((s, e) => s + e.pct, 0) / eqSummary.length : 0,
    totalBd: filtered.reduce((s, r) => s + r.breakdown_hours, 0),
    below90: eqSummary.filter(e => e.pct < 90).length,
    count: filtered.length,
  }), [eqSummary, filtered]);

  async function prefillFromBreakdowns(eqId: string, date: string) {
    if (!eqId || !date) return;
    try {
      const data = await api.get<AvailRecord[]>(`/api/availability-records/from-breakdowns?equipment_id=${eqId}&date_from=${date}&date_to=${date}`);
      if (data.length > 0) setForm(f => ({ ...f, breakdown_hours: String(data[0].breakdown_hours) }));
    } catch { /* silent — manual entry still works */ }
  }

  function openNew() { setEditRec(null); setForm(EMPTY_FORM); setModalOpen(true); }
  function openEdit(r: AvailRecord) {
    setEditRec(r);
    setForm({ equipment_id: String(r.equipment_id), date: r.date, operational_hours: String(r.operational_hours), breakdown_hours: String(r.breakdown_hours), notes: r.notes ?? '' });
    setModalOpen(true);
  }

  async function saveRecord(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const op = parseFloat(form.operational_hours) || 0;
      const bd = Math.min(parseFloat(form.breakdown_hours) || 0, op);
      const payload = { equipment_id: parseInt(form.equipment_id), date: form.date, operational_hours: op, breakdown_hours: bd, availability_percentage: calcPct(op, bd), notes: form.notes };
      if (editRec) await api.put(`/api/availability-records/${editRec.id}`, payload);
      else await api.post('/api/availability-records', payload);
      setModalOpen(false);
      toast.success(editRec ? 'Record updated' : 'Record logged');
      fetchAll(true);
    } catch (e) {
      const msg = `Save failed: ${(e as Error).message}`;
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  async function doDelete() {
    if (!deleteTarget) return;
    try {
      await api.delete(`/api/availability-records/${deleteTarget.id}`);
    } catch (e) { toast.error(`Delete failed: ${(e as Error).message}`); return; }
    setDeleteTarget(null);
    toast.success('Record deleted');
    fetchAll(true);
  }

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

  const formPct = calcPct(parseFloat(form.operational_hours) || 0, parseFloat(form.breakdown_hours) || 0);

  const selCls = `h-9 rounded-lg px-3 text-sm outline-none transition-colors ${t.inputBg}`;
  const thCls = `text-left px-3 py-2 text-[10px] uppercase tracking-wide font-medium ${t.textFaint}`;
  const tdCls = `px-3 py-2.5 text-sm ${t.textMuted}`;

  const TABS: { key: typeof mainTab; label: string; icon: ElementType }[] = [
    { key: 'overview', label: 'Overview', icon: Gauge },
    { key: 'period', label: 'By Period', icon: Calendar },
    { key: 'analytics', label: 'Analytics', icon: BarChart3 },
    { key: 'records', label: 'Records', icon: FileText },
  ];

  const recordsExportColumns: DLColumn[] = [
    { key: 'date', label: 'Date' },
    { key: 'equipment_name', label: 'Equipment', format: (v, row) => String(v ?? row.equipment_id) },
    { key: 'availability_percentage', label: 'Availability %', format: v => `${Number(v).toFixed(1)}%` },
    { key: 'operational_hours', label: 'Op Hours', format: v => `${v}h` },
    { key: 'breakdown_hours', label: 'Downtime Hours', format: v => `${v}h` },
    { key: 'notes', label: 'Notes', format: v => String(v ?? '') },
  ];

  const periodExportColumns: DLColumn[] = [
    { key: 'label', label: period === 'day' ? 'Date' : period === 'week' ? 'Week' : 'Month' },
    { key: 'avgAvailability', label: 'Avg Availability %', format: v => `${Number(v).toFixed(1)}%` },
    { key: 'totalOpHours', label: 'Total Op Hours', format: v => `${Number(v).toFixed(1)}h` },
    { key: 'totalBdHours', label: 'Total Downtime', format: v => `${Number(v).toFixed(1)}h` },
    { key: 'recordCount', label: 'Record Count' },
  ];

  return (
    <main className="max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <PageHero
        icon={Gauge}
        accent="violet"
        crumbs={['Time & Attendance', 'Availability Records']}
        title="Equipment Availability"
        description="Availability = (Operational Hours − Downtime) ÷ Operational Hours × 100"
        statsOpen={sections.expanded.hero}
        actions={
          <>
            <button type="button" onClick={() => fetchAll(true)} title="Refresh" className={`h-8 w-8 flex items-center justify-center rounded-lg ${t.hoverBg} ${t.textFaint} ${t.hoverText}`}>
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            {filtered.length > 0 && (
              <DownloadButton
                data={filtered as unknown as Record<string, unknown>[]}
                columns={recordsExportColumns}
                filename={`Availability_Records_${dateFrom}_to_${dateTo}`}
                title="Equipment Availability Records"
                subtitle={`Period: ${dateFrom} to ${dateTo}`}
                formats={['excel']}
              />
            )}
            <Link href="/breakdowns" className={`flex items-center gap-1.5 h-8 px-3 rounded-lg text-[13px] font-medium ${t.chipBg} ${t.textMuted} ${t.hoverBg}`}>
              <AlertTriangle className="h-3.5 w-3.5" /> Breakdowns
            </Link>
            <PrimaryButton icon={Plus} onClick={openNew}>Log Record</PrimaryButton>
          </>
        }
      >
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-4">
          <StatTile icon={Gauge} color={ACCENT_HEX.blue} label="Equipment" value={equipment.length} />
          <StatTile icon={Percent} color={avHex(fleet.avgAv)} label="Avg Availability" value={`${fleet.avgAv.toFixed(1)}%`} />
          <StatTile icon={AlertTriangle} color={fleet.below90 > 0 ? '#f87171' : '#34d399'} label="Below 90%" value={fleet.below90} />
          <StatTile icon={Clock} color="#fbbf24" label="Total Downtime" value={`${fleet.totalBd.toFixed(0)}h`} />
          <StatTile icon={Activity} color={ACCENT_HEX.blue} label="Records (period)" value={fleet.count} />
        </div>
      </PageHero>

      {error && (
        <div className={`${t.glass} rounded-2xl p-4 flex items-center gap-3 border border-red-500/30`}>
          <AlertTriangle className="h-5 w-5 text-red-400 shrink-0" />
          <p className="text-sm text-red-400">{error}</p>
          <button type="button" onClick={() => setError('')} title="Dismiss" className={`ml-auto ${t.textFaint} ${t.hoverText} transition-colors`}><X className="h-4 w-4" /></button>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className={`${t.glass} rounded-xl p-4`}>
          <div className="flex items-center gap-1.5 mb-1"><Percent className="h-3.5 w-3.5 text-brand-400" /><span className={`text-xs ${t.textFaint}`}>Fleet Availability</span></div>
          <div className={`text-xl font-bold ${avColor(fleet.avgAv)}`}>{fleet.avgAv.toFixed(1)}%</div>
          <div className="mt-2"><ProgressBar value={fleet.avgAv} color={avHex(fleet.avgAv)} showValue={false} /></div>
        </div>
        <div className={`${t.glass} rounded-xl p-4`}>
          <div className="flex items-center gap-1.5 mb-1"><Clock className="h-3.5 w-3.5 text-red-400" /><span className={`text-xs ${t.textFaint}`}>Total Downtime</span></div>
          <div className="text-xl font-bold text-red-400">{fleet.totalBd.toFixed(0)}h</div>
        </div>
        <div className={`${t.glass} rounded-xl p-4`}>
          <div className="flex items-center gap-1.5 mb-1"><AlertTriangle className="h-3.5 w-3.5 text-amber-400" /><span className={`text-xs ${t.textFaint}`}>Below 90%</span></div>
          <div className={`text-xl font-bold ${fleet.below90 > 0 ? 'text-red-400' : 'text-emerald-400'}`}>{fleet.below90}</div>
        </div>
        <div className={`${t.glass} rounded-xl p-4`}>
          <div className="flex items-center gap-1.5 mb-1"><Activity className="h-3.5 w-3.5 text-brand-400" /><span className={`text-xs ${t.textFaint}`}>Records (period)</span></div>
          <div className={`text-xl font-bold ${t.textPrimary}`}>{fleet.count}</div>
        </div>
      </div>

      <div className={`${t.glass} rounded-2xl ${t.shadow} overflow-hidden`}>
        <div className={`flex items-center gap-2 px-5 py-3 border-b ${t.border}`}>
          <Search className="h-4 w-4 text-brand-400" /><span className={`font-semibold text-sm ${t.textPrimary}`}>Filters</span>
        </div>
        <div className="px-5 pb-4 pt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <SearchInput value={search} onChange={setSearch} placeholder="Search equipment…" />
          <SelectField size="filter" title="Equipment" value={eqFilter} onChange={setEqFilter}
            options={[{ value: 'all', label: 'All Equipment' }, ...equipment.map(e => ({ value: String(e.id), label: e.name }))]} />
          <SelectField size="filter" title="Department" value={deptFilter} onChange={setDeptFilter}
            options={[{ value: 'all', label: 'All Departments' }, ...depts.map(d => ({ value: d, label: d }))]} />
          <SelectField size="filter" title="Category" value={catFilter} onChange={setCatFilter}
            options={[{ value: 'all', label: 'All Categories' }, ...cats.map(c => ({ value: c, label: c }))]} />
          <FormField label="From"><input type="date" title="From date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className={`w-full ${selCls}`} /></FormField>
          <FormField label="To"><input type="date" title="To date" value={dateTo} onChange={e => setDateTo(e.target.value)} className={`w-full ${selCls}`} /></FormField>
          <div className="flex items-end gap-2 sm:col-span-2">
            {periodRows.length > 0 && (
              <DownloadButton
                data={periodRows as unknown as Record<string, unknown>[]}
                columns={periodExportColumns}
                filename={`Availability_by_${period}_${dateFrom}_to_${dateTo}`}
                title={`Availability by ${period.charAt(0).toUpperCase() + period.slice(1)}`}
                subtitle={`${dateFrom} → ${dateTo}`}
                formats={['excel']}
              />
            )}
            <span className={`text-xs pb-0.5 ${t.textFaint}`}>{filtered.length} records in filter</span>
          </div>
        </div>
      </div>

      <div className={`flex items-center gap-1 ${t.glassSoft} rounded-xl p-1 w-fit`}>
        {TABS.map(tb => (
          <button key={tb.key} type="button" onClick={() => setMainTab(tb.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${mainTab === tb.key ? 'bg-brand-500/20 text-brand-400' : `${t.textFaint} ${t.hoverText} ${t.hoverBg}`}`}>
            <tb.icon className="h-4 w-4" />{tb.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><RefreshCw className={`h-6 w-6 animate-spin ${t.textFaint}`} /></div>
      ) : mainTab === 'overview' ? (
        <div className={`${t.glass} rounded-2xl ${t.shadow} overflow-hidden`}>
          <div className={`flex items-center gap-2 px-5 py-3 border-b ${t.border}`}>
            <Gauge className="h-4 w-4 text-brand-400" /><span className={`font-semibold text-sm ${t.textPrimary}`}>Equipment Availability — Latest Entry</span>
          </div>
          {eqSummary.length === 0 ? (
            <EmptyState icon={Gauge} title="No Records Yet" message="Log your first availability record using the button above." action={{ label: 'Log Record', onClick: openNew }} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className={`border-b ${t.border}`}>
                  <tr><th className={thCls}>Equipment</th><th className={thCls}>Category</th><th className={thCls}>Department</th><th className={`${thCls} text-right`}>Availability</th><th className={`${thCls} text-right`}>Op. Hours</th><th className={`${thCls} text-right`}>Downtime</th><th className={thCls}>Last Entry</th></tr>
                </thead>
                <tbody>
                  {eqSummary.map(r => (
                    <tr key={r.id} className={`border-b ${t.border} ${t.hoverBgSoft} transition-colors`}>
                      <td className={tdCls}><span className={`font-medium ${t.textPrimary}`}>{r.name}</span></td>
                      <td className={tdCls}>{r.category}</td>
                      <td className={tdCls}>{r.department}</td>
                      <td className={`${tdCls} text-right`}>
                        <div className="flex items-center gap-2 justify-end">
                          <span className={`font-bold text-sm ${avColor(r.pct)}`}>{r.pct.toFixed(1)}%</span>
                          <div className="w-20"><ProgressBar value={r.pct} color={avHex(r.pct)} showValue={false} /></div>
                        </div>
                      </td>
                      <td className={`${tdCls} text-right`}>{r.opH.toFixed(1)}h</td>
                      <td className={`${tdCls} text-right text-red-400`}>{r.bdH.toFixed(1)}h</td>
                      <td className="px-3 py-2.5 text-xs text-white/50">{r.lastDate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : mainTab === 'period' ? (
        <div className={`${t.glass} rounded-2xl ${t.shadow} overflow-hidden`}>
          <div className={`flex items-center justify-between px-5 py-3 border-b ${t.border}`}>
            <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-brand-400" /><span className={`font-semibold text-sm ${t.textPrimary}`}>By {period.charAt(0).toUpperCase() + period.slice(1)}</span></div>
            <div className="flex gap-1">
              {(['day', 'week', 'month'] as const).map(p => (
                <button key={p} type="button" onClick={() => setPeriod(p)}
                  className={`px-2.5 py-1 text-[11px] rounded-lg font-semibold transition-all ${period === p ? 'bg-brand-500/20 text-brand-400' : `${t.textFaint} ${t.hoverText} ${t.hoverBg}`}`}>
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          </div>
          {periodRows.length === 0 ? (
            <EmptyState icon={Calendar} title="No Data" message="No records match the current date range." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className={`border-b ${t.border}`}>
                  <tr><th className={thCls}>{period === 'day' ? 'Date' : period === 'week' ? 'Week' : 'Month'}</th><th className={`${thCls} text-right`}>Avg Availability</th><th className={`${thCls} text-right`}>Op. Hours</th><th className={`${thCls} text-right`}>Downtime</th><th className={`${thCls} text-center`}>Records</th></tr>
                </thead>
                <tbody>
                  {periodRows.map(r => (
                    <tr key={r.periodKey} className={`border-b ${t.border} ${t.hoverBgSoft} transition-colors`}>
                      <td className={tdCls}><span className={`font-medium ${t.textPrimary}`}>{r.label}</span></td>
                      <td className={`${tdCls} text-right`}>
                        <div className="flex items-center gap-2 justify-end">
                          <span className={`font-bold text-sm ${avColor(r.avgAvailability)}`}>{r.avgAvailability.toFixed(1)}%</span>
                          <div className="w-20"><ProgressBar value={r.avgAvailability} color={avHex(r.avgAvailability)} showValue={false} /></div>
                        </div>
                      </td>
                      <td className={`${tdCls} text-right`}>{r.totalOpHours.toFixed(1)}h</td>
                      <td className={`${tdCls} text-right text-red-400`}>{r.totalBdHours.toFixed(1)}h</td>
                      <td className={`${tdCls} text-center`}><StatusBadge color={ACCENT_HEX.blue} label={String(r.recordCount)} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : mainTab === 'analytics' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className={`${t.glass} rounded-2xl ${t.shadow} overflow-hidden`}>
            <div className={`flex items-center gap-2 px-5 py-3 border-b ${t.border}`}><BarChart3 className="h-4 w-4 text-brand-400" /><span className={`font-semibold text-sm ${t.textPrimary}`}>By Department</span></div>
            <div className="p-5 space-y-3">
              {deptStats.length === 0 ? <p className={`text-sm text-center py-8 ${t.textFaint}`}>No data — log records first</p> : deptStats.map(({ dept, avg }) => (
                <div key={dept}>
                  <div className="flex justify-between mb-1"><span className={`text-xs ${t.textMuted}`}>{dept}</span><span className={`text-xs font-bold ${avColor(avg)}`}>{avg.toFixed(1)}%</span></div>
                  <ProgressBar value={avg} color={avHex(avg)} showValue={false} />
                </div>
              ))}
            </div>
          </div>

          <div className={`${t.glass} rounded-2xl ${t.shadow} overflow-hidden`}>
            <div className={`flex items-center gap-2 px-5 py-3 border-b ${t.border}`}><AlertTriangle className="h-4 w-4 text-amber-400" /><span className={`font-semibold text-sm ${t.textPrimary}`}>Attention Required</span></div>
            <div className="p-5 space-y-3">
              {eqSummary.filter(e => e.pct < 95).length === 0 ? (
                <div className="text-center py-8"><Check className="h-8 w-8 text-emerald-400 mx-auto mb-2" /><p className="text-sm text-emerald-400 font-semibold">All equipment above 95%</p></div>
              ) : eqSummary.filter(e => e.pct < 95).slice(0, 6).map(e => (
                <div key={e.id} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between mb-0.5"><span className={`text-xs truncate ${t.textPrimary}`}>{e.name}</span><span className={`text-xs font-bold ml-2 ${avColor(e.pct)}`}>{e.pct.toFixed(1)}%</span></div>
                    <ProgressBar value={e.pct} color={avHex(e.pct)} showValue={false} />
                  </div>
                  <span className="text-xs text-red-400 shrink-0">{e.bdH.toFixed(1)}h↓</span>
                </div>
              ))}
            </div>
          </div>

          <div className={`${t.glass} rounded-2xl ${t.shadow} overflow-hidden`}>
            <div className={`flex items-center gap-2 px-5 py-3 border-b ${t.border}`}><LineChart className="h-4 w-4 text-brand-400" /><span className={`font-semibold text-sm ${t.textPrimary}`}>Period Summary</span></div>
            <div className="p-5 space-y-3 text-sm">
              {periodRows.length > 0 ? (() => {
                const avgs = periodRows.map(r => r.avgAvailability);
                const best = Math.max(...avgs);
                const worst = Math.min(...avgs);
                const bestLabel = periodRows.find(r => r.avgAvailability === best)?.label;
                const worstLabel = periodRows.find(r => r.avgAvailability === worst)?.label;
                const totalBd = filtered.reduce((s, r) => s + r.breakdown_hours, 0);
                const totalOp = filtered.reduce((s, r) => s + r.operational_hours, 0);
                return (
                  <>
                    <div className={`flex justify-between ${t.textMuted}`}><span>Best {period}</span><span className={`font-bold ${avColor(best)}`}>{best.toFixed(1)}%<span className={`font-normal ml-1 text-xs ${t.textFaint}`}>({bestLabel})</span></span></div>
                    <div className={`flex justify-between ${t.textMuted}`}><span>Worst {period}</span><span className={`font-bold ${avColor(worst)}`}>{worst.toFixed(1)}%<span className={`font-normal ml-1 text-xs ${t.textFaint}`}>({worstLabel})</span></span></div>
                    <div className={`flex justify-between ${t.textMuted}`}><span>Total downtime (period)</span><span className="font-bold text-red-400">{totalBd.toFixed(1)}h</span></div>
                    <div className={`flex justify-between ${t.textMuted}`}><span>Total operational</span><span className="font-bold text-emerald-400">{totalOp.toFixed(1)}h</span></div>
                  </>
                );
              })() : <p className={`text-center py-8 ${t.textFaint}`}>No data in selected period</p>}
            </div>
          </div>

          <div className={`${t.glass} rounded-2xl ${t.shadow} overflow-hidden`}>
            <div className={`flex items-center gap-2 px-5 py-3 border-b ${t.border}`}><Activity className="h-4 w-4 text-brand-400" /><span className={`font-semibold text-sm ${t.textPrimary}`}>Fleet Health</span></div>
            <div className="p-5 flex flex-col items-center gap-4">
              <GaugeRing pct={fleet.avgAv} />
              <div className={`w-full space-y-2 text-xs ${t.textMuted}`}>
                <div className="flex justify-between"><span>Equipment tracked</span><span className={`font-semibold ${t.textPrimary}`}>{eqSummary.length} / {equipment.length}</span></div>
                <div className="flex justify-between"><span>Records in period</span><span className={`font-semibold ${t.textPrimary}`}>{filtered.length}</span></div>
                <div className="flex justify-between"><span>Below 90%</span><span className={`font-semibold ${fleet.below90 > 0 ? 'text-red-400' : 'text-emerald-400'}`}>{fleet.below90} machines</span></div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className={`${t.glass} rounded-2xl ${t.shadow} overflow-hidden`}>
          <div className={`flex items-center justify-between px-5 py-3 border-b ${t.border}`}>
            <div className="flex items-center gap-2"><FileText className="h-4 w-4 text-brand-400" /><span className={`font-semibold text-sm ${t.textPrimary}`}>All Records ({filtered.length})</span></div>
            <button type="button" onClick={openNew} className={`flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-xs font-medium bg-brand-500/15 hover:bg-brand-500/25 text-brand-400 transition-colors`}><Plus className="h-3.5 w-3.5" /> Log Record</button>
          </div>
          {filtered.length === 0 ? (
            <EmptyState icon={FileText} title="No Records" message="No availability records match the current filters." action={{ label: 'Log Record', onClick: openNew }} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className={`border-b ${t.border}`}>
                  <tr><th className={thCls}>Date</th><th className={thCls}>Equipment</th><th className={`${thCls} text-right`}>Availability</th><th className={`${thCls} text-right`}>Op. Hrs</th><th className={`${thCls} text-right`}>Down. Hrs</th><th className={thCls}>Source / Notes</th><th className={thCls}></th></tr>
                </thead>
                <tbody>
                  {filtered.map(r => {
                    const name = r.equipment_name ?? eqMap.get(String(r.equipment_id))?.name ?? `#${r.equipment_id}`;
                    return (
                      <tr key={r.id} className={`border-b ${t.border} ${t.hoverBgSoft} transition-colors`}>
                        <td className="px-3 py-2.5 text-xs font-mono text-white/80">{r.date}</td>
                        <td className={tdCls}><span className={`font-medium ${t.textPrimary}`}>{name}</span></td>
                        <td className={`${tdCls} text-right`}>
                          <div className="flex items-center gap-2 justify-end">
                            <span className={`font-bold text-xs ${avColor(r.availability_percentage)}`}>{r.availability_percentage.toFixed(1)}%</span>
                            <div className="w-16"><ProgressBar value={r.availability_percentage} color={avHex(r.availability_percentage)} showValue={false} /></div>
                          </div>
                        </td>
                        <td className={`${tdCls} text-right`}>{r.operational_hours}h</td>
                        <td className={`${tdCls} text-right text-red-400`}>{r.breakdown_hours}h</td>
                        <td className={tdCls}>{r.source === 'breakdown' ? <StatusBadge color="#94a3b8" label="Auto" /> : <span className="text-xs text-white/50">{r.notes || '—'}</span>}</td>
                        <td className={tdCls}>
                          {r.source !== 'breakdown' && (
                            <div className="flex gap-1 justify-end">
                              <button type="button" onClick={() => openEdit(r)} title="Edit" className={`p-1.5 rounded ${t.chipBg} ${t.hoverBg} ${t.textFaint} ${t.hoverText} transition-colors`}><Pencil className="h-3 w-3" /></button>
                              <button type="button" onClick={() => setDeleteTarget(r)} title="Delete" className={`p-1.5 rounded ${t.chipBg} hover:bg-rose-500/15 ${t.textFaint} hover:text-rose-500 transition-colors`}><Trash2 className="h-3 w-3" /></button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Log / Edit record modal */}
      <CenterModal open={modalOpen} onClose={() => setModalOpen(false)} title={editRec ? 'Edit Availability Record' : 'Log Availability Record'} accent="violet" width="max-w-lg">
        <form onSubmit={saveRecord} className="p-5 space-y-4">
          <FormField label="Equipment" required>
            <Select value={form.equipment_id} onValueChange={id => { setForm(f => ({ ...f, equipment_id: id })); if (!editRec) prefillFromBreakdowns(id, form.date); }}>
              <SelectTrigger className={`h-9 ${t.inputBg}`}><SelectValue placeholder="Select equipment…" /></SelectTrigger>
              <SelectContent>{equipment.map(e => <SelectItem key={e.id} value={String(e.id)}>{e.name}</SelectItem>)}</SelectContent>
            </Select>
          </FormField>
          <FormField label="Date" required>
            <Input type="date" value={form.date} onChange={e => { const d = e.target.value; setForm(f => ({ ...f, date: d })); if (!editRec) prefillFromBreakdowns(form.equipment_id, d); }} className={`h-9 ${t.inputBg}`} />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Operational Hours"><Input type="number" min="0" step="0.5" value={form.operational_hours} onChange={e => setForm(f => ({ ...f, operational_hours: e.target.value }))} className={`h-9 ${t.inputBg}`} /></FormField>
            <FormField label="Downtime Hours"><Input type="number" min="0" step="0.5" value={form.breakdown_hours} onChange={e => setForm(f => ({ ...f, breakdown_hours: e.target.value }))} className={`h-9 ${t.inputBg}`} /></FormField>
          </div>

          <div className={`rounded-xl border ${t.border} ${t.chipBg} p-4 flex items-center gap-5`}>
            <GaugeRing pct={formPct} size={64} stroke={16} />
            <div>
              <p className={`text-2xl font-black ${avColor(formPct)}`}>{formPct.toFixed(1)}%</p>
              <p className={`text-xs mb-1.5 ${t.textFaint}`}>Calculated availability</p>
              <StatusBadge color={avHex(formPct)} label={formPct >= 95 ? 'Excellent' : formPct >= 90 ? 'Acceptable' : 'Needs Attention'} />
            </div>
          </div>

          <FormField label="Notes (optional)"><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Any remarks about this period…" className={`resize-none ${t.inputBg}`} /></FormField>
          <FormActions onCancel={() => setModalOpen(false)} submitting={saving} submitLabel={editRec ? 'Update' : 'Save Record'} accent="violet" />
        </form>
      </CenterModal>

      {/* Delete confirmation */}
      <CenterModal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Availability Record" accent="amber" width="max-w-sm">
        <div className="p-5 space-y-4">
          <p className={`text-sm ${t.textMuted}`}>Delete the availability record for &ldquo;{deleteTarget?.equipment_name ?? `equipment #${deleteTarget?.equipment_id}`}&rdquo; on {deleteTarget?.date}? This cannot be undone.</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setDeleteTarget(null)} className={`flex-1 py-2.5 rounded-xl text-sm ${t.textMuted} ${t.hoverText} border ${t.border} transition-all`}>Cancel</button>
            <button type="button" onClick={doDelete} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-br from-rose-500 to-rose-700 hover:brightness-110 transition-all">Delete</button>
          </div>
        </div>
      </CenterModal>
    </main>
  );
}

export default function AvailabilitiesPage() {
  return (
    <AppShell>
      <AvailabilitiesContent />
    </AppShell>
  );
}
