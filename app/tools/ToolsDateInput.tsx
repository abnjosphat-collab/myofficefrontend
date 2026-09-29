'use client';

import type { ComponentPropsWithoutRef, MouseEvent } from 'react';
import { ToolsIcon as Icon } from './ToolsIcon';
import s from './tools.module.css';

type NativeDateType = 'date' | 'datetime-local';
type ToolsDateInputProps = Omit<ComponentPropsWithoutRef<'input'>, 'type'> & {
  type?: NativeDateType;
};

export function showNativeDatePicker(input: HTMLInputElement) {
  if (input.disabled || input.readOnly) return;
  try {
    input.showPicker?.();
  } catch {
    input.focus();
  }
}

export function ToolsDateInput({ type = 'date', className, onClick, ...props }: ToolsDateInputProps) {
  const handleClick = (event: MouseEvent<HTMLInputElement>) => {
    onClick?.(event);
    if (!event.defaultPrevented) showNativeDatePicker(event.currentTarget);
  };

  return <span className={s.dateInput}>
    <input {...props} type={type} className={className} onClick={handleClick} />
    <Icon name="calendar" size={17} />
  </span>;
}
