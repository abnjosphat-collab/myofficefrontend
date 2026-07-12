'use client';

import { useState, type ReactNode, type ElementType } from 'react';
import { ChevronRight, ChevronUp, ChevronDown, Plus, RefreshCw } from '@/components/shared/theme';

export interface StatItem {
  label: string;
  value: number | string;
  /** Tailwind text colour class e.g. 'text-[#86BBD8]' */
  textClass?: string;
  ariaLabel?: string;
  onClick?: () => void;
}

interface HeroPanelProps {
  icon: ElementType;
  /** Shown in the breadcrumb — defaults to title */
  breadcrumb?: string;
  title: string;
  subtitle?: string;
  onRefresh?: () => void;
  loading?: boolean;
  onNew?: () => void;
  newLabel?: string;
  /** Extra action elements inserted before the refresh button */
  actions?: ReactNode;
  stats?: StatItem[];
  defaultOpen?: boolean;
  /** Controlled open state — provided by usePageCollapse().panel(key) */
  open?: boolean;
  /** Called when the stats toggle is clicked in controlled mode */
  onToggle?: () => void;
}

export function HeroPanel({
  icon: Icon,
  breadcrumb,
  title,
  subtitle,
  onRefresh,
  loading,
  onNew,
  newLabel = 'New',
  actions,
  stats,
  defaultOpen = true,
  open: controlledOpen,
  onToggle,
}: HeroPanelProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const handleToggle = onToggle ?? (() => setInternalOpen(v => !v));
  const hasStats = stats && stats.length > 0;

  return (
    <div className="oz-glass-dark rounded-2xl overflow-hidden">
      <div className="px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-2 sm:gap-3">
        {/* Left: icon + breadcrumb + title */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="p-2 sm:p-2.5 rounded-xl bg-[#2A4D69]/50 border border-[#86BBD8]/20 shrink-0">
            <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-[#86BBD8]" />
          </div>
          <div className="min-w-0">
            <nav className="flex items-center gap-1.5 text-xs text-white/40 mb-0.5">
              <span>Home</span>
              <ChevronRight className="h-3 w-3" />
              <span className="text-white/70 font-medium truncate">{breadcrumb ?? title}</span>
            </nav>
            <h1 className="text-lg sm:text-xl font-bold text-white font-heading tracking-tight truncate">{title}</h1>
            {subtitle && (
              <p className="text-xs text-white/35 mt-0.5 truncate">{subtitle}</p>
            )}
          </div>
        </div>

        {/* Right: action buttons + collapse toggle */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {actions}
          {onRefresh && (
            <button
              type="button"
              aria-label="Refresh data"
              onClick={onRefresh}
              disabled={loading}
              className="h-10 w-10 sm:h-8 sm:w-8 flex items-center justify-center rounded-lg bg-white/[0.07] border border-white/[0.12] text-white/50 hover:text-white/90 hover:bg-white/[0.12] transition-all disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          )}
          {onNew && (
            <button
              type="button"
              onClick={onNew}
              className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 sm:py-2 rounded-xl text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:shadow-lg bg-gradient-to-br from-[#2A4D69] to-[#1e3a52] border border-[#86BBD8]/25"
            >
              <Plus className="h-4 w-4 shrink-0" />
              <span className="hidden xs:inline sm:inline">{newLabel}</span>
            </button>
          )}
          {hasStats && (
            <button
              type="button"
              aria-label={open ? 'Hide stats' : 'Show stats'}
              onClick={handleToggle}
              className="h-10 w-10 sm:h-8 sm:w-8 flex items-center justify-center rounded-lg bg-white/[0.07] border border-white/[0.12] text-white/50 hover:text-white/90 hover:bg-white/[0.12] transition-all"
            >
              {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
          )}
        </div>
      </div>

      {/* Stats grid */}
      {hasStats && open && (
        <div className={`px-4 sm:px-6 pb-4 pt-3 border-t border-white/[0.07] grid gap-2 sm:gap-3 ${
          stats!.length <= 4
            ? 'grid-cols-2 sm:grid-cols-4'
            : stats!.length === 5
            ? 'grid-cols-2 sm:grid-cols-5'
            : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6'
        }`}>
          {stats!.map(s => (
            <button
              key={s.label}
              type="button"
              aria-label={s.ariaLabel ?? s.label}
              onClick={s.onClick}
              className="rounded-xl p-3 text-left border border-white/[0.08] bg-white/[0.05] hover:bg-white/[0.09] transition-all"
            >
              <div className={`text-2xl font-bold ${s.textClass ?? 'text-[#86BBD8]'}`}>{s.value}</div>
              <div className="text-xs text-white/50 mt-0.5">{s.label}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
