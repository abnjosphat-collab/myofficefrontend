'use client';

import { type ButtonHTMLAttributes, type ElementType, type ReactNode, isValidElement, cloneElement } from 'react';
import { RefreshCw } from '@/components/shared/theme';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

export interface GlassButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ElementType;
  iconRight?: ElementType;
  loading?: boolean;
  children?: ReactNode;
  /** Merge button styles onto child element (e.g. Next.js Link) */
  asChild?: boolean;
}

const variantMap: Record<ButtonVariant, string> = {
  primary:
    'bg-gradient-to-br from-[#2A4D69] to-[#1e3a52] border border-[#86BBD8]/25 text-white hover:from-[#335c7d] hover:to-[#24455e] hover:shadow-lg hover:-translate-y-0.5',
  secondary:
    'bg-white/[0.07] border border-white/[0.12] text-white/80 hover:bg-white/[0.13] hover:text-white',
  ghost:
    'bg-transparent border border-transparent text-white/60 hover:bg-white/[0.07] hover:text-white',
  danger:
    'bg-red-600/20 border border-red-500/30 text-red-300 hover:bg-red-600/30 hover:text-red-200',
};

const sizeMap: Record<ButtonSize, string> = {
  xs: 'h-6 px-2 text-[11px] gap-1 rounded-lg',
  sm: 'h-7 px-3 text-xs gap-1.5 rounded-lg',
  md: 'h-8 px-4 text-sm gap-2 rounded-xl',
  lg: 'h-10 px-5 text-sm gap-2 rounded-xl',
};

export function GlassButton({
  variant = 'secondary',
  size = 'md',
  icon: Icon,
  iconRight: IconRight,
  loading = false,
  children,
  className = '',
  disabled,
  asChild = false,
  ...rest
}: GlassButtonProps) {
  const isDisabled = disabled || loading;
  const baseClass = `inline-flex items-center justify-center font-semibold transition-all ${sizeMap[size]} ${variantMap[variant]} disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 ${className}`;

  // asChild: merge our classes + prepend icon into the single child element
  if (asChild && isValidElement(children)) {
    const child = children as React.ReactElement<{ className?: string; children?: ReactNode }>;
    const iconEl = loading
      ? <RefreshCw key="icon" className="h-3.5 w-3.5 animate-spin shrink-0" />
      : Icon
      ? <Icon key="icon" className="h-3.5 w-3.5 shrink-0" />
      : null;
    const iconRightEl = !loading && IconRight ? <IconRight key="iconRight" className="h-3.5 w-3.5 shrink-0" /> : null;
    const existingChildren = child.props.children;
    return cloneElement(child, {
      className: [baseClass, child.props.className].filter(Boolean).join(' '),
    } as Partial<typeof child.props>, ...[iconEl, existingChildren, iconRightEl].filter(Boolean));
  }

  return (
    <button
      {...rest}
      type={rest.type ?? 'button'}
      disabled={isDisabled}
      className={baseClass}
    >
      {loading ? (
        <RefreshCw className="h-3.5 w-3.5 animate-spin shrink-0" />
      ) : Icon ? (
        <Icon className="h-3.5 w-3.5 shrink-0" />
      ) : null}
      {children}
      {!loading && IconRight && <IconRight className="h-3.5 w-3.5 shrink-0" />}
    </button>
  );
}
