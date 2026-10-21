// components/shared/RegisterCheck.tsx — flags records whose employee does not match the employee register, and
// lets a page show only those so a person can correct or delete them. Shared by Leaves, Overtime and PPE.
'use client';

import { useMemo } from 'react';
import { Button, Notice, StatusBadge } from '@/components/ui-system';
import { useEmployeeRegister } from '@/hooks/useLookups';
import { indexRegister, matchToRegister, type RegisterMatch } from '@/lib/registerMatch';

type RecordRef = { employee_id?: string | null; employee_name?: string | null };

/** `matchOf` is 'linked' for everything until the register has loaded, so nothing is flagged on a guess. */
export function useRegisterCheck() {
  const { employees, loaded } = useEmployeeRegister();
  const index = useMemo(() => indexRegister(employees), [employees]);
  const ready = loaded && employees.length > 0;
  return useMemo(() => ({ ready, matchOf: (r: RecordRef): RegisterMatch => (ready ? matchToRegister(r, index) : 'linked') }), [ready, index]);
}

const TEXT: Record<Exclude<RegisterMatch, 'linked'>, { label: string; why: string }> = {
  'number-differs': { label: 'Number not on register', why: 'The employee number on this record is not on the employee register, though the name is.' },
  'not-on-register': { label: 'Not on register', why: 'Neither the employee number nor the name on this record is on the employee register.' },
};

/** Shown next to a record that does not match the register; nothing for a matched record. */
export function RegisterFlag({ match }: { match: RegisterMatch }) {
  if (match === 'linked') return null;
  const t = TEXT[match];
  return <span title={t.why}><StatusBadge tone={match === 'not-on-register' ? 'danger' : 'warning'} icon="warning">{t.label}</StatusBadge></span>;
}

/** A one-line notice with the count, a switch to show only the unmatched records, and — when the page
 *  passes `onDeleteAll` — a quiet delete-all for exactly the records the page can delete. */
export function RegisterNotice({ count, noun, only, onToggle, onDeleteAll }: {
  count: number; noun: string; only: boolean; onToggle: () => void;
  /** The page filters out what its single-delete refuses and names it in the confirm (see D15). */
  onDeleteAll?: { count: number; pending: boolean; run: () => void };
}) {
  if (count === 0 && !only) return null;
  const plural = onDeleteAll && onDeleteAll.count !== 1;
  return (
    <Notice
      tone="warning"
      title={`${count} ${count === 1 ? noun : `${noun}s`} ${count === 1 ? 'does' : 'do'} not match the employee register`}
      action={
        <div className="flex items-center gap-2">
          {onDeleteAll && (
            <Button
              size="sm" variant="danger-quiet" icon="delete" pending={onDeleteAll.pending} onClick={onDeleteAll.run}
              aria-label={`Delete ${onDeleteAll.count} unmatched ${plural ? `${noun}s` : noun}`}
            >
              Delete {onDeleteAll.count}
            </Button>
          )}
          <Button size="sm" onClick={onToggle}>{only ? 'Show all' : 'Show them'}</Button>
        </div>
      }
    >
      {onDeleteAll
        ? 'Their employee number is not on the register. Open each one to correct the person, or delete them all at once.'
        : 'Their employee number is not on the register. Open each one to correct the person, or delete it.'}
    </Notice>
  );
}
