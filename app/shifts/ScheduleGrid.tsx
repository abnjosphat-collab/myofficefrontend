// app/shifts/ScheduleGrid.tsx — the next four weeks for everyone in the roster: one row per person, one column per day.
// Each cell says what it is in words (an abbreviation and a tooltip, never colour alone) and opens the event dialog for
// that person and day. The first column stays in view while the days scroll sideways.
'use client';

import { useMemo, useState } from 'react';
import { Button, IconButton, StatusBadge, cn } from '@/components/ui-system';
import { d2s, buildHolidayMap, stripTime } from './calcShifts';
import { cellFor, timingFor } from './cellLogic';
import { DAY_STATUS, EVENT_TYPES, TONE_CELL, patternOf } from './shiftMeta';
import type { LeaveRecord, ShiftAssignment } from './types';

const WD = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const DAYS = 28;

export function ScheduleGrid({ assignments, leaves, onOpenEvent, onView }: {
  assignments: ShiftAssignment[]; leaves: LeaveRecord[]; onOpenEvent: (a: ShiftAssignment, ds: string) => void; onView: (a: ShiftAssignment) => void;
}) {
  const [offset, setOffset] = useState(0);
  const today = stripTime(new Date());
  const todayStr = d2s(today);
  const days = useMemo(() => {
    const start = new Date(today);
    start.setDate(start.getDate() + offset * 7);
    return Array.from({ length: DAYS }, (_, i) => { const d = new Date(start); d.setDate(d.getDate() + i); return d; });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offset, todayStr]);
  const holidays = useMemo(() => buildHolidayMap(days), [days]);
  const months = useMemo(() => {
    const spans: { label: string; count: number }[] = [];
    for (const d of days) {
      const label = d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
      if (spans.at(-1)?.label === label) spans[spans.length - 1].count += 1; else spans.push({ label, count: 1 });
    }
    return spans;
  }, [days]);
  const range = `${days[0].toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} to ${days[DAYS - 1].toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <IconButton icon="chevron-left" label="Previous 4 weeks" variant="outline" onClick={() => setOffset(o => o - 1)} />
        <span className="min-w-52 text-center font-sans text-label font-medium text-ink tabular" aria-live="polite">{range}</span>
        <IconButton icon="chevron-right" label="Next 4 weeks" variant="outline" onClick={() => setOffset(o => o + 1)} />
        {offset !== 0 && <Button onClick={() => setOffset(0)}>Today</Button>}
      </div>

      <div className="max-w-full overflow-auto rounded-card border border-line bg-surface shadow-card" tabIndex={0} role="region" aria-label="Four-week schedule (scrollable)">
        <table className="border-separate border-spacing-0 font-sans text-caption text-ink">
          <caption className="sr-only">Shift schedule for {range}</caption>
          <thead>
            <tr>
              <th scope="col" rowSpan={2} className="sticky left-0 top-0 z-20 min-w-48 border-b border-r border-line bg-surface-subtle px-3 py-2 text-left font-sans text-label font-semibold text-ink">Employee</th>
              {months.map(m => <th key={m.label} scope="colgroup" colSpan={m.count} className="border-b border-line bg-surface-subtle px-1 py-1 text-center font-medium text-ink-muted">{m.label}</th>)}
            </tr>
            <tr>
              {days.map(d => {
                const ds = d2s(d); const hol = holidays.get(ds); const isToday = ds === todayStr; const wknd = d.getDay() === 0 || d.getDay() === 6;
                return (
                  <th key={ds} scope="col" title={hol} className={cn('min-w-14 border-b border-line px-1 py-1 text-center font-normal', isToday ? 'bg-action-soft text-action' : hol ? 'bg-danger-soft text-danger' : wknd ? 'bg-surface-muted text-ink-muted' : 'bg-surface-subtle text-ink-muted')}>
                    <span className="block">{WD[d.getDay()]}</span>
                    <span className="block font-sans text-label font-semibold tabular">{d.getDate()}</span>
                    {hol && <span className="sr-only">Public holiday: {hol}</span>}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {assignments.map(a => {
              const todayTiming = timingFor(a, todayStr);
              return (
                <tr key={a.id}>
                  <th scope="row" className="sticky left-0 z-10 border-b border-r border-line bg-surface px-3 py-2 text-left font-normal">
                    <button type="button" onClick={() => onView(a)} className="focus-ring block max-w-44 truncate rounded-xs text-left font-sans text-label font-medium text-ink hover:underline">{a.employee_name}</button>
                    <span className="mt-0.5 flex items-center gap-1.5 text-ink-muted"><StatusBadge tone={patternOf(a.shift_type).tone}>{patternOf(a.shift_type).label}</StatusBadge></span>
                    {todayTiming?.hours && <span className="mt-0.5 block text-ink-muted tabular">{todayTiming.hours}</span>}
                  </th>
                  {days.map(d => {
                    const ds = d2s(d);
                    const c = cellFor(a, d, ds, leaves, holidays);
                    const isToday = ds === todayStr;
                    return (
                      <td key={ds} className={cn('border-b border-line p-0.5 text-center', isToday && 'bg-action-soft/40')}>
                        <button
                          type="button" title={c.label} onClick={() => onOpenEvent(a, ds)}
                          aria-label={`${a.employee_name}, ${d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}: ${c.label}${c.pending ? ' (not yet decided)' : ''}. Add or edit an event.`}
                          className={cn('focus-ring flex min-h-11 w-full flex-col items-center justify-center rounded-control border px-0.5 py-1 font-semibold leading-none tabular transition-[filter] hover:brightness-95', c.tone ? TONE_CELL[c.tone] : 'border-transparent font-normal text-ink-muted', c.pending && 'border-dashed')}
                        >
                          <span>{c.abbr}</span>
                          {c.hours && <span className="mt-0.5 text-[0.625rem] font-normal opacity-80">{c.hours.replace('–', '-')}</span>}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <details className="rounded-card border border-line bg-surface px-4 py-3 font-sans text-caption text-ink-muted">
        <summary className="cursor-pointer font-sans text-label font-medium text-ink">Key to the schedule</summary>
        <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
          {Object.values(DAY_STATUS).map(s => <li key={s.label} className="flex items-center gap-1.5"><span className={cn('inline-flex min-w-9 justify-center rounded-control border px-1 py-0.5 font-semibold', s.tone === 'neutral' ? 'border-transparent' : TONE_CELL[s.tone])}>{s.short}</span>{s.label}</li>)}
          {Object.values(EVENT_TYPES).map(e => <li key={e.label} className="flex items-center gap-1.5"><span className={cn('inline-flex min-w-9 justify-center rounded-control border px-1 py-0.5 font-semibold', TONE_CELL[e.tone])}>{e.abbr}</span>{e.label}</li>)}
          <li className="flex items-center gap-1.5"><span className="inline-flex min-w-9 justify-center rounded-control border border-dashed border-neutral-line px-1 py-0.5 font-semibold">AL</span>Leave not yet decided (dashed)</li>
        </ul>
      </details>
    </div>
  );
}
