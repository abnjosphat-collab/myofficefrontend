'use client';

import { forwardRef, useEffect, useId, useRef, useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '../foundations/cn';
import { CheckMark } from '../motion/CheckMark';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'children'> {
  label?: ReactNode;
  description?: ReactNode;
  /** Tri-state dash (for "some selected" headers). A property on the input, not an attribute. */
  indeterminate?: boolean;
}

/** Native checkbox with the shared look. The tick draws on with the shared stroke (and off in reverse); the indeterminate dash scales from the centre. Keeps platform semantics and keyboard behaviour. */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox({ label, description, className, id, indeterminate = false, checked, defaultChecked, onChange, ...rest }, ref) {
  const auto = useId();
  const inputId = id ?? auto;
  const [internal, setInternal] = useState(!!defaultChecked);
  const isChecked = checked ?? internal;
  const inputRef = useRef<HTMLInputElement | null>(null);
  // `indeterminate` is an input property, not an attribute: it must be set imperatively.
  useEffect(() => {
    if (inputRef.current) inputRef.current.indeterminate = indeterminate;
  }, [indeterminate]);
  return (
    <div className={cn('flex touch-target items-start gap-2.5', className)}>
      <span className="relative mt-0.5 inline-flex size-[18px] shrink-0">
        <input
          ref={node => {
            inputRef.current = node;
            if (typeof ref === 'function') ref(node);
            else if (ref) ref.current = node;
          }}
          id={inputId}
          type="checkbox"
          checked={checked}
          defaultChecked={checked === undefined ? defaultChecked : undefined}
          onChange={event => {
            if (checked === undefined) setInternal(event.target.checked);
            onChange?.(event);
          }}
          className="peer focus-ring size-[18px] cursor-pointer appearance-none rounded-xs border border-line-control bg-surface-raised transition-colors checked:border-action checked:bg-action indeterminate:border-action indeterminate:bg-action disabled:cursor-not-allowed disabled:opacity-45"
          {...rest}
        />
        <CheckMark checked={isChecked && !indeterminate} indeterminate={indeterminate} size={12} className="pointer-events-none absolute inset-0 m-auto text-action-ink" />
      </span>
      {(label || description) && (
        <label htmlFor={inputId} className="cursor-pointer font-sans text-body text-ink">
          {label}
          {description && <span className="mt-0.5 block text-caption text-ink-muted">{description}</span>}
        </label>
      )}
    </div>
  );
});
