// app/leave-management/page.tsx
'use client';

import React, { useState, useEffect, ElementType } from 'react';
import {
  Calendar, Plus, Trash2, History, Users, User, Download, Upload,
  CheckCircle, XCircle,
  FileText, BarChart3, TrendingUp, Award, Zap, Send,
  Printer, CalendarDays, Grid3X3, List, Mail, FileSpreadsheet, FileDown,
} from '@/components/shared/theme';
import { AppShell } from '@/components/app-shell';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import {
  useTheme, PageHero, StatusBadge, SearchInput, ProgressBar, FormField, ACCENT_HEX,
  useCollapseSection, EmptyState, PrimaryButton, SelectField,
} from '@/components/shared/theme';

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
  { id: 'annual', name: 'Annual Leave', hex: '#34d399', maxDays: 25, icon: '🏖️' },
  { id: 'sick', name: 'Sick Leave', hex: ACCENT_HEX.blue, maxDays: 15, icon: '🤒' },
  { id: 'personal', name: 'Personal Leave', hex: '#a78bfa', maxDays: 10, icon: '👨‍👩‍👧' },
  { id: 'maternity', name: 'Maternity Leave', hex: '#f472b6', maxDays: 90, icon: '👶' },
  { id: 'paternity', name: 'Paternity Leave', hex: '#2dd4bf', maxDays: 14, icon: '👨‍🍼' },
  { id: 'emergency', name: 'Emergency Leave', hex: '#fb923c', maxDays: 5, icon: '🚨' },
];

const TEAM_MEMBERS = [
  { id: 1, name: 'John Smith', email: 'john@company.com', role: 'Senior Developer', department: 'Engineering' },
  { id: 2, name: 'Sarah Johnson', email: 'sarah@company.com', role: 'UI/UX Designer', department: 'Design' },
  { id: 3, name: 'Mike Chen', email: 'mike@company.com', role: 'Project Manager', department: 'Management' },
  { id: 4, name: 'Emily Davis', email: 'emily@company.com', role: 'Marketing Lead', department: 'Marketing' },
  { id: 5, name: 'David Wilson', email: 'david@company.com', role: 'Frontend Developer', department: 'Engineering' },
];

const SAMPLE_REQUESTS: LeaveRequest[] = [
  { id: 1, employeeName: 'John Smith', employeeId: 'EMP001', department: 'Engineering', leaveType: 'annual', startDate: '2024-02-01', endDate: '2024-02-05', totalDays: 5, reason: 'Family vacation to Hawaii', emergencyContact: '+1 555 123-4567', handoverNotes: 'Project documentation updated.', status: 'approved', submittedDate: '2024-01-15', approvedBy: 'Mike Chen', approvedDate: '2024-01-18', priority: 'medium' },
  { id: 2, employeeName: 'Sarah Johnson', employeeId: 'EMP002', department: 'Design', leaveType: 'sick', startDate: '2024-01-20', endDate: '2024-01-22', totalDays: 3, reason: 'Medical appointment and recovery', emergencyContact: '+1 555 987-6543', handoverNotes: 'Design files shared.', status: 'approved', submittedDate: '2024-01-18', approvedBy: 'Mike Chen', approvedDate: '2024-01-19', priority: 'high' },
  { id: 3, employeeName: 'David Wilson', employeeId: 'EMP005', department: 'Engineering', leaveType: 'personal', startDate: '2024-02-10', endDate: '2024-02-12', totalDays: 3, reason: 'Moving to new apartment', emergencyContact: '+1 555 456-7890', handoverNotes: 'Code deployment completed.', status: 'pending', submittedDate: '2024-01-20', priority: 'low' },
  { id: 4, employeeName: 'Emily Davis', employeeId: 'EMP004', department: 'Marketing', leaveType: 'emergency', startDate: '2024-01-25', endDate: '2024-01-26', totalDays: 2, reason: 'Family emergency', emergencyContact: '+1 555 321-0987', handoverNotes: 'Campaign schedule updated.', status: 'rejected', submittedDate: '2024-01-22', approvedBy: 'Mike Chen', approvedDate: '2024-01-23', rejectionReason: 'Critical campaign launch', priority: 'high' },
  { id: 5, employeeName: 'Mike Chen', employeeId: 'EMP003', department: 'Management', leaveType: 'paternity', startDate: '2024-03-01', endDate: '2024-03-14', totalDays: 14, reason: 'Paternity leave for newborn', emergencyContact: '+1 555 654-3210', handoverNotes: 'Team leadership delegated.', status: 'approved', submittedDate: '2024-01-10', approvedBy: 'HR Department', approvedDate: '2024-01-12', priority: 'medium' },
];

const SAMPLE_STATS: TeamLeaveStat[] = [
  { employeeId: 'EMP001', name: 'John Smith', annualUsed: 10, annualRemaining: 15, sickUsed: 2, personalUsed: 0 },
  { employeeId: 'EMP002', name: 'Sarah Johnson', annualUsed: 5, annualRemaining: 20, sickUsed: 5, personalUsed: 2 },
  { employeeId: 'EMP003', name: 'Mike Chen', annualUsed: 15, annualRemaining: 10, sickUsed: 1, personalUsed: 1 },
  { employeeId: 'EMP004', name: 'Emily Davis', annualUsed: 8, annualRemaining: 17, sickUsed: 3, personalUsed: 0 },
  { employeeId: 'EMP005', name: 'David Wilson', annualUsed: 12, annualRemaining: 13, sickUsed: 0, personalUsed: 1 },
];

const EMPTY_NEW: NewLeaveRequest = {
  employeeName: '', employeeId: '', department: '', leaveType: '',
  startDate: '', endDate: '', totalDays: 0, reason: '',
  emergencyContact: '', handoverNotes: '', status: 'pending',
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function getLeaveTypeInfo(id: string) { return LEAVE_TYPES.find(t => t.id === id) ?? LEAVE_TYPES[0]; }

function statusHex(status: LeaveRequest['status']) {
  return status === 'approved' ? '#34d399' : status === 'rejected' ? '#f87171' : '#fbbf24';
}
function statusLabel(status: LeaveRequest['status']) {
  return status === 'approved' ? 'Approved' : status === 'rejected' ? 'Rejected' : 'Pending';
}

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

// ─── SMALL COMPONENTS ─────────────────────────────────────────────────────────

// Person identity marker — bare accent person icon (app-wide convention;
// replaced the old initials circle). `name` kept for call compatibility.
function Avatar({ }: { name?: string }) {
  return <User className="h-6 w-6 text-brand-400 shrink-0" />;
}

function Panel({ icon: Icon, title, children, actions }: { icon: ElementType; title: string; children: React.ReactNode; actions?: React.ReactNode }) {
  const t = useTheme();
  return (
    <div className={`${t.glass} rounded-2xl ${t.shadow} overflow-hidden`}>
      <div className={`flex items-center gap-2 px-5 py-3 border-b ${t.border} flex-wrap`}>
        <Icon className="h-4 w-4 text-brand-400" />
        <span className={`font-semibold text-sm ${t.textPrimary}`}>{title}</span>
        {actions && <div className="ml-auto flex items-center gap-2 flex-wrap">{actions}</div>}
      </div>
      {children}
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

function LeaveManagementContent() {
  const t = useTheme();
  const sections = useCollapseSection({ hero: true });
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [teamStats, setTeamStats] = useState<TeamLeaveStat[]>([]);
  const [filters, setFilters] = useState<Filters>({ status: 'all', type: 'all', department: 'all' });
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [search, setSearch] = useState('');
  const [newReq, setNewReq] = useState<NewLeaveRequest>(EMPTY_NEW);
  const [tab, setTab] = useState<'new-request' | 'requests' | 'team' | 'history'>('new-request');
  const [showDlMenu, setShowDlMenu] = useState(false);

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

  const downloadLeavesExcel = async () => {
    setShowDlMenu(false);
    try {
      const ExcelJS = (await import('exceljs')).default;
      const { saveAs } = await import('file-saver');
      const wb = new ExcelJS.Workbook();
      wb.creator = 'Ozech MyOffice';
      const ws = wb.addWorksheet('Leave Requests');
      ws.columns = [
        { header: 'Employee Name', key: 'name', width: 24 },
        { header: 'Employee ID', key: 'id', width: 14 },
        { header: 'Department', key: 'dept', width: 18 },
        { header: 'Leave Type', key: 'type', width: 18 },
        { header: 'Start Date', key: 'start', width: 14 },
        { header: 'End Date', key: 'end', width: 14 },
        { header: 'Days', key: 'days', width: 8 },
        { header: 'Reason', key: 'reason', width: 34 },
        { header: 'Status', key: 'status', width: 12 },
        { header: 'Priority', key: 'priority', width: 12 },
        { header: 'Submitted', key: 'sub', width: 14 },
        { header: 'Approved By', key: 'approver', width: 20 },
      ];
      const hdr = ws.getRow(1);
      hdr.eachCell(cell => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2A4D69' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      });
      hdr.height = 18;
      requests.forEach((r, i) => {
        const row = ws.addRow({
          name: r.employeeName, id: r.employeeId, dept: r.department,
          type: getLeaveTypeInfo(r.leaveType).name,
          start: r.startDate, end: r.endDate, days: r.totalDays,
          reason: r.reason, status: r.status, priority: r.priority,
          sub: r.submittedDate, approver: r.approvedBy || '',
        });
        if (i % 2 === 1) row.eachCell(cell => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F4F8' } }; });
        const statusCell = row.getCell('status');
        if (r.status === 'approved') statusCell.font = { color: { argb: 'FF34D399' }, bold: true };
        else if (r.status === 'rejected') statusCell.font = { color: { argb: 'FFF43F5E' }, bold: true };
        else statusCell.font = { color: { argb: 'FFF59E0B' }, bold: true };
      });
      ws.autoFilter = { from: 'A1', to: 'L1' };
      ws.views = [{ state: 'frozen', ySplit: 1 }];
      const buf = await wb.xlsx.writeBuffer();
      saveAs(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
        `Leave_Requests_${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success(`Excel exported — ${requests.length} requests`);
    } catch (err) { toast.error(`Export failed: ${(err as Error).message}`); }
  };

  const downloadLeavesPDF = async () => {
    setShowDlMenu(false);
    try {
      const { default: jsPDFCtor } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');
      const doc = new jsPDFCtor({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      doc.setFontSize(14); doc.setTextColor(42, 77, 105);
      doc.text('Leave Requests Register', 14, 14);
      doc.setFontSize(8); doc.setTextColor(100, 100, 100);
      doc.text(`Generated ${new Date().toLocaleDateString('en-GB')}  ·  ${requests.length} requests`, 14, 20);
      autoTable(doc, {
        startY: 25,
        head: [['Employee', 'ID', 'Department', 'Leave Type', 'Start', 'End', 'Days', 'Status', 'Priority', 'Submitted', 'Approved By']],
        body: requests.map(r => [
          r.employeeName, r.employeeId, r.department,
          getLeaveTypeInfo(r.leaveType).name,
          r.startDate, r.endDate, r.totalDays,
          r.status, r.priority, r.submittedDate, r.approvedBy || '',
        ]),
        headStyles: { fillColor: [42, 77, 105], textColor: 255, fontStyle: 'bold', fontSize: 7.5 },
        bodyStyles: { fontSize: 7.5 },
        alternateRowStyles: { fillColor: [240, 244, 248] },
        didParseCell: (data) => {
          if (data.section === 'body' && data.column.index === 7) {
            const val = String(data.cell.raw);
            if (val === 'approved') data.cell.styles.textColor = [52, 211, 153];
            if (val === 'rejected') data.cell.styles.textColor = [244, 63, 94];
            if (val === 'pending') data.cell.styles.textColor = [245, 158, 11];
          }
        },
        styles: { cellPadding: 1.5 },
        margin: { left: 10, right: 10 },
      });
      doc.save(`Leave_Requests_${new Date().toISOString().slice(0, 10)}.pdf`);
      toast.success(`PDF exported — ${requests.length} requests`);
    } catch (err) { toast.error(`Export failed: ${(err as Error).message}`); }
  };

  const filtered = requests.filter(r =>
    (filters.status === 'all' || r.status === filters.status) &&
    (filters.type === 'all' || r.leaveType === filters.type) &&
    (!search || r.employeeName.toLowerCase().includes(search.toLowerCase()) || r.department.toLowerCase().includes(search.toLowerCase()))
  );

  const stats = {
    total: requests.length,
    pending: requests.filter(r => r.status === 'pending').length,
    approved: requests.filter(r => r.status === 'approved').length,
    rejected: requests.filter(r => r.status === 'rejected').length,
  };

  const selCls = `h-8 rounded-lg px-2.5 text-xs outline-none transition-colors ${t.inputBg}`;
  const inputCls = `w-full h-9 rounded-lg px-3 text-sm outline-none transition-colors ${t.inputBg}`;

  const TABS: { key: typeof tab; label: string; icon: ElementType; count?: number }[] = [
    { key: 'new-request', label: 'New Request', icon: Plus },
    { key: 'requests', label: 'All Requests', icon: FileText, count: requests.length },
    { key: 'team', label: 'Team Overview', icon: Users },
    { key: 'history', label: 'History', icon: History },
  ];

  return (
    <main className="max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
      <PageHero
        icon={Calendar}
        accent="violet"
        crumbs={['Time & Attendance', 'Leave Management']}
        title="Leave Management"
        description="Manage employee leave requests and track time off across all departments."
        statsOpen={sections.expanded.hero}
        actions={
          <>
            <div className="relative">
              <button type="button" onClick={() => setShowDlMenu(p => !p)} disabled={requests.length === 0}
                className={`flex items-center gap-1.5 h-8 px-3 rounded-lg text-[13px] font-medium ${t.chipBg} ${t.textMuted} ${t.hoverBg} disabled:opacity-40`}>
                <Download className="h-3.5 w-3.5" /> Download
              </button>
              {showDlMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowDlMenu(false)} />
                  <div className={`absolute right-0 top-full mt-1 z-50 rounded-xl overflow-hidden w-48 ${t.glass} ${t.shadow}`}>
                    <button type="button" onClick={downloadLeavesExcel} className={`w-full flex items-center gap-2.5 px-4 py-3 text-xs ${t.textMuted} ${t.hoverBgSoft} transition-all border-b ${t.border}`}>
                      <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" /> Export Excel (.xlsx)
                    </button>
                    <button type="button" onClick={downloadLeavesPDF} className={`w-full flex items-center gap-2.5 px-4 py-3 text-xs ${t.textMuted} ${t.hoverBgSoft} transition-all`}>
                      <FileDown className="h-3.5 w-3.5 text-rose-400" /> Export PDF
                    </button>
                  </div>
                </>
              )}
            </div>
            <PrimaryButton icon={Plus} onClick={() => setTab('new-request')}>New Request</PrimaryButton>
          </>
        }
      >
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="text-center"><div className={`text-2xl font-bold ${t.textPrimary}`}>{stats.total}</div><div className={`text-xs mt-0.5 ${t.textFaint}`}>Total Requests</div></div>
          <div className="text-center"><div className="text-2xl font-bold text-amber-400">{stats.pending}</div><div className={`text-xs mt-0.5 ${t.textFaint}`}>Pending</div></div>
          <div className="text-center"><div className="text-2xl font-bold text-emerald-400">{stats.approved}</div><div className={`text-xs mt-0.5 ${t.textFaint}`}>Approved</div></div>
          <div className="text-center"><div className="text-2xl font-bold text-red-400">{stats.rejected}</div><div className={`text-xs mt-0.5 ${t.textFaint}`}>Rejected</div></div>
        </div>
      </PageHero>

      <div className={`flex items-center gap-1 ${t.glassSoft} rounded-xl p-1 w-fit flex-wrap`}>
        {TABS.map(tb => (
          <button key={tb.key} type="button" onClick={() => setTab(tb.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === tb.key ? 'bg-brand-500/20 text-brand-400' : `${t.textFaint} ${t.hoverText} ${t.hoverBg}`}`}>
            <tb.icon className="h-4 w-4" />{tb.label}{tb.count !== undefined && <span className={`text-[10px] ${tab === tb.key ? '' : t.textFaint}`}>{tb.count}</span>}
          </button>
        ))}
      </div>

      {tab === 'new-request' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="space-y-4">
            <Panel icon={Zap} title="Quick Actions">
              <div className="px-4 pb-4 pt-3 grid grid-cols-2 gap-2">
                {[
                  { icon: Download, label: 'Export Report', action: () => generateTeamReportPDF(teamStats) },
                  { icon: Upload, label: 'Import Data', action: () => toast.success('Data imported!') },
                  { icon: Printer, label: 'Print Summary', action: () => toast.success('Printing…') },
                  { icon: Mail, label: 'Send Reminder', action: () => toast.success('Reminder sent!') },
                ].map(a => (
                  <button key={a.label} type="button" onClick={a.action} className={`flex flex-col items-center justify-center gap-1 h-14 rounded-lg text-[11px] font-medium ${t.chipBg} ${t.textMuted} ${t.hoverBg} transition-colors`}>
                    <a.icon className="h-4 w-4" />{a.label}
                  </button>
                ))}
              </div>
            </Panel>

            <Panel icon={Award} title="Leave Types">
              <div className="px-4 pb-4 pt-3 space-y-2">
                {LEAVE_TYPES.map(lt => (
                  <div key={lt.id} className="flex items-center justify-between py-1.5">
                    <div className="flex items-center gap-2">
                      <span>{lt.icon}</span>
                      <div><p className={`text-xs font-medium ${t.textMuted}`}>{lt.name}</p><p className={`text-[10px] ${t.textFaint}`}>Max {lt.maxDays} days</p></div>
                    </div>
                    <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: lt.hex }} />
                  </div>
                ))}
              </div>
            </Panel>

            <Panel icon={CalendarDays} title="Upcoming Time Off">
              <div className="px-4 pb-4 pt-3 space-y-2">
                {requests.filter(r => r.status === 'approved').slice(0, 3).map(r => (
                  <div key={r.id} className="flex items-center justify-between py-1.5">
                    <div><p className={`text-xs font-medium ${t.textMuted}`}>{r.employeeName}</p><p className={`text-[10px] ${t.textFaint}`}>{r.startDate} → {r.endDate}</p></div>
                    <StatusBadge color={ACCENT_HEX.blue} label={getLeaveTypeInfo(r.leaveType).name.split(' ')[0]} />
                  </div>
                ))}
                {requests.filter(r => r.status === 'approved').length === 0 && <p className={`text-xs text-center py-4 ${t.textFaint}`}>No upcoming time off</p>}
              </div>
            </Panel>
          </div>

          <div className="lg:col-span-2">
            <Panel icon={Plus} title="New Leave Request">
              <div className="px-5 pb-5 pt-3 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <FormField label="Employee Name" required>
                    <SelectField size="form" value={newReq.employeeName} title="Employee Name" onChange={v => {
                      const emp = TEAM_MEMBERS.find(m => m.name === v);
                      set('employeeName', v);
                      if (emp) { set('employeeId', `EMP00${emp.id}`); set('department', emp.department); }
                    }}
                      placeholder="Select employee…"
                      options={TEAM_MEMBERS.map(e => ({ value: e.name, label: `${e.name} — ${e.department}` }))} />
                  </FormField>
                  <FormField label="Employee ID"><input className={`${inputCls} opacity-60`} value={newReq.employeeId} readOnly /></FormField>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <FormField label="Department"><input className={`${inputCls} opacity-60`} value={newReq.department} readOnly /></FormField>
                  <FormField label="Leave Type" required>
                    <SelectField size="form" value={newReq.leaveType} title="Leave Type" onChange={v => set('leaveType', v)}
                      placeholder="Select leave type…"
                      options={LEAVE_TYPES.map(lt => ({ value: lt.id, label: `${lt.icon} ${lt.name} (max ${lt.maxDays}d)` }))} />
                  </FormField>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <FormField label="Start Date" required><input type="date" className={inputCls} value={newReq.startDate} onChange={e => set('startDate', e.target.value)} /></FormField>
                  <FormField label="End Date" required><input type="date" className={inputCls} value={newReq.endDate} onChange={e => set('endDate', e.target.value)} /></FormField>
                  <FormField label="Total Days"><input className={`${inputCls} opacity-60`} value={`${newReq.totalDays}`} readOnly /></FormField>
                </div>
                <FormField label="Reason for Leave" required>
                  <textarea rows={3} value={newReq.reason} onChange={e => set('reason', e.target.value)} placeholder="Please provide details about your leave request…"
                    className={`w-full text-sm rounded-lg px-3 py-2 outline-none transition-colors resize-none ${t.inputBg}`} />
                </FormField>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <FormField label="Emergency Contact"><input className={inputCls} value={newReq.emergencyContact} onChange={e => set('emergencyContact', e.target.value)} placeholder="Phone number for emergencies" /></FormField>
                  <FormField label="Handover Notes"><input className={inputCls} value={newReq.handoverNotes} onChange={e => set('handoverNotes', e.target.value)} placeholder="Work to be covered during leave" /></FormField>
                </div>
                <div className="flex justify-end pt-2">
                  <PrimaryButton icon={Send} onClick={submitRequest}>Submit Leave Request</PrimaryButton>
                </div>
              </div>
            </Panel>
          </div>
        </div>
      )}

      {tab === 'requests' && (
        <Panel icon={FileText} title={`All Requests (${filtered.length})`} actions={
          <>
            <SearchInput value={search} onChange={setSearch} placeholder="Search…" className="w-40" />
            <SelectField size="filter" title="Status" value={filters.status} onChange={v => setFilters(p => ({ ...p, status: v }))}
              options={[{ value: 'all', label: 'All Status' }, { value: 'pending', label: 'Pending' }, { value: 'approved', label: 'Approved' }, { value: 'rejected', label: 'Rejected' }]} />
            <SelectField size="filter" title="Type" value={filters.type} onChange={v => setFilters(p => ({ ...p, type: v }))}
              options={[{ value: 'all', label: 'All Types' }, ...LEAVE_TYPES.map(lt => ({ value: lt.id, label: lt.name }))]} />
            <button type="button" title="List view" onClick={() => setViewMode('list')} className={`h-8 w-8 flex items-center justify-center rounded-lg transition-all ${viewMode === 'list' ? 'bg-brand-500/20 text-brand-400' : `${t.chipBg} ${t.textFaint} ${t.hoverBg}`}`}><List className="h-3.5 w-3.5" /></button>
            <button type="button" title="Grid view" onClick={() => setViewMode('grid')} className={`h-8 w-8 flex items-center justify-center rounded-lg transition-all ${viewMode === 'grid' ? 'bg-brand-500/20 text-brand-400' : `${t.chipBg} ${t.textFaint} ${t.hoverBg}`}`}><Grid3X3 className="h-3.5 w-3.5" /></button>
          </>
        }>
          {filtered.length === 0 ? (
            <EmptyState icon={FileText} title="No requests found" message="No leave requests match your current filters." />
          ) : viewMode === 'list' ? (
            <div>
              {filtered.map(r => {
                const lt = getLeaveTypeInfo(r.leaveType);
                return (
                  <div key={r.id} className={`px-5 py-4 flex items-start gap-4 border-b ${t.border} last:border-0 ${t.hoverBgSoft} transition-colors`}>
                    <Avatar name={r.employeeName} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`font-semibold text-sm ${t.textPrimary}`}>{r.employeeName}</span>
                        <StatusBadge color="#94a3b8" label={r.department} />
                        <StatusBadge color={statusHex(r.status)} label={statusLabel(r.status)} />
                      </div>
                      <div className={`flex items-center gap-3 text-xs flex-wrap ${t.textFaint}`}>
                        <span>{lt.icon} {lt.name}</span><span>{r.startDate} → {r.endDate}</span><span>{r.totalDays} days</span><span>Submitted {r.submittedDate}</span>
                      </div>
                      {r.reason && <p className={`text-xs mt-1 line-clamp-1 ${t.textFaint}`}>{r.reason}</p>}
                      {r.rejectionReason && <p className="text-xs text-red-400 mt-1">{r.rejectionReason}</p>}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button type="button" title="Download PDF" onClick={() => generateLeavePDF(r)} className={`h-7 w-7 flex items-center justify-center rounded-lg ${t.chipBg} ${t.hoverBg} ${t.textFaint} transition-colors`}><Download className="h-3.5 w-3.5" /></button>
                      {r.status === 'pending' && (
                        <>
                          <button type="button" title="Approve" onClick={() => approveRequest(r.id)} className="h-7 w-7 flex items-center justify-center rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition-colors"><CheckCircle className="h-3.5 w-3.5" /></button>
                          <button type="button" title="Reject" onClick={() => rejectRequest(r.id)} className="h-7 w-7 flex items-center justify-center rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors"><XCircle className="h-3.5 w-3.5" /></button>
                        </>
                      )}
                      <button type="button" title="Delete" onClick={() => deleteRequest(r.id)} className="h-7 w-7 flex items-center justify-center rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
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
                  <div key={r.id} className={`${t.chipBg} rounded-xl overflow-hidden`}>
                    <div className={`p-4 flex items-center justify-between border-b ${t.border}`}>
                      <div className="flex items-center gap-2">
                        <Avatar name={r.employeeName} />
                        <div><p className={`font-semibold text-sm ${t.textPrimary}`}>{r.employeeName}</p><p className={`text-[11px] ${t.textFaint}`}>{r.department}</p></div>
                      </div>
                      <StatusBadge color={statusHex(r.status)} label={statusLabel(r.status)} />
                    </div>
                    <div className="p-3 space-y-2 text-xs">
                      <div className="flex items-center justify-between"><span className={t.textMuted}>{lt.icon} {lt.name}</span><StatusBadge color={ACCENT_HEX.blue} label={`${r.totalDays}d`} /></div>
                      <div className={`flex justify-between ${t.textFaint}`}><span>{r.startDate}</span><span>→</span><span>{r.endDate}</span></div>
                      <p className={`line-clamp-2 ${t.textFaint}`}>{r.reason}</p>
                      {r.rejectionReason && <p className="text-red-400 line-clamp-1">{r.rejectionReason}</p>}
                    </div>
                    <div className="px-3 pb-3 flex gap-1.5">
                      <button type="button" title="Download PDF" onClick={() => generateLeavePDF(r)} className={`h-7 w-7 flex items-center justify-center rounded-lg ${t.hoverBg} ${t.textFaint} transition-colors`}><Download className="h-3.5 w-3.5" /></button>
                      {r.status === 'pending' && (
                        <>
                          <button type="button" title="Approve" onClick={() => approveRequest(r.id)} className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-emerald-500/15 text-emerald-400 transition-colors"><CheckCircle className="h-3.5 w-3.5" /></button>
                          <button type="button" title="Reject" onClick={() => rejectRequest(r.id)} className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-rose-500/15 text-rose-400 transition-colors"><XCircle className="h-3.5 w-3.5" /></button>
                        </>
                      )}
                      <button type="button" title="Delete" onClick={() => deleteRequest(r.id)} className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-rose-500/15 text-rose-400 transition-colors ml-auto"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
      )}

      {tab === 'team' && (
        <Panel icon={Users} title="Team Leave Overview">
          <div className="p-4 space-y-3">
            {TEAM_MEMBERS.map(emp => {
              const s = teamStats.find(x => x.employeeId === `EMP00${emp.id}`);
              const used = s?.annualUsed ?? 0;
              return (
                <div key={emp.id} className={`${t.chipBg} rounded-xl p-4`}>
                  <div className="flex items-center justify-between gap-4 mb-3 flex-wrap">
                    <div className="flex items-center gap-3">
                      <Avatar name={emp.name} />
                      <div><p className={`font-semibold text-sm ${t.textPrimary}`}>{emp.name}</p><p className={`text-xs ${t.textFaint}`}>{emp.role} · {emp.department}</p></div>
                    </div>
                    <div className="flex gap-4 text-center">
                      <div><p className="text-lg font-bold text-emerald-400">{s?.annualRemaining ?? 0}</p><p className={`text-[10px] ${t.textFaint}`}>Annual left</p></div>
                      <div><p className="text-lg font-bold text-brand-400">{s?.sickUsed ?? 0}</p><p className={`text-[10px] ${t.textFaint}`}>Sick used</p></div>
                      <div><p className="text-lg font-bold text-purple-400">{s?.personalUsed ?? 0}</p><p className={`text-[10px] ${t.textFaint}`}>Personal</p></div>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className={`flex justify-between text-xs mb-0.5 ${t.textFaint}`}><span>Annual Leave</span><span>{used}/25 days</span></div>
                    <ProgressBar value={(used / 25) * 100} color="#34d399" showValue={false} />
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
      )}

      {tab === 'history' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className={`${t.glass} rounded-xl p-4`}><div className="flex items-center gap-1.5 mb-1"><TrendingUp className="h-3.5 w-3.5 text-emerald-400" /><span className={`text-xs ${t.textFaint}`}>Approval Rate</span></div><div className="text-xl font-bold text-emerald-400">78%</div></div>
            <div className={`${t.glass} rounded-xl p-4`}><div className="flex items-center gap-1.5 mb-1"><CalendarDays className="h-3.5 w-3.5 text-brand-400" /><span className={`text-xs ${t.textFaint}`}>Avg. Days/Employee</span></div><div className={`text-xl font-bold ${t.textPrimary}`}>42</div></div>
            <div className={`${t.glass} rounded-xl p-4`}><div className="flex items-center gap-1.5 mb-1"><BarChart3 className="h-3.5 w-3.5 text-amber-400" /><span className={`text-xs ${t.textFaint}`}>Sick Leave Usage</span></div><div className="text-xl font-bold text-amber-400">15%</div></div>
          </div>
          <Panel icon={History} title="Recent Activity" actions={
            <button type="button" onClick={() => generateTeamReportPDF(teamStats)} className={`flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-xs font-medium ${t.chipBg} ${t.textMuted} ${t.hoverBg} transition-colors`}><Download className="h-3.5 w-3.5" /> Export Report</button>
          }>
            <div>
              {[...requests].sort((a, b) => new Date(b.submittedDate).getTime() - new Date(a.submittedDate).getTime()).slice(0, 5).map(r => (
                <div key={r.id} className={`flex items-center gap-3 px-5 py-3 border-b ${t.border} last:border-0 ${t.hoverBgSoft}`}>
                  <div className={`h-2 w-2 rounded-full shrink-0 ${r.status === 'approved' ? 'bg-emerald-400' : r.status === 'rejected' ? 'bg-red-400' : 'bg-amber-400'}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${t.textMuted}`}>{r.employeeName}</p>
                    <p className={`text-xs ${t.textFaint}`}>{getLeaveTypeInfo(r.leaveType).name} · {r.startDate} → {r.endDate}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-xs font-medium capitalize ${t.textMuted}`}>{r.status}</p>
                    <p className={`text-[10px] ${t.textFaint}`}>{r.submittedDate}</p>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      )}
    </main>
  );
}

export default function LeaveManagementPage() {
  return (
    <AppShell>
      <LeaveManagementContent />
    </AppShell>
  );
}
