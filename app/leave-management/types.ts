// app/leave-management/types.ts — the leave management prototype's data model: the
// leave request and team-stat shapes. Split out of page.tsx as part of the standing
// "decompose on touch" convention. Like quotations.tsx, this page has no backend or
// persistence layer at all — every value is seeded once from hardcoded sample data
// (SAMPLE_REQUESTS/SAMPLE_STATS/TEAM_MEMBERS) — so unlike most other pages in this
// pass, there is no data-fetching hook/api file to extract alongside these types.
// (Note: this is a separate, demo-only route from app/leaves/, the real
// backend-integrated leave management page decomposed earlier in this pass.)

export interface LeaveRequest {
  id: number; employeeName: string; employeeId: string; department: string;
  leaveType: string; startDate: string; endDate: string; totalDays: number;
  reason: string; emergencyContact: string; handoverNotes: string;
  status: 'pending' | 'approved' | 'rejected'; submittedDate: string;
  approvedBy?: string; approvedDate?: string; rejectionReason?: string;
  priority: 'low' | 'medium' | 'high';
}

export interface TeamLeaveStat {
  employeeId: string; name: string; annualUsed: number; annualRemaining: number;
  sickUsed: number; personalUsed: number;
}

export interface Filters { status: string; type: string; department: string; }

export interface NewLeaveRequest {
  employeeName: string; employeeId: string; department: string; leaveType: string;
  startDate: string; endDate: string; totalDays: number; reason: string;
  emergencyContact: string; handoverNotes: string; status: 'pending';
}
