// app/shifts/DutyStrip.tsx — who answers as duty official across the coming week,
// above the roster: the effective official per scope (explicit overrides win
// over the duty rosters, covers apply to either). Naming and editing overrides
// happen here; rosters and covers are managed on the Standby page.
'use client';

import { Button, IconButton, Notice, StatusBadge } from '@/components/ui-system';
import { ContactButtons } from '@/components/shared/ContactButtons';
import { fmtDate } from '@/components/shared/utils';
import { todayLocal } from '@/lib/dates';
import {
  addDays, dutyScopes, officialSegments, resolvePhone, sameScope,
  type EmployeeContact,
} from '@/app/standby/standbyRoster';
import type { DutyEntry, DutyRotation, RotationCover } from '@/app/standby/types';

export function DutyStrip({ items, dutyRotations, covers, loaded, loading, error, degraded, onRetry, employees, today = todayLocal(), onNew, onEdit }: {
  items: DutyEntry[];
  dutyRotations: DutyRotation[];
  covers: RotationCover[];
  loaded: boolean;
  loading: boolean;
  error: string | null;
  /** Rosters or covers failed to load: only explicitly named officials show. */
  degraded: boolean;
  onRetry: () => void;
  employees: EmployeeContact[];
  today?: string;
  onNew: () => void;
  onEdit: (entry: DutyEntry) => void;
}) {
  if (error) {
    return <Notice tone="warning" title="Duty officials could not be loaded" action={<Button size="sm" icon="refresh" onClick={onRetry}>Try again</Button>}>{error} The duty officials for this week are missing below.</Notice>;
  }
  if (!loaded || loading) return null;
  const weekEnd = addDays(today, 6);
  const scopes = dutyScopes(degraded ? [] : dutyRotations, items);
  const sections = scopes.map(scope => {
    const rotation = degraded ? undefined : [...dutyRotations].filter(r => r.is_active && sameScope(r.department, scope)).sort((a, b) => a.id - b.id)[0];
    const segments = officialSegments(rotation, items, degraded ? [] : covers, today, weekEnd, scope);
    return { scope, segments };
  }).filter(s => s.segments.length > 0);
  return (
    <section aria-labelledby="duty-strip" className="flex flex-col gap-2 rounded-card border border-line bg-surface px-4 py-3 shadow-card">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h2 id="duty-strip" className="font-display text-title font-semibold text-ink">Duty officials</h2>
        <p className="font-sans text-caption tabular text-ink-muted">{fmtDate(today)} to {fmtDate(weekEnd)}</p>
        <span className="ml-auto"><Button size="sm" icon="plus" onClick={onNew}>Name official</Button></span>
      </div>
      {degraded && (
        <p className="font-sans text-body-sm text-ink-muted">Duty rosters or covers are unavailable — showing explicitly named officials only.</p>
      )}
      {sections.length === 0 ? (
        <p className="font-sans text-body-sm text-ink-muted">No duty official named for this week.</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {sections.map(({ scope, segments }) => segments.map(s => (
            <li key={`${scope ?? 'mine-wide'}-${s.from}-${s.official.employee_id}`} className="flex items-center gap-3 rounded-control bg-surface-subtle px-3 py-1.5">
              <p className="min-w-0 flex-1 truncate font-sans text-body-sm text-ink">
                {s.official.cover ? s.official.cover.cover_employee_name : s.official.employee_name}
                {' '}<span className="text-ink-muted tabular">{fmtDate(s.from)}{s.to !== s.from ? ` to ${fmtDate(s.to)}` : ''}</span>
                {s.official.cover && <span className="text-ink-muted"> holding for {s.official.employee_name}</span>}
              </p>
              <StatusBadge tone={scope ? 'brand' : 'neutral'}>{scope || 'Mine-wide'}</StatusBadge>
              {s.official.override && <StatusBadge tone="brand">Override</StatusBadge>}
              {s.official.cover && <StatusBadge tone="brand">Cover</StatusBadge>}
              <ContactButtons
                phone={resolvePhone(s.official.cover?.cover_phone ?? s.official.phone, employees, s.official.cover?.cover_employee_id ?? s.official.employee_id)}
                name={s.official.cover?.cover_employee_name ?? s.official.employee_name}
              />
              {s.official.override && (
                <IconButton icon="edit" size="sm" variant="ghost" label={`Edit ${s.official.employee_name}'s duty stint`} onClick={() => s.official.override && onEdit(s.official.override)} />
              )}
            </li>
          )))}
        </ul>
      )}
    </section>
  );
}
