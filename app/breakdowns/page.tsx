// app/breakdowns/page.tsx
"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef, Fragment } from 'react';
import { api } from '@/lib/apiClient';
import { type EmployeeLookup } from '@/hooks/useLookups';
import { AppShell } from "@/components/app-shell";
import {
  AlertCircle, CheckCircle, Clock, Edit, Filter, Loader2, Plus,
  Trash2, TrendingUp, Wrench, X, Calendar,
  Eye, AlertTriangle, Activity, Zap, ChevronDown, ChevronUp, User,
  Clock4, PlayCircle, CheckCheck, Shield,
  Wind, FilterX, LayoutGrid, Table as TableIcon,
  MapPin, Users, Package, PieChart as PieChartIcon, Building2, Layers,
  Search, UserCircle, Download,
} from '@/components/shared/theme';
import { toast } from 'sonner';
import { format } from "date-fns";
import {
  useTheme, PageHero, StatTile, StatusBadge, ViewToggle,
  FormField, FormActions, useCollapseSection, CenterModal, ACCENT_HEX, GlowCard, SelectField, AutofillInput,
} from '@/components/shared/theme';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart as RePieChart, Pie, Cell, AreaChart as ReAreaChart, Area,
  Line, ComposedChart,
} from 'recharts';

// ─── API ──────────────────────────────────────────────────────────────────────

// ─── ANALYTICS TYPES / HELPERS ────────────────────────────────────────────────

interface HeatmapData {
  heatmap: { hour_day: number[][]; labels: { hours: string[]; days: string[] } };
  top_problem_machines: { name: string; count: number; total_downtime: number; department: string; avg_downtime: number; avg_repair_time: number; avg_response_time: number }[];
  top_spare_parts: { name: string; count: number; total_cost: number; part_number: string; total_quantity: number }[];
  breakdown_type_distribution: { type: string; count: number }[];
  department_comparison: { department: string; count: number; downtime: number }[];
  monthly_trends: { month: string; count: number }[];
  artisan_performance: { name: string; count: number; total_repair_time: number; avg_repair_time: number }[];
  success: boolean;
}

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const getHeatmapColor = (value: number, max: number): string => {
  if (value === 0) return 'rgba(148,163,184,0.08)';
  const intensity = value / max;
  if (intensity < 0.33) return `rgba(59, 130, 246, ${0.3 + 0.4 * intensity})`;
  if (intensity < 0.66) return `rgba(245, 158, 11, ${0.4 + 0.4 * intensity})`;
  return `rgba(239, 68, 68, ${0.5 + 0.5 * intensity})`;
};

const formatTimeMinutes = (minutes: number): string => {
  const h = Math.floor(minutes / 60); const m = minutes % 60;
  return h > 0 ? `${h}h ${m > 0 ? `${m}m` : ''}`.trim() : `${m}m`;
};
const formatCurrency = (value: number): string => `$${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

const PIE_COLORS = [
  '#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16',
];

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface SparePart { name: string; quantity: number; part_number?: string; unit_price: number; total_cost: number; }
interface SpareUsed { part_number?: string; name?: string; quantity?: number; unit_price?: number; total_cost?: number; }

interface Breakdown {
  id: number;
  breakdown_uid?: string;
  machine_id: string;
  machine_name: string;
  machine_description?: string;
  artisan_name: string;
  department: string;
  location: string;
  breakdown_date: string;
  breakdown_type: string;
  work_done?: string;
  artisan_recommendations?: string;
  status: string;
  priority: string;
  breakdown_start?: string;
  breakdown_end?: string;
  work_start?: string;
  work_end?: string;
  created_at?: string;
  updated_at?: string;
  breakdown_description?: string;
  spares_used?: SparePart[] | string;
}

interface BreakdownFormData {
  machine_id: string; machine_name: string; breakdown_description: string;
  machine_description?: string; artisan_name: string; breakdown_date: string;
  location: string; department: string; breakdown_type: string; work_done: string;
  artisan_recommendations: string; status: string; priority: string;
  breakdown_start: string; breakdown_end: string; work_start: string; work_end: string;
  spares_used: SparePart[];
}

interface Filters { status: string; breakdown_type: string; priority: string; department: string; location: string; }

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const STATUS_META: Record<string, { name: string; icon: React.ElementType; color: string }> = {
  logged:      { name: 'Logged',      icon: Clock,      color: ACCENT_HEX.blue },
  in_progress: { name: 'In Progress', icon: PlayCircle, color: '#f59e0b' },
  resolved:    { name: 'Resolved',    icon: CheckCheck,  color: '#34d399' },
  closed:      { name: 'Closed',      icon: CheckCircle, color: '#94a3b8' },
  cancelled:   { name: 'Cancelled',   icon: X,          color: '#f43f5e' },
};
const PRIORITY_META: Record<string, { name: string; icon: React.ElementType; color: string }> = {
  critical: { name: 'Critical', icon: AlertCircle,   color: '#f43f5e' },
  high:     { name: 'High',     icon: AlertTriangle, color: '#f97316' },
  medium:   { name: 'Medium',   icon: Clock,         color: '#f59e0b' },
  low:      { name: 'Low',      icon: Clock4,        color: ACCENT_HEX.blue },
};
const TYPE_META: Record<string, { name: string; icon: React.ElementType; color: string }> = {
  mechanical: { name: 'Mechanical', icon: Wrench,   color: '#94a3b8' },
  electrical: { name: 'Electrical', icon: Zap,      color: '#eab308' },
  hydraulic:  { name: 'Hydraulic',  icon: Activity, color: ACCENT_HEX.blue },
  pneumatic:  { name: 'Pneumatic',  icon: Wind,     color: ACCENT_HEX.indigo },
  electronic: { name: 'Electronic', icon: Shield,   color: ACCENT_HEX.violet },
  other:      { name: 'Other',      icon: Wrench,   color: '#94a3b8' },
};
const DEPARTMENTS = ['Maintenance', 'Production', 'Engineering', 'Quality', 'Safety', 'Operations'];

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const timeToMinutes = (t: string): number => { if (!t) return 0; try { const [h, m] = t.split(':').map(Number); return h * 60 + m; } catch { return 0; } };
const minutesToDisplay = (minutes: number): string => {
  if (!minutes && minutes !== 0) return '0m';
  const h = Math.floor(minutes / 60); const m = minutes % 60;
  return h > 0 ? `${h}h ${m > 0 ? `${m}m` : ''}`.trim() : `${m}m`;
};
const formatDate = (s: string | null | undefined): string => { if (!s) return 'N/A'; try { return format(new Date(s), 'MMM dd, yyyy'); } catch { return 'Invalid Date'; } };
const formatTime = (s: string | null | undefined): string => { if (!s) return '—'; if (s.includes(':')) { const p = s.split(':'); return `${p[0].padStart(2, '0')}:${p[1].padStart(2, '0')}`; } return s; };
const calcDowntime = (start?: string, end?: string): number => {
  if (!start || !end) return 0;
  const s = timeToMinutes(start), e = timeToMinutes(end);
  return Math.max(0, e >= s ? e - s : (e + 1440) - s);
};
const sparesTotalCost = (spares: Breakdown['spares_used']): number => {
  if (!spares || !Array.isArray(spares)) return 0;
  return (spares as SpareUsed[]).reduce((t, s) => t + (parseFloat(s.total_cost?.toString() ?? '0') || 0), 0);
};

// ─── API ──────────────────────────────────────────────────────────────────────

// Throws on failure — the `catch { return [] }` this replaces made a server
// outage indistinguishable from "no breakdowns match these filters".
const fetchBreakdowns = async (filters: Record<string, string> = {}): Promise<Breakdown[]> => {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => { if (v && v !== 'all' && v !== '') params.append(k, v); });
  const data = await api.get<any>(`/api/breakdowns/get-breakdowns?${params}`);
  if (Array.isArray(data)) return data;
  return data.data ?? data.breakdowns ?? data.results ?? [];
};

function toApiBody(fd: BreakdownFormData) {
  return {
    machine_id: fd.machine_id || '', machine_name: fd.machine_name || '',
    breakdown_description: fd.breakdown_description || '', machine_description: fd.breakdown_description || '',
    artisan_name: fd.artisan_name || '', breakdown_date: fd.breakdown_date || new Date().toISOString().split('T')[0],
    location: fd.location || '', department: fd.department || '', breakdown_type: fd.breakdown_type || 'mechanical',
    work_done: fd.work_done || '', artisan_recommendations: fd.artisan_recommendations || '',
    status: fd.status || 'logged', priority: fd.priority || 'medium',
    breakdown_start: fd.breakdown_start || '', breakdown_end: fd.breakdown_end || '',
    work_start: fd.work_start || '', work_end: fd.work_end || '',
    spares_used: (Array.isArray(fd.spares_used) ? fd.spares_used : []).map((s: SpareUsed) => ({
      name: s.name || '', quantity: s.quantity || 1, part_number: s.part_number || '',
      unit_price: s.unit_price || 0, total_cost: (s.quantity || 1) * (s.unit_price || 0),
    })),
  };
}
const createBreakdown = async (fd: BreakdownFormData): Promise<unknown> => {
  return api.post('/api/breakdowns/', toApiBody(fd));
};
const updateBreakdown = async (id: number, fd: BreakdownFormData): Promise<unknown> => {
  if (!id) throw new Error('Invalid ID');
  return api.patch(`/api/breakdowns/${id}`, toApiBody(fd));
};
const deleteBreakdown = async (id: number): Promise<unknown> => {
  if (!id) throw new Error('Invalid ID');
  return (await api.delete(`/api/breakdowns/${id}`)) ?? { success: true };
};

// ─── Themed autocomplete field (replaces legacy EmployeeNameInput) ────────────

// Raw employee row from /api/employees — the shared lookup shape (all fields optional).
type EmployeeRecord = EmployeeLookup;
function fullName(e: EmployeeRecord) { return `${e.first_name ?? ''} ${e.last_name ?? ''}`.trim(); }

function ArtisanField({ value, onChange, error }: { value: string; onChange: (name: string, emp: EmployeeRecord | null) => void; error?: string; }) {
  const t = useTheme();
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => { api.get<EmployeeRecord[]>('/api/employees').then(setEmployees).catch(() => {}); }, []);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h);
  }, []);

  const filtered = useMemo(() => {
    if (!value.trim()) return employees.slice(0, 8);
    const q = value.toLowerCase();
    return employees.filter(e => fullName(e).toLowerCase().includes(q) || (e.employee_id ?? '').toLowerCase().includes(q)).slice(0, 10);
  }, [value, employees]);

  return (
    <div ref={wrapRef} className="relative">
      <div className="relative">
        <UserCircle className={`absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 pointer-events-none ${t.textFaint}`} />
        <input type="text" value={value} placeholder="Select or type artisan name…" autoComplete="off"
          onChange={e => { onChange(e.target.value, null); setOpen(true); }} onFocus={() => setOpen(true)}
          className={`w-full h-9 pl-8 pr-3 rounded-lg text-sm ${t.inputBg} focus:outline-none`} />
      </div>
      {error && <p className="text-xs text-rose-500 mt-1">{error}</p>}
      {open && (
        <div className={`absolute left-0 right-0 top-full mt-1 z-50 rounded-xl ${t.glass} ${t.shadow} overflow-hidden`}>
          {filtered.length === 0 ? (
            <div className={`px-3 py-3 text-xs italic ${t.textFaint}`}>No employees found — name will be saved as typed</div>
          ) : (
            <div className="max-h-56 overflow-y-auto p-1">
              {filtered.map(emp => (
                <button key={emp.id} type="button" onMouseDown={e => { e.preventDefault(); onChange(fullName(emp), emp); setOpen(false); }}
                  className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors ${t.hoverBgSoft}`}>
                  <div className="h-7 w-7 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-[10px] font-bold text-white shrink-0">{emp.first_name?.[0]}{emp.last_name?.[0]}</div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${t.textPrimary}`}>{fullName(emp)}</p>
                    <p className={`text-[10px] truncate ${t.textFaint}`}><span className="font-mono text-brand-400">{emp.employee_id}</span>{emp.designation && ` · ${emp.designation}`}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Themed predictive text field (replaces legacy PredictiveInput) ───────────

function loadHistory(key: string): string[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(`prd_hist_${key}`) ?? '[]') as string[]; } catch { return []; }
}
function saveToHistory(key: string, value: string) {
  if (!value.trim()) return;
  const updated = [value, ...loadHistory(key).filter(v => v !== value)].slice(0, 40);
  localStorage.setItem(`prd_hist_${key}`, JSON.stringify(updated));
}

function PredictiveField({ historyKey, value, onChange, multiline, rows = 3, placeholder, hints = [], error }: {
  historyKey: string; value: string; onChange: (v: string) => void; multiline?: boolean; rows?: number; placeholder?: string; hints?: string[]; error?: string;
}) {
  const t = useTheme();
  const [history, setHistory] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => setHistory(loadHistory(historyKey)), [historyKey]);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h);
  }, []);

  const suggestions = useMemo(() => {
    const all = [...hints, ...history].filter((v, i, a) => a.indexOf(v) === i);
    if (!value.trim()) return all.slice(0, 8);
    const q = value.toLowerCase();
    return all.filter(s => s.toLowerCase().includes(q) && s.toLowerCase() !== q).slice(0, 8);
  }, [value, history, hints]);

  function commit(v: string) { if (!v.trim()) return; saveToHistory(historyKey, v.trim()); setHistory(loadHistory(historyKey)); }
  const inputCls = `w-full h-9 px-3 rounded-lg text-sm ${t.inputBg} focus:outline-none`;

  return (
    <div ref={wrapRef} className="relative">
      {multiline ? (
        <textarea value={value} placeholder={placeholder} rows={rows}
          onChange={e => { onChange(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => { commit(value); setOpen(false); }, 150)}
          className={`${inputCls} h-auto py-2 resize-none`} />
      ) : (
        <input type="text" value={value} placeholder={placeholder} autoComplete="off"
          onChange={e => { onChange(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => { commit(value); setOpen(false); }, 150)}
          className={inputCls} />
      )}
      {error && <p className="text-xs text-rose-500 mt-1">{error}</p>}
      {open && suggestions.length > 0 && (
        <div className={`absolute left-0 right-0 top-full mt-1 z-50 rounded-xl ${t.glass} ${t.shadow} overflow-hidden`}>
          <div className="max-h-44 overflow-y-auto p-1">
            {suggestions.map(s => (
              <button key={s} type="button" onMouseDown={e => { e.preventDefault(); onChange(s); commit(s); setOpen(false); }}
                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-sm transition-colors ${t.textMuted} ${t.hoverBgSoft}`}>
                {s}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── BREAKDOWN CARD ──────────────────────────────────────────────────────────

function BreakdownCard({ breakdown, onView, onEdit, onDelete, isExpanded, onToggleExpand }: {
  breakdown: Breakdown; onView: (b: Breakdown) => void; onEdit: (b: Breakdown) => void; onDelete: (b: Breakdown) => void; isExpanded: boolean; onToggleExpand: () => void;
}) {
  const t = useTheme();
  const downtime = minutesToDisplay(calcDowntime(breakdown.breakdown_start, breakdown.breakdown_end));
  const cost = sparesTotalCost(breakdown.spares_used);
  const tm = TYPE_META[breakdown.breakdown_type] ?? TYPE_META.other;
  const TypeIcon = tm.icon;

  return (
    <GlowCard color={tm.color} surface={`${t.glass} rounded-2xl`} className="overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-1.5 rounded-lg shrink-0" style={{ background: `${tm.color}22`, color: tm.color }}><TypeIcon className="h-3.5 w-3.5" /></div>
            <div className="min-w-0">
              <h4 className={`text-sm font-semibold truncate ${t.textPrimary}`}>{breakdown.machine_name}</h4>
              <p className={`text-xs ${t.textFaint}`}>ID: {breakdown.machine_id}</p>
            </div>
          </div>
          <button type="button" onClick={onToggleExpand} className={`h-7 w-7 flex items-center justify-center rounded-md ${t.chipBg} ${t.textFaint} ${t.hoverText} shrink-0`}>
            {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        </div>

        <p className={`text-xs line-clamp-2 mb-3 leading-relaxed ${t.textMuted}`}>{breakdown.breakdown_description || 'No description available'}</p>

        <div className="flex flex-wrap gap-1.5 mb-3">
          <StatusBadge color={(PRIORITY_META[breakdown.priority] ?? PRIORITY_META.medium).color} label={(PRIORITY_META[breakdown.priority] ?? PRIORITY_META.medium).name} />
          <StatusBadge color={tm.color} label={tm.name} />
          <StatusBadge color={(STATUS_META[breakdown.status] ?? STATUS_META.logged).color} label={(STATUS_META[breakdown.status] ?? STATUS_META.logged).name} dot />
        </div>

        <div className={`flex flex-wrap gap-3 text-xs mb-3 ${t.textFaint}`}>
          {breakdown.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{breakdown.location}</span>}
          {breakdown.artisan_name && <span className="flex items-center gap-1"><User className="h-3 w-3" />{breakdown.artisan_name}</span>}
        </div>

        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className={`${t.chipBg} rounded-xl p-2 text-center`}><div className="text-sm font-semibold text-brand-400">{downtime}</div><div className={`text-[10px] ${t.textFaint}`}>Downtime</div></div>
          <div className={`${t.chipBg} rounded-xl p-2 text-center`}><div className="text-sm font-semibold text-emerald-400">${cost.toFixed(0)}</div><div className={`text-[10px] ${t.textFaint}`}>Cost</div></div>
        </div>

        {isExpanded && (
          <div className={`pt-3 border-t ${t.border} space-y-1.5 mb-3`}>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
              <div><span className={t.textFaint}>B/down Start:</span> <span className={`ml-1 ${t.textMuted}`}>{formatTime(breakdown.breakdown_start)}</span></div>
              <div><span className={t.textFaint}>B/down End:</span> <span className={`ml-1 ${t.textMuted}`}>{formatTime(breakdown.breakdown_end)}</span></div>
              <div><span className={t.textFaint}>Work Start:</span> <span className={`ml-1 ${t.textMuted}`}>{formatTime(breakdown.work_start)}</span></div>
              <div><span className={t.textFaint}>Work End:</span> <span className={`ml-1 ${t.textMuted}`}>{formatTime(breakdown.work_end)}</span></div>
              <div className="col-span-2"><span className={t.textFaint}>Department:</span> <span className={`ml-1 ${t.textMuted}`}>{breakdown.department}</span></div>
              {breakdown.work_done && <div className="col-span-2"><span className={t.textFaint}>Work Done:</span> <span className={`ml-1 line-clamp-2 ${t.textMuted}`}>{breakdown.work_done}</span></div>}
            </div>
          </div>
        )}

        <div className={`flex items-center justify-between pt-3 border-t ${t.border}`}>
          <div className={`flex items-center gap-1 text-xs ${t.textFaint}`}><Calendar className="h-3 w-3" />{formatDate(breakdown.breakdown_date)}</div>
          <div className="flex items-center gap-1">
            <button type="button" title="View" onClick={() => onView(breakdown)} className={`h-7 w-7 flex items-center justify-center rounded-md ${t.chipBg} ${t.textFaint} hover:text-brand-400`}><Eye className="h-3.5 w-3.5" /></button>
            <button type="button" title="Edit" onClick={() => onEdit(breakdown)} className={`h-7 w-7 flex items-center justify-center rounded-md ${t.chipBg} ${t.textFaint} hover:text-amber-400`}><Edit className="h-3.5 w-3.5" /></button>
            <button type="button" title="Delete" onClick={() => onDelete(breakdown)} className={`h-7 w-7 flex items-center justify-center rounded-md ${t.chipBg} ${t.textFaint} hover:text-rose-500`}><Trash2 className="h-3.5 w-3.5" /></button>
          </div>
        </div>
      </div>
    </GlowCard>
  );
}

// ─── SORT BUTTON ──────────────────────────────────────────────────────────────

function SortBtn({ field, label, sortField, sortDirection, onSort }: { field: string; label: string; sortField: string; sortDirection: string; onSort: (f: string) => void; }) {
  const t = useTheme();
  const active = sortField === field;
  return (
    <button type="button" onClick={() => onSort(field)} className={`flex items-center gap-1 text-xs font-semibold uppercase tracking-wider transition-colors ${t.textFaint} ${t.hoverText}`}>
      {label}
      <div className="flex flex-col">
        <ChevronUp className={`h-2.5 w-2.5 -mb-0.5 ${active && sortDirection === 'asc' ? 'text-brand-400' : 'opacity-30'}`} />
        <ChevronDown className={`h-2.5 w-2.5 ${active && sortDirection === 'desc' ? 'text-brand-400' : 'opacity-30'}`} />
      </div>
    </button>
  );
}

// ─── BREAKDOWN TABLE ──────────────────────────────────────────────────────────

function BreakdownTable({ breakdowns, onView, onEdit, onDelete, sortField, sortDirection, onSort, expandedItems, onToggleExpand }: {
  breakdowns: Breakdown[]; onView: (b: Breakdown) => void; onEdit: (b: Breakdown) => void; onDelete: (b: Breakdown) => void;
  sortField: string; sortDirection: string; onSort: (f: string) => void; expandedItems: Set<string>; onToggleExpand: (id: string) => void;
}) {
  const t = useTheme();
  if (!breakdowns.length) {
    return (
      <div className="text-center py-16">
        <div className={`mx-auto w-14 h-14 rounded-full ${t.chipBg} flex items-center justify-center mb-4`}><AlertCircle className="h-6 w-6 text-brand-400/60" /></div>
        <p className={`text-sm font-medium ${t.textMuted}`}>No breakdowns match your filters</p>
        <p className={`text-xs mt-1 ${t.textFaint}`}>Try clearing filters or log a new breakdown</p>
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className={`border-b ${t.border}`}>
            <th className="w-10 py-3 px-3" aria-label="Expand row"></th>
            <th className="py-3 px-3 text-left"><SortBtn field="machine_name" label="Machine" sortField={sortField} sortDirection={sortDirection} onSort={onSort} /></th>
            <th className="py-3 px-3 text-left"><SortBtn field="breakdown_date" label="Date" sortField={sortField} sortDirection={sortDirection} onSort={onSort} /></th>
            {['Status', 'Priority', 'Type', 'Artisan', 'Downtime', 'Cost'].map(h => <th key={h} className={`py-3 px-3 text-left text-xs font-semibold uppercase tracking-wider ${t.textFaint}`}>{h}</th>)}
            <th className={`py-3 px-3 text-right text-xs font-semibold uppercase tracking-wider ${t.textFaint}`}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {breakdowns.map(bd => {
            const downtime = minutesToDisplay(calcDowntime(bd.breakdown_start, bd.breakdown_end));
            const cost = sparesTotalCost(bd.spares_used);
            const rowId = String(bd.id);
            const isExp = expandedItems.has(rowId);
            const sMeta = STATUS_META[bd.status] ?? STATUS_META.logged;
            const pMeta = PRIORITY_META[bd.priority] ?? PRIORITY_META.medium;
            const tMeta = TYPE_META[bd.breakdown_type] ?? TYPE_META.other;
            return (
              <Fragment key={rowId}>
                <tr className={`border-b ${t.border} ${t.hoverBgSoft} transition-colors`}>
                  <td className="py-2.5 px-3">
                    <button type="button" onClick={() => onToggleExpand(rowId)} className={`h-6 w-6 flex items-center justify-center rounded ${t.textFaint} ${t.hoverText}`}>
                      {isExp ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </button>
                  </td>
                  <td className="py-2.5 px-3"><div className={`font-medium truncate max-w-[140px] ${t.textMuted}`}>{bd.machine_name}</div><div className={`text-xs truncate ${t.textFaint}`}>{bd.machine_id}</div></td>
                  <td className={`py-2.5 px-3 whitespace-nowrap ${t.textMuted}`}>{formatDate(bd.breakdown_date)}</td>
                  <td className="py-2.5 px-3"><StatusBadge color={sMeta.color} label={sMeta.name} dot /></td>
                  <td className="py-2.5 px-3"><StatusBadge color={pMeta.color} label={pMeta.name} /></td>
                  <td className="py-2.5 px-3"><StatusBadge color={tMeta.color} label={tMeta.name} /></td>
                  <td className={`py-2.5 px-3 whitespace-nowrap ${t.textMuted}`}>{bd.artisan_name || '—'}</td>
                  <td className="py-2.5 px-3"><span className="flex items-center gap-1 text-brand-400 font-medium"><Clock className="h-3 w-3" />{downtime}</span></td>
                  <td className="py-2.5 px-3 text-emerald-400 font-medium">${cost.toFixed(0)}</td>
                  <td className="py-2.5 px-3">
                    <div className="flex items-center justify-end gap-1">
                      <button type="button" title="View" onClick={() => onView(bd)} className={`h-6 w-6 flex items-center justify-center rounded ${t.textFaint} hover:text-brand-400`}><Eye className="h-3.5 w-3.5" /></button>
                      <button type="button" title="Edit" onClick={() => onEdit(bd)} className={`h-6 w-6 flex items-center justify-center rounded ${t.textFaint} hover:text-amber-400`}><Edit className="h-3.5 w-3.5" /></button>
                      <button type="button" title="Delete" onClick={() => onDelete(bd)} className={`h-6 w-6 flex items-center justify-center rounded ${t.textFaint} hover:text-rose-500`}><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </td>
                </tr>
                {isExp && (
                  <tr className={`border-b ${t.border} ${t.chipBg}`}>
                    <td colSpan={10} className="px-4 py-3">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                        <div className="space-y-1">
                          <p className={`font-semibold uppercase tracking-wider text-[10px] mb-1.5 ${t.textFaint}`}>Breakdown Details</p>
                          <p className={t.textMuted}><span className={t.textFaint}>Description:</span> {bd.breakdown_description || '—'}</p>
                          <p className={t.textMuted}><span className={t.textFaint}>Location:</span> {bd.location}</p>
                          <p className={t.textMuted}><span className={t.textFaint}>Department:</span> {bd.department}</p>
                        </div>
                        <div className="space-y-1">
                          <p className={`font-semibold uppercase tracking-wider text-[10px] mb-1.5 ${t.textFaint}`}>Timing</p>
                          <p className={t.textMuted}><span className={t.textFaint}>Breakdown:</span> {formatTime(bd.breakdown_start)} – {formatTime(bd.breakdown_end)}</p>
                          <p className={t.textMuted}><span className={t.textFaint}>Work:</span> {formatTime(bd.work_start)} – {formatTime(bd.work_end)}</p>
                          <p className={t.textMuted}><span className={t.textFaint}>Total Downtime:</span> {downtime}</p>
                        </div>
                        <div className="space-y-1">
                          <p className={`font-semibold uppercase tracking-wider text-[10px] mb-1.5 ${t.textFaint}`}>Work & Recommendations</p>
                          <p className={`break-words ${t.textMuted}`}><span className={t.textFaint}>Work Done:</span> {bd.work_done || '—'}</p>
                          <p className={`break-words ${t.textMuted}`}><span className={t.textFaint}>Recommendations:</span> {bd.artisan_recommendations || '—'}</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── DETAILS MODAL ────────────────────────────────────────────────────────────

function DetailsModal({ breakdown, isOpen, onClose, onEdit, onDelete }: {
  breakdown: Breakdown | null; isOpen: boolean; onClose: () => void; onEdit: (b: Breakdown) => void; onDelete: (b: Breakdown) => void;
}) {
  const t = useTheme();
  if (!breakdown) return null;
  const downtime = minutesToDisplay(calcDowntime(breakdown.breakdown_start, breakdown.breakdown_end));
  const cost = sparesTotalCost(breakdown.spares_used);
  const sMeta = STATUS_META[breakdown.status] ?? STATUS_META.logged;
  const pMeta = PRIORITY_META[breakdown.priority] ?? PRIORITY_META.medium;
  const tMeta = TYPE_META[breakdown.breakdown_type] ?? TYPE_META.other;

  return (
    <CenterModal open={isOpen} onClose={onClose} title={breakdown.machine_name} accent="violet" width="max-w-2xl">
      <div className="p-5 space-y-4">
        <div className="flex flex-wrap gap-2">
          <StatusBadge color={sMeta.color} label={sMeta.name} dot />
          <StatusBadge color={pMeta.color} label={pMeta.name} />
          <StatusBadge color={tMeta.color} label={tMeta.name} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Machine ID', val: breakdown.machine_id || '—' }, { label: 'Artisan', val: breakdown.artisan_name || 'Unassigned' },
            { label: 'Location', val: breakdown.location || '—' }, { label: 'Department', val: breakdown.department || '—' },
            { label: 'Breakdown Date', val: formatDate(breakdown.breakdown_date) }, { label: 'Total Downtime', val: downtime },
          ].map(({ label, val }) => (
            <div key={label} className={`${t.chipBg} rounded-xl p-3`}><span className={`text-[10px] font-semibold uppercase tracking-wider block mb-0.5 ${t.textFaint}`}>{label}</span><span className={`text-sm ${t.textMuted}`}>{val}</span></div>
          ))}
        </div>

        <div>
          <span className={`text-[10px] font-semibold uppercase tracking-wider block mb-0.5 ${t.textFaint}`}>Description</span>
          <div className={`${t.chipBg} rounded-xl p-3 text-sm whitespace-pre-wrap break-words ${t.textMuted}`}>{breakdown.breakdown_description || 'No description'}</div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Breakdown Start', val: formatTime(breakdown.breakdown_start) }, { label: 'Breakdown End', val: formatTime(breakdown.breakdown_end) },
            { label: 'Work Start', val: formatTime(breakdown.work_start) }, { label: 'Work End', val: formatTime(breakdown.work_end) },
          ].map(({ label, val }) => (
            <div key={label} className={`${t.chipBg} rounded-xl p-3`}><span className={`text-[10px] font-semibold uppercase tracking-wider block mb-0.5 ${t.textFaint}`}>{label}</span><span className={`text-sm ${t.textMuted}`}>{val}</span></div>
          ))}
        </div>

        {breakdown.work_done && <div><span className={`text-[10px] font-semibold uppercase tracking-wider block mb-0.5 ${t.textFaint}`}>Work Performed</span><div className={`${t.chipBg} rounded-xl p-3 text-sm whitespace-pre-wrap break-words ${t.textMuted}`}>{breakdown.work_done}</div></div>}
        {breakdown.artisan_recommendations && <div><span className={`text-[10px] font-semibold uppercase tracking-wider block mb-0.5 ${t.textFaint}`}>Recommendations</span><div className={`${t.chipBg} rounded-xl p-3 text-sm whitespace-pre-wrap break-words ${t.textMuted}`}>{breakdown.artisan_recommendations}</div></div>}

        {Array.isArray(breakdown.spares_used) && breakdown.spares_used.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2"><span className={`text-[10px] font-semibold uppercase tracking-wider ${t.textFaint}`}>Spare Parts Used</span><span className="text-xs font-semibold text-emerald-400">Total: ${cost.toFixed(2)}</span></div>
            <div className="space-y-1.5">
              {(breakdown.spares_used as SpareUsed[]).map((spare, i) => (
                <div key={i} className={`flex justify-between items-center ${t.chipBg} rounded-xl px-3 py-2 text-sm`}>
                  <span className={t.textMuted}>{spare.name} ×{spare.quantity}</span>
                  <span className="text-emerald-400 font-medium">${spare.total_cost?.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <button type="button" onClick={onClose} className={`flex-1 py-2.5 rounded-xl text-sm ${t.textMuted} ${t.hoverText} border ${t.border}`}>Close</button>
          <button type="button" onClick={() => { onEdit(breakdown); onClose(); }} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-br from-amber-500 to-amber-700 hover:brightness-110">Edit</button>
          <button type="button" onClick={() => { onDelete(breakdown); onClose(); }} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-br from-rose-500 to-rose-700 hover:brightness-110">Delete</button>
        </div>
      </div>
    </CenterModal>
  );
}

// ─── FORM MODAL ───────────────────────────────────────────────────────────────

const FORM_TABS = [{ key: 'basic', label: 'Basic' }, { key: 'details', label: 'Details' }, { key: 'spares', label: 'Spares' }, { key: 'timing', label: 'Timing' }] as const;
type FormTab = (typeof FORM_TABS)[number]['key'];

const EMPTY_FORM: BreakdownFormData = {
  machine_id: '', machine_name: '', breakdown_description: '', artisan_name: '',
  breakdown_date: new Date().toISOString().split('T')[0],
  location: '', department: '', breakdown_type: 'mechanical', work_done: '',
  artisan_recommendations: '', status: 'logged', priority: 'medium',
  breakdown_start: '', breakdown_end: '', work_start: '', work_end: '', spares_used: [],
};

function FormModal({ isOpen, onClose, onSubmit, initialData, mode = 'create' }: {
  isOpen: boolean; onClose: () => void; onSubmit: (fd: BreakdownFormData) => Promise<void>; initialData: Breakdown | null; mode?: 'create' | 'edit';
}) {
  const t = useTheme();
  const [fd, setFd] = useState<BreakdownFormData>(EMPTY_FORM);
  const [spareForm, setSpareForm] = useState({ name: '', part_number: '', quantity: 1, unit_price: 0 });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [tab, setTab] = useState<FormTab>('basic');
  const inputCls = `w-full h-9 px-3 rounded-lg text-sm ${t.inputBg} focus:outline-none`;

  useEffect(() => {
    if (initialData) {
      setFd({
        machine_id: initialData.machine_id || '', machine_name: initialData.machine_name || '',
        breakdown_description: initialData.breakdown_description || '', artisan_name: initialData.artisan_name || '',
        breakdown_date: initialData.breakdown_date ? new Date(initialData.breakdown_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        location: initialData.location || '', department: initialData.department || '', breakdown_type: initialData.breakdown_type || 'mechanical',
        work_done: initialData.work_done || '', artisan_recommendations: initialData.artisan_recommendations || '',
        status: initialData.status || 'logged', priority: initialData.priority || 'medium',
        breakdown_start: initialData.breakdown_start ?? '', breakdown_end: initialData.breakdown_end ?? '',
        work_start: initialData.work_start ?? '', work_end: initialData.work_end ?? '',
        spares_used: Array.isArray(initialData.spares_used) ? initialData.spares_used : [],
      });
    } else setFd(EMPTY_FORM);
    setTab('basic'); setErrors({});
  }, [initialData, isOpen]);

  const set = (field: keyof BreakdownFormData, val: unknown) => setFd(p => ({ ...p, [field]: val }));

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!fd.machine_name.trim()) e.machine_name = 'Machine name is required';
    if (!fd.breakdown_description.trim()) e.breakdown_description = 'Description is required';
    if (!fd.artisan_name.trim()) e.artisan_name = 'Artisan name is required';
    if (!fd.location.trim()) e.location = 'Location is required';
    if (!fd.department) e.department = 'Department is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try { await onSubmit(fd); onClose(); }
    catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Failed to save breakdown'); }
    finally { setLoading(false); }
  };

  const addSpare = () => {
    if (!spareForm.name.trim()) { setErrors(p => ({ ...p, spare: 'Spare part name is required' })); return; }
    setFd(p => ({ ...p, spares_used: [...p.spares_used, { ...spareForm, total_cost: spareForm.quantity * spareForm.unit_price }] }));
    setSpareForm({ name: '', part_number: '', quantity: 1, unit_price: 0 });
    setErrors(p => ({ ...p, spare: '' }));
  };
  const removeSpare = (idx: number) => setFd(p => ({ ...p, spares_used: p.spares_used.filter((_, i) => i !== idx) }));

  const calcPreview = fd.breakdown_start && fd.breakdown_end ? minutesToDisplay(timeToMinutes(fd.breakdown_end) - timeToMinutes(fd.breakdown_start)) : null;

  return (
    <CenterModal open={isOpen} onClose={onClose} title={mode === 'create' ? 'Log New Breakdown' : 'Edit Breakdown'} accent="violet" width="max-w-3xl">
      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        <div className={`flex gap-1 p-1 ${t.glassSoft} rounded-xl`}>
          {FORM_TABS.map(tb => (
            <button key={tb.key} type="button" onClick={() => setTab(tb.key)}
              className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${tab === tb.key ? 'bg-brand-500/20 text-brand-400' : `${t.textFaint} ${t.hoverText}`}`}>
              {tb.label}
            </button>
          ))}
        </div>

        {tab === 'basic' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="Machine Name" required>
              <AutofillInput field="machine_name" className={inputCls} value={fd.machine_name} onChange={v => set('machine_name', v)} placeholder="e.g., CNC Machine" />
              {errors.machine_name && <p className="text-xs text-rose-500 mt-1">{errors.machine_name}</p>}
            </FormField>
            <FormField label="Machine ID"><input className={inputCls} value={fd.machine_id} onChange={e => set('machine_id', e.target.value)} placeholder="Optional" /></FormField>
            <FormField label="Artisan Name" required><ArtisanField value={fd.artisan_name} onChange={(name, emp) => { set('artisan_name', name); if (emp?.department) set('department', emp.department); }} error={errors.artisan_name} /></FormField>
            <FormField label="Breakdown Date" required><input type="date" title="Breakdown date" className={inputCls} value={fd.breakdown_date} onChange={e => set('breakdown_date', e.target.value)} /></FormField>
            <div className="sm:col-span-2">
              <FormField label="Description" required>
                <PredictiveField historyKey="bd_description" value={fd.breakdown_description} onChange={v => set('breakdown_description', v)} multiline rows={3}
                  placeholder="Describe what happened…" hints={['Machine stopped unexpectedly', 'Electrical fault detected', 'Mechanical failure on', 'Overheating reported on', 'Hydraulic leak detected', 'Belt snapped on']} error={errors.breakdown_description} />
              </FormField>
            </div>
          </div>
        )}

        {tab === 'details' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="Status"><SelectField size="form" title="Status" value={fd.status} onChange={v => set('status', v)} options={Object.entries(STATUS_META).map(([k, v]) => ({ value: k, label: v.name }))} /></FormField>
            <FormField label="Priority"><SelectField size="form" title="Priority" value={fd.priority} onChange={v => set('priority', v)} options={Object.entries(PRIORITY_META).map(([k, v]) => ({ value: k, label: v.name }))} /></FormField>
            <FormField label="Breakdown Type"><SelectField size="form" title="Breakdown type" value={fd.breakdown_type} onChange={v => set('breakdown_type', v)} options={Object.entries(TYPE_META).map(([k, v]) => ({ value: k, label: v.name }))} /></FormField>
            <FormField label="Location" required>
              <PredictiveField historyKey="bd_location" value={fd.location} onChange={v => set('location', v)} placeholder="e.g., Production Line A"
                hints={['Main Workshop', 'Crusher Bay', 'Processing Plant', 'Pit Area', 'Conveyor Belt', 'Electrical Substation', 'Compressor Room', 'Administration Block']} error={errors.location} />
            </FormField>
            <FormField label="Department" required>
              <SelectField size="form" title="Department" value={fd.department} onChange={v => set('department', v)}
                placeholder="Select department" options={DEPARTMENTS.map(d => ({ value: d, label: d }))} />
              {errors.department && <p className="text-xs text-rose-500 mt-1">{errors.department}</p>}
            </FormField>
            <div className="sm:col-span-2">
              <FormField label="Work Done"><PredictiveField historyKey="bd_work_done" value={fd.work_done} onChange={v => set('work_done', v)} multiline rows={2} placeholder="Describe the work performed…" hints={['Replaced bearing', 'Repaired electrical fault', 'Replaced belt', 'Cleaned and serviced', 'Replaced hydraulic seal', 'Calibrated sensor']} /></FormField>
            </div>
            <div className="sm:col-span-2">
              <FormField label="Recommendations"><PredictiveField historyKey="bd_recommendations" value={fd.artisan_recommendations} onChange={v => set('artisan_recommendations', v)} multiline rows={2} placeholder="Enter recommendations…" hints={['Schedule preventive maintenance', 'Replace worn components', 'Monitor closely for next 48 hours', 'Train operators on correct usage', 'Order spare parts']} /></FormField>
            </div>
          </div>
        )}

        {tab === 'spares' && (
          <div className="space-y-3">
            <div className={`${t.chipBg} rounded-xl p-3`}>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
                <input className={inputCls} placeholder="Part Name" value={spareForm.name} onChange={e => setSpareForm(p => ({ ...p, name: e.target.value }))} />
                <input className={inputCls} placeholder="Part Number" value={spareForm.part_number} onChange={e => setSpareForm(p => ({ ...p, part_number: e.target.value }))} />
                <input type="number" className={inputCls} placeholder="Quantity" value={String(spareForm.quantity)} onChange={e => setSpareForm(p => ({ ...p, quantity: parseInt(e.target.value) || 1 }))} />
                <input type="number" className={inputCls} placeholder="Unit Price" value={String(spareForm.unit_price)} onChange={e => setSpareForm(p => ({ ...p, unit_price: parseFloat(e.target.value) || 0 }))} />
              </div>
              <button type="button" onClick={addSpare} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-500/15 text-brand-400 hover:bg-brand-500/25 transition-all"><Plus className="h-3.5 w-3.5" />Add Spare</button>
              {errors.spare && <p className="mt-1 text-[11px] text-rose-500">{errors.spare}</p>}
            </div>
            {fd.spares_used.length > 0 && (
              <div className="space-y-1.5">
                <p className={`text-xs font-semibold uppercase tracking-wider ${t.textFaint}`}>Parts Added</p>
                {fd.spares_used.map((s, i) => (
                  <div key={i} className={`flex justify-between items-center ${t.chipBg} rounded-xl px-3 py-2 text-sm`}>
                    <div><span className={`font-medium ${t.textMuted}`}>{s.name}</span>{s.part_number && <span className={`ml-2 text-xs ${t.textFaint}`}>({s.part_number})</span>}<span className={`ml-2 text-xs ${t.textFaint}`}>{s.quantity} × ${s.unit_price}</span></div>
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-400 font-semibold">${(s.quantity * s.unit_price).toFixed(2)}</span>
                      <button type="button" title="Remove spare part" onClick={() => removeSpare(i)} className="h-6 w-6 flex items-center justify-center rounded text-rose-500/60 hover:text-rose-500"><Trash2 className="h-3 w-3" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'timing' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Breakdown Start"><input type="time" title="Breakdown start" className={inputCls} value={fd.breakdown_start} onChange={e => set('breakdown_start', e.target.value)} /></FormField>
              <FormField label="Breakdown End"><input type="time" title="Breakdown end" className={inputCls} value={fd.breakdown_end} onChange={e => set('breakdown_end', e.target.value)} /></FormField>
              <FormField label="Work Start"><input type="time" title="Work start" className={inputCls} value={fd.work_start} onChange={e => set('work_start', e.target.value)} /></FormField>
              <FormField label="Work End"><input type="time" title="Work end" className={inputCls} value={fd.work_end} onChange={e => set('work_end', e.target.value)} /></FormField>
            </div>
            {calcPreview && <div className="bg-brand-500/[0.08] rounded-xl p-3 text-sm"><span className={t.textFaint}>Calculated Downtime: </span><span className="text-brand-400 font-semibold">{calcPreview}</span></div>}
          </div>
        )}

        <FormActions onCancel={onClose} submitting={loading} submitLabel={mode === 'create' ? 'Create Breakdown' : 'Update Breakdown'} accent="violet" />
      </form>
    </CenterModal>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

function BreakdownsPageContent() {
  const t = useTheme();
  const [breakdowns, setBreakdowns] = useState<Breakdown[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  const [sortField, setSortField] = useState('breakdown_date');
  const [activeView, setActiveView] = useState<'records' | 'analytics'>('records');
  const [sortDirection, setSortDirection] = useState('desc');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(true);

  const [filters, setFilters] = useState<Filters>({ status: 'all', breakdown_type: 'all', priority: 'all', department: 'all', location: 'all' });
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState(() => { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().split('T')[0]; });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [showDateRange, setShowDateRange] = useState(false);

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [selectedBd, setSelectedBd] = useState<Breakdown | null>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [deleteTarget, setDeleteTarget] = useState<Breakdown | null>(null);

  const sections = useCollapseSection({ hero: true });

  const filteredBreakdowns = useMemo(() => {
    let result = [...breakdowns];
    if (searchTerm.trim()) {
      const s = searchTerm.toLowerCase();
      result = result.filter(b => b.machine_name?.toLowerCase().includes(s) || b.machine_id?.toLowerCase().includes(s) || b.breakdown_description?.toLowerCase().includes(s) || b.artisan_name?.toLowerCase().includes(s) || b.location?.toLowerCase().includes(s));
    }
    result.sort((a, b) => {
      if (sortField === 'breakdown_date') { const cmp = new Date(a.breakdown_date).getTime() - new Date(b.breakdown_date).getTime(); return sortDirection === 'asc' ? cmp : -cmp; }
      const cmp = String(a[sortField as keyof Breakdown] ?? '').localeCompare(String(b[sortField as keyof Breakdown] ?? ''));
      return sortDirection === 'asc' ? cmp : -cmp;
    });
    return result;
  }, [breakdowns, searchTerm, sortField, sortDirection]);

  const metrics = useMemo(() => {
    const total = filteredBreakdowns.length;
    const active = filteredBreakdowns.filter(b => b.status === 'logged' || b.status === 'in_progress').length;
    const critical = filteredBreakdowns.filter(b => b.priority === 'critical').length;
    const resolved = filteredBreakdowns.filter(b => b.status === 'resolved' || b.status === 'closed');
    const avgRes = resolved.length > 0 ? (resolved.reduce((s, b) => s + calcDowntime(b.breakdown_start, b.breakdown_end), 0) / 60 / resolved.length).toFixed(1) : '0';
    return { total, active, critical, avgRes };
  }, [filteredBreakdowns]);

  const activeFilterCount = useMemo(() => {
    let c = 0;
    if (filters.status !== 'all') c++; if (filters.breakdown_type !== 'all') c++; if (filters.priority !== 'all') c++;
    if (filters.department !== 'all') c++; if (filters.location !== 'all' && filters.location !== '') c++;
    if (searchTerm) c++; if (showDateRange) c++;
    return c;
  }, [filters, searchTerm, showDateRange]);

  const loadBreakdowns = useCallback(async () => {
    setLoading(true);
    try {
      const q: Record<string, string> = {};
      if (filters.status !== 'all') q.status = filters.status;
      if (filters.breakdown_type !== 'all') q.breakdown_type = filters.breakdown_type;
      if (filters.priority !== 'all') q.priority = filters.priority;
      if (filters.department !== 'all') q.department = filters.department;
      if (filters.location !== 'all' && filters.location !== '') q.location = filters.location;
      if (showDateRange && startDate && endDate) { q.start_date = startDate; q.end_date = endDate; }
      setBreakdowns(await fetchBreakdowns(q));
      setLoadError('');
    } catch (e) {
      // Keep the error visible instead of blanking the list into a "no breakdowns
      // found / log your first" state that looks like an empty database.
      setLoadError(e instanceof Error ? e.message : 'Could not load breakdowns.');
      toast.error('Failed to load breakdowns');
      setBreakdowns([]);
    }
    finally { setLoading(false); }
  }, [filters, startDate, endDate, showDateRange]);

  useEffect(() => { loadBreakdowns(); }, [loadBreakdowns]);

  const clearFilters = () => { setFilters({ status: 'all', breakdown_type: 'all', priority: 'all', department: 'all', location: 'all' }); setSearchTerm(''); setShowDateRange(false); };
  const handleSort = (field: string) => { if (sortField === field) setSortDirection(p => p === 'asc' ? 'desc' : 'asc'); else { setSortField(field); setSortDirection('desc'); } };
  const toggleExpand = (id: string) => setExpandedItems(p => { const s = new Set(p); s.has(id) ? s.delete(id) : s.add(id); return s; });
  const handleView = (bd: Breakdown) => { setSelectedBd(bd); setDetailsOpen(true); };
  const handleEdit = (bd: Breakdown) => { if (!bd.id) { toast.error('Invalid breakdown ID'); return; } setSelectedBd(bd); setFormMode('edit'); setFormOpen(true); };
  const handleDelete = (bd: Breakdown) => { if (!bd.id) { toast.error('Invalid breakdown ID'); return; } setDeleteTarget(bd); };
  const confirmDelete = async () => {
    if (!deleteTarget?.id) return;
    try { await deleteBreakdown(deleteTarget.id); toast.success('Breakdown deleted'); await loadBreakdowns(); }
    catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Delete failed'); }
    setDeleteTarget(null);
  };
  const handleCreate = () => { setSelectedBd(null); setFormMode('create'); setFormOpen(true); };
  const handleFormSubmit = async (formData: BreakdownFormData) => {
    if (formMode === 'create') { await createBreakdown(formData); toast.success('Breakdown created'); }
    else { if (!selectedBd?.id) throw new Error('Invalid ID'); await updateBreakdown(selectedBd.id, formData); toast.success('Breakdown updated'); }
    await loadBreakdowns();
  };

  async function downloadExcel() {
    try {
      const ExcelJS = (await import('exceljs')).default;
      const { saveAs } = await import('file-saver');
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Breakdowns');
      ws.columns = [
        { header: 'Machine', key: 'machine_name', width: 22 }, { header: 'Machine ID', key: 'machine_id', width: 14 },
        { header: 'Description', key: 'breakdown_description', width: 32 }, { header: 'Status', key: 'status', width: 14 },
        { header: 'Priority', key: 'priority', width: 12 }, { header: 'Type', key: 'breakdown_type', width: 14 },
        { header: 'Location', key: 'location', width: 18 }, { header: 'Department', key: 'department', width: 16 },
        { header: 'Artisan', key: 'artisan_name', width: 18 }, { header: 'Date', key: 'breakdown_date', width: 14 },
        { header: 'Downtime', key: 'downtime', width: 12 }, { header: 'Cost', key: 'cost', width: 12 },
      ];
      const hdr = ws.getRow(1);
      hdr.eachCell(cell => { cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 }; cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2A4D69' } }; });
      filteredBreakdowns.forEach(bd => ws.addRow({
        machine_name: bd.machine_name, machine_id: bd.machine_id, breakdown_description: bd.breakdown_description,
        status: STATUS_META[bd.status]?.name ?? bd.status, priority: PRIORITY_META[bd.priority]?.name ?? bd.priority,
        breakdown_type: TYPE_META[bd.breakdown_type]?.name ?? bd.breakdown_type, location: bd.location, department: bd.department,
        artisan_name: bd.artisan_name, breakdown_date: formatDate(bd.breakdown_date),
        downtime: minutesToDisplay(calcDowntime(bd.breakdown_start, bd.breakdown_end)), cost: sparesTotalCost(bd.spares_used).toFixed(2),
      }));
      const buf = await wb.xlsx.writeBuffer();
      saveAs(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `breakdowns_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success('Excel exported');
    } catch (err) { toast.error(`Export failed: ${(err as Error).message}`); }
  }

  return (
    <main className="max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <PageHero
        icon={Wrench}
        accent="violet"
        crumbs={['Operations & Maintenance', 'Breakdowns']}
        title="Equipment Breakdowns"
        description="Log, track, and resolve equipment failures"
        statsOpen={sections.expanded.hero}
        actions={
          <>
            <button type="button" onClick={downloadExcel} disabled={filteredBreakdowns.length === 0} title="Download Excel" className={`h-8 w-8 flex items-center justify-center rounded-lg ${t.hoverBg} ${t.textFaint} ${t.hoverText} disabled:opacity-40`}><Download className="h-4 w-4" /></button>
            <button type="button" onClick={handleCreate} className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-[13px] font-semibold text-white bg-gradient-to-br from-brand-500 to-brand-700 hover:brightness-110 transition-all"><Plus className="h-3.5 w-3.5" /> New Breakdown</button>
          </>
        }
      >
        <div className="flex flex-wrap gap-1">
          <StatTile icon={Wrench} color={ACCENT_HEX.blue} value={metrics.total} label="Total" />
          <StatTile icon={Activity} color="#f59e0b" value={metrics.active} label="Active" />
          <StatTile icon={AlertTriangle} color="#f43f5e" value={metrics.critical} label="Critical" />
          <StatTile icon={TrendingUp} color="#34d399" value={`${metrics.avgRes}h`} label="Avg Resolution" />
        </div>
      </PageHero>

      {/* Filters */}
      <div className={`${t.glass} rounded-2xl ${t.shadow} p-4 space-y-4`}>
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 pointer-events-none ${t.textFaint}`} />
            <input type="text" aria-label="Search breakdowns" placeholder="Search machine, artisan, location…" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              className={`w-full h-9 pl-9 pr-3 rounded-xl text-sm ${t.inputBg} focus:outline-none`} />
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            <button type="button" onClick={() => setShowDateRange(p => !p)} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${showDateRange ? 'bg-brand-500/15 text-brand-400' : `${t.chipBg} ${t.textMuted} ${t.hoverBg}`}`}><Calendar className="h-3.5 w-3.5" />Date Range</button>
            <button type="button" onClick={() => setShowFilters(v => !v)} className={`flex items-center gap-1.5 h-8 px-3 rounded-lg text-[13px] font-medium transition-colors ${showFilters ? 'bg-brand-500/15 text-brand-400' : `${t.textMuted} ${t.glassSoft} ${t.hoverText}`}`}><Filter className="h-3.5 w-3.5" /> Filters {activeFilterCount > 0 && <span className={`ml-1 px-1.5 py-0.5 ${t.chipBg} rounded text-[10px]`}>{activeFilterCount}</span>}</button>
            {activeFilterCount > 0 && <button type="button" onClick={clearFilters} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold ${t.textFaint} ${t.chipBg} ${t.hoverText}`}><FilterX className="h-3.5 w-3.5" />Clear</button>}
          </div>
        </div>

        {showDateRange && (
          <div className={`flex flex-wrap gap-3 ${t.chipBg} rounded-xl p-3`}>
            <FormField label="Start Date"><input type="date" title="Start date" value={startDate} onChange={e => setStartDate(e.target.value)} className={`h-9 px-3 rounded-lg text-sm ${t.inputBg} focus:outline-none`} /></FormField>
            <FormField label="End Date"><input type="date" title="End date" value={endDate} onChange={e => setEndDate(e.target.value)} className={`h-9 px-3 rounded-lg text-sm ${t.inputBg} focus:outline-none`} /></FormField>
            <div className="self-end">
              <button type="button" onClick={() => { const now = new Date(), m = new Date(); m.setDate(now.getDate() - 30); setStartDate(m.toISOString().split('T')[0]); setEndDate(now.toISOString().split('T')[0]); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${t.textMuted} ${t.glassSoft} ${t.hoverText}`}>Last 30 days</button>
            </div>
          </div>
        )}

        {showFilters && (
          <div className={`pt-4 border-t ${t.border} grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3`}>
            <FormField label="Status"><SelectField size="filter" title="Status" value={filters.status} onChange={v => setFilters(p => ({ ...p, status: v }))} options={[{ value: 'all', label: 'All Status' }, ...Object.entries(STATUS_META).map(([k, v]) => ({ value: k, label: v.name }))]} /></FormField>
            <FormField label="Type"><SelectField size="filter" title="Type" value={filters.breakdown_type} onChange={v => setFilters(p => ({ ...p, breakdown_type: v }))} options={[{ value: 'all', label: 'All Types' }, ...Object.entries(TYPE_META).map(([k, v]) => ({ value: k, label: v.name }))]} /></FormField>
            <FormField label="Priority"><SelectField size="filter" title="Priority" value={filters.priority} onChange={v => setFilters(p => ({ ...p, priority: v }))} options={[{ value: 'all', label: 'All Priorities' }, ...Object.entries(PRIORITY_META).map(([k, v]) => ({ value: k, label: v.name }))]} /></FormField>
            <FormField label="Department"><SelectField size="filter" title="Department" value={filters.department} onChange={v => setFilters(p => ({ ...p, department: v }))} options={[{ value: 'all', label: 'All Depts' }, ...DEPARTMENTS.map(d => ({ value: d, label: d }))]} /></FormField>
            <FormField label="Location"><input type="text" aria-label="Filter by location" placeholder="Location…" value={filters.location !== 'all' ? filters.location : ''} onChange={e => setFilters(p => ({ ...p, location: e.target.value || 'all' }))} className={`w-full h-8 px-2 rounded text-[13px] ${t.inputBg} focus:outline-none`} /></FormField>
          </div>
        )}
      </div>

      {/* View toggle tabs */}
      <div className={`flex items-center gap-1 p-1 ${t.glassSoft} rounded-xl w-fit`}>
        <button type="button" onClick={() => setActiveView('records')} className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeView === 'records' ? 'bg-brand-500/20 text-brand-400' : `${t.textFaint} ${t.hoverText}`}`}><TableIcon className="h-3.5 w-3.5 inline mr-1.5" />Records</button>
        <button type="button" onClick={() => setActiveView('analytics')} className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeView === 'analytics' ? 'bg-brand-500/20 text-brand-400' : `${t.textFaint} ${t.hoverText}`}`}><Activity className="h-3.5 w-3.5 inline mr-1.5" />Analytics</button>
      </div>

      {activeView === 'records' && (
        <div className={`${t.glass} rounded-2xl ${t.shadow} overflow-hidden`}>
          <div className={`flex items-center justify-between px-4 py-3 border-b ${t.border}`}>
            <h3 className={`text-sm font-semibold ${t.textPrimary}`}>Breakdown Records ({filteredBreakdowns.length} of {breakdowns.length})</h3>
            <ViewToggle value={viewMode} onChange={setViewMode} options={[{ value: 'table', icon: TableIcon, label: 'Table view' }, { value: 'grid', icon: LayoutGrid, label: 'Grid view' }]} />
          </div>
          {loading ? (
            <div className={`flex items-center justify-center py-16 gap-2 ${t.textFaint}`}><Loader2 className="h-5 w-5 animate-spin" /><span className="text-sm">Loading breakdowns…</span></div>
          ) : loadError ? (
            <div className="text-center py-16">
              <div className={`mx-auto w-14 h-14 rounded-full ${t.chipBg} flex items-center justify-center mb-4`}><AlertTriangle className="h-6 w-6 text-rose-400/70" /></div>
              <p className={`text-sm font-medium ${t.textMuted}`}>Could not load breakdowns</p>
              <p className={`text-xs mt-1 mb-4 ${t.textFaint}`}>{loadError}</p>
              <button type="button" onClick={() => loadBreakdowns()} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-br from-brand-500 to-brand-700 hover:brightness-110"><Loader2 className="h-4 w-4" />Try again</button>
            </div>
          ) : filteredBreakdowns.length === 0 ? (
            <div className="text-center py-16">
              <div className={`mx-auto w-14 h-14 rounded-full ${t.chipBg} flex items-center justify-center mb-4`}><AlertTriangle className="h-6 w-6 text-brand-400/60" /></div>
              <p className={`text-sm font-medium ${t.textMuted}`}>No breakdowns found</p>
              <p className={`text-xs mt-1 mb-4 ${t.textFaint}`}>Try clearing filters or log a new breakdown</p>
              <button type="button" onClick={handleCreate} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-br from-brand-500 to-brand-700 hover:brightness-110"><Plus className="h-4 w-4" />Log First Breakdown</button>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredBreakdowns.map(bd => {
                const id = String(bd.id);
                return <BreakdownCard key={id} breakdown={bd} onView={handleView} onEdit={handleEdit} onDelete={handleDelete} isExpanded={expandedItems.has(id)} onToggleExpand={() => toggleExpand(id)} />;
              })}
            </div>
          ) : (
            <BreakdownTable breakdowns={filteredBreakdowns} onView={handleView} onEdit={handleEdit} onDelete={handleDelete} sortField={sortField} sortDirection={sortDirection} onSort={handleSort} expandedItems={expandedItems} onToggleExpand={toggleExpand} />
          )}
        </div>
      )}

      {activeView === 'analytics' && <AnalyticsView filters={filters} startDate={startDate} endDate={endDate} />}

      <DetailsModal breakdown={selectedBd} isOpen={detailsOpen} onClose={() => setDetailsOpen(false)} onEdit={handleEdit} onDelete={handleDelete} />
      <FormModal isOpen={formOpen} onClose={() => setFormOpen(false)} onSubmit={handleFormSubmit} initialData={selectedBd} mode={formMode} />

      <CenterModal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Breakdown" accent="amber" width="max-w-sm">
        <div className="p-5 space-y-4">
          <p className={`text-sm ${t.textMuted}`}>Delete the breakdown record for &quot;{deleteTarget?.machine_name}&quot; on {deleteTarget?.breakdown_date}? This cannot be undone.</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setDeleteTarget(null)} className={`flex-1 py-2.5 rounded-xl text-sm ${t.textMuted} ${t.hoverText} border ${t.border}`}>Cancel</button>
            <button type="button" onClick={confirmDelete} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-br from-rose-500 to-rose-700 hover:brightness-110 inline-flex items-center justify-center gap-2"><Trash2 className="h-4 w-4" /> Delete</button>
          </div>
        </div>
      </CenterModal>
    </main>
  );
}

// ─── ANALYTICS VIEW ───────────────────────────────────────────────────────────

function AnalyticsView({ filters, startDate, endDate }: { filters: Filters; startDate: string; endDate: string; }) {
  const t = useTheme();
  const [data, setData] = useState<HeatmapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  const maxHeatmapValue = data ? Math.max(...data.heatmap.hour_day.flat(), 1) : 1;
  const axisColor = t.light ? 'rgba(15,23,42,0.45)' : 'rgba(255,255,255,0.4)';
  const gridColor = t.light ? 'rgba(15,23,42,0.08)' : 'rgba(255,255,255,0.05)';

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (startDate) params.append('date_from', startDate);
        if (endDate) params.append('date_to', endDate);
        if (filters.department && filters.department !== 'all') params.append('department', filters.department);
        const json = await api.get<any>(`/api/breakdowns/analytics/heatmap?${params}`);
        if (json.success) setData(json);
      } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed to load analytics'); }
      finally { setLoading(false); }
    })();
  }, [startDate, endDate, filters.department]);

  const tabs = [
    { key: 'overview', label: 'Overview', icon: Layers },
    { key: 'heatmap', label: 'Heatmap', icon: Activity },
    { key: 'machines', label: 'Machines', icon: Wrench },
    { key: 'artisans', label: 'Artisans', icon: Users },
    { key: 'spares', label: 'Spares', icon: Package },
  ];

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-brand-400" /></div>;
  if (!data) return <div className={`${t.glass} rounded-2xl py-20 text-center`}><AlertTriangle className={`h-12 w-12 ${t.textFaint} mx-auto mb-4`} /><p className={t.textFaint}>No analytics data available</p></div>;

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number }[]; label?: string }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className={`${t.glass} rounded-lg px-3 py-2 text-xs ${t.shadow}`}>
        <p className={`mb-1 ${t.textFaint}`}>{label}</p>
        {payload.map((entry, idx) => <p key={idx} className={`font-medium ${t.textPrimary}`}>{entry.name}: {entry.value.toLocaleString()}</p>)}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className={`flex gap-1 p-1 ${t.glassSoft} rounded-xl w-full overflow-x-auto flex-nowrap`}>
        {tabs.map(tb => (
          <button key={tb.key} type="button" onClick={() => setActiveTab(tb.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${activeTab === tb.key ? 'bg-brand-500/20 text-brand-400' : `${t.textFaint} ${t.hoverText}`}`}>
            <tb.icon className="h-3.5 w-3.5" /> {tb.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-4">
          <div className={`${t.glass} rounded-2xl p-4`}>
            <h3 className={`flex items-center gap-2 text-sm font-semibold mb-3 ${t.textPrimary}`}><TrendingUp className="h-4 w-4 text-emerald-400" /> Monthly Breakdown Trends</h3>
            {data.monthly_trends.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <ReAreaChart data={data.monthly_trends} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs><linearGradient id="monthlyGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.3} /><stop offset="95%" stopColor="#10b981" stopOpacity={0} /></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                  <XAxis dataKey="month" tick={{ fill: axisColor, fontSize: 11 }} />
                  <YAxis tick={{ fill: axisColor, fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="count" name="Breakdowns" stroke="#10b981" fill="url(#monthlyGradient)" strokeWidth={2} />
                </ReAreaChart>
              </ResponsiveContainer>
            ) : <p className={`text-xs text-center py-8 ${t.textFaint}`}>No data</p>}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className={`${t.glass} rounded-2xl p-4`}>
              <h3 className={`flex items-center gap-2 text-sm font-semibold mb-3 ${t.textPrimary}`}><Building2 className="h-4 w-4 text-brand-400" /> Department Comparison</h3>
              {data.department_comparison.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <ComposedChart data={data.department_comparison} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                    <XAxis dataKey="department" tick={{ fill: axisColor, fontSize: 10 }} />
                    <YAxis yAxisId="left" tick={{ fill: axisColor, fontSize: 10 }} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fill: axisColor, fontSize: 10 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar yAxisId="left" dataKey="count" name="Breakdowns" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Line yAxisId="right" type="monotone" dataKey="downtime" name="Downtime (min)" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : <p className={`text-xs text-center py-8 ${t.textFaint}`}>No data</p>}
            </div>
            <div className={`${t.glass} rounded-2xl p-4`}>
              <h3 className={`flex items-center gap-2 text-sm font-semibold mb-3 ${t.textPrimary}`}><PieChartIcon className="h-4 w-4 text-violet-400" /> Breakdown Types</h3>
              {data.breakdown_type_distribution.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <RePieChart>
                    <Pie data={data.breakdown_type_distribution} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={2} dataKey="count" nameKey="type"
                      label={(props: { type?: string; percent?: number }) => `${props.type} (${((props.percent ?? 0) * 100).toFixed(0)}%)`} labelLine={{ stroke: gridColor }}>
                      {data.breakdown_type_distribution.map((_, idx) => <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </RePieChart>
                </ResponsiveContainer>
              ) : <p className={`text-xs text-center py-8 ${t.textFaint}`}>No data</p>}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'heatmap' && (
        <div className={`${t.glass} rounded-2xl p-4`}>
          <h3 className={`flex items-center gap-2 text-sm font-semibold ${t.textPrimary}`}><Activity className="h-4 w-4 text-violet-400" /> Hour × Day Heatmap</h3>
          <p className={`text-xs mb-3 ${t.textFaint}`}>Darker = more breakdowns</p>
          <div className="overflow-x-auto">
            <div className="min-w-[600px]">
              <div className="grid grid-cols-[auto_1fr] gap-1 mb-1">
                <div className="w-12" />
                <div className="grid grid-cols-24 gap-0.5">
                  {DAY_NAMES.map((d, i) => <div key={i} className={`text-[9px] text-center ${t.textFaint}`} style={{ gridColumn: `${i + 1} / span 1` }}>{d.slice(0, 3)}</div>)}
                </div>
              </div>
              {data.heatmap.hour_day.map((row, hour) => (
                <div key={hour} className="grid grid-cols-[auto_1fr] gap-1 items-center">
                  <div className={`w-12 text-right text-[10px] pr-2 ${t.textFaint}`}>{String(hour).padStart(2, '0')}:00</div>
                  <div className="grid grid-cols-24 gap-0.5">
                    {row.map((value, day) => (
                      <div key={day} className="relative group cursor-pointer" title={`${String(hour).padStart(2, '0')}:00 - ${DAY_NAMES[day]}: ${value} breakdown${value !== 1 ? 's' : ''}`}>
                        <div className="w-full aspect-square rounded-sm transition-all duration-200 hover:scale-110" style={{ backgroundColor: getHeatmapColor(value, maxHeatmapValue) }} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'machines' && (
        <div className={`${t.glass} rounded-2xl p-4`}>
          <h3 className={`flex items-center gap-2 text-sm font-semibold mb-3 ${t.textPrimary}`}><Wrench className="h-4 w-4 text-rose-500" /> Top Problem Machines</h3>
          {data.top_problem_machines.length > 0 ? (
            <div className="space-y-4">
              {data.top_problem_machines.slice(0, 10).map((machine, idx) => {
                const maxCount = Math.max(...data.top_problem_machines.map(m => m.count));
                const pct = (machine.count / maxCount) * 100;
                return (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm font-medium truncate flex items-center gap-2 ${t.textPrimary}`}><span className={`w-5 h-5 rounded-full ${t.chipBg} flex items-center justify-center text-[10px] font-mono ${t.textFaint}`}>{idx + 1}</span>{machine.name}</div>
                        <div className={`text-[10px] ml-7 ${t.textFaint}`}>{machine.department} · {formatTimeMinutes(machine.total_downtime)} downtime</div>
                      </div>
                      <div className="text-right ml-3"><div className={`text-sm font-semibold ${t.textPrimary}`}>{machine.count}</div><div className={`text-[10px] ${t.textFaint}`}>breakdowns</div></div>
                    </div>
                    <div className={`h-2 ${t.chipBg} rounded-full overflow-hidden ml-7`}><div className="h-full bg-gradient-to-r from-rose-500 to-rose-400 rounded-full" style={{ width: `${pct}%` }} /></div>
                  </div>
                );
              })}
            </div>
          ) : <p className={`text-xs text-center py-8 ${t.textFaint}`}>No data</p>}
        </div>
      )}

      {activeTab === 'artisans' && (
        <div className={`${t.glass} rounded-2xl p-4`}>
          <h3 className={`flex items-center gap-2 text-sm font-semibold mb-3 ${t.textPrimary}`}><Users className="h-4 w-4 text-amber-500" /> Top Artisans</h3>
          {data.artisan_performance.length > 0 ? (
            <div className="space-y-3">
              {data.artisan_performance.slice(0, 10).map((a, idx) => {
                const maxCount = Math.max(...data.artisan_performance.map(x => x.count));
                const pct = (a.count / maxCount) * 100;
                return (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2"><span className={`w-5 h-5 rounded-full ${t.chipBg} flex items-center justify-center text-[10px] font-mono ${t.textFaint}`}>{idx + 1}</span><span className={`text-sm truncate ${t.textPrimary}`}>{a.name}</span></div>
                      <div className="text-right"><div className={`text-sm font-semibold ${t.textPrimary}`}>{a.count}</div><div className={`text-[10px] ${t.textFaint}`}>avg {formatTimeMinutes(a.avg_repair_time)}</div></div>
                    </div>
                    <div className={`h-1.5 ${t.chipBg} rounded-full overflow-hidden ml-7`}><div className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full" style={{ width: `${pct}%` }} /></div>
                  </div>
                );
              })}
            </div>
          ) : <p className={`text-xs text-center py-8 ${t.textFaint}`}>No data</p>}
        </div>
      )}

      {activeTab === 'spares' && (
        <div className={`${t.glass} rounded-2xl p-4`}>
          <h3 className={`flex items-center gap-2 text-sm font-semibold mb-3 ${t.textPrimary}`}><Package className="h-4 w-4 text-violet-500" /> Most Used Spare Parts</h3>
          {data.top_spare_parts.length > 0 ? (
            <div className="space-y-3">
              {data.top_spare_parts.slice(0, 10).map((spare, idx) => {
                const maxCount = Math.max(...data.top_spare_parts.map(s => s.count));
                const pct = (spare.count / maxCount) * 100;
                return (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`w-5 h-5 rounded-full ${t.chipBg} flex items-center justify-center text-[10px] font-mono ${t.textFaint}`}>{idx + 1}</span>
                          <div><div className={`text-sm truncate ${t.textPrimary}`}>{spare.name}</div>{spare.part_number && <div className={`text-[10px] ${t.textFaint}`}>{spare.part_number}</div>}</div>
                        </div>
                      </div>
                      <div className="text-right ml-2"><div className={`text-sm font-semibold ${t.textPrimary}`}>{spare.total_quantity}×</div><div className="text-amber-500/80 text-[10px]">{formatCurrency(spare.total_cost)}</div></div>
                    </div>
                    <div className={`h-1.5 ${t.chipBg} rounded-full overflow-hidden ml-7`}><div className="h-full bg-gradient-to-r from-violet-500 to-violet-400 rounded-full" style={{ width: `${pct}%` }} /></div>
                  </div>
                );
              })}
            </div>
          ) : <p className={`text-xs text-center py-8 ${t.textFaint}`}>No data</p>}
        </div>
      )}
    </div>
  );
}

export default function BreakdownsPage() {
  return (
    <AppShell>
      <BreakdownsPageContent />
    </AppShell>
  );
}
