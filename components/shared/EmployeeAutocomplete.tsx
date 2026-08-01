'use client';
// components/shared/EmployeeAutocomplete.tsx — one employee name-search-and-select
// field, built on the shared Combobox primitive (keyboard nav, portal positioning,
// outside-click dismissal all come from there — see design-system/components.tsx).
//
// Previously reimplemented independently in at least 4 places: an inline ghost-text
// version in app/leaves/page.tsx, a local `EmployeeAutocomplete` in app/overtime/page.tsx
// (mouse-only — no keyboard support at all), a local `EmployeeAutocomplete` in
// app/ppe/page.tsx, and `PersonAutocomplete` in components/maintenance/formFields.tsx
// (the one already on Combobox, which this generalizes). Define once, reuse everywhere.
import { useTheme, FormField, Combobox, type ComboOption } from '@/components/shared/theme';
import { useEmployees, type EmployeeLookup } from '@/hooks/useLookups';

export function EmployeeAutocomplete({ label, required, value, onChange, onSelect, placeholder, disabled }: {
  label?: string;
  required?: boolean;
  value: string;
  onChange: (v: string) => void;
  /** Full matched record, in addition to onChange(name) firing on every keystroke —
   *  callers that need to fan out into other fields (position/department/contact) on
   *  selection use this; callers that only want the name text can omit it. */
  onSelect?: (emp: EmployeeLookup) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const t = useTheme();
  const employees = useEmployees();

  const q = value.toLowerCase();
  const matches = q.length === 0 ? employees.slice(0, 8) : employees.filter(e => {
    const full = (e.full_name || e.name || `${e.first_name || ''} ${e.last_name || ''}`).toLowerCase();
    return full.includes(q) || (e.employee_id || '').toLowerCase().includes(q) || (e.designation || e.position || '').toLowerCase().includes(q);
  }).slice(0, 8);

  const byValue = new Map(matches.map(e => [String(e.id), e]));
  const nameOf = (e: EmployeeLookup) => e.full_name || e.name || `${e.first_name || ''} ${e.last_name || ''}`.trim();
  const options: ComboOption[] = matches.map(e => ({
    value: String(e.id),
    label: nameOf(e),
    sub: [e.designation || e.position, e.department || e.section].filter(Boolean).join(' · '),
  }));

  const handleSelect = (opt: ComboOption) => {
    onChange(opt.label);
    const emp = byValue.get(opt.value);
    if (emp) onSelect?.(emp);
  };

  const field = (
    <Combobox
      value={value}
      onChange={onChange}
      onSelect={handleSelect}
      options={options}
      disabled={disabled}
      placeholder={placeholder || 'Type to search employees…'}
      renderOption={opt => {
        const e = byValue.get(opt.value);
        const initials = `${e?.first_name?.[0] || nameOf(e || {} as EmployeeLookup)[0] || ''}${e?.last_name?.[0] || ''}`.toUpperCase();
        return (
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-full bg-brand-500/15 flex items-center justify-center flex-shrink-0 text-[10px] text-brand-400 font-bold uppercase">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className={`text-xs font-medium truncate ${t.textPrimary}`}>{opt.label}</div>
              <div className={`text-[10px] truncate ${t.textFaint}`}>{opt.sub}</div>
            </div>
            {e?.employee_id && <span className={`text-[10px] flex-shrink-0 ${t.textFaint}`}>{e.employee_id}</span>}
          </div>
        );
      }}
    />
  );

  return label ? <FormField label={label} required={required}>{field}</FormField> : field;
}

/** Alias kept for the existing maintenance call sites (WorkOrderDetailModal,
 *  CreateScheduleModal, CreateWorkOrderModal) — same component, original name. */
export const PersonAutocomplete = EmployeeAutocomplete;
