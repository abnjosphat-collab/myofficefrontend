'use client';

import { useState, type ReactNode, type ElementType } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface GlassPanelProps {
  /** oz-glass-dark (hero-style) or oz-glass-panel (secondary panels) */
  variant?: 'dark' | 'panel';
  icon?: ElementType;
  title?: string;
  /** Small count shown after title, e.g. "12 records" */
  count?: string | number;
  /** Inline badge element next to the title (e.g. "Active" pill) */
  badge?: ReactNode;
  /** Action buttons shown in the header before the collapse toggle */
  actions?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
  /** Class applied to the content wrapper div */
  contentClassName?: string;
  /** Controlled open state — provided by usePageCollapse().panel(key) */
  open?: boolean;
  /** Called when the toggle button is clicked in controlled mode */
  onToggle?: () => void;
}

export function GlassPanel({
  variant = 'panel',
  icon: Icon,
  title,
  count,
  badge,
  actions,
  children,
  defaultOpen = true,
  className = '',
  contentClassName = '',
  open: controlledOpen,
  onToggle,
}: GlassPanelProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  // If caller passes open/onToggle, use those; otherwise manage state internally
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const handleToggle = onToggle ?? (() => setInternalOpen(v => !v));
  const base = variant === 'dark' ? 'oz-glass-dark' : 'oz-glass-panel';

  const hasHeader = Icon || title || actions || badge || count !== undefined;

  return (
    <div className={`${base} rounded-2xl overflow-hidden ${className}`}>
      {hasHeader && (
        <div className="flex items-center justify-between px-4 sm:px-5 py-2.5 sm:py-3 border-b border-white/[0.07]">
          <div className="flex items-center gap-2 min-w-0">
            {Icon && <Icon className="h-3.5 w-3.5 text-[#86BBD8] shrink-0" />}
            {title && (
              <span className="text-xs font-semibold text-white/80 uppercase tracking-wider truncate">
                {title}
              </span>
            )}
            {count !== undefined && (
              <span className="text-[11px] text-white/35 shrink-0">{count}</span>
            )}
            {badge}
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {actions}
            <button
              type="button"
              aria-label={open ? 'Collapse section' : 'Expand section'}
              onClick={handleToggle}
              className="h-9 w-9 sm:h-7 sm:w-7 flex items-center justify-center rounded-md bg-white/[0.07] hover:bg-white/[0.15] text-white/50 border border-white/12 transition-all"
            >
              {open ? <ChevronUp className="h-3.5 w-3.5 sm:h-3 sm:w-3" /> : <ChevronDown className="h-3.5 w-3.5 sm:h-3 sm:w-3" />}
            </button>
          </div>
        </div>
      )}
      {open && (
        <div className={contentClassName}>{children}</div>
      )}
    </div>
  );
}
