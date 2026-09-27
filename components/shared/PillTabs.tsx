'use client';

// PillTabs — the rounded pill-group tab switcher repeated across overtime,
// drivingSchool/dashboard, leave-management, availability, and availabilities:
// a glass pill container with active/inactive buttons carrying an icon, a
// label, and an optional count badge. Generic over the tab-key union so each
// page keeps its own literal type (e.g. 'records' | 'analytics' | ...).

import { ElementType } from 'react';
import * as Tabs from '@radix-ui/react-tabs';
import { useTheme } from '@/components/shared/theme';
import { DsIcon } from '@/components/shared/design-system/DsIcon';
import type { IconMeaning } from '@/components/shared/design-system/shared/icon-meanings';

export interface PillTab<T extends string> {
  key: T;
  label: string;
  icon: ElementType;
  meaning?: IconMeaning;
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
  const dallaglio = t.design === 'dallaglio';
  const effectiveWrap = dallaglio && wrap === 'none' ? 'scroll' : wrap;
  const containerCls = `flex items-center ${dallaglio ? `gap-5 border-b ${t.border} bg-transparent p-0 rounded-none` : `gap-1 ${t.glassSoft} rounded-xl p-1 w-fit`} max-w-full${
    effectiveWrap === 'scroll' ? ' overflow-x-auto' : effectiveWrap === 'wrap' ? ' flex-wrap' : ''
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
            className={dallaglio
              ? `relative inline-flex min-h-11 items-center gap-2 border-b-2 px-1 py-2 text-[13px] font-medium whitespace-nowrap outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--d-focus)] ${value === tb.key ? 'border-[var(--d-accent)] text-[var(--d-ink)]' : 'border-transparent text-[var(--d-ink-muted)] hover:text-[var(--d-ink)]'}`
              : `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap outline-none ${value === tb.key ? 'bg-brand-500/20 text-brand-400' : `${t.textFaint} ${t.hoverText} ${t.hoverBg}`}`}
          >
            {dallaglio && tb.meaning ? <DsIcon name={tb.meaning} size={17} /> : <tb.icon className="h-4 w-4" weight={dallaglio ? 'light' : undefined} />}
            {tb.label}
            {tb.count !== undefined && <span className={`text-[10px] ${value === tb.key ? '' : t.textFaint}`}>{tb.count}</span>}
          </Tabs.Trigger>
        ))}
      </Tabs.List>
    </Tabs.Root>
  );
}
