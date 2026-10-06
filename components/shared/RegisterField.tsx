// components/shared/RegisterField.tsx — a field that fills from a register (machines, people, sections, parts): type a few characters,
// see the match as ghost text, press Tab to take it. It is PredictiveInput with the register as the source, not a second autocomplete.
// The value is the text plus the register row's id; typing something the register does not have keeps the text and no id (free text),
// and a small tag always says which of the two the field holds. A register that is still loading or failed to load never blocks typing.
'use client';

import { useMemo } from 'react';
import { Button, Icon, controlClasses, useFieldProps } from '@/components/ui-system';
import { PredictiveInput, type PredictiveOption } from '@/components/shared/PredictiveInput';

/** What a register field holds: the visible text, and the register row's id when one was picked (null for free text). */
export interface RegisterRef { text: string; id: number | null }

/** One row of a register, as offered to the field. A `disabled` row stays visible with its `note` (for example a person on leave). */
export interface RegisterOption { id: number; label: string; description?: string; disabled?: boolean; note?: string }

export type RegisterLoad = 'ready' | 'loading' | 'error';

export interface RegisterFieldProps {
  value: RegisterRef;
  onChange: (value: RegisterRef) => void;
  options: RegisterOption[];
  /** The register's own state. Typing is allowed in every state; only the suggestions depend on it. */
  load?: RegisterLoad;
  onRetry?: () => void;
  /** What the register holds, for the placeholder and messages: "machine", "person", "section". */
  noun: string;
  /** Free text is a provision, on by default; turn off only where a register row is truly required. */
  allowFreeText?: boolean;
  disabled?: boolean;
  /** Associates the control with a `Field` (via `useFieldProps`) when true (default). */
  inField?: boolean;
}

export const emptyRef: RegisterRef = { text: '', id: null };

export function RegisterField({ value, onChange, options, load = 'ready', onRetry, noun, allowFreeText = true, disabled }: RegisterFieldProps) {
  const { id } = useFieldProps();
  const predictive = useMemo<PredictiveOption[]>(() => options.map(o => ({ value: String(o.id), label: o.label, description: o.description, disabled: o.disabled, note: o.note })), [options]);
  const picked = value.id !== null && options.some(o => o.id === value.id && o.label === value.text);
  const typed = value.text.trim().length > 0;

  // Editing the text of a picked row drops its id, so a stale link to the register can never be saved.
  const change = (text: string) => onChange({ text, id: value.id !== null && options.some(o => o.id === value.id && o.label === text) ? value.id : null });
  const pick = (o: PredictiveOption) => onChange({ text: o.label ?? o.value, id: Number(o.value) });

  const placeholder = load === 'loading' ? `Loading ${noun}s...` : `Type a ${noun} name`;
  return (
    <div className="flex flex-col gap-1.5">
      <PredictiveInput
        id={id} historyKey={`register_${noun}`} value={value.text} onChange={change} onPick={pick} options={predictive} useHistory={false}
        placeholder={placeholder} disabled={disabled} inputClassName={controlClasses}
      />
      <div className="flex min-h-5 flex-wrap items-center gap-x-3 gap-y-1 font-sans text-caption text-ink-muted" aria-live="polite">
        {typed && (picked
          ? <span className="inline-flex items-center gap-1 text-ink"><Icon name="success" size="sm" />From register</span>
          : load !== 'ready'
            ? <span className="inline-flex items-center gap-1"><Icon name="info" size="sm" />Not checked against the {noun} register yet</span>
            : allowFreeText
            ? <span className="inline-flex items-center gap-1"><Icon name="edit" size="sm" />Free text: not on the {noun} register</span>
            : <span className="inline-flex items-center gap-1 text-danger"><Icon name="warning" size="sm" />Choose a {noun} from the register</span>)}
        {load === 'error' && (
          <span className="inline-flex items-center gap-2 text-danger">
            <Icon name="warning" size="sm" />The {noun} register could not be loaded. You can still type a name.
            {onRetry && <Button size="sm" variant="ghost" onClick={onRetry}>Retry</Button>}
          </span>
        )}
      </div>
    </div>
  );
}
