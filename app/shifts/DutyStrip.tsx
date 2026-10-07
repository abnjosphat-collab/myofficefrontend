// app/shifts/DutyStrip.tsx — who answers as duty official across the coming week,
// above the roster. Naming and editing happen here; the full duty register with
// removals lives on the Standby page.
'use client';

import { Button, IconButton, Notice, StatusBadge } from '@/components/ui-system';
import { ContactButtons } from '@/components/shared/ContactButtons';
import { fmtDate } from '@/components/shared/utils';
import { todayLocal } from '@/lib/dates';
import { addDays, officialsOverRange, resolvePhone, type EmployeeContact } from '@/app/standby/standbyRoster';
import type { DutyEntry } from '@/app/standby/types';

export function DutyStrip({ items, loaded, loading, error, onRetry, employees, today = todayLocal(), onNew, onEdit }: {
  items: DutyEntry[];
  loaded: boolean;
  loading: boolean;
  error: string | null;
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
  const officials = officialsOverRange(items, today, weekEnd);
  return (
    <section aria-labelledby="duty-strip" className="flex flex-col gap-2 rounded-card border border-line bg-surface px-4 py-3 shadow-card">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h2 id="duty-strip" className="font-display text-title font-semibold text-ink">Duty officials</h2>
        <p className="font-sans text-caption tabular text-ink-muted">{fmtDate(today)} to {fmtDate(weekEnd)}</p>
        <span className="ml-auto"><Button size="sm" icon="plus" onClick={onNew}>Name official</Button></span>
      </div>
      {officials.length === 0 ? (
        <p className="font-sans text-body-sm text-ink-muted">No duty official named for this week.</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {officials.map(({ entry: e, from, to }) => (
            <li key={e.id} className="flex items-center gap-3 rounded-control bg-surface-subtle px-3 py-1.5">
              <p className="min-w-0 flex-1 truncate font-sans text-body-sm text-ink">{e.employee_name} <span className="text-ink-muted tabular">{fmtDate(from)}{to !== from ? ` to ${fmtDate(to)}` : ''}</span></p>
              <StatusBadge tone={e.department ? 'brand' : 'neutral'}>{e.department || 'Mine-wide'}</StatusBadge>
              <ContactButtons phone={resolvePhone(e.phone, employees, e.employee_id)} name={e.employee_name} />
              <IconButton icon="edit" size="sm" variant="ghost" label={`Edit ${e.employee_name}'s duty stint`} onClick={() => onEdit(e)} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
