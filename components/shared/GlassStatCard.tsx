'use client';

import type { ElementType, ReactNode } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface TrendInfo {
  value: number;
  label?: string;
}

interface GlassStatCardProps {
  label: string;
  value: string | number;
  icon?: ElementType;
  /** Tailwind text colour class for the value, e.g. 'text-[#86BBD8]' */
  valueClass?: string;
  trend?: TrendInfo;
  children?: ReactNode;
  onClick?: () => void;
  className?: string;
}

export function GlassStatCard({
  label,
  value,
  icon: Icon,
  valueClass = 'text-[#86BBD8]',
  trend,
  children,
  onClick,
  className = '',
}: GlassStatCardProps) {
  const Tag = onClick ? 'button' : 'div';

  const trendIcon =
    trend && trend.value > 0 ? TrendingUp :
    trend && trend.value < 0 ? TrendingDown :
    Minus;
  const TrendIcon = trendIcon;
  const trendClass =
    trend && trend.value > 0 ? 'text-emerald-400' :
    trend && trend.value < 0 ? 'text-red-400' :
    'text-white/30';

  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`rounded-xl p-3 border border-white/[0.08] bg-white/[0.05] text-left transition-all ${onClick ? 'hover:bg-white/[0.09] cursor-pointer' : ''} ${className}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className={`text-2xl font-bold leading-none ${valueClass}`}>{value}</div>
          <div className="text-xs text-white/50 mt-1 truncate">{label}</div>
          {trend && (
            <div className={`flex items-center gap-1 mt-1.5 text-[11px] font-medium ${trendClass}`}>
              <TrendIcon className="h-3 w-3 shrink-0" />
              <span>{trend.value > 0 ? '+' : ''}{trend.value}%{trend.label ? ` ${trend.label}` : ''}</span>
            </div>
          )}
        </div>
        {Icon && (
          <div className="p-2 rounded-lg bg-white/[0.06] border border-white/[0.08] shrink-0">
            <Icon className="h-4 w-4 text-white/40" />
          </div>
        )}
      </div>
      {children}
    </Tag>
  );
}
