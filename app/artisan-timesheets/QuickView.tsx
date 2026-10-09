// app/artisan-timesheets/QuickView.tsx — the whole month at a glance: one compact
// row per day (status, sign times, computed hours, standby), a totals foot, and a
// per-day expander breaking down every overtime record behind the figures. Hours
// are read-only; standby is the fillable manual input — drag its corner handle
// down a range, or tap/Enter it to fill to the end of the month. The table and the
// breakdown are the shared timesheet shells; this file owns the artisan behaviour.
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Checkbox, StatusBadge, cn } from '@/components/ui-system';
import { DayBreakdown } from '@/components/shared/timesheet/DayBreakdown';
import { DayTable, DayTableNum, type DayTableRow } from '@/components/shared/timesheet/DayTable';
import { otTypeLabel } from '@/components/shared/timesheet/overtimeLabels';
import { typeOf } from '@/app/leaves/leaveTypes';
import { formatDate } from '@/lib/format';
import { zimHolidayName } from '@/lib/zimHolidays';
import type { Sources } from './artisanLogic';
import { calcOtHours, pendingFootnoteText, pendingMonthTotals } from './autoPopulate';
import { calcArtisanTimesheetTotals } from './calcTotals';
import { dayStatusLabel, isLeaveDayStatus } from './dayStatus';
import { dayPart, groupOvertimeByShift, groupPendingOvertimeByShift, sameEmployee } from './shiftDay';
import type { ArtisanTimesheetDayRow } from './types';

/** Copy the standby toggle (and its hand-set flag) from source down to endIndex inclusive. */
export function fillStandbyDown(
  rows: ArtisanTimesheetDayRow[],
  sourceIndex: number,
  endIndex: number,
): ArtisanTimesheetDayRow[] {
  if (sourceIndex < 0 || endIndex <= sourceIndex || sourceIndex >= rows.length) return rows;
  const cappedEnd = Math.min(endIndex, rows.length - 1);
  const value = rows[sourceIndex].on_standby;
  return rows.map((row, i) => {
    if (i <= sourceIndex || i > cappedEnd) return row;
    // Nobody works on leave: standby copied down a range never lands on a leave
    // day — a stale one there is cleared instead. A leave day already off is left
    // untouched so the fill does not dirty it.
    if (isLeaveDayStatus(row.day_status)) return row.on_standby ? { ...row, on_standby: false, _standbyManual: true, _auto: false } : row;
    return { ...row, on_standby: value, _standbyManual: true, _auto: false };
  });
}

const EDGE = 48;
const STEP = 16;

const COLUMNS = [
  { header: 'Date' },
  { header: 'Day' },
  { header: 'Status' },
  { header: 'Normal', align: 'center' as const },
  { header: 'OT 1.5', align: 'center' as const },
  { header: 'OT 2.0', align: 'center' as const },
  { header: 'Standby', align: 'center' as const, compact: true },
  { header: 'In', align: 'center' as const },
  { header: 'Out', align: 'center' as const },
];

export function QuickView({ rows, employeeMineNo, sources, onChange }: {
  rows: ArtisanTimesheetDayRow[];
  employeeMineNo: string;
  sources: Sources;
  onChange: (rows: ArtisanTimesheetDayRow[]) => void;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const suppressClick = useRef(false);
  const [drag, setDrag] = useState<{ source: number; end: number } | null>(null);
  const totals = calcArtisanTimesheetTotals(rows);
  const standbyDays = rows.filter(r => r.on_standby).length;

  const otByShift = useMemo(() => groupOvertimeByShift(sources.overtime, employeeMineNo), [sources.overtime, employeeMineNo]);
  const approvedLeaves = useMemo(
    () => sources.leaves
      .filter(l => l.status === 'approved' && sameEmployee(l.employee_id, employeeMineNo))
      .map(l => ({ ...l, start_date: dayPart(l.start_date), end_date: dayPart(l.end_date) })),
    [sources.leaves, employeeMineNo],
  );
  const leaveOn = (date: string) => approvedLeaves.find(l => date >= l.start_date && date <= l.end_date);
  const pendingOtByShift = useMemo(() => groupPendingOvertimeByShift(sources.overtime, employeeMineNo), [sources.overtime, employeeMineNo]);
  const pendingLeaves = useMemo(
    () => sources.leaves
      .filter(l => l.status === 'pending' && sameEmployee(l.employee_id, employeeMineNo))
      .map(l => ({ ...l, start_date: dayPart(l.start_date), end_date: dayPart(l.end_date) })),
    [sources.leaves, employeeMineNo],
  );
  const pendingLeaveOn = (date: string) => pendingLeaves.find(l => date >= l.start_date && date <= l.end_date);
  const pendingFootnote = useMemo(() => {
    if (rows.length === 0) return '';
    return pendingFootnoteText(pendingMonthTotals(sources, employeeMineNo, Number(rows[0].date.slice(0, 4)), Number(rows[0].date.slice(5, 7))));
  }, [rows, sources, employeeMineNo]);

  const update = (i: number, patch: Partial<ArtisanTimesheetDayRow>) =>
    onChange(rows.map((r, n) => (n === i ? { ...r, ...patch, _auto: false } : r)));

  const fill = (source: number, end: number) => {
    if (end <= source) return;
    onChange(fillStandbyDown(rows, source, end));
    const n = end - source;
    toast.success(`Standby copied to ${n} ${n === 1 ? 'day' : 'days'}.`);
  };

  useEffect(() => {
    if (!drag) return;
    const move = (e: MouseEvent) => {
      const el = scroller.current;
      if (el) {
        const r = el.getBoundingClientRect();
        if (e.clientY > r.bottom - EDGE) el.scrollTop += STEP; else if (e.clientY < r.top + EDGE) el.scrollTop -= STEP;
        if (e.clientX > r.right - EDGE) el.scrollLeft += STEP; else if (e.clientX < r.left + EDGE) el.scrollLeft -= STEP;
      }
      const tr = document.elementFromPoint(e.clientX, e.clientY)?.closest('tr[data-row-index]');
      const idx = tr ? Number(tr.getAttribute('data-row-index')) : NaN;
      if (!Number.isNaN(idx) && idx > drag.source) setDrag(prev => (prev ? { ...prev, end: Math.min(idx, rows.length - 1) } : null));
    };
    const up = () => {
      if (drag.end > drag.source) { fill(drag.source, drag.end); suppressClick.current = true; }
      setDrag(null);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    return () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag, rows]);

  const inRange = (i: number) => !!drag && i > drag.source && i <= drag.end;
  const isSource = (i: number) => !!drag && drag.source === i;

  const tableRows: DayTableRow[] = rows.map((r, i) => {
    const entries = otByShift.get(r.date) ?? [];
    const leave = leaveOn(r.date);
    const pendingEntries = pendingOtByShift.get(r.date) ?? [];
    const pendingLeave = pendingLeaveOn(r.date);
    const holiday = zimHolidayName(r.date);
    const breakable = entries.length > 0 || !!leave || !!holiday || pendingEntries.length > 0 || !!pendingLeave;
    const warnings: string[] = [];
    if (holiday && (entries.length > 0 || pendingEntries.length > 0)) warnings.push('There is no overtime on a public holiday — these records are not counted.');
    if (leave && entries.length > 0) warnings.push('There is no overtime on leave — these records are not counted.');
    return {
      key: r.date,
      dataIndex: i,
      highlight: r.on_standby,
      cellClassNames: [undefined, undefined, undefined, undefined, undefined, undefined,
        cn('group relative', inRange(i) && '!bg-action-soft', isSource(i) && 'ring-1 ring-inset ring-action'),
        undefined, undefined],
      cells: [
        <span key="date">
          {formatDate(r.date)}
          {r._auto && <span className="ml-1 inline-block size-1.5 rounded-full bg-action align-middle" title="Filled from leave, overtime, standby or holidays"><span className="sr-only">Filled from the system</span></span>}
        </span>,
        <span key="day" className="text-ink-muted">{r.day}</span>,
        <span key="status">
          <span className="block max-w-36 truncate">{r.day_status ? dayStatusLabel(r.day_status) : '—'}</span>
          {(pendingEntries.length > 0 || pendingLeave) && <StatusBadge tone="warning">Pending</StatusBadge>}
        </span>,
        <DayTableNum key="normal" value={r.normal_hrs} />,
        <DayTableNum key="ot15" value={r.ot_15} bold />,
        <DayTableNum key="ot20" value={r.ot_20} />,
        <span key="standby">
          <Checkbox
            label={<span className="sr-only">Standby on {formatDate(r.date)}</span>}
            checked={r.on_standby}
            disabled={isLeaveDayStatus(r.day_status) && !r.on_standby}
            title={isLeaveDayStatus(r.day_status) ? 'Nobody works on leave — standby stays off on leave days.' : undefined}
            onChange={e => update(i, { on_standby: e.target.checked, _standbyManual: true })}
            className="justify-center"
            aria-label={`Standby on ${formatDate(r.date)}`}
          />
          <button
            type="button"
            title="Drag to copy standby down. Tap or press Enter to copy it to the end of the month."
            aria-label={`Copy standby down from ${formatDate(r.date)}`}
            onMouseDown={e => { e.preventDefault(); e.stopPropagation(); setDrag({ source: i, end: i }); }}
            onClick={() => { if (suppressClick.current) { suppressClick.current = false; return; } fill(i, rows.length - 1); }}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fill(i, rows.length - 1); } }}
            className={cn('focus-ring absolute bottom-0 right-0 z-10 size-3 cursor-ns-resize rounded-br-xs border-b-2 border-r-2 transition-opacity', isSource(i) ? 'border-action opacity-90' : 'border-line-strong opacity-0 hover:border-action hover:!opacity-100 focus-visible:opacity-100 group-hover:opacity-70')}
          />
        </span>,
        <span key="in" className="tabular text-ink">{r.sign_in_time || <span className="text-ink-subtle">—</span>}</span>,
        <span key="out" className="tabular text-ink">{r.sign_out_time || <span className="text-ink-subtle">—</span>}</span>,
      ],
      detail: breakable ? {
        id: `qv-${r.date}`,
        label: formatDate(r.date),
        content: (
          <DayBreakdown
            dateLabel={formatDate(r.date)}
            records={entries.map((ot, n) => ({ key: `${ot.date}-${ot.start_time}-${ot.end_time}-${n}`, tag: otTypeLabel(ot.overtime_type), time: `${ot.start_time || '?'}–${ot.end_time || '?'} (${calcOtHours(ot).toFixed(2)}h)`, note: ot.reason }))}
            pendingRecords={pendingEntries.map((ot, n) => ({ key: `pending-${ot.date}-${ot.start_time}-${ot.end_time}-${n}`, tag: otTypeLabel(ot.overtime_type), time: `${ot.start_time || '?'}–${ot.end_time || '?'} (${calcOtHours(ot).toFixed(2)}h)`, note: ot.reason }))}
            warnings={warnings}
            leaveLine={leave ? `Leave: ${leave.leave_type} ${leave.start_date} → ${leave.end_date}${leave.reason?.trim() ? ` — ${leave.reason.trim()}` : ''}` : undefined}
            pendingLeaveLine={pendingLeave ? `Leave requested: ${typeOf(pendingLeave.leave_type).name} ${pendingLeave.start_date} → ${pendingLeave.end_date}${pendingLeave.reason?.trim() ? ` — ${pendingLeave.reason.trim()}` : ''}` : undefined}
            holidayLine={holiday ? `Public holiday: ${holiday}.` : undefined}
            standbyLine={`Standby ${r.on_standby ? 'on' : 'off'}${r._standbyManual ? ' (set by hand)' : r.on_standby ? ' (shift roster)' : ''}.`}
            emptyText="No overtime, leave or holiday records — sign times and notes were entered by hand."
          />
        ),
      } : undefined,
    };
  });

  return (
    <DayTable
      caption="Every day of the month: status, sign times, computed hours and standby"
      regionLabel="Month at a glance (scrollable)"
      columns={COLUMNS}
      rows={tableRows}
      footerLabel="Totals"
      footerLabelSpan={3}
      footerCells={[
        { content: totals.normal_hrs.toFixed(2) },
        { content: totals.ot_15.toFixed(2) },
        { content: totals.ot_20.toFixed(2) },
        { content: <>{standbyDays}<span className="sr-only"> days on standby</span></>, title: 'Days on standby' },
        { content: <span className="sr-only">No total for sign times</span>, colSpan: 2 },
      ]}
      footerFiller={<span className="sr-only">No total for breakdown</span>}
      footnote={pendingFootnote}
      filling={!!drag}
      scrollRef={scroller}
    />
  );
}
