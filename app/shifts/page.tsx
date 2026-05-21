'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Clock, Eye, Pencil, Trash2, Users, Calendar, Activity, Shield,
  Layers, ChevronsUpDown, Check, X, AlertCircle, TrendingUp,
  MoreVertical, ChevronLeft, ChevronRight,
  // Shift timing
  Sun, Sunrise, Sunset, Moon, Settings2,
  // Event types
  Umbrella, Stethoscope, Star, Landmark, Zap,
  RotateCcw, Timer, BookOpen, AlarmClock, SlidersHorizontal,
  // UI
  Flag,
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command, CommandEmpty, CommandGroup, CommandInput,
  CommandItem, CommandList,
} from '@/components/ui/command';
import { toast } from 'sonner';

import {
  GlassPanel, HeroPanel, RecordsPanelHeader, FilterChips,
  IF, EmptyState, LoadingPane, DeleteDialog, AvatarInitials,
  fmtDate, GIN, LBL, usePageCollapse, MasterCollapseButton,
} from '@/components/shared';
import { PageShell } from '@/components/PageShell';

// ─── Types ────────────────────────────────────────────────────────────────────

type ShiftType = '10-4' | '5-2' | 'standby' | 'custom';
type DayStatus = 'on' | 'off' | 'standby' | 'on+standby';
type ViewMode  = 'grid' | 'table' | 'schedule';
type SortKey   = 'name' | 'shift_type' | 'cycle_start_date' | 'created_at';

interface ShiftAssignment {
  id: number;
  employee_id: string;
  employee_name: string;
  designation?: string;
  department?: string;
  section?: string;
  phone?: string;
  shift_type: ShiftType;
  on_days: number;
  off_days: number;
  cycle_start_date: string;
  notes?: string;
  is_active: boolean;
  standby_periods?: { from: string; to: string }[];
  shift_label?: string;
  shift_hours?: string;
  shift_timing_periods?: ShiftTimingPeriod[];
  day_overrides?: DayOverride[];
  created_at?: string;
}

interface Employee {
  id: string;
  name: string;
  designation?: string;
  department?: string;
  section?: string;
  phone?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const API_BASE      = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const STANDBY_API   = `${API_BASE}/api/standby`;
const EMPLOYEES_API = `${API_BASE}/api/employees`;
const LEAVES_API    = `${API_BASE}/api/leaves`;

const SHIFT_PATTERNS: Record<ShiftType, {
  label: string; color: string; dotClass: string;
  iconClass: string; fillColor: string;
  icon: React.ElementType; on: number; off: number;
}> = {
  '10-4':    { label: '10-4 Cycle', color: '#86BBD8', dotClass: 'shift-dot-10-4',    iconClass: 'shift-icon-10-4',    fillColor: '#86BBD8', icon: Clock,    on: 10, off: 4 },
  '5-2':     { label: '5-2 Cycle',  color: '#78C0A6', dotClass: 'shift-dot-5-2',     iconClass: 'shift-icon-5-2',     fillColor: '#78C0A6', icon: Activity, on: 5,  off: 2 },
  'standby': { label: 'Standby',    color: '#F5A623', dotClass: 'shift-dot-standby', iconClass: 'shift-icon-standby', fillColor: '#F5A623', icon: Shield,   on: 0,  off: 0 },
  'custom':  { label: 'Custom',     color: '#9B87B5', dotClass: 'shift-dot-custom',  iconClass: 'shift-icon-custom',  fillColor: '#9B87B5', icon: Layers,   on: 0,  off: 0 },
};

// ─── Design tokens — two accents + three semantic hues ────────────────────────
// Primary:  #86BBD8 (brand blue)     → shifts, timing, info
// Emerald:  emerald-400              → on duty, active work
// Amber:    amber-400                → standby, deferred
// Rose:     rose-400                 → public holidays (national)
// Neutral:  white/α                  → absences, off duty

const STATUS_COLORS = {
  on:           { bg: 'bg-emerald-500/[0.12]', border: 'border-emerald-500/25', text: 'text-emerald-400', label: 'On Duty'      },
  off:          { bg: 'bg-white/[0.04]',        border: 'border-white/[0.08]',  text: 'text-white/35',    label: 'Off Duty'     },
  standby:      { bg: 'bg-amber-500/[0.12]',    border: 'border-amber-500/25',  text: 'text-amber-400',   label: 'Standby'      },
  'on+standby': { bg: 'bg-[#86BBD8]/[0.12]',   border: 'border-[#86BBD8]/25',  text: 'text-[#86BBD8]',   label: 'On + Standby' },
};

// All timing presets share one color — the icon is the only differentiator
const _T = { color: 'text-[#86BBD8]', bg: 'bg-[#86BBD8]/[0.10]', border: 'border-[#86BBD8]/20' };
const SHIFT_TIMING_PRESETS: Record<string, {
  label: string; abbr: string; hours: string;
  color: string; bg: string; border: string;
  icon: React.ElementType;
}> = {
  day:       { ..._T, label: 'Day Shift',       abbr: 'D',  hours: '07:00–17:00', icon: Sun      },
  morning:   { ..._T, label: 'Morning Shift',   abbr: 'AM', hours: '06:00–14:00', icon: Sunrise  },
  afternoon: { ..._T, label: 'Afternoon Shift', abbr: 'PM', hours: '14:00–22:00', icon: Sunset   },
  night:     { ..._T, label: 'Night Shift',     abbr: 'N',  hours: '22:00–06:00', icon: Moon     },
  custom:    { ..._T, label: 'Custom',          abbr: 'CX', hours: '',             icon: Settings2 },
};

// Absence  → neutral white/slate  | icon identifies specific type
// Work+    → emerald               | icon identifies specific type
// National → rose                  | public holidays only
// Info     → primary blue          | training, timing, custom
const _Ab = { color: 'text-white/55',  bg: 'bg-white/[0.06]',           border: 'border-white/[0.13]'    };  // absence
const _Wk = { color: 'text-emerald-400', bg: 'bg-emerald-500/[0.10]',   border: 'border-emerald-500/20'  };  // active work
const _Am = { color: 'text-amber-400',  bg: 'bg-amber-500/[0.10]',      border: 'border-amber-500/20'    };  // amber/deferred
const _Ro = { color: 'text-rose-400',   bg: 'bg-rose-500/[0.10]',       border: 'border-rose-500/20'     };  // national/holiday
const _In = { color: 'text-[#86BBD8]', bg: 'bg-[#86BBD8]/[0.08]',      border: 'border-[#86BBD8]/18'    };  // info/primary

const EVENT_TYPES: Record<EventType, {
  label: string; abbr: string; color: string; bg: string; border: string;
  defaultStatus: DayStatus | null; showTiming: boolean; icon: React.ElementType;
}> = {
  annual_leave:   { ..._Ab, label: 'Annual Leave',       abbr: 'AL',  defaultStatus: 'off', showTiming: false, icon: Umbrella          },
  sick_leave:     { ..._Ab, label: 'Sick Leave',          abbr: 'SL',  defaultStatus: 'off', showTiming: false, icon: Stethoscope       },
  special_leave:  { ..._Ab, label: 'Special Leave',       abbr: 'SPL', defaultStatus: 'off', showTiming: false, icon: Star              },
  public_holiday: { ..._Ro, label: 'Public Holiday',      abbr: 'PH',  defaultStatus: 'off', showTiming: false, icon: Landmark          },
  work_off_day:   { ..._Wk, label: 'Working on Off Day',  abbr: 'W+',  defaultStatus: 'on',  showTiming: true,  icon: Zap               },
  defer_off:      { ..._Am, label: 'Deferred Day Off',    abbr: 'DEF', defaultStatus: 'on',  showTiming: true,  icon: RotateCcw         },
  overtime:       { ..._Wk, label: 'Overtime',            abbr: 'OT',  defaultStatus: 'on',  showTiming: true,  icon: Timer             },
  training:       { ..._In, label: 'Training / Course',   abbr: 'TR',  defaultStatus: null,  showTiming: false, icon: BookOpen          },
  timing:         { ..._In, label: 'Timing Change',       abbr: 'TC',  defaultStatus: null,  showTiming: true,  icon: AlarmClock        },
  custom:         { ..._Ab, label: 'Custom Override',     abbr: 'CX',  defaultStatus: null,  showTiming: true,  icon: SlidersHorizontal },
};

function ShiftBar({ pct, color, opacity = 0.75 }: { pct: number; color: string; opacity?: number }) {
  return (
    // Dynamic progress bar — width/color must be runtime values, inline style is intentional here
    // eslint-disable-next-line react/forbid-dom-props
    <div className="h-full rounded-full transition-[width] duration-300 ease-in-out"
      style={{ width: `${pct}%`, backgroundColor: color, opacity }} />
  );
}

function newEventId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `ev_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

const SORT_OPTIONS = [
  { value: 'created_at',      label: 'Newest'     },
  { value: 'name',            label: 'Name A-Z'   },
  { value: 'shift_type',      label: 'Pattern'    },
  { value: 'cycle_start_date',label: 'Start Date' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

interface ShiftTimingPeriod {
  from: string; to: string;
  label: string; start_time: string; end_time: string;
}

type EventType =
  | 'annual_leave' | 'sick_leave' | 'special_leave' | 'public_holiday'
  | 'work_off_day' | 'defer_off' | 'overtime' | 'training' | 'timing' | 'custom';

interface ScheduleEvent {
  id: string;
  from: string;
  to: string;
  type: EventType;
  status?: DayStatus;
  label?: string;
  start_time?: string;
  end_time?: string;
  note?: string;
}

// keep alias so existing references compile
type DayOverride = ScheduleEvent;

interface LeaveRecord {
  id: number;
  employee_id: string;
  employee_name: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  status: string; // 'pending' | 'approved' | 'rejected'
  reason?: string;
}

const LEAVE_TYPE_MAP: Record<string, EventType> = {
  'annual leave':   'annual_leave',
  'sick leave':     'sick_leave',
  'special leave':  'special_leave',
  'public holiday': 'public_holiday',
  'annual':         'annual_leave',
  'sick':           'sick_leave',
};

function leaveToEventType(leaveType: string): EventType {
  return LEAVE_TYPE_MAP[leaveType.toLowerCase()] ?? 'custom';
}

function findLeaveForDay(
  leaves: LeaveRecord[], employeeId: string, employeeName: string, ds: string
): LeaveRecord | undefined {
  const norm = (s: string) => s.toLowerCase().trim();
  return leaves.find(lv =>
    (lv.employee_id === employeeId || norm(lv.employee_name) === norm(employeeName)) &&
    ds >= lv.start_date &&
    ds <= lv.end_date &&
    lv.status !== 'rejected'
  );
}

// ─── Zimbabwe Public Holidays ─────────────────────────────────────────────────

interface PublicHoliday { date: string; name: string; }

function easterSunday(year: number): Date {
  // Meeus/Jones/Butcher algorithm
  const a = year % 19, b = Math.floor(year / 100), c = year % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day   = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function zwHolidays(year: number): PublicHoliday[] {
  const e   = easterSunday(year);
  const off = (d: Date, n: number) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };
  const fmt = (d: Date) => d2s(d);
  return [
    { date: `${year}-01-01`, name: "New Year's Day"       },
    { date: fmt(off(e, -2)), name: 'Good Friday'          },
    { date: fmt(off(e, -1)), name: 'Easter Saturday'      },
    { date: fmt(off(e,  1)), name: 'Easter Monday'        },
    { date: `${year}-04-18`, name: 'Independence Day'     },
    { date: `${year}-05-01`, name: "Workers' Day"         },
    { date: `${year}-05-25`, name: 'Africa Day'           },
    { date: `${year}-08-11`, name: "Heroes' Day"          },
    { date: `${year}-08-12`, name: 'Defence Forces Day'   },
    { date: `${year}-12-22`, name: 'National Unity Day'   },
    { date: `${year}-12-25`, name: 'Christmas Day'        },
    { date: `${year}-12-26`, name: 'Boxing Day'           },
  ];
}

function buildHolidayMap(days: Date[]): Map<string, string> {
  const map  = new Map<string, string>();
  const yrs  = new Set(days.map(d => d.getFullYear()));
  yrs.forEach(y => zwHolidays(y).forEach(h => map.set(h.date, h.name)));
  return map;
}

function getDayTiming(a: ShiftAssignment, ds: string) {
  const block = (a.shift_timing_periods || []).find(p => ds >= p.from && ds <= p.to);
  if (block) return block.label ? (SHIFT_TIMING_PRESETS[block.label] ?? null) : null;
  return a.shift_label ? (SHIFT_TIMING_PRESETS[a.shift_label] ?? null) : null;
}

function getDayCellInfo(a: ShiftAssignment, ds: string): {
  timing: typeof SHIFT_TIMING_PRESETS[string] | null;
  hours: string;
  event: ScheduleEvent | undefined;
} {
  const ev = findEvent(a, ds);
  // Event with timing data wins
  if (ev && (ev.label || ev.start_time)) {
    const timing = ev.label ? (SHIFT_TIMING_PRESETS[ev.label] ?? null) : null;
    const hours  = ev.start_time && ev.end_time ? `${ev.start_time}–${ev.end_time}` : (timing?.hours || '');
    return { timing, hours, event: ev };
  }
  // Timing block
  const block = (a.shift_timing_periods || []).find(p => ds >= p.from && ds <= p.to);
  if (block) {
    const timing = block.label ? (SHIFT_TIMING_PRESETS[block.label] ?? null) : null;
    const hours  = block.start_time && block.end_time
      ? `${block.start_time}–${block.end_time}`
      : (timing?.hours || '');
    return { timing, hours, event: ev };
  }
  const timing = a.shift_label ? (SHIFT_TIMING_PRESETS[a.shift_label] ?? null) : null;
  const hours  = a.shift_hours || timing?.hours || '';
  return { timing, hours, event: ev };
}

function stripTime(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Date → YYYY-MM-DD without UTC conversion */
function d2s(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const WD = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function findEvent(a: ShiftAssignment, ds: string): ScheduleEvent | undefined {
  return (a.day_overrides || []).find(e => {
    const from = (e as ScheduleEvent).from || (e as unknown as { date?: string }).date || '';
    const to   = (e as ScheduleEvent).to   || from;
    return ds >= from && ds <= to;
  }) as ScheduleEvent | undefined;
}

function computeDayStatus(a: ShiftAssignment, date: Date): DayStatus {
  const ds = d2s(date);
  const ev = findEvent(a, ds);
  if (ev) {
    if (ev.status) return ev.status;
    const et = EVENT_TYPES[ev.type];
    if (et?.defaultStatus) return et.defaultStatus;
  }

  if (a.shift_type === 'standby') return 'standby';
  const { on_days: onD, off_days: offD } = a;
  const cycleLen = onD + offD;
  const diff = Math.round(
    (stripTime(date).getTime() - stripTime(new Date(a.cycle_start_date)).getTime()) / 86400000
  );
  const isOn = cycleLen <= 0 || (((diff % cycleLen) + cycleLen) % cycleLen) < onD;
  const inStandbyPeriod = (a.standby_periods || []).some(p => ds >= p.from && ds <= p.to);
  if (inStandbyPeriod) return isOn ? 'on+standby' : 'standby';
  return isOn ? 'on' : 'off';
}

function todayStatus(a: ShiftAssignment): DayStatus {
  return computeDayStatus(a, new Date());
}

function daysUntilNextOn(a: ShiftAssignment): number {
  if (a.shift_type === 'standby') return 0;
  const cycleLen = a.on_days + a.off_days;
  if (cycleLen <= 0) return 100;
  const diff = Math.round(
    (stripTime(new Date()).getTime() - stripTime(new Date(a.cycle_start_date)).getTime()) / 86400000
  );
  return Math.round(((((diff % cycleLen) + cycleLen) % cycleLen) / cycleLen) * 100);
}

function cycleProgress(a: ShiftAssignment): number {
  if (a.shift_type === 'standby') return 0;
  const cycleLen = a.on_days + a.off_days;
  if (cycleLen <= 0) return 100;
  const diff = Math.round(
    (stripTime(new Date()).getTime() - stripTime(new Date(a.cycle_start_date)).getTime()) / 86400000
  );
  return Math.round(((((diff % cycleLen) + cycleLen) % cycleLen) / cycleLen) * 100);
}

// ─── Small shared-shape components ────────────────────────────────────────────

function StatusBadge({ status }: { status: DayStatus }) {
  const c = STATUS_COLORS[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap ${c.bg} ${c.border} ${c.text}`}>
      {status === 'on+standby' && <Shield className="h-2.5 w-2.5 opacity-70" />}
      {c.label}
    </span>
  );
}

function ShiftTypeBadge({ type }: { type: ShiftType }) {
  const p = SHIFT_PATTERNS[type];
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border border-white/10 bg-white/[0.06] text-white/70 whitespace-nowrap">
      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${p.dotClass}`} />
      {p.label}
    </span>
  );
}

// ─── ScheduleEventModal ───────────────────────────────────────────────────────

interface EventForm {
  id: string; from: string; to: string; type: EventType;
  status: DayStatus | ''; label: string; start_time: string; end_time: string; note: string;
}

function emptyForm(prefill: string, et: EventType): EventForm {
  return { id: newEventId(), from: prefill, to: prefill, type: et, status: '', label: '', start_time: '', end_time: '', note: '' };
}

function ScheduleEventModal({
  assignment, prefillDate, onSave, onClose, saving,
}: {
  assignment: ShiftAssignment;
  prefillDate: string;
  onSave: (events: ScheduleEvent[]) => void;
  onClose: () => void;
  saving: boolean;
}) {
  const allEvents = (assignment.day_overrides || []) as ScheduleEvent[];
  const evOnDate  = findEvent(assignment, prefillDate);

  const [form, setForm] = useState<EventForm>(
    evOnDate
      ? { id: evOnDate.id, from: evOnDate.from, to: evOnDate.to || evOnDate.from,
          type: evOnDate.type as EventType, status: evOnDate.status || '',
          label: evOnDate.label || '', start_time: evOnDate.start_time || '',
          end_time: evOnDate.end_time || '', note: evOnDate.note || '' }
      : emptyForm(prefillDate, 'annual_leave')
  );

  const et         = EVENT_TYPES[form.type];
  const isEditing  = allEvents.some(e => e.id === form.id);
  const showTiming = et.showTiming;
  const isCustom   = form.type === 'custom';

  function sf<K extends keyof EventForm>(k: K) {
    return (v: EventForm[K]) => setForm(p => ({ ...p, [k]: v }));
  }

  function applyTimingPreset(key: string) {
    const t = SHIFT_TIMING_PRESETS[key];
    const [s, e] = t.hours.split('–');
    setForm(p => ({ ...p, label: key, start_time: s || '', end_time: e || '' }));
  }

  function loadEvent(ev: ScheduleEvent) {
    setForm({ id: ev.id, from: ev.from, to: ev.to || ev.from,
      type: ev.type as EventType, status: ev.status || '',
      label: ev.label || '', start_time: ev.start_time || '',
      end_time: ev.end_time || '', note: ev.note || '' });
  }

  function handleSave() {
    if (!form.from) return;
    const event: ScheduleEvent = {
      id: form.id, from: form.from, to: form.to || form.from, type: form.type,
      ...(isCustom && form.status ? { status: form.status as DayStatus } : {}),
      ...(form.label      ? { label:      form.label      } : {}),
      ...(form.start_time ? { start_time: form.start_time } : {}),
      ...(form.end_time   ? { end_time:   form.end_time   } : {}),
      ...(form.note       ? { note:       form.note       } : {}),
    };
    const updated = isEditing
      ? allEvents.map(e => e.id === form.id ? event : e)
      : [...allEvents, event];
    onSave(updated);
  }

  function deleteEvent(id: string) {
    onSave(allEvents.filter(e => e.id !== id));
  }

  const cycleStatus = computeDayStatus(assignment, new Date(prefillDate + 'T12:00:00'));
  const { hours: cycleHours } = getDayCellInfo(assignment, prefillDate);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto p-0 gap-0 rounded-2xl bg-[rgba(5,15,28,0.97)] backdrop-blur-2xl border border-white/10 text-white">
        <DialogHeader className="px-5 pt-5 pb-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-[#2A4D69]/50 border border-[#86BBD8]/20">
              <Calendar className="h-4 w-4 text-[#86BBD8]" />
            </div>
            <div>
              <DialogTitle className="text-sm font-bold text-white font-heading">Schedule Event</DialogTitle>
              <DialogDescription className="text-xs text-white/40">
                {assignment.employee_name} · Cycle: <span className={STATUS_COLORS[cycleStatus].text}>{STATUS_COLORS[cycleStatus].label}</span>
                {cycleHours ? ` · ${cycleHours}` : ''}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="px-5 py-4 space-y-4">

          {/* Event type */}
          <div>
            <div className={LBL}>Event Type</div>
            <div className="grid grid-cols-2 gap-1.5 mt-1.5">
              {(Object.entries(EVENT_TYPES) as [EventType, typeof EVENT_TYPES[EventType]][]).map(([key, t]) => {
                const TileIcon = t.icon;
                return (
                  <button key={key} type="button"
                    onClick={() => setForm(p => ({ ...p, type: key, status: '', ...(t.showTiming ? {} : { label: '', start_time: '', end_time: '' }) }))}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left transition-all ${
                      form.type === key ? `${t.bg} ${t.border}` : 'bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.07] hover:border-white/20'
                    }`}>
                    <div className={`p-1.5 rounded-lg shrink-0 ${form.type === key ? t.bg : 'bg-white/[0.07]'} border ${form.type === key ? t.border : 'border-white/10'}`}>
                      <TileIcon className={`h-3.5 w-3.5 ${form.type === key ? t.color : 'text-white/50'}`} />
                    </div>
                    <div className="min-w-0">
                      <div className={`text-[10px] font-bold tracking-wide ${form.type === key ? t.color : 'text-white/55'}`}>{t.abbr}</div>
                      <div className="text-[11px] text-white/55 leading-tight truncate">{t.label}</div>
                    </div>
                    {form.type === key && <Check className={`h-3.5 w-3.5 ml-auto shrink-0 ${t.color}`} />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className={LBL}>From Date *</div>
              <input type="date" aria-label="Event from date" className={GIN} value={form.from}
                onChange={e => setForm(p => ({ ...p, from: e.target.value, to: p.to < e.target.value ? e.target.value : p.to }))} />
            </div>
            <div>
              <div className={LBL}>To Date</div>
              <input type="date" aria-label="Event to date" className={GIN} value={form.to}
                onChange={e => setForm(p => ({ ...p, to: e.target.value }))} />
              <p className="text-[10px] text-white/25 mt-0.5">Leave same as From for single day</p>
            </div>
          </div>

          {/* Timing (for relevant types) */}
          {showTiming && (
            <div className={`rounded-xl border p-3 space-y-2 ${et.bg} ${et.border}`}>
              <div className={`text-[10px] font-semibold uppercase tracking-wider ${et.color}`}>Timing</div>
              <div className="flex gap-1.5 flex-wrap">
                <button type="button" onClick={() => setForm(p => ({ ...p, label: '', start_time: '', end_time: '' }))}
                  className={`text-xs px-2.5 py-1 rounded-md border transition-all ${!form.label ? 'bg-white/[0.12] border-white/20 text-white' : 'bg-white/[0.04] border-white/[0.08] text-white/40'}`}>
                  Default
                </button>
                {(['day', 'morning', 'afternoon', 'night'] as const).map(key => {
                  const t = SHIFT_TIMING_PRESETS[key];
                  return (
                    <button key={key} type="button" onClick={() => applyTimingPreset(key)}
                      className={`text-xs px-2.5 py-1 rounded-md border transition-all ${form.label === key ? `${t.bg} ${t.border} ${t.color}` : 'bg-white/[0.04] border-white/[0.08] text-white/40 hover:text-white/70'}`}>
                      {t.abbr}
                    </button>
                  );
                })}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className={LBL}>Start time</div>
                  <input type="time" aria-label="Start time" className={GIN} value={form.start_time}
                    onChange={e => sf('start_time')(e.target.value)} />
                </div>
                <div>
                  <div className={LBL}>End time</div>
                  <input type="time" aria-label="End time" className={GIN} value={form.end_time}
                    onChange={e => sf('end_time')(e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {/* Custom status (only for custom type) */}
          {isCustom && (
            <div>
              <div className={LBL}>Status Override</div>
              <div className="grid grid-cols-2 gap-1.5 mt-1.5">
                <button type="button" onClick={() => sf('status')('')}
                  className={`text-xs px-2 py-2 rounded-lg border transition-all ${form.status === '' ? 'bg-white/[0.12] border-white/25 text-white' : 'bg-white/[0.03] border-white/[0.07] text-white/40'}`}>
                  Use cycle default
                </button>
                {(['on', 'off', 'standby', 'on+standby'] as const).map(s => (
                  <button key={s} type="button" onClick={() => sf('status')(s)}
                    className={`text-xs px-2 py-2 rounded-lg border transition-all flex items-center justify-center gap-1.5 ${
                      form.status === s ? `${STATUS_COLORS[s].bg} ${STATUS_COLORS[s].border} ${STATUS_COLORS[s].text}` : 'bg-white/[0.03] border-white/[0.07] text-white/40'
                    }`}>
                    {s === 'on+standby' && <Shield className="h-3 w-3" />}
                    {STATUS_COLORS[s].label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Note */}
          <div>
            <div className={LBL}>Note / Reason</div>
            <input className={GIN} value={form.note} onChange={e => sf('note')(e.target.value)}
              placeholder="e.g. Family vacation, covering for colleague…" />
          </div>

          {/* All events for this assignment */}
          {allEvents.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <div className={LBL}>All events for {assignment.employee_name.split(' ')[0]} ({allEvents.length})</div>
                <button type="button"
                  onClick={() => setForm(emptyForm(prefillDate, 'annual_leave'))}
                  className="text-xs text-[#86BBD8]/60 hover:text-[#86BBD8] transition-colors">
                  + New
                </button>
              </div>
              <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                {allEvents.map(ev => {
                  const t      = EVENT_TYPES[ev.type as EventType] ?? EVENT_TYPES.custom;
                  const EvIcon = t.icon;
                  const active = ev.id === form.id;
                  return (
                    <div key={ev.id}
                      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs transition-all ${
                        active ? `${t.bg} ${t.border}` : 'bg-white/[0.03] border-white/[0.06] hover:border-white/15'
                      }`}>
                      <EvIcon className={`h-3.5 w-3.5 shrink-0 ${active ? t.color : 'text-white/40'}`} />
                      <div className="flex-1 min-w-0">
                        <div className={`font-semibold leading-tight ${active ? t.color : 'text-white/70'}`}>{t.label}</div>
                        <div className="text-white/40 text-[10px]">
                          {fmtDate(ev.from)}{ev.to && ev.to !== ev.from ? ` → ${fmtDate(ev.to)}` : ''}
                          {ev.note ? ` · ${ev.note}` : ''}
                        </div>
                      </div>
                      <button type="button" aria-label="Edit event" onClick={() => loadEvent(ev)}
                        className="shrink-0 text-[#86BBD8]/30 hover:text-[#86BBD8] transition-colors">
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button type="button" aria-label="Delete event" onClick={() => deleteEvent(ev.id)}
                        className="shrink-0 text-red-400/30 hover:text-red-400 transition-colors">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2 px-5 pb-5 border-t border-white/[0.07] pt-4">
          <button type="button" onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm text-white/60 border border-white/[0.12] bg-white/[0.05] hover:bg-white/[0.10] transition-all">
            Cancel
          </button>
          <button type="button" disabled={saving || !form.from} onClick={handleSave}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-br from-[#2A4D69] to-[#1e3a52] border border-[#86BBD8]/25 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
            {saving ? 'Saving…' : isEditing ? 'Update Event' : 'Add Event'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── ScheduleView ─────────────────────────────────────────────────────────────

function ScheduleView({ assignments, leaves, onView, onUpdateOverrides }: {
  assignments: ShiftAssignment[];
  leaves: LeaveRecord[];
  onView: (a: ShiftAssignment) => void;
  onUpdateOverrides: (id: number, overrides: DayOverride[]) => Promise<void>;
}) {
  const [offset,     setOffset]     = useState(0);
  const [eventModal, setEventModal] = useState<{ assignment: ShiftAssignment; prefillDate: string } | null>(null);
  const [saving,     setSaving]     = useState(false);

  async function handleSaveEvents(events: ScheduleEvent[]) {
    if (!eventModal) return;
    setSaving(true);
    try {
      await onUpdateOverrides(eventModal.assignment.id, events);
      setEventModal(null);
    } catch (err) {
      toast.error(String(err));
    } finally {
      setSaving(false);
    }
  }

  const today    = stripTime(new Date());
  const todayStr = d2s(today);

  const startDay = new Date(today);
  startDay.setDate(startDay.getDate() + offset * 7);

  const days = Array.from({ length: 28 }, (_, i) => {
    const d = new Date(startDay);
    d.setDate(d.getDate() + i);
    return d;
  });

  // Build month spans for the top header row
  const monthSpans: { label: string; count: number }[] = [];
  days.forEach(d => {
    const label = d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
    if (!monthSpans.length || monthSpans[monthSpans.length - 1].label !== label) {
      monthSpans.push({ label, count: 1 });
    } else {
      monthSpans[monthSpans.length - 1].count++;
    }
  });

  const rangeLabel = `${startDay.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} — ${days[27].toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;

  // Zimbabwe public holidays for the visible window
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const holidays = useMemo(() => buildHolidayMap(days), [offset]);


  const COL = 76; // px per day column — wide enough for "07:00–17:00"
  const NAME = 200; // px for name column

  return (
    <div>
      {/* ── Navigation ── */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.07]">
        <div className="flex items-center gap-2">
          <button type="button" aria-label="Previous 4 weeks" onClick={() => setOffset(o => o - 1)}
            className="h-7 w-7 flex items-center justify-center rounded-lg bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-white/50 transition-all">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium text-white/70 min-w-[220px] text-center">{rangeLabel}</span>
          <button type="button" aria-label="Next 4 weeks" onClick={() => setOffset(o => o + 1)}
            className="h-7 w-7 flex items-center justify-center rounded-lg bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-white/50 transition-all">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        {offset !== 0 && (
          <button type="button" onClick={() => setOffset(0)}
            className="text-xs px-2.5 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-white/50 transition-all">
            Today
          </button>
        )}
      </div>

      {/* ── Grid ── */}
      <div className="overflow-x-auto">
        <div style={{ minWidth: `${NAME + days.length * COL}px` }}>

          {/* Month header */}
          <div className="flex border-b border-white/[0.05]">
            <div style={{ width: NAME }} className="shrink-0" />
            {monthSpans.map((m, i) => (
              <div key={i} style={{ width: m.count * COL }}
                className="text-center text-[10px] text-white/30 py-1 font-medium uppercase tracking-wider">
                {m.label}
              </div>
            ))}
          </div>

          {/* Weekday + date header */}
          <div className="flex border-b border-white/[0.08]">
            <div style={{ width: NAME }}
              className="shrink-0 px-3 py-1.5 text-[10px] text-white/35 uppercase tracking-wider font-semibold">
              Employee
            </div>
            {days.map(d => {
              const ds      = d2s(d);
              const isToday = ds === todayStr;
              const isWknd  = d.getDay() === 0 || d.getDay() === 6;
              const holiday = holidays.get(ds);
              return (
                <div key={ds} style={{ width: COL }}
                  title={holiday ?? undefined}
                  className={`flex flex-col items-center py-1 border-b-2 ${
                    isWknd && !holiday ? 'opacity-40' : ''
                  } ${
                    isToday ? 'bg-[#86BBD8]/[0.08]' : holiday ? 'bg-pink-500/[0.10]' : ''
                  } ${
                    holiday ? 'border-pink-500/40' : 'border-transparent'
                  }`}>
                  {/* Holiday name — abbreviated to 4 chars */}
                  {holiday && (
                    <span className="text-[7px] text-pink-300 font-bold leading-none uppercase tracking-tight truncate w-full text-center px-0.5">
                      {holiday.replace(/[''']/g, '').slice(0, 6)}
                    </span>
                  )}
                  <span className={`text-[9px] ${holiday ? 'text-pink-300/70' : 'text-white/30'}`}>{WD[d.getDay()]}</span>
                  <span className={`text-xs font-bold ${isToday ? 'text-[#86BBD8]' : holiday ? 'text-pink-300' : 'text-white/50'}`}>
                    {d.getDate()}
                  </span>
                  {holiday && <Flag className="h-2.5 w-2.5 text-pink-400/80" />}
                </div>
              );
            })}
          </div>

          {/* Employee rows */}
          {assignments.length === 0 ? (
            <div className="py-14 text-center text-white/30 text-sm">No shift assignments to display</div>
          ) : assignments.map((a, rowIdx) => (
            <div key={a.id}
              className={`flex border-b border-white/[0.04] transition-colors hover:bg-white/[0.04] ${rowIdx % 2 !== 0 ? 'bg-white/[0.015]' : ''}`}>

              {/* Name cell — sticky */}
              <div style={{ width: NAME }}
                className={`shrink-0 py-1.5 px-3 sticky left-0 z-10 border-r border-white/[0.06] ${rowIdx % 2 !== 0 ? 'bg-[#07101c]' : 'bg-[#050f1c]'}`}>
                <div className="flex items-center gap-2">
                  <AvatarInitials name={a.employee_name} size="xs" />
                  <div className="min-w-0">
                    <button type="button" onClick={() => onView(a)}
                      className="text-xs font-medium text-white/80 hover:text-white truncate max-w-[130px] block text-left transition-colors">
                      {a.employee_name}
                    </button>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${SHIFT_PATTERNS[a.shift_type].dotClass}`} />
                      <span className="text-[9px] text-white/30">{SHIFT_PATTERNS[a.shift_type].label}</span>
                    </div>
                    {(() => {
                      const t = getDayTiming(a, todayStr);
                      const hrs = t?.hours || a.shift_hours;
                      return hrs ? (
                        <div className={`text-[9px] mt-0.5 font-medium ${t?.color || 'text-white/30'} opacity-75`}>{hrs}</div>
                      ) : null;
                    })()}
                  </div>
                </div>
              </div>

              {/* Day cells */}
              {days.map(d => {
                const ds      = d2s(d);
                const status  = computeDayStatus(a, d);
                const isToday = ds === todayStr;
                const isWknd  = d.getDay() === 0 || d.getDay() === 6;
                const { timing, hours, event } = getDayCellInfo(a, ds);
                // Leaves overlay: only shown when no day_override event covers this day
                const leave      = !event ? findLeaveForDay(leaves, a.employee_id, a.employee_name, ds) : undefined;
                const isPending  = leave?.status === 'pending';
                // Public holiday: shown when no event or leave already covers the day
                const holiday    = !event && !leave ? holidays.get(ds) : undefined;
                const isHoliday  = !!holiday;

                const isOn   = status === 'on' || status === 'on+standby';
                const isSby  = status === 'standby' || status === 'on+standby';
                const et     = event
                  ? EVENT_TYPES[event.type as EventType] ?? EVENT_TYPES.custom
                  : leave
                  ? EVENT_TYPES[leaveToEventType(leave.leave_type)]
                  : null;

                // Priority: explicit event > leave from Leaves page > public holiday > shift color
                const baseClass = et
                  ? `${et.bg} ${et.border} ${et.color}`
                  : isHoliday
                  ? 'bg-pink-500/[0.15] border-pink-500/35 text-pink-300'
                  : isOn
                  ? (timing
                      ? `${timing.bg} ${timing.border} ${timing.color}`
                      : 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400')
                  : isSby
                  ? 'bg-amber-500/20 border-amber-500/30 text-amber-400'
                  : isWknd
                  ? 'bg-white/[0.015] border-white/[0.03] text-white/10'
                  : 'bg-transparent border-transparent text-white/10';

                return (
                  <div key={ds} style={{ width: COL }}
                    className={`flex items-stretch py-1 px-1 ${isToday ? 'bg-[#86BBD8]/[0.07]' : isHoliday ? 'bg-pink-500/[0.05]' : ''}`}>
                    <button type="button"
                      title={
                        event   ? `${et?.label ?? 'Event'}: ${event.from}${event.to !== event.from ? ` → ${event.to}` : ''}${event.note ? ` · ${event.note}` : ''}`
                        : leave ? `${et?.label ?? 'Leave'} (${leave.status}) · ${leave.start_date} → ${leave.end_date}${leave.reason ? ` · ${leave.reason}` : ''}`
                        : isHoliday ? `🇿🇼 Public Holiday: ${holiday}`
                        : `Click to add event for ${ds}`
                      }
                      onClick={() => setEventModal({ assignment: a, prefillDate: ds })}
                      className={`relative flex-1 rounded-md border flex flex-col items-center justify-center gap-0.5 py-1.5 px-0.5 min-h-[50px] transition-all cursor-pointer hover:ring-1 hover:ring-white/20 hover:brightness-110 ${baseClass} ${isPending ? 'opacity-60 border-dashed' : ''}`}>
                      {et ? (() => {
                        const CellIcon = et.icon;
                        return (
                          /* Event / leave cell */
                          <>
                            <CellIcon className={`h-4 w-4 ${et.color}`} />
                            <span className={`text-[10px] font-bold leading-none tracking-wide ${et.color}`}>{et.abbr}</span>
                            {leave && (
                              <span className="absolute top-0.5 left-0.5 text-[7px] font-bold opacity-60 leading-none text-white/60">L</span>
                            )}
                            {(event?.start_time && event?.end_time) && (
                              <span className="text-[7px] opacity-60 leading-none font-mono whitespace-nowrap">
                                {event.start_time}–{event.end_time}
                              </span>
                            )}
                          </>
                        );
                      })() : isHoliday ? (
                        /* Public holiday cell */
                        <>
                          <Landmark className="h-4 w-4 text-pink-300" />
                          <span className="text-[10px] font-bold leading-none tracking-wide text-pink-300">PH</span>
                          <span className="text-[7px] leading-none text-center text-pink-200/70 px-0.5 truncate w-full">
                            {holiday!.replace(/[''']/g, '').split(' ').slice(0, 2).join(' ')}
                          </span>
                        </>
                      ) : isOn ? (() => {
                        const TimingIcon = timing?.icon;
                        return (
                          <>
                            {TimingIcon
                              ? <TimingIcon className={`h-4 w-4 ${timing!.color}`} />
                              : isSby
                              ? <Shield className="h-4 w-4 text-teal-300" />
                              : <div className="h-2.5 w-2.5 rounded-full bg-emerald-400/80 ring-2 ring-emerald-400/20" />
                            }
                            <span className={`text-[10px] font-bold leading-none tracking-wide ${timing?.color ?? (isSby ? 'text-teal-300' : 'text-emerald-300')}`}>
                              {timing?.abbr ?? (isSby ? 'SBY' : 'ON')}
                            </span>
                            {hours && (
                              <span className="text-[7px] opacity-60 leading-none font-mono whitespace-nowrap">
                                {hours}
                              </span>
                            )}
                          </>
                        );
                      })() : isSby ? (
                        <>
                          <Shield className="h-4 w-4 text-amber-300" />
                          <span className="text-[10px] font-bold leading-none tracking-wide text-amber-300">SBY</span>
                          {hours && <span className="text-[7px] opacity-55 font-mono leading-none">{hours}</span>}
                        </>
                      ) : (
                        <span className="text-[10px] opacity-20 leading-none font-light">—</span>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* ── Legend ── */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 border-t border-white/[0.07] text-[10px] text-white/40">
        {/* Duty status */}
        <span className="flex items-center gap-1.5">
          <span className="w-7 h-7 rounded-lg bg-emerald-500/[0.22] border border-emerald-400/40 inline-flex items-center justify-center">
            <div className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
          </span>
          On Duty
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-7 h-7 rounded-lg bg-teal-500/[0.22] border border-teal-400/40 inline-flex items-center justify-center">
            <Shield className="h-3.5 w-3.5 text-teal-300" />
          </span>
          On + Standby
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-7 h-7 rounded-lg bg-amber-500/[0.22] border border-amber-400/40 inline-flex items-center justify-center">
            <Shield className="h-3.5 w-3.5 text-amber-300" />
          </span>
          Standby
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-7 h-7 rounded-lg border border-white/10 inline-flex items-center justify-center text-white/20 font-light text-sm">—</span>
          Off Duty
        </span>
        <span className="w-px h-5 bg-white/10" />
        {/* Shift timing */}
        {Object.entries(SHIFT_TIMING_PRESETS).filter(([k]) => k !== 'custom').map(([key, t]) => {
          const TIcon = t.icon;
          return (
            <span key={key} className="flex items-center gap-1.5">
              <span className={`w-9 h-7 rounded-lg ${t.bg} border ${t.border} inline-flex flex-col items-center justify-center gap-0.5`}>
                <TIcon className={`h-3 w-3 ${t.color}`} />
                <span className={`text-[7px] font-bold leading-none font-mono ${t.color}`}>{t.abbr}</span>
              </span>
              {t.label.replace(' Shift', '')}
            </span>
          );
        })}
        <span className="w-px h-5 bg-white/10" />
        {/* Event types */}
        {(Object.entries(EVENT_TYPES) as [EventType, typeof EVENT_TYPES[EventType]][]).map(([key, t]) => {
          const EIcon = t.icon;
          return (
            <span key={key} className="flex items-center gap-1.5">
              <span className={`w-7 h-7 rounded-lg ${t.bg} border ${t.border} inline-flex items-center justify-center`}>
                <EIcon className={`h-3.5 w-3.5 ${t.color}`} />
              </span>
              <span className="text-white/35">{t.abbr} {t.label}</span>
            </span>
          );
        })}
        <span className="w-px h-5 bg-white/10" />
        {/* Leaves / PH */}
        <span className="flex items-center gap-1.5">
          <span className="relative w-7 h-7 rounded-lg bg-emerald-500/[0.20] border border-emerald-400/40 inline-flex items-center justify-center">
            <Umbrella className="h-3.5 w-3.5 text-emerald-300" />
            <span className="absolute -top-0.5 -left-0.5 w-3 h-3 rounded-full bg-[#050f1c] border border-[#86BBD8]/30 flex items-center justify-center text-[6px] font-bold text-[#86BBD8]/70">L</span>
          </span>
          <span className="text-white/35">Leave (synced)</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-7 h-7 rounded-lg bg-pink-500/[0.20] border border-pink-400/40 inline-flex items-center justify-center">
            <Landmark className="h-3.5 w-3.5 text-pink-300" />
          </span>
          <span className="text-white/35">🇿🇼 Public Holiday</span>
        </span>
        <span className="flex items-center gap-1.5 ml-auto">
          <span className="w-7 h-7 rounded-lg bg-[#86BBD8]/[0.10] border border-[#86BBD8]/25 inline-block" />
          Today
        </span>
      </div>

      {/* Schedule event editor */}
      {eventModal && (
        <ScheduleEventModal
          assignment={eventModal.assignment}
          prefillDate={eventModal.prefillDate}
          onSave={handleSaveEvents}
          onClose={() => setEventModal(null)}
          saving={saving}
        />
      )}
    </div>
  );
}

// ─── ShiftCard ────────────────────────────────────────────────────────────────

function ShiftCard({
  assignment, onView, onEdit, onDelete,
}: {
  assignment: ShiftAssignment;
  onView: (a: ShiftAssignment) => void;
  onEdit: (a: ShiftAssignment) => void;
  onDelete: (a: ShiftAssignment) => void;
}) {
  const status   = todayStatus(assignment);
  const progress = cycleProgress(assignment);
  const pattern  = SHIFT_PATTERNS[assignment.shift_type];
  const nextOn   = daysUntilNextOn(assignment);

  return (
    <div
      className="group relative hover:shadow-xl transition-all duration-300 overflow-hidden rounded-xl cursor-pointer oz-glass-dark border border-white/[0.09] hover:border-white/[0.16]"
      onClick={() => onView(assignment)}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <AvatarInitials name={assignment.employee_name} size="md" />
            <div className="min-w-0">
              <div className="text-sm font-semibold text-white truncate">{assignment.employee_name}</div>
              <div className="text-xs text-white/45 truncate">
                {assignment.designation || assignment.department || assignment.employee_id}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
            <StatusBadge status={status} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" aria-label="More options" className="h-7 w-7 flex items-center justify-center rounded-lg bg-white/[0.06] border border-white/10 text-white/40 hover:text-white/80 hover:bg-white/[0.12] transition-all">
                  <MoreVertical className="h-3.5 w-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-[rgba(5,15,28,0.95)] border-white/[0.15]">
                <DropdownMenuItem className="text-white/75 focus:bg-white/[0.10] focus:text-white cursor-pointer gap-2" onClick={() => onView(assignment)}>
                  <Eye className="h-3.5 w-3.5" /> View Details
                </DropdownMenuItem>
                <DropdownMenuItem className="text-white/75 focus:bg-white/[0.10] focus:text-white cursor-pointer gap-2" onClick={() => onEdit(assignment)}>
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-white/[0.08]" />
                <DropdownMenuItem className="text-red-400 focus:bg-red-500/10 focus:text-red-300 cursor-pointer gap-2" onClick={() => onDelete(assignment)}>
                  <Trash2 className="h-3.5 w-3.5" /> Remove
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-3">
          <ShiftTypeBadge type={assignment.shift_type} />
          {assignment.shift_type !== 'standby' && (
            <span className="text-xs text-white/35">{assignment.on_days}d on / {assignment.off_days}d off</span>
          )}
        </div>

        <div className="mb-2">
          <div className="flex justify-between text-[10px] text-white/35 mb-1">
            <span>Cycle position</span><span>{progress}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
            <ShiftBar pct={progress} color={pattern.fillColor} opacity={0.75} />
          </div>
        </div>

        <div className="flex items-center gap-3 text-[11px] text-white/40">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" /> From {fmtDate(assignment.cycle_start_date)}
          </span>
          {status === 'off' && nextOn > 0 && (
            <span className="flex items-center gap-1 text-[#86BBD8]/70">
              <TrendingUp className="h-3 w-3" /> On in {nextOn}d
            </span>
          )}
        </div>
      </div>

      <div className="px-4 py-2.5 bg-white/[0.03] border-t border-white/[0.07]">
        <button
          type="button"
          onClick={e => { e.stopPropagation(); onView(assignment); }}
          className="w-full inline-flex items-center justify-center gap-2 text-xs text-white/50 hover:text-white/80 transition-colors"
        >
          <Eye className="h-3.5 w-3.5" /> View Details
        </button>
      </div>
    </div>
  );
}

// ─── ShiftDetailModal ─────────────────────────────────────────────────────────

function ShiftDetailModal({
  assignment, open, onClose, onEdit, onDelete,
}: {
  assignment: ShiftAssignment | null;
  open: boolean;
  onClose: () => void;
  onEdit: (a: ShiftAssignment) => void;
  onDelete: (a: ShiftAssignment) => void;
}) {
  if (!assignment) return null;
  const status   = todayStatus(assignment);
  const progress = cycleProgress(assignment);
  const pattern  = SHIFT_PATTERNS[assignment.shift_type];
  const nextOn   = daysUntilNextOn(assignment);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0 rounded-2xl bg-[rgba(5,15,28,0.97)] backdrop-blur-2xl border border-white/10 text-white">
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-white/[0.08]">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <AvatarInitials name={assignment.employee_name} size="lg" />
              <div>
                <DialogTitle className="text-base font-bold text-white font-heading">{assignment.employee_name}</DialogTitle>
                <DialogDescription className="text-xs text-white/45 mt-0.5">
                  {assignment.designation || '—'} · {assignment.department || '—'}
                </DialogDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={status} />
              <ShiftTypeBadge type={assignment.shift_type} />
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 py-5 space-y-4">
          <div className="bg-white/[0.04] rounded-xl border border-white/[0.06] overflow-hidden">
            <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-white/[0.05]">
              <Users className="h-3.5 w-3.5 text-[#86BBD8]" />
              <span className="text-xs font-semibold text-white/75 uppercase tracking-wider">Employee</span>
            </div>
            <div className="px-3.5 py-3 grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2.5">
              <IF label="Employee ID"  value={assignment.employee_id} />
              <IF label="Designation"  value={assignment.designation} />
              <IF label="Department"   value={assignment.department} />
              <IF label="Section"      value={assignment.section} />
              <IF label="Phone"        value={assignment.phone} />
            </div>
          </div>

          <div className="bg-white/[0.04] rounded-xl border border-white/[0.06] overflow-hidden">
            <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-white/[0.05]">
              <Clock className="h-3.5 w-3.5 text-[#86BBD8]" />
              <span className="text-xs font-semibold text-white/75 uppercase tracking-wider">Shift Pattern</span>
            </div>
            <div className="px-3.5 py-3 grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2.5">
              <IF label="Shift Type"   value={pattern.label} />
              {assignment.shift_type !== 'standby' && (
                <>
                  <IF label="On Days"  value={assignment.on_days} />
                  <IF label="Off Days" value={assignment.off_days} />
                </>
              )}
              <IF label="Cycle Start"  value={fmtDate(assignment.cycle_start_date)} />
              <IF label="Status"       value={STATUS_COLORS[status].label} />
              {(assignment.shift_label || assignment.shift_hours) && (() => {
                const t = assignment.shift_label ? SHIFT_TIMING_PRESETS[assignment.shift_label] : null;
                return <IF label="Default Timing" value={t ? `${t.label} · ${assignment.shift_hours || t.hours}` : (assignment.shift_hours || '')} />;
              })()}
              {status === 'off' && nextOn > 0 && (
                <IF label="Next On Duty" value={`In ${nextOn} day${nextOn > 1 ? 's' : ''}`} />
              )}
            </div>
          </div>

          {assignment.shift_type !== 'standby' && (
            <div className="bg-white/[0.04] rounded-xl border border-white/[0.06] overflow-hidden">
              <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-white/[0.05]">
                <Activity className="h-3.5 w-3.5 text-[#86BBD8]" />
                <span className="text-xs font-semibold text-white/75 uppercase tracking-wider">Cycle Position</span>
              </div>
              <div className="px-3.5 py-3">
                <div className="flex justify-between text-xs text-white/50 mb-2">
                  <span>Progress through current cycle</span>
                  <span className="font-semibold text-white/80">{progress}%</span>
                </div>
                <div className="h-2.5 rounded-full bg-white/[0.08] overflow-hidden">
                  <ShiftBar pct={progress} color={pattern.fillColor} opacity={0.8} />
                </div>
                <div className="flex justify-between text-[10px] text-white/30 mt-1.5">
                  <span>Day 1</span>
                  <span>Day {assignment.on_days + assignment.off_days}</span>
                </div>
              </div>
            </div>
          )}

          {(assignment.shift_timing_periods || []).length > 0 && (
            <div className="bg-[#86BBD8]/[0.04] rounded-xl border border-[#86BBD8]/15 overflow-hidden">
              <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-[#86BBD8]/10">
                <Clock className="h-3.5 w-3.5 text-[#86BBD8]" />
                <span className="text-xs font-semibold text-[#86BBD8]/80 uppercase tracking-wider">Timing Blocks</span>
                <span className="ml-auto text-xs text-[#86BBD8]/50">{(assignment.shift_timing_periods || []).length} block{(assignment.shift_timing_periods || []).length > 1 ? 's' : ''}</span>
              </div>
              <div className="px-3.5 py-3 space-y-1.5">
                {(assignment.shift_timing_periods || []).map((blk, i) => {
                  const t = blk.label ? SHIFT_TIMING_PRESETS[blk.label] : null;
                  const hrs = (blk.start_time && blk.end_time) ? `${blk.start_time}–${blk.end_time}` : (t?.hours || '');
                  return (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      {t && <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${t.bg} ${t.border} ${t.color}`}>{t.abbr}</span>}
                      <span className="text-white/60">{fmtDate(blk.from)} → {fmtDate(blk.to)}</span>
                      {hrs && <span className="ml-auto text-xs text-white/40 font-mono">{hrs}</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {assignment.shift_type !== 'standby' && (assignment.standby_periods || []).length > 0 && (
            <div className="bg-amber-500/[0.05] rounded-xl border border-amber-500/20 overflow-hidden">
              <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-amber-500/15">
                <Shield className="h-3.5 w-3.5 text-amber-400" />
                <span className="text-xs font-semibold text-amber-300 uppercase tracking-wider">Standby Periods</span>
                <span className="ml-auto text-xs text-amber-400/70">{(assignment.standby_periods || []).length} period{(assignment.standby_periods || []).length > 1 ? 's' : ''}</span>
              </div>
              <div className="px-3.5 py-3 space-y-1.5">
                {(assignment.standby_periods || []).map((p, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-amber-200/80">
                    <span className="text-amber-500/50">·</span>
                    <span>{fmtDate(p.from)}</span>
                    <span className="text-white/30">→</span>
                    <span>{fmtDate(p.to)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(assignment.day_overrides || []).length > 0 && (
            <div className="bg-white/[0.04] rounded-xl border border-white/[0.06] overflow-hidden">
              <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-white/[0.05]">
                <Calendar className="h-3.5 w-3.5 text-[#86BBD8]" />
                <span className="text-xs font-semibold text-white/75 uppercase tracking-wider">Schedule Events</span>
                <span className="ml-auto text-xs text-white/35">{(assignment.day_overrides || []).length} event{(assignment.day_overrides || []).length > 1 ? 's' : ''}</span>
              </div>
              <div className="px-3.5 py-3 space-y-1.5 max-h-48 overflow-y-auto">
                {(assignment.day_overrides as ScheduleEvent[]).map((ev, i) => {
                  const t      = EVENT_TYPES[ev.type as EventType] ?? EVENT_TYPES.custom;
                  const EvIcon = t.icon;
                  const hrs    = ev.start_time && ev.end_time ? `${ev.start_time}–${ev.end_time}` : '';
                  return (
                    <div key={ev.id || i} className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg border ${t.bg} ${t.border}`}>
                      <div className={`p-1.5 rounded-lg ${t.bg} border ${t.border} shrink-0`}>
                        <EvIcon className={`h-3.5 w-3.5 ${t.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`text-xs font-semibold ${t.color}`}>{t.label}</div>
                        <div className="text-[11px] text-white/45">
                          {fmtDate(ev.from)}{ev.to && ev.to !== ev.from ? ` → ${fmtDate(ev.to)}` : ''}
                          {hrs ? ` · ${hrs}` : ''}
                          {ev.note ? ` · ${ev.note}` : ''}
                        </div>
                      </div>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${t.bg} border ${t.border} ${t.color} shrink-0`}>{t.abbr}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {assignment.notes && (
            <div className="bg-white/[0.04] rounded-xl border border-white/[0.06] overflow-hidden">
              <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-white/[0.05]">
                <AlertCircle className="h-3.5 w-3.5 text-[#86BBD8]" />
                <span className="text-xs font-semibold text-white/75 uppercase tracking-wider">Notes</span>
              </div>
              <p className="px-3.5 py-3 text-sm text-white/70 leading-relaxed">{assignment.notes}</p>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => { onEdit(assignment); onClose(); }}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:shadow-lg bg-gradient-to-br from-[#2A4D69] to-[#1e3a52] border border-[#86BBD8]/25"
            >
              <Pencil className="h-4 w-4" /> Edit Assignment
            </button>
            <button
              type="button"
              aria-label="Delete assignment"
              onClick={() => { onDelete(assignment); onClose(); }}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold text-red-400 transition-all hover:-translate-y-0.5 border border-red-500/20 bg-red-500/10 hover:bg-red-500/20"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── ShiftAssignForm ──────────────────────────────────────────────────────────

interface StandbyPeriod { from: string; to: string; }

interface FormState {
  employee_id: string; employee_name: string; designation: string;
  department: string;  section: string;       phone: string;
  shift_type: ShiftType; on_days: string; off_days: string;
  cycle_start_date: string; notes: string; is_active: boolean;
  standby_periods: StandbyPeriod[];
  shift_label: string; shift_hours: string;
  shift_timing_periods: ShiftTimingPeriod[];
}

const EMPTY_FORM: FormState = {
  employee_id: '', employee_name: '', designation: '', department: '',
  section: '', phone: '', shift_type: '10-4', on_days: '10', off_days: '4',
  cycle_start_date: new Date().toISOString().slice(0, 10),
  notes: '', is_active: true, standby_periods: [],
  shift_label: '', shift_hours: '', shift_timing_periods: [],
};

function ShiftAssignForm({
  open, onClose, editing, employees, onSaved,
}: {
  open: boolean; onClose: () => void;
  editing: ShiftAssignment | null;
  employees: Employee[]; onSaved: () => void;
}) {
  const [form, setForm]       = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving]   = useState(false);
  const [empOpen, setEmpOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setForm({
        employee_id:      editing.employee_id,
        employee_name:    editing.employee_name,
        designation:      editing.designation  || '',
        department:       editing.department   || '',
        section:          editing.section      || '',
        phone:            editing.phone        || '',
        shift_type:       editing.shift_type,
        on_days:          String(editing.on_days),
        off_days:         String(editing.off_days),
        cycle_start_date: editing.cycle_start_date,
        notes:            editing.notes        || '',
        is_active:        editing.is_active,
        standby_periods:       editing.standby_periods       || [],
        shift_label:           editing.shift_label           || '',
        shift_hours:           editing.shift_hours           || '',
        shift_timing_periods:  editing.shift_timing_periods  || [],
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [open, editing]);

  function setField(k: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(p => ({ ...p, [k]: e.target.value }));
  }

  function onShiftTypeChange(v: ShiftType) {
    const p = SHIFT_PATTERNS[v];
    setForm(prev => ({ ...prev, shift_type: v, on_days: String(p.on), off_days: String(p.off) }));
  }

  function selectEmployee(emp: Employee) {
    setForm(p => ({
      ...p,
      employee_id:   emp.id,
      employee_name: emp.name,
      designation:   emp.designation || p.designation,
      department:    emp.department  || p.department,
      section:       emp.section     || p.section,
      phone:         emp.phone       || p.phone,
    }));
    setEmpOpen(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.employee_id || !form.employee_name || !form.cycle_start_date) {
      toast.error('Employee and cycle start date are required');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        employee_id: form.employee_id, employee_name: form.employee_name,
        designation: form.designation || null, department: form.department || null,
        section: form.section || null, phone: form.phone || null,
        shift_type: form.shift_type,
        on_days: parseInt(form.on_days) || 0, off_days: parseInt(form.off_days) || 0,
        cycle_start_date: form.cycle_start_date,
        notes: form.notes || null, is_active: form.is_active,
        standby_periods: form.standby_periods,
        shift_label: form.shift_label || null,
        shift_hours: form.shift_hours || null,
        shift_timing_periods: form.shift_timing_periods,
      };
      const url    = editing ? `${STANDBY_API}/${editing.id}` : STANDBY_API;
      const method = editing ? 'PUT' : 'POST';
      const res    = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error(await res.text());
      toast.success(editing ? 'Assignment updated' : 'Assignment created');
      onSaved();
      onClose();
    } catch (err) {
      toast.error(String(err));
    } finally {
      setSaving(false);
    }
  }

  const isCustom  = form.shift_type === 'custom';
  const isStandby = form.shift_type === 'standby';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto p-0 gap-0 rounded-2xl bg-[rgba(5,15,28,0.97)] backdrop-blur-2xl border border-white/10 text-white">
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-[#2A4D69]/50 border border-[#86BBD8]/20">
              <Clock className="h-4 w-4 text-[#86BBD8]" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-white font-heading">
                {editing ? 'Edit Assignment' : 'Assign Shift'}
              </DialogTitle>
              <DialogDescription className="text-xs text-white/40">
                {editing ? 'Update shift assignment details' : 'Set up a new shift cycle for an employee'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="bg-white/[0.04] rounded-xl border border-white/[0.06] overflow-hidden">
            <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-white/[0.05]">
              <Users className="h-3.5 w-3.5 text-[#86BBD8]" />
              <span className="text-xs font-semibold text-white/75 uppercase tracking-wider">Employee</span>
            </div>
            <div className="px-3.5 py-3 space-y-3">
              <div>
                <div className={LBL}>Employee *</div>
                <Popover open={empOpen} onOpenChange={setEmpOpen}>
                  <PopoverTrigger asChild>
                    <button type="button" className={`${GIN} flex items-center justify-between`}>
                      <span className={form.employee_name ? 'text-white' : 'text-white/30'}>
                        {form.employee_name || 'Search employee…'}
                      </span>
                      <ChevronsUpDown className="h-3.5 w-3.5 text-white/30 shrink-0" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-0 bg-[rgba(5,15,28,0.97)] border border-white/15" align="start">
                    <Command className="bg-transparent">
                      <CommandInput placeholder="Search…" className="border-none focus:ring-0 text-white placeholder:text-white/30 text-sm" />
                      <CommandList>
                        <CommandEmpty className="text-white/40 text-sm py-4 text-center">No employees found</CommandEmpty>
                        <CommandGroup>
                          {employees.map(emp => (
                            <CommandItem
                              key={emp.id} value={emp.name}
                              onSelect={() => selectEmployee(emp)}
                              className="text-white/80 hover:bg-white/[0.10] cursor-pointer data-[selected=true]:bg-white/[0.10]"
                            >
                              <Check className={`h-3.5 w-3.5 mr-2 ${form.employee_id === emp.id ? 'opacity-100' : 'opacity-0'}`} />
                              <div>
                                <div className="text-sm font-medium">{emp.name}</div>
                                <div className="text-xs text-white/40">{emp.designation} · {emp.department}</div>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className={LBL}>Employee ID</div>
                  <input className={GIN} value={form.employee_id} onChange={setField('employee_id')} placeholder="C1234" />
                </div>
                <div>
                  <div className={LBL}>Phone</div>
                  <input className={GIN} value={form.phone} onChange={setField('phone')} placeholder="+263…" />
                </div>
                <div>
                  <div className={LBL}>Designation</div>
                  <input className={GIN} value={form.designation} onChange={setField('designation')} placeholder="Engineer" />
                </div>
                <div>
                  <div className={LBL}>Department</div>
                  <input className={GIN} value={form.department} onChange={setField('department')} placeholder="Operations" />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white/[0.04] rounded-xl border border-white/[0.06] overflow-hidden">
            <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-white/[0.05]">
              <Clock className="h-3.5 w-3.5 text-[#86BBD8]" />
              <span className="text-xs font-semibold text-white/75 uppercase tracking-wider">Shift Pattern</span>
            </div>
            <div className="px-3.5 py-3 space-y-3">
              <div>
                <div className={LBL}>Shift Type *</div>
                <select aria-label="Shift type" className={GIN} value={form.shift_type} onChange={e => onShiftTypeChange(e.target.value as ShiftType)}>
                  {(Object.entries(SHIFT_PATTERNS) as [ShiftType, typeof SHIFT_PATTERNS[ShiftType]][]).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>
              {!isStandby && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className={LBL}>On Days</div>
                    <input type="number" min={0} max={365} aria-label="On days" className={`${GIN} ${!isCustom ? 'opacity-60' : ''}`} value={form.on_days} onChange={setField('on_days')} readOnly={!isCustom} />
                  </div>
                  <div>
                    <div className={LBL}>Off Days</div>
                    <input type="number" min={0} max={365} aria-label="Off days" className={`${GIN} ${!isCustom ? 'opacity-60' : ''}`} value={form.off_days} onChange={setField('off_days')} readOnly={!isCustom} />
                  </div>
                </div>
              )}
              <div>
                <div className={LBL}>Cycle Start Date *</div>
                <input type="date" aria-label="Cycle start date" className={GIN} value={form.cycle_start_date} onChange={setField('cycle_start_date')} />
              </div>
            </div>
          </div>

          {/* Shift Timing */}
          <div className="bg-white/[0.04] rounded-xl border border-white/[0.06] overflow-hidden">
            <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-white/[0.05]">
              <div className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 text-[#86BBD8]" />
                <span className="text-xs font-semibold text-white/75 uppercase tracking-wider">Shift Timing</span>
              </div>
              <button
                type="button"
                onClick={() => setForm(p => ({
                  ...p,
                  shift_timing_periods: [...p.shift_timing_periods, {
                    from: p.cycle_start_date, to: p.cycle_start_date,
                    label: p.shift_label || '', start_time: '', end_time: '',
                  }],
                }))}
                className="text-xs px-2 py-1 rounded-lg bg-[#86BBD8]/10 border border-[#86BBD8]/25 text-[#86BBD8]/70 hover:bg-[#86BBD8]/20 transition-all"
              >
                + Add Block
              </button>
            </div>
            <div className="px-3.5 py-3 space-y-4">
              {/* Default timing preset tiles */}
              <div>
                <div className={`${LBL} mb-2`}>Default timing (days without a specific block)</div>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['day', 'morning', 'afternoon', 'night'] as const).map(key => {
                    const t = SHIFT_TIMING_PRESETS[key];
                    const active = form.shift_label === key;
                    return (
                      <button key={key} type="button"
                        onClick={() => setForm(p => ({
                          ...p,
                          shift_label: active ? '' : key,
                          shift_hours: active ? '' : t.hours,
                        }))}
                        className={`text-center px-2 py-2 rounded-lg border transition-all ${
                          active ? `${t.bg} ${t.border} ${t.color}` : 'bg-white/[0.04] border-white/[0.08] text-white/40 hover:bg-white/[0.08]'
                        }`}
                      >
                        <div className={`text-[11px] font-bold ${active ? t.color : ''}`}>{t.abbr}</div>
                        <div className="text-[9px] mt-0.5 opacity-70 leading-tight">{t.label.replace(' Shift', '')}</div>
                        <div className="text-[9px] mt-0.5 opacity-50">{t.hours}</div>
                      </button>
                    );
                  })}
                </div>
                {/* Default custom time pickers */}
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <div>
                    <div className={LBL}>Start time</div>
                    <input type="time" aria-label="Default start time" className={GIN}
                      value={form.shift_hours?.split('–')[0]?.trim().replace(':', ':') || ''}
                      onChange={e => {
                        const end = form.shift_hours?.split('–')[1]?.trim() || '';
                        setForm(p => ({ ...p, shift_hours: `${e.target.value}–${end}`, shift_label: p.shift_label || 'custom' }));
                      }} />
                  </div>
                  <div>
                    <div className={LBL}>End time</div>
                    <input type="time" aria-label="Default end time" className={GIN}
                      value={form.shift_hours?.split('–')[1]?.trim() || ''}
                      onChange={e => {
                        const start = form.shift_hours?.split('–')[0]?.trim() || '';
                        setForm(p => ({ ...p, shift_hours: `${start}–${e.target.value}`, shift_label: p.shift_label || 'custom' }));
                      }} />
                  </div>
                </div>
              </div>

              {/* Timing Blocks */}
              {form.shift_timing_periods.length > 0 && (
                <div className="space-y-2">
                  <div className={LBL}>Timing blocks (override by date range)</div>
                  {form.shift_timing_periods.map((blk, idx) => (
                    <div key={idx} className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-2.5 space-y-2">
                      {/* Preset chips row */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {(['day', 'morning', 'afternoon', 'night'] as const).map(key => {
                          const t = SHIFT_TIMING_PRESETS[key];
                          const active = blk.label === key;
                          return (
                            <button key={key} type="button"
                              onClick={() => setForm(p => {
                                const updated = [...p.shift_timing_periods];
                                const preset = SHIFT_TIMING_PRESETS[key];
                                const [s, e2] = preset.hours.split('–');
                                updated[idx] = { ...updated[idx], label: active ? '' : key, start_time: active ? updated[idx].start_time : (s || ''), end_time: active ? updated[idx].end_time : (e2 || '') };
                                return { ...p, shift_timing_periods: updated };
                              })}
                              className={`text-xs px-2 py-0.5 rounded-md border transition-all ${
                                active ? `${t.bg} ${t.border} ${t.color}` : 'bg-white/[0.04] border-white/[0.07] text-white/40 hover:text-white/70'
                              }`}
                            >{t.abbr} <span className="opacity-60">{t.label.replace(' Shift', '')}</span></button>
                          );
                        })}
                        <button type="button" aria-label="Remove timing block"
                          onClick={() => setForm(p => ({ ...p, shift_timing_periods: p.shift_timing_periods.filter((_, i) => i !== idx) }))}
                          className="ml-auto h-6 w-6 flex items-center justify-center rounded-md bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all"
                        ><X className="h-3 w-3" /></button>
                      </div>
                      {/* Date range + time pickers */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <div className={LBL}>From date</div>
                          <input type="date" aria-label={`Block ${idx + 1} from date`} className={GIN} value={blk.from || ''}
                            onChange={e => setForm(p => { const u = [...p.shift_timing_periods]; u[idx] = { ...u[idx], from: e.target.value }; return { ...p, shift_timing_periods: u }; })} />
                        </div>
                        <div>
                          <div className={LBL}>To date</div>
                          <input type="date" aria-label={`Block ${idx + 1} to date`} className={GIN} value={blk.to || ''}
                            onChange={e => setForm(p => { const u = [...p.shift_timing_periods]; u[idx] = { ...u[idx], to: e.target.value }; return { ...p, shift_timing_periods: u }; })} />
                        </div>
                        <div>
                          <div className={LBL}>Start time</div>
                          <input type="time" aria-label={`Block ${idx + 1} start time`} className={GIN} value={blk.start_time || ''}
                            onChange={e => setForm(p => { const u = [...p.shift_timing_periods]; u[idx] = { ...u[idx], start_time: e.target.value }; return { ...p, shift_timing_periods: u }; })} />
                        </div>
                        <div>
                          <div className={LBL}>End time</div>
                          <input type="time" aria-label={`Block ${idx + 1} end time`} className={GIN} value={blk.end_time || ''}
                            onChange={e => setForm(p => { const u = [...p.shift_timing_periods]; u[idx] = { ...u[idx], end_time: e.target.value }; return { ...p, shift_timing_periods: u }; })} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Standby Periods */}
          {form.shift_type !== 'standby' && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.05] overflow-hidden">
              <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-amber-500/15">
                <div className="flex items-center gap-2">
                  <Shield className="h-3.5 w-3.5 text-amber-400" />
                  <span className="text-xs font-semibold text-amber-300 uppercase tracking-wider">Standby Periods</span>
                </div>
                <button
                  type="button"
                  onClick={() => setForm(p => ({
                    ...p,
                    standby_periods: [...p.standby_periods, { from: p.cycle_start_date, to: p.cycle_start_date }],
                  }))}
                  className="text-xs px-2 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 hover:bg-amber-500/25 transition-all flex items-center gap-1"
                >
                  + Add Period
                </button>
              </div>
              <div className="px-3.5 py-3 space-y-2">
                {form.standby_periods.length === 0 ? (
                  <p className="text-xs text-white/30 py-1">No standby periods — click &quot;Add Period&quot; to mark dates when this employee is also on call.</p>
                ) : form.standby_periods.map((period, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <div className="flex-1 grid grid-cols-2 gap-2">
                      <div>
                        {idx === 0 && <div className={`${LBL} mb-1`}>From</div>}
                        <input
                          type="date"
                          aria-label={`Standby period ${idx + 1} from`}
                          className={GIN}
                          value={period.from}
                          onChange={e => setForm(p => {
                            const updated = [...p.standby_periods];
                            updated[idx] = { ...updated[idx], from: e.target.value };
                            return { ...p, standby_periods: updated };
                          })}
                        />
                      </div>
                      <div>
                        {idx === 0 && <div className={`${LBL} mb-1`}>To</div>}
                        <input
                          type="date"
                          aria-label={`Standby period ${idx + 1} to`}
                          className={GIN}
                          value={period.to}
                          onChange={e => setForm(p => {
                            const updated = [...p.standby_periods];
                            updated[idx] = { ...updated[idx], to: e.target.value };
                            return { ...p, standby_periods: updated };
                          })}
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      aria-label="Remove standby period"
                      onClick={() => setForm(p => ({ ...p, standby_periods: p.standby_periods.filter((_, i) => i !== idx) }))}
                      className={`${idx === 0 ? 'mt-5' : ''} h-7 w-7 shrink-0 flex items-center justify-center rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className={LBL}>Notes</div>
            <textarea rows={2} className={GIN} value={form.notes} onChange={setField('notes')} placeholder="Optional notes…" />
          </div>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-white/60 border border-white/[0.12] bg-white/[0.05] hover:bg-white/[0.10] transition-all">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:shadow-lg bg-gradient-to-br from-[#2A4D69] to-[#1e3a52] border border-[#86BBD8]/25 disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none">
              <Clock className="h-4 w-4" />
              {saving ? 'Saving…' : editing ? 'Update' : 'Assign Shift'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ShiftsPage() {
  const sections = usePageCollapse({ hero: false, shiftPatterns: false, roster: false, filters: false });
  const [assignments, setAssignments]   = useState<ShiftAssignment[]>([]);
  const [employees, setEmployees]       = useState<Employee[]>([]);
  const [leaves, setLeaves]             = useState<LeaveRecord[]>([]);
  const [loading, setLoading]           = useState(true);
  const [viewMode, setViewMode]         = useState<ViewMode>('grid');
  const [search, setSearch]             = useState('');
  const [sortKey, setSortKey]           = useState<SortKey>('created_at');
  const [filterType, setFilterType]     = useState<ShiftType | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<DayStatus | 'all'>('all');
  const [showRecords, setShowRecords]   = useState(true);
  const [formOpen, setFormOpen]         = useState(false);
  const [editing, setEditing]           = useState<ShiftAssignment | null>(null);
  const [viewTarget, setViewTarget]     = useState<ShiftAssignment | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ShiftAssignment | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [aRes, eRes, lRes] = await Promise.all([
        fetch(STANDBY_API),
        fetch(EMPLOYEES_API),
        fetch(LEAVES_API),
      ]);
      if (aRes.ok) setAssignments(await aRes.json());
      if (eRes.ok) {
        const raw = await eRes.json() as Record<string, unknown>[];
        setEmployees(raw.map(e => ({
          id: String(e.id),
          name: (`${e.first_name || ''} ${e.last_name || ''}`).trim() || String(e.employee_id || 'Employee'),
          designation: (e.designation || e.position || '') as string,
          department: (e.department || '') as string,
          section: (e.section || '') as string,
          phone: (e.phone || '') as string,
        })));
      }
      if (lRes.ok) setLeaves(await lRes.json());
    } catch {
      toast.error('Failed to load shifts data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const heroStats = useMemo(() => {
    const todayStr = d2s(new Date());
    const active   = assignments.filter(a => a.is_active);
    const on       = active.filter(a => todayStatus(a) === 'on').length;
    const off      = active.filter(a => todayStatus(a) === 'off').length;
    const standby  = active.filter(a => todayStatus(a) === 'standby').length;
    const soonOn   = active.filter(a => { const n = daysUntilNextOn(a); return n > 0 && n <= 3; }).length;
    const onStandby = active.filter(a => todayStatus(a) === 'on+standby').length;
    const onLeave  = active.filter(a => !!findLeaveForDay(leaves, a.employee_id, a.employee_name, todayStr)).length;
    return [
      { label: 'Total',        value: assignments.length, textClass: 'text-[#86BBD8]' },
      { label: 'Active',       value: active.length,      textClass: 'text-[#78C0A6]' },
      { label: 'On Duty',      value: on,                 textClass: 'text-[#4ade80]' },
      { label: 'On+Standby',   value: onStandby,          textClass: 'text-[#2dd4bf]' },
      { label: 'Off Duty',     value: off,                textClass: 'text-[#9ca3af]' },
      { label: 'Standby',      value: standby,            textClass: 'text-[#fbbf24]' },
      { label: 'On Leave',     value: onLeave,            textClass: 'text-[#a78bfa]' },
      { label: 'On in ≤3d',   value: soonOn,             textClass: 'text-[#86BBD8]' },
    ];
  }, [assignments, leaves]);

  const breakdown = useMemo(() => {
    const total = assignments.length || 1;
    return (Object.keys(SHIFT_PATTERNS) as ShiftType[]).map(type => ({
      type,
      count:      assignments.filter(a => a.shift_type === type).length,
      percentage: Math.round((assignments.filter(a => a.shift_type === type).length / total) * 100),
    }));
  }, [assignments]);

  const filtered = useMemo(() => {
    let list = [...assignments];
    if (filterType !== 'all')   list = list.filter(a => a.shift_type === filterType);
    if (filterStatus !== 'all') list = list.filter(a => todayStatus(a) === filterStatus);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(a =>
        a.employee_name.toLowerCase().includes(q) ||
        a.employee_id.toLowerCase().includes(q) ||
        (a.designation || '').toLowerCase().includes(q) ||
        (a.department  || '').toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => {
      if (sortKey === 'name')             return a.employee_name.localeCompare(b.employee_name);
      if (sortKey === 'shift_type')       return a.shift_type.localeCompare(b.shift_type);
      if (sortKey === 'cycle_start_date') return a.cycle_start_date.localeCompare(b.cycle_start_date);
      return (b.created_at || '').localeCompare(a.created_at || '');
    });
    return list;
  }, [assignments, filterType, filterStatus, search, sortKey]);

  const handleUpdateOverrides = useCallback(async (id: number, overrides: DayOverride[]) => {
    const res = await fetch(`${STANDBY_API}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ day_overrides: overrides }),
    });
    if (!res.ok) throw new Error(await res.text());
    setAssignments(prev => prev.map(a => a.id === id ? { ...a, day_overrides: overrides } : a));
  }, []);

  function openCreate()                    { setEditing(null); setFormOpen(true); }
  function openEdit(a: ShiftAssignment)    { setEditing(a); setFormOpen(true); }
  function openView(a: ShiftAssignment)    { setViewTarget(a); }
  function openDelete(a: ShiftAssignment)  { setDeleteTarget(a); }
  function hasFilters()                    { return filterType !== 'all' || filterStatus !== 'all' || search !== ''; }
  function clearFilters()                  { setFilterType('all'); setFilterStatus('all'); setSearch(''); }

  const typeOptions = [
    { value: 'all', label: 'All Patterns' },
    ...Object.entries(SHIFT_PATTERNS).map(([k, v]) => ({ value: k, label: v.label })),
  ];
  const statusOptions = [
    { value: 'all',          label: 'All Statuses'  },
    { value: 'on',           label: 'On Duty'       },
    { value: 'on+standby',   label: 'On + Standby'  },
    { value: 'off',          label: 'Off Duty'      },
    { value: 'standby',      label: 'Standby'       },
  ];

  // RecordsPanelHeader only knows grid/table; pass schedule as table so types are happy
  const headerViewMode = viewMode === 'schedule' ? 'table' : viewMode;
  const handleHeaderViewMode = (v: string) => {
    if (viewMode === 'schedule') setViewMode('grid');
    else setViewMode(v as ViewMode);
  };

  return (
    <PageShell>
    <div className="w-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-4">

        {/* ── Hero ── */}
        <HeroPanel
          icon={Clock}
          title="Shifts"
          onRefresh={fetchAll}
          loading={loading}
          onNew={openCreate}
          newLabel="Assign Shift"
          stats={heroStats}
          {...sections.panel('hero')}
          actions={<MasterCollapseButton collapse={sections} />}
        />

        {/* ── Breakdown + Roster ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <GlassPanel icon={Layers} title="Shift Patterns" contentClassName="p-4 grid grid-cols-2 gap-3" {...sections.panel('shiftPatterns')}>
            {breakdown.map(({ type, count, percentage }) => {
              const p        = SHIFT_PATTERNS[type];
              const isActive = filterType === type;
              const Icon     = p.icon;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setFilterType(isActive ? 'all' : type)}
                  className={`group relative rounded-xl text-left transition-all hover:-translate-y-0.5 hover:shadow-lg border p-4 cursor-pointer ${
                    isActive ? 'border-white/30 bg-white/[0.12]' : 'border-white/10 hover:border-white/20 bg-white/[0.06] hover:bg-white/[0.10]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Icon className={`h-4 w-4 ${p.iconClass}`} />
                    <span className="text-xs font-bold text-white">{count}</span>
                  </div>
                  <div className="text-xs font-semibold text-white/80 mb-0.5">{p.label}</div>
                  <div className="mt-2 h-1 rounded-full bg-white/10 overflow-hidden">
                    <ShiftBar pct={percentage} color={p.fillColor} opacity={0.7} />
                  </div>
                </button>
              );
            })}
          </GlassPanel>

          <GlassPanel icon={Users} title="Roster" count={`${assignments.length} assigned`} contentClassName="" {...sections.panel('roster')}>
            <ScrollArea className="h-[220px]">
              <div className="space-y-1 p-4">
                {assignments.length === 0 ? (
                  <p className="py-8 text-center text-white/30 text-sm">No assignments yet</p>
                ) : assignments.slice(0, 20).map(a => {
                  const s = todayStatus(a);
                  const c = STATUS_COLORS[s];
                  return (
                    <div key={a.id}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/[0.07] cursor-pointer transition-all"
                      onClick={() => openView(a)}>
                      <AvatarInitials name={a.employee_name} size="sm" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-white truncate">{a.employee_name}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full border shrink-0 ${c.bg} ${c.border} ${c.text}`}>{c.label}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                          <ShiftBar pct={cycleProgress(a)} color={SHIFT_PATTERNS[a.shift_type].fillColor} opacity={0.6} />
                        </div>
                      </div>
                      <ShiftTypeBadge type={a.shift_type} />
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </GlassPanel>
        </div>

        {/* ── Filters ── */}
        <GlassPanel
          icon={Layers}
          title="Filters"
          {...sections.panel('filters')}
          badge={hasFilters() && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#86BBD8]/20 border border-[#86BBD8]/30 text-[#86BBD8]">Active</span>
          )}
          actions={hasFilters() && (
            <button type="button" onClick={clearFilters} className="text-xs text-white/40 hover:text-white/70 flex items-center gap-1 transition-colors">
              <X className="h-3 w-3" /> Clear
            </button>
          )}
          contentClassName="px-5 py-4 space-y-3"
        >
          <div>
            <div className={LBL}>Pattern</div>
            <FilterChips options={typeOptions} value={filterType} onChange={v => setFilterType(v as ShiftType | 'all')} />
          </div>
          <div>
            <div className={LBL}>Today&apos;s Status</div>
            <FilterChips options={statusOptions} value={filterStatus} onChange={v => setFilterStatus(v as DayStatus | 'all')} />
          </div>
        </GlassPanel>

        {/* ── Records ── */}
        <div className="oz-glass-panel rounded-2xl overflow-hidden">
          <RecordsPanelHeader
            icon={Calendar}
            title="Records"
            count={filtered.length}
            total={assignments.length}
            search={search}
            onSearch={setSearch}
            searchPlaceholder="Search employees…"
            sortValue={sortKey}
            sortOptions={SORT_OPTIONS}
            onSort={v => setSortKey(v as SortKey)}
            viewMode={headerViewMode}
            onViewMode={handleHeaderViewMode}
            show={showRecords}
            onToggle={() => setShowRecords(v => !v)}
            actions={
              <button
                type="button"
                title="Schedule view — see everyone's shifts for the next 4 weeks"
                onClick={() => setViewMode(v => v === 'schedule' ? 'grid' : 'schedule')}
                className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border transition-all ${
                  viewMode === 'schedule'
                    ? 'bg-[#2A4D69] border-[#86BBD8]/35 text-white font-semibold'
                    : 'bg-white/[0.05] border-white/10 text-white/50 hover:bg-white/[0.10] hover:text-white/80'
                }`}
              >
                <Calendar className="w-3 h-3" />
                Schedule
              </button>
            }
          />

          {showRecords && (
            loading ? (
              <div className="p-4">
                <LoadingPane message="Loading shifts…" />
              </div>
            ) : filtered.length === 0 && viewMode !== 'schedule' ? (
              <div className="p-4">
                <EmptyState
                  icon={Clock}
                  title="No shift assignments found"
                  action={hasFilters()
                    ? { label: 'Clear filters', onClick: clearFilters }
                    : { label: 'Assign first shift', onClick: openCreate }
                  }
                />
              </div>
            ) : viewMode === 'schedule' ? (
              <ScheduleView assignments={filtered} leaves={leaves} onView={openView} onUpdateOverrides={handleUpdateOverrides} />
            ) : viewMode === 'grid' ? (
              <div className="p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filtered.map(a => (
                    <ShiftCard key={a.id} assignment={a} onView={openView} onEdit={openEdit} onDelete={openDelete} />
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-4">
                <div className="rounded-xl overflow-hidden border border-white/[0.07]">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/[0.07] hover:bg-transparent">
                        <TableHead className="text-white/55 bg-white/[0.05] text-xs">Employee</TableHead>
                        <TableHead className="text-white/55 bg-white/[0.05] text-xs">Pattern</TableHead>
                        <TableHead className="text-white/55 bg-white/[0.05] text-xs">Today</TableHead>
                        <TableHead className="text-white/55 bg-white/[0.05] text-xs">Cycle Start</TableHead>
                        <TableHead className="text-white/55 bg-white/[0.05] text-xs">Department</TableHead>
                        <TableHead className="text-white/55 bg-white/[0.05] text-xs w-12" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map(a => (
                        <TableRow key={a.id} className="cursor-pointer border-white/[0.06] hover:bg-white/[0.06] transition-colors" onClick={() => openView(a)}>
                          <TableCell>
                            <div className="flex items-center gap-2.5">
                              <AvatarInitials name={a.employee_name} size="xs" />
                              <div>
                                <div className="text-sm font-medium text-white">{a.employee_name}</div>
                                <div className="text-xs text-white/40">{a.employee_id}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell><ShiftTypeBadge type={a.shift_type} /></TableCell>
                          <TableCell><StatusBadge status={todayStatus(a)} /></TableCell>
                          <TableCell className="text-sm text-white/60">{fmtDate(a.cycle_start_date)}</TableCell>
                          <TableCell className="text-sm text-white/60">{a.department || '—'}</TableCell>
                          <TableCell onClick={e => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button type="button" aria-label="More options" className="h-7 w-7 flex items-center justify-center rounded-lg text-white/30 hover:text-white/70 hover:bg-white/[0.10] transition-all">
                                  <MoreVertical className="h-3.5 w-3.5" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-[rgba(5,15,28,0.95)] border-white/[0.15]">
                                <DropdownMenuItem className="text-white/75 focus:bg-white/[0.10] focus:text-white cursor-pointer gap-2" onClick={() => openView(a)}>
                                  <Eye className="h-3.5 w-3.5" /> View
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-white/75 focus:bg-white/[0.10] focus:text-white cursor-pointer gap-2" onClick={() => openEdit(a)}>
                                  <Pencil className="h-3.5 w-3.5" /> Edit
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-white/[0.08]" />
                                <DropdownMenuItem className="text-red-400 focus:bg-red-500/10 focus:text-red-300 cursor-pointer gap-2" onClick={() => openDelete(a)}>
                                  <Trash2 className="h-3.5 w-3.5" /> Remove
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )
          )}
        </div>
      </div>

      {/* ── Dialogs ── */}
      <ShiftAssignForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        editing={editing}
        employees={employees}
        onSaved={fetchAll}
      />

      <ShiftDetailModal
        assignment={viewTarget}
        open={!!viewTarget}
        onClose={() => setViewTarget(null)}
        onEdit={a => { setViewTarget(null); openEdit(a); }}
        onDelete={a => { setViewTarget(null); openDelete(a); }}
      />

      <DeleteDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Remove Assignment"
        description={`Remove shift assignment for ${deleteTarget?.employee_name ?? ''}? This cannot be undone.`}
        confirmLabel="Remove"
        onDelete={async () => {
          const res = await fetch(`${STANDBY_API}/${deleteTarget!.id}`, { method: 'DELETE' });
          if (!res.ok) throw new Error(await res.text());
          toast.success('Assignment removed');
          fetchAll();
        }}
      />
    </div>
    </PageShell>
  );
}
