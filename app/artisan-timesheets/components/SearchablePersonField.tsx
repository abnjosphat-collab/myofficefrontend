'use client';

import React, { useMemo } from 'react';
import { Combobox, type ComboOption, useTheme } from '@/components/shared/theme';
import type { EmployeeRegisterOption } from '../types';

interface SearchablePersonFieldProps {
  value: string;
  onChange: (name: string) => void;
  options: EmployeeRegisterOption[];
  placeholder?: string;
  disabled?: boolean;
}

export function SearchablePersonField({
  value,
  onChange,
  options,
  placeholder = 'Type to search…',
  disabled,
}: SearchablePersonFieldProps) {
  const t = useTheme();
  const [query, setQuery] = React.useState(value);

  React.useEffect(() => {
    setQuery(value);
  }, [value]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? options.filter(o => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q))
      : options;
    return list.slice(0, 12);
  }, [options, query]);

  const comboOptions: ComboOption[] = filtered.map(o => ({
    value: o.value,
    label: o.value,
    sub: o.label !== o.value ? o.label.replace(`${o.value} `, '') : undefined,
  }));

  return (
    <Combobox
      value={query}
      onChange={setQuery}
      onSelect={opt => {
        setQuery(opt.label);
        onChange(opt.label);
      }}
      onBlurCommit={() => {
        if (query.trim() && query !== value) onChange(query.trim());
      }}
      options={comboOptions}
      disabled={disabled}
      placeholder={placeholder}
      emptyText="No matching employees"
      renderOption={opt => (
        <div className="min-w-0">
          <div className={`text-xs font-medium truncate ${t.textPrimary}`}>{opt.label}</div>
          {opt.sub && <div className={`text-[10px] truncate ${t.textFaint}`}>{opt.sub}</div>}
        </div>
      )}
    />
  );
}
