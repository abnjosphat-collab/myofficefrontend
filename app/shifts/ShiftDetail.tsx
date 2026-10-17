// app/shifts/ShiftDetail.tsx — one assignment in full: the employee, the pattern and where it is in its cycle today, timing
// blocks, standby periods, scheduled events and notes.
'use client';

import { Dialog, Progress, StatusBadge, Fact, FactList, FactSection, DetailActions } from '@/components/ui-system';
import { ContactButtons } from '@/components/shared/ContactButtons';
import { fmtDate } from '@/components/shared/utils';
import { cycleProgress, daysUntilNextOn, todayStatus } from './calcShifts';
import { DAY_STATUS, TIMING_PRESETS, eventOf, patternOf } from './shiftMeta';
import type { ScheduleEvent, ShiftAssignment } from './types';

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;

export function ShiftDetail({ assignment: a, onClose, onEdit, onDelete }: { assignment: ShiftAssignment | null; onClose: () => void; onEdit: (a: ShiftAssignment) => void; onDelete: (a: ShiftAssignment) => void }) {
  const status = a ? todayStatus(a) : null;
  const progress = a ? cycleProgress(a) : 0;
  const pattern = a ? patternOf(a.shift_type) : null;
  const blocks = a?.shift_timing_periods || [];
  const standby = a?.shift_type !== 'standby' ? a?.standby_periods || [] : [];
  const events = (a?.day_overrides || []) as ScheduleEvent[];
  const defaultTiming = a?.shift_label ? TIMING_PRESETS[a.shift_label] : null;
  const next = a && status === 'off' ? daysUntilNextOn(a) : null;

  return (
    <Dialog
      open={!!a} onOpenChange={o => { if (!o) onClose(); }} size="lg"
      title={a?.employee_name ?? 'Assignment'} description={a ? `${a.designation || 'No designation'}, ${a.department || 'no department'}` : undefined}
      footer={a && (<DetailActions onDelete={() => onDelete(a)} deleteLabel="Remove" onClose={onClose} onEdit={() => onEdit(a)} editLabel="Edit assignment" />)}
    >
      {a && status && pattern && (
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap gap-2"><StatusBadge tone={DAY_STATUS[status].tone}>{DAY_STATUS[status].label} today</StatusBadge><StatusBadge tone={pattern.tone}>{pattern.label}</StatusBadge>{!a.is_active && <StatusBadge tone="neutral">Inactive</StatusBadge>}</div>
          <FactSection title="Employee">
            <FactList columns={3}><Fact label="Employee ID">{a.employee_id}</Fact><Fact label="Designation">{a.designation}</Fact><Fact label="Department">{a.department}</Fact><Fact label="Section">{a.section}</Fact><Fact label="Phone">{a.phone && <span className="inline-flex items-center gap-2">{a.phone}<ContactButtons phone={a.phone} name={a.employee_name} /></span>}</Fact></FactList>
          </FactSection>
          <FactSection title="Shift pattern">
            <FactList columns={3}>
              <Fact label="Pattern">{pattern.label}</Fact>
              {a.shift_type !== 'standby' && <><Fact label="On days">{String(a.on_days)}</Fact><Fact label="Off days">{String(a.off_days)}</Fact></>}
              <Fact label="Cycle start">{fmtDate(a.cycle_start_date)}</Fact>
              {next !== null && <Fact label="Next on duty">{`in ${next} ${next === 1 ? 'day' : 'days'}`}</Fact>}
              {(a.shift_label || a.shift_hours) && <Fact label="Default timing">{defaultTiming ? `${defaultTiming.label}, ${a.shift_hours || defaultTiming.hours}` : a.shift_hours || ''}</Fact>}
            </FactList>
            {a.shift_type !== 'standby' && <div className="mt-1"><p className="mb-1 font-sans text-caption text-ink-muted">Position in the current cycle</p><Progress value={progress} label={`${a.employee_name} cycle position`} /></div>}
          </FactSection>
          {blocks.length > 0 && (
            <FactSection title="Timing blocks" aside={plural(blocks.length, 'block')}>
              <ul className="flex flex-col gap-1.5">{blocks.map((b, i) => { const tm = b.label ? TIMING_PRESETS[b.label] : null; const hrs = b.start_time && b.end_time ? `${b.start_time}–${b.end_time}` : tm?.hours || ''; return <li key={i} className="flex flex-wrap items-center gap-2 font-sans text-body-sm text-ink">{tm && <StatusBadge tone="info">{tm.abbr}</StatusBadge>}<span className="tabular">{fmtDate(b.from)} to {fmtDate(b.to)}</span>{hrs && <span className="ml-auto tabular text-ink-muted">{hrs}</span>}</li>; })}</ul>
            </FactSection>
          )}
          {standby.length > 0 && (
            <FactSection title="Standby periods" aside={plural(standby.length, 'period')}>
              <ul className="flex flex-col gap-1">{standby.map((p, i) => <li key={i} className="font-sans text-body-sm text-ink tabular">{fmtDate(p.from)} to {fmtDate(p.to)}</li>)}</ul>
            </FactSection>
          )}
          {events.length > 0 && (
            <FactSection title="Scheduled events" aside={plural(events.length, 'event')}>
              <ul className="flex max-h-52 flex-col gap-1.5 overflow-y-auto">
                {events.map((ev, i) => { const t = eventOf(ev.type); const hrs = ev.start_time && ev.end_time ? `${ev.start_time}–${ev.end_time}` : ''; return (
                  <li key={ev.id || i} className="flex items-center gap-3 rounded-control border border-line bg-surface-subtle px-3 py-2">
                    <StatusBadge tone={t.tone}>{t.abbr}</StatusBadge>
                    <div className="min-w-0 flex-1"><p className="font-sans text-label font-medium text-ink">{t.label}</p><p className="font-sans text-caption text-ink-muted">{fmtDate(ev.from)}{ev.to && ev.to !== ev.from ? ` to ${fmtDate(ev.to)}` : ''}{hrs ? `, ${hrs}` : ''}{ev.note ? `, ${ev.note}` : ''}</p></div>
                  </li>
                ); })}
              </ul>
            </FactSection>
          )}
          {a.notes && <FactSection title="Notes"><p className="whitespace-pre-wrap rounded-control bg-surface-subtle p-3 font-sans text-body text-ink [overflow-wrap:anywhere]">{a.notes}</p></FactSection>}
        </div>
      )}
    </Dialog>
  );
}
