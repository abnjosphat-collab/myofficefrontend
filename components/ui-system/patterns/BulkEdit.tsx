// components/ui-system/patterns/BulkEdit.tsx — change the same fields on many
// records at once. Every field starts LOCKED and locked fields are never sent:
// the patch contains only what was unlocked and given a value, so an untouched
// dialog cannot wipe anything.
'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { IconButton } from '../primitives/Button';
import { Field } from '../primitives/Field';
import { Notice } from './DataRegion';
import { FormDialog } from './FormDialog';

export interface BulkField {
  key: string;
  label: string;
  hint?: string;
}

export function useBulkEdit() {
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [unlocked, setUnlocked] = useState<string[]>([]);
  const set = (key: string, value: unknown) => setValues(v => ({ ...v, [key]: value }));
  const toggle = (key: string) => setUnlocked(u => (u.includes(key) ? u.filter(k => k !== key) : [...u, key]));
  /** Only unlocked fields with a value. Unlocking without filling changes nothing. */
  const patch = (): Record<string, unknown> =>
    Object.fromEntries(unlocked.filter(k => values[k] !== undefined && values[k] !== '').map(k => [k, values[k]]));
  const reset = () => { setValues({}); setUnlocked([]); };
  return { values, set, unlocked, toggle, patch, reset };
}

/**
 * One bulk-edit dialog for any register. The caller lists the fields and renders
 * each control; locks, the patch and the empty-submit message live here.
 */
export function BulkEditDialog({ open, onOpenChange, title, description, count, notice, fields, renderControl, onSubmit, submitLabel }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  count: number;
  /** Heads-up shown above the fields (locked records in the selection, …). */
  notice?: ReactNode;
  fields: BulkField[];
  renderControl: (field: BulkField, value: unknown, setValue: (value: unknown) => void, locked: boolean) => ReactNode;
  onSubmit: (patch: Record<string, unknown>) => Promise<void>;
  submitLabel: string;
}) {
  const { values, set, unlocked, toggle, patch, reset } = useBulkEdit();
  const wasOpen = useRef(open);
  useEffect(() => { if (open && !wasOpen.current) reset(); wasOpen.current = open; });
  const submit = async () => {
    if (unlocked.length === 0) throw new Error('Unlock at least one field — locked fields are left alone.');
    const p = patch();
    if (Object.keys(p).length === 0) throw new Error('Fill in the unlocked fields, or lock them again.');
    await onSubmit(p);
  };
  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title={title} description={description} submitLabel={submitLabel} onSubmit={submit}>
      <div className="flex flex-col gap-4">
        <p className="font-sans text-body-sm text-ink-muted" role="status">
          {count} {count === 1 ? 'record' : 'records'} selected. Only unlocked fields change; everything else stays as it is.
        </p>
        {notice}
        <ul className="flex flex-col gap-4">
          {fields.map(f => {
            const locked = !unlocked.includes(f.key);
            return (
              <li key={f.key}>
                <Field label={f.label} optional description={f.hint}>
                  <div className="flex items-center gap-2">
                    <div className="min-w-0 flex-1">
                      {renderControl(f, values[f.key], v => set(f.key, v), locked)}
                    </div>
                    <IconButton icon="lock" size="sm" variant={locked ? 'ghost' : 'outline'} pressed={!locked}
                      label={locked ? `Unlock ${f.label}` : `Lock ${f.label} again`} onClick={() => toggle(f.key)} className="shrink-0" />
                  </div>
                </Field>
              </li>
            );
          })}
        </ul>
      </div>
    </FormDialog>
  );
}

export function BulkEditLockedNotice({ count, noun }: { count: number; noun: string }) {
  if (count === 0) return null;
  return (
    <Notice tone="warning" title="Some need a manager">
      {count} {noun}{count === 1 ? '' : 's'} {count === 1 ? 'is' : 'are'} already decided. {count === 1 ? 'It changes' : 'Those change'} only for a manager; the rest update normally.
    </Notice>
  );
}
