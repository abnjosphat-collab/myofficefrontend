'use client';

// PillTabs — the rounded pill-group tab switcher repeated across overtime,
// drivingSchool/dashboard, leave-management, availability, and availabilities:
// a glass pill container with active/inactive buttons carrying an icon, a
// label, and an optional count badge. Generic over the tab-key union so each
// page keeps its own literal type (e.g. 'records' | 'analytics' | ...).

import { ElementType } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import { useTheme } from '@/components/shared/theme';

export interface PillTab<T extends string> {
  key: T;
  label: string;
  icon: ElementType;
  count?: number;
}

export function PillTabs<T extends string>({
  tabs,
  value,
  onChange,
  wrap = 'none',
}: {
  tabs: PillTab<T>[];
  value: T;
  onChange: (key: T) => void;
  wrap?: 'none' | 'scroll' | 'wrap';
}) {
  const t = useTheme();
  const containerCls = `flex items-center gap-1 ${t.glassSoft} rounded-xl p-1 w-fit${
    wrap === 'scroll' ? ' overflow-x-auto' : wrap === 'wrap' ? ' flex-wrap' : ''
  }`;

  // Real ARIA tabs pattern (role="tablist"/"tab", arrow-key roving tabindex) via
  // @radix-ui/react-tabs underneath the same markup/classes — plain buttons before
  // this had neither (2026-08-29, UI foundation hardening plan Phase 3, item 3 — see
  // audit/07-ui-polish-findings.md). No Tabs.Content here on purpose: this component
  // only ever renders the switcher UI — every caller renders its own tab panels
  // elsewhere keyed off the same `value` state, which Radix's List/Trigger-only
  // usage (no Content) supports directly.
  return (
    <Tabs.Root value={value} onValueChange={v => onChange(v as T)}>
      <Tabs.List className={containerCls}>
        {tabs.map(tb => (
          <Tabs.Trigger
            key={tb.key}
            value={tb.key}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap outline-none ${
              value === tb.key ? 'bg-brand-500/20 text-brand-400' : `${t.textFaint} ${t.hoverText} ${t.hoverBg}`
            }`}
          >
            <tb.icon className="h-4 w-4" />
            {tb.label}
            {tb.count !== undefined && <span className={`text-[10px] ${value === tb.key ? '' : t.textFaint}`}>{tb.count}</span>}
          </Tabs.Trigger>
        ))}
      </Tabs.List>
    </Tabs.Root>
  );
}
