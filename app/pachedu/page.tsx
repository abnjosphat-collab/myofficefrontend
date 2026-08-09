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
} from "@/components/shared/theme";
import { AppShell } from '@/components/app-shell';
import { RequireAuth } from '@/components/shared/RequireAuth';
import { fmtDate as formatDate, fmtDateTime as formatDateTime } from '@/components/shared/utils';
import { EmployeeNameInput } from '@/components/shared/EmployeeNameInput';
import { PredictiveInput } from '@/components/shared/PredictiveInput';
import { DownloadButton, type DLColumn } from '@/components/shared/DownloadButton';
import { exportFilename } from '@/lib/exportUtils';
import {
  useTheme, StatusBadge, ProgressBar, StatTile, FormField, CenterModal,
  PrimaryButton, EmptyState, useCollapseSection, GlowCard, SelectField,
} from '@/components/shared/theme';
import { toast } from "sonner";
import type { SectionType, BehaviourType, PacheduStatus, PacheduReport, PacheduStats } from './types';
import { usePacheduData, createPacheduReport, updatePacheduReport, deletePacheduReport, getPacheduStats } from './usePacheduData';

// =============== CONSTANTS ===============
const SECTIONS: SectionType[] = ['Mechanical', 'Electrical'];
const BEHAVIOUR_TYPES: BehaviourType[] = ['Intentional', 'Unintentional'];

const SECTION_ICONS: Record<SectionType, React.ElementType> = { Mechanical: Wrench, Electrical: Zap };
const SECTION_META: Record<SectionType, { hex: string; barClass: string }> = {
  Mechanical: { hex: '#60a5fa', barClass: 'bg-brand-500' },
  Electrical: { hex: '#f59e0b', barClass: 'bg-amber-500' },
};
const BEHAVIOUR_META: Record<BehaviourType, { hex: string; icon: React.ElementType }> = {
  Intentional: { hex: '#f59e0b', icon: Flag },
  Unintentional: { hex: '#60a5fa', icon: AlertCircle },
};
const STATUS_META: Record<PacheduStatus, { hex: string; label: string }> = {
  draft: { hex: '#94a3b8', label: 'Draft' },
  submitted: { hex: '#60a5fa', label: 'Submitted' },
  reviewed: { hex: '#a78bfa', label: 'Reviewed' },
  closed: { hex: '#34d399', label: 'Closed' },
};

const IMPACT_OPTIONS = [
  "Minor injury", "Serious injury", "Fatality",
  "Damage To Property/RTA", "Increased Cost", "Loss of Production",
  "Environmental Impact", "Health threat",
];

const CHECKLIST_CATEGORIES = [
  { name: "PERSONAL BEHAVIOUR", items: ["Competence", "Operating speed", "Operating authority", "Explosives handling", "Personal positioning", "Checklist completion", "Condoning unsafe behaviour", "Communication/Horseplay", "Working on unsafe equipment"] },
  { name: "TOOLS & EQUIPMENT", items: ["Machine condition", "Water blast/blowpipe", "Lockout system", "Service pipes", "Pinch bar/gaskets", "Gas testers", "Ladders/Platforms", "Safety chains", "Warning signs"] },
  { name: "WORKING CONDITIONS", items: ["General housekeeping", "Illumination", "Ventilation/Dust", "Ground support", "Pools of water", "Air/Water leaks", "Oil leaks", "Noxious atmosphere", "Confined space", "Fire hazards", "Noise"] },
  { name: "HUMAN NATURE & TASK", items: ["Stress", "Shortcuts", "Attitude/Mindset", "Complacency", "Unclear responsibilities", "High workload", "Time pressure", "Multi-tasking", "Illness/Fatigue", "Inexperienced"] },
];

// =============== STATUS MENU (shared dropdown) ===============
function StatusMenu({ onChange }: { onChange: (s: PacheduStatus) => void }) {
  const t = useTheme();
  return (
    <div className={`border-t ${t.border}`}>
      {(['draft', 'submitted', 'reviewed', 'closed'] as PacheduStatus[]).map(s => (
        <button key={s} type="button" onClick={() => onChange(s)}
          className={`w-full flex items-center gap-2 px-3 py-2 text-xs ${t.textMuted} ${t.hoverBg} ${t.hoverText} transition-colors`}>
          {STATUS_META[s].label}
        </button>
      ))}
    </div>
  );
}

// =============== TABLE ROW ===============
interface TableRowItemProps {
  report: PacheduReport; index: number; onView: () => void; onEdit: () => void; onDelete: () => void; onStatusChange: (id: string, status: PacheduStatus) => void;
}

const TableRowItem: React.FC<TableRowItemProps> = ({ report, onView, onEdit, onDelete, onStatusChange }) => {
  const t = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const SectionIcon = SECTION_ICONS[report.sectionChoice];

  return (
    <tr className={`border-b ${t.border} ${t.hoverBg} transition-colors`}>
      <td className={`px-4 py-3 text-xs ${t.textMuted}`}>{formatDate(report.date)}</td>
      <td className={`px-4 py-3 text-xs font-medium ${t.textPrimary}`}>{report.observerName || 'Anonymous'}</td>
      <td className={`px-4 py-3 text-xs ${t.textMuted}`}>{report.location}</td>
      <td className={`px-4 py-3 text-xs ${t.textMuted} max-w-[180px] truncate`}>{report.activityObserved}</td>
      <td className="px-4 py-3"><StatusBadge color={SECTION_META[report.sectionChoice].hex} label={report.sectionChoice} /></td>
      <td className="px-4 py-3"><StatusBadge color={BEHAVIOUR_META[report.behaviourType].hex} label={report.behaviourType} /></td>
      <td className="px-4 py-3"><StatusBadge color={STATUS_META[report.status].hex} label={STATUS_META[report.status].label} /></td>
      <td className="px-4 py-3 text-right">
        <div className="relative inline-block" onClick={(e) => e.stopPropagation()}>
          <button type="button" title="More options" onClick={() => setMenuOpen(v => !v)} className={`p-1.5 rounded-lg ${t.textFaint} ${t.hoverText} ${t.hoverBg} transition-colors`}>
            <MoreVertical className="h-4 w-4" />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className={`absolute right-0 top-8 z-20 w-44 rounded-xl ${t.glass} ${t.shadow} overflow-hidden`}>
                <button type="button" onClick={() => { setMenuOpen(false); onView(); }} className={`w-full flex items-center gap-2 px-3 py-2 text-xs ${t.textMuted} ${t.hoverBg} ${t.hoverText}`}><Eye className="h-3.5 w-3.5" /> View</button>
                <button type="button" onClick={() => { setMenuOpen(false); onEdit(); }} className={`w-full flex items-center gap-2 px-3 py-2 text-xs ${t.textMuted} ${t.hoverBg} ${t.hoverText}`}><Pencil className="h-3.5 w-3.5" /> Edit</button>
                <StatusMenu onChange={s => { setMenuOpen(false); onStatusChange(report.id, s); }} />
                <div className={`border-t ${t.border}`}>
                  <button type="button" onClick={() => { setMenuOpen(false); onDelete(); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-500 hover:bg-rose-500/10">
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
  report: PacheduReport; index: number; onView: (report: PacheduReport) => void; onEdit: (report: PacheduReport) => void;
  onDelete: (id: string) => void; onStatusChange?: (id: string, status: PacheduStatus) => void;
}

const PacheduCard: React.FC<PacheduCardProps> = ({ report, index, onView, onEdit, onDelete, onStatusChange }) => {
  const t = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const SectionIcon = SECTION_ICONS[report.sectionChoice];
  const behaviourMeta = BEHAVIOUR_META[report.behaviourType];
  const BehaviourIcon = behaviourMeta.icon;
  const hasRisks = report.impacts?.includes("Serious injury") || report.impacts?.includes("Fatality") || report.impacts?.includes("Environmental Impact");

  return (
    // Risk severity is carried entirely by GlowCard's `color` (the hover glow
    // tint) and the "High Risk" StatusBadge below — no edge/border accent, so
    // this card matches the exact shape of every other card in the app (the
    // homepage module tiles included).
    <GlowCard
      onClick={() => onView(report)}
      color={hasRisks ? '#f43f5e' : '#f59e0b'}
      surface={`${t.glass} rounded-2xl`}
      className="group relative overflow-hidden"
    >
      <div className={`p-4 border-b ${t.border}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <HeartHandshake className="h-5 w-5 shrink-0" style={{ color: hasRisks ? '#f43f5e' : '#f59e0b' }} />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5 mb-1">
                <StatusBadge color={SECTION_META[report.sectionChoice].hex} label={report.sectionChoice} />
                <StatusBadge color={behaviourMeta.hex} label={report.behaviourType} />
                {hasRisks && <StatusBadge color="#f43f5e" label="High Risk" />}
              </div>
              <p className={`text-[10px] ${t.textFaint}`}>Care #{index + 1}</p>
              <h3 className={`font-semibold text-sm truncate mt-0.5 ${t.textPrimary}`}>{report.observerName || 'Anonymous'}</h3>
            </div>
          </div>
          <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
            <button type="button" title="More options" onClick={() => setMenuOpen(v => !v)} className={`p-1.5 rounded-lg ${t.textFaint} ${t.hoverText} ${t.hoverBg} transition-colors`}>
              <MoreVertical className="h-4 w-4" />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className={`absolute right-0 top-8 z-20 w-48 rounded-xl ${t.glass} ${t.shadow} overflow-hidden`}>
                  <div className={`px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider border-b ${t.border} ${t.textFaint}`}>Actions</div>
                  <button type="button" onClick={() => { setMenuOpen(false); onView(report); }} className={`w-full flex items-center gap-2 px-3 py-2 text-xs ${t.textMuted} ${t.hoverBg} ${t.hoverText}`}><Eye className="h-3.5 w-3.5" /> View Details</button>
                  <button type="button" onClick={() => { setMenuOpen(false); onEdit(report); }} className={`w-full flex items-center gap-2 px-3 py-2 text-xs ${t.textMuted} ${t.hoverBg} ${t.hoverText}`}><Pencil className="h-3.5 w-3.5" /> Edit</button>
                  <div className={`border-t ${t.border} px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider ${t.textFaint}`}>Change Status</div>
                  <StatusMenu onChange={s => { setMenuOpen(false); onStatusChange?.(report.id, s); }} />
                  <div className={`border-t ${t.border}`}>
                    <button type="button" onClick={() => { setMenuOpen(false); onDelete(report.id); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-500 hover:bg-rose-500/10">
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className={`grid grid-cols-3 border-b ${t.border}`}>
        <div className={`py-2 text-center border-r ${t.border}`}>
          <p className={`text-base font-bold ${t.textPrimary}`}>{report.impacts?.length || 0}</p>
          <p className={`text-[10px] ${t.textFaint}`}>Impacts</p>
        </div>
        <div className={`py-2 text-center border-r ${t.border}`}>
          <p className={`text-base font-bold ${t.textPrimary}`}>{report.checklist?.length || 0}</p>
          <p className={`text-[10px] ${t.textFaint}`}>Checklist</p>
        </div>
        <div className="py-2 flex items-center justify-center"><StatusBadge color={STATUS_META[report.status].hex} label={STATUS_META[report.status].label} /></div>
      </div>

      <div className="p-4 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div className={`flex items-center gap-1.5 text-xs ${t.textMuted} ${t.chipBg} rounded-lg px-2 py-1.5`}>
            <MapPin className={`h-3 w-3 shrink-0 ${t.textFaint}`} /><span className="truncate">{report.location || 'N/A'}</span>
          </div>
          <div className={`flex items-center gap-1.5 text-xs ${t.textMuted} ${t.chipBg} rounded-lg px-2 py-1.5`}>
            <Calendar className={`h-3 w-3 shrink-0 ${t.textFaint}`} /><span>{formatDate(report.date)}</span>
          </div>
        </div>
        <div className={`${t.chipBg} rounded-lg px-3 py-2`}>
          <p className={`text-[10px] mb-0.5 ${t.textFaint}`}>Activity Observed</p>
          <p className={`text-xs line-clamp-2 ${t.textMuted}`}>{report.activityObserved || 'N/A'}</p>
        </div>
        {report.dept && <StatusBadge color="#94a3b8" label={`Dept: ${report.dept}`} />}
      </div>
    </GlowCard>
  );
};

// =============== DETAIL MODAL ===============
interface PacheduDetailModalProps {
  report: PacheduReport | null; open: boolean; onClose: () => void; onEdit: (report: PacheduReport) => void;
  onDelete: (id: string) => void; onStatusChange?: (id: string, status: PacheduStatus) => void;
}

const PacheduDetailModal: React.FC<PacheduDetailModalProps> = ({ report, open, onClose, onEdit, onDelete, onStatusChange }) => {
  const t = useTheme();
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  if (!report) return null;

  const SectionIcon = SECTION_ICONS[report.sectionChoice];
  const behaviourMeta = BEHAVIOUR_META[report.behaviourType];
  const BehaviourIcon = behaviourMeta.icon;

  return (
    <CenterModal open={open} onClose={onClose} title="Pachedu: Be Your Brother's Keeper" width="max-w-2xl">
      <div className="px-5 py-4 space-y-5 max-h-[68vh] overflow-y-auto">
        <div className={`flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl ${t.chipBg} border ${t.border}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${t.chipBg}`}><SectionIcon className="h-5 w-5" style={{ color: SECTION_META[report.sectionChoice].hex }} /></div>
            <div><p className={`text-sm font-medium ${t.textMuted}`}>{report.sectionChoice}</p><p className={`text-[10px] ${t.textFaint}`}>Section</p></div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge color={behaviourMeta.hex} label={report.behaviourType} />
            <StatusBadge color={STATUS_META[report.status].hex} label={STATUS_META[report.status].label} />
            <span className={`text-[10px] px-2 py-1 rounded ${t.chipBg} font-mono ${t.textFaint}`}>ID: {report.id.slice(0, 8)}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[{ label: 'Location', value: report.location || 'N/A' }, { label: 'Date', value: formatDate(report.date) }, { label: 'Observer', value: report.observerName || 'Anonymous' }, { label: 'Department', value: report.dept || 'N/A' }].map(item => (
            <div key={item.label} className={`${t.chipBg} rounded-xl p-3`}>
              <p className={`text-[10px] mb-0.5 ${t.textFaint}`}>{item.label}</p>
              <p className={`text-sm font-medium ${t.textMuted}`}>{item.value}</p>
            </div>
          ))}
        </div>

        <div className={`rounded-xl ${t.chipBg} border ${t.border} p-4`}>
          <p className={`text-xs font-semibold uppercase tracking-wider mb-2 ${t.textFaint}`}>Activity Observed</p>
          <p className={`text-sm ${t.textMuted}`}>{report.activityObserved || 'N/A'}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className={`rounded-xl ${t.chipBg} border ${t.border} p-4`}>
            <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${t.textFaint}`}>What did you see?</p>
            <p className={`text-[10px] mb-2 ${t.textFaint}`}>Waonei? / Uboneni?</p>
            <p className={`text-sm whitespace-pre-wrap ${t.textMuted}`}>{report.whatDidYouSee || 'N/A'}</p>
          </div>
          <div className={`rounded-xl ${t.chipBg} border ${t.border} p-4`}>
            <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${t.textFaint}`}>Reasons</p>
            <p className={`text-[10px] mb-2 ${t.textFaint}`}>Zvikonzero / Isizatho</p>
            <p className={`text-sm whitespace-pre-wrap ${t.textMuted}`}>{report.reasons || 'N/A'}</p>
          </div>
        </div>

        <div className={`rounded-xl ${t.chipBg} border-l-4 border-emerald-500/60 p-4`}>
          <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${t.textFaint}`}>What did you do to ensure you Care?</p>
          <p className={`text-[10px] mb-2 ${t.textFaint}`}>Waitei chinoratidza kuti unehanya neumwe wako?</p>
          <p className={`text-sm whitespace-pre-wrap ${t.textMuted}`}>{report.whatDidYouDo || 'N/A'}</p>
        </div>

        {report.impacts && report.impacts.length > 0 && (
          <div className={`rounded-xl ${t.chipBg} border ${t.border} p-4`}>
            <p className={`text-xs font-semibold uppercase tracking-wider mb-3 ${t.textFaint}`}>Potential Impacts</p>
            <div className="flex flex-wrap gap-2">
              {report.impacts.map((impact, idx) => (
                <StatusBadge key={idx} color={impact.includes("Serious") || impact.includes("Fatality") ? '#f43f5e' : '#f59e0b'} label={impact} />
              ))}
            </div>
          </div>
        )}

        {report.checklist && report.checklist.length > 0 && (
          <div className={`rounded-xl ${t.chipBg} border ${t.border} p-4`}>
            <p className={`text-xs font-semibold uppercase tracking-wider mb-3 ${t.textFaint}`}>Referral Checklist</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {report.checklist.map((item, idx) => (
                <div key={idx} className={`flex items-center gap-2 text-xs ${t.textMuted} ${t.chipBg} rounded-lg px-3 py-1.5`}>
                  <CheckCircle className="h-3 w-3 text-emerald-500 shrink-0" />{item}
                </div>
              ))}
            </div>
          </div>
        )}

        <p className={`text-[10px] text-center ${t.textFaint}`}>Created {formatDateTime(report.created_at)}</p>
      </div>

      <div className={`px-5 py-4 border-t ${t.border} flex flex-wrap items-center gap-2`}>
        <div className="relative mr-auto">
          <button type="button" onClick={() => setStatusMenuOpen(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${t.chipBg} ${t.textMuted} text-xs ${t.hoverBg} ${t.hoverText} transition-colors`}>
            Status <ChevronDown className="h-3.5 w-3.5" />
          </button>
          {statusMenuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setStatusMenuOpen(false)} />
              <div className={`absolute bottom-9 left-0 z-20 w-40 rounded-xl ${t.glass} ${t.shadow} overflow-hidden`}>
                <StatusMenu onChange={s => { setStatusMenuOpen(false); onStatusChange?.(report.id, s); }} />
              </div>
            </>
          )}
        </div>
        <PrimaryButton icon={Pencil} accent="violet" size="md" onClick={() => { onClose(); onEdit(report); }}>Edit</PrimaryButton>
        <button type="button" onClick={() => { onClose(); onDelete(report.id); }}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-500/10 text-rose-500 text-sm hover:bg-rose-500/20 transition-colors">
          <Trash2 className="h-3.5 w-3.5" /> Delete
        </button>
      </div>
    </CenterModal>
  );
};

// =============== MAIN PAGE ===============
const defaultForm: Partial<PacheduReport> = {
  location: "", date: new Date().toISOString().split('T')[0],
  activityObserved: "", whatDidYouSee: "", reasons: "",
  behaviourType: "Unintentional", impacts: [], whatDidYouDo: "",
  observerName: "", dept: "Engineering", sdwt: "", sectionChoice: "Mechanical",
  checklist: [], status: "draft",
};

function PacheduContent() {
  const t = useTheme();
  const sections = useCollapseSection({ stats: false, distribution: false, records: true });

  const { reports, setReports, stats, setStats, loading, setLoading, error, refresh: loadData } = usePacheduData();
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

  const handleImpactToggle = (impact: string) => setFormData(prev => ({ ...prev, impacts: prev.impacts?.includes(impact) ? prev.impacts.filter(i => i !== impact) : [...(prev.impacts || []), impact] }));
  const handleChecklistToggle = (item: string) => setFormData(prev => ({ ...prev, checklist: prev.checklist?.includes(item) ? prev.checklist.filter(i => i !== item) : [...(prev.checklist || []), item] }));

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
        if (saved) { setReports(prev => prev.map(r => r.id === saved!.id ? saved! : r)); toast.success('Pachedu observation updated successfully'); }
      } else {
        saved = await createPacheduReport({ ...formData, status: 'submitted', submitted_at: new Date().toISOString() });
        if (saved) { setReports(prev => [saved!, ...prev]); toast.success('Pachedu observation saved. Thank you for making PPM a safe place to work!'); }
      }
      if (saved) setStats(await getPacheduStats());
      setFormData(defaultForm);
      setIsFormModalOpen(false);
      setEditingReport(null);
    } catch { toast.error('Failed to save observation'); }
    finally { setLoading(false); }
  };

  const handleStatusChange = async (id: string, newStatus: PacheduStatus) => {
    const report = reports.find(r => r.id === id);
    if (!report) return;
    setReports(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));
    try {
      const saved = await updatePacheduReport(id, { status: newStatus });
      if (!saved) { setReports(prev => prev.map(r => r.id === id ? report : r)); toast.error('Failed to update status'); }
      else { toast.success(`Status updated to ${newStatus}`); setStats(await getPacheduStats()); }
    } catch { setReports(prev => prev.map(r => r.id === id ? report : r)); toast.error('Failed to update status'); }
  };

  const handleEdit = (report: PacheduReport) => {
    setEditingReport(report);
    setFormData({
      location: report.location, date: report.date, activityObserved: report.activityObserved, whatDidYouSee: report.whatDidYouSee,
      reasons: report.reasons, behaviourType: report.behaviourType, impacts: report.impacts, whatDidYouDo: report.whatDidYouDo,
      observerName: report.observerName, dept: report.dept, sdwt: report.sdwt, sectionChoice: report.sectionChoice,
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
    } catch { toast.error('Failed to delete observation'); }
  };

  const filteredReports = useMemo(() => reports.filter(report => {
    if (searchTerm) {
      const sl = searchTerm.toLowerCase();
      const match = report.observerName?.toLowerCase().includes(sl) || report.location?.toLowerCase().includes(sl) || report.activityObserved?.toLowerCase().includes(sl) || report.whatDidYouSee?.toLowerCase().includes(sl) || report.dept?.toLowerCase().includes(sl);
      if (!match) return false;
    }
    if (selectedSection !== 'all' && report.sectionChoice !== selectedSection) return false;
    if (selectedDept !== 'all' && report.dept !== selectedDept) return false;
    if (selectedStatus !== 'all' && report.status !== selectedStatus) return false;
    if (dateFrom && new Date(report.date) < new Date(dateFrom)) return false;
    if (dateTo && new Date(report.date) > new Date(dateTo)) return false;
    return true;
  }), [reports, searchTerm, selectedSection, selectedDept, selectedStatus, dateFrom, dateTo]);

  const clearFilters = () => { setSearchTerm(''); setSelectedSection('all'); setSelectedDept('all'); setSelectedStatus('all'); setDateFrom(''); setDateTo(''); };
  const uniqueDepts = useMemo(() => stats ? Object.keys(stats.byDept) : [], [stats]);
  const hasActiveFilters = searchTerm || selectedSection !== 'all' || selectedDept !== 'all' || selectedStatus !== 'all' || dateFrom || dateTo;

  const openNewForm = () => { setEditingReport(null); setFormData(defaultForm); setIsFormModalOpen(true); };
  const selectCls = `h-9 px-3 rounded-lg text-xs outline-none transition-colors ${t.inputBg}`;
  const inputCls = `w-full h-9 px-3 rounded-lg text-sm outline-none transition-colors ${t.inputBg}`;

  const exportColumns: DLColumn[] = [
    { key: 'date', label: 'Date', width: 14, format: v => v ? formatDate(v as string) : '' },
    { key: 'observerName', label: 'Observer', width: 18, format: v => (v as string) || 'Anonymous' },
    { key: 'location', label: 'Location', width: 18 },
    { key: 'activityObserved', label: 'Activity Observed', width: 26 },
    { key: 'sectionChoice', label: 'Section', width: 14 },
    { key: 'behaviourType', label: 'Behaviour', width: 14 },
    { key: 'status', label: 'Status', width: 14, format: v => STATUS_META[v as PacheduStatus].label },
    { key: 'dept', label: 'Department', width: 16 },
    { key: 'whatDidYouSee', label: 'What Did You See', width: 30 },
    { key: 'whatDidYouDo', label: 'What Did You Do', width: 30 },
  ];

  return (
    <main className="max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <nav className={`flex items-center gap-1.5 text-xs mb-2 ${t.textFaint}`}>
            <span>Home</span><ChevronRight className="h-3 w-3" /><span className="text-[#86BBD8] font-medium">Pachedu</span>
          </nav>
          <h1 className={`text-2xl font-bold font-heading tracking-tight flex items-center gap-2 ${t.textPrimary}`}>
            <HeartHandshake className="h-6 w-6 text-amber-500" /> Pachedu — Care Observations
          </h1>
          <p className={`text-sm mt-1 ${t.textFaint}`}>Be Your Brother&apos;s Keeper — track care observations and supportive actions.</p>
        </div>
        <div className="flex items-center gap-2 self-start">
          <button type="button" title="Grid View" onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-amber-500/15 text-amber-500' : `${t.textFaint} ${t.hoverText} ${t.hoverBg}`}`}>
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button type="button" title="Table View" onClick={() => setViewMode('table')}
            className={`p-2 rounded-lg transition-colors ${viewMode === 'table' ? 'bg-amber-500/15 text-amber-500' : `${t.textFaint} ${t.hoverText} ${t.hoverBg}`}`}>
            <TableIcon className="h-4 w-4" />
          </button>
          {filteredReports.length > 0 && (
            <DownloadButton
              data={filteredReports as unknown as Record<string, unknown>[]}
              columns={exportColumns}
              filename={exportFilename('Pachedu_Care_Observations')}
              title="Pachedu — Care Observations"
              statusColumn="sectionChoice"
              statusColor={(_v, row) => SECTION_META[row.sectionChoice as SectionType]?.hex.replace('#', '')}
            />
          )}
          <PrimaryButton icon={Plus} accent="amber" onClick={openNewForm}>New Care Observation</PrimaryButton>
        </div>
      </div>

      {stats && (
        <div className={`rounded-2xl ${t.glass} overflow-hidden`}>
          <button type="button" onClick={() => sections.toggle('stats')} className={`w-full flex items-center justify-between px-5 py-3 ${t.hoverBg} transition-all`}>
            <div className="flex items-center gap-2">
              <HeartHandshake className="h-3.5 w-3.5 text-amber-500" />
              <span className={`text-xs font-semibold uppercase tracking-wider ${t.textMuted}`}>Overview</span>
              <span className={`text-xs ${t.textFaint}`}>{stats.total} observations total</span>
            </div>
            {sections.expanded.stats ? <ChevronUp className={`h-3.5 w-3.5 ${t.textFaint}`} /> : <ChevronDown className={`h-3.5 w-3.5 ${t.textFaint}`} />}
          </button>
          {sections.expanded.stats && (
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 px-5 pb-5">
              <StatTile icon={HeartHandshake} color="#f59e0b" label="Total Care" value={stats.total} />
              <StatTile icon={FileText} color="#94a3b8" label="Draft" value={stats.draftCount} />
              <StatTile icon={Send} color="#60a5fa" label="Submitted" value={stats.submittedCount} />
              <StatTile icon={CheckCircle} color="#a78bfa" label="Reviewed" value={stats.reviewedCount} />
              <StatTile icon={CheckSquare} color="#34d399" label="Closed" value={stats.closedCount} />
              <StatTile icon={AlertTriangle} color="#f97316" label="Intentional" value={stats.byBehaviour['Intentional']} />
            </div>
          )}
        </div>
      )}

      {stats && stats.total > 0 && (
        <div className={`rounded-2xl ${t.glass} overflow-hidden`}>
          <button type="button" onClick={() => sections.toggle('distribution')} className={`w-full flex items-center justify-between px-5 py-3 ${t.hoverBg} transition-all`}>
            <span className={`text-xs font-semibold uppercase tracking-wider ${t.textMuted}`}>Distribution by Section</span>
            {sections.expanded.distribution ? <ChevronUp className={`h-3.5 w-3.5 ${t.textFaint}`} /> : <ChevronDown className={`h-3.5 w-3.5 ${t.textFaint}`} />}
          </button>
          {sections.expanded.distribution && (
            <div className="flex gap-6 px-5 pb-5">
              {SECTIONS.map(section => {
                const Icon = SECTION_ICONS[section];
                const meta = SECTION_META[section];
                const count = stats.bySection[section] || 0;
                const pct = stats.total ? Math.round((count / stats.total) * 100) : 0;
                return (
                  <div key={section} className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2"><Icon className="h-4 w-4" style={{ color: meta.hex }} /><span className={`text-sm font-medium ${t.textMuted}`}>{section}</span></div>
                      <span className={`text-xs ${t.textFaint}`}>{count} ({pct}%)</span>
                    </div>
                    <ProgressBar value={pct} color={meta.hex} showValue={false} />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div className={`rounded-2xl ${t.glass} p-5`}>
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none ${t.textFaint}`} />
            <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search by observer, location, activity..."
              className={`w-full pl-9 pr-9 h-9 rounded-lg text-sm outline-none transition-colors ${t.inputBg}`} />
            {searchTerm && (
              <button type="button" title="Clear search" onClick={() => setSearchTerm('')} className={`absolute right-3 top-1/2 -translate-y-1/2 ${t.textFaint} ${t.hoverText}`}>
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <SelectField size="filter" value={selectedSection} title="Filter by section" onChange={setSelectedSection} className="lg:w-[150px]"
            options={[{ value: 'all', label: 'All Sections' }, ...SECTIONS.map(s => ({ value: s, label: s }))]} />
          <SelectField size="filter" value={selectedDept} title="Filter by department" onChange={setSelectedDept} className="lg:w-[180px]"
            options={[{ value: 'all', label: 'All Departments' }, ...uniqueDepts.map(d => ({ value: d, label: d }))]} />
          <SelectField size="filter" value={selectedStatus} title="Filter by status" onChange={setSelectedStatus} className="lg:w-[140px]"
            options={[{ value: 'all', label: 'All Status' }, { value: 'draft', label: 'Draft' }, { value: 'submitted', label: 'Submitted' }, { value: 'reviewed', label: 'Reviewed' }, { value: 'closed', label: 'Closed' }]} />
          <input type="date" value={dateFrom} title="Start date" onChange={(e) => setDateFrom(e.target.value)} className={selectCls} />
          <input type="date" value={dateTo} title="End date" onChange={(e) => setDateTo(e.target.value)} className={selectCls} />
          {hasActiveFilters && (
            <button type="button" onClick={clearFilters} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg ${t.textFaint} ${t.hoverText} ${t.hoverBg} text-sm transition-colors`}>
              <FilterX className="h-4 w-4" /> Clear
            </button>
          )}
        </div>
        <p className={`mt-3 text-xs ${t.textFaint}`}>Showing {filteredReports.length} of {reports.length} observations</p>
      </div>

      <div className={`rounded-2xl ${t.glass} overflow-hidden`}>
        <button type="button" onClick={() => sections.toggle('records')} className={`w-full flex items-center justify-between px-5 py-3 ${t.hoverBg} transition-all`}>
          <div className="flex items-center gap-2">
            <FileText className="h-3.5 w-3.5 text-[#86BBD8]" />
            <span className={`text-xs font-semibold uppercase tracking-wider ${t.textMuted}`}>Records</span>
            <span className={`text-xs ${t.textFaint}`}>{filteredReports.length} of {reports.length} observations</span>
          </div>
          {sections.expanded.records ? <ChevronUp className={`h-3.5 w-3.5 ${t.textFaint}`} /> : <ChevronDown className={`h-3.5 w-3.5 ${t.textFaint}`} />}
        </button>
        {sections.expanded.records && (
          <div className="px-5 pb-5 pt-1">
            {loading && <div className="flex justify-center items-center py-16"><Loader2 className="h-8 w-8 animate-spin text-amber-500" /></div>}

            {error && !loading && (
              <div className="rounded-2xl bg-rose-500/10 border border-rose-500/20 p-5 flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-rose-500 shrink-0" />
                <div className="flex-1"><p className="text-sm font-medium text-rose-500">Error Loading Data</p><p className="text-xs text-rose-500/70 mt-0.5">{error}</p></div>
                <button type="button" onClick={loadData} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-500 text-xs hover:bg-rose-500/20 transition-colors">
                  <RefreshCw className="h-3.5 w-3.5" /> Retry
                </button>
              </div>
            )}

            {!loading && !error && filteredReports.length === 0 && (
              <EmptyState icon={HeartHandshake} title="No care observations found"
                message={reports.length === 0 ? "Be the first to record a Pachedu observation." : "Try adjusting your filters to see more results."}
                action={{ label: reports.length === 0 ? 'Create First Observation' : 'Clear Filters', onClick: reports.length === 0 ? openNewForm : clearFilters }} />
            )}

            {!loading && !error && filteredReports.length > 0 && (
              viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filteredReports.map((report, index) => (
                    <PacheduCard key={report.id} report={report} index={index}
                      onView={(r) => { setSelectedReport(r); setIsDetailModalOpen(true); }}
                      onEdit={handleEdit} onDelete={(id) => setDeleteConfirm(id)} onStatusChange={handleStatusChange} />
                  ))}
                </div>
              ) : (
                <div className={`rounded-2xl ${t.glass} overflow-hidden`}>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead><tr className={`border-b ${t.border}`}>
                        {['Date', 'Observer', 'Location', 'Activity', 'Section', 'Behaviour', 'Status', ''].map(h => (
                          <th key={h} className={`px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider ${t.textFaint}`}>{h}</th>
                        ))}
                      </tr></thead>
                      <tbody>
                        {filteredReports.map((report, index) => (
                          <TableRowItem key={report.id} report={report} index={index}
                            onView={() => { setSelectedReport(report); setIsDetailModalOpen(true); }}
                            onEdit={() => handleEdit(report)} onDelete={() => setDeleteConfirm(report.id)} onStatusChange={handleStatusChange} />
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

      <CenterModal open={isFormModalOpen} onClose={() => setIsFormModalOpen(false)} title={editingReport ? 'Edit Care Observation' : 'New Care Observation'} width="max-w-3xl">
        <form id="pachedu-form" onSubmit={handleSubmit}>
          <div className="px-5 py-4 space-y-5 max-h-[65vh] overflow-y-auto">
            <div className={`rounded-xl ${t.chipBg} border ${t.border} p-4`}>
              <p className={`text-xs font-semibold uppercase tracking-wider mb-4 ${t.textFaint}`}>Basic Information</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField label="Location" required>
                  <input value={formData.location || ''} onChange={e => setFormData({ ...formData, location: e.target.value })} placeholder="Where did this occur?" className={inputCls} />
                </FormField>
                <FormField label="Date" required>
                  <input type="date" value={formData.date || ''} title="Observation date" onChange={e => setFormData({ ...formData, date: e.target.value })} className={inputCls} />
                </FormField>
                <FormField label="Section" required>
                  <SelectField size="form" value={formData.sectionChoice || 'Mechanical'} title="Section" onChange={v => setFormData({ ...formData, sectionChoice: v as SectionType })}
                    options={SECTIONS.map(s => ({ value: s, label: s }))} />
                </FormField>
                <div className="md:col-span-3">
                  <FormField label="Activity Observed" required>
                    <input value={formData.activityObserved || ''} onChange={e => setFormData({ ...formData, activityObserved: e.target.value })} placeholder="What activity was being performed?" className={inputCls} />
                  </FormField>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={`rounded-xl ${t.chipBg} border-l-4 border-amber-500/60 p-4 space-y-3`}>
                <div>
                  <p className={`text-xs font-bold uppercase tracking-wider ${t.textMuted}`}>What did you see? *</p>
                  <p className={`text-[10px] ${t.textFaint}`}>Waonei? / Uboneni?</p>
                </div>
                <textarea rows={5} value={formData.whatDidYouSee || ''} onChange={e => setFormData({ ...formData, whatDidYouSee: e.target.value })}
                  placeholder="Describe what you observed..." className={`w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors resize-none ${t.inputBg}`} />
                <div>
                  <p className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${t.textFaint}`}>Reasons</p>
                  <p className={`text-[10px] mb-1.5 ${t.textFaint}`}>Zvikonzero / Isizatho</p>
                  <textarea value={formData.reasons || ''} onChange={e => setFormData({ ...formData, reasons: e.target.value })}
                    placeholder="Why do you think this happened?" className={`w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors resize-none ${t.inputBg}`} />
                </div>
              </div>
              <div className={`rounded-xl ${t.chipBg} border-l-4 border-emerald-500/60 p-4 space-y-3`}>
                <div>
                  <p className={`text-xs font-bold uppercase tracking-wider ${t.textMuted}`}>What did you do to ensure you Care? *</p>
                  <p className={`text-[10px] ${t.textFaint}`}>Waitei chinoratidza kuti unehanya neumwe wako?</p>
                </div>
                <textarea rows={9} value={formData.whatDidYouDo || ''} onChange={e => setFormData({ ...formData, whatDidYouDo: e.target.value })}
                  placeholder="Describe the actions you took..." className={`w-full px-3 py-2 rounded-lg text-sm outline-none transition-colors resize-none ${t.inputBg}`} />
              </div>
            </div>

            <div className={`rounded-xl ${t.chipBg} border ${t.border} p-4`}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <p className="text-xs font-bold text-amber-500/90 uppercase tracking-wider">Could this result in?</p>
                  <div className="grid grid-cols-2 gap-2">
                    {IMPACT_OPTIONS.map(impact => (
                      <label key={impact} className="flex items-start gap-2 cursor-pointer group">
                        <input type="checkbox" checked={formData.impacts?.includes(impact) || false} onChange={() => handleImpactToggle(impact)} className="mt-0.5 h-3.5 w-3.5 accent-brand-600 cursor-pointer" />
                        <span className={`text-xs leading-tight ${t.textMuted} ${t.groupHoverText}`}>{impact}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="space-y-4">
                  <div className={`rounded-lg ${t.chipBg} p-3 space-y-3`}>
                    <p className={`text-xs font-bold uppercase tracking-wider ${t.textFaint}`}>Behaviour Classification</p>
                    <div className="flex gap-4">
                      {BEHAVIOUR_TYPES.map(type => (
                        <label key={type} className="flex items-center gap-2 cursor-pointer group">
                          <input type="checkbox" checked={formData.behaviourType === type} onChange={() => setFormData({ ...formData, behaviourType: type })} className="h-4 w-4 accent-brand-600 cursor-pointer" />
                          <span className={`text-sm ${t.textMuted} ${t.groupHoverText}`}>{type}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <EmployeeNameInput label="Observer Name" value={formData.observerName || ''}
                      onChange={(name, emp) => setFormData({ ...formData, observerName: name, ...(emp?.department ? { dept: emp.department } : {}) })}
                      placeholder="Select or type your name…" />
                    <PredictiveInput label="Department" historyKey="pach_dept" value={formData.dept || ''}
                      onChange={v => setFormData({ ...formData, dept: v })} placeholder="e.g. Engineering"
                      hints={['Engineering', 'Mechanical', 'Electrical', 'Mining', 'Processing', 'Safety', 'Maintenance', 'Operations']} />
                    <div className="col-span-2">
                      <PredictiveInput label="SDWT" historyKey="pach_sdwt" value={formData.sdwt || ''} onChange={v => setFormData({ ...formData, sdwt: v })} placeholder="SDWT number" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className={`rounded-xl border ${t.border} overflow-hidden`}>
              <div className={`px-4 py-3 ${t.chipBg} border-b ${t.border}`}>
                <p className={`text-xs font-semibold uppercase tracking-wider ${t.textMuted}`}>Referral Checklist</p>
              </div>
              <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
                {CHECKLIST_CATEGORIES.map(category => (
                  <div key={category.name} className="space-y-2">
                    <p className="text-[10px] font-bold text-amber-500/90 uppercase tracking-wider border-b border-amber-500/20 pb-1">{category.name}</p>
                    {category.items.map(item => (
                      <label key={item} className="flex items-start gap-2 cursor-pointer group">
                        <input type="checkbox" checked={formData.checklist?.includes(item) || false} onChange={() => handleChecklistToggle(item)} className="mt-0.5 h-3 w-3 accent-brand-600 cursor-pointer shrink-0" />
                        <span className={`text-[11px] leading-tight ${t.textMuted} ${t.groupHoverText}`}>{item}</span>
                      </label>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            <p className="text-xs font-bold italic text-center text-amber-500/80 pb-2">&quot;Tinokutendai nekuita kuti PPM ive inoshandika zvisina njodzi.&quot;</p>
          </div>
          <div className={`flex justify-end gap-2 px-5 py-4 border-t ${t.border}`}>
            <button type="button" onClick={() => setIsFormModalOpen(false)} className={`px-4 py-2 rounded-xl ${t.chipBg} ${t.textFaint} text-sm ${t.hoverBg} ${t.hoverText} transition-colors`}>Cancel</button>
            <PrimaryButton icon={ShieldCheck} accent="amber" size="md" type="submit" submitting={loading}>{editingReport ? 'Update' : 'Submit'} Care Observation</PrimaryButton>
          </div>
        </form>
      </CenterModal>

      <PacheduDetailModal
        report={selectedReport} open={isDetailModalOpen}
        onClose={() => { setIsDetailModalOpen(false); setSelectedReport(null); }}
        onEdit={(r) => { setIsDetailModalOpen(false); handleEdit(r); }}
        onDelete={(id) => { setIsDetailModalOpen(false); setDeleteConfirm(id); }}
        onStatusChange={handleStatusChange} />

      <CenterModal open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Confirm Deletion" width="max-w-sm">
        <div className="px-5 py-4">
          <div className="flex items-center gap-3 mb-3"><AlertTriangle className="h-5 w-5 text-rose-500" /></div>
          <p className={`text-sm ${t.textMuted}`}>Are you sure you want to delete this care observation? This action cannot be undone.</p>
        </div>
        <div className={`flex justify-end gap-2 px-5 py-4 border-t ${t.border}`}>
          <button type="button" onClick={() => setDeleteConfirm(null)} className={`px-4 py-2 rounded-xl ${t.chipBg} ${t.textFaint} text-sm ${t.hoverText} transition-colors`}>Cancel</button>
          <button type="button" onClick={() => deleteConfirm && handleDelete(deleteConfirm)} className="px-4 py-2 rounded-xl bg-rose-500/20 text-rose-500 text-sm font-semibold hover:bg-rose-500/30 transition-colors">Delete</button>
        </div>
      </CenterModal>
    </main>
  );
}

export default function PacheduFormPage() {
  return <RequireAuth><AppShell><PacheduContent /></AppShell></RequireAuth>;
}
