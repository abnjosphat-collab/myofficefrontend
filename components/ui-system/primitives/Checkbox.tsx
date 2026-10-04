'use client';

import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '../foundations/cn';
import { Icon } from '../foundations/Icon';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'children'> {
  label?: ReactNode;
  description?: ReactNode;
}

/** Native checkbox with the shared look. Keeps platform semantics and keyboard behaviour. */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox({ label, description, className, id, ...rest }, ref) {
  const auto = useId();
  const inputId = id ?? auto;
  return (
    <div className={cn('flex items-start gap-2.5', className)}>
      <span className="relative mt-0.5 inline-flex size-[18px] shrink-0">
        <input
          ref={ref}
          id={inputId}
          type="checkbox"
          className="peer focus-ring size-[18px] cursor-pointer appearance-none rounded-xs border border-line-control bg-surface-raised transition-colors checked:border-action checked:bg-action indeterminate:border-action indeterminate:bg-action disabled:cursor-not-allowed disabled:opacity-45"
          {...rest}
        />
        <Icon name="check" size={12} weight="emphasis" className="pointer-events-none absolute inset-0 m-auto text-action-ink opacity-0 peer-checked:opacity-100" />
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
