'use client';

import { Checkbox, IconButton } from '@/components/ui-system';
import type { Employee } from './types';

/** The sticky first cell of a grid row: a checkbox for bulk work, the person, and a shortcut to assign their shifts. */
export function TimesheetEmployeeCell({ emp, selected, onToggleSelect, onBulkAssign }: {
  emp: Employee; selected: boolean; onToggleSelect: (id: string) => void; onBulkAssign: (emp: Employee) => void;
}) {
  return (
    <th scope="row" className="sticky left-0 z-20 border-b border-r border-line-subtle bg-surface px-3 py-2 text-left font-normal">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <Checkbox aria-label={`Select ${emp.name} for bulk assign`} checked={selected} onChange={() => onToggleSelect(emp.id)} />
        <div className="min-w-0 flex-1 basis-24">
          <p className="truncate font-sans text-body-sm font-medium text-ink" title={emp.name}>{emp.name}</p>
          <p className="truncate font-sans text-caption text-ink-muted" title={emp.position}>{emp.position}</p>
        </div>
        <IconButton icon="calendar" size="sm" variant="ghost" label={`Assign shifts for ${emp.name}`} onClick={() => onBulkAssign(emp)} />
        <button type="button" onClick={() => onBulkAssign(emp)} className="hidden font-sans text-caption font-medium text-action underline sm:inline">Assign shifts</button>
      </div>
    </th>
  );
}
