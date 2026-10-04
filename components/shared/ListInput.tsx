// components/shared/ListInput.tsx — a text field that suggests the values already used in a shared, growing list (the server adds a new
// value to the list when a record is saved with it). Free text is always accepted, so a value that is not on the list can be typed.
'use client';

import { useId } from 'react';
import { Input } from '@/components/ui-system';
import { useLookupList } from '@/hooks/useLookups';

export function ListInput({ listName, value, onChange, placeholder, id }: { listName: string; value: string; onChange: (value: string) => void; placeholder?: string; id?: string }) {
  const values = useLookupList(listName);
  const list = useId();
  return (
    <>
      <Input {...(id ? { id } : {})} list={list} value={value} placeholder={placeholder} autoComplete="off" onChange={e => onChange(e.target.value)} />
      <datalist id={list}>{values.map(v => <option key={v} value={v}>{v}</option>)}</datalist>
    </>
  );
}
