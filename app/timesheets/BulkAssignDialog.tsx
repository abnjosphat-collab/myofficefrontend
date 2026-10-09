// app/timesheets/BulkAssignDialog.tsx — enter or clear shifts for many people and many days at once: choose the people, the status and the
// shift (set times, or the normal shift for each person's role), pick days on the calendar (click a first and a second day for a range,
// or use a quick pick), then Apply or Clear. Every write can be undone from the toast that follows.
'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button, Checkbox, Dialog, Field, Input, Notice, Segmented, Select, StatusBadge, cn } from '@/components/ui-system';
import { ShiftTimeRange } from '@/components/shared/ShiftTimeRange';
import { TIMESHEET_BULK_SHIFT_PRESETS } from '@/lib/shiftTimePresets';
import { recordShiftTimeUsage } from '@/lib/shiftTimePresetsPersonal';
import { LEAVE_STATUSES, ZERO_HOUR_STATUSES } from './calcTotals';
import { buildBulkEntries, datesInRange, estimatedHours, missingOnDays, normalShiftBreakdown, perDay, weekDates, weekdayDates, type BulkSettings } from './bulkAssign';
import { STATUS_KEYS, fmtDate, fmtPeriod, getDays, normalShiftHours, statusMeta } from './timesheetMeta';
import type { Employee, Period, StatusKey, TimesheetEntry } from './types';
import { formatFullDate } from '@/lib/format';

const STATUS_OPTIONS = STATUS_KEYS.map(k => ({ value: k as string, label: statusMeta(k).label }));
const WEEK = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

export function BulkAssignDialog({ initialEmployee, allEmployees, period, timesheets, prefillDates, initialSelectedEmployeeIds, onSave, onClear, onClose }: {
  initialEmployee: Employee; allEmployees: Employee[]; period: Period; timesheets: TimesheetEntry[]; prefillDates?: string[]; initialSelectedEmployeeIds?: string[];
  onSave: (entries: Omit<TimesheetEntry, 'id'>[]) => Promise<void>; onClear: (targets: { employee_id: number; date: string }[]) => Promise<void>; onClose: () => void;
}) {
  const days = useMemo(() => getDays(period), [period]);
  const [empIds, setEmpIds] = useState<Set<string>>(() => new Set(initialSelectedEmployeeIds?.length ? initialSelectedEmployeeIds : [initialEmployee.id]));
  const [dates, setDates] = useState<Set<string>>(() => new Set(prefillDates ?? []));
  const [anchor, setAnchor] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [status, setStatus] = useState<StatusKey>('work');
  const [startTime, setStartTime] = useState('07:00');
  const [endTime, setEndTime] = useState('17:00');
  const [byRole, setByRole] = useState(false);
  const [skipWeekends, setSkipWeekends] = useState(false);
  const [standby, setStandby] = useState(false);
  const [from, setFrom] = useState(fmtDate(period.start));
  const [to, setTo] = useState(fmtDate(period.end));
  const [busy, setBusy] = useState<'apply' | 'clear' | null>(null);
  const [applied, setApplied] = useState<{ days: number; people: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const settings: BulkSettings = { status, startTime, endTime, useNormalShift: byRole, standby };
  const leaveOrZero = LEAVE_STATUSES.has(status) || ZERO_HOUR_STATUSES.has(status);
  const day = perDay(settings);
  const ids = [...empIds];
  const entriesCount = dates.size * empIds.size;
  const total = estimatedHours(settings, ids, allEmployees, dates.size);
  const breakdown = useMemo(() => (byRole ? normalShiftBreakdown(empIds, allEmployees) : []), [byRole, empIds, allEmployees]);
  const preview = useMemo(() => {
    if (!anchor || !hover) return new Set<string>();
    const [a, b] = anchor < hover ? [anchor, hover] : [hover, anchor];
    return new Set(days.map(fmtDate).filter(ds => ds >= a && ds <= b));
  }, [anchor, hover, days]);

  const toggleEmp = (id: string) => setEmpIds(s => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const addDates = (list: string[]) => setDates(s => { const n = new Set(s); list.forEach(x => n.add(x)); return n; });
  const clickDay = (ds: string) => {
    const d = days.find(x => fmtDate(x) === ds);
    if (!d || (skipWeekends && (d.getDay() === 0 || d.getDay() === 6))) return;
    if (!anchor) { setAnchor(ds); setDates(s => { const n = new Set(s); if (n.has(ds)) n.delete(ds); else n.add(ds); return n; }); return; }
    const [a, b] = anchor < ds ? [anchor, ds] : [ds, anchor];
    addDates(datesInRange(days, a, b, skipWeekends)); setAnchor(null); setHover(null);
  };
  const missing = () => {
    if (dates.size === 0) { toast.error('Pick at least one day on the calendar first.'); return; }
    const who = missingOnDays(allEmployees, timesheets, [...dates]);
    setEmpIds(new Set(who.map(e => e.id)));
    if (who.length === 0) toast.info('Everyone already has an entry on the selected days.'); else toast.success(`Selected ${who.length} without an entry on those days.`);
  };

  const apply = async () => {
    setError(null); setBusy('apply');
    try {
      await onSave(buildBulkEntries({ employeeIds: ids, dates: [...dates], settings, employees: allEmployees }));
      if (!byRole && !leaveOrZero) recordShiftTimeUsage(startTime, endTime);
      setApplied({ days: dates.size, people: empIds.size }); setDates(new Set()); setAnchor(null);
    } catch (e) { setError((e as Error).message); } finally { setBusy(null); }
  };
  const clear = async () => {
    setError(null); setBusy('clear');
    try { await onClear(ids.flatMap(eid => [...dates].map(ds => ({ employee_id: parseInt(eid), date: ds })))); setDates(new Set()); setAnchor(null); }
    catch (e) { setError((e as Error).message); } finally { setBusy(null); }
  };

  const today = fmtDate(new Date());
  return (
    <Dialog
      open onOpenChange={o => { if (!o && !busy) onClose(); }} size="xl" title="Bulk assign or clear shifts" description={`${fmtPeriod(period)}. Select days, then Apply to mark them or Clear to unmark them.`}
      footer={(
        <>
          <Button variant="ghost" onClick={onClose} disabled={!!busy}>Done</Button>
          <Button variant="danger" icon="delete" pending={busy === 'clear'} disabled={!!busy || entriesCount === 0} onClick={clear}>{entriesCount > 0 ? `Clear ${entriesCount}` : 'Clear'}</Button>
          <Button variant="primary" pending={busy === 'apply'} disabled={!!busy || entriesCount === 0} onClick={apply}>{entriesCount > 0 ? `Apply ${entriesCount} ${plural(entriesCount, 'entry', 'entries')}` : 'Apply'}</Button>
        </>
      )}
    >
      <div className="flex flex-col gap-5">
        {applied && <Notice tone="info" icon="success" title={`Applied ${applied.days} ${plural(applied.days, 'day', 'days')} for ${applied.people} ${plural(applied.people, 'person', 'people')}`}>Select more days to continue.</Notice>}
        {error && <Notice tone="danger" title="That did not work">{error}</Notice>}

        <section aria-label="People" className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-sans text-label font-semibold text-ink">People ({empIds.size} selected)</h3>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="ghost" onClick={missing}>Missing on selected days</Button>
              <Button size="sm" variant="ghost" onClick={() => setEmpIds(empIds.size === allEmployees.length ? new Set([initialEmployee.id]) : new Set(allEmployees.map(e => e.id)))}>{empIds.size === allEmployees.length ? 'Deselect all' : 'Select all'}</Button>
            </div>
          </div>
          <div role="group" aria-label="People to assign" className="flex max-h-32 flex-wrap gap-1.5 overflow-y-auto p-0.5">
            {allEmployees.map(e => <Button key={e.id} size="sm" variant={empIds.has(e.id) ? 'primary' : 'secondary'} aria-pressed={empIds.has(e.id)} onClick={() => toggleEmp(e.id)}>{e.name}{byRole && <span className="opacity-70"> {normalShiftHours(e.position)}h</span>}</Button>)}
          </div>
        </section>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Status"><Select aria-label="Status" value={status} onValueChange={v => setStatus(v as StatusKey)} options={STATUS_OPTIONS} /></Field>
          {!leaveOrZero && <Segmented label="Shift" value={byRole ? 'role' : 'times'} onValueChange={v => setByRole(v === 'role')} options={[{ value: 'times', label: 'Set times' }, { value: 'role', label: 'Normal, by role' }]} />}
        </div>
        {leaveOrZero && <p className="font-sans text-body-sm text-ink-muted">{LEAVE_STATUSES.has(status) ? `Leave is credited 8 hours on the standard shift (${statusMeta(status).label}).` : `${statusMeta(status).label} days are written with no hours.`}</p>}
        {!leaveOrZero && (byRole ? (
          <div className="rounded-control bg-surface-subtle p-3 font-sans text-body-sm text-ink">
            {breakdown.length === 0 ? <span className="text-ink-muted">Select people to see their normal hours.</span> : <><span className="font-medium">Each person gets their own role&apos;s normal shift:</span> {breakdown.map(([h, n]) => `${n} ${plural(n, 'person', 'people')} at ${h}h`).join(', ')}.</>}
          </div>
        ) : (
          <div className="rounded-control bg-surface-subtle p-3">
            <ShiftTimeRange start={startTime} end={endTime} builtin={TIMESHEET_BULK_SHIFT_PRESETS} onChange={(s, e) => { setStartTime(s); setEndTime(e); }}
              trailing={<div className="flex flex-col justify-end pb-1"><span className="font-sans text-caption text-ink-muted">Per person per day</span><span className="font-sans text-title font-semibold tabular text-ink">{day.hours.toFixed(1)}h</span>{day.night > 0 && <span className="font-sans text-caption text-ink-muted">{day.night.toFixed(1)}h night</span>}</div>} />
          </div>
        ))}
        <div className="flex flex-wrap gap-5">
          <Checkbox label="Skip weekends" checked={skipWeekends} onChange={e => setSkipWeekends(e.target.checked)} />
          <Checkbox label="Standby (a flat 8 hours of overtime for the period)" checked={standby} onChange={e => setStandby(e.target.checked)} />
        </div>

        <section aria-label="Days" className="flex flex-col gap-3">
          <h3 className="font-sans text-label font-semibold text-ink">Days</h3>
          <div role="group" aria-label="Quick picks" className="flex flex-wrap gap-1.5">
            <Button size="sm" variant="secondary" onClick={() => { setSkipWeekends(true); setDates(new Set(weekdayDates(days))); }}>Weekdays</Button>
            {[0, 1, 2, 3].map(w => <Button key={w} size="sm" variant="secondary" onClick={() => { addDates(weekDates(days, w, skipWeekends)); setAnchor(null); }}>Week {w + 1}</Button>)}
            <Button size="sm" variant="secondary" onClick={() => setDates(new Set(days.filter(d => !skipWeekends || (d.getDay() !== 0 && d.getDay() !== 6)).map(fmtDate)))}>All</Button>
            <Button size="sm" variant="ghost" icon="close" onClick={() => { setDates(new Set()); setAnchor(null); }}>Clear days</Button>
          </div>
          <div className="flex flex-wrap items-end gap-2 rounded-control bg-surface-subtle p-3">
            <Field label="From" className="w-40"><Input type="date" value={from} min={fmtDate(period.start)} max={fmtDate(period.end)} onChange={e => setFrom(e.target.value)} /></Field>
            <Field label="To" className="w-40"><Input type="date" value={to} min={fmtDate(period.start)} max={fmtDate(period.end)} onChange={e => setTo(e.target.value)} /></Field>
            <Button onClick={() => { addDates(datesInRange(days, from, to, skipWeekends)); setAnchor(null); }}>Add range</Button>
          </div>
          <p className="font-sans text-caption text-ink-muted" role="status">{anchor ? <>First day chosen. <strong className="text-ink">Click a second day</strong> to fill the range, or <button type="button" className="focus-ring underline" onClick={() => { setAnchor(null); setHover(null); }}>cancel</button>.</> : 'Click a day to choose it; click a second day to fill everything between.'}</p>
          <div className="grid grid-cols-7 gap-1" role="group" aria-label="Calendar">
            {WEEK.map(w => <div key={w} className="py-1 text-center font-sans text-caption font-semibold text-ink-muted">{w}</div>)}
            {Array.from({ length: days[0].getDay() }).map((_, i) => <div key={`b${i}`} />)}
            {days.map(d => {
              const ds = fmtDate(d); const wk = d.getDay() === 0 || d.getDay() === 6; const off = skipWeekends && wk; const sel = dates.has(ds); const isAnchor = anchor === ds; const inPreview = preview.has(ds) && !sel;
              const has = ids.some(eid => timesheets.some(ts => String(ts.employee_id) === String(eid) && ts.date === ds));
              return (
                <button key={ds} type="button" disabled={off} aria-pressed={sel} aria-label={`${formatFullDate(d)}${has ? ', has an entry' : ''}${isAnchor ? ', range start' : ''}`}
                  onClick={() => clickDay(ds)} onMouseEnter={() => anchor && setHover(ds)} onMouseLeave={() => anchor && setHover(null)}
                  className={cn('focus-ring relative h-10 rounded-control font-sans text-body-sm font-medium tabular transition-colors disabled:cursor-not-allowed disabled:opacity-30',
                    isAnchor ? 'bg-action text-action-ink ring-2 ring-focus' : sel ? 'bg-action text-action-ink' : inPreview ? 'bg-action-soft text-ink' : wk ? 'bg-surface-muted text-ink-muted hover:bg-surface-subtle' : 'bg-surface-subtle text-ink hover:bg-surface-muted', ds === today && 'ring-1 ring-ink-muted')}>
                  {d.getDate()}
                  {has && !sel && <span aria-hidden className="absolute bottom-1 left-1/2 size-1 -translate-x-1/2 rounded-full bg-success" />}
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 font-sans text-caption text-ink-muted">
            <span>Dark: chosen. Light: range preview. Dot: already has an entry for someone selected.</span>
            <span className="inline-flex items-center gap-2 font-semibold text-ink tabular">{dates.size} {plural(dates.size, 'day', 'days')} × {empIds.size} {plural(empIds.size, 'person', 'people')} = {entriesCount} {plural(entriesCount, 'entry', 'entries')}{entriesCount > 0 && total > 0 && <StatusBadge tone="neutral">{total.toFixed(0)}h</StatusBadge>}</span>
          </div>
        </section>
      </div>
    </Dialog>
  );
}
