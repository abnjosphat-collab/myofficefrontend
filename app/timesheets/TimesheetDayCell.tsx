'use client';

import { toast } from 'sonner';
import type { KeyboardEvent, MutableRefObject, PointerEvent } from 'react';
import { Icon, cn, type Tone } from '@/components/ui-system';
import { zimHolidayName } from '@/lib/zimHolidays';
import { DOUBLE_TIME_STATUSES, ZERO_HOUR_STATUSES } from './calcTotals';
import { canFillFromSource } from './fillEntry';
import type { FillDragState } from './fillDrag';
import { ModuleApprovalIndicator } from './ModuleApprovalIndicator';
import { dayCellHours, formatCellHours } from './timesheetCellDisplay';
import { statusMeta } from './timesheetMeta';
import type { Employee, StatusKey, TimesheetEntry } from './types';

const TONE: Record<Tone, string> = {
  neutral: 'bg-surface-subtle text-ink border-line-subtle', info: 'bg-info-soft text-info border-info-line', warning: 'bg-warning-soft text-warning border-warning-line',
  danger: 'bg-danger-soft text-danger border-danger-line', success: 'bg-success-soft text-success border-success-line', brand: 'bg-action-soft text-action border-line',
};
const SMALL = 'absolute z-10 inline-flex size-6 items-center justify-center rounded-full transition-opacity focus-ring';

/** One person's one day in the grid: the status, the hours and any overtime or standby, a click to open the day, a corner handle to
 *  fill across days (drag, or Enter then the arrow keys), and a quick add or remove. The text always names the status; colour only supports it. */
export function TimesheetDayCell({
  emp, day, dayIndex, dateKey, entry, fillPreview, fillSource, fillBlocked, today, onCellClick, onQuickAdd, onQuickRemove, beginFillPointer, endFillSession, setFillDrag, fillKeyboardRef, suppressCellClickUntil, entryCellTitle,
}: {
  emp: Employee; day: Date; dayIndex: number; dateKey: string; entry?: TimesheetEntry; fillPreview: boolean; fillSource: boolean; fillBlocked: boolean; today: string;
  onCellClick: (emp: Employee, day: Date, entry?: TimesheetEntry) => void; onQuickAdd: (emp: Employee, day: Date) => void; onQuickRemove: (emp: Employee, entry: TimesheetEntry) => void;
  beginFillPointer: (empId: string, dayIndex: number, e: PointerEvent<HTMLElement>) => void; endFillSession: () => void; setFillDrag: (drag: FillDragState) => void;
  fillKeyboardRef: MutableRefObject<FillDragState | null>; suppressCellClickUntil: MutableRefObject<number>; entryCellTitle: (entry: TimesheetEntry) => string;
}) {
  const weekend = day.getDay() === 0 || day.getDay() === 6;
  const isToday = dateKey === today;
  const holiday = zimHolidayName(dateKey);
  const meta = entry ? statusMeta(entry.status) : null;
  const shown = entry ? dayCellHours(entry) : null;
  const label = meta ? (entry!.status === 'work' ? '' : meta.short) : '';

  const startFillKey = (e: KeyboardEvent) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    // While a keyboard fill is running, Enter belongs to the grid (it applies the fill); starting another here would restart it from this cell.
    if (fillKeyboardRef.current) return;
    e.preventDefault(); e.stopPropagation();
    if (entry && !canFillFromSource(entry)) { toast.info('Use a work day or an Off cell as the source.'); return; }
    endFillSession();
    const drag = { empId: emp.id, sourceDayIndex: dayIndex, endDayIndex: dayIndex };
    fillKeyboardRef.current = drag; setFillDrag(drag);
  };
  const startFillPointer = (e: PointerEvent<HTMLElement>) => {
    if (e.button !== 0) return;
    e.preventDefault(); e.stopPropagation();
    if (entry && !canFillFromSource(entry)) { toast.info('Use a work day or an Off cell as the source.'); return; }
    beginFillPointer(emp.id, dayIndex, e);
  };

  return (
    <td className={cn('border-b border-line-subtle p-0.5 text-center', weekend && 'bg-surface-subtle', fillPreview && (fillBlocked ? '!bg-warning-soft' : '!bg-action-soft'))}>
      <div className="group/cell relative" data-fill-cell data-emp-id={emp.id} data-day-index={dayIndex} data-fill-source={fillSource ? 'true' : undefined}>
        <button
          type="button" title={entry ? entryCellTitle(entry) : holiday ? `${holiday}: add an entry` : isToday ? 'Add an entry for today' : 'Add an entry'}
          aria-label={entry ? `${emp.name}, ${dateKey}: ${entryCellTitle(entry)}` : `${emp.name}, ${dateKey}: no entry. Add one`}
          onClick={() => { if (Date.now() < suppressCellClickUntil.current) return; onCellClick(emp, day, entry); }}
          className={cn('focus-ring flex min-h-14 w-full flex-col items-center justify-center gap-0.5 rounded-control border px-1 py-1 font-sans text-caption tabular transition-colors',
            entry ? TONE[entry.status === 'work' ? 'neutral' : meta!.tone] : cn('border-dashed border-transparent text-ink-muted hover:bg-surface-muted', isToday && 'border-line-strong'),
            fillSource && 'ring-2 ring-focus', isToday && entry && 'ring-1 ring-ink-muted')}
        >
          {entry ? (
            <>
              {shown ? <span className="text-body-sm font-semibold">{formatCellHours(shown.hours)}<span className="font-normal">h</span>{shown.isDT && <span className="font-normal"> 2.0×</span>}</span>
                : !ZERO_HOUR_STATUSES.has(entry.status) ? null : <span className="font-semibold">{meta!.short}</span>}
              {shown && label && <span>{label}</span>}
              {!DOUBLE_TIME_STATUSES.has(entry.status as StatusKey) && (entry.overtime_hours || 0) > 0 && <span className="font-semibold">+{entry.overtime_hours!.toFixed(1)} OT</span>}
              {entry.standby_allowance && <span className="font-medium">SB</span>}
              <ModuleApprovalIndicator approval={entry._moduleApproval} />
            </>
          ) : <span aria-hidden className="text-ink-subtle [@media(hover:hover)]:invisible">+</span>}
        </button>
        {entry?._auto && !entry._moduleApproval && <span title="Derived entry: click to review" className="pointer-events-none absolute left-1 top-1 size-2 rounded-full bg-action" aria-hidden />}
        <div
          role="button" tabIndex={0} title="Drag across days to fill normal hours or Off. Overtime is not copied. From the keyboard: Enter, then the arrow keys, then Enter." aria-label={`Fill from ${dateKey}`}
          onPointerDown={startFillPointer} onKeyDown={startFillKey}
          className={cn('absolute bottom-0 right-0 z-0 inline-flex size-6 cursor-ew-resize touch-manipulation items-end justify-end rounded-tl-control border-l border-t border-line-strong bg-surface text-ink-muted focus-ring [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/cell:opacity-100 [@media(hover:hover)]:group-focus-within/cell:opacity-100')}
        ><Icon name="chevron-right" size="xs" /></div>
        {!entry && <button type="button" title="Quick add: the normal shift" aria-label={`Quick add a shift for ${emp.name} on ${dateKey}`} onClick={e => { e.stopPropagation(); onQuickAdd(emp, day); }} className={cn(SMALL, 'right-1 top-1 bg-success-soft text-success [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/cell:opacity-100 [@media(hover:hover)]:group-focus-within/cell:opacity-100')}><Icon name="plus" size="xs" /></button>}
        {entry?.id != null && <button type="button" title="Quick remove this day's entry" aria-label={`Remove the entry for ${emp.name} on ${dateKey}`} onClick={e => { e.stopPropagation(); onQuickRemove(emp, entry); }} className={cn(SMALL, 'right-1 top-1 bg-danger-soft text-danger [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/cell:opacity-100 [@media(hover:hover)]:group-focus-within/cell:opacity-100')}><Icon name="close" size="xs" /></button>}
      </div>
    </td>
  );
}
