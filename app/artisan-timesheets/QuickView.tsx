// app/artisan-timesheets/QuickView.tsx — the whole month at a glance: one compact
// row per day (status, sign times, computed hours, standby), a totals foot, and a
// per-day expander breaking down every overtime record behind the figures. Hours
// are read-only; standby is the fillable manual input — drag its corner handle
// down a range, or tap/Enter it to fill to the end of the month.
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Checkbox, Icon, StatusBadge, Tag, cn } from '@/components/ui-system';
import { typeOf } from '@/app/leaves/leaveTypes';
import type { ApprovedLeaveRecord, ApprovedOvertimeRecord } from '@/app/timesheets/types';
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

const OT_TYPE_LABELS: Record<string, string> = {
  weekend: 'Weekend', holiday: 'Holiday', regular: 'Regular',
  emergency: 'Emergency', project: 'Project', night: 'Night',
};
const otTypeLabel = (t: string) => OT_TYPE_LABELS[t] ?? (t ? t.charAt(0).toUpperCase() + t.slice(1) : 'Overtime');

const EDGE = 48;
const STEP = 16;

function Num({ value, bold }: { value: number; bold?: boolean }) {
  const zero = !value;
  return (
    <span className={cn('tabular', zero ? 'text-ink-subtle' : 'font-medium text-ink', bold && !zero && 'font-semibold text-action')}>
      {value.toFixed(2)}
    </span>
  );
}

function Breakdown({ date, entries, leave, pendingEntries, pendingLeave, holiday, standby, standbyManual }: {
  date: string;
  entries: ApprovedOvertimeRecord[];
  leave: ApprovedLeaveRecord | undefined;
  pendingEntries: ApprovedOvertimeRecord[];
  pendingLeave: ApprovedLeaveRecord | undefined;
  holiday: string | null;
  standby: boolean;
  standbyManual: boolean;
}) {
  return (
    <div className="flex flex-col gap-2 px-2 py-2 text-left">
      <p className="font-sans text-caption font-semibold text-ink">What makes up {formatDate(date)}</p>
      {entries.length === 0 && !leave && !holiday && pendingEntries.length === 0 && !pendingLeave && (
        <p className="font-sans text-body-sm text-ink-muted">No overtime, leave or holiday records — sign times and notes were entered by hand.</p>
      )}
      {holiday && (entries.length > 0 || pendingEntries.length > 0) && (
        <p className="font-sans text-caption font-semibold text-warning">There is no overtime on a public holiday — these records are not counted.</p>
      )}
      {leave && entries.length > 0 && (
        <p className="font-sans text-caption font-semibold text-warning">There is no overtime on leave — these records are not counted.</p>
      )}
      {entries.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {entries.map((ot, n) => (
            <li key={`${ot.date}-${ot.start_time}-${ot.end_time}-${n}`} className="flex flex-wrap items-center gap-x-2 gap-y-0.5 font-sans text-body-sm">
              <Tag>{otTypeLabel(ot.overtime_type)}</Tag>
              <span className="tabular text-ink">{ot.start_time || '?'}–{ot.end_time || '?'} ({calcOtHours(ot).toFixed(2)}h)</span>
              {ot.reason?.trim() && <span className="min-w-0 flex-1 basis-40 truncate text-ink-muted">{ot.reason.trim()}</span>}
            </li>
          ))}
        </ul>
      )}
      {leave && (
        <p className="font-sans text-body-sm text-ink-muted">
          Leave: {leave.leave_type} {leave.start_date} → {leave.end_date}{leave.reason?.trim() ? ` — ${leave.reason.trim()}` : ''}
        </p>
      )}
      {(pendingEntries.length > 0 || pendingLeave) && (
        <div className="flex flex-col gap-1">
          <p className="font-sans text-caption font-semibold text-warning">Awaiting approval — not counted in the hours above.</p>
          {pendingEntries.length > 0 && (
            <ul className="flex flex-col gap-1.5">
              {pendingEntries.map((ot, n) => (
                <li key={`pending-${ot.date}-${ot.start_time}-${ot.end_time}-${n}`} className="flex flex-wrap items-center gap-x-2 gap-y-0.5 font-sans text-body-sm">
                  <Tag>{otTypeLabel(ot.overtime_type)}</Tag>
                  <span className="tabular text-ink">{ot.start_time || '?'}–{ot.end_time || '?'} ({calcOtHours(ot).toFixed(2)}h)</span>
                  {ot.reason?.trim() && <span className="min-w-0 flex-1 basis-40 truncate text-ink-muted">{ot.reason.trim()}</span>}
                </li>
              ))}
            </ul>
          )}
          {pendingLeave && (
            <p className="font-sans text-body-sm text-ink-muted">
              Leave requested: {typeOf(pendingLeave.leave_type).name} {pendingLeave.start_date} → {pendingLeave.end_date}{pendingLeave.reason?.trim() ? ` — ${pendingLeave.reason.trim()}` : ''}
            </p>
          )}
        </div>
      )}
      {holiday && <p className="font-sans text-body-sm text-ink-muted">Public holiday: {holiday}.</p>}
      <p className="font-sans text-body-sm text-ink-muted">
        Standby {standby ? 'on' : 'off'}{standbyManual ? ' (set by hand)' : standby ? ' (shift roster)' : ''}.
      </p>
    </div>
  );
}

export function QuickView({ rows, employeeMineNo, sources, onChange }: {
  rows: ArtisanTimesheetDayRow[];
  employeeMineNo: string;
  sources: Sources;
  onChange: (rows: ArtisanTimesheetDayRow[]) => void;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const suppressClick = useRef(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
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

  const toggleExpand = (date: string) => setExpanded(prev => {
    const next = new Set(prev);
    if (next.has(date)) next.delete(date); else next.add(date);
    return next;
  });

  const inRange = (i: number) => !!drag && i > drag.source && i <= drag.end;
  const isSource = (i: number) => !!drag && drag.source === i;

  return (
    <div className={cn('overflow-hidden rounded-card border border-line', drag && 'select-none')}>
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex */}
      <div ref={scroller} tabIndex={0} role="region" aria-label="Month at a glance (scrollable)" className="max-h-[min(70vh,720px)] overflow-auto overscroll-contain">
        <table className="w-full min-w-[880px] border-collapse font-sans text-body-sm">
          <caption className="sr-only">Every day of the month: status, sign times, computed hours and standby</caption>
          <thead>
            <tr className="border-b border-line bg-surface-muted">
              {['Date', 'Day', 'Status', 'Normal', 'OT 1.5', 'OT 2.0', 'Standby', 'In', 'Out', ''].map((h, i) => (
                <th
                  key={h || 'expand'}
                  scope="col"
                  className={cn(
                    'sticky top-0 z-30 whitespace-nowrap bg-surface-muted px-2 py-2 font-sans text-caption font-semibold text-ink',
                    i === 0 && 'sticky left-0 z-50 text-left',
                    i > 0 && i < 3 && 'text-left',
                    i >= 3 && 'text-center',
                  )}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const entries = otByShift.get(r.date) ?? [];
              const leave = leaveOn(r.date);
              const pendingEntries = pendingOtByShift.get(r.date) ?? [];
              const pendingLeave = pendingLeaveOn(r.date);
              const holiday = zimHolidayName(r.date);
              const breakable = entries.length > 0 || !!leave || !!holiday || pendingEntries.length > 0 || !!pendingLeave;
              const open = expanded.has(r.date);
              return ([
                <tr
                  key={r.date}
                  data-row-index={i}
                  className={cn('border-b border-line-subtle', i % 2 ? 'bg-surface-subtle' : 'bg-surface', r.on_standby && '!bg-warning-soft/40')}
                >
                  <th scope="row" className={cn('sticky left-0 z-20 whitespace-nowrap px-2 py-1.5 text-left font-medium text-ink', i % 2 ? 'bg-surface-subtle' : 'bg-surface', r.on_standby && '!bg-warning-soft/40')}>
                    {formatDate(r.date)}
                    {r._auto && <span className="ml-1 inline-block size-1.5 rounded-full bg-action align-middle" title="Filled from leave, overtime, standby or holidays"><span className="sr-only">Filled from the system</span></span>}
                  </th>
                  <td className="px-2 py-1.5 text-ink-muted">{r.day}</td>
                  <td className="px-2 py-1.5 text-ink-muted">
                    <span className="block max-w-36 truncate">{r.day_status ? dayStatusLabel(r.day_status) : '—'}</span>
                    {(pendingEntries.length > 0 || pendingLeave) && <StatusBadge tone="warning">Pending</StatusBadge>}
                  </td>
                  <td className="px-2 py-1.5 text-center"><Num value={r.normal_hrs} /></td>
                  <td className="px-2 py-1.5 text-center"><Num value={r.ot_15} bold /></td>
                  <td className="px-2 py-1.5 text-center"><Num value={r.ot_20} /></td>
                  <td className={cn('group relative px-2 py-1 text-center', inRange(i) && '!bg-action-soft', isSource(i) && 'ring-1 ring-inset ring-action')}>
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
                  </td>
                  <td className="px-2 py-1.5 text-center tabular text-ink">{r.sign_in_time || <span className="text-ink-subtle">—</span>}</td>
                  <td className="px-2 py-1.5 text-center tabular text-ink">{r.sign_out_time || <span className="text-ink-subtle">—</span>}</td>
                  <td className="px-1 py-1 text-center">
                    {breakable && (
                      <button
                        type="button"
                        onClick={() => toggleExpand(r.date)}
                        aria-expanded={open}
                        aria-controls={`qv-${r.date}`}
                        aria-label={`${open ? 'Hide' : 'Show'} the breakdown for ${formatDate(r.date)}`}
                        className="focus-ring inline-grid size-8 place-items-center rounded-control text-ink-muted hover:bg-surface-muted hover:text-ink"
                      >
                        <Icon name="chevron-right" size="sm" className={cn('transition-transform duration-[var(--mo-duration-base)]', open && 'rotate-90')} />
                      </button>
                    )}
                  </td>
                </tr>,
                open && breakable && (
                  <tr key={`${r.date}-detail`} id={`qv-${r.date}`} className="border-b border-line bg-surface-subtle/60">
                    <td colSpan={10}>
                      <Breakdown date={r.date} entries={entries} leave={leave} pendingEntries={pendingEntries} pendingLeave={pendingLeave} holiday={holiday} standby={r.on_standby} standbyManual={!!r._standbyManual} />
                    </td>
                  </tr>
                ),
              ]);
            })}
          </tbody>
          <tfoot>
            {pendingFootnote && (
              <tr className="border-t border-line bg-surface-muted">
                <td colSpan={10} className="px-2 py-1.5 font-sans text-body-sm text-warning">{pendingFootnote}</td>
              </tr>
            )}
            <tr className="border-t-2 border-line bg-surface-muted font-semibold">
              <th scope="row" colSpan={3} className="sticky left-0 z-20 bg-surface-muted px-2 py-2 text-left font-sans text-body-sm text-ink">Totals</th>
              <td className="px-2 py-2 text-center font-sans text-body-sm tabular text-ink">{totals.normal_hrs.toFixed(2)}</td>
              <td className="px-2 py-2 text-center font-sans text-body-sm tabular text-ink">{totals.ot_15.toFixed(2)}</td>
              <td className="px-2 py-2 text-center font-sans text-body-sm tabular text-ink">{totals.ot_20.toFixed(2)}</td>
              <td className="px-2 py-2 text-center font-sans text-body-sm tabular text-ink" title="Days on standby">{standbyDays}<span className="sr-only"> days on standby</span></td>
              <td colSpan={2}><span className="sr-only">No total for sign times</span></td>
              <td><span className="sr-only">No total for breakdown</span></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
