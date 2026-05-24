//Pachedu
//frontend/app/pachedu/page.tsx

'use client';

import React, { useState, useEffect, useMemo } from "react";
import {
  HeartHandshake, Search, FilterX,
  AlertTriangle, CheckSquare, ShieldCheck,
  Eye, Pencil, Trash2, Loader2,
  Calendar, MapPin, FileText, CheckCircle,
  LayoutGrid, Table as TableIcon,
  MoreVertical, RefreshCw, Send,
  Wrench, Zap, X, Plus,
  Flag, AlertCircle, ChevronRight, ChevronDown, ChevronUp,
} from "lucide-react";
import { PageShell } from '@/components/PageShell';
import {
  fmtDate as formatDate,
  fmtDateTime as formatDateTime,
  GlassBadge,
  GlassInput,
  GlassSelect,
  GlassTextarea,
  GlassModal,
  GlassStatCard,
  GlassProgress,
  usePageCollapse,
  MasterCollapseButton,
} from '@/components/shared';
import { toast } from "sonner";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://myofficebackend.onrender.com';

// =============== TYPES ===============
type SectionType = 'Mechanical' | 'Electrical';
type BehaviourType = 'Intentional' | 'Unintentional';
type PacheduStatus = 'draft' | 'submitted' | 'reviewed' | 'closed';
type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'purple';

interface PacheduReport {
  id: string;
  location: string;
  date: string;
  activityObserved: string;
  whatDidYouSee: string;
  reasons: string;
  behaviourType: BehaviourType;
  impacts: string[];
  whatDidYouDo: string;
  observerName: string;
  dept: string;
  sdwt: string;
  sectionChoice: SectionType;
  checklist: string[];
  status: PacheduStatus;
  created_at: string;
  updated_at?: string;
  submitted_at?: string;
}

interface PacheduStats {
  total: number;
  bySection: Record<SectionType, number>;
  byDept: Record<string, number>;
  byBehaviour: Record<BehaviourType, number>;
  totalImpacts: number;
  totalChecklist: number;
  draftCount: number;
  submittedCount: number;
  reviewedCount: number;
  closedCount: number;
}

// =============== CONSTANTS ===============
const SECTIONS: SectionType[] = ['Mechanical', 'Electrical'];
const BEHAVIOUR_TYPES: BehaviourType[] = ['Intentional', 'Unintentional'];

const SECTION_ICONS: Record<SectionType, React.ElementType> = {
  Mechanical: Wrench,
  Electrical: Zap,
};

const SECTION_GLASS: Record<SectionType, { iconClass: string; badge: BadgeVariant; barClass: string }> = {
  Mechanical: { iconClass: 'text-blue-400', badge: 'info', barClass: 'bg-blue-500/70' },
  Electrical: { iconClass: 'text-amber-400', badge: 'warning', barClass: 'bg-amber-500/70' },
};

const BEHAVIOUR_GLASS: Record<BehaviourType, { badge: BadgeVariant; icon: React.ElementType }> = {
  Intentional: { badge: 'warning', icon: Flag },
  Unintentional: { badge: 'info', icon: AlertCircle },
};

const STATUS_GLASS: Record<PacheduStatus, { badge: BadgeVariant; label: string }> = {
  draft: { badge: 'neutral', label: 'Draft' },
  submitted: { badge: 'info', label: 'Submitted' },
  reviewed: { badge: 'purple', label: 'Reviewed' },
  closed: { badge: 'success', label: 'Closed' },
};

const IMPACT_OPTIONS = [
  "Minor injury", "Serious injury", "Fatality",
  "Damage To Property/RTA", "Increased Cost", "Loss of Production",
  "Environmental Impact", "Health threat",
];

const CHECKLIST_CATEGORIES = [
  {
    name: "PERSONAL BEHAVIOUR",
    items: [
      "Competence", "Operating speed", "Operating authority",
      "Explosives handling", "Personal positioning", "Checklist completion",
      "Condoning unsafe behaviour", "Communication/Horseplay", "Working on unsafe equipment",
    ],
  },
  {
    name: "TOOLS & EQUIPMENT",
    items: [
      "Machine condition", "Water blast/blowpipe", "Lockout system",
      "Service pipes", "Pinch bar/gaskets", "Gas testers",
      "Ladders/Platforms", "Safety chains", "Warning signs",
    ],
  },
  {
    name: "WORKING CONDITIONS",
    items: [
      "General housekeeping", "Illumination", "Ventilation/Dust",
      "Ground support", "Pools of water", "Air/Water leaks",
      "Oil leaks", "Noxious atmosphere", "Confined space", "Fire hazards", "Noise",
    ],
  },
  {
    name: "HUMAN NATURE & TASK",
    items: [
      "Stress", "Shortcuts", "Attitude/Mindset", "Complacency",
      "Unclear responsibilities", "High workload", "Time pressure",
      "Multi-tasking", "Illness/Fatigue", "Inexperienced",
    ],
  },
];

// =============== API FUNCTIONS ===============
async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!response.ok) {
    const text = await response.text();
    try { throw new Error(JSON.parse(text).detail || `API error: ${response.status}`); }
    catch { throw new Error(text || `API error: ${response.status}`); }
  }
  if (response.status === 204) return {} as T;
  const ct = response.headers.get('content-type');
  if (ct?.includes('application/json')) return response.json();
  return {} as T;
}

async function getPacheduReports(): Promise<PacheduReport[]> {
  try {
    const data = await fetchAPI<PacheduReport[]>('/api/pachedu/');
    return Array.isArray(data) ? data : [];
  } catch { return []; }
}

async function createPacheduReport(report: Partial<PacheduReport>): Promise<PacheduReport | null> {
  try { return await fetchAPI<PacheduReport>('/api/pachedu/', { method: 'POST', body: JSON.stringify(report) }); }
  catch { return null; }
}

async function updatePacheduReport(id: string, report: Partial<PacheduReport>): Promise<PacheduReport | null> {
  try { return await fetchAPI<PacheduReport>(`/api/pachedu/${id}`, { method: 'PATCH', body: JSON.stringify(report) }); }
  catch { return null; }
}

async function deletePacheduReport(id: string): Promise<boolean> {
  try { await fetchAPI(`/api/pachedu/${id}`, { method: 'DELETE' }); return true; }
  catch { return false; }
}

async function getPacheduStats(): Promise<PacheduStats> {
  try {
    const data = await fetchAPI<Partial<PacheduStats>>('/api/pachedu/stats/overview');
    return {
      total: data?.total || 0,
      bySection: data?.bySection || { Mechanical: 0, Electrical: 0 },
      byDept: data?.byDept || {},
      byBehaviour: data?.byBehaviour || { Intentional: 0, Unintentional: 0 },
      totalImpacts: data?.totalImpacts || 0,
      totalChecklist: data?.totalChecklist || 0,
      draftCount: data?.draftCount || 0,
      submittedCount: data?.submittedCount || 0,
      reviewedCount: data?.reviewedCount || 0,
      closedCount: data?.closedCount || 0,
    };
  } catch {
    return {
      total: 0, bySection: { Mechanical: 0, Electrical: 0 }, byDept: {},
      byBehaviour: { Intentional: 0, Unintentional: 0 },
      totalImpacts: 0, totalChecklist: 0,
      draftCount: 0, submittedCount: 0, reviewedCount: 0, closedCount: 0,
    };
  }
}

// =============== TABLE ROW (needs own state for dropdown) ===============
interface TableRowItemProps {
  report: PacheduReport;
  index: number;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (id: string, status: PacheduStatus) => void;
}

const TableRowItem: React.FC<TableRowItemProps> = ({ report, onView, onEdit, onDelete, onStatusChange }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const SectionIcon = SECTION_ICONS[report.sectionChoice];
  const sectionGlass = SECTION_GLASS[report.sectionChoice];
  const behaviourGlass = BEHAVIOUR_GLASS[report.behaviourType];
  const statusGlass = STATUS_GLASS[report.status];

  return (
    <tr className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
      <td className="px-4 py-3 text-xs text-white/60">{formatDate(report.date)}</td>
      <td className="px-4 py-3 text-xs font-medium text-white/80">{report.observerName || 'Anonymous'}</td>
      <td className="px-4 py-3 text-xs text-white/60">{report.location}</td>
      <td className="px-4 py-3 text-xs text-white/60 max-w-[180px] truncate">{report.activityObserved}</td>
      <td className="px-4 py-3">
        <GlassBadge variant={sectionGlass.badge}>
          <SectionIcon className="h-3 w-3 mr-1 inline" />{report.sectionChoice}
        </GlassBadge>
      </td>
      <td className="px-4 py-3">
        <GlassBadge variant={behaviourGlass.badge}>{report.behaviourType}</GlassBadge>
      </td>
      <td className="px-4 py-3">
        <GlassBadge variant={statusGlass.badge}>{statusGlass.label}</GlassBadge>
      </td>
      <td className="px-4 py-3 text-right">
        <div className="relative inline-block" onClick={(e) => e.stopPropagation()}>
          <button type="button" title="More options" onClick={() => setMenuOpen(v => !v)}
            className="p-1.5 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/[0.05] transition-colors">
            <MoreVertical className="h-4 w-4" />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-8 z-20 w-44 rounded-xl bg-[rgba(5,15,28,0.97)] border border-white/[0.12] shadow-xl overflow-hidden">
                <button type="button" onClick={() => { setMenuOpen(false); onView(); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white/70 hover:bg-white/[0.05] hover:text-white transition-colors">
                  <Eye className="h-3.5 w-3.5" /> View
                </button>
                <button type="button" onClick={() => { setMenuOpen(false); onEdit(); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white/70 hover:bg-white/[0.05] hover:text-white transition-colors">
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </button>
                <div className="border-t border-white/[0.06]">
                  {(['draft', 'submitted', 'reviewed', 'closed'] as PacheduStatus[]).map(s => (
                    <button key={s} type="button"
                      onClick={() => { setMenuOpen(false); onStatusChange(report.id, s); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white/70 hover:bg-white/[0.05] hover:text-white transition-colors">
                      {STATUS_GLASS[s].label}
                    </button>
                  ))}
                </div>
                <div className="border-t border-white/[0.06]">
                  <button type="button" onClick={() => { setMenuOpen(false); onDelete(); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors">
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </td>
    </tr>
  );
};

// =============== PACHEDU CARD ===============
interface PacheduCardProps {
  report: PacheduReport;
  index: number;
  onView: (report: PacheduReport) => void;
  onEdit: (report: PacheduReport) => void;
  onDelete: (id: string) => void;
  onStatusChange?: (id: string, status: PacheduStatus) => void;
}

const PacheduCard: React.FC<PacheduCardProps> = ({ report, index, onView, onEdit, onDelete, onStatusChange }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const SectionIcon = SECTION_ICONS[report.sectionChoice];
  const sectionGlass = SECTION_GLASS[report.sectionChoice];
  const statusGlass = STATUS_GLASS[report.status];
  const behaviourGlass = BEHAVIOUR_GLASS[report.behaviourType];
  const BehaviourIcon = behaviourGlass.icon;
  const hasRisks = report.impacts?.includes("Serious injury") ||
    report.impacts?.includes("Fatality") ||
    report.impacts?.includes("Environmental Impact");

  return (
    <div
      className={`group relative rounded-2xl bg-[rgba(5,15,28,0.65)] border border-white/[0.08] backdrop-blur-sm overflow-hidden cursor-pointer transition-all duration-300 hover:border-white/[0.15] hover:shadow-xl border-l-4 ${hasRisks ? 'border-l-red-500/70' : 'border-l-amber-500/60'}`}
      onClick={() => onView(report)}
    >
      {/* Header */}
      <div className="p-4 border-b border-white/[0.06]">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-xl bg-amber-500/10 shrink-0">
              <HeartHandshake className="h-5 w-5 text-amber-500" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 mb-1">
                <GlassBadge variant={sectionGlass.badge}>
                  <SectionIcon className="h-3 w-3 mr-1 inline" />{report.sectionChoice}
                </GlassBadge>
                <GlassBadge variant={behaviourGlass.badge}>
                  <BehaviourIcon className="h-3 w-3 mr-1 inline" />{report.behaviourType}
                </GlassBadge>
                {hasRisks && <GlassBadge variant="danger"><AlertTriangle className="h-3 w-3 mr-1 inline" />High Risk</GlassBadge>}
              </div>
              <p className="text-[10px] text-white/40">Care #{index + 1}</p>
              <h3 className="font-semibold text-sm text-white/90 truncate mt-0.5">
                {report.observerName || 'Anonymous'}
              </h3>
            </div>
          </div>
          {/* Actions dropdown */}
          <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
            <button type="button" title="More options" onClick={() => setMenuOpen(v => !v)}
              className="p-1.5 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/[0.05] transition-colors">
              <MoreVertical className="h-4 w-4" />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-8 z-20 w-48 rounded-xl bg-[rgba(5,15,28,0.97)] border border-white/[0.12] shadow-xl overflow-hidden">
                  <div className="px-3 py-1.5 text-[10px] font-semibold text-white/40 uppercase tracking-wider border-b border-white/[0.06]">Actions</div>
                  <button type="button" onClick={() => { setMenuOpen(false); onView(report); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white/70 hover:bg-white/[0.05] hover:text-white transition-colors">
                    <Eye className="h-3.5 w-3.5" /> View Details
                  </button>
                  <button type="button" onClick={() => { setMenuOpen(false); onEdit(report); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white/70 hover:bg-white/[0.05] hover:text-white transition-colors">
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </button>
                  <div className="border-t border-white/[0.06] px-3 py-1.5 text-[10px] font-semibold text-white/40 uppercase tracking-wider">Change Status</div>
                  {(['draft', 'submitted', 'reviewed', 'closed'] as PacheduStatus[]).map(s => (
                    <button key={s} type="button"
                      onClick={() => { setMenuOpen(false); onStatusChange?.(report.id, s); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white/70 hover:bg-white/[0.05] hover:text-white transition-colors">
                      {STATUS_GLASS[s].label}
                    </button>
                  ))}
                  <div className="border-t border-white/[0.06]">
                    <button type="button" onClick={() => { setMenuOpen(false); onDelete(report.id); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors">
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 border-b border-white/[0.06]">
        <div className="py-2 text-center border-r border-white/[0.06]">
          <p className="text-base font-bold text-white/90">{report.impacts?.length || 0}</p>
          <p className="text-[10px] text-white/40">Impacts</p>
        </div>
        <div className="py-2 text-center border-r border-white/[0.06]">
          <p className="text-base font-bold text-white/90">{report.checklist?.length || 0}</p>
          <p className="text-[10px] text-white/40">Checklist</p>
        </div>
        <div className="py-2 flex items-center justify-center">
          <GlassBadge variant={statusGlass.badge}>{statusGlass.label}</GlassBadge>
        </div>
      </div>

      {/* Info */}
      <div className="p-4 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-1.5 text-xs text-white/60 bg-white/[0.03] rounded-lg px-2 py-1.5">
            <MapPin className="h-3 w-3 text-white/30 shrink-0" />
            <span className="truncate">{report.location || 'N/A'}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-white/60 bg-white/[0.03] rounded-lg px-2 py-1.5">
            <Calendar className="h-3 w-3 text-white/30 shrink-0" />
            <span>{formatDate(report.date)}</span>
          </div>
        </div>
        <div className="bg-white/[0.03] rounded-lg px-3 py-2">
          <p className="text-[10px] text-white/40 mb-0.5">Activity Observed</p>
          <p className="text-xs text-white/70 line-clamp-2">{report.activityObserved || 'N/A'}</p>
        </div>
        {report.dept && <GlassBadge variant="neutral">Dept: {report.dept}</GlassBadge>}
      </div>
    </div>
  );
};

// =============== DETAIL MODAL ===============
interface PacheduDetailModalProps {
  report: PacheduReport | null;
  open: boolean;
  onClose: () => void;
  onEdit: (report: PacheduReport) => void;
  onDelete: (id: string) => void;
  onStatusChange?: (id: string, status: PacheduStatus) => void;
}

const PacheduDetailModal: React.FC<PacheduDetailModalProps> = ({
  report, open, onClose, onEdit, onDelete, onStatusChange,
}) => {
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  if (!report) return null;

  const SectionIcon = SECTION_ICONS[report.sectionChoice];
  const sectionGlass = SECTION_GLASS[report.sectionChoice];
  const statusGlass = STATUS_GLASS[report.status];
  const behaviourGlass = BEHAVIOUR_GLASS[report.behaviourType];
  const BehaviourIcon = behaviourGlass.icon;

  return (
    <GlassModal
      isOpen={open}
      onClose={onClose}
      title="Pachedu: Be Your Brother's Keeper"
      icon={HeartHandshake}
      size="xl"
      footer={
        <>
          <div className="relative mr-auto">
            <button type="button" onClick={() => setStatusMenuOpen(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.05] border border-white/[0.08] text-white/60 text-xs hover:text-white/80 hover:bg-white/[0.08] transition-colors">
              Status <ChevronDown className="h-3.5 w-3.5" />
            </button>
            {statusMenuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setStatusMenuOpen(false)} />
                <div className="absolute bottom-9 left-0 z-20 w-40 rounded-xl bg-[rgba(5,15,28,0.97)] border border-white/[0.12] shadow-xl overflow-hidden">
                  {(['draft', 'submitted', 'reviewed', 'closed'] as PacheduStatus[]).map(s => (
                    <button key={s} type="button"
                      onClick={() => { setStatusMenuOpen(false); onStatusChange?.(report.id, s); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white/70 hover:bg-white/[0.05] hover:text-white transition-colors">
                      {STATUS_GLASS[s].label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          <button type="button" onClick={() => { onClose(); onEdit(report); }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2A4D69]/60 border border-[#86BBD8]/25 text-[#86BBD8] text-sm hover:bg-[#2A4D69]/80 transition-colors">
            <Pencil className="h-3.5 w-3.5" /> Edit
          </button>
          <button type="button" onClick={() => { onClose(); onDelete(report.id); }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm hover:bg-red-500/20 transition-colors">
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </button>
        </>
      }
    >
      <div className="space-y-5">
        {/* Status bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-white/[0.06]">
              <SectionIcon className={`h-5 w-5 ${sectionGlass.iconClass}`} />
            </div>
            <div>
              <p className="text-sm font-medium text-white/80">{report.sectionChoice}</p>
              <p className="text-[10px] text-white/40">Section</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <GlassBadge variant={behaviourGlass.badge}>
              <BehaviourIcon className="h-3 w-3 mr-1 inline" />{report.behaviourType}
            </GlassBadge>
            <GlassBadge variant={statusGlass.badge}>{statusGlass.label}</GlassBadge>
            <span className="text-[10px] text-white/30 px-2 py-1 rounded bg-white/[0.05] font-mono">
              ID: {report.id.slice(0, 8)}
            </span>
          </div>
        </div>

        {/* Key info */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Location', value: report.location || 'N/A' },
            { label: 'Date', value: formatDate(report.date) },
            { label: 'Observer', value: report.observerName || 'Anonymous' },
            { label: 'Department', value: report.dept || 'N/A' },
          ].map(item => (
            <div key={item.label} className="bg-white/[0.03] rounded-xl p-3">
              <p className="text-[10px] text-white/40 mb-0.5">{item.label}</p>
              <p className="text-sm font-medium text-white/80">{item.value}</p>
            </div>
          ))}
        </div>

        {/* Activity Observed */}
        <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4">
          <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-2">Activity Observed</p>
          <p className="text-sm text-white/70">{report.activityObserved || 'N/A'}</p>
        </div>

        {/* What Did You See & Reasons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4">
            <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-1">What did you see?</p>
            <p className="text-[10px] text-white/30 mb-2">Waonei? / Uboneni?</p>
            <p className="text-sm text-white/70 whitespace-pre-wrap">{report.whatDidYouSee || 'N/A'}</p>
          </div>
          <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4">
            <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-1">Reasons</p>
            <p className="text-[10px] text-white/30 mb-2">Zvikonzero / Isizatho</p>
            <p className="text-sm text-white/70 whitespace-pre-wrap">{report.reasons || 'N/A'}</p>
          </div>
        </div>

        {/* What Did You Do */}
        <div className="rounded-xl bg-white/[0.03] border border-l-4 border-emerald-500/60 border-white/[0.06] p-4">
          <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-1">What did you do to ensure you Care?</p>
          <p className="text-[10px] text-white/30 mb-2">Waitei chinoratidza kuti unehanya neumwe wako?</p>
          <p className="text-sm text-white/70 whitespace-pre-wrap">{report.whatDidYouDo || 'N/A'}</p>
        </div>

        {/* Impacts */}
        {report.impacts && report.impacts.length > 0 && (
          <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4">
            <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">Potential Impacts</p>
            <div className="flex flex-wrap gap-2">
              {report.impacts.map((impact, idx) => (
                <GlassBadge key={idx} variant={
                  impact.includes("Serious") || impact.includes("Fatality") ? 'danger' : 'warning'
                }>{impact}</GlassBadge>
              ))}
            </div>
          </div>
        )}

        {/* Checklist */}
        {report.checklist && report.checklist.length > 0 && (
          <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4">
            <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">Referral Checklist</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {report.checklist.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs text-white/70 bg-white/[0.03] rounded-lg px-3 py-1.5">
                  <CheckCircle className="h-3 w-3 text-emerald-400 shrink-0" />{item}
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-[10px] text-white/30 text-center">Created {formatDateTime(report.created_at)}</p>
      </div>
    </GlassModal>
  );
};

// =============== MAIN PAGE ===============
const defaultForm: Partial<PacheduReport> = {
  location: "", date: new Date().toISOString().split('T')[0],
  activityObserved: "", whatDidYouSee: "", reasons: "",
  behaviourType: "Unintentional", impacts: [], whatDidYouDo: "",
  observerName: "", dept: "", sdwt: "", sectionChoice: "Mechanical",
  checklist: [], status: "draft",
};

export default function PacheduFormPage() {
  const sections = usePageCollapse({ stats: false, distribution: false, records: true });

  const [reports, setReports] = useState<PacheduReport[]>([]);
  const [stats, setStats] = useState<PacheduStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  const [selectedReport, setSelectedReport] = useState<PacheduReport | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<PacheduReport | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSection, setSelectedSection] = useState('all');
  const [selectedDept, setSelectedDept] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [formData, setFormData] = useState<Partial<PacheduReport>>(defaultForm);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [reportsData, statsData] = await Promise.all([getPacheduReports(), getPacheduStats()]);
      setReports(reportsData);
      setStats(statsData);
    } catch {
      setError('Failed to load Pachedu reports. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleImpactToggle = (impact: string) => setFormData(prev => ({
    ...prev,
    impacts: prev.impacts?.includes(impact)
      ? prev.impacts.filter(i => i !== impact)
      : [...(prev.impacts || []), impact],
  }));

  const handleChecklistToggle = (item: string) => setFormData(prev => ({
    ...prev,
    checklist: prev.checklist?.includes(item)
      ? prev.checklist.filter(i => i !== item)
      : [...(prev.checklist || []), item],
  }));

  const validateForm = (): boolean => {
    if (!formData.location?.trim()) { toast.error('Location is required'); return false; }
    if (!formData.activityObserved?.trim()) { toast.error('Activity observed is required'); return false; }
    if (!formData.whatDidYouSee?.trim()) { toast.error('Please describe what you saw'); return false; }
    if (!formData.whatDidYouDo?.trim()) { toast.error('Please describe what you did'); return false; }
    if (!formData.date) { toast.error('Date is required'); return false; }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);
    try {
      let saved: PacheduReport | null = null;
      if (editingReport) {
        saved = await updatePacheduReport(editingReport.id, { ...formData, updated_at: new Date().toISOString() });
        if (saved) {
          setReports(prev => prev.map(r => r.id === saved!.id ? saved! : r));
          toast.success('Pachedu observation updated successfully');
        }
      } else {
        saved = await createPacheduReport({ ...formData, status: 'submitted', submitted_at: new Date().toISOString() });
        if (saved) {
          setReports(prev => [saved!, ...prev]);
          toast.success('Pachedu observation saved. Thank you for making PPM a safe place to work!');
        }
      }
      if (saved) setStats(await getPacheduStats());
      setFormData(defaultForm);
      setIsFormModalOpen(false);
      setEditingReport(null);
    } catch {
      toast.error('Failed to save observation');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: PacheduStatus) => {
    const report = reports.find(r => r.id === id);
    if (!report) return;
    setReports(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));
    try {
      const saved = await updatePacheduReport(id, { status: newStatus });
      if (!saved) {
        setReports(prev => prev.map(r => r.id === id ? report : r));
        toast.error('Failed to update status');
      } else {
        toast.success(`Status updated to ${newStatus}`);
        setStats(await getPacheduStats());
      }
    } catch {
      setReports(prev => prev.map(r => r.id === id ? report : r));
      toast.error('Failed to update status');
    }
  };

  const handleEdit = (report: PacheduReport) => {
    setEditingReport(report);
    setFormData({
      location: report.location, date: report.date,
      activityObserved: report.activityObserved, whatDidYouSee: report.whatDidYouSee,
      reasons: report.reasons, behaviourType: report.behaviourType,
      impacts: report.impacts, whatDidYouDo: report.whatDidYouDo,
      observerName: report.observerName, dept: report.dept,
      sdwt: report.sdwt, sectionChoice: report.sectionChoice,
      checklist: report.checklist, status: report.status,
    });
    setIsFormModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      if (await deletePacheduReport(id)) {
        setReports(prev => prev.filter(r => r.id !== id));
        setStats(await getPacheduStats());
        toast.success('Pachedu observation deleted successfully');
        setDeleteConfirm(null);
      }
    } catch {
      toast.error('Failed to delete observation');
    }
  };

  const filteredReports = useMemo(() => reports.filter(report => {
    if (searchTerm) {
      const sl = searchTerm.toLowerCase();
      const match = report.observerName?.toLowerCase().includes(sl) ||
        report.location?.toLowerCase().includes(sl) ||
        report.activityObserved?.toLowerCase().includes(sl) ||
        report.whatDidYouSee?.toLowerCase().includes(sl) ||
        report.dept?.toLowerCase().includes(sl);
      if (!match) return false;
    }
    if (selectedSection !== 'all' && report.sectionChoice !== selectedSection) return false;
    if (selectedDept !== 'all' && report.dept !== selectedDept) return false;
    if (selectedStatus !== 'all' && report.status !== selectedStatus) return false;
    if (dateFrom && new Date(report.date) < new Date(dateFrom)) return false;
    if (dateTo && new Date(report.date) > new Date(dateTo)) return false;
    return true;
  }), [reports, searchTerm, selectedSection, selectedDept, selectedStatus, dateFrom, dateTo]);

  const clearFilters = () => {
    setSearchTerm(''); setSelectedSection('all'); setSelectedDept('all');
    setSelectedStatus('all'); setDateFrom(''); setDateTo('');
  };

  const uniqueDepts = useMemo(() => stats ? Object.keys(stats.byDept) : [], [stats]);
  const hasActiveFilters = searchTerm || selectedSection !== 'all' || selectedDept !== 'all' ||
    selectedStatus !== 'all' || dateFrom || dateTo;

  const openNewForm = () => {
    setEditingReport(null);
    setFormData(defaultForm);
    setIsFormModalOpen(true);
  };

  // select options
  const sectionOptions = [{ value: 'all', label: 'All Sections' }, ...SECTIONS.map(s => ({ value: s, label: s }))];
  const deptOptions = [{ value: 'all', label: 'All Departments' }, ...uniqueDepts.map(d => ({ value: d, label: d }))];
  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'draft', label: 'Draft' },
    { value: 'submitted', label: 'Submitted' },
    { value: 'reviewed', label: 'Reviewed' },
    { value: 'closed', label: 'Closed' },
  ];

  return (
    <PageShell>
      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <nav className="flex items-center gap-1.5 text-xs text-white/40 mb-2">
              <span>Home</span>
              <ChevronRight className="h-3 w-3" />
              <span className="text-[#86BBD8] font-medium">Pachedu</span>
            </nav>
            <h1 className="text-2xl font-bold text-white/90 font-heading tracking-tight flex items-center gap-2">
              <HeartHandshake className="h-6 w-6 text-amber-500" />
              Pachedu — Care Observations
            </h1>
            <p className="text-white/40 text-sm mt-1">Be Your Brother&apos;s Keeper — track care observations and supportive actions.</p>
          </div>
          <div className="flex items-center gap-2 self-start">
            <MasterCollapseButton collapse={sections} />
            <button type="button" title="Grid View" onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg border transition-colors ${viewMode === 'grid' ? 'bg-[#2A4D69]/60 border-[#86BBD8]/25 text-[#86BBD8]' : 'border-white/[0.08] text-white/40 hover:text-white/70 hover:bg-white/[0.05]'}`}>
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button type="button" title="Table View" onClick={() => setViewMode('table')}
              className={`p-2 rounded-lg border transition-colors ${viewMode === 'table' ? 'bg-[#2A4D69]/60 border-[#86BBD8]/25 text-[#86BBD8]' : 'border-white/[0.08] text-white/40 hover:text-white/70 hover:bg-white/[0.05]'}`}>
              <TableIcon className="h-4 w-4" />
            </button>
            <button type="button" onClick={openNewForm}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#2A4D69] hover:bg-[#1e3a52] text-white border border-[#86BBD8]/20 text-sm font-semibold transition-colors">
              <Plus className="h-4 w-4" /> New Care Observation
            </button>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="rounded-2xl bg-[rgba(5,15,28,0.65)] border border-white/[0.08] backdrop-blur-sm overflow-hidden">
            <button type="button" onClick={() => sections.toggle('stats')}
              className="w-full flex items-center justify-between px-5 py-3 hover:bg-white/[0.03] transition-all">
              <div className="flex items-center gap-2">
                <HeartHandshake className="h-3.5 w-3.5 text-amber-400" />
                <span className="text-xs font-semibold text-white/70 uppercase tracking-wider">Overview</span>
                <span className="text-xs text-white/35">{stats.total} observations total</span>
              </div>
              {sections.expanded.stats ? <ChevronUp className="h-3.5 w-3.5 text-white/40" /> : <ChevronDown className="h-3.5 w-3.5 text-white/40" />}
            </button>
            {sections.expanded.stats && (
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 px-5 pb-5">
                <GlassStatCard label="Total Care" value={stats.total} icon={HeartHandshake} valueClass="text-amber-400" />
                <GlassStatCard label="Draft" value={stats.draftCount} icon={FileText} valueClass="text-white/60" />
                <GlassStatCard label="Submitted" value={stats.submittedCount} icon={Send} valueClass="text-blue-400" />
                <GlassStatCard label="Reviewed" value={stats.reviewedCount} icon={CheckCircle} valueClass="text-purple-400" />
                <GlassStatCard label="Closed" value={stats.closedCount} icon={CheckSquare} valueClass="text-emerald-400" />
                <GlassStatCard label="Intentional" value={stats.byBehaviour['Intentional']} icon={AlertTriangle} valueClass="text-orange-400" />
              </div>
            )}
          </div>
        )}

        {/* Section Distribution */}
        {stats && stats.total > 0 && (
          <div className="rounded-2xl bg-[rgba(5,15,28,0.65)] border border-white/[0.08] backdrop-blur-sm overflow-hidden">
            <button type="button" onClick={() => sections.toggle('distribution')}
              className="w-full flex items-center justify-between px-5 py-3 hover:bg-white/[0.03] transition-all">
              <span className="text-xs font-semibold text-white/70 uppercase tracking-wider">Distribution by Section</span>
              {sections.expanded.distribution ? <ChevronUp className="h-3.5 w-3.5 text-white/40" /> : <ChevronDown className="h-3.5 w-3.5 text-white/40" />}
            </button>
            {sections.expanded.distribution && (
              <div className="flex gap-6 px-5 pb-5">
                {SECTIONS.map(section => {
                  const Icon = SECTION_ICONS[section];
                  const glass = SECTION_GLASS[section];
                  const count = stats.bySection[section] || 0;
                  const pct = stats.total ? Math.round((count / stats.total) * 100) : 0;
                  return (
                    <div key={section} className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Icon className={`h-4 w-4 ${glass.iconClass}`} />
                          <span className="text-sm text-white/70 font-medium">{section}</span>
                        </div>
                        <span className="text-xs text-white/40">{count} ({pct}%)</span>
                      </div>
                      <GlassProgress value={pct} colorClass={glass.barClass} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Filter Bar */}
        <div className="rounded-2xl bg-[rgba(5,15,28,0.65)] border border-white/[0.08] backdrop-blur-sm p-5">
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30 pointer-events-none" />
              <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by observer, location, activity..."
                className="w-full pl-9 pr-9 py-2 rounded-lg bg-white/[0.07] border border-white/[0.12] text-white/80 placeholder:text-white/25 text-sm outline-none focus:border-[#86BBD8]/50 transition-colors" />
              {searchTerm && (
                <button type="button" aria-label="Clear search" onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <GlassSelect value={selectedSection} onChange={(e) => setSelectedSection(e.target.value)}
              options={sectionOptions} title="Filter by section" className="lg:w-[150px]" />
            <GlassSelect value={selectedDept} onChange={(e) => setSelectedDept(e.target.value)}
              options={deptOptions} title="Filter by department" className="lg:w-[180px]" />
            <GlassSelect value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}
              options={statusOptions} title="Filter by status" className="lg:w-[140px]" />
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
              title="Start date"
              className="px-3 py-2 h-9 rounded-xl bg-white/[0.07] border border-white/[0.12] text-white/70 text-sm [color-scheme:dark] outline-none focus:border-[#86BBD8]/50" />
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
              title="End date"
              className="px-3 py-2 h-9 rounded-xl bg-white/[0.07] border border-white/[0.12] text-white/70 text-sm [color-scheme:dark] outline-none focus:border-[#86BBD8]/50" />
            {hasActiveFilters && (
              <button type="button" onClick={clearFilters}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-white/50 hover:text-white/80 hover:bg-white/[0.05] text-sm transition-colors">
                <FilterX className="h-4 w-4" /> Clear
              </button>
            )}
          </div>
          <p className="mt-3 text-xs text-white/40">
            Showing {filteredReports.length} of {reports.length} observations
          </p>
        </div>

        {/* Records */}
        <div className="rounded-2xl bg-[rgba(5,15,28,0.65)] border border-white/[0.08] backdrop-blur-sm overflow-hidden">
          <button type="button" onClick={() => sections.toggle('records')}
            className="w-full flex items-center justify-between px-5 py-3 hover:bg-white/[0.03] transition-all">
            <div className="flex items-center gap-2">
              <FileText className="h-3.5 w-3.5 text-[#86BBD8]" />
              <span className="text-xs font-semibold text-white/70 uppercase tracking-wider">Records</span>
              <span className="text-xs text-white/35">{filteredReports.length} of {reports.length} observations</span>
            </div>
            {sections.expanded.records ? <ChevronUp className="h-3.5 w-3.5 text-white/40" /> : <ChevronDown className="h-3.5 w-3.5 text-white/40" />}
          </button>
          {sections.expanded.records && (
          <div className="px-5 pb-5 pt-1">

        {/* Loading */}
        {loading && (
          <div className="flex justify-center items-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="rounded-2xl bg-red-500/10 border border-red-500/20 p-5 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-400 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-400">Error Loading Data</p>
              <p className="text-xs text-red-400/70 mt-0.5">{error}</p>
            </div>
            <button type="button" onClick={loadData}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs hover:bg-red-500/20 transition-colors">
              <RefreshCw className="h-3.5 w-3.5" /> Retry
            </button>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && filteredReports.length === 0 && (
          <div className="rounded-2xl bg-[rgba(5,15,28,0.65)] border border-white/[0.08] py-20 text-center">
            <HeartHandshake className="h-12 w-12 text-white/20 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white/60 mb-2">No care observations found</h3>
            <p className="text-sm text-white/30 mb-6">
              {reports.length === 0 ? "Be the first to record a Pachedu observation." : "Try adjusting your filters to see more results."}
            </p>
            {reports.length === 0 ? (
              <button type="button" onClick={openNewForm}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 text-sm font-semibold hover:bg-amber-500/30 transition-colors">
                <Plus className="h-4 w-4" /> Create First Observation
              </button>
            ) : (
              <button type="button" onClick={clearFilters}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white/50 text-sm hover:text-white/70 hover:bg-white/[0.08] transition-colors">
                <FilterX className="h-4 w-4" /> Clear Filters
              </button>
            )}
          </div>
        )}

        {/* Content */}
        {!loading && !error && filteredReports.length > 0 && (
          viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredReports.map((report, index) => (
                <PacheduCard key={report.id} report={report} index={index}
                  onView={(r) => { setSelectedReport(r); setIsDetailModalOpen(true); }}
                  onEdit={handleEdit}
                  onDelete={(id) => setDeleteConfirm(id)}
                  onStatusChange={handleStatusChange}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl bg-[rgba(5,15,28,0.65)] border border-white/[0.08] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.07]">
                      {['Date', 'Observer', 'Location', 'Activity', 'Section', 'Behaviour', 'Status', ''].map(h => (
                        <th key={h} className="px-4 py-2.5 text-left text-[10px] font-semibold text-white/40 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredReports.map((report, index) => (
                      <TableRowItem key={report.id} report={report} index={index}
                        onView={() => { setSelectedReport(report); setIsDetailModalOpen(true); }}
                        onEdit={() => handleEdit(report)}
                        onDelete={() => setDeleteConfirm(report.id)}
                        onStatusChange={handleStatusChange}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        )}

          </div>
          )}
        </div>

        {/* Form Modal */}
        <GlassModal
          isOpen={isFormModalOpen}
          onClose={() => setIsFormModalOpen(false)}
          title={editingReport ? 'Edit Care Observation' : 'New Care Observation'}
          icon={HeartHandshake}
          size="xl"
          footer={
            <>
              <button type="button" onClick={() => setIsFormModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white/60 text-sm hover:text-white/80 hover:bg-white/[0.08] transition-colors">
                Cancel
              </button>
              <button type="submit" form="pachedu-form" disabled={loading}
                className="flex items-center gap-2 px-6 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold min-w-[200px] justify-center transition-colors disabled:opacity-50">
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                <ShieldCheck className="h-4 w-4" />
                {editingReport ? 'Update' : 'Submit'} Care Observation
              </button>
            </>
          }
        >
          <form id="pachedu-form" onSubmit={handleSubmit} className="space-y-5">
            {/* Basic Info */}
            <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4">
              <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-4">Basic Information</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <GlassInput label="Location *" value={formData.location || ''} required
                  onChange={e => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Where did this occur?" />
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5">Date *</label>
                  <input type="date" value={formData.date || ''} required title="Observation date"
                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                    className="w-full h-9 px-3 rounded-xl bg-white/[0.07] border border-white/[0.12] text-white/80 text-sm [color-scheme:dark] outline-none focus:border-[#86BBD8]/50 transition-colors" />
                </div>
                <GlassSelect label="Section *"
                  value={formData.sectionChoice || 'Mechanical'}
                  onChange={e => setFormData({ ...formData, sectionChoice: e.target.value as SectionType })}
                  options={SECTIONS.map(s => ({ value: s, label: s }))} />
                <div className="md:col-span-3">
                  <GlassInput label="Activity Observed *" value={formData.activityObserved || ''} required
                    onChange={e => setFormData({ ...formData, activityObserved: e.target.value })}
                    placeholder="What activity was being performed?" />
                </div>
              </div>
            </div>

            {/* Observation Areas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl bg-white/[0.03] border border-l-4 border-amber-500/60 border-white/[0.06] p-4 space-y-3">
                <div>
                  <p className="text-xs font-bold text-white/60 uppercase tracking-wider">What did you see? *</p>
                  <p className="text-[10px] text-white/30">Waonei? / Uboneni?</p>
                </div>
                <GlassTextarea rows={5} value={formData.whatDidYouSee || ''} required
                  onChange={e => setFormData({ ...formData, whatDidYouSee: e.target.value })}
                  placeholder="Describe what you observed..." />
                <div>
                  <p className="text-[10px] font-bold text-white/50 uppercase tracking-wider mb-1">Reasons</p>
                  <p className="text-[10px] text-white/30 mb-1.5">Zvikonzero / Isizatho</p>
                  <GlassTextarea value={formData.reasons || ''}
                    onChange={e => setFormData({ ...formData, reasons: e.target.value })}
                    placeholder="Why do you think this happened?" />
                </div>
              </div>
              <div className="rounded-xl bg-white/[0.03] border border-l-4 border-emerald-500/60 border-white/[0.06] p-4 space-y-3">
                <div>
                  <p className="text-xs font-bold text-white/60 uppercase tracking-wider">What did you do to ensure you Care? *</p>
                  <p className="text-[10px] text-white/30">Waitei chinoratidza kuti unehanya neumwe wako?</p>
                </div>
                <GlassTextarea rows={9} value={formData.whatDidYouDo || ''} required
                  onChange={e => setFormData({ ...formData, whatDidYouDo: e.target.value })}
                  placeholder="Describe the actions you took..." />
              </div>
            </div>

            {/* Impacts & Behaviour */}
            <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <p className="text-xs font-bold text-amber-400/80 uppercase tracking-wider">Could this result in?</p>
                  <div className="grid grid-cols-2 gap-2">
                    {IMPACT_OPTIONS.map(impact => (
                      <label key={impact} className="flex items-start gap-2 cursor-pointer group">
                        <input type="checkbox" checked={formData.impacts?.includes(impact) || false}
                          onChange={() => handleImpactToggle(impact)}
                          className="mt-0.5 h-3.5 w-3.5 accent-[#86BBD8] cursor-pointer" />
                        <span className="text-xs text-white/60 leading-tight group-hover:text-white/80">{impact}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="rounded-lg bg-white/[0.03] p-3 space-y-3">
                    <p className="text-xs font-bold text-white/50 uppercase tracking-wider">Behaviour Classification</p>
                    <div className="flex gap-4">
                      {BEHAVIOUR_TYPES.map(type => (
                        <label key={type} className="flex items-center gap-2 cursor-pointer group">
                          <input type="checkbox" checked={formData.behaviourType === type}
                            onChange={() => setFormData({ ...formData, behaviourType: type })}
                            className="h-4 w-4 accent-[#86BBD8] cursor-pointer" />
                          <span className="text-sm text-white/70 group-hover:text-white">{type}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <GlassInput label="Observer Name" value={formData.observerName || ''}
                      onChange={e => setFormData({ ...formData, observerName: e.target.value })}
                      placeholder="Your name" />
                    <GlassInput label="Department" value={formData.dept || ''}
                      onChange={e => setFormData({ ...formData, dept: e.target.value })}
                      placeholder="Your department" />
                    <div className="col-span-2">
                      <GlassInput label="SDWT" value={formData.sdwt || ''}
                        onChange={e => setFormData({ ...formData, sdwt: e.target.value })}
                        placeholder="SDWT number" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Checklist */}
            <div className="rounded-xl border border-white/[0.06] overflow-hidden">
              <div className="px-4 py-3 bg-[#0d1e2e]/80 border-b border-white/[0.06]">
                <p className="text-xs font-semibold text-white/60 uppercase tracking-wider">Referral Checklist</p>
              </div>
              <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4 bg-white/[0.02]">
                {CHECKLIST_CATEGORIES.map(category => (
                  <div key={category.name} className="space-y-2">
                    <p className="text-[10px] font-bold text-amber-400/80 uppercase tracking-wider border-b border-amber-500/20 pb-1">
                      {category.name}
                    </p>
                    {category.items.map(item => (
                      <label key={item} className="flex items-start gap-2 cursor-pointer group">
                        <input type="checkbox" checked={formData.checklist?.includes(item) || false}
                          onChange={() => handleChecklistToggle(item)}
                          className="mt-0.5 h-3 w-3 accent-[#86BBD8] cursor-pointer shrink-0" />
                        <span className="text-[11px] text-white/60 leading-tight group-hover:text-white/80">{item}</span>
                      </label>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            <p className="text-xs font-bold italic text-center text-amber-400/70 pb-2">
              &quot;Tinokutendai nekuita kuti PPM ive inoshandika zvisina njodzi.&quot;
            </p>
          </form>
        </GlassModal>

        {/* Detail Modal */}
        <PacheduDetailModal
          report={selectedReport}
          open={isDetailModalOpen}
          onClose={() => { setIsDetailModalOpen(false); setSelectedReport(null); }}
          onEdit={(r) => { setIsDetailModalOpen(false); handleEdit(r); }}
          onDelete={(id) => { setIsDetailModalOpen(false); setDeleteConfirm(id); }}
          onStatusChange={handleStatusChange}
        />

        {/* Delete Confirm */}
        {deleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)} />
            <div className="relative w-full max-w-sm rounded-2xl bg-[rgba(5,15,28,0.97)] border border-white/[0.12] shadow-2xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <AlertTriangle className="h-5 w-5 text-red-400" />
                <h3 className="text-base font-semibold text-white/90">Confirm Deletion</h3>
              </div>
              <p className="text-sm text-white/50 mb-5">
                Are you sure you want to delete this care observation? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setDeleteConfirm(null)}
                  className="px-4 py-2 rounded-xl bg-white/[0.05] border border-white/[0.08] text-white/60 text-sm hover:text-white/80 transition-colors">
                  Cancel
                </button>
                <button type="button" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
                  className="px-4 py-2 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 text-sm font-semibold hover:bg-red-500/30 transition-colors">
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </PageShell>
  );
}
