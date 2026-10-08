// app/timesheets/TimesheetGrid.tsx — the roster against the days of the period: a sticky person column, one cell a day (open it, quick add or
// remove, or fill across days), a bulk assign on each date, and the six totals for each person with the period totals underneath. The
// fill, the quick actions and the totals are exactly the old page's; only the presentation moved to the shared system.
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Checkbox, EmptyState, cn } from '@/components/ui-system';
import { zimHolidayName } from '@/lib/zimHolidays';
import { DOUBLE_TIME_STATUSES, NEC_REG_CAP, ZERO_HOUR_STATUSES } from './calcTotals';
import { fillTargetDayIndices, isFillProtectedTarget } from './fillEntry';
import { attachFillPointerDrag, type FillDragState } from './fillDrag';
import { ModuleApprovalIndicator } from './ModuleApprovalIndicator';
import { moduleApprovalDescription } from './moduleApproval';
import { TimesheetDayCell } from './TimesheetDayCell';
import { TimesheetEmployeeCell } from './TimesheetEmployeeCell';
import { fmtDate, normalShiftHours, statusMeta } from './timesheetMeta';
import type { Employee, HourTotals, StatusKey, TimesheetEntry } from './types';

/** Accessible summary for a cell: the status, times and hours, plus where it came from. */
export function entryCellTitle(entry: TimesheetEntry): string {
  const parts: string[] = [statusMeta(entry.status).label];
  if (entry.start_time && entry.end_time) parts.push(`${entry.start_time} to ${entry.end_time}`);
  if (!ZERO_HOUR_STATUSES.has(entry.status)) {
    if (DOUBLE_TIME_STATUSES.has(entry.status as StatusKey)) parts.push(`${((entry.holiday_overtime_hours || 0) + (entry.regular_hours || 0)).toFixed(1)}h at 2.0×`);
    else {
      parts.push(`${(entry.regular_hours || 0).toFixed(1)}h regular`);
      if ((entry.overtime_hours || 0) > 0) parts.push(`+${entry.overtime_hours!.toFixed(1)}h overtime at 1.5×`);
      if ((entry.holiday_overtime_hours || 0) > 0) parts.push(`+${entry.holiday_overtime_hours!.toFixed(1)}h overtime at 2.0×`);
    }
    if ((entry.callout_overtime_hours || 0) > 0) parts.push(`${entry.callout_overtime_hours!.toFixed(1)}h callout`);
  }
  if (entry.standby_allowance) parts.push('Standby');
  const approval = moduleApprovalDescription(entry);
  if (approval) parts.push(approval);
  if (entry._auto) parts.push('Derived entry: click to review');
  if (entry.notes) parts.push(entry.notes);
  return parts.join(', ');
}

const TH = 'sticky top-0 z-30 bg-surface-muted border-b border-line px-1 py-2 text-center font-sans text-caption font-semibold text-ink-muted';
const num = 'px-2 py-2 text-center font-sans text-body-sm tabular text-ink border-b border-line-subtle';

export function TimesheetGrid({ employees, timesheets, days, getHourTotals, onCellClick, onQuickAdd, onQuickRemove, onBulkAssign, onBulkDay, onRemoveEmployee, onFillDays, selectedEmployeeIds, onToggleEmployeeSelect, onToggleAllEmployeeSelect }: {
  employees: Employee[]; timesheets: TimesheetEntry[]; days: Date[]; getHourTotals: (empId: string) => HourTotals;
  onCellClick: (emp: Employee, day: Date, entry?: TimesheetEntry) => void; onQuickAdd: (emp: Employee, day: Date) => void; onQuickRemove: (emp: Employee, entry: TimesheetEntry) => void;
  onBulkAssign: (emp: Employee) => void; onBulkDay: (day: Date) => void; onRemoveEmployee: (id: string) => void;
  onFillDays: (emp: Employee, sourceDay: Date, targetDays: Date[], sourceEntry?: TimesheetEntry) => Promise<void>;
  selectedEmployeeIds: Set<string>; onToggleEmployeeSelect: (id: string) => void; onToggleAllEmployeeSelect: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const getEntry = useCallback((eid: string, d: Date) => timesheets.find(ts => String(ts.employee_id) === String(eid) && ts.date === fmtDate(d)), [timesheets]);
  const today = fmtDate(new Date());
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [fillDrag, setFillDrag] = useState<FillDragState | null>(null);
  const fillCleanupRef = useRef<(() => void) | null>(null);
  const suppressCellClickUntil = useRef(0);
  const fillKeyboardRef = useRef<FillDragState | null>(null);

  const commitFillDrag = useCallback((drag: FillDragState) => {
    const emp = employees.find(e => e.id === drag.empId);
    if (!emp || drag.endDayIndex === drag.sourceDayIndex) return;
    suppressCellClickUntil.current = Date.now() + 450;
    const sourceDay = days[drag.sourceDayIndex];
    const targets = fillTargetDayIndices(drag.sourceDayIndex, drag.endDayIndex).map(i => days[i]);
    if (targets.length === 0) return;
    void onFillDays(emp, sourceDay, targets, getEntry(emp.id, sourceDay));
  }, [employees, days, onFillDays, getEntry]);

  const endFillSession = useCallback(() => { fillCleanupRef.current?.(); fillCleanupRef.current = null; fillKeyboardRef.current = null; setFillDrag(null); }, []);
  const beginFillPointer = useCallback((empId: string, dayIndex: number, e: React.PointerEvent<HTMLElement>) => {
    endFillSession();
    fillCleanupRef.current = attachFillPointerDrag({
      empId, sourceDayIndex: dayIndex, pointerId: e.pointerId, captureEl: e.currentTarget, startClientX: e.clientX, startClientY: e.clientY, scrollEl: scrollRef.current,
      onPreview: setFillDrag, onCommit: drag => { setFillDrag(null); commitFillDrag(drag); }, onCancel: () => setFillDrag(null),
    });
  }, [commitFillDrag, endFillSession]);
  useEffect(() => () => { fillCleanupRef.current?.(); }, []);

  // Keyboard fill: Enter on a handle starts it, the arrow keys extend it, Enter applies it, Escape cancels.
  useEffect(() => {
    if (!fillDrag || fillCleanupRef.current) return;
    fillKeyboardRef.current = fillDrag;
    const onKeyDown = (e: KeyboardEvent) => {
      if (!fillKeyboardRef.current) return;
      if (e.key === 'Escape') { endFillSession(); return; }
      if (e.key === 'Enter') { e.preventDefault(); const d = fillKeyboardRef.current; endFillSession(); if (d) commitFillDrag(d); return; }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        const delta = e.key === 'ArrowRight' ? 1 : -1;
        setFillDrag(prev => { if (!prev) return null; const next = { ...prev, endDayIndex: Math.max(0, Math.min(days.length - 1, prev.endDayIndex + delta)) }; fillKeyboardRef.current = next; return next; });
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [fillDrag, days.length, commitFillDrag, endFillSession]);

  const isFillPreview = (empId: string, dayIndex: number) => {
    if (!fillDrag || fillDrag.empId !== empId) return false;
    const lo = Math.min(fillDrag.sourceDayIndex, fillDrag.endDayIndex); const hi = Math.max(fillDrag.sourceDayIndex, fillDrag.endDayIndex);
    return dayIndex >= lo && dayIndex <= hi && dayIndex !== fillDrag.sourceDayIndex;
  };

  if (employees.length === 0) return <EmptyState icon="employees" title="No employees on this roster" description='Set NEC or Salaried on the Employees page, or use "Add employees" to add someone by hand.' />;

  const hint = fillDrag && (() => {
    const emp = employees.find(e => e.id === fillDrag.empId);
    const n = fillTargetDayIndices(fillDrag.sourceDayIndex, fillDrag.endDayIndex).length;
    const src = getEntry(fillDrag.empId, days[fillDrag.sourceDayIndex]);
    return { n, off: !!src && ZERO_HOUR_STATUSES.has(src.status), hrs: src?.regular_hours ?? (emp ? normalShiftHours(emp.position) : 8) };
  })();
  const allSelected = employees.length > 0 && employees.every(e => selectedEmployeeIds.has(e.id));
  const grand = employees.reduce((a, e) => { const t = getHourTotals(e.id); return { reg: a.reg + t.reg, ot15: a.ot15 + t.ot15, ot20: a.ot20 + t.ot20, standby: a.standby + t.standbyBonus, night: a.night + t.nightAllowanceBonus, actual: a.actual + t.actual }; }, { reg: 0, ot15: 0, ot20: 0, standby: 0, night: 0, actual: 0 });

  return (
    <div className="flex flex-col gap-2">
      {hint && <p role="status" aria-live="polite" className="rounded-control border border-line bg-action-soft px-3 py-2 font-sans text-caption text-ink"><strong>Fill:</strong> {hint.off ? 'Off' : `${hint.hrs}h`} to {hint.n} {hint.n === 1 ? 'day' : 'days'}. Escape cancels{hint.n > 0 ? ', Enter applies' : ''}.</p>}
      <div className="flex flex-wrap items-center gap-3 px-1 font-sans text-caption text-ink-muted"><span>Leaves and overtime</span><ModuleApprovalIndicator approval={{ approved: 1, pending: 1 }} legend /></div>
      {/* A scrollable region must be keyboard-focusable so keyboard users can scroll it. */}
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
      <div ref={scrollRef} tabIndex={0} role="region" aria-label="Timesheet grid (scrollable)" className={cn('max-h-[min(72dvh,880px)] min-h-72 overflow-auto rounded-card border border-line', fillDrag && 'cursor-ew-resize select-none')}>
        <table className="w-full border-separate border-spacing-0">
          <caption className="sr-only">Timesheet: one row for each person, one column for each day, then their totals</caption>
          <thead>
            <tr>
              <th scope="col" className={cn(TH, 'left-0 z-40 min-w-44 border-r px-3 text-left sm:min-w-56')}>
                <div className="flex items-center gap-2"><Checkbox aria-label="Select all employees in the grid" checked={allSelected} onChange={onToggleAllEmployeeSelect} /><span>Employee</span></div>
              </th>
              {days.map(d => {
                const ds = fmtDate(d); const holiday = zimHolidayName(ds); const wk = d.getDay() === 0 || d.getDay() === 6;
                return (
                  <th key={ds} scope="col" className={cn(TH, 'min-w-[4.75rem] px-0.5', holiday && 'bg-action-soft')}>
                    <button type="button" aria-label={holiday ? `Bulk assign ${holiday}, ${ds}` : `Bulk assign all employees on ${ds}`} title={holiday ? `${holiday}: bulk assign this day` : 'Bulk assign this day for everyone'} onClick={() => onBulkDay(d)}
                      className="focus-ring flex w-full flex-col items-center gap-0.5 rounded-control py-1.5 hover:bg-surface-subtle">
                      <span className={wk ? 'text-ink-subtle' : undefined}>{d.toLocaleDateString('en-GB', { weekday: 'short' })}</span>
                      <span className={cn('font-sans text-body-sm tabular', ds === today ? 'font-bold text-ink' : 'text-ink')}>{d.getDate()}</span>
                      <span className="text-[0.6875rem] font-normal">{holiday ? 'Holiday' : d.toLocaleDateString('en-GB', { month: 'short' })}</span>
                    </button>
                  </th>
                );
              })}
              <th scope="col" className={cn(TH, 'min-w-14')} title="Uncapped normal hours for the period (leave counts as 8h). Not reduced when excess goes to overtime.">Actual</th>
              <th scope="col" className={cn(TH, 'min-w-14')} title={`NEC: ${NEC_REG_CAP} when Actual is under the cap and there are no Absent days (Off days still allow the floor).`}>Reg</th>
              <th scope="col" className={cn(TH, 'min-w-14')} title={`max(Actual - ${NEC_REG_CAP}, 0) + the 1.5× overtime from the Overtime module.`}>1.5×</th>
              <th scope="col" className={cn(TH, 'min-w-14')}>2.0×</th>
              <th scope="col" className={cn(TH, 'min-w-16')}>Standby</th>
              <th scope="col" className={cn(TH, 'min-w-16')} title="Period total: 18:00 to 06:00 from shift times (and overtime after shift end).">Night</th>
            </tr>
          </thead>
          <tbody>
            {employees.map(emp => {
              const t = getHourTotals(emp.id);
              const excess = t.excess || 0; const added = t.ot15Module ?? Math.max(0, t.ot15 - excess);
              return (
                <tr key={emp.id} className="group/row hover:bg-surface-subtle/50">
                  <TimesheetEmployeeCell emp={emp} confirmRemoveId={confirmRemoveId} setConfirmRemoveId={setConfirmRemoveId} selected={selectedEmployeeIds.has(emp.id)} onToggleSelect={onToggleEmployeeSelect} onBulkAssign={onBulkAssign} onRemoveEmployee={onRemoveEmployee} />
                  {days.map((day, dayIndex) => {
                    const entry = getEntry(emp.id, day);
                    return (
                      <TimesheetDayCell key={fmtDate(day)} emp={emp} day={day} dayIndex={dayIndex} dateKey={fmtDate(day)} entry={entry} fillPreview={isFillPreview(emp.id, dayIndex)} fillSource={fillDrag?.empId === emp.id && fillDrag.sourceDayIndex === dayIndex}
                        fillBlocked={!!entry && isFillProtectedTarget(entry)} today={today} onCellClick={onCellClick} onQuickAdd={onQuickAdd} onQuickRemove={onQuickRemove} beginFillPointer={beginFillPointer} endFillSession={endFillSession}
                        setFillDrag={setFillDrag} fillKeyboardRef={fillKeyboardRef} suppressCellClickUntil={suppressCellClickUntil} entryCellTitle={entryCellTitle} />
                    );
                  })}
                  <td className={num} title="Uncapped normal hours">{t.actual.toFixed(1)}</td>
                  <td className={cn(num, 'font-semibold')} title={`Payable regular (cap ${NEC_REG_CAP})${excess > 0 ? `, ${excess.toFixed(1)}h over the cap is paid at 1.5×` : ''}`}>{t.reg.toFixed(1)}</td>
                  <td className={cn(num, 'cursor-help')} title={[`1.5× = max(0, Actual - ${NEC_REG_CAP}) + other 1.5× overtime`, `= max(0, ${t.actual.toFixed(1)} - ${NEC_REG_CAP}) + ${added.toFixed(1)}`, `= ${excess.toFixed(1)} + ${added.toFixed(1)} = ${t.ot15.toFixed(1)}`].join('\n')}>{t.ot15.toFixed(1)}</td>
                  <td className={num}>{t.ot20.toFixed(1)}</td>
                  <td className={num}>{t.standbyBonus.toFixed(1)}</td>
                  <td className={num}>{t.nightAllowanceBonus.toFixed(1)}</td>
                </tr>
              );
            })}
            <tr className="bg-surface-muted font-semibold">
              <th scope="row" className="sticky left-0 z-20 border-r border-t-2 border-line bg-surface-muted px-3 py-3 text-left"><p className="font-sans text-label text-ink">Period totals</p><p className="font-sans text-caption font-normal text-ink-muted">{employees.length} {employees.length === 1 ? 'employee' : 'employees'}</p></th>
              {days.map(day => {
                const sum = employees.reduce((s, emp) => { const e = getEntry(emp.id, day); return s + (e?.regular_hours || 0) + (e?.overtime_hours || 0); }, 0);
                return <td key={fmtDate(day)} className="border-t-2 border-line px-0.5 py-3 text-center font-sans text-caption font-normal tabular text-ink-muted">{sum > 0 ? sum.toFixed(0) : ''}</td>;
              })}
              {[grand.actual, grand.reg, grand.ot15, grand.ot20, grand.standby, grand.night].map((v, i) => <td key={i} className="border-t-2 border-line px-2 py-3 text-center font-sans text-body tabular text-ink">{v.toFixed(1)}</td>)}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
