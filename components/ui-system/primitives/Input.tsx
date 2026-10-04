'use client';

import { forwardRef, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn } from '../foundations/cn';
import { controlClasses, useFieldProps } from './Field';

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

/** Text-like input (text, number, date, email, password…). Joins a surrounding Field automatically. */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ className, type = 'text', ...rest }, ref) {
  const field = useFieldProps();
  return <input ref={ref} type={type} {...field} {...rest} className={cn(controlClasses, 'h-9 touch-target', className)} />;
});

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea({ className, rows = 4, ...rest }, ref) {
  const field = useFieldProps();
  return <textarea ref={ref} rows={rows} {...field} {...rest} className={cn(controlClasses, 'min-h-20 resize-y py-2 leading-6', className)} />;
});

/** Native <select> for short fixed lists where platform behaviour serves the workflow (mobile pickers). */
export const NativeSelect = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function NativeSelect({ className, children, ...rest }, ref) {
  const field = useFieldProps();
  return (
    <select ref={ref} {...field} {...rest} className={cn(controlClasses, 'h-9 touch-target pr-8', className)}>
      {children}
    </select>
  );
});
