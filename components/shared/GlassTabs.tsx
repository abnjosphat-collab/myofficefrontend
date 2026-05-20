'use client';

import { useState, type ReactNode, type ElementType } from 'react';

export interface GlassTab {
  key: string;
  label: string;
  icon?: ElementType;
  count?: number | string;
  content: ReactNode;
}

interface GlassTabsProps {
  tabs: GlassTab[];
  defaultTab?: string;
  className?: string;
  /** Variant: 'pills' (default) or 'underline' */
  variant?: 'pills' | 'underline';
  /** Callback when active tab changes */
  onChange?: (key: string) => void;
}

export function GlassTabs({
  tabs,
  defaultTab,
  className = '',
  variant = 'pills',
  onChange,
}: GlassTabsProps) {
  const [active, setActive] = useState(defaultTab ?? tabs[0]?.key ?? '');

  const handleChange = (key: string) => {
    setActive(key);
    onChange?.(key);
  };

  const activeTab = tabs.find(t => t.key === active);

  return (
    <div className={className}>
      {/* Tab bar */}
      <div className={`flex items-center gap-1 mb-4 ${variant === 'underline' ? 'border-b border-white/[0.08]' : ''}`}>
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = tab.key === active;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => handleChange(tab.key)}
              className={
                variant === 'pills'
                  ? `inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-[#2A4D69]/60 border border-[#86BBD8]/25 text-[#86BBD8]'
                        : 'text-white/40 hover:text-white/70 hover:bg-white/[0.05]'
                    }`
                  : `inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-all -mb-px ${
                      isActive
                        ? 'border-[#86BBD8] text-[#86BBD8]'
                        : 'border-transparent text-white/40 hover:text-white/60'
                    }`
              }
            >
              {Icon && <Icon className="h-3.5 w-3.5" />}
              {tab.label}
              {tab.count !== undefined && (
                <span className={`text-[10px] px-1 rounded ${isActive ? 'bg-[#86BBD8]/20' : 'bg-white/[0.08]'}`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      {activeTab && <div>{activeTab.content}</div>}
    </div>
  );
}
