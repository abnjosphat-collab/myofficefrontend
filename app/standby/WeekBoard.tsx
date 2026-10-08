// app/standby/WeekBoard.tsx — the standby week: one card per active rotation with
// the member holding the anchor's stint, their crew, the rotation sequence, and
// the duty officials covering the week. Contact actions call or WhatsApp each
// person straight from their card.
'use client';

import { ContactButtons } from '@/components/shared/ContactButtons';
import { fmtDate } from '@/components/shared/utils';
import { EmptyState, StatusBadge, cn } from '@/components/ui-system';
import {
  addDays, officialsOverRange, resolvePhone, stintOn, workLocation,
  type EmployeeContact,
} from './standbyRoster';
import type { DutyEntry, StandbyRotation } from './types';

function SequenceStrip({ rotation, current }: { rotation: StandbyRotation; current: number | null }) {
  const total = rotation.members.length;
  return (
    <ol aria-label={`${rotation.name} sequence`} className="flex flex-wrap items-center gap-1.5">
      {rotation.members.map((m, i) => (
        <li key={m.employee_id} className="flex items-center gap-1.5">
          {i > 0 && <span aria-hidden="true" className="text-ink-subtle">→</span>}
          <span
            aria-current={i === current ? 'true' : undefined}
            title={i === current ? 'Holding this stint' : `Stint ${(i + 1)} of ${total}`}
            className={cn(
              'rounded-full border px-2.5 py-1 font-sans text-caption tabular',
              i === current ? 'border-action bg-action-soft font-semibold text-action' : 'border-line bg-surface-muted text-ink-muted',
            )}
          >
            {i + 1}. {m.employee_name}
          </span>
        </li>
      ))}
    </ol>
  );
}

function RotationCard({ rotation, anchor, employees }: { rotation: StandbyRotation; anchor: string; employees: EmployeeContact[] }) {
  const members = rotation.members ?? [];
  const stint = stintOn(rotation, anchor);
  return (
    <article aria-labelledby={`sb-${rotation.id}`} className="flex min-w-0 flex-col gap-3 rounded-card border border-line bg-surface p-4 shadow-card sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 id={`sb-${rotation.id}`} className="font-display text-title font-semibold text-ink">{rotation.name}</h3>
        {rotation.section && <StatusBadge tone="neutral">{rotation.section}</StatusBadge>}
      </div>

      {members.length === 0 || !stint ? (
        <p className="font-sans text-body-sm text-ink-muted">
          {members.length === 0 ? 'No members yet — edit the rotation to add the sequence.' : `Starts ${fmtDate(rotation.cycle_start_date.slice(0, 10))} — nobody holds a stint before then.`}
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <p className="font-sans text-body font-medium tabular text-ink">{fmtDate(stint.start)} to {fmtDate(stint.end)}</p>
            <p className="font-sans text-caption text-ink-muted">
              Stint {stint.index + 1} of {members.length}
              {members.length > 1 && <> · next: {members[(stint.index + 1) % members.length].employee_name}</>}
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-control bg-surface-subtle px-3 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="truncate font-sans text-label font-semibold text-ink">{stint.member.employee_name}</p>
              <p className="truncate font-sans text-caption text-ink-muted">
                {[stint.member.designation, workLocation(rotation.section, employees, stint.member.employee_id)].filter(Boolean).join(' · ') || 'On standby'}
              </p>
            </div>
            <ContactButtons phone={resolvePhone(stint.member.phone, employees, stint.member.employee_id)} name={stint.member.employee_name} size="md" />
          </div>
          {(stint.member.crew ?? []).length > 0 && (
            <ul aria-label={`Crew backing ${stint.member.employee_name}`} className="flex flex-col gap-1.5">
              {(stint.member.crew ?? []).map(c => (
                <li key={c.employee_id} className="flex items-center gap-3 px-1">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-sans text-body-sm text-ink">{c.employee_name}</p>
                    <p className="truncate font-sans text-caption text-ink-muted">{workLocation(rotation.section, employees, c.employee_id) || 'Crew'}</p>
                  </div>
                  <ContactButtons phone={resolvePhone(c.phone, employees, c.employee_id)} name={c.employee_name} />
                </li>
              ))}
            </ul>
          )}
          <SequenceStrip rotation={rotation} current={stint.index} />
        </>
      )}
    </article>
  );
}

function DutyWeek({ entries, anchor, employees }: { entries: DutyEntry[]; anchor: string; employees: EmployeeContact[] }) {
  const weekEnd = addDays(anchor, 6);
  const officials = officialsOverRange(entries, anchor, weekEnd);
  return (
    <section aria-labelledby="sb-duty" className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4 shadow-card sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 id="sb-duty" className="font-display text-title font-semibold text-ink">Duty officials</h3>
        <p className="font-sans text-caption tabular text-ink-muted">{fmtDate(anchor)} to {fmtDate(weekEnd)}</p>
      </div>
      {officials.length === 0 ? (
        <p className="font-sans text-body-sm text-ink-muted">No duty official named for this week.</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {officials.map(({ entry: e, from, to }) => (
            <li key={e.id} className="flex items-center gap-3 rounded-control bg-surface-subtle px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate font-sans text-label font-medium text-ink">{e.employee_name}</p>
                <p className="truncate font-sans text-caption tabular text-ink-muted">{fmtDate(from)}{to !== from ? ` to ${fmtDate(to)}` : ''}{e.note?.trim() ? ` · ${e.note.trim()}` : ''}</p>
              </div>
              <StatusBadge tone={e.department ? 'brand' : 'neutral'}>{e.department || 'Mine-wide'}</StatusBadge>
              <ContactButtons phone={resolvePhone(e.phone, employees, e.employee_id)} name={e.employee_name} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function WeekBoard({ rotations, duty, employees, anchor }: {
  rotations: StandbyRotation[];
  duty: DutyEntry[];
  employees: EmployeeContact[];
  anchor: string;
}) {
  const active = rotations.filter(r => r.is_active);
  if (active.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <EmptyState icon="clock" title="No standby rotations yet" description="Create a rotation to see who stands standby each week." />
        <DutyWeek entries={duty} anchor={anchor} employees={employees} />
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {active.map(r => <RotationCard key={r.id} rotation={r} anchor={anchor} employees={employees} />)}
      </div>
      <DutyWeek entries={duty} anchor={anchor} employees={employees} />
    </div>
  );
}
