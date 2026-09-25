'use client';

import { toast } from 'sonner';
import type { ComponentType, KeyboardEvent, MutableRefObject, PointerEvent } from 'react';
import { TableCell } from '@/components/ui/table';
import { ChevronRight, Plus, X } from '@/components/shared/theme';
import { useTheme, accentText, TYPE_WEIGHT } from '@/components/shared/theme';
import type { Employee, StatusConfig, StatusKey, TimesheetEntry } from './types';
import { DOUBLE_TIME_STATUSES, ZERO_HOUR_STATUSES } from './calcTotals';
import { dayCellHours, formatCellHours } from './timesheetCellDisplay';
import { canFillFromSource } from './fillEntry';
import type { FillDragState } from './fillDrag';
import { zimHolidayName } from '@/lib/zimHolidays';
import s from './timesheet-grid.module.css';

const STATUS_LABEL: Record<string, string> = {
  work: '',
  leave: 'Leave',
  sick: 'Sick',
  special_leave: 'Special',
  holiday: 'PPH',
  holiday_paid: 'PH',
  training: 'Train',
  off: 'Off',
  absent: 'Absent',
  weekend: '2.0×',
  maternity: 'Mat',
  study: 'Study',
  lieu: 'Lieu',
};

export function TimesheetDayCell({
  emp, day, dayIndex, dateKey, entry, fillPreview, fillSource, fillBlocked,
  today, onCellClick, onQuickAdd, onQuickRemove, beginFillPointer, endFillSession, setFillDrag, fillKeyboardRef, suppressCellClickUntil,
  StatusPill, entryCellTitle, STATUS_CFG,
}: {
  emp: Employee;
  day: Date;
  dayIndex: number;
  dateKey: string;
  entry?: TimesheetEntry;
  fillPreview: boolean;
  fillSource: boolean;
  fillBlocked: boolean;
  today: string;
  onCellClick: (emp: Employee, day: Date, entry?: TimesheetEntry) => void;
  onQuickAdd: (emp: Employee, day: Date) => void;
  onQuickRemove: (emp: Employee, entry: TimesheetEntry) => void;
  beginFillPointer: (empId: string, dayIndex: number, e: PointerEvent<HTMLElement>) => void;
  endFillSession: () => void;
  setFillDrag: (drag: FillDragState) => void;
  fillKeyboardRef: MutableRefObject<FillDragState | null>;
  suppressCellClickUntil: MutableRefObject<number>;
  StatusPill: ComponentType<{ status: StatusKey; dark?: boolean }>;
  entryCellTitle: (entry: TimesheetEntry) => string;
  STATUS_CFG: Record<StatusKey, StatusConfig>;
}) {
  const t = useTheme();
  const isWknd = day.getDay() === 0 || day.getDay() === 6;
  const isToday = dateKey === today;
  const cfg = entry ? STATUS_CFG[entry.status] : null;
  const quiet = t.design === 'dallaglio';
  const holiday = zimHolidayName(dateKey);

  const startFillKey = (e: KeyboardEvent) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    e.stopPropagation();
    if (entry && !canFillFromSource(entry)) {
      toast.info('Use a work day or OFF cell as the source');
      return;
    }
    endFillSession();
    const drag = { empId: emp.id, sourceDayIndex: dayIndex, endDayIndex: dayIndex };
    fillKeyboardRef.current = drag;
    setFillDrag(drag);
  };

  const startFillPointer = (e: PointerEvent<HTMLElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    if (entry && !canFillFromSource(entry)) {
      toast.info('Use a work day or OFF cell as the source');
      return;
    }
    beginFillPointer(emp.id, dayIndex, e);
  };

  if (!quiet) {
    return (
      <TableCell className={`text-center p-0.5 ${isWknd ? t.chipBg : ''} ${fillPreview ? (fillBlocked ? 'bg-amber-500/10 ring-1 ring-amber-400/30' : 'bg-brand-500/15 ring-1 ring-brand-400/25') : ''}`}>
        <div className="relative group/cell" data-fill-cell data-emp-id={emp.id} data-day-index={dayIndex}>
          <button type="button"
            title={entry ? entryCellTitle(entry) : isToday ? 'Add entry for today' : 'Add entry'}
            style={entry && cfg && entry.status !== 'work' ? { backgroundColor: `${cfg.hex}18`, borderColor: `${cfg.hex}55`, color: cfg.hex } : undefined}
            className={`w-full min-h-[64px] h-auto rounded-lg text-center flex flex-col items-center justify-center transition-all text-xs border gap-0.5 py-1.5 tabular-nums ${
              entry && cfg
                ? entry.status === 'work'
                  ? `${t.chipBg} border ${t.border} ${t.textMuted} hover:border-brand-400/35`
                  : 'hover:brightness-110'
                : isToday
                  ? 'bg-brand-500/10 border-brand-400/30 border-dashed hover:bg-brand-500/20'
                  : `border-transparent ${t.hoverBg}`
            } ${isToday ? 'ring-1 ring-brand-400/30' : ''} ${fillSource ? 'ring-2 ring-brand-400/60' : ''} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/50`}
            onClick={() => {
              if (Date.now() < suppressCellClickUntil.current) return;
              onCellClick(emp, day, entry);
            }}>
            {entry && cfg ? (
              <>
                <StatusPill status={entry.status} dark />
                {!ZERO_HOUR_STATUSES.has(entry.status) && (() => {
                  const shown = dayCellHours(entry);
                  return shown ? <span className={`${TYPE_WEIGHT.bold} ${shown.isDT ? accentText('amber', t.light) : t.textMuted}`}>{shown.hours.toFixed(1)}h{shown.isDT ? ' @ 2.0×' : ''}</span> : null;
                })()}
                {!DOUBLE_TIME_STATUSES.has(entry.status as StatusKey) && (entry.overtime_hours || 0) > 0 && <span className={`text-brand-400 ${TYPE_WEIGHT.semibold}`}>+{entry.overtime_hours!.toFixed(1)} OT</span>}
                {!DOUBLE_TIME_STATUSES.has(entry.status as StatusKey) && (entry.holiday_overtime_hours || 0) > 0 && <span className={`text-sky-400 ${TYPE_WEIGHT.semibold}`}>+{entry.holiday_overtime_hours!.toFixed(1)}h @ 2.0×</span>}
                {entry.standby_allowance && <span className={`${accentText('amber', t.light)} text-[10px] ${TYPE_WEIGHT.medium}`}>SB</span>}
              </>
            ) : (
              <span className={`text-base font-light ${isToday ? 'text-brand-400/50' : t.textFaint}`}>+</span>
            )}
          </button>
          {entry?._auto && <span title="Derived from approved leave/overtime — click to confirm" className="absolute top-1 left-1 h-2 w-2 rounded-full bg-brand-400 ring-2 ring-brand-400/30 pointer-events-none" aria-hidden />}
          <div role="button" tabIndex={0} title="Drag across days to fill normal hours or OFF (Excel-style). OT is not copied." aria-label={`Fill from ${dateKey}`}
            onPointerDown={startFillPointer} onKeyDown={startFillKey}
            className={`absolute bottom-0 right-0 z-0 h-6 w-6 flex items-end justify-end cursor-ew-resize touch-manipulation rounded-tl-md border-l border-t border-brand-400/45 bg-brand-500/20 text-brand-300 opacity-50 group-hover/cell:opacity-100 hover:bg-brand-500/35 motion-safe:transition-opacity focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/50 ${fillSource ? 'opacity-100 ring-1 ring-brand-400 bg-brand-500/45' : ''}`}>
            <ChevronRight className="w-3 h-3 translate-x-px translate-y-px" aria-hidden />
          </div>
          {!entry && (
            <button type="button" title="Quick add: normal shift" aria-label={`Quick add shift for ${emp.name} on ${dateKey}`}
              onClick={e => { e.stopPropagation(); onQuickAdd(emp, day); }}
              className="absolute top-1 right-1 h-6 w-6 flex items-center justify-center rounded-full opacity-45 group-hover/cell:opacity-100 focus-visible:opacity-100 bg-emerald-500/15 text-emerald-400/80 hover:bg-emerald-500/30 hover:text-emerald-400 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/40">
              <Plus className="w-3 h-3" />
            </button>
          )}
          {entry?.id != null && (
            <button type="button" title="Quick remove this day's entry" aria-label={`Remove entry for ${emp.name} on ${dateKey}`}
              onClick={e => { e.stopPropagation(); onQuickRemove(emp, entry); }}
              className="absolute top-1 right-1 h-6 w-6 flex items-center justify-center rounded-full opacity-45 group-hover/cell:opacity-100 focus-visible:opacity-100 bg-red-500/15 text-red-400/80 hover:bg-red-500/30 hover:text-red-400 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/40">
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </TableCell>
    );
  }

  const shown = entry ? dayCellHours(entry) : null;
  const statusText = entry ? STATUS_LABEL[entry.status] ?? entry.status : '';
  const statusCls = entry?.status === 'off' ? `${s.status} ${s.statusOff}`
    : entry?.status === 'absent' ? `${s.status} ${s.statusAbsent}`
      : entry && ['leave', 'sick', 'special_leave', 'maternity', 'study', 'lieu'].includes(entry.status) ? `${s.status} ${s.statusLeave}`
        : s.status;

  return (
    <TableCell className={`text-center p-0 ${isWknd ? s.weekend : ''} ${isToday ? s.today : ''} ${fillPreview ? (fillBlocked ? 'bg-amber-500/10' : 'bg-[color-mix(in_srgb,var(--d-accent)_10%,transparent)]') : ''}`}>
      <div className={`${s.cell} relative`} data-fill-cell data-emp-id={emp.id} data-day-index={dayIndex} data-fill-source={fillSource ? 'true' : undefined}>
        <button
          type="button"
          title={entry ? entryCellTitle(entry) : holiday ? `${holiday} — add entry` : isToday ? 'Add entry for today' : 'Add entry'}
          className={s.cellBtn}
          onClick={() => {
            if (Date.now() < suppressCellClickUntil.current) return;
            onCellClick(emp, day, entry);
          }}
        >
          {entry ? (
            <>
              {shown ? (
                <span className={s.hours}>{formatCellHours(shown.hours)}</span>
              ) : entry.status === 'off' ? (
                <span className={`${s.status} ${s.statusOff}`}>Off</span>
              ) : (
                <span className={statusCls}>{statusText}</span>
              )}
              {shown && statusText ? <span className={statusCls}>{statusText}</span> : null}
              {!DOUBLE_TIME_STATUSES.has(entry.status as StatusKey) && (entry.overtime_hours || 0) > 0 && (
                <span className={s.ot}>+{entry.overtime_hours!.toFixed(1)} OT</span>
              )}
              {!DOUBLE_TIME_STATUSES.has(entry.status as StatusKey) && (entry.holiday_overtime_hours || 0) > 0 && (
                <span className={s.ot}>+{entry.holiday_overtime_hours!.toFixed(1)} 2.0×</span>
              )}
              {entry.standby_allowance && <span className={s.status}>SB</span>}
            </>
          ) : (
            <span className={s.empty} aria-hidden> </span>
          )}
        </button>
        {entry?._auto && <span title="Derived from approved leave/overtime — click to confirm" className={s.derived} aria-hidden />}
        <div className={s.actions}>
          <button
            type="button"
            className={s.fillHandle}
            title="Drag across days to fill normal hours or OFF. OT is not copied."
            aria-label={`Fill from ${dateKey}`}
            onPointerDown={startFillPointer}
            onKeyDown={startFillKey}
          >
            <ChevronRight className="h-3 w-3" weight="light" aria-hidden />
          </button>
          {!entry && (
            <button type="button" className={s.action} title="Quick add: normal shift" aria-label={`Quick add shift for ${emp.name} on ${dateKey}`}
              onClick={e => { e.stopPropagation(); onQuickAdd(emp, day); }}>
              <Plus className="h-3 w-3" weight="light" />
            </button>
          )}
          {entry?.id != null && (
            <button type="button" className={`${s.action} ${s.actionDanger}`} title="Remove this day's entry only" aria-label={`Remove entry for ${emp.name} on ${dateKey}`}
              onClick={e => { e.stopPropagation(); onQuickRemove(emp, entry); }}>
              <X className="h-3 w-3" weight="light" />
            </button>
          )}
        </div>
      </div>
    </TableCell>
  );
}
