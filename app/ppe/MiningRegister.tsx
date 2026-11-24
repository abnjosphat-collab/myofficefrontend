'use client';

import { useState, type ReactNode } from 'react';
import { Button, DataTable, Pagination, StatusBadge } from '@/components/ui-system';
import { formatMineNumber } from '@/lib/registerMatch';
import { displaySection } from '@/lib/sections';
import { fmtDate } from '@/components/shared/utils';
import { standing } from './ppeLogic';
import type { EmployeeWithPPE } from './types';

const PAGE_SIZE = 40;

export function MiningRegister({ people, onOpen, flags, actions }: {
  people: EmployeeWithPPE[];
  onOpen: (person: EmployeeWithPPE) => void;
  flags: (person: EmployeeWithPPE) => ReactNode;
  actions: (person: EmployeeWithPPE) => ReactNode;
}) {
  const [page, setPage] = useState(1);
  const pages = Math.max(1, Math.ceil(people.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const personActions = (person: EmployeeWithPPE) => <div className="flex flex-wrap items-center gap-1">
    <Button size="sm" variant="ghost" onClick={() => onOpen(person)} aria-label={`View PPE for ${person.employee_name}`}>View PPE</Button>
    {actions(person)}
  </div>;
  return <>
    <DataTable caption="Mining PPE register" density="compact"
      rows={people.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE)}
      getRowId={person => person.employee_id} stillKey={current}
      rowZoomId={person => `ppe:holder:${person.employee_id}`}
      columns={[
        { id: 'person', header: 'Employee', cell: person => <div className="min-w-0 [overflow-wrap:anywhere]">
          <div className="font-medium">{person.employee_name}</div>
          <div className="text-caption text-ink-muted">{[formatMineNumber(person.employee_id), person.position].filter(Boolean).join(' · ')}</div>
          <div className="text-caption text-ink-muted md:hidden">{displaySection(person.section)}</div>
          {flags(person)}
          <div className="mt-1 md:hidden">{personActions(person)}</div>
        </div> },
        { id: 'section', header: 'Section', hideBelow: 'md', cell: person => displaySection(person.section) },
        { id: 'due', header: 'Earliest due date', className: 'max-md:whitespace-normal', cell: person => {
          const item = person.records.reduce<EmployeeWithPPE['records'][number] | undefined>((first, record) =>
            record.status === 'active' && record.expiry_date && (!first?.expiry_date || record.expiry_date < first.expiry_date) ? record : first, undefined);
          if (!item) return <span className="text-ink-muted">{person.records.length ? 'No current due date' : 'No PPE recorded'}</span>;
          const state = standing(item);
          return <div className="flex flex-wrap items-center gap-1.5">
            <span className="whitespace-nowrap">{fmtDate(item.expiry_date)}</span>
            {state === 'overdue' && <StatusBadge tone="danger">Overdue</StatusBadge>}
            {state === 'soon' && <StatusBadge tone="warning">Expiring soon</StatusBadge>}
          </div>;
        } },
        { id: 'actions', header: 'Actions', hideBelow: 'md', cell: personActions },
      ]}
    />
    {pages > 1 && <Pagination page={current} total={people.length} pageSize={PAGE_SIZE} onPageChange={setPage} />}
  </>;
}
