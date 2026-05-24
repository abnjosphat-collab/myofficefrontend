// app/compressors/page.tsx
'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import {
  Calendar, Download, ChevronLeft, ChevronRight, Settings, Search,
  BarChart3, Clock, AlertTriangle, CheckCircle2, TrendingUp, Gauge,
  Power, Activity, FileText, Plus, Trash2, List, Grid, Wrench,
  Calculator, TrendingDown, CheckCheck, Timer, RotateCcw, Save, Upload,
  ChevronDown, ChevronUp, Copy, Loader2, RefreshCw, Zap, Filter,
  XCircle,
} from 'lucide-react';
import { PageShell } from '@/components/PageShell';
import {
  HeroPanel, GlassPanel, GlassModal, GlassInput, GlassSelect, GlassProgress,
  usePageCollapse, MasterCollapseButton, DownloadButton, type DLColumn,
} from '@/components/shared';

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

const STATUS_CONFIG: Record<string, { label: string; glass: string; icon: React.ElementType }> = {
  running:     { label: 'Running',     glass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', icon: Activity },
  standby:     { label: 'Standby',     glass: 'bg-blue-500/20 text-blue-300 border-blue-500/30',         icon: Power },
  maintenance: { label: 'Maintenance', glass: 'bg-amber-500/20 text-amber-300 border-amber-500/30',      icon: AlertTriangle },
  offline:     { label: 'Offline',     glass: 'bg-rose-500/20 text-rose-300 border-rose-500/30',         icon: XCircle },
};

const LOCATIONS = ['Main Plant', 'Production', 'Auxiliary', 'Workshop', 'Storage', 'Packaging', 'Shipping', 'Receiving'];

const URGENCY_GLASS: Record<string, string> = {
  critical: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
  high:     'bg-orange-500/20 text-orange-300 border-orange-500/30',
  medium:   'bg-amber-500/20 text-amber-300 border-amber-500/30',
  low:      'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
};

const RATING_GLASS: Record<string, string> = {
  Excellent: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  Good:      'bg-blue-500/20 text-blue-300 border-blue-500/30',
  Fair:      'bg-amber-500/20 text-amber-300 border-amber-500/30',
  Poor:      'bg-rose-500/20 text-rose-300 border-rose-500/30',
};

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

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const glassFieldBase = 'w-full bg-white/[0.07] border border-white/[0.12] rounded-xl text-sm text-white placeholder:text-white/25 h-9 px-3 focus:outline-none focus:border-[#86BBD8]/50 transition-colors disabled:opacity-50';

const fieldLbl = 'block text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-1';

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

const CompressorReadingsSystem = () => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [compressors, setCompressors] = useState<Compressor[]>([]);
  const [activeTab, setActiveTab] = useState<string>('daily');
  const [viewMode, setViewMode] = useState<string>('card');
  const [showInactive, setShowInactive] = useState(true);
  const [showDailyHours, setShowDailyHours] = useState(true);
  const [defaultOperatingHours, setDefaultOperatingHours] = useState(8);
  const [maintenanceBufferDays, setMaintenanceBufferDays] = useState(7);
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

  const collapse = usePageCollapse({ hero: false, daily: false, services: false, analytics: false, management: false });

  // ── Init ──────────────────────────────────────────────────────────────────

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

  // ── Data fetching ──────────────────────────────────────────────────────────

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
          if (prev) {
            prevData[c.id] = { total_running_hours: prev.total_running_hours, total_loaded_hours: prev.total_loaded_hours, date: prev.date };
          } else {
            prevData[c.id] = { total_running_hours: c.initial_total_running || 0, total_loaded_hours: c.initial_total_loaded || 0, date: 'Initial' };
          }
        }
      } catch { /* ignore per-compressor errors */ }
    }
    setPreviousReadings(prevData);
  };

  const fetchStats = async () => {
    try { setStats((await enhancedFetch(`${API_BASE_URL}/api/compressors/stats`)) as CompressorStats); } catch { setStats(null); }
  };

  const fetchUpcomingServices = async () => {
    try { setUpcomingServices(((await enhancedFetch(`${API_BASE_URL}/api/compressors/service-due`)) as UpcomingService[]) || []); } catch { setUpcomingServices([]); }
  };

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
    try {
      await Promise.all([fetchCompressors(), fetchStats(), fetchUpcomingServices(), fetchPerformanceMetrics(), fetchTrendAnalysis(), fetchComparisonAnalytics(), fetchManagementSummary()]);
    } catch (e: unknown) { toast.error((e as Error).message || 'Failed to load data'); }
    finally { setIsLoading(false); }
  };

  // ── Date navigation ────────────────────────────────────────────────────────

  const getCurrentDateStr = useCallback(() => currentDate.toISOString().split('T')[0], [currentDate]);
  const previousDay = () => setCurrentDate(p => { const d = new Date(p); d.setDate(d.getDate() - 1); return d; });
  const nextDay    = () => setCurrentDate(p => { const d = new Date(p); d.setDate(d.getDate() + 1); return d; });
  const goToToday  = () => setCurrentDate(new Date());

  // ── Calculations ───────────────────────────────────────────────────────────

  const calculateEfficiency = useCallback((running: number, loaded: number) => {
    if (!running) return 0;
    return parseFloat(((loaded / running) * 100).toFixed(1));
  }, []);

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
    if (e >= 80) return { label: 'Excellent', glass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', bar: 'bg-emerald-500' };
    if (e >= 60) return { label: 'Good',      glass: 'bg-blue-500/20 text-blue-300 border-blue-500/30',         bar: 'bg-blue-500' };
    if (e >= 40) return { label: 'Fair',      glass: 'bg-amber-500/20 text-amber-300 border-amber-500/30',      bar: 'bg-amber-500' };
    return              { label: 'Poor',      glass: 'bg-rose-500/20 text-rose-300 border-rose-500/30',         bar: 'bg-rose-500' };
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
    const inp = compressorInputs[id];
    const prev = previousReadings[id];
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
    const dr = newRun - prev.total_running_hours;
    const dl = newLoad - prev.total_loaded_hours;
    if (dl > dr) { toast.error(`Daily loaded (${dl.toFixed(1)}) > daily running (${dr.toFixed(1)})`); return false; }
    if (newLoad > newRun) { toast.error(`Total loaded (${newLoad}) > total running (${newRun})`); return false; }
    return true;
  };

  // ── API Actions ────────────────────────────────────────────────────────────

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
    try {
      await enhancedFetch(`${API_BASE_URL}/api/compressors/compressors`, { method: 'POST', body: JSON.stringify(data) });
      await fetchCompressors();
      toast.success(`${data.name} added`);
      setShowAddCompressor(false);
    } catch (e: unknown) { toast.error((e as Error).message || 'Failed to add compressor'); }
    finally { setIsSaving({}); }
  };

  const updateCompressorStatus = async (id: number | null, status: string) => {
    setIsSaving({ type: 'status', id: id ?? undefined });
    try {
      await enhancedFetch(`${API_BASE_URL}/api/compressors/compressors/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
      await fetchCompressors();
      toast.success(`Status updated to ${status}`);
      setStatusUpdateDialog({ open: false, compressorId: null, currentStatus: '' });
    } catch (e: unknown) { toast.error((e as Error).message || 'Failed to update status'); }
    finally { setIsSaving({}); }
  };

  const deleteCompressor = async (id: number) => {
    try {
      await enhancedFetch(`${API_BASE_URL}/api/compressors/compressors/${id}`, { method: 'DELETE' });
      await Promise.all([fetchCompressors(), fetchStats(), fetchUpcomingServices()]);
      toast.success('Compressor deleted');
    } catch { toast.error('Failed to delete compressor'); }
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

  // ── Derived ────────────────────────────────────────────────────────────────

  const filteredCompressors = useMemo(() => compressors.filter(c => {
    if (filters.location !== 'all' && c.location !== filters.location) return false;
    if (filters.status !== 'all' && c.status !== filters.status) return false;
    if (filters.search && !c.name.toLowerCase().includes(filters.search.toLowerCase())) return false;
    if (!showInactive && c.status === 'offline') return false;
    if (filters.showMaintenance) { const si = calculateNextService(c.total_running_hours); if (!si?.isUrgent) return false; }
    return true;
  }), [compressors, filters, showInactive, calculateNextService]);

  // ─────────────────────────────────────────────────────────────────────────────────
  // SUB-COMPONENTS
  // ─────────────────────────────────────────────────────────────────────────────────

  const StatusBadge = React.memo(({ status, onClick }: { status: string; onClick?: () => void }) => {
    const cfg = STATUS_CONFIG[status];
    if (!cfg) return null;
    const Icon = cfg.icon;
    return (
      <span onClick={onClick} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border cursor-pointer hover:opacity-80 transition-opacity ${cfg.glass}`}>
        <Icon className="h-2.5 w-2.5" />{cfg.label}
      </span>
    );
  });
  StatusBadge.displayName = 'StatusBadge';

  const ServiceBadge = React.memo(({ compressor }: { compressor: Compressor }) => {
    const si = calculateNextService(compressor.total_running_hours);
    if (!si) return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border bg-emerald-500/20 text-emerald-300 border-emerald-500/30"><CheckCheck className="h-2.5 w-2.5" />All done</span>;
    return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${URGENCY_GLASS[si.urgency] ?? URGENCY_GLASS.low}`}><AlertTriangle className="h-2.5 w-2.5" />{si.interval}h in {si.daysRemaining}d</span>;
  });
  ServiceBadge.displayName = 'ServiceBadge';

  // Compressor Card
  const CompressorCard = React.memo(({ compressor }: { compressor: Compressor }) => {
    const inp = compressorInputs[compressor.id] || {};
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
      <div className={`oz-glass-dark rounded-2xl overflow-hidden ${si?.isUrgent ? 'ring-1 ring-rose-500/40' : ''}`}>
        <div className="px-4 py-3 border-b border-white/[0.07] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-[#2A4D69]/60 border border-[#86BBD8]/25 flex items-center justify-center">
              <Gauge className="h-4 w-4 text-[#86BBD8]" />
            </div>
            <div>
              <div className="font-semibold text-white text-sm flex items-center gap-1.5">
                {compressor.name}
                {si?.isUrgent && <span title={`Service due in ${si.daysRemaining} days`}><AlertTriangle className="h-3.5 w-3.5 text-rose-400" /></span>}
              </div>
              <div className="text-xs text-white/40">{compressor.model} · {compressor.location}</div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <StatusBadge status={compressor.status} onClick={() => setStatusUpdateDialog({ open: true, compressorId: compressor.id, currentStatus: compressor.status })} />
            <ServiceBadge compressor={compressor} />
          </div>
        </div>

        <div className="p-4 space-y-3">
          {/* Previous reading */}
          <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-3">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-white/50 font-medium">Previous Reading</span>
              <span className="text-white/35">{prevInfo.date}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="text-center">
                <div className="text-sm font-semibold text-[#86BBD8]">{prevInfo.running.toFixed(1)}h</div>
                <div className="text-[10px] text-white/35">Running</div>
              </div>
              <div className="text-center">
                <div className="text-sm font-semibold text-[#86BBD8]">{prevInfo.loaded.toFixed(1)}h</div>
                <div className="text-[10px] text-white/35">Loaded</div>
              </div>
            </div>
          </div>

          {/* Cumulative input */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className={fieldLbl}>Cumulative hours · {getCurrentDateStr()}</span>
              <button type="button" onClick={handleCopyPrev} className="inline-flex items-center gap-1 text-[10px] text-white/40 hover:text-white/70 transition-colors">
                <Copy className="h-3 w-3" />Copy prev
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={fieldLbl}>Total Running (h)</label>
                <div className="relative">
                  <input type="number" step="0.1" aria-label="Total running hours" value={inp.totalRunning || ''} disabled={saving} placeholder="Enter total"
                    onChange={e => handleRunningHoursChange(compressor.id, e.target.value)}
                    className={`${glassFieldBase} pr-7`} />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-white/30">h</span>
                </div>
                <div className="text-[10px] text-white/30 mt-0.5 flex justify-between">
                  <span>Prev: {prevInfo.running.toFixed(1)}</span>
                  <span>Cur: {compressor.total_running_hours.toFixed(1)}</span>
                </div>
              </div>
              <div>
                <label className={fieldLbl}>Total Loaded (h)</label>
                <div className="relative">
                  <input type="number" step="0.1" aria-label="Total loaded hours" value={inp.totalLoaded || ''} disabled={saving} placeholder="Enter total"
                    onChange={e => handleLoadedHoursChange(compressor.id, e.target.value)}
                    className={`${glassFieldBase} pr-7`} />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-white/30">h</span>
                </div>
                <div className="text-[10px] text-white/30 mt-0.5 flex justify-between">
                  <span>Prev: {prevInfo.loaded.toFixed(1)}</span>
                  <span>Cur: {compressor.total_loaded_hours.toFixed(1)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Daily calculated */}
          {showDailyHours && (
            <div className="bg-[#2A4D69]/15 border border-[#86BBD8]/15 rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-[#86BBD8]">Daily Calculated</span>
                <span className="flex items-center gap-1 text-[10px] text-[#86BBD8]/60"><Calculator className="h-3 w-3" />Auto</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center">
                  <div className="text-xl font-bold text-[#86BBD8]">{dailyRunning.toFixed(1)}h</div>
                  <div className="text-[10px] text-white/40">Running Today</div>
                  <div className="text-[10px] text-white/25">({prevInfo.running.toFixed(1)} → {inp.totalRunning || 0}h)</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold text-emerald-400">{dailyLoaded.toFixed(1)}h</div>
                  <div className="text-[10px] text-white/40">Loaded Today</div>
                  <div className="text-[10px] text-white/25">({prevInfo.loaded.toFixed(1)} → {inp.totalLoaded || 0}h)</div>
                </div>
              </div>
            </div>
          )}

          {/* Efficiency */}
          {dailyRunning > 0 && (
            <div className={`rounded-xl p-3 border ${eff.glass}`}>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold"><TrendingUp className="h-3.5 w-3.5" />Efficiency</div>
                  <div className="text-2xl font-bold mt-0.5">{efficiency}%</div>
                  <div className="text-[10px] opacity-70">{dailyLoaded.toFixed(1)}h / {dailyRunning.toFixed(1)}h</div>
                </div>
                <span className={`px-2 py-1 rounded-lg text-xs font-semibold border ${eff.glass}`}>{eff.label}</span>
              </div>
              <GlassProgress value={efficiency} colorClass={eff.bar} />
            </div>
          )}

          {/* Pressure & Temperature */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={fieldLbl}>Pressure</label>
              <div className="relative">
                <input type="number" step="0.1" aria-label="Pressure (psi)" value={inp.pressure || ''} disabled={saving} placeholder="0.0"
                  onChange={e => setCompressorInputs(p => ({ ...p, [compressor.id]: { ...p[compressor.id], pressure: e.target.value } }))}
                  className={`${glassFieldBase} pr-9`} />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-white/30">psi</span>
              </div>
            </div>
            <div>
              <label className={fieldLbl}>Temperature</label>
              <div className="relative">
                <input type="number" step="0.1" aria-label="Temperature (°C)" value={inp.temperature || ''} disabled={saving} placeholder="0.0"
                  onChange={e => setCompressorInputs(p => ({ ...p, [compressor.id]: { ...p[compressor.id], temperature: e.target.value } }))}
                  className={`${glassFieldBase} pr-7`} />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-white/30">°C</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className={fieldLbl}>Notes</label>
            <input type="text" aria-label="Notes" value={inp.notes || ''} disabled={saving} placeholder="Add notes…"
              onChange={e => setCompressorInputs(p => ({ ...p, [compressor.id]: { ...p[compressor.id], notes: e.target.value } }))}
              className={glassFieldBase} />
          </div>

          {/* Save */}
          <button type="button" onClick={handleSave} disabled={saving}
            className="w-full py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-br from-[#2A4D69] to-[#1e3a52] border border-[#86BBD8]/25 hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? <><Loader2 className="h-4 w-4 animate-spin" />Saving…</> : 'Save Entry'}
          </button>
        </div>
      </div>
    );
  });
  CompressorCard.displayName = 'CompressorCard';

  // ── Add Compressor Modal ─────────────────────────────────────────────────────

  const AddCompressorForm = () => {
    const [fd, setFd] = useState<AddCompressorFormData>({ name: '', model: '', capacity: '', location: 'Main Plant', status: 'standby', total_running_hours: 0, total_loaded_hours: 0, color: 'bg-blue-500' });
    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!fd.name || !fd.model || !fd.capacity) { toast.error('Please fill required fields'); return; }
      try { await addCompressor(fd); } catch { /* handled */ }
    };
    const statusOpts = Object.entries(STATUS_CONFIG).map(([k, v]) => ({ value: k, label: v.label }));
    const locationOpts = LOCATIONS.map(l => ({ value: l, label: l }));
    const colorOpts = [
      { value: 'bg-blue-500', label: 'Blue' }, { value: 'bg-emerald-500', label: 'Green' },
      { value: 'bg-rose-500', label: 'Red' }, { value: 'bg-amber-500', label: 'Yellow' },
      { value: 'bg-purple-500', label: 'Purple' }, { value: 'bg-pink-500', label: 'Pink' },
    ];

    return (
      <GlassModal isOpen={showAddCompressor} onClose={() => setShowAddCompressor(false)} title="Add New Compressor" icon={Gauge} size="lg"
        footer={
          <>
            <button type="button" onClick={() => setShowAddCompressor(false)} className="px-4 py-2 rounded-xl text-sm font-semibold text-white/60 bg-white/[0.07] border border-white/[0.12] hover:bg-white/[0.12] transition-all">Cancel</button>
            <button type="button" onClick={handleSubmit as unknown as React.MouseEventHandler} disabled={isSaving.type === 'add'}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-br from-[#2A4D69] to-[#1e3a52] border border-[#86BBD8]/25 hover:opacity-90 disabled:opacity-50 transition-all">
              {isSaving.type === 'add' ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Adding…</> : 'Add Compressor'}
            </button>
          </>
        }>
        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3">
          <GlassInput label="Compressor Name *" value={fd.name} onChange={e => setFd(p => ({ ...p, name: e.target.value }))} placeholder="Compressor #1" />
          <GlassInput label="Model *" value={fd.model} onChange={e => setFd(p => ({ ...p, model: e.target.value }))} placeholder="Atlas Copco GA37" />
          <GlassInput label="Capacity *" value={fd.capacity} onChange={e => setFd(p => ({ ...p, capacity: e.target.value }))} placeholder="37 kW" />
          <GlassSelect label="Location" value={fd.location} onChange={e => setFd(p => ({ ...p, location: e.target.value }))} options={locationOpts} />
          <GlassInput label="Total Running Hours" type="number" value={String(fd.total_running_hours)} onChange={e => setFd(p => ({ ...p, total_running_hours: parseFloat(e.target.value) || 0 }))} />
          <GlassInput label="Total Loaded Hours" type="number" value={String(fd.total_loaded_hours)} onChange={e => setFd(p => ({ ...p, total_loaded_hours: parseFloat(e.target.value) || 0 }))} />
          <GlassSelect label="Initial Status" value={fd.status} onChange={e => setFd(p => ({ ...p, status: e.target.value }))} options={statusOpts} />
          <GlassSelect label="Color Theme" value={fd.color} onChange={e => setFd(p => ({ ...p, color: e.target.value }))} options={colorOpts} />
        </form>
      </GlassModal>
    );
  };

  // ── Status Update Modal ───────────────────────────────────────────────────────

  const StatusUpdateModal = () => {
    const [sel, setSel] = useState<string>(statusUpdateDialog.currentStatus);
    return (
      <GlassModal isOpen={statusUpdateDialog.open} onClose={() => setStatusUpdateDialog({ open: false, compressorId: null, currentStatus: '' })} title="Update Compressor Status" icon={Settings} size="sm"
        footer={
          <>
            <button type="button" onClick={() => setStatusUpdateDialog({ open: false, compressorId: null, currentStatus: '' })} className="px-4 py-2 rounded-xl text-sm font-semibold text-white/60 bg-white/[0.07] border border-white/[0.12] hover:bg-white/[0.12] transition-all">Cancel</button>
            <button type="button" onClick={() => updateCompressorStatus(statusUpdateDialog.compressorId, sel)} disabled={isSaving.type === 'status' || sel === statusUpdateDialog.currentStatus}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-br from-[#2A4D69] to-[#1e3a52] border border-[#86BBD8]/25 hover:opacity-90 disabled:opacity-50 transition-all">
              {isSaving.type === 'status' ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Updating…</> : 'Update Status'}
            </button>
          </>
        }>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
              const Icon = cfg.icon;
              return (
                <button key={key} type="button" onClick={() => setSel(key)}
                  className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${sel === key ? `${cfg.glass} ring-1 ring-inset ring-white/20` : 'bg-white/[0.05] border-white/[0.10] text-white/50 hover:bg-white/[0.08]'}`}>
                  <Icon className="h-5 w-5" />
                  <span className="text-xs font-semibold">{cfg.label}</span>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-white/35">Current: <span className="text-white/60 font-semibold">{STATUS_CONFIG[statusUpdateDialog.currentStatus]?.label ?? 'Unknown'}</span></p>
        </div>
      </GlassModal>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // DOWNLOAD
  // ─────────────────────────────────────────────────────────────────────────────

  const dlCols: DLColumn[] = [
    { key: 'name', label: 'Name' },
    { key: 'model', label: 'Model' },
    { key: 'capacity', label: 'Capacity' },
    { key: 'location', label: 'Location' },
    { key: 'status', label: 'Status', format: v => STATUS_CONFIG[v as string]?.label ?? String(v ?? '') },
    { key: 'total_running_hours', label: 'Running Hours', format: v => `${Number(v ?? 0).toFixed(1)}h` },
    { key: 'total_loaded_hours', label: 'Loaded Hours', format: v => `${Number(v ?? 0).toFixed(1)}h` },
  ];

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────

  const tabs = [
    { key: 'daily',      label: 'Daily View', icon: Calendar },
    { key: 'services',   label: 'Services',   icon: Wrench },
    { key: 'analytics',  label: 'Analytics',  icon: BarChart3 },
    { key: 'management', label: 'Management', icon: Settings },
  ];

  return (
    <PageShell>
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-4">

        {/* Hero */}
        <HeroPanel
          icon={Gauge}
          title="Compressor Tracking"
          subtitle="Daily readings, maintenance scheduling & efficiency tracking"
          onRefresh={loadAllData}
          loading={isLoading}
          onNew={() => setShowAddCompressor(true)}
          newLabel="Add Compressor"
          {...collapse.panel('hero')}
          stats={stats ? [
            { label: 'Total Units', value: stats.total_compressors, textClass: 'text-[#86BBD8]' },
            { label: 'Running Hours', value: `${stats.total_running_hours?.toFixed(1) ?? 0}h`, textClass: 'text-emerald-400' },
            { label: 'Avg Efficiency', value: `${stats.avg_efficiency}%`, textClass: 'text-purple-400' },
            { label: 'Upcoming Services', value: stats.upcoming_services, textClass: 'text-amber-400' },
            { label: 'Urgent Alerts', value: stats.urgent_alerts, textClass: 'text-rose-400' },
            { label: 'Active', value: stats.active_compressors, textClass: 'text-teal-400' },
          ] : []}
          actions={
            <div className="flex items-center gap-1.5">
              <MasterCollapseButton collapse={collapse} />
              <DownloadButton data={compressors as unknown as Record<string, unknown>[]} columns={dlCols} filename={`compressors_${new Date().toISOString().split('T')[0]}`} title="Compressor Status" />
            </div>
          }
        />

        {/* Custom Glass Tabs */}
        <div className="oz-glass-dark rounded-2xl overflow-hidden">
          <div className="flex gap-1 p-2 border-b border-white/[0.07]">
            {tabs.map(t => {
              const Icon = t.icon;
              return (
                <button key={t.key} type="button" onClick={() => setActiveTab(t.key)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold transition-all ${
                    activeTab === t.key ? 'bg-[#2A4D69] text-white border border-[#86BBD8]/20' : 'text-white/50 hover:text-white/80 hover:bg-white/[0.05]'
                  }`}>
                  <Icon className="h-3.5 w-3.5" />{t.label}
                </button>
              );
            })}
          </div>

          {/* ── DAILY VIEW ── */}
          {activeTab === 'daily' && (
            <div className="p-4 space-y-4">
              {/* Date nav + filters */}
              <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                {/* Date navigation */}
                <div className="flex items-center gap-2">
                  <button type="button" onClick={previousDay} title="Previous day" className="h-8 w-8 flex items-center justify-center rounded-lg bg-white/[0.07] border border-white/[0.12] text-white/50 hover:text-white hover:bg-white/[0.12] transition-all"><ChevronLeft className="h-4 w-4" /></button>
                  <span className="text-sm font-semibold text-white min-w-[110px] text-center">{currentDate.toLocaleDateString()}</span>
                  <button type="button" onClick={nextDay} title="Next day" className="h-8 w-8 flex items-center justify-center rounded-lg bg-white/[0.07] border border-white/[0.12] text-white/50 hover:text-white hover:bg-white/[0.12] transition-all"><ChevronRight className="h-4 w-4" /></button>
                  <button type="button" onClick={goToToday} className="px-2.5 py-1 rounded-lg text-xs font-semibold text-white/60 bg-white/[0.07] border border-white/[0.12] hover:bg-white/[0.12] transition-all">Today</button>
                  <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] bg-[#2A4D69]/40 text-[#86BBD8] border border-[#86BBD8]/20">{getCurrentDateStr()}</span>
                </div>

                {/* Search + filters */}
                <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30 pointer-events-none" />
                    <input type="text" aria-label="Search compressors" placeholder="Search…" value={filters.search} onChange={e => setFilters(p => ({ ...p, search: e.target.value }))}
                      className="w-40 bg-white/[0.07] border border-white/[0.12] rounded-xl text-sm text-white placeholder:text-white/25 h-8 pl-8 pr-3 focus:outline-none focus:border-[#86BBD8]/50 transition-colors" />
                  </div>
                  <GlassSelect value={filters.location} onChange={e => setFilters(p => ({ ...p, location: e.target.value }))} options={[{ value: 'all', label: 'All Locations' }, ...LOCATIONS.map(l => ({ value: l, label: l }))]} wrapperClassName="w-36" />
                  <GlassSelect value={filters.status} onChange={e => setFilters(p => ({ ...p, status: e.target.value }))} options={[{ value: 'all', label: 'All Status' }, ...Object.entries(STATUS_CONFIG).map(([k, v]) => ({ value: k, label: v.label }))]} wrapperClassName="w-32" />
                  {/* View toggle */}
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => setViewMode('card')} title="Card view"
                      className={`h-8 w-8 flex items-center justify-center rounded-lg border transition-all ${viewMode === 'card' ? 'bg-[#2A4D69]/60 border-[#86BBD8]/30 text-white' : 'bg-white/[0.05] border-white/[0.10] text-white/40 hover:text-white/70'}`}>
                      <Grid className="h-3.5 w-3.5" />
                    </button>
                    <button type="button" onClick={() => setViewMode('list')} title="List view"
                      className={`h-8 w-8 flex items-center justify-center rounded-lg border transition-all ${viewMode === 'list' ? 'bg-[#2A4D69]/60 border-[#86BBD8]/30 text-white' : 'bg-white/[0.05] border-white/[0.10] text-white/40 hover:text-white/70'}`}>
                      <List className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Toggle toggles */}
              <div className="flex flex-wrap gap-3">
                {[
                  { label: 'Show Inactive', val: showInactive, set: setShowInactive },
                  { label: 'Daily Hours', val: showDailyHours, set: setShowDailyHours },
                  { label: 'Urgent Only', val: filters.showMaintenance, set: (v: boolean) => setFilters(p => ({ ...p, showMaintenance: v })) },
                ].map(({ label, val, set }) => (
                  <button key={label} type="button" onClick={() => set(!val)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${val ? 'bg-[#2A4D69]/60 border-[#86BBD8]/30 text-white' : 'bg-white/[0.05] border-white/[0.10] text-white/40 hover:text-white/70'}`}>
                    <div className={`w-3 h-3 rounded-full border transition-all ${val ? 'bg-[#86BBD8] border-[#86BBD8]' : 'border-white/30'}`} />
                    {label}
                  </button>
                ))}
              </div>

              {/* Card or list view */}
              {isLoading ? (
                <div className="flex items-center justify-center py-12 gap-2 text-white/40">
                  <Loader2 className="h-5 w-5 animate-spin" /><span className="text-sm">Loading compressors…</span>
                </div>
              ) : viewMode === 'card' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredCompressors.map(c => <CompressorCard key={c.id} compressor={c} />)}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/[0.08]">
                        {['Compressor', 'Status', 'Location', 'Total Running', 'Total Loaded', 'Next Service', ''].map(h => (
                          <th key={h} className="py-3 px-3 text-left text-xs font-semibold text-white/50 uppercase tracking-wider">{h}</th>
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
                            <tr className="border-b border-white/[0.05] hover:bg-white/[0.03] transition-colors">
                              <td className="py-2.5 px-3">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-7 h-7 rounded-full bg-[#2A4D69]/60 border border-[#86BBD8]/20 flex items-center justify-center"><Gauge className="h-3.5 w-3.5 text-[#86BBD8]" /></div>
                                  <div>
                                    <div className="font-medium text-white/85">{c.name}</div>
                                    <div className="text-xs text-white/35">{c.model}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="py-2.5 px-3"><StatusBadge status={c.status} onClick={() => setStatusUpdateDialog({ open: true, compressorId: c.id, currentStatus: c.status })} /></td>
                              <td className="py-2.5 px-3 text-white/60">{c.location}</td>
                              <td className="py-2.5 px-3">
                                <div className="font-medium text-[#86BBD8]">{c.total_running_hours.toFixed(1)}h</div>
                                <div className="text-xs text-white/35">Prev: {prevInfo.running.toFixed(1)}h</div>
                              </td>
                              <td className="py-2.5 px-3">
                                <div className="font-medium text-[#86BBD8]">{c.total_loaded_hours.toFixed(1)}h</div>
                                <div className="text-xs text-white/35">Prev: {prevInfo.loaded.toFixed(1)}h</div>
                              </td>
                              <td className="py-2.5 px-3">
                                {si ? <span className={`text-sm font-semibold ${URGENCY_GLASS[si.urgency]?.split(' ')[1] ?? 'text-white/60'}`}>{si.interval}h in {si.daysRemaining}d</span> : <span className="text-white/35">—</span>}
                              </td>
                              <td className="py-2.5 px-3">
                                <button type="button" onClick={() => setExpandedCompressor(isExp ? null : c.id)} className="h-7 w-7 flex items-center justify-center rounded-md text-white/35 hover:text-white/70 transition-colors">
                                  {isExp ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                </button>
                              </td>
                            </tr>
                            {isExp && (
                              <tr className="border-b border-white/[0.05] bg-white/[0.02]">
                                <td colSpan={7} className="p-4">
                                  <CompressorCard compressor={c} />
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

              {!isLoading && filteredCompressors.length === 0 && (
                <div className="text-center py-12">
                  <Gauge className="h-12 w-12 text-white/20 mx-auto mb-4" />
                  <p className="text-sm font-medium text-white/50">No compressors found</p>
                  <p className="text-xs text-white/30 mt-1 mb-4">Adjust filters or add a new compressor</p>
                  <button type="button" onClick={() => setShowAddCompressor(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-br from-[#2A4D69] to-[#1e3a52] border border-[#86BBD8]/25 hover:opacity-90 transition-all">
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
                {/* Upcoming Services */}
                <div className="lg:col-span-2 space-y-3">
                  <p className="text-xs font-semibold text-white/50 uppercase tracking-wider flex items-center gap-1.5"><Wrench className="h-3.5 w-3.5" />Upcoming Services</p>
                  {upcomingServices.map(svc => (
                    <div key={`${svc.compressor_id}-${svc.service_interval}`}
                      className={`oz-glass-panel rounded-xl p-4 border ${svc.urgency === 'critical' || svc.urgency === 'high' ? 'border-rose-500/30 bg-rose-500/5' : 'border-white/[0.08]'}`}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-[#2A4D69]/50 border border-[#86BBD8]/20 flex items-center justify-center"><Gauge className="h-4 w-4 text-[#86BBD8]" /></div>
                          <div>
                            <div className="font-semibold text-white/85">{svc.compressor_name}</div>
                            <div className="text-xs text-white/40">Current: {svc.current_hours}h · Next: {svc.next_service_hours}h</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-lg font-bold ${URGENCY_GLASS[svc.urgency]?.split(' ')[1] ?? 'text-white/60'}`}>{svc.service_interval}h</div>
                          <div className="text-xs text-white/40">{svc.hours_remaining}h remaining</div>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3 mb-3 text-xs">
                        {[{ l: 'Current Hours', v: `${svc.current_hours}h` }, { l: 'Days Until', v: `${svc.days_remaining}d` }].map(({ l, v }) => (
                          <div key={l} className="bg-white/[0.04] border border-white/[0.08] rounded-lg p-2">
                            <div className="text-white/35">{l}</div>
                            <div className="font-semibold text-white/80 mt-0.5">{v}</div>
                          </div>
                        ))}
                        <div className="bg-white/[0.04] border border-white/[0.08] rounded-lg p-2">
                          <div className="text-white/35 mb-0.5">Urgency</div>
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium border ${URGENCY_GLASS[svc.urgency] ?? URGENCY_GLASS.low}`}>{svc.urgency}</span>
                        </div>
                      </div>
                      <GlassProgress value={svc.current_hours} max={svc.next_service_hours} colorClass="bg-[#86BBD8]" className="mb-3" />
                      <button type="button" onClick={() => markServiceCompleted(svc.compressor_id, svc.service_interval)} disabled={isSaving.id === svc.compressor_id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-emerald-500/20 border border-emerald-500/30 hover:bg-emerald-500/30 disabled:opacity-50 transition-all">
                        {isSaving.id === svc.compressor_id ? <><Loader2 className="h-3 w-3 animate-spin" />Processing…</> : <><CheckCircle2 className="h-3.5 w-3.5" />Mark as Done</>}
                      </button>
                    </div>
                  ))}
                  {upcomingServices.length === 0 && (
                    <div className="text-center py-10">
                      <CheckCheck className="h-10 w-10 text-emerald-400/50 mx-auto mb-3" />
                      <p className="text-sm font-medium text-white/50">All compressors up to date</p>
                    </div>
                  )}
                </div>

                {/* Sidebar */}
                <div className="space-y-4">
                  {/* Service intervals */}
                  <div className="oz-glass-panel rounded-xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-white/[0.07]"><p className="text-xs font-semibold text-white/60 uppercase tracking-wider">Service Intervals</p></div>
                    <div className="p-3 space-y-2">
                      {SERVICE_INTERVALS.map(iv => (
                        <div key={iv} className="flex items-center justify-between px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-xl">
                          <div className="flex items-center gap-2"><Timer className="h-3.5 w-3.5 text-[#86BBD8]" /><span className="text-sm font-semibold text-white/80">{iv}h</span></div>
                          <span className="text-xs text-white/40">{compressors.filter(c => calculateNextService(c.total_running_hours)?.interval === iv).length} due</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Export */}
                  <div className="oz-glass-panel rounded-xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-white/[0.07]"><p className="text-xs font-semibold text-white/60 uppercase tracking-wider">Export Data</p></div>
                    <div className="p-3 space-y-2">
                      <button type="button" onClick={generateCSVReport} className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-white/70 bg-white/[0.05] border border-white/[0.08] hover:bg-white/[0.10] transition-all">
                        <FileText className="h-4 w-4 text-[#86BBD8]" />Export to CSV
                      </button>
                      <label className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-white/70 bg-white/[0.05] border border-white/[0.08] hover:bg-white/[0.10] transition-all cursor-pointer">
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
                  {/* Performance Metrics */}
                  <div className="oz-glass-panel rounded-xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-white/[0.07] flex items-center justify-between">
                      <p className="text-xs font-semibold text-white/60 uppercase tracking-wider">Performance Metrics</p>
                      <GlassSelect value={analyticsPeriod} onChange={e => { setAnalyticsPeriod(e.target.value); fetchPerformanceMetrics(e.target.value === 'weekly' ? 7 : e.target.value === 'monthly' ? 30 : 90); }} options={[{ value: 'weekly', label: 'Last 7 Days' }, { value: 'monthly', label: 'Last 30 Days' }, { value: 'quarterly', label: 'Last 90 Days' }]} wrapperClassName="w-36" />
                    </div>
                    {analyticsData.performanceMetrics.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-white/[0.08]">
                              {['Compressor', 'Avg Efficiency', 'Avg Daily', 'Total Hours', 'Downtime', 'Services'].map(h => (
                                <th key={h} className="py-2.5 px-3 text-left text-xs font-semibold text-white/50 uppercase tracking-wider">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {analyticsData.performanceMetrics.map(m => (
                              <tr key={m.compressor_id} className="border-b border-white/[0.05] hover:bg-white/[0.03] transition-colors">
                                <td className="py-2.5 px-3 font-medium text-white/80">{m.compressor_name}</td>
                                <td className="py-2.5 px-3">
                                  <div className="flex items-center gap-1.5">
                                    <div className={`w-2 h-2 rounded-full ${m.avg_efficiency >= 80 ? 'bg-emerald-500' : m.avg_efficiency >= 60 ? 'bg-blue-500' : m.avg_efficiency >= 40 ? 'bg-amber-500' : 'bg-rose-500'}`} />
                                    <span className="text-white/70">{m.avg_efficiency}%</span>
                                  </div>
                                </td>
                                <td className="py-2.5 px-3 text-white/60">{m.avg_daily_running_hours.toFixed(1)}h / {m.avg_daily_loaded_hours.toFixed(1)}h</td>
                                <td className="py-2.5 px-3 text-white/60">{m.total_running_hours.toFixed(1)}h / {m.total_loaded_hours.toFixed(1)}h</td>
                                <td className="py-2.5 px-3">
                                  <div className="flex items-center gap-1.5">
                                    <GlassProgress value={m.downtime_percentage} colorClass="bg-rose-500" className="w-16" />
                                    <span className="text-white/50 text-xs">{m.downtime_percentage.toFixed(1)}%</span>
                                  </div>
                                </td>
                                <td className="py-2.5 px-3"><span className="inline-flex px-2 py-0.5 rounded-full text-[11px] bg-white/[0.08] text-white/60 border border-white/[0.12]">{m.service_count}</span></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-10"><BarChart3 className="h-10 w-10 text-white/20 mx-auto mb-3" /><p className="text-sm text-white/35">No performance data available</p></div>
                    )}
                  </div>

                  {/* Trend Analysis */}
                  <div className="oz-glass-panel rounded-xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-white/[0.07]"><p className="text-xs font-semibold text-white/60 uppercase tracking-wider">Trend Analysis</p></div>
                    {analyticsData.trends.success && analyticsData.trends.data.length > 0 ? (
                      <div className="p-4 space-y-3">
                        {analyticsData.trends.data.slice(0, 5).map((trend, i) => (
                          <div key={i} className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium text-white/80">{trend.compressor_name}</span>
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium border ${trend.efficiency_trend === 'improving' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : trend.efficiency_trend === 'declining' ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' : 'bg-white/[0.08] text-white/50 border-white/[0.12]'}`}>
                                {trend.efficiency_trend === 'improving' ? '↑ Improving' : trend.efficiency_trend === 'declining' ? '↓ Declining' : '→ Stable'}
                              </span>
                            </div>
                            <div className="grid grid-cols-3 gap-3 text-xs">
                              {[{ l: 'Efficiency', v: `${trend.avg_efficiency}%` }, { l: 'Running', v: `${trend.total_running_hours?.toFixed(1) ?? 0}h` }, { l: 'Loaded', v: `${trend.total_loaded_hours?.toFixed(1) ?? 0}h` }].map(({ l, v }) => (
                                <div key={l}><div className="text-white/35">{l}</div><div className="font-semibold text-white/70 mt-0.5">{v}</div></div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-10"><TrendingUp className="h-10 w-10 text-white/20 mx-auto mb-3" /><p className="text-sm text-white/35">{analyticsData.trends.message || 'Add 7 days of readings to see trends'}</p></div>
                    )}
                  </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-4">
                  {/* Comparison */}
                  <div className="oz-glass-panel rounded-xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-white/[0.07] flex items-center justify-between">
                      <p className="text-xs font-semibold text-white/60 uppercase tracking-wider">Comparison</p>
                      <GlassSelect value={analyticsMetric} onChange={e => { setAnalyticsMetric(e.target.value); fetchComparisonAnalytics(e.target.value); }} options={[{ value: 'efficiency', label: 'Efficiency' }, { value: 'running_hours', label: 'Running Hrs' }, { value: 'loaded_hours', label: 'Loaded Hrs' }]} wrapperClassName="w-32" />
                    </div>
                    <div className="p-3 space-y-2">
                      {analyticsData.comparison.success && analyticsData.comparison.data.length > 0 ? (
                        analyticsData.comparison.data.slice(0, 5).map(item => (
                          <div key={item.compressor_id} className="flex items-center justify-between bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2">
                            <div><div className="font-medium text-white/80 text-sm">{item.compressor_name}</div><div className="text-xs text-white/35">{item.location}</div></div>
                            <div className="text-right">
                              <div className="font-semibold text-white/70">{item.value}{analyticsMetric === 'efficiency' ? '%' : 'h'}</div>
                              <span className={`inline-flex px-1.5 py-0.5 rounded-full text-[10px] font-medium border ${RATING_GLASS[item.rating] ?? RATING_GLASS.Poor}`}>{item.rating}</span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-4 text-sm text-white/35">{analyticsData.comparison.message || 'No comparison data'}</div>
                      )}
                    </div>
                  </div>

                  {/* Key Insights */}
                  {analyticsData.performanceMetrics.length > 0 && (
                    <div className="oz-glass-panel rounded-xl overflow-hidden">
                      <div className="px-4 py-3 border-b border-white/[0.07]"><p className="text-xs font-semibold text-white/60 uppercase tracking-wider">Key Insights</p></div>
                      <div className="p-3 space-y-2">
                        {(() => {
                          const best = [...analyticsData.performanceMetrics].sort((a, b) => b.avg_efficiency - a.avg_efficiency)[0];
                          const mostActive = [...analyticsData.performanceMetrics].sort((a, b) => b.total_running_hours - a.total_running_hours)[0];
                          const needsAtt = analyticsData.performanceMetrics.filter(m => m.downtime_percentage > 20 || m.avg_efficiency < 40);
                          return (
                            <>
                              {best && <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20"><TrendingUp className="h-4 w-4 text-emerald-400 shrink-0" /><div><div className="text-xs font-semibold text-emerald-400">Best Performer</div><div className="text-xs text-white/50">{best.compressor_name} ({best.avg_efficiency}%)</div></div></div>}
                              {mostActive && <div className="flex items-center gap-2 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20"><Activity className="h-4 w-4 text-blue-400 shrink-0" /><div><div className="text-xs font-semibold text-blue-400">Most Active</div><div className="text-xs text-white/50">{mostActive.compressor_name} ({mostActive.total_running_hours}h)</div></div></div>}
                              {needsAtt.length > 0 && <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20"><AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" /><div><div className="text-xs font-semibold text-amber-400">Needs Attention</div><div className="text-xs text-white/50">{needsAtt.length} compressor{needsAtt.length > 1 ? 's' : ''}</div></div></div>}
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
                {/* System Summary */}
                <div className="oz-glass-panel rounded-xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-white/[0.07]"><p className="text-xs font-semibold text-white/60 uppercase tracking-wider">System Summary</p></div>
                  {managementData.summary ? (
                    <div className="p-4 space-y-4">
                      {/* Status dist */}
                      <div>
                        <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">Status Distribution</p>
                        <div className="grid grid-cols-2 gap-2">
                          {Object.entries(managementData.summary.status_distribution).map(([st, cnt]) => {
                            const cfg = STATUS_CONFIG[st]; if (!cfg) return null;
                            const Icon = cfg.icon;
                            return (
                              <div key={st} className={`flex items-center gap-2 p-3 rounded-xl border ${cfg.glass}`}>
                                <Icon className="h-4 w-4" />
                                <div><div className="text-xl font-bold">{cnt}</div><div className="text-xs">{cfg.label}</div></div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      {/* Location dist */}
                      <div>
                        <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">Location Distribution</p>
                        <div className="space-y-2">
                          {Object.entries(managementData.summary.location_distribution).map(([loc, cnt]) => (
                            <div key={loc} className="flex items-center justify-between text-sm">
                              <span className="text-white/60">{loc}</span>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-white/80">{cnt}</span>
                                <GlassProgress value={cnt} max={managementData.summary?.total_compressors ?? 1} colorClass="bg-[#86BBD8]" className="w-24" />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      {/* Age dist */}
                      <div>
                        <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">Age Distribution</p>
                        <div className="grid grid-cols-4 gap-2">
                          {[{ v: managementData.summary.age_distribution.less_than_year ?? 0, l: '< 1yr' }, { v: managementData.summary.age_distribution["1_3_years"] ?? 0, l: '1-3yr' }, { v: managementData.summary.age_distribution["3_5_years"] ?? 0, l: '3-5yr' }, { v: managementData.summary.age_distribution.more_than_5 ?? 0, l: '> 5yr' }].map(({ v, l }) => (
                            <div key={l} className="text-center bg-white/[0.04] border border-white/[0.08] rounded-xl p-2">
                              <div className="text-lg font-bold text-[#86BBD8]">{v}</div>
                              <div className="text-[10px] text-white/35">{l}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-10"><Settings className="h-10 w-10 text-white/20 mx-auto mb-3" /><p className="text-sm text-white/35">Loading management data…</p></div>
                  )}
                </div>

                {/* Activity panel */}
                <div className="space-y-4">
                  {/* Alerts */}
                  <div className="oz-glass-panel rounded-xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-white/[0.07] flex items-center justify-between">
                      <p className="text-xs font-semibold text-white/60 uppercase tracking-wider">Recent Alerts</p>
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium border ${(managementData.summary?.unread_alerts ?? 0) > 0 ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' : 'bg-white/[0.08] text-white/40 border-white/[0.12]'}`}>
                        {managementData.summary?.unread_alerts ?? 0} unread
                      </span>
                    </div>
                    {managementData.summary?.recent_alerts?.length ? (
                      <div className="p-3 space-y-2">
                        {managementData.summary.recent_alerts.slice(0, 5).map(a => (
                          <div key={a.id} className={`p-3 rounded-xl border text-sm ${a.severity === 'critical' ? 'border-rose-500/30 bg-rose-500/5' : a.severity === 'error' ? 'border-amber-500/30 bg-amber-500/5' : 'border-yellow-500/30 bg-yellow-500/5'}`}>
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="font-medium text-white/80">{a.title}</div>
                                <div className="text-xs text-white/50 mt-0.5">{a.message}</div>
                              </div>
                              {!a.is_read && <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/30">New</span>}
                            </div>
                            <div className="text-[10px] text-white/30 mt-1.5">{new Date(a.created_at).toLocaleDateString()}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6"><CheckCircle2 className="h-8 w-8 text-emerald-400/50 mx-auto mb-2" /><p className="text-sm text-white/35">No recent alerts</p></div>
                    )}
                  </div>

                  {/* Recent Services */}
                  <div className="oz-glass-panel rounded-xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-white/[0.07]"><p className="text-xs font-semibold text-white/60 uppercase tracking-wider">Recent Services</p></div>
                    {managementData.summary?.recent_services?.length ? (
                      <div className="p-3 space-y-2">
                        {managementData.summary.recent_services.slice(0, 5).map(s => (
                          <div key={s.id} className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-3">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="font-medium text-white/80 text-sm">{s.service_type}</span>
                              <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Completed</span>
                            </div>
                            <p className="text-xs text-white/50 mb-1">{s.description}</p>
                            <div className="flex items-center justify-between text-[10px] text-white/30">
                              <span>{s.service_date}</span><span>{s.running_hours_at_service}h</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6"><Wrench className="h-8 w-8 text-white/20 mx-auto mb-2" /><p className="text-sm text-white/35">No recent services</p></div>
                    )}
                  </div>

                  {/* System Actions */}
                  <div className="oz-glass-panel rounded-xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-white/[0.07]"><p className="text-xs font-semibold text-white/60 uppercase tracking-wider">System Actions</p></div>
                    <div className="p-3 space-y-2">
                      {[
                        { icon: RefreshCw, label: 'Refresh All Data', fn: loadAllData, cls: 'text-[#86BBD8]' },
                        { icon: Download, label: 'Export System Report', fn: generateCSVReport, cls: 'text-emerald-400' },
                      ].map(({ icon: Ic, label, fn, cls }) => (
                        <button key={label} type="button" onClick={fn} className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-white/70 bg-white/[0.05] border border-white/[0.08] hover:bg-white/[0.10] transition-all">
                          <Ic className={`h-4 w-4 ${cls}`} />{label}
                        </button>
                      ))}
                      <button type="button" onClick={() => {
                        const data = { compressors, stats, upcomingServices, analytics: analyticsData, management: managementData, exportDate: new Date().toISOString() };
                        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a'); a.href = url; a.download = `system-backup-${new Date().toISOString().split('T')[0]}.json`; a.click();
                        toast.success('System backup exported');
                      }} className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-white/70 bg-white/[0.05] border border-white/[0.08] hover:bg-white/[0.10] transition-all">
                        <Save className="h-4 w-4 text-amber-400" />Backup System Data
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-white/25">
          Connected to {API_BASE_URL} · {compressors.length} compressors · Last updated {new Date().toLocaleTimeString()}
        </p>
      </div>

      <AddCompressorForm />
      <StatusUpdateModal />
    </PageShell>
  );
};

export default CompressorReadingsSystem;
