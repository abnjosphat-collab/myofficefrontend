// app/maintenance/PersonField.tsx — a person from the employees register, anyone listed (no leave greying). For names that record who did
// something or who asked: the sign-off names, and the schedule's people until schedules enforce leave. Assignment fields use RegisterField
// with the assignable list from usePersonOptions.
'use client';

import { RegisterField } from './RegisterField';
import { usePersonOptions } from './useRegisters';

export function PersonField({ value, onChange, placeholder = 'Type to search employees', id }: { value: string; onChange: (name: string) => void; placeholder?: string; id?: string }) {
  const { anyone } = usePersonOptions();
  return <RegisterField {...(id ? { id } : {})} value={value} onChange={onChange} options={anyone} registerName="employees register" placeholder={placeholder} />;
}
