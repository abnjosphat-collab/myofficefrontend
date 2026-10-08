// app/standby/MonthBoard.tsx — the standby month: a Monday-first calendar grid
// naming each day's standby holder (for the chosen rotation) and duty official,
// with cover and leave markers. Selecting a day unfolds the full detail below
// the grid: crew, contacts, covers, and every scope's official.
'use client';

import { useState } from 'react';
import { Button, EmptyState, IconButton, Select, StatusBadge, cn } from '@/components/ui-system';
import { ContactButtons } from '@/components/shared/ContactButtons';
import { fmtDate } from '@/components/shared/utils';
import { todayLocal } from '@/lib/dates';
import type { LeaveRecord } from '@/app/shifts/types';
import {
  dayPart, dutyScopes, heldCrew, heldStint, leaveOn, monthGrid, monthLabel,
  officialOn, resolvePhone, sameScope, workLocation,
  type EmployeeContact,
} from './standbyRoster';
import type { DutyEntry, DutyRotation, RotationCover, StandbyRotation } from './types';
import { CoverBanner } from './WeekBoard';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function DayDetail({ day, rotation, dutyRotations, duty, covers, leaves, leavesLoaded, employees }: {
  day: string;
  rotation: StandbyRotation;
  dutyRotations: DutyRotation[];
  duty: DutyEntry[];
  covers: RotationCover[];
  leaves: LeaveRecord[];
  leavesLoaded: boolean;
  employees: EmployeeContact[];
}) {
  const held = heldStint('standby', rotation, covers, day);
  const scopeOfficials = dutyScopes(dutyRotations, duty).flatMap(scope => {
    const rotationForScope = [...dutyRotations].filter(r => r.is_active && sameScope(r.department, scope)).sort((a, b) => a.id - b.id)[0];
    const official = officialOn(rotationForScope, duty, covers, day, scope);
    return official ? [{ scope, official }] : [];
  });
  return (
    <section aria-label={`Detail for ${fmtDate(day)}`} className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4 shadow-card sm:p-5">
      <h3 className="font-display text-title font-semibold text-ink">{fmtDate(day, 'long')}</h3>
      {held ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3 rounded-control bg-surface-subtle px-3 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="truncate font-sans text-label font-semibold text-ink">{held.cover ? held.cover.cover_employee_name : held.member.employee_name}</p>
              <p className="truncate font-sans text-caption text-ink-muted">
                {[held.member.designation, workLocation(rotation.section, employees, held.member.employee_id)].filter(Boolean).join(' · ') || 'On standby'}
              </p>
            </div>
            <ContactButtons
              phone={resolvePhone(held.cover?.cover_phone ?? held.member.phone, employees, held.cover?.cover_employee_id ?? held.member.employee_id)}
              name={held.cover?.cover_employee_name ?? held.member.employee_name} size="md"
            />
          </div>
          {held.cover && <CoverBanner cover={held.cover} employees={employees} />}
          {leavesLoaded && leaveOn(leaves, held.member.employee_id, held.member.employee_name, day) && (
            <p><StatusBadge tone="warning">Holder on leave</StatusBadge></p>
          )}
          {heldCrew(held.member, covers, rotation.id, day).map(({ member: c, cover }) => (
            <div key={c.employee_id} className="flex flex-col gap-1.5">
              <div className="flex items-center gap-3 px-1">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-sans text-body-sm text-ink">{cover ? cover.cover_employee_name : c.employee_name}</p>
                  <p className="truncate font-sans text-caption text-ink-muted">{workLocation(rotation.section, employees, c.employee_id) || 'Crew'}</p>
                </div>
                <ContactButtons
                  phone={resolvePhone(cover?.cover_phone ?? c.phone, employees, cover?.cover_employee_id ?? c.employee_id)}
                  name={cover?.cover_employee_name ?? c.employee_name}
                />
              </div>
              {cover && <CoverBanner cover={cover} employees={employees} />}
            </div>
          ))}
        </div>
      ) : (
        <p className="font-sans text-body-sm text-ink-muted">Nobody stands standby on this day.</p>
      )}
      <div className="flex flex-col gap-1.5 border-t border-line pt-3">
        <h4 className="font-sans text-label font-semibold text-ink">Duty officials</h4>
        {scopeOfficials.length === 0 ? (
          <p className="font-sans text-body-sm text-ink-muted">No duty official named for this day.</p>
        ) : scopeOfficials.map(({ scope, official }) => (
          <div key={scope ?? 'mine-wide'}>
            <div className="flex items-center gap-3 rounded-control bg-surface-subtle px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate font-sans text-body-sm font-medium text-ink">{official.cover ? official.cover.cover_employee_name : official.employee_name}</p>
                <p className="truncate font-sans text-caption text-ink-muted">{scope || 'Mine-wide'}{official.override ? ' · explicitly named' : ''}</p>
              </div>
              <ContactButtons
                phone={resolvePhone(official.cover?.cover_phone ?? official.phone, employees, official.cover?.cover_employee_id ?? official.employee_id)}
                name={official.cover?.cover_employee_name ?? official.employee_name}
              />
            </div>
            {official.cover && <CoverBanner cover={official.cover} employees={employees} />}
          </div>
        ))}
      </div>
    </section>
  );
}

export function MonthBoard({ rotations, dutyRotations, duty, covers, leaves, leavesLoaded, employees, today = todayLocal() }: {
  rotations: StandbyRotation[];
  dutyRotations: DutyRotation[];
  duty: DutyEntry[];
  covers: RotationCover[];
  leaves: LeaveRecord[];
  leavesLoaded: boolean;
  employees: EmployeeContact[];
  today?: string;
}) {
  const active = rotations.filter(r => r.is_active);
  const [year, setYear] = useState(() => Number(today.slice(0, 4)));
  const [month0, setMonth0] = useState(() => Number(today.slice(5, 7)) - 1);
  const [rotationId, setRotationId] = useState<string>('');
  const [selected, setSelected] = useState(today);

  if (active.length === 0) {
    return <EmptyState icon="calendar" title="No standby rotations yet" description="Create a rotation to see the month view." />;
  }
  const rotation = active.find(r => String(r.id) === rotationId) ?? active[0];
  const mineWide = [...dutyRotations].filter(r => r.is_active && sameScope(r.department, null)).sort((a, b) => a.id - b.id)[0];

  const shiftMonth = (delta: number) => {
    const total = (year * 12 + month0) + delta;
    const y = Math.floor(total / 12);
    const m = ((total % 12) + 12) % 12;
    setYear(y); setMonth0(m);
    setSelected(`${y}-${String(m + 1).padStart(2, '0')}-01`);
  };

  const grid = monthGrid(year, month0);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select
          aria-label="Standby rotation" value={String(rotation.id)}
          onValueChange={v => setRotationId(v)}
          options={active.map(r => ({ value: String(r.id), label: r.name }))}
        />
        <span className="mx-1 hidden h-6 w-px bg-line sm:inline-block" aria-hidden="true" />
        <IconButton icon="chevron-left" label="Previous month" variant="outline" onClick={() => shiftMonth(-1)} />
        <span className="min-w-40 text-center font-sans text-label font-medium tabular text-ink" aria-live="polite">{monthLabel(year, month0)}</span>
        <IconButton icon="chevron-right" label="Next month" variant="outline" onClick={() => shiftMonth(1)} />
        {(selected !== today || year !== Number(today.slice(0, 4)) || month0 !== Number(today.slice(5, 7)) - 1) && (
          <Button onClick={() => { setYear(Number(today.slice(0, 4))); setMonth0(Number(today.slice(5, 7)) - 1); setSelected(today); }}>Today</Button>
        )}
      </div>

      <div className="overflow-x-auto rounded-card border border-line bg-surface shadow-card">
        <table className="w-full min-w-[42rem] border-collapse">
          <caption className="sr-only">Standby and duty officials per day, {monthLabel(year, month0)}</caption>
          <thead>
            <tr>{WEEKDAYS.map(d => <th key={d} scope="col" className="border-b border-line px-2 py-2 text-center font-sans text-caption font-semibold text-ink-muted">{d}</th>)}</tr>
          </thead>
          <tbody>
            {grid.map((week, wi) => (
              <tr key={week[0]}>
                {week.map(day => {
                  const inMonth = day.slice(0, 7) === `${year}-${String(month0 + 1).padStart(2, '0')}`;
                  const held = heldStint('standby', rotation, covers, day);
                  const official = officialOn(mineWide, duty, covers, day, null);
                  const holderLeave = held && leavesLoaded ? leaveOn(leaves, held.member.employee_id, held.member.employee_name, day) : undefined;
                  const officialLeave = official && leavesLoaded ? leaveOn(leaves, official.employee_id, official.employee_name, day) : undefined;
                  return (
                    <td key={day} className={cn('border-line p-1 align-top', wi < grid.length - 1 && 'border-b')} style={{ width: '14.28%' }}>
                      <button
                        type="button"
                        onClick={() => setSelected(day)}
                        aria-pressed={selected === day}
                        aria-label={`${fmtDate(day)}: ${held ? (held.cover ? `${held.cover.cover_employee_name} holding for ${held.member.employee_name}` : held.member.employee_name) : 'nobody on standby'}; duty ${official ? (official.cover ? `${official.cover.cover_employee_name} holding for ${official.employee_name}` : official.employee_name) : 'unnamed'}`}
                        className={cn(
                          'flex min-h-20 w-full flex-col gap-0.5 rounded-control px-1.5 py-1 text-left',
                          selected === day ? 'bg-action-soft outline outline-2 outline-action' : 'hover:bg-surface-subtle',
                          !inMonth && 'opacity-55',
                        )}
                      >
                        <span className={cn(
                          'grid size-6 place-items-center font-sans text-caption tabular',
                          day === today ? 'rounded-full bg-action font-semibold text-action-ink' : 'text-ink-muted',
                        )}>
                          {Number(day.slice(8, 10))}
                        </span>
                        <span className="truncate font-sans text-caption text-ink">{held ? (held.cover ? held.cover.cover_employee_name : held.member.employee_name) : '—'}</span>
                        <span className="truncate font-sans text-caption text-ink-muted">{official ? (official.cover ? official.cover.cover_employee_name : official.employee_name) : '—'}</span>
                        {(held?.cover || official?.cover || holderLeave || officialLeave) && (
                          <span className="flex flex-wrap gap-1 pt-0.5">
                            {(held?.cover || official?.cover) && <StatusBadge tone="brand">Cover</StatusBadge>}
                            {(holderLeave || officialLeave) && <StatusBadge tone="warning">Leave</StatusBadge>}
                          </span>
                        )}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="font-sans text-caption text-ink-muted">Each day names the standby holder, then the mine-wide duty official. Department officials appear in the day detail.</p>

      <DayDetail
        day={dayPart(selected)} rotation={rotation} dutyRotations={dutyRotations} duty={duty}
        covers={covers} leaves={leaves} leavesLoaded={leavesLoaded} employees={employees}
      />
    </div>
  );
}
