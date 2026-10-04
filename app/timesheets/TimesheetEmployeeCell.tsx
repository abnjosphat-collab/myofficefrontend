'use client';

import { Checkbox, IconButton } from '@/components/ui-system';
import type { Employee } from './types';

/** The sticky first cell of a grid row: a checkbox for bulk work, the person, a shortcut to assign their shifts, and removal from this
 *  period's roster (which asks first, and never deletes a day's entry). */
export function TimesheetEmployeeCell({ emp, confirmRemoveId, setConfirmRemoveId, selected, onToggleSelect, onBulkAssign, onRemoveEmployee }: {
  emp: Employee; confirmRemoveId: string | null; setConfirmRemoveId: (id: string | null) => void; selected: boolean; onToggleSelect: (id: string) => void; onBulkAssign: (emp: Employee) => void; onRemoveEmployee: (id: string) => void;
}) {
  const confirming = confirmRemoveId === emp.id;
  return (
    <th scope="row" className="sticky left-0 z-20 border-b border-r border-line-subtle bg-surface px-3 py-2 text-left font-normal">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <Checkbox aria-label={`Select ${emp.name} for bulk assign`} checked={selected} onChange={() => onToggleSelect(emp.id)} />
        <div className="min-w-0 flex-1 basis-24">
          <p className="truncate font-sans text-body-sm font-medium text-ink" title={emp.name}>{emp.name}</p>
          <p className="truncate font-sans text-caption text-ink-muted" title={emp.position}>{emp.position}</p>
        </div>
        {confirming ? (
          <div className="flex items-center gap-1" role="group" aria-label={`Remove ${emp.name} from this period?`}>
            <span className="font-sans text-caption text-ink-muted">Remove?</span>
            <IconButton icon="check" size="sm" variant="outline" label={`Confirm removing ${emp.name} from this period`} onClick={() => { onRemoveEmployee(emp.id); setConfirmRemoveId(null); }} />
            <IconButton icon="close" size="sm" variant="ghost" label="Cancel removal" onClick={() => setConfirmRemoveId(null)} />
          </div>
        ) : (
          <div className="flex items-center gap-0.5">
            <IconButton icon="calendar" size="sm" variant="ghost" label={`Assign shifts for ${emp.name}`} onClick={() => onBulkAssign(emp)} />
            <IconButton icon="close" size="sm" variant="ghost" label={`Remove ${emp.name} from this period`} onClick={() => setConfirmRemoveId(emp.id)} />
          </div>
        )}
      </div>
    </th>
  );
}
