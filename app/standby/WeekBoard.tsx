// app/standby/WeekBoard.tsx — the standby week: one card per active standby
// rotation with the current holder, their crew, and the full sequence until the
// cycle restarts; one card per duty roster with the week's officials; and the
// explicitly named overrides. Covers ("holding in place of") and leave warnings
// render where they apply, with a shortcut to name cover. Contact actions call
// or WhatsApp each person straight from their row.
'use client';

import { Button, EmptyState, IconButton, StatusBadge } from '@/components/ui-system';
import { ContactButtons } from '@/components/shared/ContactButtons';
import { fmtDate } from '@/components/shared/utils';
import type { LeaveRecord } from '@/app/shifts/types';
import {
  addDays, coversOverRange, heldCrew, heldStint, leaveOn, leavesOverRange,
  officialSegments, officialsOverRange, resolvePhone, rotationStartedOn, sameScope,
  stintsFrom, workLocation,
  type CycleMember, type CycledRotation, type EmployeeContact,
} from './standbyRoster';
import type {
  CoverPreset, DutyEntry, DutyRotation, RotationCover, RotationKind, RotationMember,
  StandbyRotation,
} from './types';

interface BoardData {
  covers: RotationCover[];
  leaves: LeaveRecord[];
  leavesLoaded: boolean;
  employees: EmployeeContact[];
  onCover: (preset: CoverPreset) => void;
}

function coverPreset(
  kind: RotationKind, rotationId: number, employeeId: string, employeeName: string,
  from: string, to: string,
): CoverPreset {
  return { kind, rotation_id: rotationId, absent_employee_id: employeeId, absent_employee_name: employeeName, date_from: from, date_to: to, reason: 'Leave' };
}

export function CoverBanner({ cover, employees }: { cover: RotationCover; employees: EmployeeContact[] }) {
  return (
    <div className="flex items-center gap-3 rounded-control bg-surface-subtle px-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="truncate font-sans text-body-sm font-medium text-ink">
          {cover.cover_employee_name} <span className="font-normal text-ink-muted">holding in place of {cover.absent_employee_name}</span>
        </p>
        <p className="truncate font-sans text-caption tabular text-ink-muted">
          {fmtDate(cover.date_from.slice(0, 10))} to {fmtDate(cover.date_to.slice(0, 10))}{cover.reason?.trim() ? ` · ${cover.reason.trim()}` : ''}
        </p>
      </div>
      <StatusBadge tone="brand">Cover</StatusBadge>
      <ContactButtons phone={resolvePhone(cover.cover_phone, employees, cover.cover_employee_id)} name={cover.cover_employee_name} />
    </div>
  );
}

function LeaveWarnings({ leaves, employeeId, employeeName, kind, rotationId, from, to, onCover }: {
  leaves: LeaveRecord[]; employeeId: string; employeeName: string;
  kind: RotationKind; rotationId: number; from: string; to: string;
  onCover: (preset: CoverPreset) => void;
}) {
  if (leaves.length === 0) return null;
  return (
    <ul className="flex flex-col gap-1.5">
      {leaves.map(l => {
        const start = l.start_date.slice(0, 10) > from ? l.start_date.slice(0, 10) : from;
        const end = l.end_date.slice(0, 10) < to ? l.end_date.slice(0, 10) : to;
        return (
          <li key={l.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-control border border-line bg-surface px-3 py-2">
            <StatusBadge tone="warning">On leave</StatusBadge>
            <p className="min-w-0 flex-1 font-sans text-body-sm tabular text-ink">
              {l.status === 'pending' ? 'Leave requested' : 'On approved leave'} {fmtDate(start)}{end !== start ? ` to ${fmtDate(end)}` : ''}
            </p>
            <Button size="sm" icon="swap" onClick={() => onCover(coverPreset(kind, rotationId, employeeId, employeeName, start, end))}>
              Name cover
            </Button>
          </li>
        );
      })}
    </ul>
  );
}

function CrewLeave({ leaves, employeeId, employeeName, anchor }: {
  leaves: LeaveRecord[]; employeeId: string; employeeName: string; anchor: string;
}) {
  const found = leaveOn(leaves, employeeId, employeeName, anchor);
  if (!found) return null;
  const from = found.start_date.slice(0, 10);
  const to = found.end_date.slice(0, 10);
  return (
    <p className="flex flex-wrap items-center gap-2 px-1 font-sans text-caption tabular text-ink-muted">
      <StatusBadge tone="warning">On leave</StatusBadge>
      {fmtDate(from)}{to !== from ? ` to ${fmtDate(to)}` : ''}
    </p>
  );
}

function SequenceTimeline<M extends CycleMember>({ kind, rotation, covers, anchor, describe }: {
  kind: RotationKind;
  rotation: CycledRotation<M> & { id: number; name: string };
  covers: RotationCover[];
  anchor: string;
  describe: (member: M) => string | null;
}) {
  const members = rotation.members ?? [];
  const stints = stintsFrom(rotation, anchor, members.length + 1);
  if (stints.length === 0) return null;
  const [first, ...rest] = stints;
  const restart = rest[rest.length - 1];
  const coming = rest.slice(0, -1);
  const started = rotationStartedOn(rotation, anchor);
  return (
    <ol aria-label={`${rotation.name} sequence`} className="flex flex-col gap-1.5">
      <li className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 rounded-control bg-surface-subtle px-3 py-2">
        <span className="font-sans text-caption font-semibold uppercase tracking-wide text-action">{started ? 'Now' : 'First'}</span>
        <span className="font-sans text-body-sm font-medium tabular text-ink">{fmtDate(first.start)} to {fmtDate(first.end)}</span>
        <span className="font-sans text-body-sm text-ink">{first.member.employee_name}</span>
        {describe(first.member) && <span className="font-sans text-caption text-ink-muted">+ {describe(first.member)}</span>}
      </li>
      {coming.map(s => {
        const covered = coversOverRange(covers, kind, rotation.id, s.member.employee_id, s.start, s.end).length > 0;
        return (
          <li key={s.start} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 px-3 py-1">
            <span aria-hidden="true" className="text-ink-subtle">→</span>
            <span className="font-sans text-body-sm tabular text-ink-muted">{fmtDate(s.start)} to {fmtDate(s.end)}</span>
            <span className="font-sans text-body-sm text-ink">{s.member.employee_name}</span>
            {describe(s.member) && <span className="font-sans text-caption text-ink-muted">+ {describe(s.member)}</span>}
            {covered && <StatusBadge tone="brand">Cover</StatusBadge>}
          </li>
        );
      })}
      {restart && (
        <li className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 px-3 py-1">
          <span aria-hidden="true" className="text-ink-subtle">→</span>
          <span className="font-sans text-body-sm text-ink-muted">Cycle restarts with {restart.member.employee_name} on {fmtDate(restart.start)}</span>
        </li>
      )}
    </ol>
  );
}

function StandbyCard({ rotation, data, anchor }: { rotation: StandbyRotation; data: BoardData; anchor: string }) {
  const { covers, leaves, leavesLoaded, employees, onCover } = data;
  const members = rotation.members ?? [];
  const held = heldStint('standby', rotation, covers, anchor);
  return (
    <article aria-labelledby={`sb-${rotation.id}`} className="flex min-w-0 flex-col gap-3 rounded-card border border-line bg-surface p-4 shadow-card sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 id={`sb-${rotation.id}`} className="font-display text-title font-semibold text-ink">{rotation.name}</h3>
        {rotation.section && <StatusBadge tone="neutral">{rotation.section}</StatusBadge>}
      </div>

      {members.length === 0 || !held ? (
        <p className="font-sans text-body-sm text-ink-muted">
          {members.length === 0 ? 'No members yet — edit the rotation to add the sequence.' : `Starts ${fmtDate(rotation.cycle_start_date.slice(0, 10))} — nobody holds a stint before then.`}
        </p>
      ) : (
        <>
          <p className="font-sans text-body font-medium tabular text-ink">
            {fmtDate(held.start)} to {fmtDate(held.end)}
            <span className="ml-2 font-sans text-caption font-normal text-ink-muted">Stint {held.index + 1} of {members.length}</span>
          </p>
          <div className="flex items-center gap-3 rounded-control bg-surface-subtle px-3 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="truncate font-sans text-label font-semibold text-ink">{held.member.employee_name}</p>
              <p className="truncate font-sans text-caption text-ink-muted">
                {[held.member.designation, workLocation(rotation.section, employees, held.member.employee_id)].filter(Boolean).join(' · ') || 'On standby'}
              </p>
            </div>
            <ContactButtons phone={resolvePhone(held.member.phone, employees, held.member.employee_id)} name={held.member.employee_name} size="md" />
            <IconButton icon="swap" size="sm" variant="ghost" label={`Name cover for ${held.member.employee_name}`} onClick={() => onCover(coverPreset('standby', rotation.id, held.member.employee_id, held.member.employee_name, held.start, held.end))} />
          </div>
          {held.cover && <CoverBanner cover={held.cover} employees={employees} />}
          {leavesLoaded && (
            <LeaveWarnings
              leaves={leavesOverRange(leaves, held.member.employee_id, held.member.employee_name, held.start, held.end)}
              employeeId={held.member.employee_id} employeeName={held.member.employee_name}
              kind="standby" rotationId={rotation.id} from={held.start} to={held.end} onCover={onCover}
            />
          )}
          {heldCrew(held.member, covers, rotation.id, anchor).map(({ member: c, cover }) => (
            <div key={c.employee_id}>
              <div className="flex items-center gap-3 px-1">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-sans text-body-sm text-ink">{c.employee_name}</p>
                  <p className="truncate font-sans text-caption text-ink-muted">{workLocation(rotation.section, employees, c.employee_id) || 'Crew'}</p>
                </div>
                <ContactButtons phone={resolvePhone(cover?.cover_phone ?? c.phone, employees, cover?.cover_employee_id ?? c.employee_id)} name={cover?.cover_employee_name ?? c.employee_name} />
                <IconButton icon="swap" size="sm" variant="ghost" label={`Name cover for ${c.employee_name}`} onClick={() => onCover(coverPreset('standby', rotation.id, c.employee_id, c.employee_name, held.start, held.end))} />
              </div>
              {cover && <CoverBanner cover={cover} employees={employees} />}
              {leavesLoaded && <CrewLeave leaves={leaves} employeeId={c.employee_id} employeeName={c.employee_name} anchor={anchor} />}
            </div>
          ))}
          <SequenceTimeline
            kind="standby" rotation={rotation} covers={covers} anchor={anchor}
            describe={(m: RotationMember) => (m.crew ?? []).map(c => c.employee_name).join(', ') || null}
          />
        </>
      )}
    </article>
  );
}

function DutyRotationCard({ rotation, overrides, data, anchor }: {
  rotation: DutyRotation; overrides: DutyEntry[]; data: BoardData; anchor: string;
}) {
  const { covers, leaves, leavesLoaded, employees, onCover } = data;
  const members = rotation.members ?? [];
  const scope = rotation.department ?? null;
  const weekEnd = addDays(anchor, 6);
  const segments = officialSegments(rotation, overrides, covers, anchor, weekEnd, scope);
  return (
    <article aria-labelledby={`duty-${rotation.id}`} className="flex min-w-0 flex-col gap-3 rounded-card border border-line bg-surface p-4 shadow-card sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 id={`duty-${rotation.id}`} className="font-display text-title font-semibold text-ink">{rotation.name}</h3>
        <StatusBadge tone={scope ? 'brand' : 'neutral'}>{scope || 'Mine-wide'}</StatusBadge>
      </div>

      {members.length === 0 ? (
        <p className="font-sans text-body-sm text-ink-muted">No officials yet — edit the roster to add the sequence.</p>
      ) : (
        <>
          {segments.length === 0 ? (
            <p className="font-sans text-body-sm text-ink-muted">No duty official named for this week.</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {segments.map(s => (
                <li key={`${s.from}-${s.official.employee_id}`} className="flex flex-col gap-1.5 rounded-control bg-surface-subtle px-3 py-2">
                  <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-sans text-label font-medium text-ink">
                        {s.official.cover ? s.official.cover.cover_employee_name : s.official.employee_name}
                      </p>
                      <p className="truncate font-sans text-caption tabular text-ink-muted">
                        {fmtDate(s.from)}{s.to !== s.from ? ` to ${fmtDate(s.to)}` : ''}
                        {s.official.override ? ' · explicitly named' : ''}
                      </p>
                    </div>
                    {s.official.override && <StatusBadge tone="brand">Override</StatusBadge>}
                    <ContactButtons
                      phone={resolvePhone(s.official.cover?.cover_phone ?? s.official.phone, employees, s.official.cover?.cover_employee_id ?? s.official.employee_id)}
                      name={s.official.cover?.cover_employee_name ?? s.official.employee_name}
                    />
                    <IconButton
                      icon="swap" size="sm" variant="ghost" label={`Name cover for ${s.official.employee_name}`}
                      onClick={() => onCover(coverPreset('duty', rotation.id, s.official.employee_id, s.official.employee_name, s.from, s.to))}
                    />
                  </div>
                  {s.official.cover && <CoverBanner cover={s.official.cover} employees={employees} />}
                  {leavesLoaded && leavesOverRange(leaves, s.official.employee_id, s.official.employee_name, s.from, s.to).length > 0 && !s.official.cover && (
                    <LeaveWarnings
                      leaves={leavesOverRange(leaves, s.official.employee_id, s.official.employee_name, s.from, s.to)}
                      employeeId={s.official.employee_id} employeeName={s.official.employee_name}
                      kind="duty" rotationId={rotation.id} from={s.from} to={s.to} onCover={onCover}
                    />
                  )}
                </li>
              ))}
            </ul>
          )}
          <SequenceTimeline kind="duty" rotation={rotation} covers={covers} anchor={anchor} describe={() => null} />
        </>
      )}
    </article>
  );
}

function OverridesCard({ entries, dutyRotations, employees, anchor, onCover }: {
  entries: DutyEntry[]; dutyRotations: DutyRotation[]; employees: EmployeeContact[]; anchor: string;
  onCover: (preset: CoverPreset) => void;
}) {
  const weekEnd = addDays(anchor, 6);
  const officials = officialsOverRange(entries, anchor, weekEnd);
  if (officials.length === 0) return null;
  return (
    <section aria-labelledby="sb-overrides" className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4 shadow-card sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 id="sb-overrides" className="font-display text-title font-semibold text-ink">Explicitly named</h3>
        <p className="font-sans text-caption tabular text-ink-muted">{fmtDate(anchor)} to {fmtDate(weekEnd)}</p>
      </div>
      <ul className="flex flex-col gap-1.5">
        {officials.map(({ entry: e, from, to }) => {
          const rotation = dutyRotations.find(r => r.is_active && sameScope(r.department, e.department ?? null));
          return (
            <li key={e.id} className="flex items-center gap-3 rounded-control bg-surface-subtle px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate font-sans text-label font-medium text-ink">{e.employee_name}</p>
                <p className="truncate font-sans text-caption tabular text-ink-muted">{fmtDate(from)}{to !== from ? ` to ${fmtDate(to)}` : ''}{e.note?.trim() ? ` · ${e.note.trim()}` : ''}</p>
              </div>
              <StatusBadge tone={e.department ? 'brand' : 'neutral'}>{e.department || 'Mine-wide'}</StatusBadge>
              <ContactButtons phone={resolvePhone(e.phone, employees, e.employee_id)} name={e.employee_name} />
              {rotation && (
                <IconButton
                  icon="swap" size="sm" variant="ghost" label={`Name cover for ${e.employee_name}`}
                  onClick={() => onCover(coverPreset('duty', rotation.id, e.employee_id, e.employee_name, from, to))}
                />
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function WeekBoard({ rotations, dutyRotations, duty, covers, leaves, leavesLoaded, employees, anchor, onCover }: {
  rotations: StandbyRotation[];
  dutyRotations: DutyRotation[];
  duty: DutyEntry[];
  covers: RotationCover[];
  leaves: LeaveRecord[];
  leavesLoaded: boolean;
  employees: EmployeeContact[];
  anchor: string;
  onCover: (preset: CoverPreset) => void;
}) {
  const active = rotations.filter(r => r.is_active);
  const activeDuty = dutyRotations.filter(r => r.is_active);
  const data: BoardData = { covers, leaves, leavesLoaded, employees, onCover };
  const hasDuty = activeDuty.length > 0 || officialsOverRange(duty, anchor, addDays(anchor, 6)).length > 0;
  if (active.length === 0 && !hasDuty) {
    return (
      <div className="flex flex-col gap-4">
        <EmptyState icon="clock" title="No standby rotations yet" description="Create a rotation to see who stands standby each week." />
        <p className="font-sans text-body-sm text-ink-muted">No duty official named for this week.</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      {active.length > 0 && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {active.map(r => <StandbyCard key={r.id} rotation={r} data={data} anchor={anchor} />)}
        </div>
      )}
      {activeDuty.length > 0 && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {activeDuty.map(r => <DutyRotationCard key={r.id} rotation={r} overrides={duty} data={data} anchor={anchor} />)}
        </div>
      )}
      <OverridesCard entries={duty} dutyRotations={dutyRotations} employees={employees} anchor={anchor} onCover={onCover} />
      {!hasDuty && <p className="font-sans text-body-sm text-ink-muted">No duty official named for this week.</p>}
    </div>
  );
}
