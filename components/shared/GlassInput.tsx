'use client';

import { type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes, type ElementType } from 'react';

interface BaseProps {
  label?: string;
  error?: string;
  icon?: ElementType;
  className?: string;
  wrapperClassName?: string;
}

type GlassInputProps = BaseProps & InputHTMLAttributes<HTMLInputElement>;
type GlassSelectProps = BaseProps & SelectHTMLAttributes<HTMLSelectElement> & {
  options: { value: string; label: string }[];
};
type GlassTextareaProps = BaseProps & TextareaHTMLAttributes<HTMLTextAreaElement>;

const fieldBase =
  'w-full bg-white/[0.07] border border-white/[0.12] rounded-xl text-sm text-white placeholder:text-white/25 transition-colors focus:outline-none focus:border-[#86BBD8]/50 focus:bg-white/[0.10] disabled:opacity-50 disabled:cursor-not-allowed';

export function GlassInput({
  label,
  error,
  icon: Icon,
  className = '',
  wrapperClassName = '',
  ...props
}: GlassInputProps) {
  return (
    <div className={wrapperClassName}>
      {label && (
        <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <Icon className="h-3.5 w-3.5 text-white/30" />
          </div>
        )}
        <input
          {...props}
          className={`${fieldBase} h-9 ${Icon ? 'pl-9 pr-3' : 'px-3'} ${className}`}
        />
      </div>
      {error && <p className="mt-1 text-[11px] text-red-400">{error}</p>}
    </div>
  );
}

export function GlassSelect({
  label,
  error,
  icon: Icon,
  options,
  className = '',
  wrapperClassName = '',
  ...props
}: GlassSelectProps) {
  return (
    <div className={wrapperClassName}>
      {label && (
        <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10">
            <Icon className="h-3.5 w-3.5 text-white/30" />
          </div>
        )}
        <select
          {...props}
          className={`${fieldBase} h-9 appearance-none ${Icon ? 'pl-9 pr-8' : 'px-3 pr-8'} ${className}`}
        >
          {options.map(opt => (
            <option key={opt.value} value={opt.value} className="bg-[#0e1e2e] text-white">
              {opt.label}
            </option>
          ))}
        </select>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          <svg className="h-3 w-3 text-white/30" viewBox="0 0 10 6" fill="none">
            <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>
      {error && <p className="mt-1 text-[11px] text-red-400">{error}</p>}
    </div>
  );
}

export function GlassTextarea({
  label,
  error,
  icon: Icon,
  className = '',
  wrapperClassName = '',
  rows = 3,
  ...props
}: GlassTextareaProps) {
  return (
    <div className={wrapperClassName}>
      {label && (
        <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <div className="absolute left-3 top-3 pointer-events-none">
            <Icon className="h-3.5 w-3.5 text-white/30" />
          </div>
        )}
        <textarea
          {...props}
          rows={rows}
          className={`${fieldBase} py-2.5 resize-none ${Icon ? 'pl-9 pr-3' : 'px-3'} ${className}`}
        />
      </div>
      {error && <p className="mt-1 text-[11px] text-red-400">{error}</p>}
    </div>
  );
}
