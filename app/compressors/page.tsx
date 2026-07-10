// app/compressors/page.tsx
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import {
  Calendar, Download, ChevronLeft, ChevronRight, Settings, Search,
  BarChart3, AlertTriangle, CheckCircle2, TrendingUp, Gauge,
  Power, Activity, FileText, Plus, List, Grid, Wrench,
  Calculator, CheckCheck, Timer, Save, Upload,
  ChevronDown, ChevronUp, Copy, Loader2, RefreshCw,
  XCircle,
} from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import {
  useTheme, PageHero, StatTile, StatusBadge, ViewToggle,
  FormField, useCollapseSection, CenterModal, ProgressBar, ACCENT_HEX, GlowCard, SelectField,
} from '@/components/shared/theme';

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface Compressor {
  id: number; name: string; model: string; capacity: string;
  location: string; status: string;
  total_running_hours: number; total_loaded_hours: number;
  color?: string; initial_total_running?: number; initial_total_loaded?: number;
}
interface CompressorInput { totalRunning: number; totalLoaded: number; pressure: number | string; temperature: number | string; notes: string; }
interface PreviousReading { total_running_hours: number; total_loaded_hours: number; date: string; }
interface IsSaving { type?: string; id?: number | string; }
interface UpcomingService {
  compressor_id: number; compressor_name: string; service_interval: number;
  current_hours: number; next_service_hours: number; hours_remaining: number;
  days_remaining: number; urgency: string;
}
interface PerformanceMetric {
  compressor_id: number; compressor_name: string; avg_efficiency: number;
  avg_daily_running_hours: number; avg_daily_loaded_hours: number;
  total_running_hours: number; total_loaded_hours: number;
  downtime_percentage: number; service_count: number;
}
interface TrendDataItem { compressor_name: string; efficiency_trend: string; avg_efficiency: number; total_running_hours?: number; total_loaded_hours?: number; }
interface TrendsResult { success: boolean; data: TrendDataItem[]; message: string; has_data: boolean; }
interface ComparisonItem { compressor_id: number; compressor_name: string; location: string; value: number; rating: string; }
interface ComparisonResult { success: boolean; data: ComparisonItem[]; message: string; count: number; }
interface AnalyticsData { performanceMetrics: PerformanceMetric[]; trends: TrendsResult; comparison: ComparisonResult; }
interface CompressorStats { total_compressors: number; total_running_hours?: number; avg_efficiency: number; upcoming_services: number; urgent_alerts: number; active_compressors: number; }
interface RecentAlert { id: number; title: string; message: string; severity: string; is_read: boolean; created_at: string; }
interface RecentService { id: number; service_type: string; description: string; service_date: string; running_hours_at_service: number; }
interface AgeDistribution { less_than_year?: number; "1_3_years"?: number; "3_5_years"?: number; more_than_5?: number; }
interface ManagementSummary { status_distribution: Record<string, number>; location_distribution: Record<string, number>; age_distribution: AgeDistribution; total_compressors: number; unread_alerts?: number; recent_alerts?: RecentAlert[]; recent_services?: RecentService[]; }
interface ManagementData { summary: ManagementSummary | null; alerts: RecentAlert[]; services: RecentService[]; }
interface Filters { location: string; status: string; search: string; showMaintenance: boolean; }
interface StatusDialogState { open: boolean; compressorId: number | null; currentStatus: string; }
interface AddCompressorFormData { name: string; model: string; capacity: string; location: string; status: string; total_running_hours: number; total_loaded_hours: number; color: string; }

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://myofficebackend.onrender.com';
const SERVICE_INTERVALS = [1000, 2000, 4000, 8000, 16000];

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  running:     { label: 'Running',     color: '#34d399', icon: Activity },
  standby:     { label: 'Standby',     color: ACCENT_HEX.blue, icon: Power },
  maintenance: { label: 'Maintenance', color: '#f59e0b', icon: AlertTriangle },
  offline:     { label: 'Offline',     color: '#f43f5e', icon: XCircle },
};

const LOCATIONS = ['Main Plant', 'Production', 'Auxiliary', 'Workshop', 'Storage', 'Packaging', 'Shipping', 'Receiving'];

const URGENCY_COLOR: Record<string, string> = { critical: '#f43f5e', high: '#f97316', medium: '#f59e0b', low: '#34d399' };
const RATING_COLOR: Record<string, string> = { Excellent: '#34d399', Good: ACCENT_HEX.blue, Fair: '#f59e0b', Poor: '#f43f5e' };

// ─── API UTILITY ──────────────────────────────────────────────────────────────

const enhancedFetch = async (url: string, options: RequestInit = {}): Promise<unknown> => {
  const r = await fetch(url, { ...options, headers: { 'Content-Type': 'application/json', ...(options.headers as Record<string, string> | undefined) } });
  if (!r.ok) {
    let msg = `HTTP ${r.status}`;
    try {
      const e = await r.json() as { detail?: string; message?: string };
      msg = e.detail ?? e.message ?? msg;
    } catch { msg = r.statusText || msg; }
    if (msg.includes('violates check constraint') || msg.includes('chk_daily_loaded_positive'))
      throw new Error('Invalid data: Loaded hours must be positive and cannot exceed running hours.');
    throw new Error(msg);
  }
  return r.json();
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

function CompressorReadingsSystem() {
  const t = useTheme();
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const [compressors, setCompressors] = useState<Compressor[]>([]);
  const [activeTab, setActiveTab] = useState<string>('daily');
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [showInactive, setShowInactive] = useState(true);
  const [showDailyHours, setShowDailyHours] = useState(true);
  const [defaultOperatingHours] = useState(8);
  const [maintenanceBufferDays] = useState(7);
  const [filters, setFilters] = useState<Filters>({ location: 'all', status: 'all', search: '', showMaintenance: false });
  const [expandedCompressor, setExpandedCompressor] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<IsSaving>({});
  const [stats, setStats] = useState<CompressorStats | null>(null);
  const [upcomingServices, setUpcomingServices] = useState<UpcomingService[]>([]);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    performanceMetrics: [],
    trends: { success: false, data: [], message: '', has_data: false },
    comparison: { success: false, data: [], message: '', count: 0 },
  });
  const [managementData, setManagementData] = useState<ManagementData>({ summary: null, alerts: [], services: [] });
  const [analyticsPeriod, setAnalyticsPeriod] = useState<string>('monthly');
  const [analyticsMetric, setAnalyticsMetric] = useState<string>('efficiency');
  const [showAddCompressor, setShowAddCompressor] = useState<boolean>(false);
  const [compressorInputs, setCompressorInputs] = useState<Record<number, CompressorInput>>({});
  const [statusUpdateDialog, setStatusUpdateDialog] = useState<StatusDialogState>({ open: false, compressorId: null, currentStatus: '' });
  const [previousReadings, setPreviousReadings] = useState<Record<number, PreviousReading>>({});

  const sections = useCollapseSection({ hero: true });

  useEffect(() => { loadAllData(); }, []);

  useEffect(() => {
    if (compressors.length > 0) {
      const inputs: Record<number, CompressorInput> = {};
      compressors.forEach(c => {
        inputs[c.id] = { totalRunning: c.total_running_hours || 0, totalLoaded: c.total_loaded_hours || 0, pressure: 0, temperature: 0, notes: '' };
      });
      setCompressorInputs(inputs);
    }
  }, [compressors]);

  const fetchCompressors = async () => {
    const data = (await enhancedFetch(`${API_BASE_URL}/api/compressors/compressors`)) as Compressor[];
    setCompressors(data || []);
    const prevData: Record<number, PreviousReading> = {};
    const curStr = currentDate.toISOString().split('T')[0];
    for (const c of data || []) {
      try {
        const r = (await enhancedFetch(`${API_BASE_URL}/api/compressors/readings/${c.id}/detailed`)) as { data?: Array<{ date: string; total_running_hours: number; total_loaded_hours: number }> };
        if (r.data?.length) {
          const prev = r.data.filter(x => x.date < curStr).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
          if (prev) prevData[c.id] = { total_running_hours: prev.total_running_hours, total_loaded_hours: prev.total_loaded_hours, date: prev.date };
          else prevData[c.id] = { total_running_hours: c.initial_total_running || 0, total_loaded_hours: c.initial_total_loaded || 0, date: 'Initial' };
        }
      } catch { /* ignore per-compressor errors */ }
    }
    setPreviousReadings(prevData);
  };

  const fetchStats = async () => { try { setStats((await enhancedFetch(`${API_BASE_URL}/api/compressors/stats`)) as CompressorStats); } catch { setStats(null); } };
  const fetchUpcomingServices = async () => { try { setUpcomingServices(((await enhancedFetch(`${API_BASE_URL}/api/compressors/service-due`)) as UpcomingService[]) || []); } catch { setUpcomingServices([]); } };
  const fetchPerformanceMetrics = async (days = 30) => {
    try {
      const data = ((await enhancedFetch(`${API_BASE_URL}/api/compressors/analytics/performance-metrics?period_days=${days}`)) as PerformanceMetric[]) || [];
      setAnalyticsData(p => ({ ...p, performanceMetrics: data }));
    } catch { setAnalyticsData(p => ({ ...p, performanceMetrics: [] })); }
  };
  const fetchTrendAnalysis = async (period = 'monthly') => {
    try {
      const data = ((await enhancedFetch(`${API_BASE_URL}/api/compressors/analytics/trends?period=${period}`)) as TrendsResult) || { success: false, data: [], message: '', has_data: false };
      setAnalyticsData(p => ({ ...p, trends: data }));
    } catch (e: unknown) { setAnalyticsData(p => ({ ...p, trends: { success: false, data: [], message: (e as Error).message, has_data: false } })); }
  };
  const fetchComparisonAnalytics = async (metric = 'efficiency') => {
    try {
      const data = ((await enhancedFetch(`${API_BASE_URL}/api/compressors/analytics/comparison?metric=${metric}`)) as ComparisonResult) || { success: false, data: [], message: '', count: 0 };
      setAnalyticsData(p => ({ ...p, comparison: data }));
    } catch (e: unknown) { setAnalyticsData(p => ({ ...p, comparison: { success: false, data: [], message: (e as Error).message, count: 0 } })); }
  };
  const fetchManagementSummary = async () => {
    try {
      const data = (await enhancedFetch(`${API_BASE_URL}/api/compressors/management/summary`)) as ManagementSummary;
      setManagementData(p => ({ ...p, summary: data }));
    } catch { setManagementData(p => ({ ...p, summary: null })); }
  };

  const loadAllData = async () => {
    setIsLoading(true);
    try { await Promise.all([fetchCompressors(), fetchStats(), fetchUpcomingServices(), fetchPerformanceMetrics(), fetchTrendAnalysis(), fetchComparisonAnalytics(), fetchManagementSummary()]); }
    catch (e: unknown) { toast.error((e as Error).message || 'Failed to load data'); }
    finally { setIsLoading(false); }
  };

  const getCurrentDateStr = useCallback(() => currentDate.toISOString().split('T')[0], [currentDate]);
  const previousDay = () => setCurrentDate(p => { const d = new Date(p); d.setDate(d.getDate() - 1); return d; });
  const nextDay = () => setCurrentDate(p => { const d = new Date(p); d.setDate(d.getDate() + 1); return d; });
  const goToToday = () => setCurrentDate(new Date());

  const calculateEfficiency = useCallback((running: number, loaded: number) => !running ? 0 : parseFloat(((loaded / running) * 100).toFixed(1)), []);

  const calculateNextService = useCallback((totalRunningHours: number) => {
    const nextIntervals = SERVICE_INTERVALS.filter(i => i > totalRunningHours);
    if (!nextIntervals.length) return null;
    const next = nextIntervals[0];
    const hoursRemaining = next - totalRunningHours;
    const daysRemaining = Math.ceil(hoursRemaining / defaultOperatingHours);
    let urgency = 'low';
    if (daysRemaining <= 0) urgency = 'critical';
    else if (daysRemaining <= 7) urgency = 'high';
    else if (daysRemaining <= 30) urgency = 'medium';
    return { interval: next, hoursRemaining, daysRemaining, urgency, isUrgent: daysRemaining <= maintenanceBufferDays };
  }, [defaultOperatingHours, maintenanceBufferDays]);

  const getEfficiencyStatus = (e: number) => {
    if (e >= 80) return { label: 'Excellent', color: '#34d399' };
    if (e >= 60) return { label: 'Good', color: ACCENT_HEX.blue };
    if (e >= 40) return { label: 'Fair', color: '#f59e0b' };
    return { label: 'Poor', color: '#f43f5e' };
  };

  const autoAdjustLoadedHours = (running: number, loaded: number) => Math.max(0, Math.min(loaded, running));

  const handleRunningHoursChange = (id: number, value: string) => {
    const n = parseFloat(value) || 0;
    const loaded = autoAdjustLoadedHours(n, compressorInputs[id]?.totalLoaded || 0);
    setCompressorInputs(p => ({ ...p, [id]: { ...p[id], totalRunning: n, totalLoaded: loaded } }));
  };
  const handleLoadedHoursChange = (id: number, value: string) => {
    const n = parseFloat(value) || 0;
    setCompressorInputs(p => ({ ...p, [id]: { ...p[id], totalLoaded: Math.min(n, p[id]?.totalRunning || 0) } }));
  };
  const calculateDailyFromInputs = (id: number) => {
    const inp = compressorInputs[id]; const prev = previousReadings[id];
    if (!inp || !prev) return { dailyRunning: 0, dailyLoaded: 0 };
    return { dailyRunning: Math.max(0, (inp.totalRunning || 0) - (prev.total_running_hours || 0)), dailyLoaded: Math.max(0, (inp.totalLoaded || 0) - (prev.total_loaded_hours || 0)) };
  };
  const getPreviousReadingInfo = (id: number) => {
    const prev = previousReadings[id];
    if (!prev) return { running: 0, loaded: 0, date: 'No previous reading' };
    return { running: prev.total_running_hours, loaded: prev.total_loaded_hours, date: prev.date === 'Initial' ? 'Initial' : new Date(prev.date).toLocaleDateString() };
  };
  const validateReading = (id: number, newRun: number, newLoad: number): boolean => {
    const prev = previousReadings[id];
    if (!prev) return true;
    if (newRun < prev.total_running_hours) { toast.error(`Running hours (${newRun}) < previous total (${prev.total_running_hours})`); return false; }
    if (newLoad < prev.total_loaded_hours) { toast.error(`Loaded hours (${newLoad}) < previous total (${prev.total_loaded_hours})`); return false; }
    const dr = newRun - prev.total_running_hours; const dl = newLoad - prev.total_loaded_hours;
    if (dl > dr) { toast.error(`Daily loaded (${dl.toFixed(1)}) > daily running (${dr.toFixed(1)})`); return false; }
    if (newLoad > newRun) { toast.error(`Total loaded (${newLoad}) > total running (${newRun})`); return false; }
    return true;
  };

  const updateCompressorHours = async (id: number, totalRunning: number, totalLoaded: number, pressure = 0, temperature = 0, notes = '') => {
    setIsSaving({ type: 'update', id });
    if (!validateReading(id, totalRunning, totalLoaded)) { setIsSaving({}); return; }
    try {
      const r = (await enhancedFetch(`${API_BASE_URL}/api/compressors/daily-entries/cumulative`, { method: 'POST', body: JSON.stringify({ compressor_id: id, date: getCurrentDateStr(), current_total_running: parseFloat(String(totalRunning)) || 0, current_total_loaded: parseFloat(String(totalLoaded)) || 0, pressure: parseFloat(String(pressure)) || 0, temperature: parseFloat(String(temperature)) || 0, notes }) })) as { data?: { total_running_hours?: number; total_loaded_hours?: number } };
      if (r.data) {
        setCompressors(p => p.map(c => c.id === id ? { ...c, total_running_hours: r.data!.total_running_hours ?? totalRunning, total_loaded_hours: r.data!.total_loaded_hours ?? totalLoaded } : c));
        setCompressorInputs(p => ({ ...p, [id]: { ...p[id], totalRunning: r.data!.total_running_hours ?? totalRunning, totalLoaded: r.data!.total_loaded_hours ?? totalLoaded } }));
        setPreviousReadings(p => ({ ...p, [id]: { total_running_hours: r.data!.total_running_hours ?? totalRunning, total_loaded_hours: r.data!.total_loaded_hours ?? totalLoaded, date: getCurrentDateStr() } }));
      }
      await Promise.all([fetchStats(), fetchUpcomingServices(), fetchPerformanceMetrics(), fetchComparisonAnalytics()]);
      toast.success('Compressor hours updated');
    } catch (e: unknown) { toast.error((e as Error).message || 'Failed to update hours'); }
    finally { setIsSaving({}); }
  };

  const addCompressor = async (data: AddCompressorFormData) => {
    setIsSaving({ type: 'add', id: 'new' });
    try { await enhancedFetch(`${API_BASE_URL}/api/compressors/compressors`, { method: 'POST', body: JSON.stringify(data) }); await fetchCompressors(); toast.success(`${data.name} added`); setShowAddCompressor(false); }
    catch (e: unknown) { toast.error((e as Error).message || 'Failed to add compressor'); }
    finally { setIsSaving({}); }
  };

  const updateCompressorStatus = async (id: number | null, status: string) => {
    setIsSaving({ type: 'status', id: id ?? undefined });
    try { await enhancedFetch(`${API_BASE_URL}/api/compressors/compressors/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }); await fetchCompressors(); toast.success(`Status updated to ${status}`); setStatusUpdateDialog({ open: false, compressorId: null, currentStatus: '' }); }
    catch (e: unknown) { toast.error((e as Error).message || 'Failed to update status'); }
    finally { setIsSaving({}); }
  };

  const markServiceCompleted = async (compressorId: number, serviceInterval: number) => {
    const comp = compressors.find(c => c.id === compressorId);
    if (!comp) return;
    try {
      await enhancedFetch(`${API_BASE_URL}/api/compressors/service-records`, { method: 'POST', body: JSON.stringify({ compressor_id: compressorId, service_type: `${serviceInterval} Hour Service`, service_date: new Date().toISOString().split('T')[0], running_hours_at_service: serviceInterval, description: `Completed ${serviceInterval} hour service`, is_completed: true }) });
      await updateCompressorHours(compressorId, serviceInterval, comp.total_loaded_hours, 0, 0, `${serviceInterval} hour service completed`);
      await fetchUpcomingServices();
      toast.success('Service marked as completed');
    } catch { toast.error('Failed to mark service as completed'); }
  };

  const generateCSVReport = async () => {
    try {
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const r = await fetch(`${API_BASE_URL}/api/compressors/export`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ start_date: startDate, end_date: new Date().toISOString().split('T')[0], format: 'csv' }) });
      if (!r.ok) throw new Error('Export failed');
      const blob = await r.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `compressor-report-${new Date().toISOString().split('T')[0]}.csv`; a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Report exported');
    } catch { toast.error('Failed to export report'); }
  };

  const importData = async (file: File) => {
    const fd = new FormData(); fd.append('file', file);
    try {
      const r = await fetch(`${API_BASE_URL}/api/compressors/import`, { method: 'POST', body: fd });
      if (!r.ok) throw new Error('Import failed');
      const result = await r.json() as { errors?: unknown[]; imported_count?: number };
      if (result.errors?.length) toast.warning(`Imported with ${result.errors.length} errors`);
      else toast.success(`Imported ${result.imported_count} compressors`);
      await loadAllData();
    } catch { toast.error('Failed to import data'); }
  };

  const filteredCompressors = useMemo(() => compressors.filter(c => {
    if (filters.location !== 'all' && c.location !== filters.location) return false;
    if (filters.status !== 'all' && c.status !== filters.status) return false;
    if (filters.search && !c.name.toLowerCase().includes(filters.search.toLowerCase())) return false;
    if (!showInactive && c.status === 'offline') return false;
    if (filters.showMaintenance) { const si = calculateNextService(c.total_running_hours); if (!si?.isUrgent) return false; }
    return true;
  }), [compressors, filters, showInactive, calculateNextService]);

  const inputCls = `w-full h-9 px-3 rounded-lg text-sm ${t.inputBg} focus:outline-none`;

  // ── Compressor Card ────────────────────────────────────────────────────────

  function CompressorCard({ compressor }: { compressor: Compressor }) {
    const inp = compressorInputs[compressor.id] || ({} as CompressorInput);
    const si = calculateNextService(compressor.total_running_hours);
    const { dailyRunning, dailyLoaded } = calculateDailyFromInputs(compressor.id);
    const efficiency = calculateEfficiency(dailyRunning, dailyLoaded);
    const eff = getEfficiencyStatus(efficiency);
    const prevInfo = getPreviousReadingInfo(compressor.id);
    const saving = isSaving.id === compressor.id;

    const handleSave = async () => {
      try { await updateCompressorHours(compressor.id, Number(inp.totalRunning) || 0, Number(inp.totalLoaded) || 0, Number(inp.pressure) || 0, Number(inp.temperature) || 0, inp.notes || ''); } catch { /* handled */ }
    };
    const handleCopyPrev = () => {
      setCompressorInputs(p => ({ ...p, [compressor.id]: { ...p[compressor.id], totalRunning: prevInfo.running || 0, totalLoaded: prevInfo.loaded || 0 } }));
      toast.success('Copied previous totals');
    };

    return (
      <GlowCard color={si?.isUrgent ? '#f43f5e' : ACCENT_HEX.blue} surface={`${t.glass} rounded-2xl`} className="overflow-hidden">
        <div className={`px-4 py-3 border-b ${t.border} flex items-center justify-between`}>
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-full ${t.chipBg} flex items-center justify-center`}><Gauge className="h-4 w-4 text-blue-400" /></div>
            <div>
              <div className={`font-semibold text-sm flex items-center gap-1.5 ${t.textPrimary}`}>
                {compressor.name}
                {si?.isUrgent && <span title={`Service due in ${si.daysRemaining} days`}><AlertTriangle className="h-3.5 w-3.5 text-rose-400" /></span>}
              </div>
              <div className={`text-xs ${t.textFaint}`}>{compressor.model} · {compressor.location}</div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={() => setStatusUpdateDialog({ open: true, compressorId: compressor.id, currentStatus: compressor.status })}>
              <StatusBadge color={STATUS_CONFIG[compressor.status]?.color ?? '#94a3b8'} label={STATUS_CONFIG[compressor.status]?.label ?? compressor.status} dot />
            </button>
            {si ? <StatusBadge color={URGENCY_COLOR[si.urgency] ?? URGENCY_COLOR.low} label={`${si.interval}h in ${si.daysRemaining}d`} /> : <StatusBadge color="#34d399" label="All done" />}
          </div>
        </div>

        <div className="p-4 space-y-3">
          <div className={`${t.chipBg} rounded-xl p-3`}>
            <div className="flex items-center justify-between text-xs mb-2">
              <span className={`font-medium ${t.textFaint}`}>Previous Reading</span>
              <span className={t.textFaint}>{prevInfo.date}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="text-center"><div className="text-sm font-semibold text-blue-400">{prevInfo.running.toFixed(1)}h</div><div className={`text-[10px] ${t.textFaint}`}>Running</div></div>
              <div className="text-center"><div className="text-sm font-semibold text-blue-400">{prevInfo.loaded.toFixed(1)}h</div><div className={`text-[10px] ${t.textFaint}`}>Loaded</div></div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-[10px] font-semibold uppercase tracking-wider ${t.textFaint}`}>Cumulative hours · {getCurrentDateStr()}</span>
              <button type="button" onClick={handleCopyPrev} className={`inline-flex items-center gap-1 text-[10px] ${t.textFaint} ${t.hoverText} transition-colors`}><Copy className="h-3 w-3" />Copy prev</button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <FormField label="Total Running (h)">
                <input type="number" step="0.1" aria-label="Total running hours" value={inp.totalRunning || ''} disabled={saving} placeholder="Enter total" onChange={e => handleRunningHoursChange(compressor.id, e.target.value)} className={inputCls} />
                <div className={`text-[10px] mt-0.5 flex justify-between ${t.textFaint}`}><span>Prev: {prevInfo.running.toFixed(1)}</span><span>Cur: {compressor.total_running_hours.toFixed(1)}</span></div>
              </FormField>
              <FormField label="Total Loaded (h)">
                <input type="number" step="0.1" aria-label="Total loaded hours" value={inp.totalLoaded || ''} disabled={saving} placeholder="Enter total" onChange={e => handleLoadedHoursChange(compressor.id, e.target.value)} className={inputCls} />
                <div className={`text-[10px] mt-0.5 flex justify-between ${t.textFaint}`}><span>Prev: {prevInfo.loaded.toFixed(1)}</span><span>Cur: {compressor.total_loaded_hours.toFixed(1)}</span></div>
              </FormField>
            </div>
          </div>

          {showDailyHours && (
            <div className="bg-blue-500/[0.08] rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-blue-400">Daily Calculated</span>
                <span className="flex items-center gap-1 text-[10px] text-blue-400/70"><Calculator className="h-3 w-3" />Auto</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center">
                  <div className="text-xl font-bold text-blue-400">{dailyRunning.toFixed(1)}h</div>
                  <div className={`text-[10px] ${t.textFaint}`}>Running Today</div>
                  <div className={`text-[10px] ${t.textFaint}`}>({prevInfo.running.toFixed(1)} → {inp.totalRunning || 0}h)</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-emerald-400">{dailyLoaded.toFixed(1)}h</div>
                  <div className={`text-[10px] ${t.textFaint}`}>Loaded Today</div>
                  <div className={`text-[10px] ${t.textFaint}`}>({prevInfo.loaded.toFixed(1)} → {inp.totalLoaded || 0}h)</div>
                </div>
              </div>
            </div>
          )}

          {dailyRunning > 0 && (
            <div className={`rounded-xl p-3 ${t.chipBg}`}>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className={`flex items-center gap-1.5 text-xs font-semibold ${t.textMuted}`}><TrendingUp className="h-3.5 w-3.5" />Efficiency</div>
                  <div className={`text-2xl font-bold mt-0.5 ${t.textPrimary}`}>{efficiency}%</div>
                  <div className={`text-[10px] ${t.textFaint}`}>{dailyLoaded.toFixed(1)}h / {dailyRunning.toFixed(1)}h</div>
                </div>
                <StatusBadge color={eff.color} label={eff.label} />
              </div>
              <ProgressBar value={efficiency} color={eff.color} showValue={false} />
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <FormField label="Pressure">
              <input type="number" step="0.1" aria-label="Pressure (psi)" value={inp.pressure || ''} disabled={saving} placeholder="0.0" onChange={e => setCompressorInputs(p => ({ ...p, [compressor.id]: { ...p[compressor.id], pressure: e.target.value } }))} className={inputCls} />
            </FormField>
            <FormField label="Temperature">
              <input type="number" step="0.1" aria-label="Temperature (°C)" value={inp.temperature || ''} disabled={saving} placeholder="0.0" onChange={e => setCompressorInputs(p => ({ ...p, [compressor.id]: { ...p[compressor.id], temperature: e.target.value } }))} className={inputCls} />
            </FormField>
          </div>

          <FormField label="Notes">
            <input type="text" aria-label="Notes" value={inp.notes || ''} disabled={saving} placeholder="Add notes…" onChange={e => setCompressorInputs(p => ({ ...p, [compressor.id]: { ...p[compressor.id], notes: e.target.value } }))} className={inputCls} />
          </FormField>

          <button type="button" onClick={handleSave} disabled={saving}
            className="w-full py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-br from-blue-500 to-blue-700 hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? <><Loader2 className="h-4 w-4 animate-spin" />Saving…</> : 'Save Entry'}
          </button>
        </div>
      </GlowCard>
    );
  }

  // ── Add Compressor Modal ─────────────────────────────────────────────────────

  function AddCompressorForm() {
    const [fd, setFd] = useState<AddCompressorFormData>({ name: '', model: '', capacity: '', location: 'Main Plant', status: 'standby', total_running_hours: 0, total_loaded_hours: 0, color: 'bg-blue-500' });
    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!fd.name || !fd.model || !fd.capacity) { toast.error('Please fill required fields'); return; }
      try { await addCompressor(fd); } catch { /* handled */ }
    };
    return (
      <CenterModal open={showAddCompressor} onClose={() => setShowAddCompressor(false)} title="Add New Compressor" accent="violet" width="max-w-2xl">
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Compressor Name" required><input className={inputCls} value={fd.name} onChange={e => setFd(p => ({ ...p, name: e.target.value }))} placeholder="Compressor #1" /></FormField>
            <FormField label="Model" required><input className={inputCls} value={fd.model} onChange={e => setFd(p => ({ ...p, model: e.target.value }))} placeholder="Atlas Copco GA37" /></FormField>
            <FormField label="Capacity" required><input className={inputCls} value={fd.capacity} onChange={e => setFd(p => ({ ...p, capacity: e.target.value }))} placeholder="37 kW" /></FormField>
            <FormField label="Location">
              <SelectField size="form" title="Location" value={fd.location} onChange={v => setFd(p => ({ ...p, location: v }))}
                options={LOCATIONS.map(l => ({ value: l, label: l }))} />
            </FormField>
            <FormField label="Total Running Hours"><input type="number" className={inputCls} value={String(fd.total_running_hours)} onChange={e => setFd(p => ({ ...p, total_running_hours: parseFloat(e.target.value) || 0 }))} /></FormField>
            <FormField label="Total Loaded Hours"><input type="number" className={inputCls} value={String(fd.total_loaded_hours)} onChange={e => setFd(p => ({ ...p, total_loaded_hours: parseFloat(e.target.value) || 0 }))} /></FormField>
            <FormField label="Initial Status">
              <SelectField size="form" title="Initial status" value={fd.status} onChange={v => setFd(p => ({ ...p, status: v }))}
                options={Object.entries(STATUS_CONFIG).map(([k, v]) => ({ value: k, label: v.label }))} />
            </FormField>
          </div>
          <div className={`flex gap-2 pt-2 border-t ${t.border}`}>
            <button type="button" onClick={() => setShowAddCompressor(false)} className={`flex-1 py-2.5 rounded-xl text-sm ${t.textMuted} ${t.hoverText} border ${t.border}`}>Cancel</button>
            <button type="submit" disabled={isSaving.type === 'add'} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-br from-blue-500 to-blue-700 hover:brightness-110 disabled:opacity-50 inline-flex items-center justify-center gap-2">
              {isSaving.type === 'add' ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Adding…</> : 'Add Compressor'}
            </button>
          </div>
        </form>
      </CenterModal>
    );
  }

  function StatusUpdateModal() {
    const [sel, setSel] = useState<string>(statusUpdateDialog.currentStatus);
    useEffect(() => setSel(statusUpdateDialog.currentStatus), [statusUpdateDialog.currentStatus]);
    return (
      <CenterModal open={statusUpdateDialog.open} onClose={() => setStatusUpdateDialog({ open: false, compressorId: null, currentStatus: '' })} title="Update Compressor Status" accent="violet" width="max-w-sm">
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
              const Icon = cfg.icon;
              return (
                <button key={key} type="button" onClick={() => setSel(key)}
                  className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${sel === key ? 'ring-1 ring-inset ring-white/20' : `${t.chipBg} border-transparent ${t.textFaint} ${t.hoverBg}`}`}
                  style={sel === key ? { background: `${cfg.color}22`, borderColor: `${cfg.color}55`, color: cfg.color } : undefined}>
                  <Icon className="h-5 w-5" /><span className="text-xs font-semibold">{cfg.label}</span>
                </button>
              );
            })}
          </div>
          <p className={`text-xs ${t.textFaint}`}>Current: <span className={`font-semibold ${t.textMuted}`}>{STATUS_CONFIG[statusUpdateDialog.currentStatus]?.label ?? 'Unknown'}</span></p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setStatusUpdateDialog({ open: false, compressorId: null, currentStatus: '' })} className={`flex-1 py-2.5 rounded-xl text-sm ${t.textMuted} ${t.hoverText} border ${t.border}`}>Cancel</button>
            <button type="button" onClick={() => updateCompressorStatus(statusUpdateDialog.compressorId, sel)} disabled={isSaving.type === 'status' || sel === statusUpdateDialog.currentStatus}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-br from-blue-500 to-blue-700 hover:brightness-110 disabled:opacity-50 inline-flex items-center justify-center gap-2">
              {isSaving.type === 'status' ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Updating…</> : 'Update Status'}
            </button>
          </div>
        </div>
      </CenterModal>
    );
  }

  async function downloadExcel() {
    try {
      const ExcelJS = (await import('exceljs')).default;
      const { saveAs } = await import('file-saver');
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Compressors');
      ws.columns = [
        { header: 'Name', key: 'name', width: 20 }, { header: 'Model', key: 'model', width: 20 },
        { header: 'Capacity', key: 'capacity', width: 14 }, { header: 'Location', key: 'location', width: 16 },
        { header: 'Status', key: 'status', width: 14 }, { header: 'Running Hours', key: 'running', width: 16 },
        { header: 'Loaded Hours', key: 'loaded', width: 16 },
      ];
      const hdr = ws.getRow(1);
      hdr.eachCell(cell => { cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 }; cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2A4D69' } }; });
      compressors.forEach(c => ws.addRow({ name: c.name, model: c.model, capacity: c.capacity, location: c.location, status: STATUS_CONFIG[c.status]?.label ?? c.status, running: `${c.total_running_hours.toFixed(1)}h`, loaded: `${c.total_loaded_hours.toFixed(1)}h` }));
      const buf = await wb.xlsx.writeBuffer();
      saveAs(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `compressors_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success('Excel exported');
    } catch (err) { toast.error(`Export failed: ${(err as Error).message}`); }
  }

  const tabs = [
    { key: 'daily', label: 'Daily View', icon: Calendar },
    { key: 'services', label: 'Services', icon: Wrench },
    { key: 'analytics', label: 'Analytics', icon: BarChart3 },
    { key: 'management', label: 'Management', icon: Settings },
  ];

  return (
    <main className="max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <PageHero
        icon={Gauge}
        accent="violet"
        crumbs={['Operations & Maintenance', 'Compressors']}
        title="Compressor Tracking"
        description="Daily readings, maintenance scheduling & efficiency tracking"
        statsOpen={sections.expanded.hero}
        actions={
          <>
            <button type="button" onClick={loadAllData} title="Refresh" className={`h-8 w-8 flex items-center justify-center rounded-lg ${t.hoverBg} ${t.textFaint} ${t.hoverText}`}><RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} /></button>
            <button type="button" onClick={downloadExcel} disabled={compressors.length === 0} title="Download Excel" className={`h-8 w-8 flex items-center justify-center rounded-lg ${t.hoverBg} ${t.textFaint} ${t.hoverText} disabled:opacity-40`}><Download className="h-4 w-4" /></button>
            <button type="button" onClick={() => setShowAddCompressor(true)} className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-[13px] font-semibold text-white bg-gradient-to-br from-blue-500 to-blue-700 hover:brightness-110 transition-all">
              <Plus className="h-3.5 w-3.5" /> Add Compressor
            </button>
          </>
        }
      >
        {stats && (
          <div className="flex flex-wrap gap-1">
            <StatTile icon={Gauge} color={ACCENT_HEX.blue} value={stats.total_compressors} label="Total Units" />
            <StatTile icon={Activity} color="#34d399" value={`${stats.total_running_hours?.toFixed(1) ?? 0}h`} label="Running Hours" />
            <StatTile icon={TrendingUp} color={ACCENT_HEX.violet} value={`${stats.avg_efficiency}%`} label="Avg Efficiency" />
            <StatTile icon={Wrench} color="#f59e0b" value={stats.upcoming_services} label="Upcoming Services" />
            <StatTile icon={AlertTriangle} color="#f43f5e" value={stats.urgent_alerts} label="Urgent Alerts" />
            <StatTile icon={CheckCircle2} color="#14b8a6" value={stats.active_compressors} label="Active" />
          </div>
        )}
      </PageHero>

      <div className={`${t.glass} rounded-2xl ${t.shadow} overflow-hidden`}>
        <div className={`flex gap-1 p-2 border-b ${t.border}`}>
          {tabs.map(tb => (
            <button key={tb.key} type="button" onClick={() => setActiveTab(tb.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold transition-all ${activeTab === tb.key ? 'bg-blue-500/20 text-blue-400' : `${t.textFaint} ${t.hoverText} ${t.hoverBg}`}`}>
              <tb.icon className="h-3.5 w-3.5" />{tb.label}
            </button>
          ))}
        </div>

        {/* ── DAILY VIEW ── */}
        {activeTab === 'daily' && (
          <div className="p-4 space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center gap-3">
              <div className="flex items-center gap-2">
                <button type="button" onClick={previousDay} title="Previous day" className={`h-8 w-8 flex items-center justify-center rounded-lg ${t.glassSoft} ${t.textFaint} ${t.hoverText}`}><ChevronLeft className="h-4 w-4" /></button>
                <span className={`text-sm font-semibold min-w-[110px] text-center ${t.textPrimary}`}>{mounted ? currentDate.toLocaleDateString() : ''}</span>
                <button type="button" onClick={nextDay} title="Next day" className={`h-8 w-8 flex items-center justify-center rounded-lg ${t.glassSoft} ${t.textFaint} ${t.hoverText}`}><ChevronRight className="h-4 w-4" /></button>
                <button type="button" onClick={goToToday} className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${t.textMuted} ${t.glassSoft} ${t.hoverText}`}>Today</button>
              </div>

              <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
                <div className="relative">
                  <Search className={`absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 pointer-events-none ${t.textFaint}`} />
                  <input type="text" aria-label="Search compressors" placeholder="Search…" value={filters.search} onChange={e => setFilters(p => ({ ...p, search: e.target.value }))} className={`w-40 h-8 pl-8 pr-3 rounded-lg text-sm ${t.inputBg} focus:outline-none`} />
                </div>
                <SelectField size="filter" title="Location" value={filters.location} onChange={v => setFilters(p => ({ ...p, location: v }))} className="w-36"
                  options={[{ value: 'all', label: 'All Locations' }, ...LOCATIONS.map(l => ({ value: l, label: l }))]} />
                <SelectField size="filter" title="Status" value={filters.status} onChange={v => setFilters(p => ({ ...p, status: v }))} className="w-32"
                  options={[{ value: 'all', label: 'All Status' }, ...Object.entries(STATUS_CONFIG).map(([k, v]) => ({ value: k, label: v.label }))]} />
                <ViewToggle value={viewMode} onChange={setViewMode} options={[{ value: 'card', icon: Grid, label: 'Card view' }, { value: 'list', icon: List, label: 'List view' }]} />
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              {[
                { label: 'Show Inactive', val: showInactive, set: setShowInactive },
                { label: 'Daily Hours', val: showDailyHours, set: setShowDailyHours },
                { label: 'Urgent Only', val: filters.showMaintenance, set: (v: boolean) => setFilters(p => ({ ...p, showMaintenance: v })) },
              ].map(({ label, val, set }) => (
                <button key={label} type="button" onClick={() => set(!val)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${val ? 'bg-blue-500/15 text-blue-400' : `${t.chipBg} ${t.textFaint} ${t.hoverText}`}`}>
                  <div className={`w-3 h-3 rounded-full border transition-all ${val ? 'bg-blue-400 border-blue-400' : `border ${t.border}`}`} />
                  {label}
                </button>
              ))}
            </div>

            {isLoading ? (
              <div className={`flex items-center justify-center py-12 gap-2 ${t.textFaint}`}><Loader2 className="h-5 w-5 animate-spin" /><span className="text-sm">Loading compressors…</span></div>
            ) : viewMode === 'card' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredCompressors.map(c => <CompressorCard key={c.id} compressor={c} />)}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className={`border-b ${t.border}`}>
                      {['Compressor', 'Status', 'Location', 'Total Running', 'Total Loaded', 'Next Service', ''].map(h => (
                        <th key={h} className={`py-3 px-3 text-left text-xs font-semibold uppercase tracking-wider ${t.textFaint}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCompressors.map(c => {
                      const si = calculateNextService(c.total_running_hours);
                      const isExp = expandedCompressor === c.id;
                      const prevInfo = getPreviousReadingInfo(c.id);
                      return (
                        <React.Fragment key={c.id}>
                          <tr className={`border-b ${t.border} ${t.hoverBgSoft} transition-colors`}>
                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-2.5">
                                <div className={`w-7 h-7 rounded-full ${t.chipBg} flex items-center justify-center`}><Gauge className="h-3.5 w-3.5 text-blue-400" /></div>
                                <div><div className={`font-medium ${t.textMuted}`}>{c.name}</div><div className={`text-xs ${t.textFaint}`}>{c.model}</div></div>
                              </div>
                            </td>
                            <td className="py-2.5 px-3">
                              <button type="button" onClick={() => setStatusUpdateDialog({ open: true, compressorId: c.id, currentStatus: c.status })}>
                                <StatusBadge color={STATUS_CONFIG[c.status]?.color ?? '#94a3b8'} label={STATUS_CONFIG[c.status]?.label ?? c.status} dot />
                              </button>
                            </td>
                            <td className={`py-2.5 px-3 ${t.textMuted}`}>{c.location}</td>
                            <td className="py-2.5 px-3"><div className="font-medium text-blue-400">{c.total_running_hours.toFixed(1)}h</div><div className={`text-xs ${t.textFaint}`}>Prev: {prevInfo.running.toFixed(1)}h</div></td>
                            <td className="py-2.5 px-3"><div className="font-medium text-blue-400">{c.total_loaded_hours.toFixed(1)}h</div><div className={`text-xs ${t.textFaint}`}>Prev: {prevInfo.loaded.toFixed(1)}h</div></td>
                            <td className="py-2.5 px-3">{si ? <span className="text-sm font-semibold" style={{ color: URGENCY_COLOR[si.urgency] }}>{si.interval}h in {si.daysRemaining}d</span> : <span className={t.textFaint}>—</span>}</td>
                            <td className="py-2.5 px-3">
                              <button type="button" onClick={() => setExpandedCompressor(isExp ? null : c.id)} className={`h-7 w-7 flex items-center justify-center rounded-md ${t.textFaint} ${t.hoverText} transition-colors`}>
                                {isExp ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              </button>
                            </td>
                          </tr>
                          {isExp && <tr className={`border-b ${t.border}`}><td colSpan={7} className="p-4"><CompressorCard compressor={c} /></td></tr>}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {!isLoading && filteredCompressors.length === 0 && (
              <div className="text-center py-12">
                <Gauge className={`h-12 w-12 ${t.textFaint} mx-auto mb-4`} />
                <p className={`text-sm font-medium ${t.textMuted}`}>No compressors found</p>
                <p className={`text-xs mt-1 mb-4 ${t.textFaint}`}>Adjust filters or add a new compressor</p>
                <button type="button" onClick={() => setShowAddCompressor(true)} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-br from-blue-500 to-blue-700 hover:brightness-110 transition-all">
                  <Plus className="h-4 w-4" />Add First Compressor
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── SERVICES ── */}
        {activeTab === 'services' && (
          <div className="p-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 space-y-3">
                <p className={`text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 ${t.textFaint}`}><Wrench className="h-3.5 w-3.5" />Upcoming Services</p>
                {upcomingServices.map(svc => (
                  <GlowCard key={`${svc.compressor_id}-${svc.service_interval}`} color={svc.urgency === 'critical' || svc.urgency === 'high' ? '#f43f5e' : ACCENT_HEX.blue}
                    surface={`${t.glass} rounded-xl`} className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-full ${t.chipBg} flex items-center justify-center`}><Gauge className="h-4 w-4 text-blue-400" /></div>
                        <div><div className={`font-semibold ${t.textMuted}`}>{svc.compressor_name}</div><div className={`text-xs ${t.textFaint}`}>Current: {svc.current_hours}h · Next: {svc.next_service_hours}h</div></div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold" style={{ color: URGENCY_COLOR[svc.urgency] }}>{svc.service_interval}h</div>
                        <div className={`text-xs ${t.textFaint}`}>{svc.hours_remaining}h remaining</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3 mb-3 text-xs">
                      {[{ l: 'Current Hours', v: `${svc.current_hours}h` }, { l: 'Days Until', v: `${svc.days_remaining}d` }].map(({ l, v }) => (
                        <div key={l} className={`${t.chipBg} rounded-lg p-2`}><div className={t.textFaint}>{l}</div><div className={`font-semibold mt-0.5 ${t.textMuted}`}>{v}</div></div>
                      ))}
                      <div className={`${t.chipBg} rounded-lg p-2`}><div className={`mb-0.5 ${t.textFaint}`}>Urgency</div><StatusBadge color={URGENCY_COLOR[svc.urgency] ?? URGENCY_COLOR.low} label={svc.urgency} /></div>
                    </div>
                    <ProgressBar value={(svc.current_hours / svc.next_service_hours) * 100} color={ACCENT_HEX.blue} showValue={false} />
                    <button type="button" onClick={() => markServiceCompleted(svc.compressor_id, svc.service_interval)} disabled={isSaving.id === svc.compressor_id}
                      className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-gradient-to-br from-emerald-500 to-emerald-700 hover:brightness-110 disabled:opacity-50 transition-all">
                      {isSaving.id === svc.compressor_id ? <><Loader2 className="h-3 w-3 animate-spin" />Processing…</> : <><CheckCircle2 className="h-3.5 w-3.5" />Mark as Done</>}
                    </button>
                  </GlowCard>
                ))}
                {upcomingServices.length === 0 && (
                  <div className="text-center py-10"><CheckCheck className="h-10 w-10 text-emerald-400/50 mx-auto mb-3" /><p className={`text-sm font-medium ${t.textFaint}`}>All compressors up to date</p></div>
                )}
              </div>

              <div className="space-y-4">
                <div className={`${t.glass} rounded-xl overflow-hidden`}>
                  <div className={`px-4 py-3 border-b ${t.border}`}><p className={`text-xs font-semibold uppercase tracking-wider ${t.textFaint}`}>Service Intervals</p></div>
                  <div className="p-3 space-y-2">
                    {SERVICE_INTERVALS.map(iv => (
                      <div key={iv} className={`flex items-center justify-between px-3 py-2 ${t.chipBg} rounded-xl`}>
                        <div className="flex items-center gap-2"><Timer className="h-3.5 w-3.5 text-blue-400" /><span className={`text-sm font-semibold ${t.textMuted}`}>{iv}h</span></div>
                        <span className={`text-xs ${t.textFaint}`}>{compressors.filter(c => calculateNextService(c.total_running_hours)?.interval === iv).length} due</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className={`${t.glass} rounded-xl overflow-hidden`}>
                  <div className={`px-4 py-3 border-b ${t.border}`}><p className={`text-xs font-semibold uppercase tracking-wider ${t.textFaint}`}>Export Data</p></div>
                  <div className="p-3 space-y-2">
                    <button type="button" onClick={generateCSVReport} className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm ${t.textMuted} ${t.chipBg} ${t.hoverBg} transition-all`}><FileText className="h-4 w-4 text-blue-400" />Export to CSV</button>
                    <label className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm ${t.textMuted} ${t.chipBg} ${t.hoverBg} transition-all cursor-pointer`}>
                      <Upload className="h-4 w-4 text-amber-400" />Import from CSV
                      <input type="file" accept=".csv" aria-label="Import CSV file" className="hidden" onChange={async e => { const f = e.target.files?.[0]; if (f) { try { await importData(f); } catch { /* handled */ } } }} />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── ANALYTICS ── */}
        {activeTab === 'analytics' && (
          <div className="p-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 space-y-4">
                <div className={`${t.glass} rounded-xl overflow-hidden`}>
                  <div className={`px-4 py-3 border-b ${t.border} flex items-center justify-between`}>
                    <p className={`text-xs font-semibold uppercase tracking-wider ${t.textFaint}`}>Performance Metrics</p>
                    <SelectField size="filter" title="Period" value={analyticsPeriod} onChange={v => { setAnalyticsPeriod(v); fetchPerformanceMetrics(v === 'weekly' ? 7 : v === 'monthly' ? 30 : 90); }} className="w-36"
                      options={[{ value: 'weekly', label: 'Last 7 Days' }, { value: 'monthly', label: 'Last 30 Days' }, { value: 'quarterly', label: 'Last 90 Days' }]} />
                  </div>
                  {analyticsData.performanceMetrics.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className={`border-b ${t.border}`}>
                            {['Compressor', 'Avg Efficiency', 'Avg Daily', 'Total Hours', 'Downtime', 'Services'].map(h => (
                              <th key={h} className={`py-2.5 px-3 text-left text-xs font-semibold uppercase tracking-wider ${t.textFaint}`}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {analyticsData.performanceMetrics.map(m => (
                            <tr key={m.compressor_id} className={`border-b ${t.border} ${t.hoverBgSoft} transition-colors`}>
                              <td className={`py-2.5 px-3 font-medium ${t.textMuted}`}>{m.compressor_name}</td>
                              <td className="py-2.5 px-3">
                                <div className="flex items-center gap-1.5">
                                  <div className={`w-2 h-2 rounded-full ${m.avg_efficiency >= 80 ? 'bg-emerald-500' : m.avg_efficiency >= 60 ? 'bg-blue-500' : m.avg_efficiency >= 40 ? 'bg-amber-500' : 'bg-rose-500'}`} />
                                  <span className={t.textMuted}>{m.avg_efficiency}%</span>
                                </div>
                              </td>
                              <td className={`py-2.5 px-3 ${t.textFaint}`}>{m.avg_daily_running_hours.toFixed(1)}h / {m.avg_daily_loaded_hours.toFixed(1)}h</td>
                              <td className={`py-2.5 px-3 ${t.textFaint}`}>{m.total_running_hours.toFixed(1)}h / {m.total_loaded_hours.toFixed(1)}h</td>
                              <td className="py-2.5 px-3"><div className="flex items-center gap-1.5"><ProgressBar value={m.downtime_percentage} color="#f43f5e" showValue={false} /><span className={`text-xs ${t.textFaint}`}>{m.downtime_percentage.toFixed(1)}%</span></div></td>
                              <td className="py-2.5 px-3"><StatusBadge color="#94a3b8" label={String(m.service_count)} /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-10"><BarChart3 className={`h-10 w-10 ${t.textFaint} mx-auto mb-3`} /><p className={`text-sm ${t.textFaint}`}>No performance data available</p></div>
                  )}
                </div>

                <div className={`${t.glass} rounded-xl overflow-hidden`}>
                  <div className={`px-4 py-3 border-b ${t.border}`}><p className={`text-xs font-semibold uppercase tracking-wider ${t.textFaint}`}>Trend Analysis</p></div>
                  {analyticsData.trends.success && analyticsData.trends.data.length > 0 ? (
                    <div className="p-4 space-y-3">
                      {analyticsData.trends.data.slice(0, 5).map((trend, i) => (
                        <div key={i} className={`${t.chipBg} rounded-xl p-3`}>
                          <div className="flex items-center justify-between mb-2">
                            <span className={`font-medium ${t.textMuted}`}>{trend.compressor_name}</span>
                            <StatusBadge color={trend.efficiency_trend === 'improving' ? '#34d399' : trend.efficiency_trend === 'declining' ? '#f43f5e' : '#94a3b8'} label={trend.efficiency_trend === 'improving' ? '↑ Improving' : trend.efficiency_trend === 'declining' ? '↓ Declining' : '→ Stable'} />
                          </div>
                          <div className="grid grid-cols-3 gap-3 text-xs">
                            {[{ l: 'Efficiency', v: `${trend.avg_efficiency}%` }, { l: 'Running', v: `${trend.total_running_hours?.toFixed(1) ?? 0}h` }, { l: 'Loaded', v: `${trend.total_loaded_hours?.toFixed(1) ?? 0}h` }].map(({ l, v }) => (
                              <div key={l}><div className={t.textFaint}>{l}</div><div className={`font-semibold mt-0.5 ${t.textMuted}`}>{v}</div></div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-10"><TrendingUp className={`h-10 w-10 ${t.textFaint} mx-auto mb-3`} /><p className={`text-sm ${t.textFaint}`}>{analyticsData.trends.message || 'Add 7 days of readings to see trends'}</p></div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div className={`${t.glass} rounded-xl overflow-hidden`}>
                  <div className={`px-4 py-3 border-b ${t.border} flex items-center justify-between`}>
                    <p className={`text-xs font-semibold uppercase tracking-wider ${t.textFaint}`}>Comparison</p>
                    <SelectField size="filter" title="Metric" value={analyticsMetric} onChange={v => { setAnalyticsMetric(v); fetchComparisonAnalytics(v); }} className="w-32"
                      options={[{ value: 'efficiency', label: 'Efficiency' }, { value: 'running_hours', label: 'Running Hrs' }, { value: 'loaded_hours', label: 'Loaded Hrs' }]} />
                  </div>
                  <div className="p-3 space-y-2">
                    {analyticsData.comparison.success && analyticsData.comparison.data.length > 0 ? (
                      analyticsData.comparison.data.slice(0, 5).map(item => (
                        <div key={item.compressor_id} className={`flex items-center justify-between ${t.chipBg} rounded-xl px-3 py-2`}>
                          <div><div className={`font-medium text-sm ${t.textMuted}`}>{item.compressor_name}</div><div className={`text-xs ${t.textFaint}`}>{item.location}</div></div>
                          <div className="text-right"><div className={`font-semibold ${t.textMuted}`}>{item.value}{analyticsMetric === 'efficiency' ? '%' : 'h'}</div><StatusBadge color={RATING_COLOR[item.rating] ?? RATING_COLOR.Poor} label={item.rating} /></div>
                        </div>
                      ))
                    ) : <div className={`text-center py-4 text-sm ${t.textFaint}`}>{analyticsData.comparison.message || 'No comparison data'}</div>}
                  </div>
                </div>

                {analyticsData.performanceMetrics.length > 0 && (
                  <div className={`${t.glass} rounded-xl overflow-hidden`}>
                    <div className={`px-4 py-3 border-b ${t.border}`}><p className={`text-xs font-semibold uppercase tracking-wider ${t.textFaint}`}>Key Insights</p></div>
                    <div className="p-3 space-y-2">
                      {(() => {
                        const best = [...analyticsData.performanceMetrics].sort((a, b) => b.avg_efficiency - a.avg_efficiency)[0];
                        const mostActive = [...analyticsData.performanceMetrics].sort((a, b) => b.total_running_hours - a.total_running_hours)[0];
                        const needsAtt = analyticsData.performanceMetrics.filter(m => m.downtime_percentage > 20 || m.avg_efficiency < 40);
                        return (
                          <>
                            {best && <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10"><TrendingUp className="h-4 w-4 text-emerald-400 shrink-0" /><div><div className="text-xs font-semibold text-emerald-400">Best Performer</div><div className={`text-xs ${t.textFaint}`}>{best.compressor_name} ({best.avg_efficiency}%)</div></div></div>}
                            {mostActive && <div className="flex items-center gap-2 p-3 rounded-xl bg-blue-500/10"><Activity className="h-4 w-4 text-blue-400 shrink-0" /><div><div className="text-xs font-semibold text-blue-400">Most Active</div><div className={`text-xs ${t.textFaint}`}>{mostActive.compressor_name} ({mostActive.total_running_hours}h)</div></div></div>}
                            {needsAtt.length > 0 && <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/10"><AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" /><div><div className="text-xs font-semibold text-amber-400">Needs Attention</div><div className={`text-xs ${t.textFaint}`}>{needsAtt.length} compressor{needsAtt.length > 1 ? 's' : ''}</div></div></div>}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── MANAGEMENT ── */}
        {activeTab === 'management' && (
          <div className="p-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className={`${t.glass} rounded-xl overflow-hidden`}>
                <div className={`px-4 py-3 border-b ${t.border}`}><p className={`text-xs font-semibold uppercase tracking-wider ${t.textFaint}`}>System Summary</p></div>
                {managementData.summary ? (
                  <div className="p-4 space-y-4">
                    <div>
                      <p className={`text-xs font-semibold uppercase tracking-wider mb-2 ${t.textFaint}`}>Status Distribution</p>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(managementData.summary.status_distribution).map(([st, cnt]) => {
                          const cfg = STATUS_CONFIG[st]; if (!cfg) return null;
                          const Icon = cfg.icon;
                          return (
                            <div key={st} className="flex items-center gap-2 p-3 rounded-xl" style={{ background: `${cfg.color}18`, color: cfg.color }}>
                              <Icon className="h-4 w-4" /><div><div className="text-xl font-bold">{cnt}</div><div className="text-xs">{cfg.label}</div></div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div>
                      <p className={`text-xs font-semibold uppercase tracking-wider mb-2 ${t.textFaint}`}>Location Distribution</p>
                      <div className="space-y-2">
                        {Object.entries(managementData.summary.location_distribution).map(([loc, cnt]) => (
                          <div key={loc} className="flex items-center justify-between text-sm">
                            <span className={t.textFaint}>{loc}</span>
                            <div className="flex items-center gap-2"><span className={`font-semibold ${t.textMuted}`}>{cnt}</span><div className="w-24"><ProgressBar value={(cnt / (managementData.summary?.total_compressors || 1)) * 100} color={ACCENT_HEX.blue} showValue={false} /></div></div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className={`text-xs font-semibold uppercase tracking-wider mb-2 ${t.textFaint}`}>Age Distribution</p>
                      <div className="grid grid-cols-4 gap-2">
                        {[{ v: managementData.summary.age_distribution.less_than_year ?? 0, l: '< 1yr' }, { v: managementData.summary.age_distribution["1_3_years"] ?? 0, l: '1-3yr' }, { v: managementData.summary.age_distribution["3_5_years"] ?? 0, l: '3-5yr' }, { v: managementData.summary.age_distribution.more_than_5 ?? 0, l: '> 5yr' }].map(({ v, l }) => (
                          <div key={l} className={`text-center ${t.chipBg} rounded-xl p-2`}><div className="text-lg font-bold text-blue-400">{v}</div><div className={`text-[10px] ${t.textFaint}`}>{l}</div></div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : <div className="text-center py-10"><Settings className={`h-10 w-10 ${t.textFaint} mx-auto mb-3`} /><p className={`text-sm ${t.textFaint}`}>Loading management data…</p></div>}
              </div>

              <div className="space-y-4">
                <div className={`${t.glass} rounded-xl overflow-hidden`}>
                  <div className={`px-4 py-3 border-b ${t.border} flex items-center justify-between`}>
                    <p className={`text-xs font-semibold uppercase tracking-wider ${t.textFaint}`}>Recent Alerts</p>
                    <StatusBadge color={(managementData.summary?.unread_alerts ?? 0) > 0 ? '#f43f5e' : '#94a3b8'} label={`${managementData.summary?.unread_alerts ?? 0} unread`} />
                  </div>
                  {managementData.summary?.recent_alerts?.length ? (
                    <div className="p-3 space-y-2">
                      {managementData.summary.recent_alerts.slice(0, 5).map(a => (
                        <div key={a.id} className={`p-3 rounded-xl text-sm ${a.severity === 'critical' ? 'bg-rose-500/10' : a.severity === 'error' ? 'bg-amber-500/10' : 'bg-yellow-500/10'}`}>
                          <div className="flex items-start justify-between">
                            <div><div className={`font-medium ${t.textMuted}`}>{a.title}</div><div className={`text-xs mt-0.5 ${t.textFaint}`}>{a.message}</div></div>
                            {!a.is_read && <StatusBadge color="#f43f5e" label="New" />}
                          </div>
                          <div className={`text-[10px] mt-1.5 ${t.textFaint}`}>{new Date(a.created_at).toLocaleDateString()}</div>
                        </div>
                      ))}
                    </div>
                  ) : <div className="text-center py-6"><CheckCircle2 className="h-8 w-8 text-emerald-400/50 mx-auto mb-2" /><p className={`text-sm ${t.textFaint}`}>No recent alerts</p></div>}
                </div>

                <div className={`${t.glass} rounded-xl overflow-hidden`}>
                  <div className={`px-4 py-3 border-b ${t.border}`}><p className={`text-xs font-semibold uppercase tracking-wider ${t.textFaint}`}>Recent Services</p></div>
                  {managementData.summary?.recent_services?.length ? (
                    <div className="p-3 space-y-2">
                      {managementData.summary.recent_services.slice(0, 5).map(s => (
                        <div key={s.id} className={`${t.chipBg} rounded-xl p-3`}>
                          <div className="flex items-center justify-between mb-1.5"><span className={`font-medium text-sm ${t.textMuted}`}>{s.service_type}</span><StatusBadge color="#34d399" label="Completed" /></div>
                          <p className={`text-xs mb-1 ${t.textFaint}`}>{s.description}</p>
                          <div className={`flex items-center justify-between text-[10px] ${t.textFaint}`}><span>{s.service_date}</span><span>{s.running_hours_at_service}h</span></div>
                        </div>
                      ))}
                    </div>
                  ) : <div className="text-center py-6"><Wrench className={`h-8 w-8 ${t.textFaint} mx-auto mb-2`} /><p className={`text-sm ${t.textFaint}`}>No recent services</p></div>}
                </div>

                <div className={`${t.glass} rounded-xl overflow-hidden`}>
                  <div className={`px-4 py-3 border-b ${t.border}`}><p className={`text-xs font-semibold uppercase tracking-wider ${t.textFaint}`}>System Actions</p></div>
                  <div className="p-3 space-y-2">
                    {[
                      { icon: RefreshCw, label: 'Refresh All Data', fn: loadAllData, cls: 'text-blue-400' },
                      { icon: Download, label: 'Export System Report', fn: generateCSVReport, cls: 'text-emerald-400' },
                    ].map(({ icon: Ic, label, fn, cls }) => (
                      <button key={label} type="button" onClick={fn} className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm ${t.textMuted} ${t.chipBg} ${t.hoverBg} transition-all`}>
                        <Ic className={`h-4 w-4 ${cls}`} />{label}
                      </button>
                    ))}
                    <button type="button" onClick={() => {
                      const data = { compressors, stats, upcomingServices, analytics: analyticsData, management: managementData, exportDate: new Date().toISOString() };
                      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a'); a.href = url; a.download = `system-backup-${new Date().toISOString().split('T')[0]}.json`; a.click();
                      toast.success('System backup exported');
                    }} className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm ${t.textMuted} ${t.chipBg} ${t.hoverBg} transition-all`}>
                      <Save className="h-4 w-4 text-amber-400" />Backup System Data
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <p className={`text-center text-xs ${t.textFaint}`}>
        Connected to {API_BASE_URL} · {compressors.length} compressors{mounted ? ` · Last updated ${new Date().toLocaleTimeString()}` : ''}
      </p>

      <AddCompressorForm />
      <StatusUpdateModal />
    </main>
  );
}

export default function CompressorsPage() {
  return (
    <AppShell>
      <CompressorReadingsSystem />
    </AppShell>
  );
}
