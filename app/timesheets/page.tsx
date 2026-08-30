'use client';

import React, { useState, useEffect, useMemo, useCallback, ElementType } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { EXPORT_BRAND_ARGB, EXPORT_BRAND_RGB } from '@/lib/exportUtils';
import {
  ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Search, Download, Plus,
  Clock, Users, User, Loader2, CheckCircle, XCircle, AlertTriangle,
  CalendarDays, RefreshCw, Zap, Moon, Trash2, FileSpreadsheet,
  FileText, UserPlus, Briefcase, Building2, X, Check,
  LayoutGrid, Layers, Sun,
} from '@/components/shared/theme';
import { AppShell } from '@/components/app-shell';
import { PredictiveInput } from '@/components/shared/PredictiveInput';
import { useTheme, PageHero, ACCENT_HEX, useCollapseSection, EmptyState, accentText, TYPE_WEIGHT } from '@/components/shared/theme';
import { toLocalISODate } from '@/lib/dates';
import { zimHolidayName } from '@/lib/zimHolidays';
import type {
  ApprovedLeaveRecord, ApprovedOvertimeRecord, EditCell, Employee, EntryForm,
  HourTotals, Period, RowData, StatusConfig, StatusKey, TimesheetEntry,
} from './types';
import { api, useTimesheetsData } from './useTimesheetsData';
import { LEAVE_STATUSES, DOUBLE_TIME_STATUSES, ZERO_HOUR_STATUSES, apply208, calcEmployeeTotals } from './calcTotals';

// ─────────────────── STATUS CONFIG ───────────────────

const STATUS_CFG: Record<StatusKey, StatusConfig> = {
  work: { label: 'Work', hex: '#34d399', Icon: CheckCircle },
  leave: { label: 'Leave', hex: '#60a5fa', Icon: CalendarDays },
  sick: { label: 'Sick', hex: '#fb923c', Icon: AlertTriangle },
  special_leave: { label: 'Special Leave', hex: '#a78bfa', Icon: CalendarDays },
  // 'holiday' = worked ON the public holiday (2.0x — "PPH", Paid Public Holiday, per how
  // the abbreviation's used here). The not-worked case is 'holiday_paid' below.
  holiday: { label: 'PPH (Worked Holiday)', hex: '#c084fc', Icon: CalendarDays },
  holiday_paid: { label: 'Paid Holiday', hex: '#facc15', Icon: Sun },
  training: { label: 'Training', hex: '#22d3ee', Icon: CalendarDays },
  off: { label: 'Off', hex: '#94a3b8', Icon: XCircle },
  absent: { label: 'Absent', hex: '#f87171', Icon: AlertTriangle },
  weekend: { label: 'Weekend (2.0×)', hex: '#fbbf24', Icon: Sun },
  // Added for the Leaves-module integration below — colors match that page's LEAVE_TYPES
  // for the same type, so a leave reads the same way on both pages.
  maternity: { label: 'Maternity', hex: '#db2777', Icon: CalendarDays },
  study: { label: 'Study Leave', hex: '#059669', Icon: CalendarDays },
  lieu: { label: 'In Lieu of OT', hex: '#0891b2', Icon: CalendarDays },
};

// Leaves page's leave_type -> this page's StatusKey. 'annual' reuses the existing generic
// 'leave' status (that's what it already meant here); 'compassionate' maps onto
// 'special_leave', which is that leave's label on the Leaves page too.
const LEAVE_TYPE_TO_STATUS: Record<string, StatusKey> = {
  annual: 'leave', sick: 'sick', compassionate: 'special_leave',
  maternity: 'maternity', study: 'study', lieu: 'lieu',
};

// Overtime page's overtime_type -> which multiplier bucket it lands in here. The timesheet
// only has two OT buckets (1.5x / 2.0x); weekend and holiday overtime count as double-time,
// everything else (regular/emergency/project/night) as 1.5x.
const OT_TYPE_TO_BUCKET: Record<string, 'ot15' | 'ot20'> = {
  weekend: 'ot20', holiday: 'ot20', regular: 'ot15', emergency: 'ot15', project: 'ot15', night: 'ot15',
};

// ─────────────────── HELPERS ───────────────────

// toLocalISODate, not d.toISOString().split('T')[0] — the latter reads the UTC date, which
// rolls a local-midnight Date back a day for anyone in a UTC+ timezone (this file's biggest
// latent bug: every entry saved here was silently dated one day early for such users, and
// it would have broken date-matching against leaves/overtime records below). See lib/dates.ts.
const fmtDate = (d: Date) => toLocalISODate(d);

const calcHours = (start?: string, end?: string) => {
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
  if (e <= s) e += 24;
  const ov = (a: number, b: number) => Math.max(0, Math.min(e, b) - Math.max(s, a));
  return ov(0, 6) + ov(18, 24) + ov(24, 30);
};

const getDays = ({ start, end }: Period) => {
  const days: Date[] = [], d = new Date(start);
  while (d <= end) { days.push(new Date(d)); d.setDate(d.getDate() + 1); }
  return days;
};

// Each role's normal shift length — everyone defaults to 10h except lamp room and
// compressor attendants, who work 8h. Matched case-insensitively against whatever's
// in Employee.position, since designation text elsewhere in this app varies in
// spelling/capitalization. Flag it if a role's actual title doesn't contain these
// words and it's getting the wrong default.
const normalShiftHours = (position: string): 8 | 10 => /lamp\s*room|compressor/i.test(position) ? 8 : 10;
const normalShiftEnd = (hours: number) => timeFromHours('07:00', hours);

const fmtPeriod = ({ start, end }: Period) =>
  `${start.getDate()} ${start.toLocaleString('en-GB', { month: 'short' })} ${start.getFullYear()} — ${end.getDate()} ${end.toLocaleString('en-GB', { month: 'short' })} ${end.getFullYear()}`;

const getSalariedPeriod = (month: Date): Period => {
  const y = month.getFullYear(), m = month.getMonth();
  return { start: new Date(y, m, 1), end: new Date(y, m + 1, 0) };
};
const getNECPeriod = (month: Date): Period => {
  const y = month.getFullYear(), m = month.getMonth();
  return { start: new Date(y, m - 1, 13), end: new Date(y, m, 12) };
};

// ─────────────────── COLLAPSIBLE SECTION HEADER ───────────────────

function SectionHeader({ icon: Icon, title, sub, open, onToggle, children }: {
  icon: ElementType; title: string; sub?: string; open: boolean; onToggle: () => void; children?: React.ReactNode;
}) {
  const t = useTheme();
  return (
    <div className={`flex items-center justify-between px-5 py-3 border-b ${t.border}`}>
      <div className="flex items-center gap-2 flex-wrap">
        <Icon className="h-3.5 w-3.5 text-brand-400 shrink-0" />
        <span className={`text-xs ${TYPE_WEIGHT.semibold} uppercase tracking-wider ${t.textMuted}`}>{title}</span>
        {sub && <span className={`text-[11px] ${t.textFaint}`}>{sub}</span>}
      </div>
      <div className="flex items-center gap-1.5">
        {children}
        <button type="button" onClick={onToggle} className={`h-6 w-6 flex items-center justify-center rounded-md ${t.chipBg} ${t.hoverBg} ${t.textFaint} transition-all`}>
          {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
      </div>
    </div>
  );
}

// ─────────────────── STATUS BADGE ───────────────────

function StatusPill({ status, dark = false }: { status: StatusKey; dark?: boolean }) {
  const cfg = STATUS_CFG[status] || STATUS_CFG.work;
  const { Icon } = cfg;
  const size = dark ? 'gap-0.5 px-1.5 py-0.5 text-[9px]' : 'gap-1 px-2 py-0.5 text-[10px]';
  return (
    <span className={`inline-flex items-center rounded-full ${TYPE_WEIGHT.semibold} ${size}`} style={{ backgroundColor: `${cfg.hex}22`, color: cfg.hex }}>
      <Icon className={dark ? 'w-2 h-2' : 'w-2.5 h-2.5'} />{cfg.label}
    </span>
  );
}

// ─────────────────── SINGLE ENTRY DIALOG ───────────────────

function TimesheetEntryDialog({ employee, date, entry, onSave, onDelete, onClose }: {
  employee: Employee; date: Date; entry?: TimesheetEntry;
  onSave: (data: Omit<TimesheetEntry, 'id'>) => Promise<void>;
  onDelete?: () => Promise<void>; onClose: () => void;
}) {
  const t = useTheme();
  const isWeekendDay = date.getDay() === 0 || date.getDay() === 6;
  const holidayName = zimHolidayName(fmtDate(date));
  // Default assumption on a public holiday is "didn't come in" (paid 8h regular, no
  // action needed) — the user actively switches to 'holiday' (PPH, 2.0x) only when the
  // person actually worked it. See effectiveTimesheets for the same day, un-opened.
  const defaultStatus: StatusKey = entry?.status || (holidayName ? 'holiday_paid' : isWeekendDay ? 'weekend' : 'work');
  const [form, setForm] = useState<EntryForm>({
    start_time: defaultStatus === 'holiday_paid' ? '' : entry?.start_time || '07:00',
    end_time: defaultStatus === 'holiday_paid' ? '' : entry?.end_time || '17:00',
    regular_hours: entry?.regular_hours ?? (defaultStatus === 'holiday_paid' ? 8 : 10),
    nightshift_hours: entry?.nightshift_hours ?? 0,
    status: defaultStatus, standby_allowance: entry?.standby_allowance ?? false,
    nightshift_allowance: entry?.nightshift_allowance ?? false, notes: entry?.notes || '',
    callout_overtime_hours: entry?.callout_overtime_hours ?? 0, callout_count: entry?.callout_count ?? 0,
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (ZERO_HOUR_STATUSES.has(form.status)) return;
    // Real shift times entered while still on the "didn't come in" holiday default mean
    // they worked it — promote straight to PPH (2.0x) instead of requiring a separate
    // manual Status change on top of the times just entered.
    if (form.status === 'holiday_paid') {
      if (form.start_time && form.end_time) setForm(f => ({ ...f, status: 'holiday' }));
      return;
    }
    if (form.start_time && form.end_time) setForm(f => ({ ...f, regular_hours: calcHours(f.start_time, f.end_time), nightshift_hours: calcNightHours(f.start_time, f.end_time) }));
  }, [form.start_time, form.end_time, form.status]);

  const handleStatusChange = (val: string) => {
    const s = val as StatusKey;
    if (LEAVE_STATUSES.has(s)) setForm(f => ({ ...f, status: s, start_time: '07:00', end_time: '15:00' }));
    else if (ZERO_HOUR_STATUSES.has(s)) setForm(f => ({ ...f, status: s, regular_hours: 0, nightshift_hours: 0, start_time: '', end_time: '' }));
    // Paid public holiday, not worked: fixed 8h credit, no real shift times to record.
    else if (s === 'holiday_paid') setForm(f => ({ ...f, status: s, regular_hours: 8, nightshift_hours: 0, start_time: '', end_time: '' }));
    else setForm(f => ({ ...f, status: s }));
  };

  const total = form.regular_hours + form.nightshift_hours + form.callout_overtime_hours;

  const handleSave = async () => {
    setSaving(true);
    try {
      const isDT = DOUBLE_TIME_STATUSES.has(form.status);
      await onSave({
        employee_id: parseInt(employee.id), date: fmtDate(date),
        start_time: form.start_time, end_time: form.end_time,
        regular_hours: isDT ? 0 : form.regular_hours,
        // Overtime is no longer entered here — it's picked up entirely from the Overtime
        // module's approved records (see effectiveTimesheets), so this dialog never writes
        // overtime_hours/holiday_overtime_hours itself beyond a double-time day's own hours.
        overtime_hours: 0,
        holiday_overtime_hours: isDT ? form.regular_hours : 0,
        nightshift_hours: form.nightshift_hours,
        standby_allowance: form.standby_allowance, nightshift_allowance: form.nightshift_allowance, total_hours: total,
        status: form.status, notes: form.notes, overtime_periods: [],
        callout_overtime_hours: form.callout_overtime_hours, callout_count: form.callout_count,
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

  const fieldCls = `h-8 ${t.inputBg}`;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className={`sm:max-w-lg max-h-[90vh] overflow-y-auto ${t.glass}`}>
        <DialogHeader>
          <DialogTitle className={t.textPrimary}>Timesheet Entry</DialogTitle>
          <DialogDescription className={t.textFaint}>{employee?.name} — {date?.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {holidayName && (
            <p className={`text-xs ${accentText('violet', t.light)} bg-violet-500/10 rounded px-2 py-1 flex items-center gap-1.5`}>
              <Sun className="w-3.5 h-3.5" /> Zimbabwe public holiday — {holidayName}
            </p>
          )}
          <div className="space-y-1.5">
            <Label className={t.textMuted}>Status</Label>
            <Select value={form.status} onValueChange={handleStatusChange}>
              <SelectTrigger className={t.inputBg}><SelectValue /></SelectTrigger>
              <SelectContent>{(Object.entries(STATUS_CFG) as [StatusKey, StatusConfig][]).map(([k, c]) => (
                <SelectItem key={k} value={k}><span className="flex items-center gap-2"><c.Icon className="w-3.5 h-3.5" />{c.label}</span></SelectItem>
              ))}</SelectContent>
            </Select>
            {LEAVE_STATUSES.has(form.status) && <p className="text-xs text-brand-400 bg-brand-500/10 rounded px-2 py-1">8 hours auto-assigned for {STATUS_CFG[form.status]?.label}</p>}
            {DOUBLE_TIME_STATUSES.has(form.status) && <p className={`text-xs ${accentText('violet', t.light)} bg-violet-500/10 rounded px-2 py-1 ${TYPE_WEIGHT.medium}`}>All hours worked count as <strong>2.0× (double time)</strong> — enter the actual shift times below</p>}
            {ZERO_HOUR_STATUSES.has(form.status) && <p className={`text-xs ${t.chipBg} rounded px-2 py-1 ${t.textFaint}`}>0 hours recorded — {STATUS_CFG[form.status]?.label} days are not credited</p>}
            {form.status === 'holiday_paid' && <p className="text-xs text-amber-400 bg-amber-500/10 rounded px-2 py-1">8 regular hours auto-credited — they didn't work this public holiday. Enter their actual shift times below if they did; this switches to "{STATUS_CFG.holiday.label}" automatically.</p>}
          </div>

          <div className={`p-3 rounded-lg ${t.chipBg} space-y-3`}>
            <h3 className={`${TYPE_WEIGHT.medium} text-sm ${t.textMuted}`}>{DOUBLE_TIME_STATUSES.has(form.status) ? '2.0× Shift (all hours @ double time)' : 'Regular Shift'}</h3>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className={`text-xs ${t.textFaint}`}>Start</Label><Input type="time" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} className={fieldCls} /></div>
              <div><Label className={`text-xs ${t.textFaint}`}>End</Label><Input type="time" value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} className={fieldCls} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className={`rounded p-2 text-center ${DOUBLE_TIME_STATUSES.has(form.status) ? 'bg-violet-500/10' : 'bg-emerald-500/10'}`}>
                <div className={`text-xs ${t.textFaint}`}>{DOUBLE_TIME_STATUSES.has(form.status) ? '2.0× h' : 'Regular'}</div>
                <div className={`${TYPE_WEIGHT.bold} ${DOUBLE_TIME_STATUSES.has(form.status) ? accentText('violet', t.light) : accentText('emerald', t.light)}`}>{form.regular_hours.toFixed(2)}h</div>
              </div>
              <div className="bg-indigo-500/10 rounded p-2 text-center"><div className={`text-xs ${t.textFaint}`}><Moon className="w-3 h-3 inline" /> Night</div><div className={`${TYPE_WEIGHT.bold} ${accentText('indigo', t.light)}`}>{form.nightshift_hours.toFixed(2)}h</div></div>
            </div>
          </div>

          <p className={`text-xs ${t.textFaint} bg-sky-500/[0.08] rounded px-2 py-1.5`}>Overtime is no longer entered here — log it in the Overtime module and it'll be picked up automatically.</p>

          <div className="flex justify-between items-center p-3 bg-brand-500/10 rounded-lg">
            <span className={`${TYPE_WEIGHT.semibold} text-sm ${t.textMuted}`}>Total Hours</span>
            <span className={`text-xl ${TYPE_WEIGHT.bold} text-brand-400`}>{total.toFixed(2)}h</span>
          </div>

          <div className="p-3 rounded-lg bg-orange-500/[0.08] space-y-2">
            <h3 className={`${TYPE_WEIGHT.medium} text-sm text-orange-400`}>Callout Overtime</h3>
            <p className="text-xs text-orange-400/70">Hours worked when phoned in after hours / off-site callout</p>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className={`text-xs ${t.textFaint}`}>Callout Hours</Label><Input type="number" min={0} step={0.5} value={form.callout_overtime_hours} onChange={e => setForm(f => ({ ...f, callout_overtime_hours: parseFloat(e.target.value) || 0 }))} className={`${fieldCls} mt-1`} /></div>
              <div><Label className={`text-xs ${t.textFaint}`}>Number of Callouts</Label><Input type="number" min={0} step={1} value={form.callout_count} onChange={e => setForm(f => ({ ...f, callout_count: parseInt(e.target.value) || 0 }))} className={`${fieldCls} mt-1`} /></div>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-amber-500/[0.08] rounded-lg">
            <div><Label className={`${TYPE_WEIGHT.medium} text-sm ${accentText('amber', t.light)}`}>Standby Allowance</Label><p className={`text-xs ${t.textFaint}`}>Adds a flat 8h once for this standby period (any length)</p></div>
            <Switch checked={form.standby_allowance} onCheckedChange={v => setForm(f => ({ ...f, standby_allowance: v }))} />
          </div>

          <div className={`flex items-center justify-between p-3 rounded-lg bg-indigo-500/[0.08]`}>
            <div><Label className={`${TYPE_WEIGHT.medium} text-sm ${accentText('indigo', t.light)}`}>Night Shift Allowance</Label><p className={`text-xs ${t.textFaint}`}>Pays the actual hours worked between 18:00–06:00 (shown above as Night) as a shift differential</p></div>
            <Switch checked={form.nightshift_allowance} onCheckedChange={v => setForm(f => ({ ...f, nightshift_allowance: v }))} />
          </div>

          <div><Label className={`text-xs ${t.textFaint}`}>Notes</Label><Input placeholder="Optional…" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className={fieldCls} /></div>
        </div>

        {confirmDelete && (
          <div className="mx-6 mb-2 flex items-center justify-between gap-2 p-3 bg-red-500/10 rounded-lg">
            <span className={`text-sm text-red-400 ${TYPE_WEIGHT.medium}`}>Delete this entry permanently?</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className={`${t.textMuted} bg-transparent`} onClick={() => setConfirmDelete(false)}>Cancel</Button>
              <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white" onClick={handleDelete} disabled={deleting}>{deleting && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}Delete</Button>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          {onDelete && !confirmDelete && (
            <Button variant="outline" size="sm" className="mr-auto text-red-400 hover:bg-red-500/10 bg-transparent" onClick={() => setConfirmDelete(true)}><Trash2 className="w-3.5 h-3.5 mr-1" /> Delete entry</Button>
          )}
          <Button variant="outline" className={`${t.textMuted} bg-transparent`} onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="bg-brand-600 hover:bg-brand-700 text-white">{saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────── BULK ASSIGN DIALOG ───────────────────

interface BulkAssignDialogProps {
  initialEmployee: Employee; allEmployees: Employee[]; period: Period; timesheets: TimesheetEntry[];
  onSave: (entries: Omit<TimesheetEntry, 'id'>[]) => Promise<void>;
  onClear: (targets: { employee_id: number; date: string }[]) => Promise<void>;
  onClose: () => void;
}

function BulkAssignDialog({ initialEmployee, allEmployees, period, timesheets, onSave, onClear, onClose }: BulkAssignDialogProps) {
  const t = useTheme();
  const allDays = getDays(period);

  const [selectedEmpIds, setSelectedEmpIds] = useState<Set<string>>(new Set([initialEmployee.id]));
  const toggleEmp = (id: string) => setSelectedEmpIds(s => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const toggleAllEmps = () => selectedEmpIds.size === allEmployees.length ? setSelectedEmpIds(new Set([initialEmployee.id])) : setSelectedEmpIds(new Set(allEmployees.map(e => e.id)));

  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());
  const [anchor, setAnchor] = useState<string | null>(null);
  const [hoverDate, setHoverDate] = useState<string | null>(null);

  const [status, setStatus] = useState<StatusKey>('work');
  const [startTime, setStartTime] = useState('07:00');
  const [endTime, setEndTime] = useState('17:00');
  // "Normal shift, by role" — each selected employee gets their own role's normal
  // length (see normalShiftHours) instead of one shared start/end applied to everyone,
  // so a mixed selection (e.g. a lamp room attendant + a driver) still lands correctly
  // without the user having to run this twice.
  const [useNormalShift, setUseNormalShift] = useState(false);
  const [skipWeekends, setSkipWeekends] = useState(false);
  const [standby, setStandby] = useState(false);
  const [nightAllowance, setNightAllowance] = useState(false);
  const [rangeFrom, setRangeFrom] = useState(fmtDate(period.start));
  const [rangeTo, setRangeTo] = useState(fmtDate(period.end));

  const [saving, setSaving] = useState(false);
  const [lastApplied, setLastApplied] = useState<{ days: number; emps: number } | null>(null);

  const shiftPresets: Array<{ label: string; from: string; to: string }> = [
    { label: '7–5 (10h)', from: '07:00', to: '17:00' }, { label: '7–4 (9h)', from: '07:00', to: '16:00' },
    { label: '6–6 (12h)', from: '06:00', to: '18:00' }, { label: '7–3 (8h)', from: '07:00', to: '15:00' },
    { label: 'Night', from: '18:00', to: '06:00' },
  ];

  const regHours = LEAVE_STATUSES.has(status) ? 8 : ZERO_HOUR_STATUSES.has(status) ? 0 : calcHours(startTime, endTime);
  const nightHours = (LEAVE_STATUSES.has(status) || ZERO_HOUR_STATUSES.has(status)) ? 0 : calcNightHours(startTime, endTime);

  // What "normal shift" actually resolves to per selected employee, grouped for the
  // preview (e.g. "2 people · 8h" / "3 people · 10h" when the selection is mixed).
  const normalShiftBreakdown = useMemo(() => {
    if (!useNormalShift) return [];
    const groups = new Map<number, number>();
    selectedEmpIds.forEach(eid => {
      const emp = allEmployees.find(e => e.id === eid);
      const h = normalShiftHours(emp?.position || '');
      groups.set(h, (groups.get(h) || 0) + 1);
    });
    return [...groups.entries()].sort((a, b) => b[0] - a[0]);
  }, [useNormalShift, selectedEmpIds, allEmployees]);

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
    { label: 'Week 1', action: () => selectRange(fmtDate(allDays[0]), fmtDate(allDays[Math.min(6, allDays.length - 1)])) },
    { label: 'Week 2', action: () => selectRange(fmtDate(allDays[Math.min(7, allDays.length - 1)]), fmtDate(allDays[Math.min(13, allDays.length - 1)])) },
    { label: 'Week 3', action: () => selectRange(fmtDate(allDays[Math.min(14, allDays.length - 1)]), fmtDate(allDays[Math.min(20, allDays.length - 1)])) },
    { label: 'Week 4', action: () => selectRange(fmtDate(allDays[Math.min(21, allDays.length - 1)]), fmtDate(allDays[allDays.length - 1])) },
    { label: 'All', action: () => setSelectedDates(new Set(allDays.filter(d => !skipWeekends || (d.getDay() !== 0 && d.getDay() !== 6)).map(fmtDate))) },
    { label: 'Clear ×', action: () => { setSelectedDates(new Set()); setAnchor(null); } },
  ];

  const handleApply = async () => {
    if (selectedDates.size === 0) { toast.error('Select at least one date'); return; }
    if (selectedEmpIds.size === 0) { toast.error('Select at least one employee'); return; }
    setSaving(true);
    try {
      const entries: Omit<TimesheetEntry, 'id'>[] = [];
      const isDT = DOUBLE_TIME_STATUSES.has(status);
      selectedEmpIds.forEach(eid => {
        // Normal-shift mode looks up THIS employee's own role length — a mixed
        // selection (lamp room + everyone else) still gets the right hours per person
        // in one pass, instead of the single shared start/end used otherwise.
        let empStart = startTime, empEnd = endTime, empReg = regHours, empNight = nightHours;
        if (useNormalShift && !LEAVE_STATUSES.has(status) && !ZERO_HOUR_STATUSES.has(status)) {
          const emp = allEmployees.find(e => e.id === eid);
          const h = normalShiftHours(emp?.position || '');
          empStart = '07:00'; empEnd = normalShiftEnd(h);
          empReg = calcHours(empStart, empEnd); empNight = calcNightHours(empStart, empEnd);
        }
        [...selectedDates].sort().forEach(ds => {
          entries.push({
            employee_id: parseInt(eid), date: ds,
            start_time: LEAVE_STATUSES.has(status) ? '07:00' : ZERO_HOUR_STATUSES.has(status) ? '' : empStart,
            end_time: LEAVE_STATUSES.has(status) ? '15:00' : ZERO_HOUR_STATUSES.has(status) ? '' : empEnd,
            regular_hours: isDT ? 0 : empReg, overtime_hours: 0, holiday_overtime_hours: isDT ? empReg : 0,
            nightshift_hours: empNight, standby_allowance: standby, nightshift_allowance: nightAllowance,
            total_hours: empReg + empNight, status, notes: '',
            overtime_periods: [], callout_overtime_hours: 0, callout_count: 0,
          });
        });
      });
      await onSave(entries);
      setLastApplied({ days: selectedDates.size, emps: selectedEmpIds.size });
      setSelectedDates(new Set());
      setAnchor(null);
    } catch (e) { toast.error('Failed: ' + (e as Error).message); }
    finally { setSaving(false); }
  };

  const [clearing, setClearing] = useState(false);
  const handleClear = async () => {
    if (selectedDates.size === 0) { toast.error('Select at least one date'); return; }
    if (selectedEmpIds.size === 0) { toast.error('Select at least one employee'); return; }
    setClearing(true);
    try {
      const targets: { employee_id: number; date: string }[] = [];
      selectedEmpIds.forEach(eid => [...selectedDates].forEach(ds => targets.push({ employee_id: parseInt(eid), date: ds })));
      await onClear(targets);
      setSelectedDates(new Set());
      setAnchor(null);
    } catch (e) { toast.error('Failed: ' + (e as Error).message); }
    finally { setClearing(false); }
  };

  const today = fmtDate(new Date());
  const totalEntries = selectedDates.size * selectedEmpIds.size;
  const estimatedTotalHours = useNormalShift
    ? normalShiftBreakdown.reduce((s, [hours, count]) => s + hours * count * selectedDates.size, 0)
    : regHours * totalEntries;
  const fieldCls = `h-8 ${t.inputBg}`;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className={`sm:max-w-2xl max-h-[92vh] flex flex-col overflow-hidden ${t.glass}`}>
        <DialogHeader className="shrink-0">
          <DialogTitle className={`flex items-center gap-2 ${t.textPrimary}`}><Layers className="w-4 h-4" /> Bulk Assign / Clear Shifts</DialogTitle>
          <DialogDescription className={t.textFaint}>{fmtPeriod(period)} — select days below, then Apply to mark them or Clear to unmark</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-2 pr-1">
          {lastApplied && (
            <div className={`flex items-center gap-2 px-3 py-2 bg-emerald-500/10 rounded-lg text-sm ${accentText('emerald', t.light)}`}>
              <CheckCircle className="w-4 h-4 shrink-0" />
              Applied {lastApplied.days} day{lastApplied.days !== 1 ? 's' : ''} × {lastApplied.emps} employee{lastApplied.emps !== 1 ? 's' : ''} — select more days to continue
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className={`text-xs ${TYPE_WEIGHT.semibold} uppercase tracking-wide ${t.textFaint}`}>Employees ({selectedEmpIds.size} selected)</Label>
              <button type="button" onClick={toggleAllEmps} className="text-xs text-brand-400 hover:underline">{selectedEmpIds.size === allEmployees.length ? 'Deselect all' : 'Select all'}</button>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-1">
              {allEmployees.map(emp => {
                const sel = selectedEmpIds.has(emp.id);
                return (
                  <button key={emp.id} type="button" onClick={() => toggleEmp(emp.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs ${TYPE_WEIGHT.medium} transition-all ${sel ? 'bg-brand-500/25 text-brand-400' : `${t.chipBg} ${t.textFaint} ${t.hoverBg}`}`}>
                    <User className="h-3.5 w-3.5 shrink-0" />
                    {emp.name}
                    {useNormalShift && <span className="opacity-60">{normalShiftHours(emp.position)}h</span>}
                    {sel && <Check className="w-3 h-3 opacity-70" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className={`text-xs ${t.textFaint}`}>Status</Label>
              <Select value={status} onValueChange={v => setStatus(v as StatusKey)}>
                <SelectTrigger className={`h-9 ${t.inputBg}`}><SelectValue /></SelectTrigger>
                <SelectContent>{(Object.entries(STATUS_CFG) as [StatusKey, StatusConfig][]).map(([k, c]) => (
                  <SelectItem key={k} value={k}><span className="flex items-center gap-2"><c.Icon className="w-3.5 h-3.5" />{c.label}</span></SelectItem>
                ))}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className={`text-xs ${t.textFaint}`}>Shift Preset</Label>
              <div className="flex flex-wrap gap-1">
                <button type="button" onClick={() => setUseNormalShift(true)}
                  title="8h for lamp room/compressor attendants, 10h for everyone else — set automatically per person"
                  className={`text-[11px] px-2 py-1 rounded transition-colors ${TYPE_WEIGHT.medium} ${useNormalShift ? `${accentText('indigo', t.light)} bg-indigo-500/20 ${TYPE_WEIGHT.semibold}` : `${t.chipBg} ${t.textFaint} ${t.hoverBg}`}`}>
                  <Zap className="w-2.5 h-2.5 inline -mt-0.5 mr-0.5" />Normal (by role)
                </button>
                {shiftPresets.map(p => (
                  <button key={p.label} type="button" onClick={() => { setUseNormalShift(false); setStartTime(p.from); setEndTime(p.to); }}
                    className={`text-[11px] px-2 py-1 rounded transition-colors ${!useNormalShift && startTime === p.from && endTime === p.to ? `bg-brand-500/25 text-brand-400 ${TYPE_WEIGHT.semibold}` : `${t.chipBg} ${t.textFaint} ${t.hoverBg}`}`}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {!LEAVE_STATUSES.has(status) && !ZERO_HOUR_STATUSES.has(status) && (
            useNormalShift ? (
              <div className={`flex flex-wrap items-center gap-3 p-3 rounded-lg bg-indigo-500/[0.08]`}>
                <Zap className={`w-4 h-4 shrink-0 ${accentText('indigo', t.light)}`} />
                {normalShiftBreakdown.length === 0 ? (
                  <span className={`text-xs ${t.textFaint}`}>Select employees to see their normal hours</span>
                ) : normalShiftBreakdown.map(([hours, count]) => (
                  <span key={hours} className={`text-xs ${TYPE_WEIGHT.medium} ${accentText('indigo', t.light)}`}>{count} {count !== 1 ? 'people' : 'person'} · {hours}h</span>
                ))}
              </div>
            ) : (
              <div className={`grid grid-cols-3 gap-3 p-3 rounded-lg ${t.chipBg}`}>
                <div><Label className={`text-xs ${t.textFaint}`}>Start</Label><Input type="time" value={startTime} onChange={e => { setUseNormalShift(false); setStartTime(e.target.value); }} className={`${fieldCls} mt-1`} /></div>
                <div><Label className={`text-xs ${t.textFaint}`}>End</Label><Input type="time" value={endTime} onChange={e => { setUseNormalShift(false); setEndTime(e.target.value); }} className={`${fieldCls} mt-1`} /></div>
                <div className="flex flex-col justify-center">
                  <span className={`text-xs ${t.textFaint}`}>Per day/person</span>
                  <span className={`text-xl ${TYPE_WEIGHT.bold} ${accentText('emerald', t.light)}`}>{regHours.toFixed(1)}h</span>
                  {nightHours > 0 && <span className={`text-xs ${accentText('indigo', t.light)}`}>{nightHours.toFixed(1)}h night</span>}
                </div>
              </div>
            )
          )}

          <div className="flex flex-wrap items-center gap-4">
            <label className={`flex items-center gap-2 text-sm cursor-pointer select-none ${t.textMuted}`}><input type="checkbox" checked={skipWeekends} onChange={e => setSkipWeekends(e.target.checked)} className="rounded" /> Skip weekends</label>
            <label className={`flex items-center gap-2 text-sm cursor-pointer select-none ${t.textMuted}`}><input type="checkbox" checked={standby} onChange={e => setStandby(e.target.checked)} className="rounded" /> Standby (flat 8h OT for the period)</label>
            <label className={`flex items-center gap-2 text-sm cursor-pointer select-none ${t.textMuted}`}><input type="checkbox" checked={nightAllowance} onChange={e => setNightAllowance(e.target.checked)} className="rounded" /> Night Shift Allowance (actual 18:00–06:00 hours, not flat)</label>
          </div>

          <div className="space-y-2">
            <Label className={`text-xs ${TYPE_WEIGHT.semibold} uppercase tracking-wide ${t.textFaint}`}>Date Quick Select</Label>
            <div className="flex flex-wrap gap-1.5">
              {quickSelects.map(q => (
                <button key={q.label} type="button" onClick={q.action}
                  className={`text-xs px-2.5 py-1 rounded-lg transition-colors ${TYPE_WEIGHT.medium} ${q.label === 'Clear ×' ? 'text-red-400 hover:bg-red-500/10' : 'text-brand-400/80 hover:bg-brand-500/10'}`}>
                  {q.label}
                </button>
              ))}
            </div>
            <div className={`flex items-end gap-2 p-2.5 rounded-lg ${t.chipBg}`}>
              <div className="flex-1 min-w-0"><Label className={`text-xs ${t.textFaint}`}>From</Label><Input type="date" value={rangeFrom} min={fmtDate(period.start)} max={fmtDate(period.end)} onChange={e => setRangeFrom(e.target.value)} className={`${fieldCls} mt-1`} /></div>
              <div className="flex-1 min-w-0"><Label className={`text-xs ${t.textFaint}`}>To</Label><Input type="date" value={rangeTo} min={fmtDate(period.start)} max={fmtDate(period.end)} onChange={e => setRangeTo(e.target.value)} className={`${fieldCls} mt-1`} /></div>
              <Button type="button" variant="outline" size="sm" className="h-8 shrink-0 text-brand-400/80 bg-transparent" onClick={() => selectRange(rangeFrom, rangeTo)}>Add Range</Button>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Label className={`text-sm ${TYPE_WEIGHT.semibold} ${t.textMuted}`}>Calendar</Label>
                {anchor ? <span className={`text-xs bg-amber-500/15 ${accentText('amber', t.light)} rounded-full px-2 py-0.5`}>Click a 2nd day to fill range</span> : <span className={`text-xs ${t.textFaint}`}>1st click = anchor · 2nd click = fill range</span>}
              </div>
              {anchor && <button type="button" onClick={() => { setAnchor(null); setHoverDate(null); }} className={`text-xs ${t.textFaint} hover:text-red-400 transition-colors`}>Cancel range</button>}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => <div key={d} className={`text-center text-[10px] ${TYPE_WEIGHT.semibold} py-1 ${t.textFaint}`}>{d}</div>)}
              {Array.from({ length: allDays[0].getDay() }).map((_, i) => <div key={`b${i}`} />)}
              {allDays.map(day => {
                const ds = fmtDate(day);
                const isWknd = day.getDay() === 0 || day.getDay() === 6;
                const disabled = skipWeekends && isWknd;
                const sel = selectedDates.has(ds);
                const isAnchor = anchor === ds;
                const inPreview = previewRange.has(ds) && !sel;
                const hasEntry = [...selectedEmpIds].some(eid => timesheets.some(ts => String(ts.employee_id) === String(eid) && ts.date === ds));
                return (
                  <button key={ds} type="button" disabled={disabled} onClick={() => handleDayClick(ds)}
                    onMouseEnter={() => anchor && setHoverDate(ds)} onMouseLeave={() => anchor && setHoverDate(null)}
                    className={`relative h-10 w-full rounded-lg text-sm ${TYPE_WEIGHT.medium} transition-all select-none ${
                      disabled ? 'opacity-20 cursor-not-allowed' :
                      isAnchor ? 'bg-amber-500 text-white shadow-lg ring-2 ring-amber-400/50' :
                      sel ? 'bg-brand-500/30 text-brand-300 shadow-md' :
                      inPreview ? 'bg-brand-500/15 text-brand-400' :
                      `${t.chipBg} ${t.textFaint} ${t.hoverBg}`
                    } ${ds === today ? 'ring-2 ring-brand-400/50' : ''}`}>
                    {day.getDate()}
                    {hasEntry && !sel && !inPreview && <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-emerald-400" />}
                    {sel && !isAnchor && <Check className="absolute top-0.5 right-0.5 w-2.5 h-2.5 opacity-70" />}
                  </button>
                );
              })}
            </div>

            <div className={`flex items-center justify-between text-xs pt-1 ${t.textFaint}`}>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-brand-500/30 inline-block" /> Selected</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-500 inline-block" /> Anchor</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-brand-500/15 inline-block" /> Preview</span>
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" /> Has entry</span>
              </div>
              <span className={`${TYPE_WEIGHT.semibold} ${t.textMuted}`}>{selectedDates.size} days × {selectedEmpIds.size} emp = <span className="text-brand-400">{totalEntries} entries</span>{totalEntries > 0 && estimatedTotalHours > 0 && ` · ${estimatedTotalHours.toFixed(0)}h total`}</span>
            </div>
          </div>
        </div>

        <div className={`shrink-0 flex items-center justify-between gap-2 pt-3 border-t ${t.border} mt-2`}>
          <Button variant="outline" className={`${t.textMuted} bg-transparent`} onClick={onClose}>Done</Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleClear} disabled={clearing || totalEntries === 0}
              className="text-red-400 hover:bg-red-500/10 bg-transparent border-red-500/30">
              {clearing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}<Trash2 className="w-3.5 h-3.5 mr-1.5" />Clear {totalEntries > 0 ? `${totalEntries}` : ''}
            </Button>
            <Button onClick={handleApply} disabled={saving || totalEntries === 0} className="bg-brand-600 hover:bg-brand-700 text-white">
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Apply {totalEntries > 0 ? `${totalEntries} entr${totalEntries !== 1 ? 'ies' : 'y'}` : '—'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Used by normalShiftEnd (near getDays) to compute a shift's end time from its start
// and length — kept standalone since the "Normal (by role)" bulk-assign preset needs it
// independent of any dialog.
function timeFromHours(startHHMM: string, hours: number): string {
  const [sh, sm] = startHHMM.split(':').map(Number);
  const totalMin = (sh * 60 + sm + Math.round(hours * 60)) % (24 * 60);
  const h = Math.floor(totalMin / 60), m = totalMin % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// ─────────────────── BULK ADD EMPLOYEES DIALOG ───────────────────

function BulkAddEmployeesDialog({ allEmployees, currentIds, onAdd, onClose }: {
  allEmployees: Employee[]; currentIds: string[]; onAdd: (emps: Employee[]) => void; onClose: () => void;
}) {
  const t = useTheme();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(new Set<string>());

  const filtered = useMemo(() => allEmployees.filter(e => !currentIds.includes(e.id) && (!search || e.name.toLowerCase().includes(search.toLowerCase()) || e.department.toLowerCase().includes(search.toLowerCase()))), [allEmployees, currentIds, search]);

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
      <DialogContent className={`sm:max-w-md max-h-[80vh] flex flex-col ${t.glass}`}>
        <DialogHeader>
          <DialogTitle className={`flex items-center gap-2 ${t.textPrimary}`}><UserPlus className="w-4 h-4" /> Add Employees</DialogTitle>
          <DialogDescription className={t.textFaint}>Select employees to add to this timesheet period</DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${t.textFaint}`} />
          <Input placeholder="Search…" className={`pl-9 h-8 text-sm ${t.inputBg}`} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className={`flex items-center justify-between text-xs px-1 ${t.textFaint}`}>
          <span>{filtered.length} available · {selected.size} selected</span>
          <button type="button" onClick={toggleAll} className="text-brand-400 hover:underline">{selected.size === filtered.length && filtered.length > 0 ? 'Deselect all' : 'Select all'}</button>
        </div>
        <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
          {filtered.length === 0 ? (
            <p className={`text-xs text-center py-8 ${t.textFaint}`}>{allEmployees.length === 0 ? 'Loading…' : 'No employees available'}</p>
          ) : filtered.map(emp => (
            <button key={emp.id} type="button" onClick={() => toggle(emp.id)}
              className={`w-full flex items-center gap-3 p-2.5 rounded-lg text-left transition-colors ${selected.has(emp.id) ? 'bg-brand-500/15' : t.hoverBgSoft}`}>
              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${selected.has(emp.id) ? 'bg-brand-500 border-brand-400' : `border ${t.border}`}`}>{selected.has(emp.id) && <Check className="w-2.5 h-2.5 text-white" />}</div>
              <User className="h-5 w-5 shrink-0 text-brand-400" />
              <div className="flex-1 min-w-0"><div className={`text-sm ${TYPE_WEIGHT.medium} truncate ${t.textPrimary}`}>{emp.name}</div><div className={`text-[10px] truncate ${t.textFaint}`}>{emp.position} · {emp.department}</div></div>
            </button>
          ))}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" className={`${t.textMuted} bg-transparent`} onClick={onClose}>Cancel</Button>
          <Button onClick={handleAdd} disabled={selected.size === 0} className="bg-brand-600 hover:bg-brand-700 text-white">Add {selected.size > 0 ? selected.size : ''} Employee{selected.size !== 1 ? 's' : ''}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────── DOWNLOAD DIALOG ───────────────────

function DownloadDialog({ employees, timesheets, period, periodType, onClose }: {
  employees: Employee[]; timesheets: TimesheetEntry[]; period: Period; periodType: string; onClose: () => void;
}) {
  const t = useTheme();
  const [format, setFormat] = useState<'excel' | 'pdf'>('excel');
  const [scope, setScope] = useState<'combined' | 'individual'>('combined');
  const [empId, setEmpId] = useState('');
  const [generating, setGenerating] = useState(false);
  const days = getDays(period);
  const tabLabel = periodType === 'nec' ? 'NEC' : 'Salaried';

  const getEntry = (eid: string, d: Date) => timesheets.find(ts => String(ts.employee_id) === String(eid) && ts.date === fmtDate(d));

  const calcTotalsLocal = (eid: string): HourTotals => calcEmployeeTotals(eid, timesheets);

  const buildRows = (emp: Employee): RowData[] => days.map(day => {
    const e = getEntry(emp.id, day);
    return { day: day.toLocaleDateString('en-GB', { weekday: 'short' }), date: fmtDate(day), status: e ? STATUS_CFG[e.status]?.label || e.status : '—', start: e?.start_time || '—', end: e?.end_time || '—', reg: e?.regular_hours?.toFixed(2) || '0.00', ot15: e?.overtime_hours?.toFixed(2) || '0.00', ot20: e?.holiday_overtime_hours?.toFixed(2) || '0.00', night: e?.nightshift_hours?.toFixed(2) || '0.00', notes: e?.notes || '' };
  });

  const statusAbbr = (s: string) => ({ work: '', leave: 'Lv', sick: 'Sick', special_leave: 'SL', holiday: 'PPH', holiday_paid: 'PH', training: 'Trn', off: 'Off', absent: 'Abs' }[s] ?? s);
  const dayCell = (e: TimesheetEntry | undefined, d: Date): string | number => {
    if (!e) return d.getDay() === 0 || d.getDay() === 6 ? '·' : '';
    if (ZERO_HOUR_STATUSES.has(e.status as StatusKey)) return statusAbbr(e.status);
    if (LEAVE_STATUSES.has(e.status as StatusKey)) return statusAbbr(e.status);
    // DOUBLE_TIME_STATUSES entries store the worked hours in holiday_overtime_hours
    // (regular_hours is always 0 for these — see TimesheetEntryDialog.handleSave), so
    // the day-grid cell needs to read from there or a worked holiday/weekend shows "0".
    if (DOUBLE_TIME_STATUSES.has(e.status as StatusKey)) return e.holiday_overtime_hours || 0;
    return e.regular_hours || 0;
  };

  const downloadExcel = async () => {
    const { default: ExcelJS } = await import('exceljs');
    const wb = new ExcelJS.Workbook(); wb.creator = 'Ozech MyOffice';
    const targets = scope === 'combined' ? employees : employees.filter(e => String(e.id) === String(empId));

    if (scope === 'combined') {
      const ws = wb.addWorksheet('Timesheet Summary');
      const FIXED_COLS = 3;
      const SUM_COLS = 6;
      const totalCols = FIXED_COLS + days.length + SUM_COLS;
      ws.views = [{ state: 'frozen', xSplit: FIXED_COLS, ySplit: 3 }];

      const FONT = 'Calibri';
      // Actual leads (emphasized, brand fill) — it's the headline figure now that Total is
      // gone; Reg/OT/Standby/Night Allow. follow as the breakdown behind it.
      const SUM_FILLS = [EXPORT_BRAND_ARGB, 'FFE8F4FD', 'FFD0E8F5', 'FFB8D9F0', 'FFFBEED4', 'FFDCE6F7'];
      const SUM_COLORS = ['FFFFFFFF', 'FF1E3A5F', 'FF1E3A5F', 'FF1E3A5F', 'FF7A5A1E', 'FF1E3A5F'];

      ws.mergeCells(1, 1, 1, totalCols);
      const titleCell = ws.getCell(1, 1);
      titleCell.value = `${tabLabel} Timesheet — ${fmtPeriod(period)}`;
      titleCell.font = { name: FONT, bold: true, size: 14, color: { argb: EXPORT_BRAND_ARGB } };
      titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
      ws.getRow(1).height = 24;
      ws.addRow([]);

      const hdrRow = ws.getRow(3);
      hdrRow.values = ['Employee', 'Emp #', 'Position', ...days.map(d => `${d.getDate()}\n${d.toLocaleDateString('en-GB', { weekday: 'short' })}`), 'Actual h', 'Reg h', 'OT 1.5×', 'OT 2.0×', 'Standby h', 'Night Allow. h'];
      hdrRow.height = 32;
      hdrRow.eachCell({ includeEmpty: true }, (c, col) => {
        const isSumCol = col > FIXED_COLS + days.length;
        const isFixedCol = col <= FIXED_COLS;
        c.font = { name: FONT, bold: true, size: 8, color: { argb: 'FFFFFFFF' } };
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isFixedCol ? 'FF1A3450' : isSumCol ? 'FF163554' : EXPORT_BRAND_ARGB } };
        c.alignment = { horizontal: isFixedCol ? 'left' : 'center', vertical: 'middle', wrapText: !isFixedCol };
        c.border = { bottom: { style: 'medium', color: { argb: 'FF86BBD8' } } };
      });

      const STATUS_FILL: Record<string, string> = { work: 'FFE8F8F0', leave: 'FFE8E4F8', sick: 'FFF8E4EE', special_leave: 'FFF0E8F8', holiday: 'FFF8EEE4', holiday_paid: 'FFFDF6DC', training: 'FFF8F4E4', off: 'FFF2F4F6', absent: 'FFF8E8E8' };

      targets.forEach((emp, ei) => {
        const totals = calcTotalsLocal(emp.id);
        const empIdDisplay = emp.employeeId || '';
        const rowVals: (string | number)[] = [emp.name, empIdDisplay, emp.position || ''];
        days.forEach(day => rowVals.push(dayCell(getEntry(emp.id, day), day)));
        rowVals.push(totals.actual, totals.reg, totals.ot15, totals.ot20, totals.standbyBonus, totals.nightAllowanceBonus);

        const dataRow = ws.getRow(4 + ei);
        dataRow.values = rowVals;
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

        days.forEach((day, di) => {
          const e = getEntry(emp.id, day);
          const cell = dataRow.getCell(FIXED_COLS + 1 + di);
          const isWknd = day.getDay() === 0 || day.getDay() === 6;
          if (e) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: STATUS_FILL[e.status] || (stripe ? 'FFF5F8FB' : 'FFFFFFFF') } };
            if (LEAVE_STATUSES.has(e.status as StatusKey) || ZERO_HOUR_STATUSES.has(e.status as StatusKey)) cell.font = { name: FONT, size: 7, italic: true, color: { argb: 'FF4A6F8A' } };
          } else {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isWknd ? 'FFE8EDF2' : stripe ? 'FFF5F8FB' : 'FFFFFFFF' } };
            if (isWknd) cell.font = { name: FONT, size: 8, color: { argb: 'FFBBC8D4' } };
          }
        });

        [0, 1, 2, 3, 4, 5].forEach(si => {
          const c = dataRow.getCell(FIXED_COLS + 1 + days.length + si);
          c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SUM_FILLS[si] } };
          c.font = { name: FONT, size: 8, bold: si === 0, color: { argb: SUM_COLORS[si] } };
          c.numFmt = '0.00';
          c.alignment = { horizontal: 'center', vertical: 'middle' };
        });
      });

      const gtRow = ws.getRow(4 + targets.length + 1);
      gtRow.values = ['TOTALS', '', `${targets.length} employees`, ...days.map(() => ''),
        targets.reduce((s, e) => s + calcTotalsLocal(e.id).actual, 0), targets.reduce((s, e) => s + calcTotalsLocal(e.id).reg, 0),
        targets.reduce((s, e) => s + calcTotalsLocal(e.id).ot15, 0), targets.reduce((s, e) => s + calcTotalsLocal(e.id).ot20, 0),
        targets.reduce((s, e) => s + calcTotalsLocal(e.id).standbyBonus, 0), targets.reduce((s, e) => s + calcTotalsLocal(e.id).nightAllowanceBonus, 0)];
      gtRow.height = 20;
      gtRow.eachCell({ includeEmpty: true }, (c, col) => {
        const isSumCol = col > FIXED_COLS + days.length;
        c.font = { name: FONT, bold: true, size: 8, color: { argb: isSumCol ? 'FFFFFFFF' : 'FF1E3A5F' } };
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isSumCol ? EXPORT_BRAND_ARGB : 'FFD0E8F5' } };
        c.alignment = { horizontal: col <= FIXED_COLS ? 'left' : 'center', vertical: 'middle' };
        if (isSumCol) c.numFmt = '0.00';
        c.border = { top: { style: 'medium', color: { argb: 'FF86BBD8' } } };
      });

      ws.getColumn(1).width = 24; ws.getColumn(2).width = 9; ws.getColumn(3).width = 16;
      for (let i = 0; i < days.length; i++) ws.getColumn(FIXED_COLS + 1 + i).width = 5.5;
      [10, 10, 10, 10, 11, 12].forEach((w, i) => { ws.getColumn(FIXED_COLS + 1 + days.length + i).width = w; });

    } else {
      targets.forEach(emp => {
        const ws = wb.addWorksheet(emp.name.slice(0, 31));
        const totals = calcTotalsLocal(emp.id);
        ws.mergeCells('A1:L1'); ws.getCell('A1').value = `${tabLabel} Timesheet`;
        ws.getCell('A1').font = { bold: true, size: 14, color: { argb: EXPORT_BRAND_ARGB } };
        ws.mergeCells('A2:L2'); ws.getCell('A2').value = `${emp.name} | ${fmtPeriod(period)}`;
        ws.getCell('A2').font = { bold: true, size: 11 };
        ws.addRow([]);
        const hdr = ws.addRow(['Day', 'Date', 'Status', 'Start', 'End', 'Regular', 'OT 1.5×', 'OT 2.0×', 'Night', 'Standby', 'Actual', 'Notes']);
        hdr.eachCell(c => { c.font = { bold: true, color: { argb: 'FFFFFFFF' } }; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: EXPORT_BRAND_ARGB } }; c.alignment = { horizontal: 'center' }; });
        buildRows(emp).forEach((row, i) => {
          const r = ws.addRow([row.day, row.date, row.status, row.start, row.end, +row.reg, +row.ot15, +row.ot20, +row.night, '', '', row.notes]);
          if (i % 2 === 1) r.eachCell(c => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F7FA' } }; });
        });
        ws.addRow([]);
        const bonusNote = totals.nightAllowanceBonus > 0 ? ` (incl. ${totals.nightAllowanceBonus}h night allowance)` : '';
        const tr = ws.addRow(['TOTALS', '', '', '', '', totals.reg.toFixed(2), totals.ot15.toFixed(2), totals.ot20.toFixed(2), totals.night.toFixed(2), totals.standbyBonus.toFixed(2), totals.actual.toFixed(2), `Grand: ${totals.total.toFixed(2)}h${bonusNote}`]);
        tr.eachCell(c => { c.font = { bold: true }; });
        ws.columns = [{ width: 6 }, { width: 13 }, { width: 15 }, { width: 8 }, { width: 8 }, { width: 10 }, { width: 10 }, { width: 10 }, { width: 10 }, { width: 10 }, { width: 10 }, { width: 35 }];
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
    const BRAND = EXPORT_BRAND_RGB;

    if (scope === 'combined') {
      doc.setFillColor(...BRAND); doc.rect(0, 0, 297, 16, 'F');
      doc.setTextColor(255, 255, 255); doc.setFontSize(11);
      doc.text(`${tabLabel} Timesheet — ${fmtPeriod(period)}`, 10, 10);
      doc.setFontSize(8); doc.text(`${targets.length} employees · Generated ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`, 10, 14);

      const dayW = Math.min(5.5, (277 - 35 - 20 - 66) / days.length);
      const colStyles: Record<number, { cellWidth: number; halign?: 'center' | 'left' }> = { 0: { cellWidth: 35, halign: 'left' }, 1: { cellWidth: 20, halign: 'left' } };
      days.forEach((_, i) => { colStyles[2 + i] = { cellWidth: dayW, halign: 'center' }; });
      [0, 1, 2, 3, 4, 5].forEach(si => { colStyles[2 + days.length + si] = { cellWidth: 11, halign: 'center' }; });

      const head = [['Employee', 'Position', ...days.map(d => `${d.getDate()}`), 'Actual', 'Reg', 'OT\n1.5×', 'OT\n2.0×', 'Standby', 'Night\nAllow.']];
      const body = targets.map(emp => {
        const totals = calcTotalsLocal(emp.id);
        return [emp.name, emp.position || '', ...days.map(day => { const v = dayCell(getEntry(emp.id, day), day); return v === 0 ? '' : String(v); }), totals.actual.toFixed(1), totals.reg.toFixed(1), totals.ot15.toFixed(1), totals.ot20.toFixed(1), totals.standbyBonus.toFixed(1), totals.nightAllowanceBonus.toFixed(1)];
      });
      body.push(['TOTALS', `${targets.length} emp`, ...days.map(() => ''),
        targets.reduce((s, e) => s + calcTotalsLocal(e.id).actual, 0).toFixed(1), targets.reduce((s, e) => s + calcTotalsLocal(e.id).reg, 0).toFixed(1),
        targets.reduce((s, e) => s + calcTotalsLocal(e.id).ot15, 0).toFixed(1), targets.reduce((s, e) => s + calcTotalsLocal(e.id).ot20, 0).toFixed(1),
        targets.reduce((s, e) => s + calcTotalsLocal(e.id).standbyBonus, 0).toFixed(1), targets.reduce((s, e) => s + calcTotalsLocal(e.id).nightAllowanceBonus, 0).toFixed(1)]);

      autoTable(doc, {
        startY: 20, head, body,
        styles: { fontSize: 6, cellPadding: 1, overflow: 'ellipsize' },
        headStyles: { fillColor: BRAND, textColor: 255, fontStyle: 'bold', cellPadding: 1.2 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: colStyles,
        didParseCell: d => {
          if (d.section === 'body' && d.row.index === targets.length) { d.cell.styles.fontStyle = 'bold'; d.cell.styles.fillColor = [208, 232, 245]; }
          const col = d.column.index;
          if (col >= 2 && col < 2 + days.length) {
            const day = days[col - 2];
            if (day && (day.getDay() === 0 || day.getDay() === 6) && d.section === 'body' && d.row.index < targets.length) d.cell.styles.fillColor = [236, 240, 243];
          }
        },
      });
    } else {
      targets.forEach((emp, ei) => {
        if (ei > 0) doc.addPage();
        const totals = calcTotalsLocal(emp.id); const rows = buildRows(emp);
        const bonusNote = totals.nightAllowanceBonus > 0 ? ` (incl. ${totals.nightAllowanceBonus}h night allow.)` : '';
        doc.setFillColor(...BRAND); doc.rect(0, 0, 297, 18, 'F');
        doc.setTextColor(255, 255, 255); doc.setFontSize(12); doc.text(`${tabLabel} Timesheet`, 10, 7);
        doc.setFontSize(9); doc.text(fmtPeriod(period), 10, 13);
        doc.setFontSize(11); doc.text(emp.name, 287, 10, { align: 'right' });
        autoTable(doc, {
          startY: 22,
          head: [['Day', 'Date', 'Status', 'Start', 'End', 'Reg', 'OT 1.5×', 'OT 2.0×', 'Night', 'Standby', 'Actual', 'Notes']],
          body: [...rows.map(r => [r.day, r.date, r.status, r.start, r.end, r.reg, r.ot15, r.ot20, r.night, '', '', r.notes]), ['TOTALS', '', '', '', '', totals.reg.toFixed(2), totals.ot15.toFixed(2), totals.ot20.toFixed(2), totals.night.toFixed(2), totals.standbyBonus.toFixed(2), totals.actual.toFixed(2), `Total: ${totals.total.toFixed(2)}h${bonusNote}`]],
          styles: { fontSize: 7.5, cellPadding: 1.5 },
          headStyles: { fillColor: BRAND, textColor: 255, fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          columnStyles: { 0: { cellWidth: 10 }, 1: { cellWidth: 22 }, 2: { cellWidth: 20 }, 3: { cellWidth: 14 }, 4: { cellWidth: 14 }, 5: { cellWidth: 16 }, 6: { cellWidth: 16 }, 7: { cellWidth: 16 }, 8: { cellWidth: 16 }, 9: { cellWidth: 16 }, 10: { cellWidth: 16 }, 11: { cellWidth: 'auto' } },
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

  const fmtOpts: Array<['excel' | 'pdf', string, ElementType]> = [['excel', 'Excel (.xlsx)', FileSpreadsheet], ['pdf', 'PDF', FileText]];
  const scopeOpts: Array<['combined' | 'individual', string, ElementType]> = [['combined', `All (${employees.length})`, Users], ['individual', 'One employee', Building2]];

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className={`sm:max-w-sm ${t.glass}`}>
        <DialogHeader>
          <DialogTitle className={`flex items-center gap-2 ${t.textPrimary}`}><Download className="w-4 h-4" /> Download Timesheet</DialogTitle>
          <DialogDescription className={t.textFaint}>{fmtPeriod(period)}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2"><Label className={`text-xs ${TYPE_WEIGHT.semibold} uppercase tracking-wide ${t.textFaint}`}>Format</Label>
            <div className="grid grid-cols-2 gap-2">{fmtOpts.map(([val, lbl, Icon]) => (
              <button key={val} type="button" onClick={() => setFormat(val)} className={`flex items-center gap-2 p-3 border-2 rounded-lg text-sm transition-colors ${format === val ? 'border-brand-400/50 bg-brand-500/10 text-brand-400' : `${t.border} ${t.textFaint} ${t.hoverBg}`}`}><Icon className="w-4 h-4" />{lbl}</button>
            ))}</div>
          </div>
          <div className="space-y-2"><Label className={`text-xs ${TYPE_WEIGHT.semibold} uppercase tracking-wide ${t.textFaint}`}>Scope</Label>
            <div className="grid grid-cols-2 gap-2">{scopeOpts.map(([val, lbl, Icon]) => (
              <button key={val} type="button" onClick={() => setScope(val)} className={`flex items-center gap-2 p-3 border-2 rounded-lg text-sm transition-colors ${scope === val ? 'border-brand-400/50 bg-brand-500/10 text-brand-400' : `${t.border} ${t.textFaint} ${t.hoverBg}`}`}><Icon className="w-4 h-4" />{lbl}</button>
            ))}</div>
          </div>
          {scope === 'individual' && (
            <div className="space-y-1.5"><Label className={`text-xs ${t.textFaint}`}>Employee</Label>
              <Select value={empId} onValueChange={setEmpId}><SelectTrigger className={`h-9 text-sm ${t.inputBg}`}><SelectValue placeholder="Select…" /></SelectTrigger><SelectContent>{employees.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent></Select>
            </div>
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" className={`${t.textMuted} bg-transparent`} onClick={onClose}>Cancel</Button>
          <Button onClick={generate} disabled={generating} className="bg-brand-600 hover:bg-brand-700 text-white">{generating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Download</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────── TIMESHEET GRID ───────────────────

const calcTotals = calcEmployeeTotals;

function TimesheetGrid({ employees, timesheets, days, onCellClick, onQuickAdd, onQuickRemove, onBulkAssign, onRemoveEmployee }: {
  employees: Employee[]; timesheets: TimesheetEntry[]; days: Date[];
  onCellClick: (emp: Employee, day: Date, entry?: TimesheetEntry) => void;
  onQuickAdd: (emp: Employee, day: Date) => void; onQuickRemove: (emp: Employee, entry: TimesheetEntry) => void;
  onBulkAssign: (emp: Employee) => void; onRemoveEmployee: (id: string) => void;
}) {
  const t = useTheme();
  const getEntry = (eid: string, d: Date) => timesheets.find(ts => String(ts.employee_id) === String(eid) && ts.date === fmtDate(d));
  const today = fmtDate(new Date());
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

  if (employees.length === 0) {
    return <EmptyState icon={Users} title="No employees on this roster" message={'Set NEC / Salaried on the Employees page, or click "Add Employees" to add someone manually'} />;
  }

  const stickyBg = t.light ? 'bg-white' : 'bg-[#040c18]';
  // A frozen/sticky header needs to stay fully opaque no matter what — stacking a
  // second, translucent bg-* class on top of stickyBg (e.g. for a holiday tint) is a
  // real bug, not just a style choice: which one actually wins is decided by Tailwind's
  // generated stylesheet order, not by the order the classes appear in this string, so
  // it silently went transparent on holiday columns and scrolled rows showed through
  // the header. One resolved, always-solid color instead of two stacked ones.
  const dayHeaderBg = (isHoliday: boolean) => isHoliday ? (t.light ? 'bg-violet-50' : 'bg-[#150e2b]') : stickyBg;

  return (
    <Table containerClassName="overflow-auto max-h-[calc(100vh-260px)]">
      <TableHeader>
        <TableRow className={`${t.border} hover:bg-transparent`}>
          <TableHead className={`min-w-52 sticky left-0 top-0 z-30 ${stickyBg} border-r ${t.border} ${t.textMuted}`}>Employee</TableHead>
          {days.map(d => {
            const ds = fmtDate(d);
            const isWknd = d.getDay() === 0 || d.getDay() === 6;
            const holiday = zimHolidayName(ds);
            return (
              <TableHead key={ds} title={holiday || undefined} className={`text-center min-w-[70px] px-0.5 sticky top-0 z-20 ${dayHeaderBg(!!holiday)}`}>
                <div className="flex flex-col items-center text-[9px] py-1">
                  <span className={t.textFaint}>{d.toLocaleDateString('en-GB', { weekday: 'short' })}</span>
                  <span className={`${TYPE_WEIGHT.bold} text-sm ${holiday ? accentText('violet', t.light) : ds === today ? 'text-brand-400' : isWknd ? t.textFaint : t.textMuted}`}>{d.getDate()}</span>
                  <span className={t.textFaint}>{d.toLocaleDateString('en-GB', { month: 'short' })}</span>
                  {holiday && <Sun className={`w-2.5 h-2.5 ${accentText('violet', t.light)} mt-0.5`} />}
                </div>
              </TableHead>
            );
          })}
          <TableHead className={`text-center min-w-14 text-[10px] ${TYPE_WEIGHT.semibold} sticky top-0 z-20 ${stickyBg} ${t.textMuted}`}>Actual</TableHead>
          <TableHead className={`text-center min-w-14 ${accentText('emerald', t.light)} text-[10px] ${TYPE_WEIGHT.semibold} sticky top-0 z-20 ${stickyBg}`}>Reg</TableHead>
          <TableHead className={`text-center min-w-14 text-brand-400 text-[10px] ${TYPE_WEIGHT.semibold} sticky top-0 z-20 ${stickyBg}`}>1.5×</TableHead>
          <TableHead className={`text-center min-w-14 text-sky-400 text-[10px] ${TYPE_WEIGHT.semibold} sticky top-0 z-20 ${stickyBg}`}>2.0×</TableHead>
          <TableHead className={`text-center min-w-14 ${accentText('amber', t.light)} text-[10px] ${TYPE_WEIGHT.semibold} sticky top-0 z-20 ${stickyBg}`}>Standby</TableHead>
          <TableHead className={`text-center min-w-16 ${accentText('indigo', t.light)} text-[10px] ${TYPE_WEIGHT.semibold} sticky top-0 z-20 ${stickyBg}`}>Night Allow</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {employees.map(emp => {
          const totals = calcTotals(emp.id, timesheets);
          return (
            <TableRow key={emp.id} className={`${t.border} ${t.hoverBgSoft} group/row`}>
              <TableCell className={`sticky left-0 z-10 ${stickyBg} border-r ${t.border} py-0 group/emp`}>
                <div className="relative py-2">
                  {confirmRemoveId === emp.id ? (
                    <div className={`absolute top-1 right-1 flex items-center gap-0.5 ${t.glass} rounded-lg px-1.5 py-1 z-20 border border-red-500/30`}>
                      <span className="text-[9px] text-red-400 mr-0.5">Remove?</span>
                      <button type="button" title="Confirm remove" onClick={() => { onRemoveEmployee(emp.id); setConfirmRemoveId(null); }} className="h-4 w-4 flex items-center justify-center rounded bg-red-500/20 text-red-400 hover:bg-red-500/40 transition-all"><Check className="w-2.5 h-2.5" /></button>
                      <button type="button" title="Cancel" onClick={() => setConfirmRemoveId(null)} className={`h-4 w-4 flex items-center justify-center rounded ${t.chipBg} ${t.textFaint} ${t.hoverBg} transition-all`}><X className="w-2.5 h-2.5" /></button>
                    </div>
                  ) : (
                    <button type="button" title="Remove employee from this period" onClick={() => setConfirmRemoveId(emp.id)}
                      className="absolute top-1.5 right-1.5 h-5 w-5 flex items-center justify-center rounded-full opacity-0 group-hover/emp:opacity-100 bg-red-500/[0.08] text-red-400/50 hover:bg-red-500/20 hover:text-red-400 transition-all duration-150">
                      <X className="w-2.5 h-2.5" />
                    </button>
                  )}
                  <div className="flex items-center gap-2 pr-5">
                    <User className="h-5 w-5 shrink-0 text-brand-400" />
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm ${TYPE_WEIGHT.medium} truncate leading-tight ${t.textPrimary}`}>{emp.name}</p>
                      <p className={`text-[10px] truncate mt-0.5 ${t.textFaint}`}>{emp.position}</p>
                      <div className="mt-1.5 flex items-center gap-1">
                        <button type="button" title="Bulk assign shifts for this employee" onClick={() => onBulkAssign(emp)}
                          className="flex items-center gap-1 text-[10px] px-2 py-[3px] rounded-full bg-brand-500/10 text-brand-400/70 hover:bg-brand-500/20 hover:text-brand-400 transition-all duration-150 group/bulk">
                          <CalendarDays className="w-2.5 h-2.5 group-hover/bulk:scale-110 transition-transform" /><span className="tracking-wide">Assign shifts</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </TableCell>
              {days.map(day => {
                const ds = fmtDate(day);
                const entry = getEntry(emp.id, day);
                const isWknd = day.getDay() === 0 || day.getDay() === 6;
                const isToday = ds === today;
                const cfg = entry ? STATUS_CFG[entry.status] : null;
                return (
                  <TableCell key={ds} className={`text-center p-0.5 ${isWknd ? t.chipBg : ''}`}>
                    <div className="relative group/cell">
                      <button type="button"
                        style={entry && cfg ? { backgroundColor: `${cfg.hex}18`, borderColor: `${cfg.hex}55`, color: cfg.hex } : undefined}
                        className={`w-full min-h-[60px] h-auto rounded-lg text-center flex flex-col items-center justify-center transition-all text-[9px] border gap-0.5 py-1.5 ${
                          entry && cfg ? 'hover:brightness-110' : isToday ? 'bg-brand-500/10 border-brand-400/30 border-dashed hover:bg-brand-500/20' : `border-transparent ${t.hoverBg}`
                        } ${isToday ? 'ring-1 ring-brand-400/30' : ''}`}
                        onClick={() => onCellClick(emp, day, entry)}>
                        {entry && cfg ? (
                          <>
                            <StatusPill status={entry.status} dark />
                            {!ZERO_HOUR_STATUSES.has(entry.status) && (() => {
                              const isDT = DOUBLE_TIME_STATUSES.has(entry.status as StatusKey);
                              const displayH = isDT ? (entry.holiday_overtime_hours || 0) : (entry.regular_hours || 0);
                              // Plain hours worked, never multiplied — the "@2.0×" tag just names
                              // which rate bucket they fall into; HR applies the multiplier when
                              // running payroll, this module isn't doing that math for them.
                              return displayH > 0 ? <span className={`${TYPE_WEIGHT.bold} ${isDT ? accentText('amber', t.light) : t.textMuted}`}>{displayH.toFixed(1)}h{isDT ? ' @ 2.0×' : ''}</span> : null;
                            })()}
                            {!DOUBLE_TIME_STATUSES.has(entry.status as StatusKey) && (entry.overtime_hours || 0) > 0 && <span className={`text-brand-400 ${TYPE_WEIGHT.semibold}`}>+{entry.overtime_hours!.toFixed(1)} OT</span>}
                            {/* 2.0x overtime landed on an otherwise non-holiday/weekend day (e.g.
                                approved weekend/holiday OT on top of a normal work day) — without
                                this it was invisible here even though it's correctly counted in
                                the period's 2.0× total below. */}
                            {!DOUBLE_TIME_STATUSES.has(entry.status as StatusKey) && (entry.holiday_overtime_hours || 0) > 0 && <span className={`text-sky-400 ${TYPE_WEIGHT.semibold}`}>+{entry.holiday_overtime_hours!.toFixed(1)}h @ 2.0×</span>}
                            {(entry.nightshift_hours || 0) > 0 && <span className="text-sky-400 text-[8px]"><Moon className="w-2 h-2 inline -mt-px" />{entry.nightshift_hours!.toFixed(1)}n</span>}
                            {entry.standby_allowance && <span className={`${accentText('amber', t.light)} text-[8px] ${TYPE_WEIGHT.medium}`}>SB</span>}
                            {entry.nightshift_allowance && <span className={`${accentText('indigo', t.light)} text-[8px] ${TYPE_WEIGHT.medium}`}>NA</span>}
                          </>
                        ) : (
                          <span className={`text-base font-light ${isToday ? 'text-brand-400/50' : t.textFaint}`}>+</span>
                        )}
                      </button>
                      {entry?._auto && (
                        // Derived from approved leave/overtime, not yet a saved entry — click
                        // to confirm or adjust, same as any other cell.
                        <span title="Auto-filled from approved leave/overtime — click to confirm"
                          className="absolute top-0.5 left-0.5 h-1.5 w-1.5 rounded-full bg-white ring-2 ring-white/40 pointer-events-none" />
                      )}
                      {!entry && (
                        // Instant add, no dialog — a normal shift at this employee's own role
                        // length (see normalShiftHours), or the day's paid-holiday/weekend
                        // default. The cell's own click still opens the full dialog for
                        // anything this shortcut doesn't cover (leave, custom hours, etc).
                        <button type="button" title="Quick add: normal shift"
                          onClick={e => { e.stopPropagation(); onQuickAdd(emp, day); }}
                          className="absolute bottom-0.5 right-0.5 h-4 w-4 flex items-center justify-center rounded-full opacity-0 group-hover/cell:opacity-100 bg-emerald-500/15 text-emerald-400/70 hover:bg-emerald-500/30 hover:text-emerald-400 transition-all duration-150">
                          <Plus className="w-2.5 h-2.5" />
                        </button>
                      )}
                      {entry?.id != null && (
                        // Instant remove, no dialog — only for real saved rows; a virtual
                        // (_auto) projection has nothing to delete yet.
                        <button type="button" title="Quick remove this entry"
                          onClick={e => { e.stopPropagation(); onQuickRemove(emp, entry); }}
                          className="absolute bottom-0.5 right-0.5 h-4 w-4 flex items-center justify-center rounded-full opacity-0 group-hover/cell:opacity-100 bg-red-500/15 text-red-400/70 hover:bg-red-500/30 hover:text-red-400 transition-all duration-150">
                          <X className="w-2.5 h-2.5" />
                        </button>
                      )}
                      {entry && (
                        <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover/cell:block z-50 min-w-[130px]">
                          <div className={`${t.glass} rounded-lg px-2.5 py-2 text-left ${t.shadow}`}>
                            <p className={`text-[10px] ${TYPE_WEIGHT.semibold} mb-1 ${t.textMuted}`}>{STATUS_CFG[entry.status]?.label}</p>
                            {entry.start_time && <p className={`text-[9px] ${t.textFaint}`}>{entry.start_time} – {entry.end_time}</p>}
                            {!ZERO_HOUR_STATUSES.has(entry.status) && (
                              <div className="mt-1 space-y-0.5">
                                {DOUBLE_TIME_STATUSES.has(entry.status as StatusKey)
                                  ? <p className={`text-[9px] ${accentText('amber', t.light)} ${TYPE_WEIGHT.semibold}`}>{((entry.holiday_overtime_hours || 0) + (entry.regular_hours || 0)).toFixed(1)}h @ 2.0×</p>
                                  : <p className={`text-[9px] ${accentText('emerald', t.light)}`}>{(entry.regular_hours || 0).toFixed(1)}h reg</p>}
                                {!DOUBLE_TIME_STATUSES.has(entry.status as StatusKey) && (entry.overtime_hours || 0) > 0 && <p className="text-[9px] text-brand-400">+{entry.overtime_hours!.toFixed(1)}h OT 1.5×</p>}
                                {!DOUBLE_TIME_STATUSES.has(entry.status as StatusKey) && (entry.holiday_overtime_hours || 0) > 0 && <p className="text-[9px] text-sky-400">+{entry.holiday_overtime_hours!.toFixed(1)}h OT 2.0×</p>}
                                {(entry.nightshift_hours || 0) > 0 && <p className="text-[9px] text-sky-400">{entry.nightshift_hours!.toFixed(1)}h night</p>}
                                {(entry.callout_overtime_hours || 0) > 0 && <p className="text-[9px] text-orange-400">{entry.callout_overtime_hours!.toFixed(1)}h callout</p>}
                              </div>
                            )}
                            {entry.standby_allowance && <p className={`text-[9px] ${accentText('amber', t.light)} mt-0.5`}>Standby</p>}
                            {entry.nightshift_allowance && <p className={`text-[9px] ${accentText('indigo', t.light)} mt-0.5`}>Night Allowance</p>}
                            {entry._auto && (
                              <p className="text-[9px] mt-1 text-brand-400">
                                {entry._auto === 'leave' ? 'From approved leave' : entry._auto === 'overtime' ? 'Includes approved OT' : 'Approved leave + OT'} — click to confirm
                              </p>
                            )}
                            {entry.notes && <p className={`text-[9px] mt-1 italic truncate max-w-[120px] ${t.textFaint}`}>{entry.notes}</p>}
                          </div>
                        </div>
                      )}
                    </div>
                  </TableCell>
                );
              })}
              <TableCell className="text-center py-2"><span className={`text-base ${TYPE_WEIGHT.bold} ${t.textPrimary}`}>{totals.actual.toFixed(1)}</span></TableCell>
              <TableCell className="text-center py-2">
                <div className={`text-sm ${TYPE_WEIGHT.bold} ${accentText('emerald', t.light)}`}>{totals.reg.toFixed(1)}</div>
                {(totals.excess || 0) > 0 && <div className="text-[9px] text-brand-400">+{totals.excess!.toFixed(1)}→OT</div>}
              </TableCell>
              <TableCell className={`text-center py-2 text-sm ${TYPE_WEIGHT.bold} text-brand-400`}>{totals.ot15.toFixed(1)}</TableCell>
              <TableCell className={`text-center py-2 text-sm ${TYPE_WEIGHT.bold} text-sky-400`}>{totals.ot20.toFixed(1)}</TableCell>
              <TableCell className={`text-center py-2 text-sm ${TYPE_WEIGHT.bold} ${accentText('amber', t.light)}`}>{totals.standbyBonus.toFixed(1)}</TableCell>
              <TableCell className={`text-center py-2 text-sm ${TYPE_WEIGHT.bold} ${accentText('indigo', t.light)}`}>{totals.nightAllowanceBonus.toFixed(1)}</TableCell>
            </TableRow>
          );
        })}
        {employees.length > 0 && (() => {
          const grand = employees.reduce((acc, emp) => {
            const tt = calcTotals(emp.id, timesheets);
            return { reg: acc.reg + tt.reg, ot15: acc.ot15 + tt.ot15, ot20: acc.ot20 + tt.ot20, standbyBonus: acc.standbyBonus + tt.standbyBonus, nightAllowanceBonus: acc.nightAllowanceBonus + tt.nightAllowanceBonus, actual: acc.actual + tt.actual };
          }, { reg: 0, ot15: 0, ot20: 0, standbyBonus: 0, nightAllowanceBonus: 0, actual: 0 });
          return (
            <TableRow className={`border-t-2 ${t.border} ${t.chipBg}`}>
              <TableCell className={`sticky left-0 z-10 ${stickyBg} border-r ${t.border} py-3`}>
                <div className="flex items-center gap-2 px-1">
                  <Users className="w-3.5 h-3.5 text-brand-400/60 shrink-0" />
                  <div><p className={`text-xs ${TYPE_WEIGHT.bold} uppercase tracking-wider ${t.textMuted}`}>Period Totals</p><p className={`text-[10px] ${t.textFaint}`}>{employees.length} employees</p></div>
                </div>
              </TableCell>
              {days.map(day => {
                const daySum = employees.reduce((s, emp) => { const e = timesheets.find(ts => String(ts.employee_id) === String(emp.id) && ts.date === fmtDate(day)); return s + (e?.regular_hours || 0) + (e?.overtime_hours || 0); }, 0);
                const isWknd = day.getDay() === 0 || day.getDay() === 6;
                return <TableCell key={fmtDate(day)} className={`text-center p-0.5 ${isWknd ? t.chipBg : ''}`}>{daySum > 0 && <span className={`text-[9px] ${TYPE_WEIGHT.medium} ${t.textFaint}`}>{daySum.toFixed(0)}</span>}</TableCell>;
              })}
              <TableCell className="text-center py-3"><span className={`text-base font-extrabold ${t.textPrimary}`}>{grand.actual.toFixed(1)}</span></TableCell>
              <TableCell className="text-center py-3"><span className={`text-sm ${TYPE_WEIGHT.bold} ${accentText('emerald', t.light)}`}>{grand.reg.toFixed(1)}</span></TableCell>
              <TableCell className="text-center py-3"><span className={`text-sm ${TYPE_WEIGHT.bold} text-brand-400`}>{grand.ot15.toFixed(1)}</span></TableCell>
              <TableCell className="text-center py-3"><span className={`text-sm ${TYPE_WEIGHT.bold} text-sky-400`}>{grand.ot20.toFixed(1)}</span></TableCell>
              <TableCell className="text-center py-3"><span className={`text-sm ${TYPE_WEIGHT.bold} ${accentText('amber', t.light)}`}>{grand.standbyBonus.toFixed(1)}</span></TableCell>
              <TableCell className="text-center py-3"><span className={`text-sm ${TYPE_WEIGHT.bold} ${accentText('indigo', t.light)}`}>{grand.nightAllowanceBonus.toFixed(1)}</span></TableCell>
            </TableRow>
          );
        })()}
      </TableBody>
    </Table>
  );
}

// ─────────────────── localStorage ───────────────────
// The NEC/Salaried roster is now AUTOMATIC — driven by each employee's employment_type on
// the Employees page — rather than a manually-built list. These two keys no longer hold the
// whole roster; they're just the exceptions layered on top of the automatic one:
//   EXTRA  — someone added by hand (e.g. their employment_type isn't set yet)
//   HIDDEN — an auto-included person removed from this tab's view
// See tabIds in TimesheetsContent for how they combine.
const LS_SALARIED_EXTRA = 'ts_salaried_extra_ids';
const LS_NEC_EXTRA = 'ts_nec_extra_ids';
const LS_SALARIED_HIDDEN = 'ts_salaried_hidden_ids';
const LS_NEC_HIDDEN = 'ts_nec_hidden_ids';
const readLS = (key: string): string[] => { try { return JSON.parse(localStorage.getItem(key) || '[]') as string[]; } catch { return []; } };
const writeLS = (key: string, val: string[]) => localStorage.setItem(key, JSON.stringify(val));

// Excluded from the automatic roster by employee ID — a code-level exclusion (applies for
// everyone, every browser), unlike the HIDDEN localStorage override above which only
// affects one user's own view. PP288 = Philip Antonio, Stores Driver.
const EXCLUDED_EMPLOYEE_IDS = new Set<string>(['PP288']);

// ─────────────────── MAIN PAGE ───────────────────

function TimesheetsContent() {
  const t = useTheme();
  const sections = useCollapseSection({ hero: true });
  const [activeTab, setActiveTab] = useState<'salaried' | 'nec'>('nec');
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const salariedPeriod = useMemo(() => getSalariedPeriod(currentMonth), [currentMonth]);
  const necPeriod = useMemo(() => getNECPeriod(currentMonth), [currentMonth]);
  const activePeriod = activeTab === 'salaried' ? salariedPeriod : necPeriod;
  const days = useMemo(() => getDays(activePeriod), [activePeriod]);

  const { allEmployees, timesheets, setTimesheets, approvedLeaves, approvedOvertime, loading, refresh: load } = useTimesheetsData(activePeriod);

  const [salariedExtra, setSalariedExtra] = useState<string[]>(() => readLS(LS_SALARIED_EXTRA));
  const [necExtra, setNecExtra] = useState<string[]>(() => readLS(LS_NEC_EXTRA));
  const [salariedHidden, setSalariedHidden] = useState<string[]>(() => readLS(LS_SALARIED_HIDDEN));
  const [necHidden, setNecHidden] = useState<string[]>(() => readLS(LS_NEC_HIDDEN));
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'dept'>('name');

  const [showPeriod, setShowPeriod] = useState(true);
  const [showGrid, setShowGrid] = useState(true);

  const [editCell, setEditCell] = useState<EditCell | null>(null);
  const [showBulkAdd, setShowBulkAdd] = useState(false);
  const [showDownload, setShowDownload] = useState(false);
  const [bulkEmployee, setBulkEmployee] = useState<Employee | null>(null);

  // Automatic base roster: every employee whose employment_type matches this tab.
  const autoIds = useMemo(
    () => allEmployees
      .filter(e => e.employmentType === (activeTab === 'salaried' ? 'SALARIED' : 'NEC'))
      .filter(e => !EXCLUDED_EMPLOYEE_IDS.has(e.employeeId))
      .map(e => e.id),
    [allEmployees, activeTab]
  );
  const tabExtra = activeTab === 'salaried' ? salariedExtra : necExtra;
  const tabHidden = activeTab === 'salaried' ? salariedHidden : necHidden;
  const tabIds = useMemo(() => {
    const hidden = new Set(tabHidden);
    return [...new Set([...autoIds, ...tabExtra])].filter(id => !hidden.has(id));
  }, [autoIds, tabExtra, tabHidden]);

  /** Manually add people the automatic roster missed (e.g. employment_type not set yet). */
  const addToTab = useCallback((ids: string[]) => {
    const setExtra = activeTab === 'salaried' ? setSalariedExtra : setNecExtra;
    const setHidden = activeTab === 'salaried' ? setSalariedHidden : setNecHidden;
    const extraKey = activeTab === 'salaried' ? LS_SALARIED_EXTRA : LS_NEC_EXTRA;
    const hiddenKey = activeTab === 'salaried' ? LS_SALARIED_HIDDEN : LS_NEC_HIDDEN;
    setExtra(prev => { const next = [...new Set([...prev, ...ids])]; writeLS(extraKey, next); return next; });
    // Re-adding someone previously hidden should make them visible again.
    setHidden(prev => { const next = prev.filter(id => !ids.includes(id)); writeLS(hiddenKey, next); return next; });
  }, [activeTab]);

  /** Remove from this tab's view. An auto-included person is hidden (an override — they'd
   *  otherwise reappear every load since the roster is derived); an extra person is just
   *  dropped from the extra list. */
  const removeFromTab = useCallback((id: string) => {
    if (autoIds.includes(id)) {
      const setHidden = activeTab === 'salaried' ? setSalariedHidden : setNecHidden;
      const hiddenKey = activeTab === 'salaried' ? LS_SALARIED_HIDDEN : LS_NEC_HIDDEN;
      setHidden(prev => { const next = [...new Set([...prev, id])]; writeLS(hiddenKey, next); return next; });
    } else {
      const setExtra = activeTab === 'salaried' ? setSalariedExtra : setNecExtra;
      const extraKey = activeTab === 'salaried' ? LS_SALARIED_EXTRA : LS_NEC_EXTRA;
      setExtra(prev => { const next = prev.filter(x => x !== id); writeLS(extraKey, next); return next; });
    }
  }, [activeTab, autoIds]);

  const tabEmployees = useMemo(() => {
    const q = search.toLowerCase();
    return allEmployees.filter(e => tabIds.includes(e.id) && (!q || e.name.toLowerCase().includes(q) || e.position.toLowerCase().includes(q) || e.department.toLowerCase().includes(q)))
      .sort((a, b) => sortBy === 'dept' ? (a.department.localeCompare(b.department) || a.name.localeCompare(b.name)) : a.name.localeCompare(b.name));
  }, [allEmployees, tabIds, search, sortBy]);

  // Leaves/overtime store the human-readable employee_id (e.g. "C1165"); timesheets key off
  // the DB integer id. This is the join between them.
  const employeeIdByHuman = useMemo(() => {
    const m = new Map<string, string>();
    allEmployees.forEach(e => { if (e.employeeId) m.set(e.employeeId, e.id); });
    return m;
  }, [allEmployees]);

  // The grid's actual data source: real saved timesheets, with approved leave/overtime
  // projected on top. A real entry always wins — the overlay only fills gaps (leave) or adds
  // on top (overtime), it never overwrites what a person entered. See the TimesheetEntry
  // `_auto` field for how these are told apart in the UI, and handleSaveEntry for why editing
  // one of these cells safely creates a real entry rather than corrupting anything.
  const effectiveTimesheets = useMemo(() => {
    const merged = new Map<string, TimesheetEntry>();
    timesheets.forEach(ts => merged.set(`${ts.employee_id}:${ts.date}`, ts));

    const dayStrs = days.map(fmtDate);
    const dayStrSet = new Set(dayStrs);
    const tabIdSet = new Set(tabIds);

    approvedLeaves.forEach(lv => {
      const dbId = employeeIdByHuman.get(lv.employee_id);
      if (!dbId || !tabIdSet.has(dbId)) return;
      const status = LEAVE_TYPE_TO_STATUS[lv.leave_type];
      if (!status) return;
      dayStrs.forEach(ds => {
        if (ds < lv.start_date || ds > lv.end_date) return;
        const key = `${dbId}:${ds}`;
        if (merged.has(key)) return; // a real entry already exists — it wins
        merged.set(key, {
          employee_id: parseInt(dbId), date: ds, status,
          regular_hours: 8, overtime_hours: 0, holiday_overtime_hours: 0, nightshift_hours: 0,
          total_hours: 8, standby_allowance: false,
          notes: `Auto: ${STATUS_CFG[status].label} (approved leave)`,
          _auto: 'leave',
        });
      });
    });

    approvedOvertime.forEach(ot => {
      const dbId = employeeIdByHuman.get(ot.employee_id);
      if (!dbId || !tabIdSet.has(dbId) || !dayStrSet.has(ot.date)) return;
      const bucket = OT_TYPE_TO_BUCKET[ot.overtime_type];
      if (!bucket) return;
      const hours = ot.hours ?? calcHours(ot.start_time, ot.end_time);
      if (hours <= 0) return;
      const key = `${dbId}:${ot.date}`;
      const base: TimesheetEntry = merged.get(key) ?? {
        employee_id: parseInt(dbId), date: ot.date, status: 'work',
        regular_hours: 0, overtime_hours: 0, holiday_overtime_hours: 0, nightshift_hours: 0,
        total_hours: 0, standby_allowance: false,
      };
      const updated: TimesheetEntry = { ...base };
      if (bucket === 'ot20') updated.holiday_overtime_hours = (base.holiday_overtime_hours || 0) + hours;
      else updated.overtime_hours = (base.overtime_hours || 0) + hours;
      updated.total_hours = (base.total_hours || 0) + hours;
      updated._auto = base._auto === 'leave' ? 'both' : 'overtime';
      merged.set(key, updated);
    });

    // Zimbabwe public holidays: anyone with no entry at all on a holiday date is assumed
    // not to have worked it and gets the standard 8h paid-holiday credit automatically —
    // same "fills gaps, never overwrites" rule as leave/OT above, so a real entry (or one
    // of those overlays, e.g. approved leave that happens to cover the holiday) still wins.
    dayStrs.forEach(ds => {
      const holidayName = zimHolidayName(ds);
      if (!holidayName) return;
      tabIds.forEach(id => {
        const key = `${id}:${ds}`;
        if (merged.has(key)) return;
        merged.set(key, {
          employee_id: parseInt(id), date: ds, status: 'holiday_paid',
          regular_hours: 8, overtime_hours: 0, holiday_overtime_hours: 0, nightshift_hours: 0,
          total_hours: 8, standby_allowance: false,
          notes: `Auto: Paid Public Holiday (${holidayName})`,
          _auto: 'holiday',
        });
      });
    });

    return [...merged.values()];
  }, [timesheets, approvedLeaves, approvedOvertime, employeeIdByHuman, tabIds, days]);

  const summary = useMemo(() => {
    const tot = tabEmployees.reduce((acc, e) => {
      const tt = calcTotals(e.id, effectiveTimesheets);
      return { reg: acc.reg + tt.reg, ot15: acc.ot15 + tt.ot15, ot20: acc.ot20 + tt.ot20, night: acc.night + tt.night, standbyBonus: acc.standbyBonus + tt.standbyBonus };
    }, { reg: 0, ot15: 0, ot20: 0, night: 0, standbyBonus: 0 });
    const filled = new Set(effectiveTimesheets.filter(ts => tabIds.includes(String(ts.employee_id))).map(ts => `${ts.employee_id}:${ts.date}`)).size;
    const workingDays = days.filter(d => d.getDay() !== 0 && d.getDay() !== 6).length;
    const possible = tabEmployees.length * workingDays;
    return { ...tot, filled, possible };
  }, [effectiveTimesheets, tabEmployees, tabIds, days]);

  const handleSaveEntry = async (empId: string, date: Date, data: Omit<TimesheetEntry, 'id'>) => {
    const ds = fmtDate(date);
    const existing = timesheets.find(ts => String(ts.employee_id) === String(empId) && ts.date === ds);
    if (existing?.id) {
      const updated = await api.update(existing.id, data);
      setTimesheets(prev => prev.map(ts => ts.id === existing.id ? { ...ts, ...updated } : ts));
    } else {
      const created = await api.create(data);
      setTimesheets(prev => [...prev, created]);
    }
  };

  const handleDeleteEntry = async (entryId: number) => {
    await api.delete(entryId);
    setTimesheets(prev => prev.filter(ts => ts.id !== entryId));
  };

  /** Reverts one bulk write: restores each touched row to what it was before (or deletes
   *  it, if it didn't exist before that write). A self-contained plan built at write time
   *  — not a live lookup against current `timesheets` state — so it stays correct even
   *  after however many renders pass before the Undo button actually gets clicked. */
  const undoBulk = async (plan: { id: number; previous: TimesheetEntry | null }[]) => {
    try {
      const results = await Promise.allSettled(plan.map(({ id, previous }) => {
        if (previous) { const { id: _pid, ...fields } = previous; return api.update(id, fields); }
        return api.delete(id);
      }));
      setTimesheets(prev => {
        const map = new Map(prev.map(ts => [ts.id, ts]));
        results.forEach((r, i) => {
          const { id, previous } = plan[i];
          if (r.status !== 'fulfilled') return;
          if (previous) map.set(id, (r.value as TimesheetEntry) ?? previous);
          else map.delete(id);
        });
        return [...map.values()];
      });
      toast.success('Undone');
    } catch (e) { toast.error('Undo failed: ' + (e as Error).message); }
  };

  const handleBulkSave = async (entries: Omit<TimesheetEntry, 'id'>[]) => {
    const previousByKey = new Map<string, TimesheetEntry | null>();
    const results = await Promise.allSettled(entries.map(async entry => {
      const key = `${entry.employee_id}:${entry.date}`;
      const existing = timesheets.find(ts => String(ts.employee_id) === String(entry.employee_id) && ts.date === entry.date);
      previousByKey.set(key, existing ?? null);
      if (existing?.id) return api.update(existing.id, entry);
      return api.create(entry);
    }));
    const saved = results.filter(r => r.status === 'fulfilled').map(r => (r as PromiseFulfilledResult<TimesheetEntry>).value);
    setTimesheets(prev => {
      const map = new Map(prev.map(ts => [`${ts.employee_id}:${ts.date}`, ts]));
      saved.forEach(s => map.set(`${s.employee_id}:${s.date}`, s));
      return [...map.values()];
    });
    const failed = results.filter(r => r.status === 'rejected').length;
    if (failed > 0) toast.warning(`${failed} entries failed to save`);
    if (saved.length > 0) {
      const plan = saved.filter(s => s.id != null).map(s => ({ id: s.id!, previous: previousByKey.get(`${s.employee_id}:${s.date}`) ?? null }));
      toast.success(`Saved ${saved.length} entr${saved.length !== 1 ? 'ies' : 'y'}`, {
        action: { label: 'Undo', onClick: () => undoBulk(plan) },
      });
    }
  };

  /** Bulk-assign's counterpart for "unmark" — deletes real entries across a
   *  (employee × date) selection. Targets with no existing entry are silently
   *  skipped (nothing to clear). Undo re-creates whatever was actually deleted. */
  const handleBulkClear = async (targets: { employee_id: number; date: string }[]) => {
    const toDelete = targets
      .map(({ employee_id, date }) => timesheets.find(ts => String(ts.employee_id) === String(employee_id) && ts.date === date))
      .filter((ts): ts is TimesheetEntry => !!ts?.id);
    if (toDelete.length === 0) { toast.info('Nothing to clear in the selected days'); return; }
    const results = await Promise.allSettled(toDelete.map(ts => api.delete(ts.id!)));
    const cleared = toDelete.filter((_, i) => results[i].status === 'fulfilled');
    const clearedIds = new Set(cleared.map(ts => ts.id));
    setTimesheets(prev => prev.filter(ts => !clearedIds.has(ts.id)));
    const failed = results.length - cleared.length;
    if (failed > 0) toast.warning(`${failed} ${failed !== 1 ? 'entries' : 'entry'} failed to clear`);
    if (cleared.length > 0) {
      toast.success(`Cleared ${cleared.length} day${cleared.length !== 1 ? 's' : ''}`, {
        action: { label: 'Undo', onClick: () => undoBulkClear(cleared) },
      });
    }
  };

  const undoBulkClear = async (entries: TimesheetEntry[]) => {
    try {
      const results = await Promise.allSettled(entries.map(({ id: _id, ...rest }) => api.create(rest)));
      const restored = results.filter(r => r.status === 'fulfilled').map(r => (r as PromiseFulfilledResult<TimesheetEntry>).value);
      setTimesheets(prev => {
        const map = new Map(prev.map(ts => [`${ts.employee_id}:${ts.date}`, ts]));
        restored.forEach(r => map.set(`${r.employee_id}:${r.date}`, r));
        return [...map.values()];
      });
      toast.success('Restored');
    } catch (e) { toast.error('Undo failed: ' + (e as Error).message); }
  };

  /** The grid cell's hover "+" — instant single-day add with the same role-based normal
   *  hours as bulk-assign's "Normal (by role)" preset (see normalShiftHours), so the
   *  common case never needs the full entry dialog. Public holidays default to the
   *  not-worked "paid holiday" 8h credit, matching what an empty holiday cell already
   *  shows; weekends default to a worked 2.0x day. Routes through handleBulkSave so it
   *  gets the same undo toast as every other write. */
  const handleQuickAdd = async (emp: Employee, day: Date) => {
    const ds = fmtDate(day);
    const holiday = zimHolidayName(ds);
    const status: StatusKey = holiday ? 'holiday_paid' : (day.getDay() === 0 || day.getDay() === 6) ? 'weekend' : 'work';
    const hours = status === 'holiday_paid' ? 8 : normalShiftHours(emp.position);
    const entry: Omit<TimesheetEntry, 'id'> = {
      employee_id: parseInt(emp.id), date: ds, status,
      start_time: status === 'holiday_paid' ? '' : '07:00',
      end_time: status === 'holiday_paid' ? '' : normalShiftEnd(hours),
      regular_hours: hours, overtime_hours: 0, holiday_overtime_hours: 0, nightshift_hours: 0,
      standby_allowance: false, nightshift_allowance: false, total_hours: hours,
      notes: '', overtime_periods: [], callout_overtime_hours: 0, callout_count: 0,
    };
    await handleBulkSave([entry]);
  };

  /** The grid cell's hover "−" — instant single-day remove, same undo-covered path as
   *  handleBulkClear. A virtual (`_auto`, unsaved) entry has no real row to delete, so it's
   *  silently a no-op there — same guard handleBulkClear already has. */
  const handleQuickRemove = async (emp: Employee, entry: TimesheetEntry) => {
    await handleBulkClear([{ employee_id: parseInt(emp.id), date: entry.date }]);
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
          const prev = prevSheets.find(ts => String(ts.employee_id) === String(emp.id) && ts.date === fmtDate(prevDays[idx]));
          if (prev) entries.push({ ...prev, employee_id: parseInt(emp.id), date: fmtDate(curDay), id: undefined } as Omit<TimesheetEntry, 'id'>);
        });
      });
      if (entries.length === 0) { toast.info('No entries found in previous period'); return; }
      await handleBulkSave(entries);
      toast.success(`Copied ${entries.length} entries from previous period`);
    } catch (e) { toast.error('Copy failed: ' + (e as Error).message); }
  };

  const notesKey = `ts_notes_${activeTab}_${fmtDate(activePeriod.start)}`;
  const [empNotes, setEmpNotes] = useState<Record<string, string>>(() => { try { return JSON.parse(localStorage.getItem(notesKey) || '{}') as Record<string, string>; } catch { return {}; } });
  const updateEmpNote = (empId: string, note: string) => {
    const next = { ...empNotes, [empId]: note };
    setEmpNotes(next);
    localStorage.setItem(notesKey, JSON.stringify(next));
  };
  const [showNotes, setShowNotes] = useState(false);

  const prevPeriod = () => setCurrentMonth(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextPeriod = () => setCurrentMonth(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  const completion = summary.possible > 0 ? Math.round((summary.filled / summary.possible) * 100) : 0;

  return (
    <main className="max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8 space-y-4">
      <PageHero
        icon={Clock}
        accent="violet"
        crumbs={['Time & Attendance', 'Timesheets']}
        title="Maintenance Timesheets"
        statsOpen={sections.expanded.hero}
        actions={
          <>
            <div className={`flex items-center gap-1 ${t.chipBg} rounded-xl p-1`}>
              {(['salaried', 'nec'] as const).map(tb => (
                <button key={tb} type="button" onClick={() => setActiveTab(tb)} className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg ${TYPE_WEIGHT.semibold} transition-all ${activeTab === tb ? 'bg-brand-500/25 text-brand-400' : `${t.textFaint} ${t.hoverText}`}`}>
                  {tb === 'salaried' ? <Briefcase className="w-3 h-3" /> : <Building2 className="w-3 h-3" />}{tb === 'salaried' ? 'Salaried' : 'NEC'}
                </button>
              ))}
            </div>
            <button type="button" title="Refresh timesheets" onClick={load} disabled={loading} className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg ${t.chipBg} ${t.hoverBg} ${t.textMuted} transition-all disabled:opacity-40`}>
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /><span className="hidden sm:inline">Refresh</span>
            </button>
            <button type="button" title="Download timesheet" onClick={() => setShowDownload(true)} className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg ${t.chipBg} ${t.hoverBg} ${t.textMuted} transition-all`}>
              <Download className="h-3.5 w-3.5" /><span className="hidden sm:inline">Download</span>
            </button>
            {/* Opens the same multi-employee, multi-date dialog as a row's "Assign shifts"
                link — this is the page-level entry point for it (previously only reachable
                per-employee, which made bulk entry easy to miss). Seeded with the first
                roster employee; anyone can be added or removed inside the dialog. */}
            <button type="button" title="Bulk-enter shifts for one or many employees at once" disabled={tabEmployees.length === 0}
              onClick={() => setBulkEmployee(tabEmployees[0])}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg ${t.chipBg} ${t.hoverBg} ${t.textMuted} transition-all disabled:opacity-40`}>
              <Layers className="h-3.5 w-3.5" /> Bulk Entry
            </button>
            <button type="button" title="Add employees to this period" onClick={() => setShowBulkAdd(true)} className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg text-white ${TYPE_WEIGHT.semibold} bg-gradient-to-br from-brand-500 to-brand-700 hover:brightness-110 transition-all`}>
              <UserPlus className="h-3.5 w-3.5" /> Add Employees
            </button>
          </>
        }
      >
        <div className="flex flex-wrap items-center gap-x-1 gap-y-2">
          {[
            { icon: Users, val: `${tabEmployees.length}`, label: 'employees', color: 'text-brand-400' },
            { icon: Clock, val: `${summary.reg.toFixed(0)}h`, label: 'regular', color: accentText('emerald', t.light) },
            { icon: Zap, val: `${summary.ot15.toFixed(0)}h`, label: 'OT 1.5×', color: 'text-orange-400' },
            { icon: Zap, val: `${summary.ot20.toFixed(0)}h`, label: 'OT 2.0×', color: accentText('purple', t.light) },
            { icon: Moon, val: `${summary.night.toFixed(0)}h`, label: 'nightshift', color: accentText('indigo', t.light) },
            summary.standbyBonus > 0 ? { icon: LayoutGrid, val: `${summary.standbyBonus}h`, label: 'standby OT', color: accentText('amber', t.light) } : null,
            { icon: CalendarDays, val: `${completion}%`, label: `filled (${summary.filled}/${summary.possible})`, color: completion === 100 ? accentText('emerald', t.light) : t.textMuted },
          ].filter(Boolean).map((item, i, arr) => {
            const it = item as { icon: ElementType; val: string; label: string; color: string };
            return (
              <React.Fragment key={i}>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg">
                  <it.icon className={`w-3.5 h-3.5 ${it.color}`} />
                  <span className={`text-base ${TYPE_WEIGHT.bold} ${t.textPrimary}`}>{it.val}</span>
                  <span className={`text-xs ${t.textFaint}`}>{it.label}</span>
                </div>
                {i < arr.length - 1 && <span className={`hidden sm:block select-none ${t.textFaint}`}>|</span>}
              </React.Fragment>
            );
          })}
        </div>
      </PageHero>

      <div className={`${t.glass} rounded-2xl ${t.shadow} overflow-hidden`}>
        <SectionHeader icon={CalendarDays} title="Period" sub={fmtPeriod(activePeriod)} open={showPeriod} onToggle={() => setShowPeriod(v => !v)} />
        {showPeriod && (
          <div className="px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button type="button" title="Previous period" onClick={prevPeriod} className={`p-2 rounded-lg ${t.chipBg} ${t.hoverBg} ${t.textFaint} transition-all`}><ChevronLeft className="w-4 h-4" /></button>
              <div className="text-center">
                <div className={`${TYPE_WEIGHT.semibold} ${t.textPrimary}`}>{fmtPeriod(activePeriod)}</div>
                <div className={`text-xs mt-0.5 ${t.textFaint}`}>{days.length} days · {activeTab === 'salaried' ? '1st to last day of month' : '13th to 12th (NEC cycle)'}</div>
              </div>
              <button type="button" title="Next period" onClick={nextPeriod} className={`p-2 rounded-lg ${t.chipBg} ${t.hoverBg} ${t.textFaint} transition-all`}><ChevronRight className="w-4 h-4" /></button>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setCurrentMonth(new Date())} className={`text-xs px-3 py-1.5 rounded-lg ${t.chipBg} ${t.hoverBg} ${t.textFaint} transition-all`}>Current Period</button>
              <button type="button" onClick={handleCopyPreviousPeriod} className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg ${t.chipBg} ${t.hoverBg} ${t.textFaint} transition-all`}><RefreshCw className="w-3 h-3" /> Copy Previous</button>
            </div>
          </div>
        )}
      </div>

      <div className={`${t.glass} rounded-2xl [overflow:clip]`}>
        <SectionHeader icon={LayoutGrid} title={`${activeTab === 'salaried' ? 'Salaried' : 'NEC'} Timesheet Grid`} sub={`${tabEmployees.length} employees`} open={showGrid} onToggle={() => setShowGrid(v => !v)}>
          <div className="relative">
            <Search className={`absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 ${t.textFaint}`} />
            <input placeholder="Search…" className={`${t.inputBg} rounded-lg text-xs pl-7 pr-3 py-1 h-7 w-36 outline-none`} value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button type="button" title={`Sort: ${sortBy === 'name' ? 'A–Z name' : 'Department'}`} onClick={() => setSortBy(s => s === 'name' ? 'dept' : 'name')}
            className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-md ${t.chipBg} ${t.hoverBg} ${t.textFaint} ${t.hoverText} transition-all`}>
            {sortBy === 'name' ? 'A–Z' : 'Dept'}
          </button>
        </SectionHeader>
        {showGrid && (
          loading ? (
            <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-brand-400" /><span className={`ml-2 text-sm ${t.textFaint}`}>Loading…</span></div>
          ) : (
            <TimesheetGrid
              employees={tabEmployees} timesheets={effectiveTimesheets} days={days}
              onCellClick={(emp, day, entry) => setEditCell({ employee: emp, date: day, entry })}
              onQuickAdd={handleQuickAdd} onQuickRemove={handleQuickRemove}
              onBulkAssign={emp => setBulkEmployee(emp)}
              onRemoveEmployee={removeFromTab}
            />
          )
        )}
      </div>

      {tabEmployees.length > 0 && (
        <div className={`${t.glass} rounded-2xl [overflow:clip]`}>
          <SectionHeader icon={Users} title="Period Notes" sub="per-employee context for this period" open={showNotes} onToggle={() => setShowNotes(v => !v)} />
          {showNotes && (
            <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {tabEmployees.map(emp => (
                <div key={emp.id} className="space-y-1">
                  <label className={`text-[10px] ${TYPE_WEIGHT.medium} flex items-center gap-1.5 ${t.textFaint}`}>
                    <User className="h-3.5 w-3.5 shrink-0 text-brand-400" />
                    {emp.name}
                  </label>
                  <PredictiveInput historyKey="timesheets_period_note" multiline rows={2}
                    placeholder={`Notes for ${emp.name.split(' ')[0]}…`} value={empNotes[emp.id] || ''} onChange={v => updateEmpNote(emp.id, v)}
                    inputClassName={`${t.inputBg} text-xs px-2.5 py-1.5`} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {editCell && (
        <TimesheetEntryDialog employee={editCell.employee} date={editCell.date} entry={editCell.entry}
          onSave={data => handleSaveEntry(editCell.employee.id, editCell.date, data)}
          onDelete={editCell.entry?.id ? () => handleDeleteEntry(editCell.entry!.id!) : undefined}
          onClose={() => setEditCell(null)} />
      )}
      {bulkEmployee && <BulkAssignDialog initialEmployee={bulkEmployee} allEmployees={tabEmployees} period={activePeriod} timesheets={effectiveTimesheets} onSave={handleBulkSave} onClear={handleBulkClear} onClose={() => setBulkEmployee(null)} />}

      {showBulkAdd && <BulkAddEmployeesDialog allEmployees={allEmployees} currentIds={tabIds} onAdd={emps => addToTab(emps.map(e => e.id))} onClose={() => setShowBulkAdd(false)} />}
      {showDownload && <DownloadDialog employees={tabEmployees} timesheets={effectiveTimesheets} period={activePeriod} periodType={activeTab} onClose={() => setShowDownload(false)} />}
    </main>
  );
}

export default function TimesheetsPage() {
  return (
    <AppShell>
      <TimesheetsContent />
    </AppShell>
  );
}
