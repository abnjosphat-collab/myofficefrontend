'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';
import {
  ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Search, Download, Plus,
  Clock, Users, Loader2, CheckCircle, XCircle, AlertTriangle,
  CalendarDays, RefreshCw, Zap, Moon, Trash2, FileSpreadsheet,
  FileText, UserPlus, Briefcase, Building2, X, Check,
  LayoutGrid, Layers, Sun,
} from 'lucide-react';
import { PageShell } from '@/components/PageShell';
import { initials as getInitials } from '@/components/shared';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ─────────────────── TYPES ───────────────────

interface Employee {
  id: string;       // internal DB integer used for timesheet employee_id lookups
  employeeId: string; // human-readable: "C1165", "PM517", etc.
  name: string;
  position: string;
  department: string;
  email: string;
  is_active: boolean;
}

interface OvertimePeriodData {
  start_time: string;
  end_time: string;
  overtime_type: '1.5x' | '2.0x';
  overtime_hours?: number;
  nightshift_hours?: number;
  reason?: string;
}

interface TimesheetEntry {
  id?: number;
  employee_id: number;
  date: string;
  start_time?: string;
  end_time?: string;
  regular_hours: number;
  overtime_hours?: number;
  holiday_overtime_hours?: number;
  nightshift_hours?: number;
  standby_allowance?: boolean;
  total_hours?: number;
  status: StatusKey;
  notes?: string;
  overtime_periods?: OvertimePeriodData[];
  callout_overtime_hours?: number;
  callout_count?: number;
}

interface Period { start: Date; end: Date; }

interface EditCell { employee: Employee; date: Date; entry?: TimesheetEntry; }

interface HourTotals {
  reg: number; ot15: number; ot20: number; night: number;
  standbyBonus: number; total: number; excess?: number;
}

type StatusKey = 'work' | 'leave' | 'sick' | 'special_leave' | 'holiday' | 'training' | 'off' | 'absent' | 'weekend';

interface StatusConfig {
  label: string;
  cls: string;        // light badge (for dialogs)
  darkCls: string;    // dark-glass cell colour
  Icon: React.FC<{ className?: string }>;
}

// ─────────────────── STATUS CONFIG ───────────────────

const LEAVE_STATUSES = new Set<StatusKey>(['leave', 'sick', 'special_leave', 'training']);
// Holiday and weekend: employee works, ALL hours → 2.0× column (double time)
const DOUBLE_TIME_STATUSES = new Set<StatusKey>(['holiday', 'weekend']);
const ZERO_HOUR_STATUSES = new Set<StatusKey>(['off', 'absent']);

const STATUS_CFG: Record<StatusKey, StatusConfig> = {
  work:          { label: 'Work',          cls: 'bg-green-100  text-green-800  border-green-200',  darkCls: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300',   Icon: CheckCircle },
  leave:         { label: 'Leave',         cls: 'bg-blue-100   text-blue-800   border-blue-200',   darkCls: 'bg-blue-500/20   border-blue-500/40   text-blue-300',        Icon: CalendarDays },
  sick:          { label: 'Sick',          cls: 'bg-orange-100 text-orange-800 border-orange-200', darkCls: 'bg-orange-500/20 border-orange-500/40 text-orange-300',      Icon: AlertTriangle },
  special_leave: { label: 'Special Leave', cls: 'bg-violet-100 text-violet-800 border-violet-200', darkCls: 'bg-violet-500/20 border-violet-500/40 text-violet-300',     Icon: CalendarDays },
  holiday:       { label: 'Holiday',       cls: 'bg-purple-100 text-purple-800 border-purple-200', darkCls: 'bg-purple-500/20 border-purple-500/40 text-purple-300',     Icon: CalendarDays },
  training:      { label: 'Training',      cls: 'bg-cyan-100   text-cyan-800   border-cyan-200',   darkCls: 'bg-cyan-500/20   border-cyan-500/40   text-cyan-300',        Icon: CalendarDays },
  off:           { label: 'Off',               cls: 'bg-gray-100   text-gray-800   border-gray-200',   darkCls: 'bg-white/5       border-white/10      text-white/30',        Icon: XCircle },
  absent:        { label: 'Absent',            cls: 'bg-red-100    text-red-800    border-red-200',    darkCls: 'bg-red-500/20    border-red-500/40    text-red-300',          Icon: AlertTriangle },
  weekend:       { label: 'Weekend (2.0×)',    cls: 'bg-amber-100  text-amber-800  border-amber-200',  darkCls: 'bg-amber-500/20  border-amber-500/40  text-amber-300',        Icon: Sun },
};

// ─────────────────── HELPERS ───────────────────


const fmtDate = (d: Date) => d.toISOString().split('T')[0];

const calcHours = (start: string, end: string) => {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const s = sh + sm / 60;
  let e = eh + em / 60;
  if (e < s) e += 24;
  return Math.max(0, e - s);
};

const calcNightHours = (start: string, end: string): number => {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const s = sh + sm / 60;
  let e = eh + em / 60;
  if (e <= s) e += 24; // overnight shift
  // Night window: 18:00–06:00 = [0,6] + [18,24] + [24,30]
  const ov = (a: number, b: number) => Math.max(0, Math.min(e, b) - Math.max(s, a));
  return ov(0, 6) + ov(18, 24) + ov(24, 30);
};

const apply208 = (reg: number, ot15: number) =>
  reg <= 208 ? { reg, ot15 } : { reg: 208, ot15: ot15 + (reg - 208) };

const getDays = ({ start, end }: Period) => {
  const days: Date[] = [], d = new Date(start);
  while (d <= end) { days.push(new Date(d)); d.setDate(d.getDate() + 1); }
  return days;
};

const fmtPeriod = ({ start, end }: Period) =>
  `${start.getDate()} ${start.toLocaleString('default', { month: 'short' })} ${start.getFullYear()} — ${end.getDate()} ${end.toLocaleString('default', { month: 'short' })} ${end.getFullYear()}`;

const getSalariedPeriod = (month: Date): Period => {
  const y = month.getFullYear(), m = month.getMonth();
  return { start: new Date(y, m, 1), end: new Date(y, m + 1, 0) };
};

const getNECPeriod = (month: Date): Period => {
  const y = month.getFullYear(), m = month.getMonth();
  return { start: new Date(y, m - 1, 13), end: new Date(y, m, 12) };
};

// ─────────────────── API ───────────────────

const api = {
  async employees(): Promise<Employee[]> {
    const r = await fetch(`${API_BASE}/api/employees`, { headers: { Accept: 'application/json' } });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const data = await r.json() as Record<string, unknown>[];
    return (data || []).map(d => ({
      id: String(d.id || Math.random().toString(36).slice(2)),
      employeeId: (() => {
        const v = String(d.employee_id || '').trim();
        return (v === '' || v.toUpperCase() === 'TBA') ? '' : v;
      })(),
      name: (`${d.first_name || ''} ${d.last_name || ''}`).trim() || 'Employee',
      position: (d.position || d.job_title || d.designation || 'Staff') as string,
      department: (d.department || 'General') as string,
      email: (d.email || '') as string,
      is_active: d.is_active !== false,
    }));
  },

  async timesheets(startDate: string, endDate: string): Promise<TimesheetEntry[]> {
    try {
      const p = new URLSearchParams({ start_date: startDate, end_date: endDate });
      const r = await fetch(`${API_BASE}/api/timesheets?${p}`, { headers: { Accept: 'application/json' } });
      if (!r.ok) return [];
      return (await r.json() as TimesheetEntry[]) || [];
    } catch { return []; }
  },

  async create(data: Omit<TimesheetEntry, 'id'>): Promise<TimesheetEntry> {
    const r = await fetch(`${API_BASE}/api/timesheets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(data),
    });
    if (!r.ok) throw new Error(`${r.status}`);
    const res = await r.json() as { data?: TimesheetEntry } | TimesheetEntry;
    return (res as { data?: TimesheetEntry }).data || (res as TimesheetEntry);
  },

  async update(id: number, data: Partial<TimesheetEntry>): Promise<TimesheetEntry> {
    const r = await fetch(`${API_BASE}/api/timesheets/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(data),
    });
    if (!r.ok) throw new Error(`${r.status}`);
    const res = await r.json() as { data?: TimesheetEntry } | TimesheetEntry;
    return (res as { data?: TimesheetEntry }).data || (res as TimesheetEntry);
  },

  async delete(id: number): Promise<void> {
    const r = await fetch(`${API_BASE}/api/timesheets/${id}`, {
      method: 'DELETE',
      headers: { Accept: 'application/json' },
    });
    if (!r.ok) throw new Error(`${r.status}`);
  },
};

// ─────────────────── COLLAPSIBLE SECTION HEADER ───────────────────

function SectionHeader({
  icon: Icon, title, sub, open, onToggle, children,
}: {
  icon: React.FC<{ className?: string }>;
  title: string;
  sub?: string;
  open: boolean;
  onToggle: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.07]">
      <div className="flex items-center gap-2 flex-wrap">
        <Icon className="h-3.5 w-3.5 text-[#86BBD8] shrink-0" />
        <span className="text-xs font-semibold text-white/80 uppercase tracking-wider">{title}</span>
        {sub && <span className="text-[11px] text-white/35">{sub}</span>}
      </div>
      <div className="flex items-center gap-1.5">
        {children}
        <button
          type="button"
          onClick={onToggle}
          className="h-6 w-6 flex items-center justify-center rounded-md bg-white/[0.07] hover:bg-white/[0.15] text-white/50 border border-white/12 transition-all"
        >
          {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
      </div>
    </div>
  );
}

// ─────────────────── STATUS BADGE ───────────────────

function StatusBadge({ status, dark = false }: { status: StatusKey; dark?: boolean }) {
  const cfg = STATUS_CFG[status] || STATUS_CFG.work;
  const { Icon } = cfg;
  if (dark) {
    return (
      <span className={`inline-flex items-center gap-0.5 border rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${cfg.darkCls}`}>
        <Icon className="w-2 h-2" />{cfg.label}
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-1 border rounded-full px-2 py-0.5 text-[10px] font-medium ${cfg.cls}`}>
      <Icon className="w-2.5 h-2.5" />{cfg.label}
    </span>
  );
}

// ─────────────────── OVERTIME PERIOD ROW ───────────────────

function OvertimePeriod({ period, index, onUpdate, onRemove }: {
  period: OvertimePeriodData;
  index: number;
  onUpdate: (idx: number, val: OvertimePeriodData) => void;
  onRemove: (idx: number) => void;
}) {
  const [start, setStart] = useState(period.start_time || '17:00');
  const [end, setEnd] = useState(period.end_time || '19:00');
  const [type, setType] = useState<'1.5x' | '2.0x'>(period.overtime_type || '1.5x');
  const [reason, setReason] = useState(period.reason || '');

  useEffect(() => {
    if (start && end) onUpdate(index, { start_time: start, end_time: end, overtime_type: type, overtime_hours: calcHours(start, end), nightshift_hours: calcNightHours(start, end), reason });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start, end, type, reason, index]);

  return (
    <div className="p-3 border border-white/10 rounded-lg bg-white/[0.05] space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium text-white/70">OT Period {index + 1}</span>
        <button type="button" title="Remove OT period" onClick={() => onRemove(index)} className="text-red-400 hover:text-red-500 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div><Label className="text-xs text-white/55">Start</Label><Input type="time" value={start} onChange={e => setStart(e.target.value)} className="h-8 text-sm bg-white/[0.07] border-white/10 text-white" /></div>
        <div><Label className="text-xs text-white/55">End</Label><Input type="time" value={end} onChange={e => setEnd(e.target.value)} className="h-8 text-sm bg-white/[0.07] border-white/10 text-white" /></div>
        <div>
          <Label className="text-xs text-white/55">Rate</Label>
          <Select value={type} onValueChange={v => setType(v as '1.5x' | '2.0x')}>
            <SelectTrigger className="h-8 text-xs bg-white/[0.07] border-white/10 text-white"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="1.5x">1.5×</SelectItem><SelectItem value="2.0x">2.0×</SelectItem></SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label className="text-xs text-white/55">Reason / What was this overtime for?</Label>
        <Input placeholder="e.g. Emergency repair, After-hours maintenance…" value={reason} onChange={e => setReason(e.target.value)} className="h-8 text-sm mt-1 bg-white/[0.07] border-white/10 text-white placeholder:text-white/25" />
      </div>
      <div className="flex gap-4 text-xs text-white/50">
        <span>OT: <b className="text-white/70">{calcHours(start, end).toFixed(2)}h</b></span>
        <span><Moon className="w-3 h-3 inline text-indigo-400" /> Night: <b className="text-white/70">{calcNightHours(start, end).toFixed(2)}h</b></span>
      </div>
    </div>
  );
}

// ─────────────────── SINGLE ENTRY DIALOG ───────────────────

interface EntryForm {
  start_time: string; end_time: string; regular_hours: number;
  nightshift_hours: number; status: StatusKey; standby_allowance: boolean;
  notes: string; callout_overtime_hours: number; callout_count: number;
}

const toHr = (t: string) => { const [h, m] = (t || '0:0').split(':').map(Number); return h + m / 60; };
const otPeriodsOverlap = (periods: OvertimePeriodData[]): boolean => {
  for (let i = 0; i < periods.length; i++) {
    for (let j = i + 1; j < periods.length; j++) {
      const aS = toHr(periods[i].start_time);
      let aE = toHr(periods[i].end_time);
      const bS = toHr(periods[j].start_time);
      let bE = toHr(periods[j].end_time);
      if (aE <= aS) aE += 24;
      if (bE <= bS) bE += 24;
      if (aS < bE && bS < aE) return true;
    }
  }
  return false;
};

function TimesheetEntryDialog({ employee, date, entry, onSave, onDelete, onClose }: {
  employee: Employee; date: Date; entry?: TimesheetEntry;
  onSave: (data: Omit<TimesheetEntry, 'id'>) => Promise<void>;
  onDelete?: () => Promise<void>;
  onClose: () => void;
}) {
  const isWeekendDay = date.getDay() === 0 || date.getDay() === 6;
  const defaultStatus: StatusKey = entry?.status || (isWeekendDay ? 'weekend' : 'work');
  const [form, setForm] = useState<EntryForm>({
    start_time: entry?.start_time || '07:00',
    end_time: entry?.end_time || '17:00',
    regular_hours: entry?.regular_hours ?? 10,
    nightshift_hours: entry?.nightshift_hours ?? 0,
    status: defaultStatus,
    standby_allowance: entry?.standby_allowance ?? false,
    notes: entry?.notes || '',
    callout_overtime_hours: entry?.callout_overtime_hours ?? 0,
    callout_count: entry?.callout_count ?? 0,
  });
  const [otPeriods, setOtPeriods] = useState<OvertimePeriodData[]>(Array.isArray(entry?.overtime_periods) ? entry.overtime_periods : []);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (ZERO_HOUR_STATUSES.has(form.status)) return; // off/absent always 0h
    if (form.start_time && form.end_time) {
      setForm(f => ({ ...f, regular_hours: calcHours(f.start_time, f.end_time), nightshift_hours: calcNightHours(f.start_time, f.end_time) }));
    }
  }, [form.start_time, form.end_time, form.status]);

  const handleStatusChange = (val: string) => {
    const s = val as StatusKey;
    if (LEAVE_STATUSES.has(s)) setForm(f => ({ ...f, status: s, start_time: '07:00', end_time: '15:00' }));
    else if (ZERO_HOUR_STATUSES.has(s)) setForm(f => ({ ...f, status: s, regular_hours: 0, nightshift_hours: 0, start_time: '', end_time: '' }));
    else setForm(f => ({ ...f, status: s })); // work, holiday, weekend — keep current times
  };

  const otTotals = useMemo(() => {
    let t15 = 0, t20 = 0, night = 0;
    otPeriods.forEach(p => { const h = calcHours(p.start_time, p.end_time), n = calcNightHours(p.start_time, p.end_time); night += n; if (p.overtime_type === '2.0x') t20 += h; else t15 += h; });
    return { t15, t20, night };
  }, [otPeriods]);

  const total = form.regular_hours + otTotals.t15 + otTotals.t20 + form.nightshift_hours + otTotals.night + form.callout_overtime_hours;

  const handleSave = async () => {
    if (otPeriods.length > 1 && otPeriodsOverlap(otPeriods)) {
      toast.error('Two OT periods overlap — fix the times before saving');
      return;
    }
    setSaving(true);
    try {
      const isDT = DOUBLE_TIME_STATUSES.has(form.status);
      await onSave({
        employee_id: parseInt(employee.id), date: fmtDate(date),
        start_time: form.start_time, end_time: form.end_time,
        // Double-time (holiday / weekend): ALL shift hours → holiday_overtime_hours (2.0×)
        regular_hours: isDT ? 0 : form.regular_hours,
        overtime_hours: isDT ? 0 : otTotals.t15,
        holiday_overtime_hours: isDT
          ? form.regular_hours + otTotals.t15 + otTotals.t20
          : otTotals.t20,
        nightshift_hours: form.nightshift_hours + otTotals.night,
        standby_allowance: form.standby_allowance, total_hours: total,
        status: form.status, notes: form.notes, overtime_periods: otPeriods,
        callout_overtime_hours: form.callout_overtime_hours,
        callout_count: form.callout_count,
      });
      toast.success('Entry saved');
      onClose();
    } catch (e) { toast.error('Failed: ' + (e as Error).message); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    setDeleting(true);
    try { await onDelete(); toast.success('Entry deleted'); onClose(); }
    catch (e) { toast.error('Delete failed: ' + (e as Error).message); }
    finally { setDeleting(false); setConfirmDelete(false); }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto bg-[rgba(5,15,28,0.97)] backdrop-blur-2xl border border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="text-white">Timesheet Entry</DialogTitle>
          <DialogDescription className="text-white/45">
            {employee?.name} — {date?.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {/* Status */}
          <div className="space-y-1.5">
            <Label className="text-white/60">Status</Label>
            <Select value={form.status} onValueChange={handleStatusChange}>
              <SelectTrigger className="bg-white/[0.07] border-white/10 text-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.entries(STATUS_CFG) as [StatusKey, StatusConfig][]).map(([k, c]) => (
                  <SelectItem key={k} value={k}>
                    <span className="flex items-center gap-2"><c.Icon className="w-3.5 h-3.5" />{c.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {LEAVE_STATUSES.has(form.status) && (
              <p className="text-xs text-blue-300 bg-blue-500/15 border border-blue-500/25 rounded px-2 py-1">
                8 hours auto-assigned for {STATUS_CFG[form.status]?.label}
              </p>
            )}
            {DOUBLE_TIME_STATUSES.has(form.status) && (
              <p className="text-xs text-violet-300 bg-violet-500/15 border border-violet-500/25 rounded px-2 py-1 font-medium">
                All hours worked count as <strong>2.0× (double time)</strong> — enter the actual shift times below
              </p>
            )}
            {ZERO_HOUR_STATUSES.has(form.status) && (
              <p className="text-xs text-white/40 bg-white/[0.05] border border-white/10 rounded px-2 py-1">
                0 hours recorded — {STATUS_CFG[form.status]?.label} days are not credited
              </p>
            )}
          </div>

          {/* Shift */}
          <div className="p-3 border border-white/10 rounded-lg bg-white/[0.04] space-y-3">
            <h3 className="font-medium text-sm text-white/80">
              {DOUBLE_TIME_STATUSES.has(form.status) ? '2.0× Shift (all hours @ double time)' : 'Regular Shift'}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs text-white/55">Start</Label><Input type="time" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} className="h-8 bg-white/[0.07] border-white/10 text-white" /></div>
              <div><Label className="text-xs text-white/55">End</Label><Input type="time" value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} className="h-8 bg-white/[0.07] border-white/10 text-white" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className={`rounded p-2 text-center border ${DOUBLE_TIME_STATUSES.has(form.status) ? 'bg-violet-500/10 border-violet-500/20' : 'bg-emerald-500/10 border-emerald-500/20'}`}>
                <div className="text-xs text-white/40">{DOUBLE_TIME_STATUSES.has(form.status) ? '2.0× h' : 'Regular'}</div>
                <div className={`font-bold ${DOUBLE_TIME_STATUSES.has(form.status) ? 'text-violet-300' : 'text-emerald-300'}`}>{form.regular_hours.toFixed(2)}h</div>
              </div>
              <div className="bg-indigo-500/10 border border-indigo-500/20 rounded p-2 text-center"><div className="text-xs text-white/40"><Moon className="w-3 h-3 inline" /> Night</div><div className="font-bold text-indigo-300">{form.nightshift_hours.toFixed(2)}h</div></div>
            </div>
          </div>

          {/* Overtime */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <h3 className="font-medium text-sm text-white/80">Overtime Periods</h3>
              <Button type="button" variant="outline" size="sm" className="h-7 text-xs border-white/15 text-white/70 hover:bg-white/[0.08] bg-transparent"
                onClick={() => setOtPeriods(p => [...p, { start_time: '17:00', end_time: '19:00', overtime_type: '1.5x' }])}>
                <Plus className="w-3 h-3 mr-1" /> Add OT
              </Button>
            </div>
            {otPeriods.length === 0
              ? <p className="text-xs text-white/30 text-center py-2 border border-dashed border-white/10 rounded">No overtime</p>
              : otPeriods.map((p, i) => (
                <OvertimePeriod key={i} period={p} index={i}
                  onUpdate={(idx, val) => setOtPeriods(prev => prev.map((x, j) => j === idx ? { ...x, ...val } : x))}
                  onRemove={idx => setOtPeriods(prev => prev.filter((_, j) => j !== idx))} />
              ))
            }
            {otPeriods.length > 0 && (
              <div className="grid grid-cols-3 gap-2 p-2 bg-white/[0.04] border border-white/10 rounded text-center text-xs">
                <div><div className="text-white/40">1.5×</div><div className="font-bold text-orange-400">{otTotals.t15.toFixed(2)}h</div></div>
                <div><div className="text-white/40">2.0×</div><div className="font-bold text-violet-400">{otTotals.t20.toFixed(2)}h</div></div>
                <div><div className="text-white/40">Night OT</div><div className="font-bold text-indigo-400">{otTotals.night.toFixed(2)}h</div></div>
              </div>
            )}
          </div>

          <div className="flex justify-between items-center p-3 bg-[#86BBD8]/10 border border-[#86BBD8]/20 rounded-lg">
            <span className="font-semibold text-sm text-white/80">Total Hours</span>
            <span className="text-xl font-bold text-[#86BBD8]">{total.toFixed(2)}h</span>
          </div>

          {/* Callout OT */}
          <div className="p-3 border border-orange-500/20 rounded-lg bg-orange-500/[0.08] space-y-2">
            <h3 className="font-medium text-sm text-orange-300">Callout Overtime</h3>
            <p className="text-xs text-orange-300/70">Hours worked when phoned in after hours / off-site callout</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-white/55">Callout Hours</Label>
                <Input type="number" min={0} step={0.5} value={form.callout_overtime_hours}
                  onChange={e => setForm(f => ({ ...f, callout_overtime_hours: parseFloat(e.target.value) || 0 }))}
                  className="h-8 mt-1 text-sm bg-white/[0.07] border-white/10 text-white" />
              </div>
              <div>
                <Label className="text-xs text-white/55">Number of Callouts</Label>
                <Input type="number" min={0} step={1} value={form.callout_count}
                  onChange={e => setForm(f => ({ ...f, callout_count: parseInt(e.target.value) || 0 }))}
                  className="h-8 mt-1 text-sm bg-white/[0.07] border-white/10 text-white" />
              </div>
            </div>
          </div>

          {/* Standby */}
          <div className="flex items-center justify-between p-3 bg-amber-500/[0.08] rounded-lg border border-amber-500/20">
            <div>
              <Label className="font-medium text-sm text-amber-300">Standby Allowance</Label>
              <p className="text-xs text-white/40">Adds 8h OT per consecutive standby day (max 7)</p>
            </div>
            <Switch checked={form.standby_allowance} onCheckedChange={v => setForm(f => ({ ...f, standby_allowance: v }))} />
          </div>

          <div><Label className="text-xs text-white/55">Notes</Label><Input placeholder="Optional…" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="h-8 text-sm bg-white/[0.07] border-white/10 text-white placeholder:text-white/25" /></div>
        </div>

        {/* Delete confirmation banner */}
        {confirmDelete && (
          <div className="mx-6 mb-2 flex items-center justify-between gap-2 p-3 bg-red-500/10 border border-red-500/25 rounded-lg">
            <span className="text-sm text-red-400 font-medium">Delete this entry permanently?</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="border-white/15 text-white/70 hover:bg-white/[0.08] bg-transparent" onClick={() => setConfirmDelete(false)}>Cancel</Button>
              <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white" onClick={handleDelete} disabled={deleting}>
                {deleting && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}Delete
              </Button>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          {onDelete && !confirmDelete && (
            <Button variant="outline" size="sm" className="mr-auto text-red-400 border-red-500/25 hover:bg-red-500/10 bg-transparent"
              onClick={() => setConfirmDelete(true)}>
              <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete entry
            </Button>
          )}
          <Button variant="outline" className="border-white/15 text-white/70 hover:bg-white/[0.08] bg-transparent" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-[#2A4D69] hover:bg-[#2A4D69]/90 text-white border border-[#86BBD8]/25">{saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────── BULK ASSIGN DIALOG ───────────────────

interface BulkAssignDialogProps {
  initialEmployee: Employee;
  allEmployees: Employee[];
  period: Period;
  timesheets: TimesheetEntry[];
  onSave: (entries: Omit<TimesheetEntry, 'id'>[]) => Promise<void>;
  onClose: () => void;
}

function BulkAssignDialog({ initialEmployee, allEmployees, period, timesheets, onSave, onClose }: BulkAssignDialogProps) {
  const allDays = getDays(period);

  // ── Employee selection ──
  const [selectedEmpIds, setSelectedEmpIds] = useState<Set<string>>(new Set([initialEmployee.id]));
  const toggleEmp = (id: string) => setSelectedEmpIds(s => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const toggleAllEmps = () => selectedEmpIds.size === allEmployees.length
    ? setSelectedEmpIds(new Set([initialEmployee.id]))
    : setSelectedEmpIds(new Set(allEmployees.map(e => e.id)));

  // ── Date selection ──
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  const [anchor, setAnchor] = useState<string | null>(null);
  const [hoverDate, setHoverDate] = useState<string | null>(null);

  // ── Shift settings ──
  const [status, setStatus] = useState<StatusKey>('work');
  const [startTime, setStartTime] = useState('07:00');
  const [endTime, setEndTime] = useState('17:00');
  const [skipWeekends, setSkipWeekends] = useState(false);
  const [standby, setStandby] = useState(false);
  const [rangeFrom, setRangeFrom] = useState(fmtDate(period.start));
  const [rangeTo, setRangeTo] = useState(fmtDate(period.end));

  // ── Status after apply (stays open) ──
  const [saving, setSaving] = useState(false);
  const [lastApplied, setLastApplied] = useState<{ days: number; emps: number } | null>(null);

  const shiftPresets: Array<{ label: string; from: string; to: string }> = [
    { label: '7–5 (10h)', from: '07:00', to: '17:00' },
    { label: '7–4 (9h)',  from: '07:00', to: '16:00' },
    { label: '6–6 (12h)', from: '06:00', to: '18:00' },
    { label: '7–3 (8h)',  from: '07:00', to: '15:00' },
    { label: 'Night',     from: '18:00', to: '06:00' },
  ];

  const regHours = LEAVE_STATUSES.has(status) ? 8 : ZERO_HOUR_STATUSES.has(status) ? 0 : calcHours(startTime, endTime);
  const nightHours = (LEAVE_STATUSES.has(status) || ZERO_HOUR_STATUSES.has(status)) ? 0 : calcNightHours(startTime, endTime);

  const previewRange = useMemo((): Set<string> => {
    if (!anchor || !hoverDate) return new Set();
    const a = anchor < hoverDate ? anchor : hoverDate;
    const b = anchor < hoverDate ? hoverDate : anchor;
    return new Set(allDays.filter(d => { const ds = fmtDate(d); return ds >= a && ds <= b; }).map(fmtDate));
  }, [anchor, hoverDate, allDays]);

  const handleDayClick = (ds: string) => {
    const day = allDays.find(d => fmtDate(d) === ds)!;
    if (skipWeekends && (day.getDay() === 0 || day.getDay() === 6)) return;
    if (!anchor) {
      setAnchor(ds);
      setSelectedDates(s => { const n = new Set(s); if (n.has(ds)) n.delete(ds); else n.add(ds); return n; });
    } else {
      const a = anchor < ds ? anchor : ds, b = anchor < ds ? ds : anchor;
      const range = allDays.filter(d => { const x = fmtDate(d); return x >= a && x <= b && (!skipWeekends || (d.getDay() !== 0 && d.getDay() !== 6)); }).map(fmtDate);
      setSelectedDates(s => { const n = new Set(s); range.forEach(x => n.add(x)); return n; });
      setAnchor(null); setHoverDate(null);
    }
  };

  const selectRange = (from: string, to: string) => {
    const dates = allDays.filter(d => { const ds = fmtDate(d); return ds >= from && ds <= to && (!skipWeekends || (d.getDay() !== 0 && d.getDay() !== 6)); }).map(fmtDate);
    setSelectedDates(s => { const n = new Set(s); dates.forEach(x => n.add(x)); return n; });
    setAnchor(null);
  };

  const quickSelects = [
    { label: 'Weekdays', action: () => { setSkipWeekends(true); setSelectedDates(new Set(allDays.filter(d => d.getDay() !== 0 && d.getDay() !== 6).map(fmtDate))); } },
    { label: 'Week 1',   action: () => selectRange(fmtDate(allDays[0]), fmtDate(allDays[Math.min(6,  allDays.length - 1)])) },
    { label: 'Week 2',   action: () => selectRange(fmtDate(allDays[Math.min(7,  allDays.length - 1)]), fmtDate(allDays[Math.min(13, allDays.length - 1)])) },
    { label: 'Week 3',   action: () => selectRange(fmtDate(allDays[Math.min(14, allDays.length - 1)]), fmtDate(allDays[Math.min(20, allDays.length - 1)])) },
    { label: 'Week 4',   action: () => selectRange(fmtDate(allDays[Math.min(21, allDays.length - 1)]), fmtDate(allDays[allDays.length - 1])) },
    { label: 'All',      action: () => setSelectedDates(new Set(allDays.filter(d => !skipWeekends || (d.getDay() !== 0 && d.getDay() !== 6)).map(fmtDate))) },
    { label: 'Clear ×',  action: () => { setSelectedDates(new Set()); setAnchor(null); } },
  ];

  // Apply but keep dialog open
  const handleApply = async () => {
    if (selectedDates.size === 0) { toast.error('Select at least one date'); return; }
    if (selectedEmpIds.size === 0) { toast.error('Select at least one employee'); return; }
    setSaving(true);
    try {
      const entries: Omit<TimesheetEntry, 'id'>[] = [];
      const isDT = DOUBLE_TIME_STATUSES.has(status);
      selectedEmpIds.forEach(eid => {
        [...selectedDates].sort().forEach(ds => {
          entries.push({
            employee_id: parseInt(eid), date: ds,
            start_time: LEAVE_STATUSES.has(status) ? '07:00' : ZERO_HOUR_STATUSES.has(status) ? '' : startTime,
            end_time:   LEAVE_STATUSES.has(status) ? '15:00' : ZERO_HOUR_STATUSES.has(status) ? '' : endTime,
            // Double-time: all shift hours → 2.0× column
            regular_hours: isDT ? 0 : regHours,
            overtime_hours: 0,
            holiday_overtime_hours: isDT ? regHours : 0,
            nightshift_hours: nightHours, standby_allowance: standby,
            total_hours: regHours + nightHours, status, notes: '',
            overtime_periods: [], callout_overtime_hours: 0, callout_count: 0,
          });
        });
      });
      await onSave(entries);
      setLastApplied({ days: selectedDates.size, emps: selectedEmpIds.size });
      // Clear calendar selection but keep employees + shift settings — ready for next batch
      setSelectedDates(new Set());
      setAnchor(null);
    } catch (e) { toast.error('Failed: ' + (e as Error).message); }
    finally { setSaving(false); }
  };

  const today = fmtDate(new Date());
  const totalEntries = selectedDates.size * selectedEmpIds.size;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[92vh] flex flex-col overflow-hidden bg-[rgba(5,15,28,0.97)] backdrop-blur-2xl border border-white/10 text-white">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2 text-white"><Layers className="w-4 h-4" /> Bulk Assign Shifts</DialogTitle>
          <DialogDescription className="text-white/45">{fmtPeriod(period)}</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-2 pr-1">

          {/* ── Last-applied confirmation banner ── */}
          {lastApplied && (
            <div className="flex items-center gap-2 px-3 py-2 bg-emerald-500/15 border border-emerald-500/25 rounded-lg text-sm text-emerald-300">
              <CheckCircle className="w-4 h-4 shrink-0" />
              Applied {lastApplied.days} day{lastApplied.days !== 1 ? 's' : ''} × {lastApplied.emps} employee{lastApplied.emps !== 1 ? 's' : ''} — select more days to continue
            </div>
          )}

          {/* ── Employee chips ── */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold uppercase tracking-wide text-white/45">Employees ({selectedEmpIds.size} selected)</Label>
              <button type="button" onClick={toggleAllEmps} className="text-xs text-[#86BBD8] hover:underline">
                {selectedEmpIds.size === allEmployees.length ? 'Deselect all' : 'Select all'}
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-1">
              {allEmployees.map(emp => {
                const sel = selectedEmpIds.has(emp.id);
                return (
                  <button key={emp.id} type="button" onClick={() => toggleEmp(emp.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                      sel ? 'bg-[#2A4D69] border-[#86BBD8]/30 text-white' : 'border-white/15 text-white/50 hover:border-[#86BBD8]/30 hover:bg-white/[0.06]'
                    }`}>
                    <Avatar className="h-4 w-4 shrink-0">
                      <AvatarFallback className="text-[8px] bg-white/10 text-white/60">{getInitials(emp.name)}</AvatarFallback>
                    </Avatar>
                    {emp.name}
                    {sel && <Check className="w-3 h-3 opacity-70" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Shift settings ── */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-white/55">Status</Label>
              <Select value={status} onValueChange={v => setStatus(v as StatusKey)}>
                <SelectTrigger className="h-9 bg-white/[0.07] border-white/10 text-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.entries(STATUS_CFG) as [StatusKey, StatusConfig][]).map(([k, c]) => (
                    <SelectItem key={k} value={k}><span className="flex items-center gap-2"><c.Icon className="w-3.5 h-3.5" />{c.label}</span></SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-white/55">Shift Preset</Label>
              <div className="flex flex-wrap gap-1">
                {shiftPresets.map(p => (
                  <button key={p.label} type="button" onClick={() => { setStartTime(p.from); setEndTime(p.to); }}
                    className={`text-[11px] px-2 py-1 rounded border transition-colors ${startTime === p.from && endTime === p.to ? 'bg-[#2A4D69] border-[#86BBD8]/30 text-white font-semibold' : 'border-white/15 text-white/50 hover:bg-white/[0.06]'}`}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {!LEAVE_STATUSES.has(status) && !ZERO_HOUR_STATUSES.has(status) && (
            <div className="grid grid-cols-3 gap-3 p-3 bg-white/[0.04] rounded-lg border border-white/10">
              <div><Label className="text-xs text-white/55">Start</Label><Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="h-8 mt-1 bg-white/[0.07] border-white/10 text-white" /></div>
              <div><Label className="text-xs text-white/55">End</Label><Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="h-8 mt-1 bg-white/[0.07] border-white/10 text-white" /></div>
              <div className="flex flex-col justify-center">
                <span className="text-xs text-white/40">Per day/person</span>
                <span className="text-xl font-bold text-emerald-300">{regHours.toFixed(1)}h</span>
                {nightHours > 0 && <span className="text-xs text-indigo-400">{nightHours.toFixed(1)}h night</span>}
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-white/60 cursor-pointer select-none">
              <input type="checkbox" checked={skipWeekends} onChange={e => setSkipWeekends(e.target.checked)} className="rounded" />
              Skip weekends
            </label>
            <label className="flex items-center gap-2 text-sm text-white/60 cursor-pointer select-none">
              <input type="checkbox" checked={standby} onChange={e => setStandby(e.target.checked)} className="rounded" />
              Standby (8h OT/consecutive day)
            </label>
          </div>

          {/* ── Quick-select + from/to ── */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-white/40 uppercase tracking-wide">Date Quick Select</Label>
            <div className="flex flex-wrap gap-1.5">
              {quickSelects.map(q => (
                <button key={q.label} type="button" onClick={q.action}
                  className={`text-xs px-2.5 py-1 rounded-lg border transition-colors font-medium ${
                    q.label === 'Clear ×' ? 'border-red-500/30 text-red-400 hover:bg-red-500/10' : 'border-[#86BBD8]/25 text-[#86BBD8]/70 hover:bg-[#86BBD8]/10'
                  }`}>
                  {q.label}
                </button>
              ))}
            </div>
            <div className="flex items-end gap-2 p-2.5 bg-white/[0.04] rounded-lg border border-white/10">
              <div className="flex-1"><Label className="text-xs text-white/55">From</Label><Input type="date" value={rangeFrom} min={fmtDate(period.start)} max={fmtDate(period.end)} onChange={e => setRangeFrom(e.target.value)} className="h-8 text-sm mt-1 bg-white/[0.07] border-white/10 text-white" /></div>
              <div className="flex-1"><Label className="text-xs text-white/55">To</Label><Input type="date" value={rangeTo} min={fmtDate(period.start)} max={fmtDate(period.end)} onChange={e => setRangeTo(e.target.value)} className="h-8 text-sm mt-1 bg-white/[0.07] border-white/10 text-white" /></div>
              <Button type="button" variant="outline" size="sm" className="h-8 shrink-0 border-[#86BBD8]/25 text-[#86BBD8]/70 hover:bg-[#86BBD8]/10 bg-transparent" onClick={() => selectRange(rangeFrom, rangeTo)}>Add Range</Button>
            </div>
          </div>

          {/* ── Calendar ── */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Label className="text-sm font-semibold text-white/80">Calendar</Label>
                {anchor
                  ? <span className="text-xs bg-amber-500/15 text-amber-300 border border-amber-500/25 rounded-full px-2 py-0.5">Click a 2nd day to fill range</span>
                  : <span className="text-xs text-white/30">1st click = anchor · 2nd click = fill range</span>
                }
              </div>
              {anchor && <button type="button" onClick={() => { setAnchor(null); setHoverDate(null); }} className="text-xs text-white/40 hover:text-red-400 transition-colors">Cancel range</button>}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                <div key={d} className="text-center text-[10px] font-semibold text-white/30 py-1">{d}</div>
              ))}
              {Array.from({ length: allDays[0].getDay() }).map((_, i) => <div key={`b${i}`} />)}
              {allDays.map(day => {
                const ds = fmtDate(day);
                const isWknd = day.getDay() === 0 || day.getDay() === 6;
                const disabled = skipWeekends && isWknd;
                const sel = selectedDates.has(ds);
                const isAnchor = anchor === ds;
                const inPreview = previewRange.has(ds) && !sel;
                const hasEntry = [...selectedEmpIds].some(eid => timesheets.some(t => String(t.employee_id) === String(eid) && t.date === ds));
                return (
                  <button key={ds} type="button" disabled={disabled}
                    onClick={() => handleDayClick(ds)}
                    onMouseEnter={() => anchor && setHoverDate(ds)}
                    onMouseLeave={() => anchor && setHoverDate(null)}
                    className={`relative h-10 w-full rounded-lg text-sm font-medium transition-all border select-none ${
                      disabled  ? 'opacity-20 cursor-not-allowed border-transparent' :
                      isAnchor  ? 'bg-amber-500 border-amber-500 text-white shadow-lg ring-2 ring-amber-400/50 ring-offset-1 ring-offset-[#050f1c]' :
                      sel       ? 'bg-[#2A4D69] border-[#86BBD8]/30 text-white shadow-md' :
                      inPreview ? 'bg-[#86BBD8]/15 border-[#86BBD8]/30 text-[#86BBD8]' :
                      isWknd    ? 'border-white/[0.07] text-white/20 hover:bg-white/[0.04]' :
                                  'border-white/[0.07] text-white/60 hover:bg-white/[0.06] hover:border-white/15'
                    } ${ds === today ? 'ring-2 ring-[#86BBD8]/50 ring-offset-1 ring-offset-[#050f1c]' : ''}`}>
                    {day.getDate()}
                    {hasEntry && !sel && !inPreview && <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-emerald-400" />}
                    {sel && !isAnchor && <Check className="absolute top-0.5 right-0.5 w-2.5 h-2.5 text-white/70" />}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between text-xs text-white/35 pt-1">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-[#2A4D69] border border-[#86BBD8]/30 inline-block" /> Selected</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-500 inline-block" /> Anchor</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-[#86BBD8]/15 border border-[#86BBD8]/30 inline-block" /> Preview</span>
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" /> Has entry</span>
              </div>
              <span className="font-semibold text-white/50">
                {selectedDates.size} days × {selectedEmpIds.size} emp = <span className="text-[#86BBD8]">{totalEntries} entries</span>
                {totalEntries > 0 && regHours > 0 && ` · ${(regHours * totalEntries).toFixed(0)}h total`}
              </span>
            </div>
          </div>
        </div>

        {/* ── Footer: Apply (stays open) + Done (closes) ── */}
        <div className="shrink-0 flex items-center justify-between gap-2 pt-3 border-t border-white/10 mt-2">
          <Button variant="outline" className="border-white/15 text-white/70 hover:bg-white/[0.08] bg-transparent" onClick={onClose}>Done</Button>
          <Button onClick={handleApply} disabled={saving || totalEntries === 0}
            className="bg-[#2A4D69] hover:bg-[#2A4D69]/90 text-white border border-[#86BBD8]/25">
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Apply {totalEntries > 0 ? `${totalEntries} entr${totalEntries !== 1 ? 'ies' : 'y'}` : '—'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────── BULK ADD EMPLOYEES DIALOG ───────────────────

function BulkAddEmployeesDialog({ allEmployees, currentIds, onAdd, onClose }: {
  allEmployees: Employee[]; currentIds: string[];
  onAdd: (emps: Employee[]) => void; onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(new Set<string>());

  const filtered = useMemo(() =>
    allEmployees.filter(e => !currentIds.includes(e.id) &&
      (!search || e.name.toLowerCase().includes(search.toLowerCase()) || e.department.toLowerCase().includes(search.toLowerCase()))),
    [allEmployees, currentIds, search]);

  const toggle = (id: string) => setSelected(s => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const toggleAll = () => selected.size === filtered.length ? setSelected(new Set()) : setSelected(new Set(filtered.map(e => e.id)));
  const handleAdd = () => {
    if (selected.size === 0) { toast.error('Select at least one employee'); return; }
    onAdd(allEmployees.filter(e => selected.has(e.id)));
    toast.success(`${selected.size} employee${selected.size > 1 ? 's' : ''} added`);
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[80vh] flex flex-col bg-[rgba(5,15,28,0.97)] backdrop-blur-2xl border border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white"><UserPlus className="w-4 h-4" /> Add Employees</DialogTitle>
          <DialogDescription className="text-white/45">Select employees to add to this timesheet period</DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
          <Input placeholder="Search…" className="pl-9 h-8 text-sm bg-white/[0.07] border-white/10 text-white placeholder:text-white/25" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex items-center justify-between text-xs text-white/35 px-1">
          <span>{filtered.length} available · {selected.size} selected</span>
          <button type="button" onClick={toggleAll} className="text-[#86BBD8] hover:underline">
            {selected.size === filtered.length && filtered.length > 0 ? 'Deselect all' : 'Select all'}
          </button>
        </div>
        <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
          {filtered.length === 0
            ? <p className="text-xs text-white/30 text-center py-8">{allEmployees.length === 0 ? 'Loading…' : 'No employees available'}</p>
            : filtered.map(emp => (
              <button key={emp.id} type="button" onClick={() => toggle(emp.id)}
                className={`w-full flex items-center gap-3 p-2.5 rounded-lg border text-left transition-colors ${selected.has(emp.id) ? 'bg-[#2A4D69]/40 border-[#86BBD8]/25' : 'hover:bg-white/[0.05] border-transparent'}`}>
                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${selected.has(emp.id) ? 'bg-[#2A4D69] border-[#86BBD8]/40' : 'border-white/20'}`}>
                  {selected.has(emp.id) && <Check className="w-2.5 h-2.5 text-white" />}
                </div>
                <Avatar className="h-7 w-7 flex-shrink-0"><AvatarFallback className="text-[10px] bg-[#2A4D69]/50 text-[#86BBD8]">{getInitials(emp.name)}</AvatarFallback></Avatar>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate text-white/85">{emp.name}</div>
                  <div className="text-[10px] text-white/35 truncate">{emp.position} · {emp.department}</div>
                </div>
              </button>
            ))
          }
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" className="border-white/15 text-white/70 hover:bg-white/[0.08] bg-transparent" onClick={onClose}>Cancel</Button>
          <Button onClick={handleAdd} disabled={selected.size === 0} className="bg-[#2A4D69] hover:bg-[#2A4D69]/90 text-white border border-[#86BBD8]/25">Add {selected.size > 0 ? selected.size : ''} Employee{selected.size !== 1 ? 's' : ''}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────── DOWNLOAD DIALOG ───────────────────

interface RowData { day: string; date: string; status: string; start: string; end: string; reg: string; ot15: string; ot20: string; night: string; notes: string; }

function DownloadDialog({ employees, timesheets, period, periodType, onClose }: {
  employees: Employee[]; timesheets: TimesheetEntry[];
  period: Period; periodType: string; onClose: () => void;
}) {
  const [format, setFormat] = useState<'excel' | 'pdf'>('excel');
  const [scope, setScope] = useState<'combined' | 'individual'>('combined');
  const [empId, setEmpId] = useState('');
  const [generating, setGenerating] = useState(false);
  const days = getDays(period);

  const getEntry = (eid: string, d: Date) => timesheets.find(t => String(t.employee_id) === String(eid) && t.date === fmtDate(d));

  const calcTotals = (eid: string): HourTotals => {
    let reg = 0, ot15 = 0, ot20 = 0, night = 0, standbyBonus = 0, consecutive = 0;
    timesheets.filter(t => String(t.employee_id) === String(eid))
      .sort((a, b) => a.date.localeCompare(b.date))
      .forEach(e => {
        reg += e.regular_hours || 0; night += e.nightshift_hours || 0;
        if (e.status === 'holiday') ot20 += (e.overtime_hours || 0) + (e.holiday_overtime_hours || 0);
        else { ot15 += e.overtime_hours || 0; ot20 += e.holiday_overtime_hours || 0; }
        if (e.standby_allowance) { consecutive++; if (consecutive <= 7) standbyBonus += 8; } else consecutive = 0;
      });
    const a = apply208(reg, ot15);
    ot15 = a.ot15 + standbyBonus;
    return { reg: a.reg, ot15, ot20, night, standbyBonus, total: a.reg + ot15 + ot20 + night };
  };

  const buildRows = (emp: Employee): RowData[] => days.map(day => {
    const e = getEntry(emp.id, day);
    return { day: day.toLocaleDateString('en-GB', { weekday: 'short' }), date: fmtDate(day), status: e ? STATUS_CFG[e.status]?.label || e.status : '—', start: e?.start_time || '—', end: e?.end_time || '—', reg: e?.regular_hours?.toFixed(2) || '0.00', ot15: e?.overtime_hours?.toFixed(2) || '0.00', ot20: e?.holiday_overtime_hours?.toFixed(2) || '0.00', night: e?.nightshift_hours?.toFixed(2) || '0.00', notes: e?.notes || '' };
  });

  const statusAbbr = (s: string) => ({ work: '', leave: 'Lv', sick: 'Sick', special_leave: 'SL', holiday: 'Hol', training: 'Trn', off: 'Off', absent: 'Abs' }[s] ?? s);
  const dayCell = (e: TimesheetEntry | undefined, d: Date): string | number => {
    if (!e) return d.getDay() === 0 || d.getDay() === 6 ? '·' : '';
    if (ZERO_HOUR_STATUSES.has(e.status as StatusKey)) return statusAbbr(e.status);
    if (LEAVE_STATUSES.has(e.status as StatusKey)) return statusAbbr(e.status);
    return e.regular_hours || 0;
  };

  const downloadExcel = async () => {
    const { default: ExcelJS } = await import('exceljs');
    const wb = new ExcelJS.Workbook(); wb.creator = 'Ozech MyOffice';
    const targets = scope === 'combined' ? employees : employees.filter(e => String(e.id) === String(empId));

    if (scope === 'combined') {
      // ── SUMMARY MATRIX — one row per employee ──────────────────────
      const ws = wb.addWorksheet('Timesheet Summary');
      // cols: Employee | Emp # | Position | [days…] | Reg | OT1.5× | OT2.0× | Night | Total
      const FIXED_COLS = 3;
      const SUM_COLS = 5;
      const totalCols = FIXED_COLS + days.length + SUM_COLS;
      ws.views = [{ state: 'frozen', xSplit: FIXED_COLS, ySplit: 3 }];

      const FONT = 'Calibri';
      // Harmonious blue palette for summary columns
      const SUM_FILLS  = ['FFE8F4FD', 'FFD0E8F5', 'FFB8D9F0', 'FF9AC9EB', 'FF2A4D69'];
      const SUM_COLORS = ['FF1E3A5F', 'FF1E3A5F', 'FF1E3A5F', 'FF1E3A5F', 'FFFFFFFF'];

      // Title
      ws.mergeCells(1, 1, 1, totalCols);
      const titleCell = ws.getCell(1, 1);
      titleCell.value = `TIMESHEET SUMMARY — ${periodType.toUpperCase()} — ${fmtPeriod(period)}`;
      titleCell.font = { name: FONT, bold: true, size: 14, color: { argb: 'FF2A4D69' } };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      ws.getRow(1).height = 24;
      ws.addRow([]);

      // Header row
      const hdrRow = ws.getRow(3);
      hdrRow.values = [
        'Employee', 'Emp #', 'Position',
        ...days.map(d => `${d.getDate()}\n${d.toLocaleDateString('en-GB', { weekday: 'short' })}`),
        'Reg h', 'OT 1.5×', 'OT 2.0×', 'Night h', 'Total h',
      ];
      hdrRow.height = 32;
      hdrRow.eachCell({ includeEmpty: true }, (c, col) => {
        const isSumCol = col > FIXED_COLS + days.length;
        const isFixedCol = col <= FIXED_COLS;
        c.font = { name: FONT, bold: true, size: 8, color: { argb: 'FFFFFFFF' } };
        c.fill = {
          type: 'pattern', pattern: 'solid',
          fgColor: { argb: isFixedCol ? 'FF1A3450' : isSumCol ? 'FF163554' : 'FF2A4D69' },
        };
        c.alignment = { horizontal: isFixedCol ? 'left' : 'center', vertical: 'middle', wrapText: !isFixedCol };
        c.border = { bottom: { style: 'medium', color: { argb: 'FF86BBD8' } } };
      });

      // Status fill colours for day cells
      const STATUS_FILL: Record<string, string> = {
        work: 'FFE8F8F0', leave: 'FFE8E4F8', sick: 'FFF8E4EE', special_leave: 'FFF0E8F8',
        holiday: 'FFF8EEE4', training: 'FFF8F4E4', off: 'FFF2F4F6', absent: 'FFF8E8E8',
      };

      targets.forEach((emp, ei) => {
        const totals = calcTotals(emp.id);
        const empIdDisplay = emp.employeeId || '';
        const rowVals: (string | number)[] = [emp.name, empIdDisplay, emp.position || ''];
        days.forEach(day => rowVals.push(dayCell(getEntry(emp.id, day), day)));
        rowVals.push(totals.reg, totals.ot15, totals.ot20, totals.night, totals.total);

        const dataRow = ws.getRow(4 + ei);
        dataRow.values = rowVals;
        // Force emp # cell to text so ExcelJS never coerces it to a number or date
        const empIdCell = dataRow.getCell(2);
        empIdCell.value = empIdDisplay || '—';
        empIdCell.numFmt = '@';
        dataRow.height = 15;
        const stripe = ei % 2 !== 0;

        dataRow.eachCell({ includeEmpty: true }, (c, col) => {
          c.font = { name: FONT, size: 8 };
          c.alignment = { horizontal: col <= FIXED_COLS ? 'left' : 'center', vertical: 'middle' };
          if (col <= FIXED_COLS) {
            c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: stripe ? 'FFF5F8FB' : 'FFFFFFFF' } };
            if (col === 2) c.font = { name: FONT, size: 8, color: { argb: 'FF4A6F8A' } };
          }
        });

        // Day cell fills
        days.forEach((day, di) => {
          const e = getEntry(emp.id, day);
          const cell = dataRow.getCell(FIXED_COLS + 1 + di);
          const isWknd = day.getDay() === 0 || day.getDay() === 6;
          if (e) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: STATUS_FILL[e.status] || (stripe ? 'FFF5F8FB' : 'FFFFFFFF') } };
            if (LEAVE_STATUSES.has(e.status as StatusKey) || ZERO_HOUR_STATUSES.has(e.status as StatusKey))
              cell.font = { name: FONT, size: 7, italic: true, color: { argb: 'FF4A6F8A' } };
          } else {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isWknd ? 'FFE8EDF2' : stripe ? 'FFF5F8FB' : 'FFFFFFFF' } };
            if (isWknd) cell.font = { name: FONT, size: 8, color: { argb: 'FFBBC8D4' } };
          }
        });

        // Summary cells — harmonious blue gradient
        [0, 1, 2, 3, 4].forEach(si => {
          const c = dataRow.getCell(FIXED_COLS + 1 + days.length + si);
          c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SUM_FILLS[si] } };
          c.font = { name: FONT, size: 8, bold: si === 4, color: { argb: SUM_COLORS[si] } };
          c.numFmt = '0.00';
          c.alignment = { horizontal: 'center', vertical: 'middle' };
        });
      });

      // Grand total row
      const gtRow = ws.getRow(4 + targets.length + 1);
      gtRow.values = [
        'TOTALS', '', `${targets.length} employees`,
        ...days.map(() => ''),
        targets.reduce((s, e) => s + calcTotals(e.id).reg, 0),
        targets.reduce((s, e) => s + calcTotals(e.id).ot15, 0),
        targets.reduce((s, e) => s + calcTotals(e.id).ot20, 0),
        targets.reduce((s, e) => s + calcTotals(e.id).night, 0),
        targets.reduce((s, e) => s + calcTotals(e.id).total, 0),
      ];
      gtRow.height = 20;
      gtRow.eachCell({ includeEmpty: true }, (c, col) => {
        const isSumCol = col > FIXED_COLS + days.length;
        c.font = { name: FONT, bold: true, size: 8, color: { argb: isSumCol ? 'FFFFFFFF' : 'FF1E3A5F' } };
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isSumCol ? 'FF2A4D69' : 'FFD0E8F5' } };
        c.alignment = { horizontal: col <= FIXED_COLS ? 'left' : 'center', vertical: 'middle' };
        if (isSumCol) c.numFmt = '0.00';
        c.border = { top: { style: 'medium', color: { argb: 'FF86BBD8' } } };
      });

      // Column widths
      ws.getColumn(1).width = 24; // Employee
      ws.getColumn(2).width = 9;  // Emp #
      ws.getColumn(3).width = 16; // Position
      for (let i = 0; i < days.length; i++) ws.getColumn(FIXED_COLS + 1 + i).width = 5.5;
      [10, 10, 10, 10, 11].forEach((w, i) => { ws.getColumn(FIXED_COLS + 1 + days.length + i).width = w; });

    } else {
      // ── INDIVIDUAL DETAIL — one sheet per employee ─────────────────
      targets.forEach(emp => {
        const ws = wb.addWorksheet(emp.name.slice(0, 31));
        const totals = calcTotals(emp.id);
        ws.mergeCells('A1:J1'); ws.getCell('A1').value = `TIMESHEET — ${periodType.toUpperCase()} PERIOD`;
        ws.getCell('A1').font = { bold: true, size: 14, color: { argb: 'FF2A4D69' } };
        ws.mergeCells('A2:J2'); ws.getCell('A2').value = `${emp.name} | ${fmtPeriod(period)}`;
        ws.getCell('A2').font = { bold: true, size: 11 };
        ws.addRow([]);
        const hdr = ws.addRow(['Day', 'Date', 'Status', 'Start', 'End', 'Regular', 'OT 1.5×', 'OT 2.0×', 'Night', 'Notes']);
        hdr.eachCell(c => { c.font = { bold: true, color: { argb: 'FFFFFFFF' } }; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2A4D69' } }; c.alignment = { horizontal: 'center' }; });
        buildRows(emp).forEach((row, i) => {
          const r = ws.addRow([row.day, row.date, row.status, row.start, row.end, +row.reg, +row.ot15, +row.ot20, +row.night, row.notes]);
          if (i % 2 === 1) r.eachCell(c => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F7FA' } }; });
        });
        ws.addRow([]);
        const tr = ws.addRow(['TOTALS', '', '', '', '', totals.reg.toFixed(2), totals.ot15.toFixed(2), totals.ot20.toFixed(2), totals.night.toFixed(2), `Grand: ${totals.total.toFixed(2)}h${totals.standbyBonus > 0 ? ` (incl. ${totals.standbyBonus}h standby OT)` : ''}`]);
        tr.eachCell(c => { c.font = { bold: true }; });
        ws.columns = [{ width: 6 }, { width: 13 }, { width: 15 }, { width: 8 }, { width: 8 }, { width: 10 }, { width: 10 }, { width: 10 }, { width: 10 }, { width: 35 }];
      });
    }

    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `timesheet-${periodType}-${fmtDate(period.start)}.xlsx`; a.click(); URL.revokeObjectURL(url);
  };

  const downloadPDF = async () => {
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');
    const targets = scope === 'combined' ? employees : employees.filter(e => String(e.id) === String(empId));
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const BRAND: [number, number, number] = [42, 77, 105];

    if (scope === 'combined') {
      // ── SUMMARY MATRIX PAGE ────────────────────────────────────────
      doc.setFillColor(...BRAND); doc.rect(0, 0, 297, 16, 'F');
      doc.setTextColor(255, 255, 255); doc.setFontSize(11);
      doc.text(`TIMESHEET SUMMARY — ${periodType.toUpperCase()} — ${fmtPeriod(period)}`, 10, 10);
      doc.setFontSize(8); doc.text(`${targets.length} employees · Generated ${new Date().toLocaleDateString('en-GB')}`, 10, 14);

      const dayW = Math.min(5.5, (277 - 35 - 20 - 55) / days.length);
      const colStyles: Record<number, { cellWidth: number; halign?: 'center' | 'left' }> = {
        0: { cellWidth: 35, halign: 'left' },
        1: { cellWidth: 20, halign: 'left' },
      };
      days.forEach((_, i) => { colStyles[2 + i] = { cellWidth: dayW, halign: 'center' }; });
      [0, 1, 2, 3, 4].forEach(si => { colStyles[2 + days.length + si] = { cellWidth: 11, halign: 'center' }; });

      const head = [['Employee', 'Position', ...days.map(d => `${d.getDate()}`), 'Reg', 'OT\n1.5×', 'OT\n2.0×', 'Night', 'Total']];
      const body = targets.map(emp => {
        const totals = calcTotals(emp.id);
        return [
          emp.name, emp.position || '',
          ...days.map(day => { const v = dayCell(getEntry(emp.id, day), day); return v === 0 ? '' : String(v); }),
          totals.reg.toFixed(1), totals.ot15.toFixed(1), totals.ot20.toFixed(1), totals.night.toFixed(1), totals.total.toFixed(1),
        ];
      });
      // Grand total row
      body.push([
        'TOTALS', `${targets.length} emp`,
        ...days.map(() => ''),
        targets.reduce((s, e) => s + calcTotals(e.id).reg, 0).toFixed(1),
        targets.reduce((s, e) => s + calcTotals(e.id).ot15, 0).toFixed(1),
        targets.reduce((s, e) => s + calcTotals(e.id).ot20, 0).toFixed(1),
        targets.reduce((s, e) => s + calcTotals(e.id).night, 0).toFixed(1),
        targets.reduce((s, e) => s + calcTotals(e.id).total, 0).toFixed(1),
      ]);

      autoTable(doc, {
        startY: 20,
        head,
        body,
        styles: { fontSize: 6, cellPadding: 1, overflow: 'ellipsize' },
        headStyles: { fillColor: BRAND, textColor: 255, fontStyle: 'bold', cellPadding: 1.2 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: colStyles,
        didParseCell: d => {
          if (d.section === 'body' && d.row.index === targets.length) {
            d.cell.styles.fontStyle = 'bold'; d.cell.styles.fillColor = [208, 232, 245];
          }
          // Shade weekend columns lightly
          const col = d.column.index;
          if (col >= 2 && col < 2 + days.length) {
            const day = days[col - 2];
            if (day && (day.getDay() === 0 || day.getDay() === 6) && d.section === 'body' && d.row.index < targets.length) {
              d.cell.styles.fillColor = [236, 240, 243];
            }
          }
        },
      });

    } else {
      // ── INDIVIDUAL DETAIL — one page per employee ──────────────────
      targets.forEach((emp, ei) => {
        if (ei > 0) doc.addPage();
        const totals = calcTotals(emp.id); const rows = buildRows(emp);
        doc.setFillColor(...BRAND); doc.rect(0, 0, 297, 18, 'F');
        doc.setTextColor(255, 255, 255); doc.setFontSize(12); doc.text('TIMESHEET', 10, 7);
        doc.setFontSize(9); doc.text(`${periodType.toUpperCase()} — ${fmtPeriod(period)}`, 10, 13);
        doc.setFontSize(11); doc.text(emp.name, 287, 10, { align: 'right' });
        autoTable(doc, {
          startY: 22,
          head: [['Day', 'Date', 'Status', 'Start', 'End', 'Reg', 'OT 1.5×', 'OT 2.0×', 'Night', 'Notes']],
          body: [...rows.map(r => [r.day, r.date, r.status, r.start, r.end, r.reg, r.ot15, r.ot20, r.night, r.notes]), ['TOTALS', '', '', '', '', totals.reg.toFixed(2), totals.ot15.toFixed(2), totals.ot20.toFixed(2), totals.night.toFixed(2), `Total: ${totals.total.toFixed(2)}h`]],
          styles: { fontSize: 7.5, cellPadding: 1.5 },
          headStyles: { fillColor: BRAND, textColor: 255, fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          columnStyles: { 0: { cellWidth: 10 }, 1: { cellWidth: 22 }, 2: { cellWidth: 20 }, 3: { cellWidth: 14 }, 4: { cellWidth: 14 }, 5: { cellWidth: 16 }, 6: { cellWidth: 16 }, 7: { cellWidth: 16 }, 8: { cellWidth: 16 }, 9: { cellWidth: 'auto' } },
          didParseCell: d => { if (d.row.index === rows.length) { d.cell.styles.fontStyle = 'bold'; d.cell.styles.fillColor = [230, 244, 234]; } },
        });
      });
    }
    doc.save(`timesheet-${periodType}-${fmtDate(period.start)}.pdf`);
  };

  const generate = async () => {
    if (scope === 'individual' && !empId) { toast.error('Select an employee'); return; }
    setGenerating(true);
    try { if (format === 'excel') await downloadExcel(); else await downloadPDF(); toast.success('Downloaded'); onClose(); }
    catch (e) { toast.error('Download failed: ' + (e as Error).message); }
    finally { setGenerating(false); }
  };

  const fmtOpts: Array<['excel' | 'pdf', string, React.FC<{ className?: string }>]> = [['excel', 'Excel (.xlsx)', FileSpreadsheet], ['pdf', 'PDF', FileText]];
  const scopeOpts: Array<['combined' | 'individual', string, React.FC<{ className?: string }>]> = [['combined', `All (${employees.length})`, Users], ['individual', 'One employee', Building2]];

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm bg-[rgba(5,15,28,0.97)] backdrop-blur-2xl border border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white"><Download className="w-4 h-4" /> Download Timesheet</DialogTitle>
          <DialogDescription className="text-white/45">{fmtPeriod(period)}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2"><Label className="text-xs font-semibold uppercase tracking-wide text-white/40">Format</Label>
            <div className="grid grid-cols-2 gap-2">{fmtOpts.map(([val, lbl, Icon]) => (<button key={val} type="button" onClick={() => setFormat(val)} className={`flex items-center gap-2 p-3 border-2 rounded-lg text-sm transition-colors ${format === val ? 'border-[#86BBD8]/50 bg-[#86BBD8]/10 text-[#86BBD8]' : 'border-white/10 text-white/50 hover:border-white/20 hover:bg-white/[0.04]'}`}><Icon className="w-4 h-4" />{lbl}</button>))}</div>
          </div>
          <div className="space-y-2"><Label className="text-xs font-semibold uppercase tracking-wide text-white/40">Scope</Label>
            <div className="grid grid-cols-2 gap-2">{scopeOpts.map(([val, lbl, Icon]) => (<button key={val} type="button" onClick={() => setScope(val)} className={`flex items-center gap-2 p-3 border-2 rounded-lg text-sm transition-colors ${scope === val ? 'border-[#86BBD8]/50 bg-[#86BBD8]/10 text-[#86BBD8]' : 'border-white/10 text-white/50 hover:border-white/20 hover:bg-white/[0.04]'}`}><Icon className="w-4 h-4" />{lbl}</button>))}</div>
          </div>
          {scope === 'individual' && (
            <div className="space-y-1.5"><Label className="text-xs text-white/55">Employee</Label>
              <Select value={empId} onValueChange={setEmpId}><SelectTrigger className="h-9 text-sm bg-white/[0.07] border-white/10 text-white"><SelectValue placeholder="Select…" /></SelectTrigger><SelectContent>{employees.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent></Select>
            </div>
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" className="border-white/15 text-white/70 hover:bg-white/[0.08] bg-transparent" onClick={onClose}>Cancel</Button>
          <Button onClick={generate} disabled={generating} className="bg-[#2A4D69] hover:bg-[#2A4D69]/90 text-white border border-[#86BBD8]/25">{generating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Download</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────── TIMESHEET GRID ───────────────────

function calcTotals(empId: string, timesheets: TimesheetEntry[]): HourTotals {
  let reg = 0, ot15 = 0, ot20 = 0, night = 0, standbyBonus = 0, consecutive = 0;
  timesheets.filter(t => String(t.employee_id) === String(empId))
    .sort((a, b) => a.date.localeCompare(b.date))
    .forEach(e => {
      reg += e.regular_hours || 0; night += e.nightshift_hours || 0;
      if (DOUBLE_TIME_STATUSES.has(e.status as StatusKey)) {
        // holiday / weekend: all stored hours are 2.0×
        ot20 += (e.regular_hours || 0) + (e.overtime_hours || 0) + (e.holiday_overtime_hours || 0);
        reg -= e.regular_hours || 0; // remove from reg (it was already added above)
      } else {
        ot15 += e.overtime_hours || 0;
        ot20 += e.holiday_overtime_hours || 0;
      }
      if (e.standby_allowance) { consecutive++; if (consecutive <= 7) standbyBonus += 8; } else consecutive = 0;
    });
  const a = apply208(reg, ot15);
  ot15 = a.ot15 + standbyBonus;
  return { reg: a.reg, ot15, ot20, night, standbyBonus, total: a.reg + ot15 + ot20 + night, excess: Math.max(0, reg - 208) };
}

function TimesheetGrid({ employees, timesheets, days, onCellClick, onBulkAssign, onRemoveEmployee }: {
  employees: Employee[]; timesheets: TimesheetEntry[]; days: Date[];
  onCellClick: (emp: Employee, day: Date, entry?: TimesheetEntry) => void;
  onBulkAssign: (emp: Employee) => void;
  onRemoveEmployee: (id: string) => void;
}) {
  const getEntry = (eid: string, d: Date) => timesheets.find(t => String(t.employee_id) === String(eid) && t.date === fmtDate(d));
  const today = fmtDate(new Date());
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

  if (employees.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Users className="w-10 h-10 text-white/20 mb-3" />
        <p className="text-white/50 font-medium">No employees in this period</p>
        <p className="text-xs text-white/30 mt-1">Click &quot;Add Employees&quot; to get started</p>
      </div>
    );
  }

  return (
    <Table containerClassName="overflow-auto max-h-[calc(100vh-260px)]">
        <TableHeader>
          <TableRow className="border-white/[0.07] hover:bg-transparent">
            {/* Corner cell — sticky on both axes */}
            <TableHead className="min-w-52 sticky left-0 top-0 z-30 bg-[#040c18] border-r border-white/[0.07] text-white/60">Employee</TableHead>
            {days.map(d => {
              const ds = fmtDate(d);
              const isWknd = d.getDay() === 0 || d.getDay() === 6;
              return (
                <TableHead key={ds} className={`text-center min-w-[70px] px-0.5 sticky top-0 z-20 bg-[#040c18] ${isWknd ? '!bg-[#07101c]' : ''}`}>
                  <div className="flex flex-col items-center text-[9px] py-1">
                    <span className="text-white/30">{d.toLocaleDateString('default', { weekday: 'short' })}</span>
                    <span className={`font-bold text-sm ${ds === today ? 'text-[#86BBD8]' : isWknd ? 'text-white/25' : 'text-white/70'}`}>{d.getDate()}</span>
                    <span className="text-white/20">{d.toLocaleDateString('default', { month: 'short' })}</span>
                  </div>
                </TableHead>
              );
            })}
            <TableHead className="text-center min-w-14 text-emerald-400/80 text-[10px] font-semibold sticky top-0 z-20 bg-[#040c18]">Reg</TableHead>
            <TableHead className="text-center min-w-14 text-[#86BBD8]/80 text-[10px] font-semibold sticky top-0 z-20 bg-[#040c18]">1.5×</TableHead>
            <TableHead className="text-center min-w-14 text-[#5B9EC9]/80 text-[10px] font-semibold sticky top-0 z-20 bg-[#040c18]">2.0×</TableHead>
            <TableHead className="text-center min-w-14 text-[#3A7CA5]/80 text-[10px] font-semibold sticky top-0 z-20 bg-[#040c18]">Night</TableHead>
            <TableHead className="text-center min-w-16 text-white/70 text-[10px] font-semibold sticky top-0 z-20 bg-[#040c18]">Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {employees.map(emp => {
            const totals = calcTotals(emp.id, timesheets);
            return (
              <TableRow key={emp.id} className="border-white/[0.05] hover:bg-white/[0.03] group/row">
                {/* sticky MUST NOT have `relative` on the same element — move relative to inner div */}
                <TableCell className="sticky left-0 z-10 bg-[#040c18] border-r border-white/[0.07] py-0 group/emp">
                  <div className="relative py-2">
                  {/* Remove — 2-click confirm pattern */}
                  {confirmRemoveId === emp.id ? (
                    <div className="absolute top-1 right-1 flex items-center gap-0.5 bg-[#0d1f35] border border-red-500/30 rounded-lg px-1.5 py-1 z-20">
                      <span className="text-[9px] text-red-400 mr-0.5">Remove?</span>
                      <button type="button" title="Confirm remove" onClick={() => { onRemoveEmployee(emp.id); setConfirmRemoveId(null); }}
                        className="h-4 w-4 flex items-center justify-center rounded bg-red-500/20 text-red-400 hover:bg-red-500/40 transition-all">
                        <Check className="w-2.5 h-2.5" />
                      </button>
                      <button type="button" title="Cancel" onClick={() => setConfirmRemoveId(null)}
                        className="h-4 w-4 flex items-center justify-center rounded bg-white/[0.07] text-white/40 hover:bg-white/[0.15] transition-all">
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ) : (
                    <button type="button" title="Remove employee from this period"
                      onClick={() => setConfirmRemoveId(emp.id)}
                      className="absolute top-1.5 right-1.5 h-5 w-5 flex items-center justify-center rounded-full opacity-0 group-hover/emp:opacity-100 bg-red-500/[0.08] border border-red-500/20 text-red-400/50 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/35 transition-all duration-150">
                      <X className="w-2.5 h-2.5" />
                    </button>
                  )}
                  <div className="flex items-center gap-2 pr-5">
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarFallback className="text-[10px] bg-[#2A4D69]/50 text-[#86BBD8]">{getInitials(emp.name)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-white/85 truncate leading-tight">{emp.name}</p>
                      <p className="text-[10px] text-white/35 truncate mt-0.5">{emp.position}</p>
                      <button type="button" title="Bulk assign shifts for this employee"
                        onClick={() => onBulkAssign(emp)}
                        className="mt-1.5 flex items-center gap-1 text-[10px] px-2 py-[3px] rounded-full bg-[#86BBD8]/10 border border-[#86BBD8]/20 text-[#86BBD8]/55 hover:bg-[#86BBD8]/20 hover:text-[#86BBD8] hover:border-[#86BBD8]/40 transition-all duration-150 group/bulk">
                        <CalendarDays className="w-2.5 h-2.5 group-hover/bulk:scale-110 transition-transform" />
                        <span className="tracking-wide">Assign shifts</span>
                      </button>
                    </div>
                  </div>
                  </div>{/* end relative py-2 */}
                </TableCell>
                {days.map(day => {
                  const ds = fmtDate(day);
                  const entry = getEntry(emp.id, day);
                  const isWknd = day.getDay() === 0 || day.getDay() === 6;
                  const isToday = ds === today;
                  const cfg = entry ? STATUS_CFG[entry.status] : null;
                  return (
                    <TableCell key={ds} className={`text-center p-0.5 ${isWknd ? 'bg-white/[0.02]' : ''}`}>
                      <div className="relative group/cell">
                        <button type="button"
                          className={`w-full min-h-[60px] h-auto rounded-lg text-center flex flex-col items-center justify-center transition-all text-[9px] border gap-0.5 py-1.5 ${
                            entry && cfg
                              ? `${cfg.darkCls} hover:brightness-125`
                              : isToday
                              ? 'bg-[#86BBD8]/10 border-[#86BBD8]/30 border-dashed hover:bg-[#86BBD8]/20'
                              : 'border-transparent hover:bg-white/[0.07] hover:border-white/10'
                          } ${isToday ? 'ring-1 ring-[#86BBD8]/30' : ''}`}
                          onClick={() => onCellClick(emp, day, entry)}>
                          {entry && cfg ? (
                            <>
                              <StatusBadge status={entry.status} dark />
                              {!ZERO_HOUR_STATUSES.has(entry.status) && (() => {
                                const isDT = DOUBLE_TIME_STATUSES.has(entry.status as StatusKey);
                                const displayH = isDT
                                  ? (entry.holiday_overtime_hours || 0)
                                  : (entry.regular_hours || 0);
                                return displayH > 0
                                  ? <span className={`font-bold ${isDT ? 'text-amber-300' : 'text-white/80'}`}>{displayH.toFixed(1)}h{isDT ? ' ×2' : ''}</span>
                                  : null;
                              })()}
                              {!DOUBLE_TIME_STATUSES.has(entry.status as StatusKey) && (entry.overtime_hours || 0) > 0 && <span className="text-[#86BBD8] font-semibold">+{entry.overtime_hours!.toFixed(1)} OT</span>}
                              {(entry.nightshift_hours || 0) > 0 && <span className="text-[#5B9EC9] text-[8px]"><Moon className="w-2 h-2 inline -mt-px" />{entry.nightshift_hours!.toFixed(1)}n</span>}
                              {entry.standby_allowance && <span className="text-amber-400 text-[8px] font-medium">SB</span>}
                            </>
                          ) : (
                            <span className={`text-base font-light ${isToday ? 'text-[#86BBD8]/50' : 'text-white/15'}`}>+</span>
                          )}
                        </button>
                        {/* Hover tooltip */}
                        {entry && (
                          <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover/cell:block z-50 min-w-[130px]">
                            <div className="bg-[#071220] border border-white/15 rounded-lg px-2.5 py-2 text-left shadow-xl">
                              <p className="text-[10px] font-semibold text-white/80 mb-1">{STATUS_CFG[entry.status]?.label}</p>
                              {entry.start_time && <p className="text-[9px] text-white/45">{entry.start_time} – {entry.end_time}</p>}
                              {!ZERO_HOUR_STATUSES.has(entry.status) && (
                                <div className="mt-1 space-y-0.5">
                                  {DOUBLE_TIME_STATUSES.has(entry.status as StatusKey)
                                    ? <p className="text-[9px] text-amber-400 font-semibold">{((entry.holiday_overtime_hours||0)+(entry.regular_hours||0)).toFixed(1)}h @ 2.0×</p>
                                    : <p className="text-[9px] text-emerald-400">{(entry.regular_hours||0).toFixed(1)}h reg</p>
                                  }
                                  {!DOUBLE_TIME_STATUSES.has(entry.status as StatusKey) && (entry.overtime_hours||0) > 0 && <p className="text-[9px] text-[#86BBD8]">+{entry.overtime_hours!.toFixed(1)}h OT 1.5×</p>}
                                  {(entry.nightshift_hours||0) > 0 && <p className="text-[9px] text-[#5B9EC9]">{entry.nightshift_hours!.toFixed(1)}h night</p>}
                                  {(entry.callout_overtime_hours||0) > 0 && <p className="text-[9px] text-orange-400">{entry.callout_overtime_hours!.toFixed(1)}h callout</p>}
                                </div>
                              )}
                              {entry.standby_allowance && <p className="text-[9px] text-amber-400 mt-0.5">Standby</p>}
                              {entry.notes && <p className="text-[9px] text-white/30 mt-1 italic truncate max-w-[120px]">{entry.notes}</p>}
                            </div>
                            <div className="w-2 h-2 bg-[#071220] border-b border-r border-white/15 rotate-45 mx-auto -mt-1" />
                          </div>
                        )}
                      </div>
                    </TableCell>
                  );
                })}
                {/* Totals */}
                <TableCell className="text-center py-2">
                  <div className="text-sm font-bold text-emerald-400">{totals.reg.toFixed(1)}</div>
                  {(totals.excess || 0) > 0 && <div className="text-[9px] text-[#86BBD8]">+{totals.excess!.toFixed(1)}→OT</div>}
                </TableCell>
                <TableCell className="text-center py-2">
                  <div className="text-sm font-bold text-[#86BBD8]">{totals.ot15.toFixed(1)}</div>
                  {totals.standbyBonus > 0 && <div className="text-[9px] text-amber-400">+{totals.standbyBonus}SB</div>}
                </TableCell>
                <TableCell className="text-center py-2 text-sm font-bold text-[#5B9EC9]">{totals.ot20.toFixed(1)}</TableCell>
                <TableCell className="text-center py-2 text-sm font-bold text-[#3A7CA5]">{totals.night.toFixed(1)}</TableCell>
                <TableCell className="text-center py-2">
                  <span className="text-base font-bold text-white/90">{totals.total.toFixed(1)}</span>
                </TableCell>
              </TableRow>
            );
          })}
          {/* ── Grand totals footer ── */}
          {employees.length > 0 && (() => {
            const grand = employees.reduce((acc, emp) => {
              const t = calcTotals(emp.id, timesheets);
              return { reg: acc.reg + t.reg, ot15: acc.ot15 + t.ot15, ot20: acc.ot20 + t.ot20, night: acc.night + t.night, total: acc.total + t.total };
            }, { reg: 0, ot15: 0, ot20: 0, night: 0, total: 0 });
            return (
              <TableRow className="border-t-2 border-white/20 bg-white/[0.06] hover:bg-white/[0.08]">
                <TableCell className="sticky left-0 z-10 bg-[#071220] border-r border-white/[0.07] py-3">
                  <div className="flex items-center gap-2 px-1">
                    <Users className="w-3.5 h-3.5 text-[#86BBD8]/60 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-white/70 uppercase tracking-wider">Period Totals</p>
                      <p className="text-[10px] text-white/30">{employees.length} employees</p>
                    </div>
                  </div>
                </TableCell>
                {days.map(day => {
                  const daySum = employees.reduce((s, emp) => {
                    const e = timesheets.find(t => String(t.employee_id) === String(emp.id) && t.date === fmtDate(day));
                    return s + (e?.regular_hours || 0) + (e?.overtime_hours || 0);
                  }, 0);
                  const isWknd = day.getDay() === 0 || day.getDay() === 6;
                  return (
                    <TableCell key={fmtDate(day)} className={`text-center p-0.5 ${isWknd ? 'bg-white/[0.01]' : ''}`}>
                      {daySum > 0 && <span className="text-[9px] text-white/35 font-medium">{daySum.toFixed(0)}</span>}
                    </TableCell>
                  );
                })}
                <TableCell className="text-center py-3"><span className="text-sm font-bold text-emerald-400">{grand.reg.toFixed(1)}</span></TableCell>
                <TableCell className="text-center py-3"><span className="text-sm font-bold text-[#86BBD8]">{grand.ot15.toFixed(1)}</span></TableCell>
                <TableCell className="text-center py-3"><span className="text-sm font-bold text-[#5B9EC9]">{grand.ot20.toFixed(1)}</span></TableCell>
                <TableCell className="text-center py-3"><span className="text-sm font-bold text-[#3A7CA5]">{grand.night.toFixed(1)}</span></TableCell>
                <TableCell className="text-center py-3"><span className="text-base font-extrabold text-white">{grand.total.toFixed(1)}</span></TableCell>
              </TableRow>
            );
          })()}
        </TableBody>
    </Table>
  );
}

// ─────────────────── localStorage ───────────────────

const LS_SALARIED = 'ts_salaried_ids';
const LS_NEC = 'ts_nec_ids';
const readLS = (key: string): string[] => { try { return JSON.parse(localStorage.getItem(key) || '[]') as string[]; } catch { return []; } };
const writeLS = (key: string, val: string[]) => localStorage.setItem(key, JSON.stringify(val));

// ─────────────────── MAIN PAGE ───────────────────

export default function TimesheetsPage() {
  const [activeTab, setActiveTab] = useState<'salaried' | 'nec'>('salaried');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [salaryIds, setSalaryIds] = useState<string[]>(() => readLS(LS_SALARIED));
  const [necIds, setNecIds] = useState<string[]>(() => readLS(LS_NEC));
  const [timesheets, setTimesheets] = useState<TimesheetEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'dept'>('name');

  // Collapse state
  const [showHeroStats, setShowHeroStats] = useState(true);
  const [showPeriod, setShowPeriod] = useState(true);
  const [showGrid, setShowGrid] = useState(true);

  // Dialogs
  const [editCell, setEditCell] = useState<EditCell | null>(null);
  const [showBulkAdd, setShowBulkAdd] = useState(false);
  const [showDownload, setShowDownload] = useState(false);
  const [bulkEmployee, setBulkEmployee] = useState<Employee | null>(null);

  const salariedPeriod = useMemo(() => getSalariedPeriod(currentMonth), [currentMonth]);
  const necPeriod = useMemo(() => getNECPeriod(currentMonth), [currentMonth]);
  const activePeriod = activeTab === 'salaried' ? salariedPeriod : necPeriod;
  const days = useMemo(() => getDays(activePeriod), [activePeriod]);

  const tabIds = activeTab === 'salaried' ? salaryIds : necIds;
  const setTabIds = useCallback((ids: string[]) => {
    if (activeTab === 'salaried') { setSalaryIds(ids); writeLS(LS_SALARIED, ids); }
    else { setNecIds(ids); writeLS(LS_NEC, ids); }
  }, [activeTab]);

  const tabEmployees = useMemo(() => {
    const q = search.toLowerCase();
    return allEmployees
      .filter(e => tabIds.includes(e.id) && (!q ||
        e.name.toLowerCase().includes(q) ||
        e.position.toLowerCase().includes(q) ||
        e.department.toLowerCase().includes(q)))
      .sort((a, b) => sortBy === 'dept'
        ? (a.department.localeCompare(b.department) || a.name.localeCompare(b.name))
        : a.name.localeCompare(b.name));
  }, [allEmployees, tabIds, search, sortBy]);

  const summary = useMemo(() => {
    const tot = tabEmployees.reduce((acc, e) => {
      const t = calcTotals(e.id, timesheets);
      return { reg: acc.reg + t.reg, ot15: acc.ot15 + t.ot15, ot20: acc.ot20 + t.ot20, night: acc.night + t.night, standbyBonus: acc.standbyBonus + t.standbyBonus };
    }, { reg: 0, ot15: 0, ot20: 0, night: 0, standbyBonus: 0 });
    const filled = new Set(timesheets.filter(t => tabIds.includes(String(t.employee_id))).map(t => `${t.employee_id}:${t.date}`)).size;
    const workingDays = days.filter(d => d.getDay() !== 0 && d.getDay() !== 6).length;
    const possible = tabEmployees.length * workingDays;
    return { ...tot, filled, possible };
  }, [timesheets, tabEmployees, tabIds, days]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [emps, sheets] = await Promise.all([api.employees(), api.timesheets(fmtDate(activePeriod.start), fmtDate(activePeriod.end))]);
      setAllEmployees(emps);
      setTimesheets(sheets);
    } catch (e) { toast.error('Failed to load: ' + (e as Error).message); }
    finally { setLoading(false); }
  }, [activePeriod]);

  useEffect(() => { load(); }, [load]);

  const handleSaveEntry = async (empId: string, date: Date, data: Omit<TimesheetEntry, 'id'>) => {
    const ds = fmtDate(date);
    const existing = timesheets.find(t => String(t.employee_id) === String(empId) && t.date === ds);
    if (existing?.id) {
      const updated = await api.update(existing.id, data);
      setTimesheets(prev => prev.map(t => t.id === existing.id ? { ...t, ...updated } : t));
    } else {
      const created = await api.create(data);
      setTimesheets(prev => [...prev, created]);
    }
  };

  const handleDeleteEntry = async (entryId: number) => {
    await api.delete(entryId);
    setTimesheets(prev => prev.filter(t => t.id !== entryId));
  };

  const handleCopyPreviousPeriod = async () => {
    const prevMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
    const prevPeriod = activeTab === 'salaried' ? getSalariedPeriod(prevMonth) : getNECPeriod(prevMonth);
    const prevDays = getDays(prevPeriod);
    const curDays = getDays(activePeriod);
    try {
      const prevSheets = await api.timesheets(fmtDate(prevPeriod.start), fmtDate(prevPeriod.end));
      const entries: Omit<TimesheetEntry, 'id'>[] = [];
      tabEmployees.forEach(emp => {
        curDays.forEach((curDay, idx) => {
          if (idx >= prevDays.length) return;
          const prev = prevSheets.find(t => String(t.employee_id) === String(emp.id) && t.date === fmtDate(prevDays[idx]));
          if (prev) entries.push({ ...prev, employee_id: parseInt(emp.id), date: fmtDate(curDay), id: undefined } as Omit<TimesheetEntry, 'id'>);
        });
      });
      if (entries.length === 0) { toast.info('No entries found in previous period'); return; }
      await handleBulkSave(entries);
      toast.success(`Copied ${entries.length} entries from previous period`);
    } catch (e) { toast.error('Copy failed: ' + (e as Error).message); }
  };

  // Per-employee period notes (persisted in localStorage)
  const notesKey = `ts_notes_${activeTab}_${fmtDate(activePeriod.start)}`;
  const [empNotes, setEmpNotes] = useState<Record<string, string>>(() => {
    try { return JSON.parse(localStorage.getItem(notesKey) || '{}') as Record<string, string>; } catch { return {}; }
  });
  const updateEmpNote = (empId: string, note: string) => {
    const next = { ...empNotes, [empId]: note };
    setEmpNotes(next);
    localStorage.setItem(notesKey, JSON.stringify(next));
  };
  const [showNotes, setShowNotes] = useState(false);

  const handleBulkSave = async (entries: Omit<TimesheetEntry, 'id'>[]) => {
    const results = await Promise.allSettled(entries.map(async entry => {
      const existing = timesheets.find(t => String(t.employee_id) === String(entry.employee_id) && t.date === entry.date);
      if (existing?.id) return api.update(existing.id, entry);
      return api.create(entry);
    }));
    const saved = results.filter(r => r.status === 'fulfilled').map(r => (r as PromiseFulfilledResult<TimesheetEntry>).value);
    setTimesheets(prev => {
      const map = new Map(prev.map(t => [`${t.employee_id}:${t.date}`, t]));
      saved.forEach(s => map.set(`${s.employee_id}:${s.date}`, s));
      return [...map.values()];
    });
    const failed = results.filter(r => r.status === 'rejected').length;
    if (failed > 0) toast.warning(`${failed} entries failed to save`);
  };

  const prevPeriod = () => setCurrentMonth(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextPeriod = () => setCurrentMonth(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  const completion = summary.possible > 0 ? Math.round((summary.filled / summary.possible) * 100) : 0;

  return (
    <PageShell>
      {/* ── HERO ── */}
      <section className="relative text-white">
        <div className="container mx-auto px-4 pt-6 pb-3">
          <div className="oz-glass-dark rounded-2xl overflow-hidden">
            {/* Top bar */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-6 py-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[#2A4D69] to-[#86BBD8] flex items-center justify-center shrink-0 shadow-lg">
                  <Clock className="h-4 w-4 text-white" />
                </div>
                <div className="min-w-0">
                  <nav className="flex items-center gap-1 text-[10px] text-white/40 mb-0.5">
                    <span>Home</span><ChevronRight className="h-2.5 w-2.5" /><span className="text-white/65">Timesheets</span>
                  </nav>
                  <h1 className="text-xl md:text-2xl font-extrabold font-heading text-white tracking-tight">Maintenance Timesheets</h1>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                {/* Tab switcher */}
                <div className="flex items-center gap-1 bg-white/[0.07] border border-white/10 rounded-xl p-1">
                  {(['salaried', 'nec'] as const).map(t => (
                    <button key={t} type="button" onClick={() => setActiveTab(t)}
                      className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold transition-all ${activeTab === t ? 'bg-[#2A4D69] text-white shadow' : 'text-white/50 hover:text-white/80'}`}>
                      {t === 'salaried' ? <Briefcase className="w-3 h-3" /> : <Building2 className="w-3 h-3" />}
                      {t === 'salaried' ? 'Salaried' : 'NEC'}
                    </button>
                  ))}
                </div>
                <button type="button" title="Refresh timesheets" onClick={load} disabled={loading}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-white/[0.07] hover:bg-white/[0.15] text-white/75 border border-white/12 transition-all disabled:opacity-40">
                  <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Refresh</span>
                </button>
                <button type="button" title="Download timesheet" onClick={() => setShowDownload(true)}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-white/[0.07] hover:bg-white/[0.15] text-white/75 border border-white/12 transition-all">
                  <Download className="h-3.5 w-3.5" /><span className="hidden sm:inline">Download</span>
                </button>
                <button type="button" title="Add employees to this period" onClick={() => setShowBulkAdd(true)}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-[#86BBD8]/25 hover:bg-[#86BBD8]/40 text-white font-semibold border border-[#86BBD8]/35 transition-all">
                  <UserPlus className="h-3.5 w-3.5" /> Add Employees
                </button>
                <button type="button" title={showHeroStats ? 'Hide stats' : 'Show stats'} onClick={() => setShowHeroStats(v => !v)}
                  className="h-7 w-7 flex items-center justify-center rounded-lg bg-white/[0.07] hover:bg-white/[0.15] text-white/50 border border-white/12 transition-all">
                  {showHeroStats ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>

            {/* Expandable stats */}
            {showHeroStats && (
              <div className="border-t border-white/10 px-6 py-3 flex flex-wrap items-center gap-x-1 gap-y-2">
                {[
                  { icon: Users,  val: `${tabEmployees.length}`, label: 'employees', color: 'text-[#86BBD8]' },
                  { icon: Clock,  val: `${summary.reg.toFixed(0)}h`, label: 'regular', color: 'text-emerald-400' },
                  { icon: Zap,    val: `${summary.ot15.toFixed(0)}h`, label: 'OT 1.5×', color: 'text-orange-400' },
                  { icon: Zap,    val: `${summary.ot20.toFixed(0)}h`, label: 'OT 2.0×', color: 'text-purple-400' },
                  { icon: Moon,   val: `${summary.night.toFixed(0)}h`, label: 'nightshift', color: 'text-indigo-400' },
                  summary.standbyBonus > 0 ? { icon: LayoutGrid, val: `${summary.standbyBonus}h`, label: 'standby OT', color: 'text-amber-400' } : null,
                  { icon: CalendarDays, val: `${completion}%`, label: `filled (${summary.filled}/${summary.possible})`, color: completion === 100 ? 'text-emerald-400' : 'text-white/60' },
                ].filter(Boolean).map((item, i, arr) => {
                  const it = item as { icon: React.ElementType; val: string; label: string; color: string };
                  return (
                  <React.Fragment key={i}>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg">
                      {it.icon && <it.icon className={`w-3.5 h-3.5 ${it.color}`} />}
                      <span className="text-base font-bold text-white">{it.val}</span>
                      <span className="text-xs text-white/45">{it.label}</span>
                    </div>
                    {i < arr.length - 1 && <span className="text-white/15 hidden sm:block select-none">|</span>}
                  </React.Fragment>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      <main className="container mx-auto px-4 pb-8 space-y-3 mt-3">

        {/* ── PERIOD PANEL ── */}
        <div className="oz-glass-panel rounded-2xl overflow-hidden">
          <SectionHeader icon={CalendarDays} title="Period" sub={fmtPeriod(activePeriod)} open={showPeriod} onToggle={() => setShowPeriod(v => !v)}>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-white/35" />
              <input placeholder="Search…" className="bg-white/[0.06] border border-white/10 rounded-lg text-xs text-white/80 placeholder:text-white/25 pl-7 pr-3 py-1 h-7 w-36 focus:outline-none focus:border-[#86BBD8]/40"
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </SectionHeader>
          {showPeriod && (
            <div className="px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <button type="button" title="Previous period" onClick={prevPeriod} className="p-2 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-white/60 transition-all">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="text-center">
                  <div className="font-semibold text-white/90">{fmtPeriod(activePeriod)}</div>
                  <div className="text-xs text-white/35 mt-0.5">
                    {days.length} days · {activeTab === 'salaried' ? '1st to last day of month' : '13th to 12th (NEC cycle)'}
                  </div>
                </div>
                <button type="button" title="Next period" onClick={nextPeriod} className="p-2 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-white/60 transition-all">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setCurrentMonth(new Date())}
                  className="text-xs px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-white/60 transition-all">
                  Current Period
                </button>
                <button type="button" onClick={handleCopyPreviousPeriod}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-white/60 transition-all">
                  <RefreshCw className="w-3 h-3" /> Copy Previous
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── GRID PANEL — no overflow-hidden so sticky columns work; use overflow-clip instead ── */}
        <div className="oz-glass-panel rounded-2xl [overflow:clip]">
          <SectionHeader
            icon={LayoutGrid}
            title={`${activeTab === 'salaried' ? 'Salaried' : 'NEC'} Timesheet Grid`}
            sub={`${tabEmployees.length} employees`}
            open={showGrid}
            onToggle={() => setShowGrid(v => !v)}
          >
            <button type="button" title={`Sort: ${sortBy === 'name' ? 'A–Z name' : 'Department'}`}
              onClick={() => setSortBy(s => s === 'name' ? 'dept' : 'name')}
              className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-md bg-white/[0.07] hover:bg-white/[0.14] border border-white/10 text-white/50 hover:text-white/80 transition-all">
              {sortBy === 'name' ? 'A–Z' : 'Dept'}
            </button>
          </SectionHeader>
          {showGrid && (
            loading
              ? <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-6 h-6 animate-spin text-[#86BBD8]" />
                  <span className="ml-2 text-sm text-white/50">Loading…</span>
                </div>
              : <TimesheetGrid
                  employees={tabEmployees}
                  timesheets={timesheets}
                  days={days}
                  onCellClick={(emp, day, entry) => setEditCell({ employee: emp, date: day, entry })}
                  onBulkAssign={emp => setBulkEmployee(emp)}
                  onRemoveEmployee={id => setTabIds(tabIds.filter(x => x !== id))}
                />
          )}
        </div>

        {/* ── LEGEND ── */}
        <div className="oz-glass-panel rounded-2xl px-5 py-3 flex flex-wrap items-center gap-3">
          <span className="text-[10px] font-semibold text-white/40 uppercase tracking-wider mr-1">Legend</span>
          {(Object.entries(STATUS_CFG) as [StatusKey, StatusConfig][]).map(([k, c]) => (
            <span key={k} className={`inline-flex items-center gap-1 border rounded-full px-2 py-0.5 text-[10px] font-medium ${c.darkCls}`}>
              <c.Icon className="w-2.5 h-2.5" />{c.label}
            </span>
          ))}
          <span className="text-[10px] text-white/30 ml-2">SB = Standby OT bonus</span>
        </div>

        {/* ── PERIOD NOTES ── */}
        {tabEmployees.length > 0 && (
          <div className="oz-glass-panel rounded-2xl [overflow:clip]">
            <SectionHeader icon={Users} title="Period Notes" sub="per-employee context for this period" open={showNotes} onToggle={() => setShowNotes(v => !v)} />
            {showNotes && (
              <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {tabEmployees.map(emp => (
                  <div key={emp.id} className="space-y-1">
                    <label className="text-[10px] font-medium text-white/50 flex items-center gap-1.5">
                      <Avatar className="h-4 w-4 shrink-0"><AvatarFallback className="text-[7px] bg-[#2A4D69]/50 text-[#86BBD8]">{getInitials(emp.name)}</AvatarFallback></Avatar>
                      {emp.name}
                    </label>
                    <textarea rows={2} placeholder={`Notes for ${emp.name.split(' ')[0]}…`}
                      value={empNotes[emp.id] || ''}
                      onChange={e => updateEmpNote(emp.id, e.target.value)}
                      className="w-full bg-white/[0.05] border border-white/10 rounded-lg text-xs text-white/70 placeholder:text-white/20 px-2.5 py-1.5 resize-none focus:outline-none focus:border-[#86BBD8]/40 transition-colors" />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </main>

      {/* ── DIALOGS ── */}
      {editCell && (
        <TimesheetEntryDialog
          employee={editCell.employee} date={editCell.date} entry={editCell.entry}
          onSave={data => handleSaveEntry(editCell.employee.id, editCell.date, data)}
          onDelete={editCell.entry?.id ? () => handleDeleteEntry(editCell.entry!.id!) : undefined}
          onClose={() => setEditCell(null)}
        />
      )}

      {bulkEmployee && (
        <BulkAssignDialog
          initialEmployee={bulkEmployee}
          allEmployees={tabEmployees}
          period={activePeriod}
          timesheets={timesheets}
          onSave={handleBulkSave}
          onClose={() => setBulkEmployee(null)}
        />
      )}

      {showBulkAdd && (
        <BulkAddEmployeesDialog
          allEmployees={allEmployees} currentIds={tabIds}
          onAdd={emps => setTabIds([...new Set([...tabIds, ...emps.map(e => e.id)])])}
          onClose={() => setShowBulkAdd(false)}
        />
      )}

      {showDownload && (
        <DownloadDialog
          employees={tabEmployees} timesheets={timesheets}
          period={activePeriod} periodType={activeTab}
          onClose={() => setShowDownload(false)}
        />
      )}
    </PageShell>
  );
}
