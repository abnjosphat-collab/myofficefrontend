'use client';
// components/shared/EquipmentAutocomplete.tsx — one equipment name-search-and-select
// field, built on the shared Combobox primitive (keyboard nav, portal positioning,
// outside-click dismissal all come from there — see design-system/components.tsx).
// Direct structural mirror of EmployeeAutocomplete.tsx, same pattern: type a few
// characters, pick a match, `onSelect` hands back the full record so a caller can
// autofill model/location/department/etc. the same way employee pickers already
// autofill position/department.
import { useTheme, FormField, Combobox, type ComboOption } from '@/components/shared/theme';
import { useEquipment, type EquipmentLookup } from '@/hooks/useLookups';
import { equipmentMatches } from '@/components/shared/utils';

export function EquipmentAutocomplete({ label, required, value, onChange, onSelect, placeholder, disabled, category }: {
  label?: string;
  required?: boolean;
  value: string;
  onChange: (v: string) => void;
  /** Full matched record, in addition to onChange(name) firing on every keystroke —
   *  callers that need to fan out into other fields (model/location/department/…)
   *  on selection use this; callers that only want the name text can omit it. */
  onSelect?: (eq: EquipmentLookup) => void;
  placeholder?: string;
  disabled?: boolean;
  /** Optional category filter (e.g. "Compressors") — narrows the picker to one
   *  equipment category, for pages that only care about one kind of asset. */
  category?: string;
}) {
  const t = useTheme();
  const equipment = useEquipment();
  const scoped = category ? equipment.filter(e => (e.category || '').toLowerCase() === category.toLowerCase()) : equipment;

  const matches = value.length === 0 ? scoped.slice(0, 8) : scoped.filter(e => equipmentMatches(e, value)).slice(0, 8);

  const byValue = new Map(matches.map(e => [String(e.id), e]));
  const options: ComboOption[] = matches.map(e => ({
    value: String(e.id),
    label: e.name || e.equipment_id || 'Unnamed',
    sub: [e.category, e.location, e.power_rating].filter(Boolean).join(' · '),
  }));

  const handleSelect = (opt: ComboOption) => {
    onChange(opt.label);
    const eq = byValue.get(opt.value);
    if (eq) onSelect?.(eq);
  };

  const field = (
    <Combobox
      value={value}
      onChange={onChange}
      onSelect={handleSelect}
      options={options}
      disabled={disabled}
      placeholder={placeholder || 'Type to search equipment…'}
      renderOption={opt => {
        const e = byValue.get(opt.value);
        return (
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex-1 min-w-0">
              <div className={`text-xs font-medium truncate ${t.textPrimary}`}>{opt.label}</div>
              <div className={`text-[10px] truncate ${t.textFaint}`}>{opt.sub}</div>
            </div>
            {e?.equipment_id && <span className={`text-[10px] flex-shrink-0 ${t.textFaint}`}>{e.equipment_id}</span>}
          </div>
        );
      }}
    />
  );

  return label ? <FormField label={label} required={required}>{field}</FormField> : field;
}
