// app/leave-management/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import {
  Calendar, Plus, Trash2, History, Users, Download, Upload,
  Filter, Search, Clock, CheckCircle, XCircle, AlertCircle,
  FileText, BarChart3, TrendingUp, Award, Zap, Send,
  Printer, CalendarDays, Grid3X3, List, Mail, ChevronRight,
} from 'lucide-react';
import { PageShell } from '@/components/PageShell';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import {
  HeroPanel, GlassPanel, GlassStatCard, GlassBadge, GlassButton,
  GlassInput, GlassSelect, GlassTextarea, GlassTabs, GlassProgress,
  AvatarInitials, EmptyState, LoadingPane, StatItem, GlassTab,
  usePageCollapse, MasterCollapseButton,
} from '@/components/shared';

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface LeaveRequest {
  id: number; employeeName: string; employeeId: string; department: string;
  leaveType: string; startDate: string; endDate: string; totalDays: number;
  reason: string; emergencyContact: string; handoverNotes: string;
  status: 'pending' | 'approved' | 'rejected'; submittedDate: string;
  approvedBy?: string; approvedDate?: string; rejectionReason?: string;
  priority: 'low' | 'medium' | 'high';
}
interface TeamLeaveStat {
  employeeId: string; name: string; annualUsed: number; annualRemaining: number;
  sickUsed: number; personalUsed: number;
}
interface Filters { status: string; type: string; department: string; }
interface NewLeaveRequest {
  employeeName: string; employeeId: string; department: string; leaveType: string;
  startDate: string; endDate: string; totalDays: number; reason: string;
  emergencyContact: string; handoverNotes: string; status: 'pending';
}

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const LEAVE_TYPES = [
  { id: 'annual',    name: 'Annual Leave',    color: 'bg-emerald-500', maxDays: 25, icon: '🏖️' },
  { id: 'sick',      name: 'Sick Leave',       color: 'bg-blue-500',    maxDays: 15, icon: '🤒' },
  { id: 'personal',  name: 'Personal Leave',   color: 'bg-purple-500',  maxDays: 10, icon: '👨‍👩‍👧' },
  { id: 'maternity', name: 'Maternity Leave',  color: 'bg-pink-500',    maxDays: 90, icon: '👶' },
  { id: 'paternity', name: 'Paternity Leave',  color: 'bg-teal-500',    maxDays: 14, icon: '👨‍🍼' },
  { id: 'emergency', name: 'Emergency Leave',  color: 'bg-orange-500',  maxDays: 5,  icon: '🚨' },
];

const TEAM_MEMBERS = [
  { id: 1, name: 'John Smith',    email: 'john@company.com',   role: 'Senior Developer', department: 'Engineering', avatar: 'JS' },
  { id: 2, name: 'Sarah Johnson', email: 'sarah@company.com',  role: 'UI/UX Designer',   department: 'Design',       avatar: 'SJ' },
  { id: 3, name: 'Mike Chen',     email: 'mike@company.com',   role: 'Project Manager',  department: 'Management',   avatar: 'MC' },
  { id: 4, name: 'Emily Davis',   email: 'emily@company.com',  role: 'Marketing Lead',   department: 'Marketing',    avatar: 'ED' },
  { id: 5, name: 'David Wilson',  email: 'david@company.com',  role: 'Frontend Developer',department: 'Engineering', avatar: 'DW' },
];

const SAMPLE_REQUESTS: LeaveRequest[] = [
  { id: 1, employeeName: 'John Smith',   employeeId: 'EMP001', department: 'Engineering', leaveType: 'annual',    startDate: '2024-02-01', endDate: '2024-02-05', totalDays: 5,  reason: 'Family vacation to Hawaii', emergencyContact: '+1 555 123-4567', handoverNotes: 'Project documentation updated.',          status: 'approved',  submittedDate: '2024-01-15', approvedBy: 'Mike Chen', approvedDate: '2024-01-18', priority: 'medium' },
  { id: 2, employeeName: 'Sarah Johnson',employeeId: 'EMP002', department: 'Design',      leaveType: 'sick',      startDate: '2024-01-20', endDate: '2024-01-22', totalDays: 3,  reason: 'Medical appointment and recovery', emergencyContact: '+1 555 987-6543', handoverNotes: 'Design files shared.', status: 'approved',  submittedDate: '2024-01-18', approvedBy: 'Mike Chen', approvedDate: '2024-01-19', priority: 'high' },
  { id: 3, employeeName: 'David Wilson', employeeId: 'EMP005', department: 'Engineering', leaveType: 'personal',  startDate: '2024-02-10', endDate: '2024-02-12', totalDays: 3,  reason: 'Moving to new apartment',         emergencyContact: '+1 555 456-7890', handoverNotes: 'Code deployment completed.', status: 'pending',   submittedDate: '2024-01-20', priority: 'low' },
  { id: 4, employeeName: 'Emily Davis',  employeeId: 'EMP004', department: 'Marketing',   leaveType: 'emergency', startDate: '2024-01-25', endDate: '2024-01-26', totalDays: 2,  reason: 'Family emergency',               emergencyContact: '+1 555 321-0987', handoverNotes: 'Campaign schedule updated.', status: 'rejected',  submittedDate: '2024-01-22', approvedBy: 'Mike Chen', approvedDate: '2024-01-23', rejectionReason: 'Critical campaign launch', priority: 'high' },
  { id: 5, employeeName: 'Mike Chen',    employeeId: 'EMP003', department: 'Management',  leaveType: 'paternity', startDate: '2024-03-01', endDate: '2024-03-14', totalDays: 14, reason: 'Paternity leave for newborn',     emergencyContact: '+1 555 654-3210', handoverNotes: 'Team leadership delegated.',  status: 'approved',  submittedDate: '2024-01-10', approvedBy: 'HR Department', approvedDate: '2024-01-12', priority: 'medium' },
];

const SAMPLE_STATS: TeamLeaveStat[] = [
  { employeeId: 'EMP001', name: 'John Smith',    annualUsed: 10, annualRemaining: 15, sickUsed: 2, personalUsed: 0 },
  { employeeId: 'EMP002', name: 'Sarah Johnson', annualUsed: 5,  annualRemaining: 20, sickUsed: 5, personalUsed: 2 },
  { employeeId: 'EMP003', name: 'Mike Chen',     annualUsed: 15, annualRemaining: 10, sickUsed: 1, personalUsed: 1 },
  { employeeId: 'EMP004', name: 'Emily Davis',   annualUsed: 8,  annualRemaining: 17, sickUsed: 3, personalUsed: 0 },
  { employeeId: 'EMP005', name: 'David Wilson',  annualUsed: 12, annualRemaining: 13, sickUsed: 0, personalUsed: 1 },
];

const EMPTY_NEW: NewLeaveRequest = {
  employeeName: '', employeeId: '', department: '', leaveType: '',
  startDate: '', endDate: '', totalDays: 0, reason: '',
  emergencyContact: '', handoverNotes: '', status: 'pending',
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function getLeaveTypeInfo(id: string) { return LEAVE_TYPES.find(t => t.id === id) ?? LEAVE_TYPES[0]; }

function statusBadge(status: LeaveRequest['status']) {
  if (status === 'approved') return <GlassBadge variant="success" icon={CheckCircle}>Approved</GlassBadge>;
  if (status === 'rejected') return <GlassBadge variant="danger"  icon={XCircle}>Rejected</GlassBadge>;
  return <GlassBadge variant="warning" icon={AlertCircle}>Pending</GlassBadge>;
}

function initials(name: string) { return name.split(' ').map(n => n[0]).join(''); }

function calcDays(start: string, end: string): number {
  if (!start || !end) return 0;
  return Math.ceil(Math.abs(new Date(end).getTime() - new Date(start).getTime()) / 86400000) + 1;
}

// ─── PDF HELPERS ──────────────────────────────────────────────────────────────

function generateLeavePDF(request: LeaveRequest) {
  const doc = new jsPDF();
  doc.setFillColor(30, 64, 175);
  doc.rect(0, 0, 210, 40, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16); doc.setFont('helvetica', 'bold');
  doc.text('LEAVE REQUEST', 105, 25, { align: 'center' });
  doc.setTextColor(0, 0, 0); doc.setFontSize(12); doc.setFont('helvetica', 'normal');
  let y = 60;
  [['Name', request.employeeName], ['Employee ID', request.employeeId], ['Department', request.department],
   ['Leave Type', getLeaveTypeInfo(request.leaveType).name],
   ['Start Date', request.startDate], ['End Date', request.endDate], ['Total Days', `${request.totalDays}`],
   ['Reason', request.reason], ['Status', request.status.toUpperCase()]].forEach(([k, v]) => {
    doc.setFont('helvetica', 'bold'); doc.text(`${k}:`, 20, y);
    doc.setFont('helvetica', 'normal'); doc.text(v, 80, y); y += 10;
  });
  doc.save(`leave-${request.employeeName}-${request.id}.pdf`);
  toast.success('PDF generated!');
}

function generateTeamReportPDF(stats: TeamLeaveStat[]) {
  const doc = new jsPDF();
  doc.setFillColor(30, 64, 175); doc.rect(0, 0, 210, 40, 'F');
  doc.setTextColor(255, 255, 255); doc.setFontSize(16); doc.setFont('helvetica', 'bold');
  doc.text('TEAM LEAVE REPORT', 105, 25, { align: 'center' });
  doc.setTextColor(0, 0, 0); let y = 60;
  stats.forEach(s => {
    doc.setFont('helvetica', 'bold'); doc.text(s.name, 20, y);
    doc.setFont('helvetica', 'normal');
    doc.text(`Annual: ${s.annualUsed}/${s.annualUsed + s.annualRemaining}d | Sick: ${s.sickUsed}d | Personal: ${s.personalUsed}d`, 20, y + 7);
    y += 18;
  });
  doc.save(`team-leave-${new Date().toISOString().split('T')[0]}.pdf`);
  toast.success('Team report generated!');
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function LeaveManagementPage() {
  const sections = usePageCollapse({ hero: false, requests: false, team: false, history: false, newRequest: false });
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [teamStats, setTeamStats] = useState<TeamLeaveStat[]>([]);
  const [filters, setFilters] = useState<Filters>({ status: 'all', type: 'all', department: 'all' });
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [search, setSearch] = useState('');
  const [newReq, setNewReq] = useState<NewLeaveRequest>(EMPTY_NEW);

  useEffect(() => { setRequests(SAMPLE_REQUESTS); setTeamStats(SAMPLE_STATS); }, []);

  const set = (k: keyof NewLeaveRequest, v: string | number) =>
    setNewReq(p => {
      const u = { ...p, [k]: v };
      if (k === 'startDate' || k === 'endDate')
        u.totalDays = calcDays(k === 'startDate' ? String(v) : p.startDate, k === 'endDate' ? String(v) : p.endDate);
      return u;
    });

  const submitRequest = () => {
    if (!newReq.employeeName || !newReq.leaveType || !newReq.startDate || !newReq.endDate) {
      toast.error('Please fill in all required fields'); return;
    }
    setRequests(p => [{ ...newReq, id: Date.now(), submittedDate: new Date().toISOString().split('T')[0], status: 'pending', priority: 'medium' }, ...p]);
    setNewReq(EMPTY_NEW);
    toast.success('Leave request submitted!');
  };

  const approveRequest = (id: number) => {
    setRequests(p => p.map(r => r.id === id ? { ...r, status: 'approved', approvedBy: 'Manager', approvedDate: new Date().toISOString().split('T')[0] } : r));
    toast.success('Request approved!');
  };

  const rejectRequest = (id: number) => {
    const reason = prompt('Reason for rejection:');
    if (!reason) return;
    setRequests(p => p.map(r => r.id === id ? { ...r, status: 'rejected', approvedBy: 'Manager', approvedDate: new Date().toISOString().split('T')[0], rejectionReason: reason } : r));
    toast.success('Request rejected.');
  };

  const deleteRequest = (id: number) => {
    setRequests(p => p.filter(r => r.id !== id));
    toast.success('Request deleted.');
  };

  const filtered = requests.filter(r =>
    (filters.status === 'all' || r.status === filters.status) &&
    (filters.type   === 'all' || r.leaveType === filters.type) &&
    (!search || r.employeeName.toLowerCase().includes(search.toLowerCase()) || r.department.toLowerCase().includes(search.toLowerCase()))
  );

  const stats = {
    total:    requests.length,
    pending:  requests.filter(r => r.status === 'pending').length,
    approved: requests.filter(r => r.status === 'approved').length,
    rejected: requests.filter(r => r.status === 'rejected').length,
  };

  const heroStats: StatItem[] = [
    { label: 'Total Requests', value: stats.total },
    { label: 'Pending',        value: stats.pending,  textClass: 'text-amber-400' },
    { label: 'Approved',       value: stats.approved, textClass: 'text-emerald-400' },
    { label: 'Rejected',       value: stats.rejected, textClass: 'text-red-400' },
  ];

  const employeeOptions = [
    { value: '', label: 'Select employee…' },
    ...TEAM_MEMBERS.map(e => ({ value: e.name, label: `${e.name} — ${e.department}` })),
  ];

  const leaveTypeOptions = [
    { value: '', label: 'Select leave type…' },
    ...LEAVE_TYPES.map(t => ({ value: t.id, label: `${t.icon} ${t.name} (max ${t.maxDays}d)` })),
  ];

  // ── Requests tab content ───────────────────────────────────────────────────
  const requestsContent = (
    <GlassPanel icon={FileText} title="All Requests" count={filtered.length} variant="dark"
      {...sections.panel('requests')}
      actions={
        <div className="flex items-center gap-2">
          <GlassInput icon={Search} placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} className="w-40" />
          <GlassSelect value={filters.status} onChange={e => setFilters(p => ({ ...p, status: e.target.value }))}
            options={[{ value: 'all', label: 'All Status' }, { value: 'pending', label: 'Pending' }, { value: 'approved', label: 'Approved' }, { value: 'rejected', label: 'Rejected' }]} />
          <GlassSelect value={filters.type} onChange={e => setFilters(p => ({ ...p, type: e.target.value }))}
            options={[{ value: 'all', label: 'All Types' }, ...LEAVE_TYPES.map(t => ({ value: t.id, label: t.name }))]} />
          <GlassButton size="sm" variant={viewMode === 'list' ? 'primary' : 'secondary'} icon={List} onClick={() => setViewMode('list')} />
          <GlassButton size="sm" variant={viewMode === 'grid' ? 'primary' : 'secondary'} icon={Grid3X3} onClick={() => setViewMode('grid')} />
        </div>
      }
    >
      {filtered.length === 0 ? (
        <EmptyState icon={FileText} title="No requests found" message="No leave requests match your current filters." />
      ) : viewMode === 'list' ? (
        <div className="divide-y divide-white/[0.05]">
          {filtered.map(r => {
            const lt = getLeaveTypeInfo(r.leaveType);
            return (
              <div key={r.id} className="px-5 py-4 flex items-start gap-4 hover:bg-white/[0.03] transition-colors">
                <AvatarInitials name={r.employeeName} className="shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-semibold text-white text-sm">{r.employeeName}</span>
                    <GlassBadge variant="neutral" size="sm">{r.department}</GlassBadge>
                    {statusBadge(r.status)}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-white/45 flex-wrap">
                    <span>{lt.icon} {lt.name}</span>
                    <span>{r.startDate} → {r.endDate}</span>
                    <span>{r.totalDays} days</span>
                    <span>Submitted {r.submittedDate}</span>
                  </div>
                  {r.reason && <p className="text-xs text-white/50 mt-1 line-clamp-1">{r.reason}</p>}
                  {r.rejectionReason && <p className="text-xs text-red-400 mt-1">{r.rejectionReason}</p>}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <GlassButton size="xs" variant="ghost" icon={Download} title="Download PDF" onClick={() => generateLeavePDF(r)} />
                  {r.status === 'pending' && (
                    <>
                      <GlassButton size="xs" variant="ghost" icon={CheckCircle} onClick={() => approveRequest(r.id)} className="text-emerald-400 hover:text-emerald-300" title="Approve" />
                      <GlassButton size="xs" variant="ghost" icon={XCircle}     onClick={() => rejectRequest(r.id)}  className="text-red-400 hover:text-red-300"     title="Reject"  />
                    </>
                  )}
                  <GlassButton size="xs" variant="ghost" icon={Trash2} onClick={() => deleteRequest(r.id)} className="text-red-400 hover:text-red-300" title="Delete" />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(r => {
            const lt = getLeaveTypeInfo(r.leaveType);
            return (
              <div key={r.id} className="oz-glass-panel rounded-xl border border-white/[0.07] overflow-hidden">
                <div className="p-4 flex items-center justify-between border-b border-white/[0.06]">
                  <div className="flex items-center gap-2">
                    <AvatarInitials name={r.employeeName} />
                    <div>
                      <p className="font-semibold text-white text-sm">{r.employeeName}</p>
                      <p className="text-[11px] text-white/40">{r.department}</p>
                    </div>
                  </div>
                  {statusBadge(r.status)}
                </div>
                <div className="p-3 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-white/60">{lt.icon} {lt.name}</span>
                    <GlassBadge variant="info" size="sm">{r.totalDays}d</GlassBadge>
                  </div>
                  <div className="flex justify-between text-white/40">
                    <span>{r.startDate}</span><span>→</span><span>{r.endDate}</span>
                  </div>
                  <p className="text-white/50 line-clamp-2">{r.reason}</p>
                  {r.rejectionReason && <p className="text-red-400 line-clamp-1">{r.rejectionReason}</p>}
                </div>
                <div className="px-3 pb-3 flex gap-1.5">
                  <GlassButton size="xs" variant="ghost" icon={Download} onClick={() => generateLeavePDF(r)} />
                  {r.status === 'pending' && (
                    <>
                      <GlassButton size="xs" variant="ghost" icon={CheckCircle} onClick={() => approveRequest(r.id)} className="text-emerald-400" />
                      <GlassButton size="xs" variant="ghost" icon={XCircle}     onClick={() => rejectRequest(r.id)}  className="text-red-400" />
                    </>
                  )}
                  <GlassButton size="xs" variant="ghost" icon={Trash2} onClick={() => deleteRequest(r.id)} className="text-red-400 ml-auto" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </GlassPanel>
  );

  // ── Team overview tab ──────────────────────────────────────────────────────
  const teamContent = (
    <GlassPanel icon={Users} title="Team Leave Overview" variant="dark" {...sections.panel('team')}>
      <div className="p-4 space-y-3">
        {TEAM_MEMBERS.map(emp => {
          const s = teamStats.find(x => x.employeeId === `EMP00${emp.id}`);
          const used = s?.annualUsed ?? 0;
          return (
            <div key={emp.id} className="oz-glass-panel rounded-xl border border-white/[0.07] p-4">
              <div className="flex items-center justify-between gap-4 mb-3">
                <div className="flex items-center gap-3">
                  <AvatarInitials name={emp.name} />
                  <div>
                    <p className="font-semibold text-white text-sm">{emp.name}</p>
                    <p className="text-xs text-white/40">{emp.role} · {emp.department}</p>
                  </div>
                </div>
                <div className="flex gap-4 text-center">
                  <div><p className="text-lg font-bold text-emerald-400">{s?.annualRemaining ?? 0}</p><p className="text-[10px] text-white/40">Annual left</p></div>
                  <div><p className="text-lg font-bold text-[#86BBD8]">{s?.sickUsed ?? 0}</p><p className="text-[10px] text-white/40">Sick used</p></div>
                  <div><p className="text-lg font-bold text-purple-400">{s?.personalUsed ?? 0}</p><p className="text-[10px] text-white/40">Personal</p></div>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-white/40 mb-0.5">
                  <span>Annual Leave</span><span>{used}/25 days</span>
                </div>
                <GlassProgress value={used} max={25} colorClass="bg-emerald-400" size="sm" />
              </div>
            </div>
          );
        })}
      </div>
    </GlassPanel>
  );

  // ── History tab ────────────────────────────────────────────────────────────
  const historyContent = (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <GlassStatCard label="Approval Rate"      value="78%" icon={TrendingUp} valueClass="text-emerald-400" />
        <GlassStatCard label="Avg. Days/Employee" value="42"  icon={CalendarDays} />
        <GlassStatCard label="Sick Leave Usage"   value="15%" icon={BarChart3} valueClass="text-amber-400" />
      </div>
      <GlassPanel icon={History} title="Recent Activity" variant="dark"
        {...sections.panel('history')}
        actions={<GlassButton size="xs" variant="secondary" icon={Download} onClick={() => generateTeamReportPDF(teamStats)}>Export Report</GlassButton>}
      >
        <div className="divide-y divide-white/[0.05]">
          {[...requests].sort((a, b) => new Date(b.submittedDate).getTime() - new Date(a.submittedDate).getTime()).slice(0, 5).map(r => (
            <div key={r.id} className="flex items-center gap-3 px-5 py-3 hover:bg-white/[0.03]">
              <div className={`h-2 w-2 rounded-full shrink-0 ${r.status === 'approved' ? 'bg-emerald-400' : r.status === 'rejected' ? 'bg-red-400' : 'bg-amber-400'}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white/80">{r.employeeName}</p>
                <p className="text-xs text-white/40">{getLeaveTypeInfo(r.leaveType).name} · {r.startDate} → {r.endDate}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs font-medium text-white/70 capitalize">{r.status}</p>
                <p className="text-[10px] text-white/35">{r.submittedDate}</p>
              </div>
            </div>
          ))}
        </div>
      </GlassPanel>
    </div>
  );

  // ── New request tab ────────────────────────────────────────────────────────
  const newRequestContent = (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Sidebar */}
      <div className="space-y-4">
        <GlassPanel icon={Zap} title="Quick Actions" variant="panel" {...sections.panel('newRequest')}>
          <div className="px-4 pb-4 grid grid-cols-2 gap-2">
            {[
              { icon: Download,  label: 'Export Report',  action: () => generateTeamReportPDF(teamStats) },
              { icon: Upload,    label: 'Import Data',    action: () => toast.success('Data imported!') },
              { icon: Printer,   label: 'Print Summary',  action: () => toast.success('Printing…') },
              { icon: Mail,      label: 'Send Reminder',  action: () => toast.success('Reminder sent!') },
            ].map(a => (
              <GlassButton key={a.label} variant="secondary" size="sm" icon={a.icon} onClick={a.action} className="flex-col h-14 gap-1">
                {a.label}
              </GlassButton>
            ))}
          </div>
        </GlassPanel>

        <GlassPanel icon={Award} title="Leave Types" variant="panel" defaultOpen={false}>
          <div className="px-4 pb-4 space-y-2">
            {LEAVE_TYPES.map(t => (
              <div key={t.id} className="flex items-center justify-between py-1.5">
                <div className="flex items-center gap-2">
                  <span>{t.icon}</span>
                  <div>
                    <p className="text-xs font-medium text-white/80">{t.name}</p>
                    <p className="text-[10px] text-white/35">Max {t.maxDays} days</p>
                  </div>
                </div>
                <div className={`h-2.5 w-2.5 rounded-full ${t.color}`} />
              </div>
            ))}
          </div>
        </GlassPanel>

        <GlassPanel icon={CalendarDays} title="Upcoming Time Off" variant="panel" defaultOpen={false}>
          <div className="px-4 pb-4 space-y-2">
            {requests.filter(r => r.status === 'approved').slice(0, 3).map(r => (
              <div key={r.id} className="flex items-center justify-between py-1.5">
                <div>
                  <p className="text-xs font-medium text-white/80">{r.employeeName}</p>
                  <p className="text-[10px] text-white/35">{r.startDate} → {r.endDate}</p>
                </div>
                <GlassBadge variant="info" size="sm">{getLeaveTypeInfo(r.leaveType).name.split(' ')[0]}</GlassBadge>
              </div>
            ))}
          </div>
        </GlassPanel>
      </div>

      {/* Form */}
      <div className="lg:col-span-2">
        <GlassPanel icon={Plus} title="New Leave Request" variant="dark">
          <div className="px-5 pb-5 pt-2 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <GlassSelect label="Employee Name *" value={newReq.employeeName}
                onChange={e => {
                  const emp = TEAM_MEMBERS.find(m => m.name === e.target.value);
                  set('employeeName', e.target.value);
                  if (emp) { set('employeeId', `EMP00${emp.id}`); set('department', emp.department); }
                }}
                options={employeeOptions} />
              <GlassInput label="Employee ID" value={newReq.employeeId} onChange={() => {}} readOnly />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <GlassInput  label="Department" value={newReq.department} onChange={() => {}} readOnly />
              <GlassSelect label="Leave Type *" value={newReq.leaveType} onChange={e => set('leaveType', e.target.value)} options={leaveTypeOptions} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <GlassInput label="Start Date *" type="date" value={newReq.startDate} onChange={e => set('startDate', e.target.value)} style={{ colorScheme: 'dark' }} />
              <GlassInput label="End Date *"   type="date" value={newReq.endDate}   onChange={e => set('endDate', e.target.value)}   style={{ colorScheme: 'dark' }} />
              <GlassInput label="Total Days"   value={`${newReq.totalDays}`}        onChange={() => {}} readOnly />
            </div>
            <GlassTextarea label="Reason for Leave *" value={newReq.reason} onChange={e => set('reason', e.target.value)} placeholder="Please provide details about your leave request…" rows={3} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <GlassInput label="Emergency Contact" value={newReq.emergencyContact} onChange={e => set('emergencyContact', e.target.value)} placeholder="Phone number for emergencies" />
              <GlassInput label="Handover Notes"    value={newReq.handoverNotes}    onChange={e => set('handoverNotes', e.target.value)}    placeholder="Work to be covered during leave" />
            </div>
            <div className="flex justify-end pt-2">
              <GlassButton variant="primary" icon={Send} onClick={submitRequest}>Submit Leave Request</GlassButton>
            </div>
          </div>
        </GlassPanel>
      </div>
    </div>
  );

  const tabs: GlassTab[] = [
    { key: 'new-request', label: 'New Request',    icon: Plus,      content: newRequestContent },
    { key: 'requests',    label: 'All Requests',   icon: FileText,  count: requests.length, content: requestsContent },
    { key: 'team',        label: 'Team Overview',  icon: Users,     content: teamContent },
    { key: 'history',     label: 'History',        icon: History,   content: historyContent },
  ];

  return (
    <PageShell>
      <main className="container mx-auto px-4 py-8 space-y-4">

        <HeroPanel
          icon={Calendar}
          title="Leave Management"
          subtitle="Manage employee leave requests and track time off across all departments."
          stats={heroStats}
          {...sections.panel('hero')}
          actions={
            <>
              <MasterCollapseButton collapse={sections} />
              <GlassButton variant="primary" icon={Plus} onClick={() => {}}>New Request</GlassButton>
            </>
          }
        />

        <GlassTabs tabs={tabs} defaultTab="new-request" />

      </main>
    </PageShell>
  );
}
