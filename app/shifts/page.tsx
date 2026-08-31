'use client';

import { useState, useEffect, useMemo, useCallback, ElementType } from 'react';
import {
  Clock, Eye, Pencil, Trash2, Users, User, Calendar, Activity, Shield,
  Layers, ChevronsUpDown, Check, X, AlertCircle, TrendingUp,
  MoreVertical, ChevronLeft, ChevronRight,
  Sun, Sunrise, Sunset, Moon, Settings2,
  Umbrella, Stethoscope, Star, Landmark, Zap,
  RotateCcw, Timer, BookOpen, AlarmClock, SlidersHorizontal,
  Flag, RefreshCw, Plus, LayoutGrid, List,
} from '@/components/shared/theme';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { toast } from 'sonner';
import { AppShell } from '@/components/app-shell';
import { formatDate } from '@/lib/format';
import {
  useTheme, STATUS_TONE, PageHero, StatTile, StatusBadge as ThemeStatusBadge, SearchInput, ProgressBar, FormField,
  useCollapseSection, CenterModal, ACCENT_HEX, EmptyState, PrimaryButton, GlowCard, SelectField, accentText, TYPE_WEIGHT,
} from '@/components/shared/theme';
import { DownloadButton, type DLColumn } from '@/components/shared/DownloadButton';
import { exportFilename } from '@/lib/exportUtils';
import type {
  DayOverride, DayStatus, Employee, EventForm, EventType, FormState, LeaveRecord,
  ScheduleEvent, ShiftAssignment, ShiftTimingPeriod, ShiftType, SortKey, StandbyPeriod, ViewMode,
} from './types';
import { createAssignment, deleteAssignment, updateAssignment, useShiftsData } from './useShiftsData';
import {
  buildHolidayMap, computeDayStatus, cycleProgress, d2s, daysUntilNextOn, findEvent, stripTime, todayStatus,
} from './calcShifts';

// ─── Constants ────────────────────────────────────────────────────────────────


const SHIFT_PATTERNS: Record<ShiftType, { label: string; color: string; icon: ElementType; on: number; off: number }> = {
  '10-4': { label: '10-4 Cycle', color: '#86BBD8', icon: Clock, on: 10, off: 4 },
  '5-2': { label: '5-2 Cycle', color: '#78C0A6', icon: Activity, on: 5, off: 2 },
  'standby': { label: 'Standby', color: '#F5A623', icon: Shield, on: 0, off: 0 },
  'custom': { label: 'Custom', color: '#9B87B5', icon: Layers, on: 0, off: 0 },
};

// SHIFT_PATTERNS[assignment.shift_type] was being read unguarded at 6+ call sites
// below — an unrecognized shift_type (legacy/malformed data) crashed the whole
// page with "Cannot read properties of undefined" (found live, 2026-08-29 UI
// audit, audit/07-ui-polish-findings.md — same bug class as overtime.tsx's
// TypeBadge). One shared lookup instead of patching each site separately.
function getShiftPattern(type: ShiftType) {
  return SHIFT_PATTERNS[type] ?? SHIFT_PATTERNS['10-4'];
}

// Harmonized onto STATUS_TONE (2026-08-29 palette consolidation) except the compound
// 'on+standby' state, which keeps its own established secondary-brand blue (#86BBD8,
// also used by ppe's 'good' condition and ApprovalGate's "sign" variant) since it's
// genuinely a distinct third state, not "on" or "standby" alone.
const STATUS_COLORS: Record<DayStatus, { hex: string; label: string }> = {
  on: { hex: STATUS_TONE.good, label: 'On Duty' },
  off: { hex: STATUS_TONE.neutral, label: 'Off Duty' },
  standby: { hex: STATUS_TONE.warning, label: 'Standby' },
  'on+standby': { hex: '#86BBD8', label: 'On + Standby' },
};

const _T = { color: '#86BBD8' };
const SHIFT_TIMING_PRESETS: Record<string, { label: string; abbr: string; hours: string; color: string; icon: ElementType }> = {
  day: { ..._T, label: 'Day Shift', abbr: 'D', hours: '07:00–17:00', icon: Sun },
  morning: { ..._T, label: 'Morning Shift', abbr: 'AM', hours: '06:00–14:00', icon: Sunrise },
  afternoon: { ..._T, label: 'Afternoon Shift', abbr: 'PM', hours: '14:00–22:00', icon: Sunset },
  night: { ..._T, label: 'Night Shift', abbr: 'N', hours: '22:00–06:00', icon: Moon },
  custom: { ..._T, label: 'Custom', abbr: 'CX', hours: '', icon: Settings2 },
};

const _Ab = '#94a3b8', _Wk = '#34d399', _Am = '#fbbf24', _Ro = '#fb7185', _In = '#86BBD8';

const EVENT_TYPES: Record<EventType, { label: string; abbr: string; color: string; defaultStatus: DayStatus | null; showTiming: boolean; icon: ElementType }> = {
  annual_leave: { label: 'Annual Leave', abbr: 'AL', color: _Ab, defaultStatus: 'off', showTiming: false, icon: Umbrella },
  sick_leave: { label: 'Sick Leave', abbr: 'SL', color: _Ab, defaultStatus: 'off', showTiming: false, icon: Stethoscope },
  special_leave: { label: 'Special Leave', abbr: 'SPL', color: _Ab, defaultStatus: 'off', showTiming: false, icon: Star },
  public_holiday: { label: 'Public Holiday', abbr: 'PH', color: _Ro, defaultStatus: 'off', showTiming: false, icon: Landmark },
  work_off_day: { label: 'Working on Off Day', abbr: 'W+', color: _Wk, defaultStatus: 'on', showTiming: true, icon: Zap },
  defer_off: { label: 'Deferred Day Off', abbr: 'DEF', color: _Am, defaultStatus: 'on', showTiming: true, icon: RotateCcw },
  overtime: { label: 'Overtime', abbr: 'OT', color: _Wk, defaultStatus: 'on', showTiming: true, icon: Timer },
  training: { label: 'Training / Course', abbr: 'TR', color: _In, defaultStatus: null, showTiming: false, icon: BookOpen },
  timing: { label: 'Timing Change', abbr: 'TC', color: _In, defaultStatus: null, showTiming: true, icon: AlarmClock },
  custom: { label: 'Custom Override', abbr: 'CX', color: _Ab, defaultStatus: null, showTiming: true, icon: SlidersHorizontal },
};

function newEventId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `ev_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

const SORT_OPTIONS = [
  { value: 'created_at', label: 'Newest' }, { value: 'name', label: 'Name A-Z' },
  { value: 'shift_type', label: 'Pattern' }, { value: 'cycle_start_date', label: 'Start Date' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const LEAVE_TYPE_MAP: Record<string, EventType> = { 'annual leave': 'annual_leave', 'sick leave': 'sick_leave', 'special leave': 'special_leave', 'public holiday': 'public_holiday', 'annual': 'annual_leave', 'sick': 'sick_leave' };
function leaveToEventType(leaveType: string): EventType { return LEAVE_TYPE_MAP[leaveType.toLowerCase()] ?? 'custom'; }

function findLeaveForDay(leaves: LeaveRecord[], employeeId: string, employeeName: string, ds: string): LeaveRecord | undefined {
  const norm = (s: string) => s.toLowerCase().trim();
  return leaves.find(lv => (lv.employee_id === employeeId || norm(lv.employee_name) === norm(employeeName)) && ds >= lv.start_date && ds <= lv.end_date && lv.status !== 'rejected');
}

// easterSunday/zwHolidays/buildHolidayMap, and the day-status/cycle-progress
// calculations below, now live in ./calcShifts (imported above) — extracted per the
// "extract + test business logic" standard, and the holiday calc now reuses the
// already-tested lib/zimHolidays.ts instead of a second, buggier local copy (was
// hardcoding Heroes'/Defence Forces Day as Aug 11/12 every year, wrong in most years,
// and missing Feb 21 entirely — see calcShifts.ts's header comment).

function getDayTiming(a: ShiftAssignment, ds: string) {
  const block = (a.shift_timing_periods || []).find(p => ds >= p.from && ds <= p.to);
  if (block) return block.label ? (SHIFT_TIMING_PRESETS[block.label] ?? null) : null;
  return a.shift_label ? (SHIFT_TIMING_PRESETS[a.shift_label] ?? null) : null;
}

function getDayCellInfo(a: ShiftAssignment, ds: string): { timing: typeof SHIFT_TIMING_PRESETS[string] | null; hours: string; event: ScheduleEvent | undefined } {
  const ev = findEvent(a, ds);
  if (ev && (ev.label || ev.start_time)) {
    const timing = ev.label ? (SHIFT_TIMING_PRESETS[ev.label] ?? null) : null;
    const hours = ev.start_time && ev.end_time ? `${ev.start_time}–${ev.end_time}` : (timing?.hours || '');
    return { timing, hours, event: ev };
  }
  const block = (a.shift_timing_periods || []).find(p => ds >= p.from && ds <= p.to);
  if (block) {
    const timing = block.label ? (SHIFT_TIMING_PRESETS[block.label] ?? null) : null;
    const hours = block.start_time && block.end_time ? `${block.start_time}–${block.end_time}` : (timing?.hours || '');
    return { timing, hours, event: ev };
  }
  const timing = a.shift_label ? (SHIFT_TIMING_PRESETS[a.shift_label] ?? null) : null;
  const hours = a.shift_hours || timing?.hours || '';
  return { timing, hours, event: ev };
}

const fmtDate = (s?: string): string => (s ? formatDate(s) : '');

const WD = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

// ─── Small shared-shape components ────────────────────────────────────────────

// Person identity marker — a bare accent person icon (app-wide convention;
// replaced the old initials-in-a-circle avatar). `name` kept for call compatibility.
function Avatar({ size = 'sm' }: { name?: string; size?: 'xs' | 'sm' | 'md' | 'lg' }) {
  const dims = { xs: 'h-4 w-4', sm: 'h-5 w-5', md: 'h-5 w-5', lg: 'h-7 w-7' }[size];
  return <User className={`${dims} text-brand-400 shrink-0`} />;
}

function DayStatusBadge({ status }: { status: DayStatus }) {
  const c = STATUS_COLORS[status];
  return <ThemeStatusBadge color={c.hex} label={c.label} />;
}

function ShiftTypeBadge({ type }: { type: ShiftType }) {
  const p = getShiftPattern(type);
  return <ThemeStatusBadge color={p.color} label={p.label} />;
}

function InfoField({ label, value }: { label: string; value?: string | number | null }) {
  const t = useTheme();
  return <div><div className={`text-[10px] uppercase tracking-wide mb-0.5 ${t.textFaint}`}>{label}</div><div className={`text-sm ${t.textMuted}`}>{value || '—'}</div></div>;
}

// ─── ScheduleEventModal ───────────────────────────────────────────────────────

function emptyForm(prefill: string, et: EventType): EventForm { return { id: newEventId(), from: prefill, to: prefill, type: et, status: '', label: '', start_time: '', end_time: '', note: '' }; }

function ScheduleEventModal({ assignment, prefillDate, onSave, onClose, saving }: {
  assignment: ShiftAssignment; prefillDate: string; onSave: (events: ScheduleEvent[]) => void; onClose: () => void; saving: boolean;
}) {
  const t = useTheme();
  const allEvents = (assignment.day_overrides || []) as ScheduleEvent[];
  const evOnDate = findEvent(assignment, prefillDate);

  const [form, setForm] = useState<EventForm>(
    evOnDate
      ? { id: evOnDate.id, from: evOnDate.from, to: evOnDate.to || evOnDate.from, type: evOnDate.type as EventType, status: evOnDate.status || '', label: evOnDate.label || '', start_time: evOnDate.start_time || '', end_time: evOnDate.end_time || '', note: evOnDate.note || '' }
      : emptyForm(prefillDate, 'annual_leave')
  );

  const et = EVENT_TYPES[form.type];
  const isEditing = allEvents.some(e => e.id === form.id);
  const showTiming = et.showTiming;
  const isCustom = form.type === 'custom';

  function sf<K extends keyof EventForm>(k: K) { return (v: EventForm[K]) => setForm(p => ({ ...p, [k]: v })); }
  function applyTimingPreset(key: string) { const tp = SHIFT_TIMING_PRESETS[key]; const [s, e] = tp.hours.split('–'); setForm(p => ({ ...p, label: key, start_time: s || '', end_time: e || '' })); }
  function loadEvent(ev: ScheduleEvent) { setForm({ id: ev.id, from: ev.from, to: ev.to || ev.from, type: ev.type as EventType, status: ev.status || '', label: ev.label || '', start_time: ev.start_time || '', end_time: ev.end_time || '', note: ev.note || '' }); }

  function handleSave() {
    if (!form.from) return;
    const event: ScheduleEvent = {
      id: form.id, from: form.from, to: form.to || form.from, type: form.type,
      ...(isCustom && form.status ? { status: form.status as DayStatus } : {}),
      ...(form.label ? { label: form.label } : {}), ...(form.start_time ? { start_time: form.start_time } : {}),
      ...(form.end_time ? { end_time: form.end_time } : {}), ...(form.note ? { note: form.note } : {}),
    };
    const updated = isEditing ? allEvents.map(e => e.id === form.id ? event : e) : [...allEvents, event];
    onSave(updated);
  }
  function deleteEvent(id: string) { onSave(allEvents.filter(e => e.id !== id)); }

  const cycleStatus = computeDayStatus(assignment, new Date(prefillDate + 'T12:00:00'));
  const { hours: cycleHours } = getDayCellInfo(assignment, prefillDate);
  const inputCls = `w-full rounded-lg px-3 py-1.5 text-sm outline-none transition-colors ${t.inputBg}`;

  return (
    <CenterModal open onClose={onClose} title="Schedule Event" subtitle={`${assignment.employee_name} · Cycle: ${STATUS_COLORS[cycleStatus].label}${cycleHours ? ` · ${cycleHours}` : ''}`} accent="violet" width="max-w-lg">
      <div className="px-5 py-4 space-y-4">
        <div>
          <div className={`text-xs ${TYPE_WEIGHT.medium} mb-1.5 ${t.textFaint}`}>Event Type</div>
          <div className="grid grid-cols-2 gap-1.5">
            {(Object.entries(EVENT_TYPES) as [EventType, typeof EVENT_TYPES[EventType]][]).map(([key, ty]) => {
              const TileIcon = ty.icon;
              const active = form.type === key;
              return (
                <button key={key} type="button" onClick={() => setForm(p => ({ ...p, type: key, status: '', ...(ty.showTiming ? {} : { label: '', start_time: '', end_time: '' }) }))}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left transition-all ${active ? '' : `${t.chipBg} border-transparent ${t.hoverBg}`}`}
                  style={active ? { backgroundColor: `${ty.color}18`, borderColor: `${ty.color}55` } : undefined}>
                  <div className={`p-1.5 rounded-lg shrink-0 ${active ? '' : t.chipBg}`} style={active ? { backgroundColor: `${ty.color}22` } : undefined}>
                    <TileIcon className="h-3.5 w-3.5" style={{ color: active ? ty.color : undefined }} />
                  </div>
                  <div className="min-w-0">
                    <div className={`text-[10px] ${TYPE_WEIGHT.bold} tracking-wide`} style={{ color: active ? ty.color : undefined }}>{ty.abbr}</div>
                    <div className={`text-[11px] leading-tight truncate ${t.textFaint}`}>{ty.label}</div>
                  </div>
                  {active && <Check className="h-3.5 w-3.5 ml-auto shrink-0" style={{ color: ty.color }} />}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="From Date"><input type="date" aria-label="Event from date" className={inputCls} value={form.from} onChange={e => setForm(p => ({ ...p, from: e.target.value, to: p.to < e.target.value ? e.target.value : p.to }))} /></FormField>
          <FormField label="To Date">
            <input type="date" aria-label="Event to date" className={inputCls} value={form.to} onChange={e => setForm(p => ({ ...p, to: e.target.value }))} />
            <p className={`text-[10px] mt-0.5 ${t.textFaint}`}>Leave same as From for single day</p>
          </FormField>
        </div>

        {showTiming && (
          <div className="rounded-xl p-3 space-y-2" style={{ backgroundColor: `${et.color}10`, border: `1px solid ${et.color}30` }}>
            <div className={`text-[10px] ${TYPE_WEIGHT.semibold} uppercase tracking-wider`} style={{ color: et.color }}>Timing</div>
            <div className="flex gap-1.5 flex-wrap">
              <button type="button" onClick={() => setForm(p => ({ ...p, label: '', start_time: '', end_time: '' }))} className={`text-xs px-2.5 py-1 rounded-md transition-all ${!form.label ? `${t.chipBg} ${t.textPrimary}` : `${t.textFaint} ${t.hoverBg}`}`}>Default</button>
              {(['day', 'morning', 'afternoon', 'night'] as const).map(key => {
                const tp = SHIFT_TIMING_PRESETS[key];
                const active = form.label === key;
                return <button key={key} type="button" onClick={() => applyTimingPreset(key)} className="text-xs px-2.5 py-1 rounded-md transition-all" style={active ? { backgroundColor: `${tp.color}22`, color: tp.color } : undefined}>{tp.abbr}</button>;
              })}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <FormField label="Start time"><input type="time" aria-label="Start time" className={inputCls} value={form.start_time} onChange={e => sf('start_time')(e.target.value)} /></FormField>
              <FormField label="End time"><input type="time" aria-label="End time" className={inputCls} value={form.end_time} onChange={e => sf('end_time')(e.target.value)} /></FormField>
            </div>
          </div>
        )}

        {isCustom && (
          <div>
            <div className={`text-xs ${TYPE_WEIGHT.medium} mb-1.5 ${t.textFaint}`}>Status Override</div>
            <div className="grid grid-cols-2 gap-1.5">
              <button type="button" onClick={() => sf('status')('')} className={`text-xs px-2 py-2 rounded-lg transition-all ${form.status === '' ? `${t.chipBg} ${t.textPrimary}` : `${t.textFaint} ${t.hoverBg}`}`}>Use cycle default</button>
              {(['on', 'off', 'standby', 'on+standby'] as const).map(s => (
                <button key={s} type="button" onClick={() => sf('status')(s)} className="text-xs px-2 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5" style={form.status === s ? { backgroundColor: `${STATUS_COLORS[s].hex}22`, color: STATUS_COLORS[s].hex } : undefined}>
                  {s === 'on+standby' && <Shield className="h-3 w-3" />}{STATUS_COLORS[s].label}
                </button>
              ))}
            </div>
          </div>
        )}

        <FormField label="Note / Reason"><input aria-label="Note / Reason" className={inputCls} value={form.note} onChange={e => sf('note')(e.target.value)} placeholder="e.g. Family vacation, covering for colleague…" /></FormField>

        {allEvents.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className={`text-xs ${TYPE_WEIGHT.medium} ${t.textFaint}`}>All events for {assignment.employee_name.split(' ')[0]} ({allEvents.length})</div>
              <button type="button" onClick={() => setForm(emptyForm(prefillDate, 'annual_leave'))} className="text-xs text-brand-400/70 hover:text-brand-400 transition-colors">+ New</button>
            </div>
            <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
              {allEvents.map(ev => {
                const ty = EVENT_TYPES[ev.type as EventType] ?? EVENT_TYPES.custom;
                const EvIcon = ty.icon;
                const active = ev.id === form.id;
                return (
                  <div key={ev.id} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-all ${active ? '' : `${t.chipBg} ${t.hoverBg}`}`} style={active ? { backgroundColor: `${ty.color}18`, border: `1px solid ${ty.color}40` } : undefined}>
                    <EvIcon className="h-3.5 w-3.5 shrink-0" style={{ color: active ? ty.color : undefined }} />
                    <div className="flex-1 min-w-0">
                      <div className={`${TYPE_WEIGHT.semibold} leading-tight`} style={{ color: active ? ty.color : undefined }}>{ty.label}</div>
                      <div className={`text-[10px] ${t.textFaint}`}>{fmtDate(ev.from)}{ev.to && ev.to !== ev.from ? ` → ${fmtDate(ev.to)}` : ''}{ev.note ? ` · ${ev.note}` : ''}</div>
                    </div>
                    <button type="button" aria-label="Edit event" onClick={() => loadEvent(ev)} className="shrink-0 text-brand-400/40 hover:text-brand-400 transition-colors"><Pencil className="h-3 w-3" /></button>
                    <button type="button" aria-label="Delete event" onClick={() => deleteEvent(ev.id)} className="shrink-0 text-red-400/40 hover:text-red-400 transition-colors"><X className="h-3 w-3" /></button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className={`flex gap-2 px-5 pb-5 border-t ${t.border} pt-4`}>
        <button type="button" onClick={onClose} className={`flex-1 px-4 py-2.5 rounded-xl text-sm ${t.textMuted} border ${t.border} ${t.hoverBg} transition-all`}>Cancel</button>
        <PrimaryButton size="md" fullWidth disabled={!form.from} submitting={saving} onClick={handleSave}>{isEditing ? 'Update Event' : 'Add Event'}</PrimaryButton>
      </div>
    </CenterModal>
  );
}

// ─── ScheduleView ─────────────────────────────────────────────────────────────

function ScheduleView({ assignments, leaves, onView, onUpdateOverrides }: {
  assignments: ShiftAssignment[]; leaves: LeaveRecord[]; onView: (a: ShiftAssignment) => void; onUpdateOverrides: (id: number, overrides: DayOverride[]) => Promise<void>;
}) {
  const t = useTheme();
  const [offset, setOffset] = useState(0);
  const [eventModal, setEventModal] = useState<{ assignment: ShiftAssignment; prefillDate: string } | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSaveEvents(events: ScheduleEvent[]) {
    if (!eventModal) return;
    setSaving(true);
    try { await onUpdateOverrides(eventModal.assignment.id, events); setEventModal(null); }
    catch (err) { toast.error(String(err)); }
    finally { setSaving(false); }
  }

  const today = stripTime(new Date());
  const todayStr = d2s(today);
  const startDay = new Date(today);
  startDay.setDate(startDay.getDate() + offset * 7);
  const days = Array.from({ length: 28 }, (_, i) => { const d = new Date(startDay); d.setDate(d.getDate() + i); return d; });

  const monthSpans: { label: string; count: number }[] = [];
  days.forEach(d => {
    const label = d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
    if (!monthSpans.length || monthSpans[monthSpans.length - 1].label !== label) monthSpans.push({ label, count: 1 });
    else monthSpans[monthSpans.length - 1].count++;
  });

  const rangeLabel = `${startDay.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} — ${days[27].toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const holidays = useMemo(() => buildHolidayMap(days), [offset]);

  const COL = 76;
  const NAME = 200;
  const stickyBg = t.light ? 'bg-white' : 'bg-[#040c18]';

  return (
    <div>
      <div className={`flex items-center justify-between px-4 py-2.5 border-b ${t.border}`}>
        <div className="flex items-center gap-2">
          <button type="button" aria-label="Previous 4 weeks" onClick={() => setOffset(o => o - 1)} className={`h-7 w-7 flex items-center justify-center rounded-lg ${t.chipBg} ${t.hoverBg} ${t.textFaint} transition-all`}><ChevronLeft className="w-4 h-4" /></button>
          <span className={`text-sm ${TYPE_WEIGHT.medium} min-w-[220px] text-center ${t.textMuted}`}>{rangeLabel}</span>
          <button type="button" aria-label="Next 4 weeks" onClick={() => setOffset(o => o + 1)} className={`h-7 w-7 flex items-center justify-center rounded-lg ${t.chipBg} ${t.hoverBg} ${t.textFaint} transition-all`}><ChevronRight className="w-4 h-4" /></button>
        </div>
        {offset !== 0 && <button type="button" onClick={() => setOffset(0)} className={`text-xs px-2.5 py-1 rounded-lg ${t.chipBg} ${t.hoverBg} ${t.textFaint} transition-all`}>Today</button>}
      </div>

      <div className="overflow-x-auto">
        <div style={{ minWidth: `${NAME + days.length * COL}px` }}>
          <div className={`flex border-b ${t.border}`}>
            <div style={{ width: NAME }} className="shrink-0" />
            {monthSpans.map((m, i) => <div key={i} style={{ width: m.count * COL }} className={`text-center text-[10px] py-1 ${TYPE_WEIGHT.medium} uppercase tracking-wider ${t.textFaint}`}>{m.label}</div>)}
          </div>

          <div className={`flex border-b ${t.border}`}>
            <div style={{ width: NAME }} className={`shrink-0 px-3 py-1.5 text-[10px] uppercase tracking-wider ${TYPE_WEIGHT.semibold} ${t.textFaint}`}>Employee</div>
            {days.map(d => {
              const ds = d2s(d);
              const isToday = ds === todayStr;
              const isWknd = d.getDay() === 0 || d.getDay() === 6;
              const holiday = holidays.get(ds);
              return (
                <div key={ds} title={holiday ?? undefined}
                  className={`flex flex-col items-center py-1 border-b-2 ${isWknd && !holiday ? 'opacity-40' : ''} ${isToday ? 'bg-brand-500/[0.08]' : holiday ? 'bg-pink-500/[0.10]' : ''}`}
                  style={{ width: COL, borderBottomColor: holiday ? 'rgba(244,114,182,0.4)' : 'transparent' }}>
                  {holiday && <span className={`text-[7px] text-pink-400 ${TYPE_WEIGHT.bold} leading-none uppercase tracking-tight truncate w-full text-center px-0.5`}>{holiday.replace(/[''']/g, '').slice(0, 6)}</span>}
                  <span className={`text-[9px] ${holiday ? 'text-pink-400/70' : t.textFaint}`}>{WD[d.getDay()]}</span>
                  <span className={`text-xs ${TYPE_WEIGHT.bold} ${isToday ? 'text-brand-400' : holiday ? 'text-pink-400' : t.textFaint}`}>{d.getDate()}</span>
                  {holiday && <Flag className="h-2.5 w-2.5 text-pink-400/80" />}
                </div>
              );
            })}
          </div>

          {assignments.length === 0 ? (
            <div className={`py-14 text-center text-sm ${t.textFaint}`}>No shift assignments to display</div>
          ) : assignments.map((a, rowIdx) => (
            <div key={a.id} className={`flex border-b ${t.border} transition-colors ${t.hoverBgSoft} ${rowIdx % 2 !== 0 ? t.chipBg : ''}`}>
              <div style={{ width: NAME }} className={`shrink-0 py-1.5 px-3 sticky left-0 z-10 border-r ${t.border} ${stickyBg}`}>
                <div className="flex items-center gap-2">
                  <Avatar name={a.employee_name} size="xs" />
                  <div className="min-w-0">
                    <button type="button" onClick={() => onView(a)} className={`text-xs ${TYPE_WEIGHT.medium} truncate max-w-[130px] block text-left transition-colors ${t.textMuted} ${t.hoverText}`}>{a.employee_name}</button>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="inline-block w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: getShiftPattern(a.shift_type).color }} />
                      <span className={`text-[9px] ${t.textFaint}`}>{getShiftPattern(a.shift_type).label}</span>
                    </div>
                    {(() => {
                      const tm = getDayTiming(a, todayStr);
                      const hrs = tm?.hours || a.shift_hours;
                      return hrs ? <div className={`text-[9px] mt-0.5 ${TYPE_WEIGHT.medium} opacity-75`} style={{ color: tm?.color }}>{hrs}</div> : null;
                    })()}
                  </div>
                </div>
              </div>

              {days.map(d => {
                const ds = d2s(d);
                const status = computeDayStatus(a, d);
                const isToday = ds === todayStr;
                const isWknd = d.getDay() === 0 || d.getDay() === 6;
                const { timing, hours, event } = getDayCellInfo(a, ds);
                const leave = !event ? findLeaveForDay(leaves, a.employee_id, a.employee_name, ds) : undefined;
                const isPending = leave?.status === 'pending';
                const holiday = !event && !leave ? holidays.get(ds) : undefined;
                const isHoliday = !!holiday;
                const isOn = status === 'on' || status === 'on+standby';
                const isSby = status === 'standby' || status === 'on+standby';
                const et = event ? (EVENT_TYPES[event.type as EventType] ?? EVENT_TYPES.custom) : leave ? EVENT_TYPES[leaveToEventType(leave.leave_type)] : null;

                const cellColor = et ? et.color : isHoliday ? '#f472b6' : isOn ? (timing?.color ?? '#34d399') : isSby ? '#fbbf24' : null;
                const cellStyle = cellColor ? { backgroundColor: `${cellColor}18`, borderColor: `${cellColor}40`, color: cellColor } : undefined;

                return (
                  <div key={ds} style={{ width: COL }} className={`flex items-stretch py-1 px-1 ${isToday ? 'bg-brand-500/[0.07]' : isHoliday ? 'bg-pink-500/[0.05]' : ''}`}>
                    <button type="button"
                      title={event ? `${et?.label ?? 'Event'}: ${event.from}${event.to !== event.from ? ` → ${event.to}` : ''}${event.note ? ` · ${event.note}` : ''}`
                        : leave ? `${et?.label ?? 'Leave'} (${leave.status}) · ${leave.start_date} → ${leave.end_date}${leave.reason ? ` · ${leave.reason}` : ''}`
                        : isHoliday ? `Public Holiday: ${holiday}` : `Click to add event for ${ds}`}
                      onClick={() => setEventModal({ assignment: a, prefillDate: ds })}
                      style={cellStyle}
                      className={`relative flex-1 rounded-md border flex flex-col items-center justify-center gap-0.5 py-1.5 px-0.5 min-h-[50px] transition-all cursor-pointer hover:brightness-110 ${cellColor ? '' : `border-transparent ${isWknd ? t.chipBg : ''} ${t.textFaint}`} ${isPending ? 'opacity-60 border-dashed' : ''}`}>
                      {et ? (() => {
                        const CellIcon = et.icon;
                        return (
                          <>
                            <CellIcon className="h-4 w-4" style={{ color: et.color }} />
                            <span className={`text-[10px] ${TYPE_WEIGHT.bold} leading-none tracking-wide`} style={{ color: et.color }}>{et.abbr}</span>
                            {leave && <span className={`absolute top-0.5 left-0.5 text-[7px] ${TYPE_WEIGHT.bold} opacity-60 leading-none ${t.textFaint}`}>L</span>}
                            {(event?.start_time && event?.end_time) && <span className="text-[7px] opacity-60 leading-none font-mono whitespace-nowrap">{event.start_time}–{event.end_time}</span>}
                          </>
                        );
                      })() : isHoliday ? (
                        <>
                          <Landmark className="h-4 w-4 text-pink-400" />
                          <span className={`text-[10px] ${TYPE_WEIGHT.bold} leading-none tracking-wide text-pink-400`}>PH</span>
                          <span className="text-[7px] leading-none text-center text-pink-400/70 px-0.5 truncate w-full">{holiday!.replace(/[''']/g, '').split(' ').slice(0, 2).join(' ')}</span>
                        </>
                      ) : isOn ? (() => {
                        const TimingIcon = timing?.icon;
                        return (
                          <>
                            {TimingIcon ? <TimingIcon className="h-4 w-4" style={{ color: timing!.color }} /> : isSby ? <Shield className="h-4 w-4 text-teal-400" /> : <div className="h-2.5 w-2.5 rounded-full bg-emerald-400/80 ring-2 ring-emerald-400/20" />}
                            <span className={`text-[10px] ${TYPE_WEIGHT.bold} leading-none tracking-wide`} style={{ color: timing?.color ?? (isSby ? '#2dd4bf' : '#34d399') }}>{timing?.abbr ?? (isSby ? 'SBY' : 'ON')}</span>
                            {hours && <span className="text-[7px] opacity-60 leading-none font-mono whitespace-nowrap">{hours}</span>}
                          </>
                        );
                      })() : isSby ? (
                        <>
                          <Shield className={`h-4 w-4 ${accentText('amber', t.light)}`} />
                          <span className={`text-[10px] ${TYPE_WEIGHT.bold} leading-none tracking-wide ${accentText('amber', t.light)}`}>SBY</span>
                          {hours && <span className="text-[7px] opacity-55 font-mono leading-none">{hours}</span>}
                        </>
                      ) : <span className="text-[10px] opacity-20 leading-none font-light">—</span>}
                    </button>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className={`flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 border-t ${t.border} text-[10px] ${t.textFaint}`}>
        <span className="flex items-center gap-1.5"><span className="w-7 h-7 rounded-lg bg-emerald-500/[0.22] inline-flex items-center justify-center"><div className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" /></span>On Duty</span>
        <span className="flex items-center gap-1.5"><span className="w-7 h-7 rounded-lg bg-teal-500/[0.22] inline-flex items-center justify-center"><Shield className="h-3.5 w-3.5 text-teal-400" /></span>On + Standby</span>
        <span className="flex items-center gap-1.5"><span className="w-7 h-7 rounded-lg bg-amber-500/[0.22] inline-flex items-center justify-center"><Shield className={`h-3.5 w-3.5 ${accentText('amber', t.light)}`} /></span>Standby</span>
        <span className="flex items-center gap-1.5"><span className={`w-7 h-7 rounded-lg border ${t.border} inline-flex items-center justify-center font-light text-sm`}>—</span>Off Duty</span>
        <span className={`w-px h-5 ${t.chipBg}`} />
        {Object.entries(SHIFT_TIMING_PRESETS).filter(([k]) => k !== 'custom').map(([key, ty]) => {
          const TIcon = ty.icon;
          return <span key={key} className="flex items-center gap-1.5"><span className="w-9 h-7 rounded-lg inline-flex flex-col items-center justify-center gap-0.5" style={{ backgroundColor: `${ty.color}18` }}><TIcon className="h-3 w-3" style={{ color: ty.color }} /><span className={`text-[7px] ${TYPE_WEIGHT.bold} leading-none font-mono`} style={{ color: ty.color }}>{ty.abbr}</span></span>{ty.label.replace(' Shift', '')}</span>;
        })}
        <span className={`w-px h-5 ${t.chipBg}`} />
        {(Object.entries(EVENT_TYPES) as [EventType, typeof EVENT_TYPES[EventType]][]).map(([key, ty]) => {
          const EIcon = ty.icon;
          return <span key={key} className="flex items-center gap-1.5"><span className="w-7 h-7 rounded-lg inline-flex items-center justify-center" style={{ backgroundColor: `${ty.color}18` }}><EIcon className="h-3.5 w-3.5" style={{ color: ty.color }} /></span><span>{ty.abbr} {ty.label}</span></span>;
        })}
        <span className={`w-px h-5 ${t.chipBg}`} />
        <span className="flex items-center gap-1.5"><span className="relative w-7 h-7 rounded-lg bg-emerald-500/[0.20] inline-flex items-center justify-center"><Umbrella className={`h-3.5 w-3.5 ${accentText('emerald', t.light)}`} /></span>Leave (synced)</span>
        <span className="flex items-center gap-1.5"><span className="w-7 h-7 rounded-lg bg-pink-500/[0.20] inline-flex items-center justify-center"><Landmark className="h-3.5 w-3.5 text-pink-400" /></span>Public Holiday</span>
        <span className="flex items-center gap-1.5 ml-auto"><span className="w-7 h-7 rounded-lg bg-brand-500/[0.10] inline-block" />Today</span>
      </div>

      {eventModal && <ScheduleEventModal assignment={eventModal.assignment} prefillDate={eventModal.prefillDate} onSave={handleSaveEvents} onClose={() => setEventModal(null)} saving={saving} />}
    </div>
  );
}

// ─── ShiftCard ────────────────────────────────────────────────────────────────

function ShiftCard({ assignment, onView, onEdit, onDelete }: { assignment: ShiftAssignment; onView: (a: ShiftAssignment) => void; onEdit: (a: ShiftAssignment) => void; onDelete: (a: ShiftAssignment) => void; }) {
  const t = useTheme();
  const status = todayStatus(assignment);
  const progress = cycleProgress(assignment);
  const pattern = getShiftPattern(assignment.shift_type);
  const nextOn = daysUntilNextOn(assignment);

  return (
    <GlowCard color={pattern.color} surface={`${t.glass} rounded-xl`} className="overflow-hidden cursor-pointer" onClick={() => onView(assignment)}>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <Avatar name={assignment.employee_name} size="md" />
            <div className="min-w-0">
              <div className={`text-sm ${TYPE_WEIGHT.semibold} truncate ${t.textPrimary}`}>{assignment.employee_name}</div>
              <div className={`text-xs truncate ${t.textFaint}`}>{assignment.designation || assignment.department || assignment.employee_id}</div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <DayStatusBadge status={status} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" aria-label="More options" onClick={e => e.stopPropagation()} className={`h-7 w-7 flex items-center justify-center rounded-lg ${t.chipBg} ${t.textFaint} ${t.hoverBg} ${t.hoverText} transition-all`}><MoreVertical className="h-3.5 w-3.5" /></button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => onView(assignment)}><Eye className="h-3.5 w-3.5" /> View Details</DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => onEdit(assignment)}><Pencil className="h-3.5 w-3.5" /> Edit</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-red-400 cursor-pointer gap-2" onClick={() => onDelete(assignment)}><Trash2 className="h-3.5 w-3.5" /> Remove</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-3">
          <ShiftTypeBadge type={assignment.shift_type} />
          {assignment.shift_type !== 'standby' && <span className={`text-xs ${t.textFaint}`}>{assignment.on_days}d on / {assignment.off_days}d off</span>}
        </div>

        <div className="mb-2">
          <div className={`flex justify-between text-[10px] mb-1 ${t.textFaint}`}><span>Cycle position</span><span>{progress}%</span></div>
          <ProgressBar value={progress} color={pattern.color} showValue={false} />
        </div>

        <div className={`flex items-center gap-3 text-[11px] ${t.textFaint}`}>
          <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> From {fmtDate(assignment.cycle_start_date)}</span>
          {status === 'off' && nextOn > 0 && <span className="flex items-center gap-1 text-brand-400/70"><TrendingUp className="h-3 w-3" /> On in {nextOn}d</span>}
        </div>
      </div>

      <div className={`px-4 py-2.5 ${t.chipBg} border-t ${t.border}`}>
        <button type="button" onClick={e => { e.stopPropagation(); onView(assignment); }} className={`w-full inline-flex items-center justify-center gap-2 text-xs ${t.textFaint} ${t.hoverText} transition-colors`}><Eye className="h-3.5 w-3.5" /> View Details</button>
      </div>
    </GlowCard>
  );
}

// ─── ShiftDetailModal ─────────────────────────────────────────────────────────

function ShiftDetailModal({ assignment, open, onClose, onEdit, onDelete }: { assignment: ShiftAssignment | null; open: boolean; onClose: () => void; onEdit: (a: ShiftAssignment) => void; onDelete: (a: ShiftAssignment) => void; }) {
  const t = useTheme();
  if (!assignment) return null;
  const status = todayStatus(assignment);
  const progress = cycleProgress(assignment);
  const pattern = getShiftPattern(assignment.shift_type);
  const nextOn = daysUntilNextOn(assignment);

  return (
    <CenterModal open={open} onClose={onClose} title={assignment.employee_name} subtitle={`${assignment.designation || '—'} · ${assignment.department || '—'}`} accent="violet" width="max-w-2xl">
      <div className="px-6 pt-3">
        <div className="flex items-center gap-2 pb-3"><DayStatusBadge status={status} /><ShiftTypeBadge type={assignment.shift_type} /></div>
      </div>
      <div className="px-6 pb-6 space-y-4">
        <div className={`${t.chipBg} rounded-xl overflow-hidden`}>
          <div className={`flex items-center gap-2 px-3.5 py-2.5 border-b ${t.border}`}><Users className="h-3.5 w-3.5 text-brand-400" /><span className={`text-xs ${TYPE_WEIGHT.semibold} uppercase tracking-wider ${t.textMuted}`}>Employee</span></div>
          <div className="px-3.5 py-3 grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2.5">
            <InfoField label="Employee ID" value={assignment.employee_id} /><InfoField label="Designation" value={assignment.designation} />
            <InfoField label="Department" value={assignment.department} /><InfoField label="Section" value={assignment.section} /><InfoField label="Phone" value={assignment.phone} />
          </div>
        </div>

        <div className={`${t.chipBg} rounded-xl overflow-hidden`}>
          <div className={`flex items-center gap-2 px-3.5 py-2.5 border-b ${t.border}`}><Clock className="h-3.5 w-3.5 text-brand-400" /><span className={`text-xs ${TYPE_WEIGHT.semibold} uppercase tracking-wider ${t.textMuted}`}>Shift Pattern</span></div>
          <div className="px-3.5 py-3 grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2.5">
            <InfoField label="Shift Type" value={pattern.label} />
            {assignment.shift_type !== 'standby' && <><InfoField label="On Days" value={assignment.on_days} /><InfoField label="Off Days" value={assignment.off_days} /></>}
            <InfoField label="Cycle Start" value={fmtDate(assignment.cycle_start_date)} /><InfoField label="Status" value={STATUS_COLORS[status].label} />
            {(assignment.shift_label || assignment.shift_hours) && (() => { const tm = assignment.shift_label ? SHIFT_TIMING_PRESETS[assignment.shift_label] : null; return <InfoField label="Default Timing" value={tm ? `${tm.label} · ${assignment.shift_hours || tm.hours}` : (assignment.shift_hours || '')} />; })()}
            {status === 'off' && nextOn > 0 && <InfoField label="Next On Duty" value={`In ${nextOn} day${nextOn > 1 ? 's' : ''}`} />}
          </div>
        </div>

        {assignment.shift_type !== 'standby' && (
          <div className={`${t.chipBg} rounded-xl overflow-hidden`}>
            <div className={`flex items-center gap-2 px-3.5 py-2.5 border-b ${t.border}`}><Activity className="h-3.5 w-3.5 text-brand-400" /><span className={`text-xs ${TYPE_WEIGHT.semibold} uppercase tracking-wider ${t.textMuted}`}>Cycle Position</span></div>
            <div className="px-3.5 py-3">
              <div className={`flex justify-between text-xs mb-2 ${t.textFaint}`}><span>Progress through current cycle</span><span className={`${TYPE_WEIGHT.semibold} ${t.textMuted}`}>{progress}%</span></div>
              <ProgressBar value={progress} color={pattern.color} showValue={false} />
              <div className={`flex justify-between text-[10px] mt-1.5 ${t.textFaint}`}><span>Day 1</span><span>Day {assignment.on_days + assignment.off_days}</span></div>
            </div>
          </div>
        )}

        {(assignment.shift_timing_periods || []).length > 0 && (
          <div className={`${t.chipBg} rounded-xl overflow-hidden`}>
            <div className={`flex items-center gap-2 px-3.5 py-2.5 border-b ${t.border}`}><Clock className="h-3.5 w-3.5 text-brand-400" /><span className={`text-xs ${TYPE_WEIGHT.semibold} uppercase tracking-wider ${t.textMuted}`}>Timing Blocks</span><span className={`ml-auto text-xs ${t.textFaint}`}>{(assignment.shift_timing_periods || []).length} block{(assignment.shift_timing_periods || []).length > 1 ? 's' : ''}</span></div>
            <div className="px-3.5 py-3 space-y-1.5">
              {(assignment.shift_timing_periods || []).map((blk, i) => {
                const tm = blk.label ? SHIFT_TIMING_PRESETS[blk.label] : null;
                const hrs = (blk.start_time && blk.end_time) ? `${blk.start_time}–${blk.end_time}` : (tm?.hours || '');
                return <div key={i} className="flex items-center gap-2 text-sm">{tm && <span className={`text-[10px] ${TYPE_WEIGHT.bold} px-1.5 py-0.5 rounded-md`} style={{ backgroundColor: `${tm.color}22`, color: tm.color }}>{tm.abbr}</span>}<span className={t.textFaint}>{fmtDate(blk.from)} → {fmtDate(blk.to)}</span>{hrs && <span className={`ml-auto text-xs font-mono ${t.textFaint}`}>{hrs}</span>}</div>;
              })}
            </div>
          </div>
        )}

        {assignment.shift_type !== 'standby' && (assignment.standby_periods || []).length > 0 && (
          <div className="bg-amber-500/[0.05] rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-3.5 py-2.5 border-b border-amber-500/15"><Shield className={`h-3.5 w-3.5 ${accentText('amber', t.light)}`} /><span className={`text-xs ${TYPE_WEIGHT.semibold} ${accentText('amber', t.light)} uppercase tracking-wider`}>Standby Periods</span><span className={`ml-auto text-xs ${t.light ? 'text-amber-600/70' : 'text-amber-400/70'}`}>{(assignment.standby_periods || []).length} period{(assignment.standby_periods || []).length > 1 ? 's' : ''}</span></div>
            <div className="px-3.5 py-3 space-y-1.5">
              {(assignment.standby_periods || []).map((p, i) => <div key={i} className={`flex items-center gap-2 text-sm ${t.light ? 'text-amber-600/80' : 'text-amber-400/80'}`}><span className="text-amber-500/50">·</span><span>{fmtDate(p.from)}</span><span className={t.textFaint}>→</span><span>{fmtDate(p.to)}</span></div>)}
            </div>
          </div>
        )}

        {(assignment.day_overrides || []).length > 0 && (
          <div className={`${t.chipBg} rounded-xl overflow-hidden`}>
            <div className={`flex items-center gap-2 px-3.5 py-2.5 border-b ${t.border}`}><Calendar className="h-3.5 w-3.5 text-brand-400" /><span className={`text-xs ${TYPE_WEIGHT.semibold} uppercase tracking-wider ${t.textMuted}`}>Schedule Events</span><span className={`ml-auto text-xs ${t.textFaint}`}>{(assignment.day_overrides || []).length} event{(assignment.day_overrides || []).length > 1 ? 's' : ''}</span></div>
            <div className="px-3.5 py-3 space-y-1.5 max-h-48 overflow-y-auto">
              {(assignment.day_overrides as ScheduleEvent[]).map((ev, i) => {
                const ty = EVENT_TYPES[ev.type as EventType] ?? EVENT_TYPES.custom;
                const EvIcon = ty.icon;
                const hrs = ev.start_time && ev.end_time ? `${ev.start_time}–${ev.end_time}` : '';
                return (
                  <div key={ev.id || i} className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg" style={{ backgroundColor: `${ty.color}12`, border: `1px solid ${ty.color}30` }}>
                    <div className="p-1.5 rounded-lg shrink-0" style={{ backgroundColor: `${ty.color}18` }}><EvIcon className="h-3.5 w-3.5" style={{ color: ty.color }} /></div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-xs ${TYPE_WEIGHT.semibold}`} style={{ color: ty.color }}>{ty.label}</div>
                      <div className={`text-[11px] ${t.textFaint}`}>{fmtDate(ev.from)}{ev.to && ev.to !== ev.from ? ` → ${fmtDate(ev.to)}` : ''}{hrs ? ` · ${hrs}` : ''}{ev.note ? ` · ${ev.note}` : ''}</div>
                    </div>
                    <span className={`text-[10px] ${TYPE_WEIGHT.bold} px-1.5 py-0.5 rounded-md shrink-0`} style={{ backgroundColor: `${ty.color}22`, color: ty.color }}>{ty.abbr}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {assignment.notes && (
          <div className={`${t.chipBg} rounded-xl overflow-hidden`}>
            <div className={`flex items-center gap-2 px-3.5 py-2.5 border-b ${t.border}`}><AlertCircle className="h-3.5 w-3.5 text-brand-400" /><span className={`text-xs ${TYPE_WEIGHT.semibold} uppercase tracking-wider ${t.textMuted}`}>Notes</span></div>
            <p className={`px-3.5 py-3 text-sm leading-relaxed ${t.textFaint}`}>{assignment.notes}</p>
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <PrimaryButton size="md" fullWidth icon={Pencil} onClick={() => { onEdit(assignment); onClose(); }}>Edit Assignment</PrimaryButton>
          <button type="button" aria-label="Delete assignment" onClick={() => { onDelete(assignment); onClose(); }} className={`px-4 py-2.5 rounded-xl text-sm ${TYPE_WEIGHT.semibold} text-red-400 bg-red-500/10 hover:bg-red-500/20 transition-all`}><Trash2 className="h-4 w-4" /></button>
        </div>
      </div>
    </CenterModal>
  );
}

// ─── ShiftAssignForm ──────────────────────────────────────────────────────────

const EMPTY_FORM: FormState = {
  employee_id: '', employee_name: '', designation: '', department: '', section: '', phone: '',
  shift_type: '10-4', on_days: '10', off_days: '4', cycle_start_date: new Date().toISOString().slice(0, 10),
  notes: '', is_active: true, standby_periods: [], shift_label: '', shift_hours: '', shift_timing_periods: [],
};

function ShiftAssignForm({ open, onClose, editing, employees, onSaved }: { open: boolean; onClose: () => void; editing: ShiftAssignment | null; employees: Employee[]; onSaved: () => void; }) {
  const t = useTheme();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [empOpen, setEmpOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setForm({
        employee_id: editing.employee_id, employee_name: editing.employee_name, designation: editing.designation || '',
        department: editing.department || '', section: editing.section || '', phone: editing.phone || '',
        shift_type: editing.shift_type, on_days: String(editing.on_days), off_days: String(editing.off_days),
        cycle_start_date: editing.cycle_start_date, notes: editing.notes || '', is_active: editing.is_active,
        standby_periods: editing.standby_periods || [], shift_label: editing.shift_label || '', shift_hours: editing.shift_hours || '',
        shift_timing_periods: editing.shift_timing_periods || [],
      });
    } else setForm(EMPTY_FORM);
  }, [open, editing]);

  function setField(k: keyof FormState) { return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm(p => ({ ...p, [k]: e.target.value })); }
  function onShiftTypeChange(v: ShiftType) { const p = SHIFT_PATTERNS[v]; setForm(prev => ({ ...prev, shift_type: v, on_days: String(p.on), off_days: String(p.off) })); }
  function selectEmployee(emp: Employee) {
    setForm(p => ({ ...p, employee_id: emp.id, employee_name: emp.name, designation: emp.designation || p.designation, department: emp.department || p.department, section: emp.section || p.section, phone: emp.phone || p.phone }));
    setEmpOpen(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.employee_id || !form.employee_name || !form.cycle_start_date) { toast.error('Employee and cycle start date are required'); return; }
    setSaving(true);
    try {
      const payload = {
        employee_id: form.employee_id, employee_name: form.employee_name, designation: form.designation || null, department: form.department || null,
        section: form.section || null, phone: form.phone || null, shift_type: form.shift_type,
        on_days: parseInt(form.on_days) || 0, off_days: parseInt(form.off_days) || 0, cycle_start_date: form.cycle_start_date,
        notes: form.notes || null, is_active: form.is_active, standby_periods: form.standby_periods,
        shift_label: form.shift_label || null, shift_hours: form.shift_hours || null, shift_timing_periods: form.shift_timing_periods,
      };
      if (editing) await updateAssignment(editing.id, payload);
      else await createAssignment(payload);
      toast.success(editing ? 'Assignment updated' : 'Assignment created');
      onSaved();
      onClose();
    } catch (err) { toast.error(String(err)); }
    finally { setSaving(false); }
  }

  const isCustom = form.shift_type === 'custom';
  const isStandby = form.shift_type === 'standby';
  const inputCls = `w-full rounded-lg px-3 py-1.5 text-sm outline-none transition-colors ${t.inputBg}`;

  return (
    <CenterModal open={open} onClose={onClose} title={editing ? 'Edit Assignment' : 'Assign Shift'} subtitle={editing ? 'Update shift assignment details' : 'Set up a new shift cycle for an employee'} accent="violet" width="max-w-xl">
      <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
        <div className={`${t.chipBg} rounded-xl overflow-hidden`}>
          <div className={`flex items-center gap-2 px-3.5 py-2.5 border-b ${t.border}`}><Users className="h-3.5 w-3.5 text-brand-400" /><span className={`text-xs ${TYPE_WEIGHT.semibold} uppercase tracking-wider ${t.textMuted}`}>Employee</span></div>
          <div className="px-3.5 py-3 space-y-3">
            <FormField label="Employee">
              <Popover open={empOpen} onOpenChange={setEmpOpen}>
                <PopoverTrigger asChild>
                  <button type="button" className={`${inputCls} flex items-center justify-between`}>
                    <span className={form.employee_name ? t.textPrimary : t.textFaint}>{form.employee_name || 'Search employee…'}</span>
                    <ChevronsUpDown className={`h-3.5 w-3.5 shrink-0 ${t.textFaint}`} />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search…" />
                    <CommandList>
                      <CommandEmpty className="text-sm py-4 text-center">No employees found</CommandEmpty>
                      <CommandGroup>
                        {employees.map(emp => (
                          <CommandItem key={emp.id} value={emp.name} onSelect={() => selectEmployee(emp)} className="cursor-pointer">
                            <Check className={`h-3.5 w-3.5 mr-2 ${form.employee_id === emp.id ? 'opacity-100' : 'opacity-0'}`} />
                            <div><div className={`text-sm ${TYPE_WEIGHT.medium}`}>{emp.name}</div><div className={`text-xs ${t.textFaint}`}>{emp.designation} · {emp.department}</div></div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Employee ID"><input aria-label="Employee ID" className={inputCls} value={form.employee_id} onChange={setField('employee_id')} placeholder="C1234" /></FormField>
              <FormField label="Phone"><input aria-label="Phone" className={inputCls} value={form.phone} onChange={setField('phone')} placeholder="+263…" /></FormField>
              <FormField label="Designation"><input aria-label="Designation" className={inputCls} value={form.designation} onChange={setField('designation')} placeholder="Engineer" /></FormField>
              <FormField label="Department"><input aria-label="Department" className={inputCls} value={form.department} onChange={setField('department')} placeholder="Operations" /></FormField>
            </div>
          </div>
        </div>

        <div className={`${t.chipBg} rounded-xl overflow-hidden`}>
          <div className={`flex items-center gap-2 px-3.5 py-2.5 border-b ${t.border}`}><Clock className="h-3.5 w-3.5 text-brand-400" /><span className={`text-xs ${TYPE_WEIGHT.semibold} uppercase tracking-wider ${t.textMuted}`}>Shift Pattern</span></div>
          <div className="px-3.5 py-3 space-y-3">
            <FormField label="Shift Type">
              <SelectField size="form" title="Shift type" value={form.shift_type} onChange={v => onShiftTypeChange(v as ShiftType)}
                options={(Object.entries(SHIFT_PATTERNS) as [ShiftType, typeof SHIFT_PATTERNS[ShiftType]][]).map(([k, v]) => ({ value: k, label: v.label }))} />
            </FormField>
            {!isStandby && (
              <div className="grid grid-cols-2 gap-3">
                <FormField label="On Days"><input type="number" min={0} max={365} aria-label="On days" className={`${inputCls} ${!isCustom ? 'opacity-60' : ''}`} value={form.on_days} onChange={setField('on_days')} readOnly={!isCustom} /></FormField>
                <FormField label="Off Days"><input type="number" min={0} max={365} aria-label="Off days" className={`${inputCls} ${!isCustom ? 'opacity-60' : ''}`} value={form.off_days} onChange={setField('off_days')} readOnly={!isCustom} /></FormField>
              </div>
            )}
            <FormField label="Cycle Start Date"><input type="date" aria-label="Cycle start date" className={inputCls} value={form.cycle_start_date} onChange={setField('cycle_start_date')} /></FormField>
          </div>
        </div>

        <div className={`${t.chipBg} rounded-xl overflow-hidden`}>
          <div className={`flex items-center justify-between px-3.5 py-2.5 border-b ${t.border}`}>
            <div className="flex items-center gap-2"><Clock className="h-3.5 w-3.5 text-brand-400" /><span className={`text-xs ${TYPE_WEIGHT.semibold} uppercase tracking-wider ${t.textMuted}`}>Shift Timing</span></div>
            <button type="button" onClick={() => setForm(p => ({ ...p, shift_timing_periods: [...p.shift_timing_periods, { from: p.cycle_start_date, to: p.cycle_start_date, label: p.shift_label || '', start_time: '', end_time: '' }] }))} className="text-xs px-2 py-1 rounded-lg bg-brand-500/10 text-brand-400/80 hover:bg-brand-500/20 transition-all">+ Add Block</button>
          </div>
          <div className="px-3.5 py-3 space-y-4">
            <div>
              <div className={`text-xs ${TYPE_WEIGHT.medium} mb-2 ${t.textFaint}`}>Default timing (days without a specific block)</div>
              <div className="grid grid-cols-4 gap-1.5">
                {(['day', 'morning', 'afternoon', 'night'] as const).map(key => {
                  const tp = SHIFT_TIMING_PRESETS[key];
                  const active = form.shift_label === key;
                  return (
                    <button key={key} type="button" onClick={() => setForm(p => ({ ...p, shift_label: active ? '' : key, shift_hours: active ? '' : tp.hours }))}
                      className={`text-center px-2 py-2 rounded-lg transition-all ${active ? '' : `${t.chipBg} ${t.textFaint} ${t.hoverBg}`}`} style={active ? { backgroundColor: `${tp.color}18`, color: tp.color } : undefined}>
                      <div className={`text-[11px] ${TYPE_WEIGHT.bold}`}>{tp.abbr}</div>
                      <div className="text-[9px] mt-0.5 opacity-70 leading-tight">{tp.label.replace(' Shift', '')}</div>
                      <div className="text-[9px] mt-0.5 opacity-50">{tp.hours}</div>
                    </button>
                  );
                })}
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <FormField label="Start time"><input type="time" aria-label="Default start time" className={inputCls} value={form.shift_hours?.split('–')[0]?.trim() || ''} onChange={e => { const end = form.shift_hours?.split('–')[1]?.trim() || ''; setForm(p => ({ ...p, shift_hours: `${e.target.value}–${end}`, shift_label: p.shift_label || 'custom' })); }} /></FormField>
                <FormField label="End time"><input type="time" aria-label="Default end time" className={inputCls} value={form.shift_hours?.split('–')[1]?.trim() || ''} onChange={e => { const start = form.shift_hours?.split('–')[0]?.trim() || ''; setForm(p => ({ ...p, shift_hours: `${start}–${e.target.value}`, shift_label: p.shift_label || 'custom' })); }} /></FormField>
              </div>
            </div>

            {form.shift_timing_periods.length > 0 && (
              <div className="space-y-2">
                <div className={`text-xs ${TYPE_WEIGHT.medium} ${t.textFaint}`}>Timing blocks (override by date range)</div>
                {form.shift_timing_periods.map((blk, idx) => (
                  <div key={idx} className={`rounded-lg ${t.chipBg} p-2.5 space-y-2`}>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {(['day', 'morning', 'afternoon', 'night'] as const).map(key => {
                        const tp = SHIFT_TIMING_PRESETS[key];
                        const active = blk.label === key;
                        return (
                          <button key={key} type="button" onClick={() => setForm(p => { const updated = [...p.shift_timing_periods]; const preset = SHIFT_TIMING_PRESETS[key]; const [s, e2] = preset.hours.split('–'); updated[idx] = { ...updated[idx], label: active ? '' : key, start_time: active ? updated[idx].start_time : (s || ''), end_time: active ? updated[idx].end_time : (e2 || '') }; return { ...p, shift_timing_periods: updated }; })}
                            className="text-xs px-2 py-0.5 rounded-md transition-all" style={active ? { backgroundColor: `${tp.color}18`, color: tp.color } : undefined}>{tp.abbr} <span className="opacity-60">{tp.label.replace(' Shift', '')}</span></button>
                        );
                      })}
                      <button type="button" aria-label="Remove timing block" onClick={() => setForm(p => ({ ...p, shift_timing_periods: p.shift_timing_periods.filter((_, i) => i !== idx) }))} className="ml-auto h-6 w-6 flex items-center justify-center rounded-md bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all"><X className="h-3 w-3" /></button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <FormField label="From date"><input type="date" aria-label={`Block ${idx + 1} from date`} className={inputCls} value={blk.from || ''} onChange={e => setForm(p => { const u = [...p.shift_timing_periods]; u[idx] = { ...u[idx], from: e.target.value }; return { ...p, shift_timing_periods: u }; })} /></FormField>
                      <FormField label="To date"><input type="date" aria-label={`Block ${idx + 1} to date`} className={inputCls} value={blk.to || ''} onChange={e => setForm(p => { const u = [...p.shift_timing_periods]; u[idx] = { ...u[idx], to: e.target.value }; return { ...p, shift_timing_periods: u }; })} /></FormField>
                      <FormField label="Start time"><input type="time" aria-label={`Block ${idx + 1} start time`} className={inputCls} value={blk.start_time || ''} onChange={e => setForm(p => { const u = [...p.shift_timing_periods]; u[idx] = { ...u[idx], start_time: e.target.value }; return { ...p, shift_timing_periods: u }; })} /></FormField>
                      <FormField label="End time"><input type="time" aria-label={`Block ${idx + 1} end time`} className={inputCls} value={blk.end_time || ''} onChange={e => setForm(p => { const u = [...p.shift_timing_periods]; u[idx] = { ...u[idx], end_time: e.target.value }; return { ...p, shift_timing_periods: u }; })} /></FormField>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {form.shift_type !== 'standby' && (
          <div className="rounded-xl bg-amber-500/[0.05] overflow-hidden">
            <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-amber-500/15">
              <div className="flex items-center gap-2"><Shield className={`h-3.5 w-3.5 ${accentText('amber', t.light)}`} /><span className={`text-xs ${TYPE_WEIGHT.semibold} ${accentText('amber', t.light)} uppercase tracking-wider`}>Standby Periods</span></div>
              <button type="button" onClick={() => setForm(p => ({ ...p, standby_periods: [...p.standby_periods, { from: p.cycle_start_date, to: p.cycle_start_date }] }))} className={`text-xs px-2 py-1 rounded-lg bg-amber-500/15 ${accentText('amber', t.light)} hover:bg-amber-500/25 transition-all flex items-center gap-1`}>+ Add Period</button>
            </div>
            <div className="px-3.5 py-3 space-y-2">
              {form.standby_periods.length === 0 ? (
                <p className={`text-xs py-1 ${t.textFaint}`}>No standby periods — click &quot;Add Period&quot; to mark dates when this employee is also on call.</p>
              ) : form.standby_periods.map((period, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <div>{idx === 0 && <div className={`text-xs ${TYPE_WEIGHT.medium} mb-1 ${t.textFaint}`}>From</div>}<input type="date" aria-label={`Standby period ${idx + 1} from`} className={inputCls} value={period.from} onChange={e => setForm(p => { const updated = [...p.standby_periods]; updated[idx] = { ...updated[idx], from: e.target.value }; return { ...p, standby_periods: updated }; })} /></div>
                    <div>{idx === 0 && <div className={`text-xs ${TYPE_WEIGHT.medium} mb-1 ${t.textFaint}`}>To</div>}<input type="date" aria-label={`Standby period ${idx + 1} to`} className={inputCls} value={period.to} onChange={e => setForm(p => { const updated = [...p.standby_periods]; updated[idx] = { ...updated[idx], to: e.target.value }; return { ...p, standby_periods: updated }; })} /></div>
                  </div>
                  <button type="button" aria-label="Remove standby period" onClick={() => setForm(p => ({ ...p, standby_periods: p.standby_periods.filter((_, i) => i !== idx) }))} className={`${idx === 0 ? 'mt-5' : ''} h-7 w-7 shrink-0 flex items-center justify-center rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all`}><X className="h-3.5 w-3.5" /></button>
                </div>
              ))}
            </div>
          </div>
        )}

        <FormField label="Notes"><textarea aria-label="Notes" rows={2} className={inputCls} value={form.notes} onChange={setField('notes')} placeholder="Optional notes…" /></FormField>

        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onClose} className={`flex-1 px-4 py-2.5 rounded-xl text-sm ${TYPE_WEIGHT.medium} ${t.textMuted} border ${t.border} ${t.hoverBg} transition-all`}>Cancel</button>
          <PrimaryButton type="submit" size="md" fullWidth icon={Clock} submitting={saving}>{editing ? 'Update' : 'Assign Shift'}</PrimaryButton>
        </div>
      </form>
    </CenterModal>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function ShiftsContent() {
  const t = useTheme();
  const sections = useCollapseSection({ hero: true, shiftPatterns: true, roster: true, filters: true });
  const { assignments, setAssignments, employees, leaves, loading, refresh: fetchAll } = useShiftsData();
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('created_at');
  const [filterType, setFilterType] = useState<ShiftType | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<DayStatus | 'all'>('all');
  const [showRecords, setShowRecords] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ShiftAssignment | null>(null);
  const [viewTarget, setViewTarget] = useState<ShiftAssignment | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ShiftAssignment | null>(null);

  const heroStats = useMemo(() => {
    const todayStr = d2s(new Date());
    const active = assignments.filter(a => a.is_active);
    const on = active.filter(a => todayStatus(a) === 'on').length;
    const off = active.filter(a => todayStatus(a) === 'off').length;
    const standby = active.filter(a => todayStatus(a) === 'standby').length;
    const soonOn = active.filter(a => { const n = daysUntilNextOn(a); return n > 0 && n <= 3; }).length;
    const onStandby = active.filter(a => todayStatus(a) === 'on+standby').length;
    const onLeave = active.filter(a => !!findLeaveForDay(leaves, a.employee_id, a.employee_name, todayStr)).length;
    return [
      { label: 'Total', value: assignments.length, hex: ACCENT_HEX.blue },
      { label: 'Active', value: active.length, hex: '#78C0A6' },
      { label: 'On Duty', value: on, hex: '#4ade80' },
      { label: 'On+Standby', value: onStandby, hex: '#2dd4bf' },
      { label: 'Off Duty', value: off, hex: '#9ca3af' },
      { label: 'Standby', value: standby, hex: '#fbbf24' },
      { label: 'On Leave', value: onLeave, hex: '#a78bfa' },
      { label: 'On in ≤3d', value: soonOn, hex: ACCENT_HEX.blue },
    ];
  }, [assignments, leaves]);

  const breakdown = useMemo(() => {
    const total = assignments.length || 1;
    return (Object.keys(SHIFT_PATTERNS) as ShiftType[]).map(type => ({ type, count: assignments.filter(a => a.shift_type === type).length, percentage: Math.round((assignments.filter(a => a.shift_type === type).length / total) * 100) }));
  }, [assignments]);

  const filtered = useMemo(() => {
    let list = [...assignments];
    if (filterType !== 'all') list = list.filter(a => a.shift_type === filterType);
    if (filterStatus !== 'all') list = list.filter(a => todayStatus(a) === filterStatus);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(a => a.employee_name.toLowerCase().includes(q) || a.employee_id.toLowerCase().includes(q) || (a.designation || '').toLowerCase().includes(q) || (a.department || '').toLowerCase().includes(q));
    }
    list.sort((a, b) => {
      if (sortKey === 'name') return a.employee_name.localeCompare(b.employee_name);
      if (sortKey === 'shift_type') return a.shift_type.localeCompare(b.shift_type);
      if (sortKey === 'cycle_start_date') return a.cycle_start_date.localeCompare(b.cycle_start_date);
      return (b.created_at || '').localeCompare(a.created_at || '');
    });
    return list;
  }, [assignments, filterType, filterStatus, search, sortKey]);

  const handleUpdateOverrides = useCallback(async (id: number, overrides: DayOverride[]) => {
    await updateAssignment(id, { day_overrides: overrides });
    setAssignments(prev => prev.map(a => a.id === id ? { ...a, day_overrides: overrides } : a));
  }, [setAssignments]);

  function openCreate() { setEditing(null); setFormOpen(true); }
  function openEdit(a: ShiftAssignment) { setEditing(a); setFormOpen(true); }
  function openView(a: ShiftAssignment) { setViewTarget(a); }
  function openDelete(a: ShiftAssignment) { setDeleteTarget(a); }
  function hasFilters() { return filterType !== 'all' || filterStatus !== 'all' || search !== ''; }
  function clearFilters() { setFilterType('all'); setFilterStatus('all'); setSearch(''); }

  const selCls = `h-8 rounded-lg px-2.5 text-xs outline-none transition-colors ${t.inputBg}`;
  const thCls = `text-left px-3 py-2 text-[10px] uppercase tracking-wide ${TYPE_WEIGHT.medium} ${t.textFaint}`;

  const exportColumns: DLColumn[] = [
    { key: 'employee_name', label: 'Employee', width: 22 },
    { key: 'employee_id', label: 'Employee ID', width: 14 },
    { key: 'designation', label: 'Designation', width: 18 },
    { key: 'department', label: 'Department', width: 18 },
    { key: 'section', label: 'Section', width: 16 },
    { key: 'phone', label: 'Phone', width: 16 },
    { key: 'shift_type', label: 'Pattern', width: 14 },
    { key: 'today', label: 'Today', width: 14, format: (_v, row) => todayStatus(row as unknown as ShiftAssignment) },
    { key: 'cycle_start_date', label: 'Cycle Start', width: 14, format: v => v ? fmtDate(v as string) : '' },
  ];

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-4">
      <PageHero
        icon={Clock}
        accent="violet"
        crumbs={['Time & Attendance', 'Shifts']}
        title="Shifts"
        statsOpen={sections.expanded.hero}
        actions={
          <>
            <button type="button" onClick={fetchAll} title="Refresh" className={`h-8 w-8 flex items-center justify-center rounded-lg ${t.hoverBg} ${t.textFaint} ${t.hoverText}`}><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></button>
            {filtered.length > 0 && (
              <DownloadButton
                data={filtered as unknown as Record<string, unknown>[]}
                columns={exportColumns}
                filename={exportFilename('Shifts')}
                title="Shifts"
              />
            )}
            <PrimaryButton icon={Plus} onClick={openCreate}>Assign Shift</PrimaryButton>
          </>
        }
      >
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
          {heroStats.map(s => <StatTile key={s.label} icon={Clock} color={s.hex} label={s.label} value={s.value} />)}
        </div>
      </PageHero>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className={`${t.glass} rounded-2xl ${t.shadow} overflow-hidden`}>
          <div className={`flex items-center gap-2 px-5 py-3 border-b ${t.border}`}><Layers className="h-4 w-4 text-brand-400" /><span className={`${TYPE_WEIGHT.semibold} text-sm ${t.textPrimary}`}>Shift Patterns</span></div>
          <div className="p-4 grid grid-cols-2 gap-3">
            {breakdown.map(({ type, count, percentage }) => {
              const p = getShiftPattern(type);
              const isActive = filterType === type;
              const Icon = p.icon;
              return (
                <GlowCard key={type} onClick={() => setFilterType(isActive ? 'all' : type)} color={p.color}
                  surface="rounded-xl p-4"
                  className={`group text-left cursor-pointer ${isActive ? `${t.chipBg} ring-1 ring-brand-400/40` : `${t.chipBg} ${t.hoverBg}`}`}>
                  <div className="flex items-center justify-between mb-2"><Icon className="h-4 w-4" style={{ color: p.color }} /><span className={`text-xs ${TYPE_WEIGHT.bold} ${t.textPrimary}`}>{count}</span></div>
                  <div className={`text-xs ${TYPE_WEIGHT.semibold} mb-0.5 ${t.textMuted}`}>{p.label}</div>
                  <div className={`mt-2 h-1 rounded-full ${t.chipBg} overflow-hidden`}><ProgressBar value={percentage} color={p.color} showValue={false} /></div>
                </GlowCard>
              );
            })}
          </div>
        </div>

        <div className={`${t.glass} rounded-2xl ${t.shadow} overflow-hidden`}>
          <div className={`flex items-center gap-2 px-5 py-3 border-b ${t.border}`}><Users className="h-4 w-4 text-brand-400" /><span className={`${TYPE_WEIGHT.semibold} text-sm ${t.textPrimary}`}>Roster</span><span className={`ml-auto text-xs ${t.textFaint}`}>{assignments.length} assigned</span></div>
          <ScrollArea className="h-[220px]">
            <div className="space-y-1 p-4">
              {assignments.length === 0 ? <p className={`py-8 text-center text-sm ${t.textFaint}`}>No assignments yet</p> : assignments.slice(0, 20).map(a => {
                const s = todayStatus(a);
                return (
                  <button type="button" key={a.id} className={`w-full flex items-center gap-3 p-3 rounded-lg text-left ${t.hoverBgSoft} cursor-pointer transition-all`} onClick={() => openView(a)}>
                    <Avatar name={a.employee_name} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1"><span className={`text-sm ${TYPE_WEIGHT.medium} truncate ${t.textPrimary}`}>{a.employee_name}</span><DayStatusBadge status={s} /></div>
                      <ProgressBar value={cycleProgress(a)} color={getShiftPattern(a.shift_type).color} showValue={false} />
                    </div>
                    <ShiftTypeBadge type={a.shift_type} />
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      </div>

      <div className={`${t.glass} rounded-2xl ${t.shadow} overflow-hidden`}>
        <div className={`flex items-center justify-between px-5 py-3 border-b ${t.border}`}>
          <div className="flex items-center gap-2"><Layers className="h-4 w-4 text-brand-400" /><span className={`${TYPE_WEIGHT.semibold} text-sm ${t.textPrimary}`}>Filters</span>{hasFilters() && <ThemeStatusBadge color={ACCENT_HEX.blue} label="Active" />}</div>
          {hasFilters() && <button type="button" onClick={clearFilters} className={`text-xs ${t.textFaint} ${t.hoverText} flex items-center gap-1 transition-colors`}><X className="h-3 w-3" /> Clear</button>}
        </div>
        <div className="px-5 py-4 space-y-3">
          <div>
            <div className={`text-xs ${TYPE_WEIGHT.medium} mb-1.5 ${t.textFaint}`}>Pattern</div>
            <div className="flex flex-wrap gap-1.5">
              <button type="button" onClick={() => setFilterType('all')} className={`px-3 py-1.5 rounded-lg text-xs ${TYPE_WEIGHT.medium} transition-all ${filterType === 'all' ? 'bg-brand-500/20 text-brand-400' : `${t.chipBg} ${t.textFaint} ${t.hoverBg}`}`}>All Patterns</button>
              {Object.entries(SHIFT_PATTERNS).map(([k, v]) => <button key={k} type="button" onClick={() => setFilterType(filterType === k ? 'all' : k as ShiftType)} className={`px-3 py-1.5 rounded-lg text-xs ${TYPE_WEIGHT.medium} transition-all ${filterType === k ? '' : `${t.chipBg} ${t.textFaint} ${t.hoverBg}`}`} style={filterType === k ? { backgroundColor: `${v.color}22`, color: v.color } : undefined}>{v.label}</button>)}
            </div>
          </div>
          <div>
            <div className={`text-xs ${TYPE_WEIGHT.medium} mb-1.5 ${t.textFaint}`}>Today&apos;s Status</div>
            <div className="flex flex-wrap gap-1.5">
              <button type="button" onClick={() => setFilterStatus('all')} className={`px-3 py-1.5 rounded-lg text-xs ${TYPE_WEIGHT.medium} transition-all ${filterStatus === 'all' ? 'bg-brand-500/20 text-brand-400' : `${t.chipBg} ${t.textFaint} ${t.hoverBg}`}`}>All Statuses</button>
              {(['on', 'on+standby', 'off', 'standby'] as DayStatus[]).map(s => <button key={s} type="button" onClick={() => setFilterStatus(filterStatus === s ? 'all' : s)} className={`px-3 py-1.5 rounded-lg text-xs ${TYPE_WEIGHT.medium} transition-all`} style={filterStatus === s ? { backgroundColor: `${STATUS_COLORS[s].hex}22`, color: STATUS_COLORS[s].hex } : undefined}>{STATUS_COLORS[s].label}</button>)}
            </div>
          </div>
        </div>
      </div>

      <div className={`${t.glass} rounded-2xl ${t.shadow} overflow-hidden`}>
        <div className={`flex flex-wrap items-center gap-3 px-5 py-3 border-b ${t.border}`}>
          <span className={`text-xs ${TYPE_WEIGHT.semibold} uppercase tracking-wider ${t.textMuted}`}>Records</span>
          <span className={`text-[11px] ${t.textFaint}`}>{filtered.length} of {assignments.length}</span>
          <SearchInput value={search} onChange={setSearch} placeholder="Search employees…" className="w-52" />
          <SelectField size="filter" value={sortKey} onChange={v => setSortKey(v as SortKey)} title="Sort by"
            options={SORT_OPTIONS.map(o => ({ value: o.value, label: o.label }))} />
          <button type="button" title="Schedule view — see everyone's shifts for the next 4 weeks" onClick={() => setViewMode(v => v === 'schedule' ? 'grid' : 'schedule')}
            className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg transition-all ${viewMode === 'schedule' ? `bg-brand-500/20 text-brand-400 ${TYPE_WEIGHT.semibold}` : `${t.chipBg} ${t.textFaint} ${t.hoverBg}`}`}>
            <Calendar className="w-3 h-3" /> Schedule
          </button>
          <div className="ml-auto flex items-center gap-1.5">
            <button type="button" title="Grid view" onClick={() => setViewMode('grid')} className={`h-8 w-8 flex items-center justify-center rounded-lg transition-all ${viewMode === 'grid' ? 'bg-brand-500/20 text-brand-400' : `${t.chipBg} ${t.textFaint} ${t.hoverBg}`}`}><LayoutGrid className="h-3.5 w-3.5" /></button>
            <button type="button" title="Table view" onClick={() => setViewMode('table')} className={`h-8 w-8 flex items-center justify-center rounded-lg transition-all ${viewMode === 'table' ? 'bg-brand-500/20 text-brand-400' : `${t.chipBg} ${t.textFaint} ${t.hoverBg}`}`}><List className="h-3.5 w-3.5" /></button>
            <button type="button" title={showRecords ? 'Collapse' : 'Expand'} onClick={() => setShowRecords(v => !v)} className={`h-8 w-8 flex items-center justify-center rounded-lg ${t.chipBg} ${t.hoverBg} ${t.textFaint}`}>{showRecords ? '−' : '+'}</button>
          </div>
        </div>

        {showRecords && (
          loading ? (
            <div className="flex items-center justify-center py-16"><RefreshCw className={`h-6 w-6 animate-spin ${t.textFaint}`} /></div>
          ) : filtered.length === 0 && viewMode !== 'schedule' ? (
            <EmptyState icon={Clock} title="No shift assignments found"
              action={{ label: hasFilters() ? 'Clear filters' : 'Assign first shift', onClick: hasFilters() ? clearFilters : openCreate }} />
          ) : viewMode === 'schedule' ? (
            <ScheduleView assignments={filtered} leaves={leaves} onView={openView} onUpdateOverrides={handleUpdateOverrides} />
          ) : viewMode === 'grid' ? (
            <div className="p-4"><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">{filtered.map(a => <ShiftCard key={a.id} assignment={a} onView={openView} onEdit={openEdit} onDelete={openDelete} />)}</div></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className={`border-b ${t.border}`}><tr><th className={thCls}>Employee</th><th className={thCls}>Pattern</th><th className={thCls}>Today</th><th className={thCls}>Cycle Start</th><th className={thCls}>Department</th><th className={thCls}><span className="sr-only">Actions</span></th></tr></thead>
                <tbody>
                  {filtered.map(a => (
                    <tr key={a.id} className={`cursor-pointer border-b ${t.border} ${t.hoverBgSoft} transition-colors`} onClick={() => openView(a)}>
                      <td className="px-3 py-2.5"><div className="flex items-center gap-2.5"><Avatar name={a.employee_name} size="xs" /><div><div className={`text-sm ${TYPE_WEIGHT.medium} ${t.textPrimary}`}>{a.employee_name}</div><div className={`text-xs ${t.textFaint}`}>{a.employee_id}</div></div></div></td>
                      <td className="px-3 py-2.5"><ShiftTypeBadge type={a.shift_type} /></td>
                      <td className="px-3 py-2.5"><DayStatusBadge status={todayStatus(a)} /></td>
                      <td className={`px-3 py-2.5 text-sm ${t.textFaint}`}>{fmtDate(a.cycle_start_date)}</td>
                      <td className={`px-3 py-2.5 text-sm ${t.textFaint}`}>{a.department || '—'}</td>
                      <td className="px-3 py-2.5" aria-label="Actions">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><button type="button" aria-label="More options" onClick={e => e.stopPropagation()} className={`h-7 w-7 flex items-center justify-center rounded-lg ${t.textFaint} ${t.hoverText} ${t.hoverBg} transition-all`}><MoreVertical className="h-3.5 w-3.5" /></button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => openView(a)}><Eye className="h-3.5 w-3.5" /> View</DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => openEdit(a)}><Pencil className="h-3.5 w-3.5" /> Edit</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-400 cursor-pointer gap-2" onClick={() => openDelete(a)}><Trash2 className="h-3.5 w-3.5" /> Remove</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      <ShiftAssignForm open={formOpen} onClose={() => setFormOpen(false)} editing={editing} employees={employees} onSaved={fetchAll} />
      <ShiftDetailModal assignment={viewTarget} open={!!viewTarget} onClose={() => setViewTarget(null)} onEdit={a => { setViewTarget(null); openEdit(a); }} onDelete={a => { setViewTarget(null); openDelete(a); }} />

      <CenterModal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Remove Assignment" accent="amber" width="max-w-sm">
        <div className="p-5 space-y-4">
          <p className={`text-sm ${t.textMuted}`}>Remove shift assignment for {deleteTarget?.employee_name ?? ''}? This cannot be undone.</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setDeleteTarget(null)} className={`flex-1 py-2.5 rounded-xl text-sm ${t.textMuted} ${t.hoverText} border ${t.border} transition-all`}>Cancel</button>
            <button type="button" onClick={async () => {
              try {
                await deleteAssignment(deleteTarget!.id);
                toast.success('Assignment removed');
                setDeleteTarget(null);
                fetchAll();
              } catch (err) { toast.error(String(err)); }
            }} className={`flex-1 py-2.5 rounded-xl text-sm ${TYPE_WEIGHT.semibold} text-white bg-gradient-to-br from-rose-500 to-rose-700 hover:brightness-110 transition-all`}>Remove</button>
          </div>
        </div>
      </CenterModal>
    </main>
  );
}

export default function ShiftsPage() {
  return (
    <AppShell>
      <ShiftsContent />
    </AppShell>
  );
}
