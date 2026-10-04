// app/overtime/insights/TopPeople.tsx — the people with the most overtime hours, as a list of bars. Choosing a person scopes the whole
// page to them (the same filter as the employee picker on the register), and choosing them again removes it.
'use client';

import { Progress } from '@/components/ui-system';

export interface TopPerson { employee_id: string; employee_name: string; position: string; hours: number; count: number }

export function TopPeople({ people, active, onToggle }: { people: TopPerson[]; active: string[]; onToggle: (employeeId: string, name: string) => void }) {
  if (!people.length) return <p className="py-4 font-sans text-body-sm text-ink-muted">No data</p>;
  const max = Math.max(1, ...people.map(p => p.hours));
  return (
    <ul className="flex flex-col gap-1" aria-label="People with the most overtime">
      {people.map(p => {
        const on = !!p.employee_id && active.includes(p.employee_id);
        return (
          <li key={p.employee_id || p.employee_name}>
            <button type="button" aria-pressed={on} disabled={!p.employee_id} onClick={() => onToggle(p.employee_id, p.employee_name)} title={on ? `Remove ${p.employee_name} from the filter` : `Show only ${p.employee_name}`}
              className={`focus-ring flex w-full flex-col gap-1 rounded-control px-2 py-1.5 text-left transition-colors hover:bg-surface-muted ${on ? 'bg-action-soft' : ''}`}>
              <span className="flex items-baseline justify-between gap-3 font-sans text-body-sm"><span className="min-w-0 truncate font-medium text-ink">{p.employee_name}{p.position && <span className="font-normal text-ink-muted">, {p.position}</span>}</span><span className="shrink-0 font-semibold text-ink tabular">{p.hours}h</span></span>
              <Progress value={(p.hours / max) * 100} label={`${p.employee_name}: ${p.hours} hours`} />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
