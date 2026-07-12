'use client';

import { useEffect, useRef, useState, type ElementType, type ReactNode } from 'react';
import { TrendingUp, TrendingDown, Minus } from '@/components/shared/theme';

interface TrendInfo {
  value: number;
  label?: string;
}

interface GlassStatCardProps {
  label: string;
  value: string | number;
  icon?: ElementType;
  valueClass?: string;
  trend?: TrendInfo;
  children?: ReactNode;
  onClick?: () => void;
  className?: string;
}

// ─── Animated count-up hook ───────────────────────────────────────────────────

function parseNumeric(v: string | number): { num: number; prefix: string; suffix: string; decimals: number } | null {
  const raw = String(v).trim();
  // Detect prefix ($, £, €) and suffix (%, h, d, +…)
  const prefixMatch = raw.match(/^([£$€])/);
  const prefix = prefixMatch ? prefixMatch[1] : '';
  const stripped = raw.replace(/^[£$€]/, '').replace(/,/g, '');
  const suffixMatch = stripped.match(/([^0-9.]+)$/);
  const suffix = suffixMatch ? suffixMatch[1] : '';
  const numStr = stripped.replace(/[^0-9.]/g, '');
  const num = parseFloat(numStr);
  if (isNaN(num) || numStr === '') return null;
  const decimals = numStr.includes('.') ? (numStr.split('.')[1]?.length ?? 0) : 0;
  return { num, prefix, suffix, decimals };
}

function easeOutCubic(t: number) { return 1 - Math.pow(1 - t, 3); }

function useCountUp(value: string | number, duration = 700): string {
  const parsed = parseNumeric(value);
  const [display, setDisplay] = useState<string | number>(value);
  const frameRef = useRef<number>(0);
  const startRef = useRef<number>(0);

  useEffect(() => {
    if (!parsed || parsed.num === 0) { setDisplay(value); return; }
    cancelAnimationFrame(frameRef.current);
    startRef.current = performance.now();

    const { num, prefix, suffix, decimals } = parsed;

    const tick = (now: number) => {
      const elapsed  = now - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased    = easeOutCubic(progress);
      const current  = eased * num;
      const formatted = decimals > 0
        ? current.toFixed(decimals)
        : String(Math.round(current));
      setDisplay(`${prefix}${formatted}${suffix}`);
      if (progress < 1) frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  // Only re-run when the value actually changes — duration is stable
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return String(display);
}

// ─── Component ────────────────────────────────────────────────────────────────

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
  const animated = useCountUp(value);
  const Tag = onClick ? 'button' : 'div';

  const TrendIcon =
    trend && trend.value > 0 ? TrendingUp :
    trend && trend.value < 0 ? TrendingDown :
    Minus;

  const trendClass =
    trend && trend.value > 0 ? 'text-emerald-400' :
    trend && trend.value < 0 ? 'text-red-400' :
    'text-white/30';

  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`oz-card-enter rounded-xl p-3 border border-white/[0.08] bg-white/[0.05] text-left transition-all ${
        onClick ? 'hover:bg-white/[0.09] hover:-translate-y-0.5 cursor-pointer' : ''
      } ${className}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className={`oz-stat-count text-2xl font-bold leading-none ${valueClass}`}>
            {animated}
          </div>
          <div className="text-xs text-white/50 mt-1 truncate">{label}</div>
          {trend && (
            <div className={`flex items-center gap-1 mt-1.5 text-[11px] font-medium ${trendClass}`}>
              <TrendIcon className="h-3 w-3 shrink-0" />
              <span>
                {trend.value > 0 ? '+' : ''}{trend.value}%
                {trend.label ? ` ${trend.label}` : ''}
              </span>
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
