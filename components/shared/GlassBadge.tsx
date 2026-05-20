'use client';

import type { ElementType, ReactNode } from 'react';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'purple';

interface GlassBadgeProps {
  variant?: BadgeVariant;
  icon?: ElementType;
  children: ReactNode;
  className?: string;
  size?: 'sm' | 'md';
}

const variantMap: Record<BadgeVariant, string> = {
  success: 'bg-emerald-500/15 border-emerald-500/25 text-emerald-300',
  warning: 'bg-amber-500/15 border-amber-500/25 text-amber-300',
  danger:  'bg-red-500/15 border-red-500/25 text-red-300',
  info:    'bg-[#86BBD8]/15 border-[#86BBD8]/25 text-[#86BBD8]',
  neutral: 'bg-white/[0.07] border-white/[0.12] text-white/60',
  purple:  'bg-purple-500/15 border-purple-500/25 text-purple-300',
};

const sizeMap = {
  sm: 'px-1.5 py-0.5 text-[10px] gap-1 rounded-md',
  md: 'px-2 py-0.5 text-[11px] gap-1.5 rounded-lg',
};

export function GlassBadge({
  variant = 'neutral',
  icon: Icon,
  children,
  className = '',
  size = 'md',
}: GlassBadgeProps) {
  return (
    <span
      className={`inline-flex items-center font-semibold border tracking-wide ${sizeMap[size]} ${variantMap[variant]} ${className}`}
    >
      {Icon && <Icon className="h-3 w-3 shrink-0" />}
      {children}
    </span>
  );
}
