// app/breakdowns/page.tsx
"use client";

import React, { useState, useEffect, useMemo, useCallback, Fragment } from 'react';
import { PageShell } from "@/components/PageShell";
import {
  AlertCircle, CheckCircle, Clock, Edit, Filter, Loader2, Plus,
  RefreshCw, Search, Trash2, TrendingUp, Wrench, X, Calendar,
  Eye, AlertTriangle, Activity, Zap, ChevronDown, ChevronUp, User,
  Clock4, TrendingDown, PlayCircle, CheckCheck, TimerOff, Shield,
  Wind, FilterX, LayoutGrid, Table as TableIcon, ChevronRight,
  MapPin,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from "date-fns";
import {
  HeroPanel, GlassPanel, GlassModal, GlassInput, GlassSelect, GlassTextarea,
  usePageCollapse, MasterCollapseButton, DownloadButton, DeleteDialog,
  EmployeeNameInput, PredictiveInput, type DLColumn,
} from '@/components/shared';

// ─── API ──────────────────────────────────────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://myofficebackend.onrender.com';
const BREAKDOWN_API = `${API_BASE}/api/breakdowns`;

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface SparePart {
  name: string;
  quantity: number;
  part_number?: string;
  unit_price: number;
  total_cost: number;
}

interface SpareUsed {
  part_number?: string;
  description?: string;
  qty?: number;
  unit?: string;
  cost?: number;
  name?: string;
  quantity?: number;
  unit_price?: number;
  total_cost?: number;
}

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
  response_time_minutes?: number;
  repair_time_minutes?: number;
  downtime_minutes?: number;
  net_downtime_minutes?: number;
  total_spare_cost?: number;
  created_at?: string;
  updated_at?: string;
  breakdown_description?: string;
  spares_used?: SparePart[] | string;
}

interface BreakdownFormData {
  machine_id: string;
  machine_name: string;
  breakdown_description: string;
  machine_description?: string;
  artisan_name: string;
  breakdown_date: string;
  location: string;
  department: string;
  breakdown_type: string;
  work_done: string;
  artisan_recommendations: string;
  status: string;
  priority: string;
  breakdown_start: string;
  breakdown_end: string;
  work_start: string;
  work_end: string;
  spares_used: SparePart[];
}

interface Filters {
  status: string;
  breakdown_type: string;
  priority: string;
  department: string;
  location: string;
  artisan_name: string;
  machine_name: string;
}

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const STATUS_META: Record<string, { name: string; icon: React.ElementType; glass: string }> = {
  logged:      { name: 'Logged',      icon: Clock,       glass: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  in_progress: { name: 'In Progress', icon: PlayCircle,  glass: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  resolved:    { name: 'Resolved',    icon: CheckCheck,  glass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  closed:      { name: 'Closed',      icon: CheckCircle, glass: 'bg-slate-500/20 text-slate-300 border-slate-500/30' },
  cancelled:   { name: 'Cancelled',   icon: X,           glass: 'bg-rose-500/20 text-rose-300 border-rose-500/30' },
};

const PRIORITY_META: Record<string, { name: string; icon: React.ElementType; glass: string }> = {
  critical: { name: 'Critical', icon: AlertCircle,  glass: 'bg-rose-500/20 text-rose-300 border-rose-500/30' },
  high:     { name: 'High',     icon: AlertTriangle, glass: 'bg-orange-500/20 text-orange-300 border-orange-500/30' },
  medium:   { name: 'Medium',   icon: Clock,         glass: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  low:      { name: 'Low',      icon: Clock4,         glass: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
};

const TYPE_META: Record<string, { name: string; icon: React.ElementType; glass: string }> = {
  mechanical: { name: 'Mechanical', icon: Wrench,    glass: 'bg-slate-500/20 text-slate-300 border-slate-500/30' },
  electrical: { name: 'Electrical', icon: Zap,       glass: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' },
  hydraulic:  { name: 'Hydraulic',  icon: Activity,  glass: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  pneumatic:  { name: 'Pneumatic',  icon: Wind,      glass: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' },
  electronic: { name: 'Electronic', icon: Shield,    glass: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
  other:      { name: 'Other',      icon: Wrench,    glass: 'bg-gray-500/20 text-gray-300 border-gray-500/30' },
};

const DEPARTMENTS = ['Maintenance', 'Production', 'Engineering', 'Quality', 'Safety', 'Operations'];

// ─── HELPERS ──────────────────────────────────────────────────────────────────

const timeToMinutes = (t: string): number => {
  if (!t) return 0;
  try { const [h, m] = t.split(':').map(Number); return h * 60 + m; } catch { return 0; }
};

const minutesToDisplay = (minutes: number): string => {
  if (!minutes && minutes !== 0) return '0m';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m > 0 ? `${m}m` : ''}`.trim() : `${m}m`;
};

const formatDate = (s: string | null | undefined): string => {
  if (!s) return 'N/A';
  try { return format(new Date(s), 'MMM dd, yyyy'); } catch { return 'Invalid Date'; }
};

const formatTime = (s: string | null | undefined): string => {
  if (!s) return '—';
  if (s.includes(':')) { const p = s.split(':'); return `${p[0].padStart(2,'0')}:${p[1].padStart(2,'0')}`; }
  return s;
};

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

const fetchBreakdowns = async (filters: Record<string, string> = {}): Promise<Breakdown[]> => {
  try {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => { if (v && v !== 'all' && v !== '') params.append(k, v); });
    const r = await fetch(`${BREAKDOWN_API}/get-breakdowns?${params}`, { cache: 'no-cache' });
    if (!r.ok) return [];
    const data = await r.json();
    if (Array.isArray(data)) return data;
    return data.data ?? data.breakdowns ?? data.results ?? [];
  } catch { return []; }
};

const createBreakdown = async (fd: BreakdownFormData): Promise<unknown> => {
  const body = {
    machine_id: fd.machine_id || '', machine_name: fd.machine_name || '',
    breakdown_description: fd.breakdown_description || '',
    machine_description: fd.breakdown_description || '',
    artisan_name: fd.artisan_name || '',
    breakdown_date: fd.breakdown_date || new Date().toISOString().split('T')[0],
    location: fd.location || '', department: fd.department || '',
    breakdown_type: fd.breakdown_type || 'mechanical',
    work_done: fd.work_done || '', artisan_recommendations: fd.artisan_recommendations || '',
    status: fd.status || 'logged', priority: fd.priority || 'medium',
    breakdown_start: fd.breakdown_start || '', breakdown_end: fd.breakdown_end || '',
    work_start: fd.work_start || '', work_end: fd.work_end || '',
    spares_used: (Array.isArray(fd.spares_used) ? fd.spares_used : []).map((s: SpareUsed) => ({
      name: s.name || '', quantity: s.quantity || 1, part_number: s.part_number || '',
      unit_price: s.unit_price || 0, total_cost: (s.quantity || 1) * (s.unit_price || 0),
    })),
  };
  const r = await fetch(`${BREAKDOWN_API}/`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(await r.text() || `HTTP ${r.status}`);
  return r.json();
};

const updateBreakdown = async (id: number, fd: BreakdownFormData): Promise<unknown> => {
  if (!id) throw new Error('Invalid ID');
  const body = {
    machine_id: fd.machine_id || '', machine_name: fd.machine_name || '',
    breakdown_description: fd.breakdown_description || '',
    machine_description: fd.breakdown_description || '',
    artisan_name: fd.artisan_name || '',
    breakdown_date: fd.breakdown_date || '',
    location: fd.location || '', department: fd.department || '',
    breakdown_type: fd.breakdown_type || 'mechanical',
    work_done: fd.work_done || '', artisan_recommendations: fd.artisan_recommendations || '',
    status: fd.status || 'logged', priority: fd.priority || 'medium',
    breakdown_start: fd.breakdown_start || '', breakdown_end: fd.breakdown_end || '',
    work_start: fd.work_start || '', work_end: fd.work_end || '',
    spares_used: (Array.isArray(fd.spares_used) ? fd.spares_used : []).map((s: SpareUsed) => ({
      name: s.name || '', quantity: s.quantity || 1, part_number: s.part_number || '',
      unit_price: s.unit_price || 0, total_cost: (s.quantity || 1) * (s.unit_price || 0),
    })),
  };
  const r = await fetch(`${BREAKDOWN_API}/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(await r.text() || `HTTP ${r.status}`);
  return r.json();
};

const deleteBreakdown = async (id: number): Promise<unknown> => {
  if (!id) throw new Error('Invalid ID');
  const r = await fetch(`${BREAKDOWN_API}/${id}`, { method: 'DELETE' });
  if (r.status === 204) return { success: true };
  if (r.ok) { const t = await r.text(); return t ? JSON.parse(t) : { success: true }; }
  throw new Error(await r.text() || `HTTP ${r.status}`);
};

// ─── BADGE COMPONENTS ─────────────────────────────────────────────────────────

const StatusBadge = ({ status }: { status: string }) => {
  const m = STATUS_META[status] ?? STATUS_META.logged;
  const Icon = m.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${m.glass}`}>
      <Icon className="h-2.5 w-2.5" />{m.name}
    </span>
  );
};

const PriorityBadge = ({ priority }: { priority: string }) => {
  const m = PRIORITY_META[priority] ?? PRIORITY_META.medium;
  const Icon = m.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${m.glass}`}>
      <Icon className="h-2.5 w-2.5" />{m.name}
    </span>
  );
};

const TypeBadge = ({ type }: { type: string }) => {
  const m = TYPE_META[type] ?? TYPE_META.other;
  const Icon = m.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${m.glass}`}>
      <Icon className="h-2.5 w-2.5" />{m.name}
    </span>
  );
};

// ─── BREAKDOWN CARD ──────────────────────────────────────────────────────────

const BreakdownCard = ({
  breakdown, onView, onEdit, onDelete, isExpanded, onToggleExpand,
}: {
  breakdown: Breakdown;
  onView: (b: Breakdown) => void;
  onEdit: (b: Breakdown) => void;
  onDelete: (b: Breakdown) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}) => {
  const downtime = minutesToDisplay(calcDowntime(breakdown.breakdown_start, breakdown.breakdown_end));
  const cost = sparesTotalCost(breakdown.spares_used);
  const tm = TYPE_META[breakdown.breakdown_type] ?? TYPE_META.other;
  const TypeIcon = tm.icon;

  return (
    <div className="oz-glass-dark rounded-2xl overflow-hidden group hover:border-white/[0.15] transition-all">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`p-1.5 rounded-lg border ${tm.glass} shrink-0`}>
              <TypeIcon className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0">
              <h4 className="text-sm font-semibold text-white truncate">{breakdown.machine_name}</h4>
              <p className="text-xs text-white/40">ID: {breakdown.machine_id}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onToggleExpand}
            className="h-7 w-7 flex items-center justify-center rounded-md bg-white/[0.07] border border-white/[0.12] text-white/40 hover:text-white hover:bg-white/[0.12] transition-all shrink-0"
          >
            {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        </div>

        {/* Description */}
        <p className="text-xs text-white/55 line-clamp-2 mb-3 leading-relaxed">
          {breakdown.breakdown_description || 'No description available'}
        </p>

        {/* Badges */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          <PriorityBadge priority={breakdown.priority} />
          <TypeBadge type={breakdown.breakdown_type} />
          <StatusBadge status={breakdown.status} />
        </div>

        {/* Meta */}
        <div className="flex flex-wrap gap-3 text-xs text-white/40 mb-3">
          {breakdown.location && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />{breakdown.location}
            </span>
          )}
          {breakdown.artisan_name && (
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />{breakdown.artisan_name}
            </span>
          )}
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-2 text-center">
            <div className="text-sm font-semibold text-[#86BBD8]">{downtime}</div>
            <div className="text-[10px] text-white/40">Downtime</div>
          </div>
          <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-2 text-center">
            <div className="text-sm font-semibold text-emerald-400">${cost.toFixed(0)}</div>
            <div className="text-[10px] text-white/40">Cost</div>
          </div>
        </div>

        {/* Expanded details */}
        {isExpanded && (
          <div className="pt-3 border-t border-white/[0.07] space-y-1.5 mb-3">
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
              <div><span className="text-white/35">B/down Start:</span> <span className="text-white/70 ml-1">{formatTime(breakdown.breakdown_start)}</span></div>
              <div><span className="text-white/35">B/down End:</span> <span className="text-white/70 ml-1">{formatTime(breakdown.breakdown_end)}</span></div>
              <div><span className="text-white/35">Work Start:</span> <span className="text-white/70 ml-1">{formatTime(breakdown.work_start)}</span></div>
              <div><span className="text-white/35">Work End:</span> <span className="text-white/70 ml-1">{formatTime(breakdown.work_end)}</span></div>
              <div className="col-span-2"><span className="text-white/35">Department:</span> <span className="text-white/70 ml-1">{breakdown.department}</span></div>
              {breakdown.work_done && (
                <div className="col-span-2"><span className="text-white/35">Work Done:</span> <span className="text-white/70 ml-1 line-clamp-2">{breakdown.work_done}</span></div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-white/[0.07]">
          <div className="flex items-center gap-1 text-xs text-white/35">
            <Calendar className="h-3 w-3" />
            {formatDate(breakdown.breakdown_date)}
          </div>
          <div className="flex items-center gap-1">
            {[
              { icon: Eye, label: 'View', fn: () => onView(breakdown), cls: 'hover:text-[#86BBD8]' },
              { icon: Edit, label: 'Edit', fn: () => onEdit(breakdown), cls: 'hover:text-amber-400' },
              { icon: Trash2, label: 'Delete', fn: () => onDelete(breakdown), cls: 'hover:text-rose-400' },
            ].map(({ icon: Ic, label, fn, cls }) => (
              <button key={label} type="button" title={label} onClick={fn}
                className={`h-7 w-7 flex items-center justify-center rounded-md bg-white/[0.04] border border-white/[0.08] text-white/40 ${cls} transition-all`}>
                <Ic className="h-3.5 w-3.5" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── SORT BUTTON ──────────────────────────────────────────────────────────────

const SortBtn = ({ field, label, sortField, sortDirection, onSort }: {
  field: string; label: string; sortField: string; sortDirection: string; onSort: (f: string) => void;
}) => {
  const active = sortField === field;
  return (
    <button type="button" onClick={() => onSort(field)}
      className="flex items-center gap-1 text-xs font-semibold text-white/50 uppercase tracking-wider hover:text-white/80 transition-colors">
      {label}
      <div className="flex flex-col">
        <ChevronUp className={`h-2.5 w-2.5 -mb-0.5 ${active && sortDirection === 'asc' ? 'text-[#86BBD8]' : 'text-white/20'}`} />
        <ChevronDown className={`h-2.5 w-2.5 ${active && sortDirection === 'desc' ? 'text-[#86BBD8]' : 'text-white/20'}`} />
      </div>
    </button>
  );
};

// ─── BREAKDOWN TABLE ──────────────────────────────────────────────────────────

const BreakdownTable = ({
  breakdowns, onView, onEdit, onDelete, sortField, sortDirection, onSort, expandedItems, onToggleExpand,
}: {
  breakdowns: Breakdown[];
  onView: (b: Breakdown) => void;
  onEdit: (b: Breakdown) => void;
  onDelete: (b: Breakdown) => void;
  sortField: string;
  sortDirection: string;
  onSort: (f: string) => void;
  expandedItems: Set<string>;
  onToggleExpand: (id: string) => void;
}) => {

  if (!breakdowns.length) {
    return (
      <div className="text-center py-16">
        <div className="mx-auto w-14 h-14 rounded-full bg-white/[0.05] border border-white/[0.10] flex items-center justify-center mb-4">
          <AlertCircle className="h-6 w-6 text-[#86BBD8]/60" />
        </div>
        <p className="text-sm font-medium text-white/60">No breakdowns match your filters</p>
        <p className="text-xs text-white/30 mt-1">Try clearing filters or log a new breakdown</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/[0.08]">
            <th className="w-10 py-3 px-3" aria-label="Expand row"></th>
            <th className="py-3 px-3 text-left"><SortBtn field="machine_name" label="Machine" sortField={sortField} sortDirection={sortDirection} onSort={onSort} /></th>
            <th className="py-3 px-3 text-left"><SortBtn field="breakdown_date" label="Date" sortField={sortField} sortDirection={sortDirection} onSort={onSort} /></th>
            <th className="py-3 px-3 text-left text-xs font-semibold text-white/50 uppercase tracking-wider">Status</th>
            <th className="py-3 px-3 text-left text-xs font-semibold text-white/50 uppercase tracking-wider">Priority</th>
            <th className="py-3 px-3 text-left text-xs font-semibold text-white/50 uppercase tracking-wider">Type</th>
            <th className="py-3 px-3 text-left text-xs font-semibold text-white/50 uppercase tracking-wider">Artisan</th>
            <th className="py-3 px-3 text-left text-xs font-semibold text-white/50 uppercase tracking-wider">Downtime</th>
            <th className="py-3 px-3 text-left text-xs font-semibold text-white/50 uppercase tracking-wider">Cost</th>
            <th className="py-3 px-3 text-right text-xs font-semibold text-white/50 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody>
          {breakdowns.map((bd) => {
            const downtime = minutesToDisplay(calcDowntime(bd.breakdown_start, bd.breakdown_end));
            const cost = sparesTotalCost(bd.spares_used);
            const rowId = String(bd.id);
            const isExp = expandedItems.has(rowId);

            return (
              <Fragment key={rowId}>
                <tr className="border-b border-white/[0.05] hover:bg-white/[0.03] transition-colors">
                  <td className="py-2.5 px-3">
                    <button type="button" onClick={() => onToggleExpand(rowId)}
                      className="h-6 w-6 flex items-center justify-center rounded text-white/35 hover:text-white/70 transition-colors">
                      {isExp ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                    </button>
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="font-medium text-white/85 truncate max-w-[140px]">{bd.machine_name}</div>
                    <div className="text-xs text-white/35 truncate">{bd.machine_id}</div>
                  </td>
                  <td className="py-2.5 px-3 text-white/60 whitespace-nowrap">{formatDate(bd.breakdown_date)}</td>
                  <td className="py-2.5 px-3"><StatusBadge status={bd.status} /></td>
                  <td className="py-2.5 px-3"><PriorityBadge priority={bd.priority} /></td>
                  <td className="py-2.5 px-3"><TypeBadge type={bd.breakdown_type} /></td>
                  <td className="py-2.5 px-3 text-white/60 whitespace-nowrap">{bd.artisan_name || '—'}</td>
                  <td className="py-2.5 px-3">
                    <span className="flex items-center gap-1 text-[#86BBD8] font-medium">
                      <Clock className="h-3 w-3" />{downtime}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-emerald-400 font-medium">${cost.toFixed(0)}</td>
                  <td className="py-2.5 px-3">
                    <div className="flex items-center justify-end gap-1">
                      {[
                        { icon: Eye, fn: () => onView(bd), cls: 'hover:text-[#86BBD8]', label: 'View' },
                        { icon: Edit, fn: () => onEdit(bd), cls: 'hover:text-amber-400', label: 'Edit' },
                        { icon: Trash2, fn: () => onDelete(bd), cls: 'hover:text-rose-400', label: 'Delete' },
                      ].map(({ icon: Ic, fn, cls, label }) => (
                        <button key={label} type="button" title={label} onClick={fn}
                          className={`h-6 w-6 flex items-center justify-center rounded text-white/35 ${cls} transition-colors`}>
                          <Ic className="h-3.5 w-3.5" />
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
                {isExp && (
                  <tr className="border-b border-white/[0.05] bg-white/[0.02]">
                    <td colSpan={10} className="px-4 py-3">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                        <div className="space-y-1">
                          <p className="font-semibold text-white/60 uppercase tracking-wider text-[10px] mb-1.5">Breakdown Details</p>
                          <p className="text-white/55"><span className="text-white/35">Description:</span> {bd.breakdown_description || '—'}</p>
                          <p className="text-white/55"><span className="text-white/35">Location:</span> {bd.location}</p>
                          <p className="text-white/55"><span className="text-white/35">Department:</span> {bd.department}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="font-semibold text-white/60 uppercase tracking-wider text-[10px] mb-1.5">Timing</p>
                          <p className="text-white/55"><span className="text-white/35">Breakdown:</span> {formatTime(bd.breakdown_start)} – {formatTime(bd.breakdown_end)}</p>
                          <p className="text-white/55"><span className="text-white/35">Work:</span> {formatTime(bd.work_start)} – {formatTime(bd.work_end)}</p>
                          <p className="text-white/55"><span className="text-white/35">Total Downtime:</span> {downtime}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="font-semibold text-white/60 uppercase tracking-wider text-[10px] mb-1.5">Work & Recommendations</p>
                          <p className="text-white/55 break-words"><span className="text-white/35">Work Done:</span> {bd.work_done || '—'}</p>
                          <p className="text-white/55 break-words"><span className="text-white/35">Recommendations:</span> {bd.artisan_recommendations || '—'}</p>
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
};

// ─── DETAILS MODAL ────────────────────────────────────────────────────────────

const DetailsModal = ({
  breakdown, isOpen, onClose, onEdit, onDelete,
}: {
  breakdown: Breakdown | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (b: Breakdown) => void;
  onDelete: (b: Breakdown) => void;
}) => {
  if (!breakdown) return null;
  const downtime = minutesToDisplay(calcDowntime(breakdown.breakdown_start, breakdown.breakdown_end));
  const cost = sparesTotalCost(breakdown.spares_used);

  const labelCls = 'text-[10px] font-semibold text-white/40 uppercase tracking-wider block mb-0.5';
  const valCls = 'text-sm text-white/80';

  return (
    <GlassModal isOpen={isOpen} onClose={onClose} title={breakdown.machine_name} icon={Wrench} size="lg"
      footer={
        <>
          <button type="button" onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-white/60 bg-white/[0.07] border border-white/[0.12] hover:bg-white/[0.12] transition-all">
            Close
          </button>
          <button type="button" onClick={() => { onEdit(breakdown); onClose(); }}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-amber-500/20 border border-amber-500/30 hover:bg-amber-500/30 transition-all">
            Edit
          </button>
          <button type="button" onClick={() => { onDelete(breakdown); onClose(); }}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-rose-500/20 border border-rose-500/30 hover:bg-rose-500/30 transition-all">
            Delete
          </button>
        </>
      }>
      <div className="space-y-4">
        {/* Badges */}
        <div className="flex flex-wrap gap-2">
          <StatusBadge status={breakdown.status} />
          <PriorityBadge priority={breakdown.priority} />
          <TypeBadge type={breakdown.breakdown_type} />
        </div>

        {/* Grid info */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Machine ID', val: breakdown.machine_id || '—' },
            { label: 'Artisan', val: breakdown.artisan_name || 'Unassigned' },
            { label: 'Location', val: breakdown.location || '—' },
            { label: 'Department', val: breakdown.department || '—' },
            { label: 'Breakdown Date', val: formatDate(breakdown.breakdown_date) },
            { label: 'Total Downtime', val: downtime },
          ].map(({ label, val }) => (
            <div key={label} className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-3">
              <span className={labelCls}>{label}</span>
              <span className={valCls}>{val}</span>
            </div>
          ))}
        </div>

        {/* Description */}
        <div>
          <span className={labelCls}>Description</span>
          <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-3 text-sm text-white/70 whitespace-pre-wrap break-words">
            {breakdown.breakdown_description || 'No description'}
          </div>
        </div>

        {/* Times */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Breakdown Start', val: formatTime(breakdown.breakdown_start) },
            { label: 'Breakdown End', val: formatTime(breakdown.breakdown_end) },
            { label: 'Work Start', val: formatTime(breakdown.work_start) },
            { label: 'Work End', val: formatTime(breakdown.work_end) },
          ].map(({ label, val }) => (
            <div key={label} className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-3">
              <span className={labelCls}>{label}</span>
              <span className={valCls}>{val}</span>
            </div>
          ))}
        </div>

        {breakdown.work_done && (
          <div>
            <span className={labelCls}>Work Performed</span>
            <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-3 text-sm text-white/70 whitespace-pre-wrap break-words">
              {breakdown.work_done}
            </div>
          </div>
        )}

        {breakdown.artisan_recommendations && (
          <div>
            <span className={labelCls}>Recommendations</span>
            <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-3 text-sm text-white/70 whitespace-pre-wrap break-words">
              {breakdown.artisan_recommendations}
            </div>
          </div>
        )}

        {/* Spares */}
        {Array.isArray(breakdown.spares_used) && breakdown.spares_used.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className={labelCls}>Spare Parts Used</span>
              <span className="text-xs font-semibold text-emerald-400">Total: ${cost.toFixed(2)}</span>
            </div>
            <div className="space-y-1.5">
              {(breakdown.spares_used as SpareUsed[]).map((spare, i) => (
                <div key={i} className="flex justify-between items-center bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm">
                  <span className="text-white/70">{spare.name} ×{spare.quantity}</span>
                  <span className="text-emerald-400 font-medium">${spare.total_cost?.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </GlassModal>
  );
};

// ─── FORM MODAL ───────────────────────────────────────────────────────────────

const FORM_TABS = [
  { key: 'basic', label: 'Basic' },
  { key: 'details', label: 'Details' },
  { key: 'spares', label: 'Spares' },
  { key: 'timing', label: 'Timing' },
] as const;

type FormTab = (typeof FORM_TABS)[number]['key'];

const EMPTY_FORM: BreakdownFormData = {
  machine_id: '', machine_name: '', breakdown_description: '', artisan_name: '',
  breakdown_date: new Date().toISOString().split('T')[0],
  location: '', department: '', breakdown_type: 'mechanical', work_done: '',
  artisan_recommendations: '', status: 'logged', priority: 'medium',
  breakdown_start: '', breakdown_end: '', work_start: '', work_end: '', spares_used: [],
};

const FormModal = ({
  isOpen, onClose, onSubmit, initialData, mode = 'create',
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (fd: BreakdownFormData) => Promise<void>;
  initialData: Breakdown | null;
  mode?: 'create' | 'edit';
}) => {
  const [fd, setFd] = useState<BreakdownFormData>(EMPTY_FORM);
  const [spareForm, setSpareForm] = useState({ name: '', part_number: '', quantity: 1, unit_price: 0 });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [tab, setTab] = useState<FormTab>('basic');

  useEffect(() => {
    if (initialData) {
      setFd({
        machine_id: initialData.machine_id || '',
        machine_name: initialData.machine_name || '',
        breakdown_description: initialData.breakdown_description || '',
        artisan_name: initialData.artisan_name || '',
        breakdown_date: initialData.breakdown_date
          ? new Date(initialData.breakdown_date).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0],
        location: initialData.location || '',
        department: initialData.department || '',
        breakdown_type: initialData.breakdown_type || 'mechanical',
        work_done: initialData.work_done || '',
        artisan_recommendations: initialData.artisan_recommendations || '',
        status: initialData.status || 'logged',
        priority: initialData.priority || 'medium',
        breakdown_start: initialData.breakdown_start ?? '',
        breakdown_end: initialData.breakdown_end ?? '',
        work_start: initialData.work_start ?? '',
        work_end: initialData.work_end ?? '',
        spares_used: Array.isArray(initialData.spares_used) ? initialData.spares_used : [],
      });
    } else {
      setFd(EMPTY_FORM);
    }
    setTab('basic');
    setErrors({});
  }, [initialData, isOpen]);

  const set = (field: keyof BreakdownFormData, val: unknown) =>
    setFd(p => ({ ...p, [field]: val }));

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
    try {
      await onSubmit(fd);
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save breakdown');
    } finally {
      setLoading(false);
    }
  };

  const addSpare = () => {
    if (!spareForm.name.trim()) { setErrors(p => ({ ...p, spare: 'Spare part name is required' })); return; }
    const newSpare: SparePart = { ...spareForm, total_cost: spareForm.quantity * spareForm.unit_price };
    setFd(p => ({ ...p, spares_used: [...p.spares_used, newSpare] }));
    setSpareForm({ name: '', part_number: '', quantity: 1, unit_price: 0 });
    setErrors(p => ({ ...p, spare: '' }));
  };

  const removeSpare = (idx: number) =>
    setFd(p => ({ ...p, spares_used: p.spares_used.filter((_, i) => i !== idx) }));

  const fieldCls = (k: string) => errors[k] ? 'border-rose-500/50' : '';
  const err = (k: string) => errors[k] ? <p className="mt-1 text-[11px] text-rose-400">{errors[k]}</p> : null;

  const calcPreview = fd.breakdown_start && fd.breakdown_end
    ? minutesToDisplay(timeToMinutes(fd.breakdown_end) - timeToMinutes(fd.breakdown_start))
    : null;

  const statusOpts = Object.entries(STATUS_META).map(([k, v]) => ({ value: k, label: v.name }));
  const priorityOpts = Object.entries(PRIORITY_META).map(([k, v]) => ({ value: k, label: v.name }));
  const typeOpts = Object.entries(TYPE_META).map(([k, v]) => ({ value: k, label: v.name }));
  const deptOpts = [{ value: '', label: 'Select department' }, ...DEPARTMENTS.map(d => ({ value: d, label: d }))];

  return (
    <GlassModal isOpen={isOpen} onClose={onClose} size="xl"
      title={mode === 'create' ? 'Log New Breakdown' : 'Edit Breakdown'}
      icon={Wrench}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-white/[0.05] border border-white/[0.08] rounded-xl">
          {FORM_TABS.map(t => (
            <button key={t.key} type="button" onClick={() => setTab(t.key)}
              className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
                tab === t.key
                  ? 'bg-[#2A4D69] text-white border border-[#86BBD8]/20'
                  : 'text-white/50 hover:text-white/80'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Basic Tab */}
        {tab === 'basic' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <GlassInput label="Machine Name *" value={fd.machine_name}
                onChange={e => set('machine_name', e.target.value)}
                placeholder="e.g., CNC Machine" className={fieldCls('machine_name')} />
              {err('machine_name')}
            </div>
            <GlassInput label="Machine ID" value={fd.machine_id}
              onChange={e => set('machine_id', e.target.value)} placeholder="Optional" />
            <div>
              <EmployeeNameInput
                label="Artisan Name *"
                value={fd.artisan_name}
                onChange={(name, emp) => {
                  set('artisan_name', name);
                  if (emp?.department) set('department', emp.department);
                }}
                placeholder="Select or type artisan name…"
                error={errors.artisan_name}
              />
            </div>
            <GlassInput label="Breakdown Date *" type="date" value={fd.breakdown_date}
              onChange={e => set('breakdown_date', e.target.value)} />
            <div className="sm:col-span-2">
              <PredictiveInput
                label="Description *"
                historyKey="bd_description"
                value={fd.breakdown_description}
                onChange={v => set('breakdown_description', v)}
                multiline rows={3}
                placeholder="Describe what happened…"
                hints={['Machine stopped unexpectedly', 'Electrical fault detected', 'Mechanical failure on', 'Overheating reported on', 'Hydraulic leak detected', 'Belt snapped on']}
                error={errors.breakdown_description}
              />
            </div>
          </div>
        )}

        {/* Details Tab */}
        {tab === 'details' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <GlassSelect label="Status" value={fd.status}
              onChange={e => set('status', e.target.value)} options={statusOpts} />
            <GlassSelect label="Priority" value={fd.priority}
              onChange={e => set('priority', e.target.value)} options={priorityOpts} />
            <GlassSelect label="Breakdown Type" value={fd.breakdown_type}
              onChange={e => set('breakdown_type', e.target.value)} options={typeOpts} />
            <div>
              <PredictiveInput
                label="Location *"
                historyKey="bd_location"
                value={fd.location}
                onChange={v => set('location', v)}
                onCommit={v => set('location', v)}
                placeholder="e.g., Production Line A"
                hints={['Main Workshop', 'Crusher Bay', 'Processing Plant', 'Pit Area', 'Conveyor Belt', 'Electrical Substation', 'Compressor Room', 'Administration Block']}
                error={errors.location}
              />
            </div>
            <div>
              <GlassSelect label="Department *" value={fd.department}
                onChange={e => set('department', e.target.value)}
                options={deptOpts} className={fieldCls('department')} />
              {err('department')}
            </div>
            <div className="sm:col-span-2">
              <PredictiveInput
                label="Work Done"
                historyKey="bd_work_done"
                value={fd.work_done}
                onChange={v => set('work_done', v)}
                multiline rows={2}
                placeholder="Describe the work performed…"
                hints={['Replaced bearing', 'Repaired electrical fault', 'Replaced belt', 'Cleaned and serviced', 'Replaced hydraulic seal', 'Calibrated sensor']}
              />
            </div>
            <div className="sm:col-span-2">
              <PredictiveInput
                label="Recommendations"
                historyKey="bd_recommendations"
                value={fd.artisan_recommendations}
                onChange={v => set('artisan_recommendations', v)}
                multiline rows={2}
                placeholder="Enter recommendations…"
                hints={['Schedule preventive maintenance', 'Replace worn components', 'Monitor closely for next 48 hours', 'Train operators on correct usage', 'Order spare parts']}
              />
            </div>
          </div>
        )}

        {/* Spares Tab */}
        {tab === 'spares' && (
          <div className="space-y-3">
            <div className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
                <GlassInput placeholder="Part Name" value={spareForm.name}
                  onChange={e => setSpareForm(p => ({ ...p, name: e.target.value }))} />
                <GlassInput placeholder="Part Number" value={spareForm.part_number}
                  onChange={e => setSpareForm(p => ({ ...p, part_number: e.target.value }))} />
                <GlassInput type="number" placeholder="Quantity" value={String(spareForm.quantity)}
                  onChange={e => setSpareForm(p => ({ ...p, quantity: parseInt(e.target.value) || 1 }))} />
                <GlassInput type="number" placeholder="Unit Price" value={String(spareForm.unit_price)}
                  onChange={e => setSpareForm(p => ({ ...p, unit_price: parseFloat(e.target.value) || 0 }))} />
              </div>
              <button type="button" onClick={addSpare}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#2A4D69]/60 border border-[#86BBD8]/25 hover:bg-[#2A4D69]/80 transition-all">
                <Plus className="h-3.5 w-3.5" />Add Spare
              </button>
              {errors.spare && <p className="mt-1 text-[11px] text-rose-400">{errors.spare}</p>}
            </div>
            {fd.spares_used.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-white/50 uppercase tracking-wider">Parts Added</p>
                {fd.spares_used.map((s, i) => (
                  <div key={i} className="flex justify-between items-center bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm">
                    <div>
                      <span className="text-white/80 font-medium">{s.name}</span>
                      {s.part_number && <span className="text-white/35 ml-2 text-xs">({s.part_number})</span>}
                      <span className="text-white/40 ml-2 text-xs">{s.quantity} × ${s.unit_price}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-400 font-semibold">${(s.quantity * s.unit_price).toFixed(2)}</span>
                      <button type="button" title="Remove spare part" onClick={() => removeSpare(i)}
                        className="h-6 w-6 flex items-center justify-center rounded text-rose-400/60 hover:text-rose-400 transition-colors">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Timing Tab */}
        {tab === 'timing' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <GlassInput label="Breakdown Start" type="time" value={fd.breakdown_start}
                onChange={e => set('breakdown_start', e.target.value)} />
              <div>
                <GlassInput label="Breakdown End" type="time" value={fd.breakdown_end}
                  onChange={e => set('breakdown_end', e.target.value)} />
                {err('breakdown_end')}
              </div>
              <GlassInput label="Work Start" type="time" value={fd.work_start}
                onChange={e => set('work_start', e.target.value)} />
              <GlassInput label="Work End" type="time" value={fd.work_end}
                onChange={e => set('work_end', e.target.value)} />
            </div>
            {calcPreview && (
              <div className="bg-[#2A4D69]/20 border border-[#86BBD8]/20 rounded-xl p-3 text-sm">
                <span className="text-white/50">Calculated Downtime: </span>
                <span className="text-[#86BBD8] font-semibold">{calcPreview}</span>
              </div>
            )}
          </div>
        )}

        {/* Form footer */}
        <div className="flex items-center justify-between pt-2 border-t border-white/[0.07]">
          {/* Tab nav */}
          <div className="flex gap-1">
            {FORM_TABS.map((t, i) => (
              <button key={t.key} type="button" onClick={() => setTab(t.key)}
                className={`w-2 h-2 rounded-full transition-all ${tab === t.key ? 'bg-[#86BBD8]' : 'bg-white/20'}`}
                title={t.label} />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-white/60 bg-white/[0.07] border border-white/[0.12] hover:bg-white/[0.12] transition-all">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-br from-[#2A4D69] to-[#1e3a52] border border-[#86BBD8]/25 hover:opacity-90 transition-all disabled:opacity-50">
              {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {mode === 'create' ? 'Create Breakdown' : 'Update Breakdown'}
            </button>
          </div>
        </div>
      </form>
    </GlassModal>
  );
};

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

const BreakdownsPage = () => {
  const [breakdowns, setBreakdowns] = useState<Breakdown[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  const [sortField, setSortField] = useState('breakdown_date');
  const [sortDirection, setSortDirection] = useState('desc');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const [filters, setFilters] = useState<Filters>({
    status: 'all', breakdown_type: 'all', priority: 'all',
    department: 'all', location: 'all', artisan_name: 'all', machine_name: 'all',
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [showDateRange, setShowDateRange] = useState(false);

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [selectedBd, setSelectedBd] = useState<Breakdown | null>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [deleteTarget, setDeleteTarget] = useState<Breakdown | null>(null);

  const collapse = usePageCollapse({ hero: false, filters: false, records: false });

  // ── Derived data ─────────────────────────────────────────────────────────────

  const filteredBreakdowns = useMemo(() => {
    let result = [...breakdowns];
    if (searchTerm.trim()) {
      const t = searchTerm.toLowerCase();
      result = result.filter(b =>
        b.machine_name?.toLowerCase().includes(t) ||
        b.machine_id?.toLowerCase().includes(t) ||
        b.breakdown_description?.toLowerCase().includes(t) ||
        b.artisan_name?.toLowerCase().includes(t) ||
        b.location?.toLowerCase().includes(t)
      );
    }
    result.sort((a, b) => {
      if (sortField === 'breakdown_date') {
        const cmp = new Date(a.breakdown_date).getTime() - new Date(b.breakdown_date).getTime();
        return sortDirection === 'asc' ? cmp : -cmp;
      }
      const av = a[sortField as keyof Breakdown];
      const bv = b[sortField as keyof Breakdown];
      const cmp = String(av ?? '').localeCompare(String(bv ?? ''));
      return sortDirection === 'asc' ? cmp : -cmp;
    });
    return result;
  }, [breakdowns, searchTerm, sortField, sortDirection]);

  const metrics = useMemo(() => {
    const total = filteredBreakdowns.length;
    const active = filteredBreakdowns.filter(b => b.status === 'logged' || b.status === 'in_progress').length;
    const critical = filteredBreakdowns.filter(b => b.priority === 'critical').length;
    const totalDownMins = filteredBreakdowns.reduce((s, b) => s + calcDowntime(b.breakdown_start, b.breakdown_end), 0);
    const resolved = filteredBreakdowns.filter(b => b.status === 'resolved' || b.status === 'closed');
    const avgRes = resolved.length > 0
      ? (resolved.reduce((s, b) => s + calcDowntime(b.breakdown_start, b.breakdown_end), 0) / 60 / resolved.length).toFixed(1)
      : '0';
    return { total, active, critical, totalDowntime: minutesToDisplay(totalDownMins), avgRes };
  }, [filteredBreakdowns]);

  const activeFilterCount = useMemo(() => {
    let c = 0;
    if (filters.status !== 'all') c++;
    if (filters.breakdown_type !== 'all') c++;
    if (filters.priority !== 'all') c++;
    if (filters.department !== 'all') c++;
    if (filters.location !== 'all' && filters.location !== '') c++;
    if (filters.artisan_name !== 'all') c++;
    if (filters.machine_name !== 'all') c++;
    if (searchTerm) c++;
    if (showDateRange) c++;
    return c;
  }, [filters, searchTerm, showDateRange]);

  // ── Data loading ──────────────────────────────────────────────────────────────

  const loadBreakdowns = useCallback(async () => {
    setLoading(true);
    try {
      const q: Record<string, string> = {};
      if (filters.status !== 'all') q.status = filters.status;
      if (filters.breakdown_type !== 'all') q.breakdown_type = filters.breakdown_type;
      if (filters.priority !== 'all') q.priority = filters.priority;
      if (filters.department !== 'all') q.department = filters.department;
      if (filters.location !== 'all' && filters.location !== '') q.location = filters.location;
      if (filters.artisan_name !== 'all') q.artisan_name = filters.artisan_name;
      if (filters.machine_name !== 'all') q.machine_name = filters.machine_name;
      if (showDateRange && startDate && endDate) { q.start_date = startDate; q.end_date = endDate; }
      setBreakdowns(await fetchBreakdowns(q));
    } catch { toast.error('Failed to load breakdowns'); setBreakdowns([]); }
    finally { setLoading(false); }
  }, [filters, startDate, endDate, showDateRange]);

  useEffect(() => { loadBreakdowns(); }, [loadBreakdowns]);

  // ── Handlers ──────────────────────────────────────────────────────────────────

  const clearFilters = () => {
    setFilters({ status: 'all', breakdown_type: 'all', priority: 'all', department: 'all', location: 'all', artisan_name: 'all', machine_name: 'all' });
    setSearchTerm('');
    setShowDateRange(false);
  };

  const handleSort = (field: string) => {
    if (sortField === field) setSortDirection(p => p === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDirection('desc'); }
  };

  const toggleExpand = (id: string) =>
    setExpandedItems(p => { const s = new Set(p); s.has(id) ? s.delete(id) : s.add(id); return s; });

  const handleView = (bd: Breakdown) => { setSelectedBd(bd); setDetailsOpen(true); };
  const handleEdit = (bd: Breakdown) => {
    if (!bd.id) { toast.error('Invalid breakdown ID'); return; }
    setSelectedBd(bd); setFormMode('edit'); setFormOpen(true);
  };
  const handleDelete = (bd: Breakdown) => {
    if (!bd.id) { toast.error('Invalid breakdown ID'); return; }
    setDeleteTarget(bd);
  };

  const confirmDelete = async () => {
    if (!deleteTarget?.id) return;
    try {
      await deleteBreakdown(deleteTarget.id);
      toast.success('Breakdown deleted');
      await loadBreakdowns();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Delete failed'); }
  };
  const handleCreate = () => { setSelectedBd(null); setFormMode('create'); setFormOpen(true); };
  const handleFormSubmit = async (formData: BreakdownFormData) => {
    if (formMode === 'create') {
      await createBreakdown(formData);
      toast.success('Breakdown created');
    } else {
      if (!selectedBd?.id) throw new Error('Invalid ID');
      await updateBreakdown(selectedBd.id, formData);
      toast.success('Breakdown updated');
    }
    await loadBreakdowns();
  };

  // ── Download columns ──────────────────────────────────────────────────────────

  const dlCols: DLColumn[] = [
    { key: 'machine_name', label: 'Machine' },
    { key: 'machine_id', label: 'Machine ID' },
    { key: 'breakdown_description', label: 'Description' },
    { key: 'status', label: 'Status', format: v => STATUS_META[v as string]?.name ?? String(v ?? '') },
    { key: 'priority', label: 'Priority', format: v => PRIORITY_META[v as string]?.name ?? String(v ?? '') },
    { key: 'breakdown_type', label: 'Type', format: v => TYPE_META[v as string]?.name ?? String(v ?? '') },
    { key: 'location', label: 'Location' },
    { key: 'department', label: 'Department' },
    { key: 'artisan_name', label: 'Artisan' },
    { key: 'breakdown_date', label: 'Date', format: v => formatDate(v as string) },
    { key: 'breakdown_start', label: 'B/down Start', format: v => formatTime(v as string) },
    { key: 'breakdown_end', label: 'B/down End', format: v => formatTime(v as string) },
    { key: 'work_done', label: 'Work Done' },
    { key: 'artisan_recommendations', label: 'Recommendations' },
  ];

  const dlData = filteredBreakdowns.map(bd => ({
    ...bd,
    downtime: minutesToDisplay(calcDowntime(bd.breakdown_start, bd.breakdown_end)),
    cost: sparesTotalCost(bd.spares_used).toFixed(2),
  })) as unknown as Record<string, unknown>[];

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <PageShell>
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-4">

        {/* Hero */}
        <HeroPanel
          icon={Wrench}
          title="Equipment Breakdowns"
          subtitle="Log, track, and resolve equipment failures"
          onRefresh={loadBreakdowns}
          loading={loading}
          onNew={handleCreate}
          newLabel="New Breakdown"
          {...collapse.panel('hero')}
          stats={[
            { label: 'Total', value: metrics.total, textClass: 'text-[#86BBD8]' },
            { label: 'Active', value: metrics.active, textClass: 'text-amber-400' },
            { label: 'Critical', value: metrics.critical, textClass: 'text-rose-400' },
            { label: 'Avg Resolution', value: `${metrics.avgRes}h`, textClass: 'text-emerald-400' },
          ]}
          actions={
            <div className="flex items-center gap-1.5">
              <MasterCollapseButton collapse={collapse} />
              <DownloadButton
                data={dlData}
                columns={dlCols}
                filename={`breakdowns_${new Date().toISOString().split('T')[0]}`}
                title="Equipment Breakdowns"
                subtitle={`${filteredBreakdowns.length} records`}
              />
            </div>
          }
        />

        {/* Filters Panel */}
        <GlassPanel
          icon={Filter}
          title="Filters"
          {...(activeFilterCount > 0 ? { badge: (
            <span className="ml-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#2A4D69] text-[10px] font-bold text-white">
              {activeFilterCount}
            </span>
          ) } : {})}
          {...collapse.panel('filters')}
        >
          <div className="p-4 space-y-3">
            {/* Search + Date row */}
            <div className="flex flex-wrap gap-2">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/30 pointer-events-none" />
                <input
                  type="text"
                  aria-label="Search breakdowns"
                  placeholder="Search machine, artisan, location…"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full bg-white/[0.07] border border-white/[0.12] rounded-xl text-sm text-white placeholder:text-white/25 h-9 pl-9 pr-3 focus:outline-none focus:border-[#86BBD8]/50 transition-colors"
                />
              </div>
              <button type="button" onClick={() => setShowDateRange(p => !p)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                  showDateRange ? 'bg-[#2A4D69]/60 text-white border-[#86BBD8]/30' : 'bg-white/[0.07] text-white/60 border-white/[0.12] hover:bg-white/[0.12]'
                }`}>
                <Calendar className="h-3.5 w-3.5" />Date Range
              </button>
              {activeFilterCount > 0 && (
                <button type="button" onClick={clearFilters}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white/50 bg-white/[0.07] border border-white/[0.12] hover:bg-white/[0.12] hover:text-white transition-all">
                  <FilterX className="h-3.5 w-3.5" />Clear
                </button>
              )}
            </div>

            {/* Date range pickers */}
            {showDateRange && (
              <div className="flex flex-wrap gap-3 bg-white/[0.04] border border-white/[0.08] rounded-xl p-3">
                <GlassInput label="Start Date" type="date" value={startDate}
                  onChange={e => setStartDate(e.target.value)} wrapperClassName="flex-1 min-w-[140px]" />
                <GlassInput label="End Date" type="date" value={endDate}
                  onChange={e => setEndDate(e.target.value)} wrapperClassName="flex-1 min-w-[140px]" />
                <div className="self-end">
                  <button type="button" onClick={() => {
                    const t = new Date(), m = new Date(); m.setDate(t.getDate() - 30);
                    setStartDate(m.toISOString().split('T')[0]); setEndDate(t.toISOString().split('T')[0]);
                  }} className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white/60 bg-white/[0.07] border border-white/[0.12] hover:bg-white/[0.12] transition-all">
                    Last 30 days
                  </button>
                </div>
              </div>
            )}

            {/* Filter dropdowns */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2">
              <GlassSelect value={filters.status} onChange={e => setFilters(p => ({ ...p, status: e.target.value }))}
                options={[{ value: 'all', label: 'All Status' }, ...Object.entries(STATUS_META).map(([k, v]) => ({ value: k, label: v.name }))]} />
              <GlassSelect value={filters.breakdown_type} onChange={e => setFilters(p => ({ ...p, breakdown_type: e.target.value }))}
                options={[{ value: 'all', label: 'All Types' }, ...Object.entries(TYPE_META).map(([k, v]) => ({ value: k, label: v.name }))]} />
              <GlassSelect value={filters.priority} onChange={e => setFilters(p => ({ ...p, priority: e.target.value }))}
                options={[{ value: 'all', label: 'All Priorities' }, ...Object.entries(PRIORITY_META).map(([k, v]) => ({ value: k, label: v.name }))]} />
              <GlassSelect value={filters.department} onChange={e => setFilters(p => ({ ...p, department: e.target.value }))}
                options={[{ value: 'all', label: 'All Depts' }, ...DEPARTMENTS.map(d => ({ value: d, label: d }))]} />
              <div className="relative">
                <input
                  type="text"
                  aria-label="Filter by location"
                  placeholder="Location…"
                  value={filters.location !== 'all' ? filters.location : ''}
                  onChange={e => setFilters(p => ({ ...p, location: e.target.value || 'all' }))}
                  className="w-full bg-white/[0.07] border border-white/[0.12] rounded-xl text-sm text-white placeholder:text-white/25 h-9 px-3 focus:outline-none focus:border-[#86BBD8]/50 transition-colors"
                />
              </div>
              <GlassSelect value={filters.artisan_name} onChange={e => setFilters(p => ({ ...p, artisan_name: e.target.value }))}
                options={[{ value: 'all', label: 'All Artisans' }]} />
              <GlassSelect value={filters.machine_name} onChange={e => setFilters(p => ({ ...p, machine_name: e.target.value }))}
                options={[{ value: 'all', label: 'All Machines' }]} />
            </div>
          </div>
        </GlassPanel>

        {/* Records Panel */}
        <GlassPanel
          icon={TableIcon}
          title="Breakdown Records"
          count={`${filteredBreakdowns.length} of ${breakdowns.length}`}
          {...collapse.panel('records')}
          actions={
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => setViewMode('table')}
                className={`h-7 w-7 flex items-center justify-center rounded-md border transition-all text-xs ${
                  viewMode === 'table' ? 'bg-[#2A4D69]/60 border-[#86BBD8]/30 text-white' : 'bg-white/[0.05] border-white/[0.10] text-white/40 hover:text-white/70'
                }`} title="List view">
                <TableIcon className="h-3.5 w-3.5" />
              </button>
              <button type="button" onClick={() => setViewMode('grid')}
                className={`h-7 w-7 flex items-center justify-center rounded-md border transition-all text-xs ${
                  viewMode === 'grid' ? 'bg-[#2A4D69]/60 border-[#86BBD8]/30 text-white' : 'bg-white/[0.05] border-white/[0.10] text-white/40 hover:text-white/70'
                }`} title="Grid view">
                <LayoutGrid className="h-3.5 w-3.5" />
              </button>
            </div>
          }
        >
          {loading ? (
            <div className="flex items-center justify-center py-16 gap-2 text-white/40">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Loading breakdowns…</span>
            </div>
          ) : filteredBreakdowns.length === 0 ? (
            <div className="text-center py-16">
              <div className="mx-auto w-14 h-14 rounded-full bg-white/[0.05] border border-white/[0.10] flex items-center justify-center mb-4">
                <AlertTriangle className="h-6 w-6 text-[#86BBD8]/60" />
              </div>
              <p className="text-sm font-medium text-white/60">No breakdowns found</p>
              <p className="text-xs text-white/30 mt-1 mb-4">Try clearing filters or log a new breakdown</p>
              <button type="button" onClick={handleCreate}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-br from-[#2A4D69] to-[#1e3a52] border border-[#86BBD8]/25 hover:opacity-90 transition-all">
                <Plus className="h-4 w-4" />Log First Breakdown
              </button>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredBreakdowns.map(bd => {
                const id = String(bd.id);
                return (
                  <BreakdownCard
                    key={id}
                    breakdown={bd}
                    onView={handleView}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    isExpanded={expandedItems.has(id)}
                    onToggleExpand={() => toggleExpand(id)}
                  />
                );
              })}
            </div>
          ) : (
            <BreakdownTable
              breakdowns={filteredBreakdowns}
              onView={handleView}
              onEdit={handleEdit}
              onDelete={handleDelete}
              sortField={sortField}
              sortDirection={sortDirection}
              onSort={handleSort}
              expandedItems={expandedItems}
              onToggleExpand={toggleExpand}
            />
          )}
        </GlassPanel>
      </div>

      <DetailsModal
        breakdown={selectedBd}
        isOpen={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <FormModal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleFormSubmit}
        initialData={selectedBd}
        mode={formMode}
      />

      <DeleteDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onDelete={confirmDelete}
        title="Delete Breakdown"
        description={`Delete the breakdown record for "${deleteTarget?.machine_name}" on ${deleteTarget?.breakdown_date}? This cannot be undone.`}
      />
    </PageShell>
  );
};

export default BreakdownsPage;
