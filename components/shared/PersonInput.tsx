// components/shared/PersonInput.tsx — a name field that suggests people from the employee list as you type. The value is the name as
// text, so someone not on the list (a contractor, a visitor) can still be typed in.
'use client';

import { useId, useMemo } from 'react';
import { Input } from '@/components/ui-system';
import { useEmployees } from '@/hooks/useLookups';

export function PersonInput({ value, onChange, placeholder, disabled, id }: { value: string; onChange: (name: string) => void; placeholder?: string; disabled?: boolean; id?: string }) {
  const employees = useEmployees();
  const list = useId();
  const names = useMemo(() => {
    const seen = new Set<string>();
    return employees.map(e => (e.full_name || e.name || `${e.first_name || ''} ${e.last_name || ''}`).trim()).filter(n => n && !seen.has(n) && !!seen.add(n)).sort();
  }, [employees]);
  return (
    <>
      <Input {...(id ? { id } : {})} list={list} value={value} disabled={disabled} placeholder={placeholder} autoComplete="off" onChange={e => onChange(e.target.value)} />
      <datalist id={list}>{names.map(n => <option key={n} value={n}>{n}</option>)}</datalist>
    </>
  );
}
