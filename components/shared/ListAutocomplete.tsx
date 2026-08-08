'use client';
// components/shared/ListAutocomplete.tsx — pick from a shared, growing list backed
// by the generic lookup_lists table (backend/app/routers/lookup_lists.py), or type
// a value not on it yet. Unlike EmployeeAutocomplete/EquipmentAutocomplete/
// SpareAutocomplete (which pick a *record*), this picks a plain string — the value
// itself IS the thing being selected. Typing a new value doesn't need any special
// handling here: the backend learns it automatically once the record that uses it
// (e.g. a breakdown) is saved (see breakdowns.py's `learn_lookup_value`), so next
// time it shows up in this same list without the caller doing anything extra.
import { Combobox, type ComboOption, FormField } from '@/components/shared/theme';
import { useLookupList } from '@/hooks/useLookups';

export function ListAutocomplete({ listName, label, required, value, onChange, placeholder, disabled }: {
  /** The lookup_lists `list_name` this picker reads from/grows (e.g. "breakdown_location"). */
  listName: string;
  label?: string;
  required?: boolean;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const list = useLookupList(listName);

  const q = value.toLowerCase();
  const matches = (q.length === 0 ? list : list.filter(v => v.toLowerCase().includes(q))).slice(0, 8);
  const options: ComboOption[] = matches.map(v => ({ value: v, label: v }));

  const field = (
    <Combobox
      value={value}
      onChange={onChange}
      onSelect={opt => onChange(opt.label)}
      options={options}
      disabled={disabled}
      emptyText="No matches — will be saved as a new option"
      placeholder={placeholder || 'Pick or type…'}
    />
  );

  return label ? <FormField label={label} required={required}>{field}</FormField> : field;
}
