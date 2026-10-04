// app/employees/RosterGroups.tsx — the roster's people as cards, grouped by section and then by trade. Each section and trade can be
// collapsed (a search opens everything, so a match is never hidden), and the heading says how many people it holds.
'use client';

import { Icon, cn } from '@/components/ui-system';
import type { Employee, SectionGroup } from './types';

const GRID = 'grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3';

function Toggle({ id, title, count, open, onToggle, level }: { id: string; title: string; count: number; open: boolean; onToggle: () => void; level: 2 | 3 }) {
  const H = level === 2 ? 'h2' : 'h3';
  return (
    <H className={cn('flex', level === 2 ? 'font-display text-section font-semibold text-ink' : 'font-sans text-label font-semibold text-ink')}>
      <button type="button" aria-expanded={open} aria-controls={id} onClick={onToggle} className="focus-ring flex w-full items-center gap-2 rounded-control py-1 text-left">
        <Icon name={open ? 'chevron-down' : 'chevron-right'} size="sm" className="text-ink-muted" />
        <span className="min-w-0 flex-1 truncate">{title}</span>
        <span className="shrink-0 font-sans text-caption font-normal text-ink-muted tabular">{count} {count === 1 ? 'person' : 'people'}</span>
      </button>
    </H>
  );
}

export function RosterGroups({ groups, closed, onToggle, card }: { groups: SectionGroup[]; closed: Set<string>; onToggle: (key: string) => void; card: (e: Employee) => React.ReactNode }) {
  return (
    <div className="flex flex-col gap-5">
      {groups.map(g => {
        const open = !closed.has(g.section);
        const id = `grp-${g.section.replace(/\W+/g, '-')}`;
        return (
          <section key={g.section} aria-label={g.section} className="flex flex-col gap-3 border-b border-line-subtle pb-4 last:border-b-0">
            <Toggle id={id} title={g.section} count={g.employees.length} open={open} onToggle={() => onToggle(g.section)} level={2} />
            {open && (
              <div id={id} className="flex flex-col gap-4">
                {g.hasMeaningfulSubgroups
                  ? g.subgroups.map(sg => {
                    const key = `${g.section}::${sg.designation}`; const subOpen = !closed.has(key); const subId = `${id}-${sg.designation.replace(/\W+/g, '-')}`;
                    return (
                      <div key={sg.designation} className="flex flex-col gap-2.5 pl-1 sm:pl-3">
                        <Toggle id={subId} title={sg.designation} count={sg.employees.length} open={subOpen} onToggle={() => onToggle(key)} level={3} />
                        {subOpen && <ul id={subId} className={GRID} aria-label={`${sg.designation} in ${g.section}`}>{sg.employees.map(e => <li key={e.id} className="relative">{card(e)}</li>)}</ul>}
                      </div>
                    );
                  })
                  : <ul className={GRID} aria-label={`People in ${g.section}`}>{g.employees.map(e => <li key={e.id} className="relative">{card(e)}</li>)}</ul>}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
