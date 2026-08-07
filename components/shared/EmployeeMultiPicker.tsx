'use client';
// components/shared/EmployeeMultiPicker.tsx — pick multiple employees via
// EmployeeAutocomplete, shown as removable chips. Promoted from
// app/tasks-events/page.tsx's page-local `ResponsiblePeoplePicker`, whose header
// comment said exactly this: "kept page-local rather than promoted into the shared
// component until a second page actually needs it" — app/overtime/page.tsx's new
// employee filter is that second page.
//
// Only fires on an actual autocomplete match (same as the original) — free-typed
// text that never gets selected is discarded, never added as a bare string. Reports
// the full matched employee (id/employee_id/name) rather than just a name, since a
// filter needs employee_id to match records; callers that only want names (like
// tasks-events' free-text "Responsible People" list) just read `.name` off each pick.
import { useState } from 'react';
import { useTheme, FormField } from '@/components/shared/theme';
import { X } from '@/components/shared/theme';
import { EmployeeAutocomplete } from '@/components/shared/EmployeeAutocomplete';
import type { EmployeeLookup } from '@/hooks/useLookups';

export interface PickedEmployee {
  id: string;
  employee_id: string;
  name: string;
}

export function EmployeeMultiPicker({ value, onAdd, onRemove, label, placeholder }: {
  value: PickedEmployee[];
  onAdd: (p: PickedEmployee) => void;
  onRemove: (id: string) => void;
  label?: string;
  placeholder?: string;
}) {
  const t = useTheme();
  const [draft, setDraft] = useState('');

  const handleSelect = (emp: EmployeeLookup) => {
    const name = emp.full_name || emp.name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim();
    setDraft('');
    if (!name) return;
    const id = String(emp.id);
    if (value.some(p => p.id === id)) return;
    onAdd({ id, employee_id: emp.employee_id || id, name });
  };

  const field = (
    <>
      <EmployeeAutocomplete value={draft} onChange={setDraft} onSelect={handleSelect} placeholder={placeholder} />
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {value.map(p => (
            <span key={p.id} className={`inline-flex items-center gap-1 ${t.chipBg} rounded-full pl-2.5 pr-1.5 py-1 text-xs ${t.textMuted}`}>
              {p.name}
              <button type="button" onClick={() => onRemove(p.id)}
                className={`h-4 w-4 flex items-center justify-center rounded-full ${t.hoverBg}`}>
                <X className="h-2.5 w-2.5" />
              </button>
            </span>
          ))}
        </div>
      )}
    </>
  );

  return label ? <FormField label={label}>{field}</FormField> : field;
}
