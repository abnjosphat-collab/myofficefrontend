'use client';

// UnderlineTabs — the rounded-top form-modal tab strip repeated across the
// pto, work_stoppage, and vfl report modals: a row of buttons along a bottom
// border, active tab picked up in a tinted accent color. Generic over the
// tab-id union so each modal keeps its own literal type.

import * as Tabs from '@radix-ui/react-tabs';
import { useTheme, accentText } from '@/components/shared/theme';

export interface UnderlineTab<T extends string> {
  id: T;
  label: string;
}

// Background wash stays constant across themes (a 15%-opacity tint reads fine on
// both a white and a dark page); the text color is the piece that washed out in
// light mode — text-brand-400/rose-400/emerald-400 are tuned for dark glass and
// went pale/blunt on white, so that part comes from the light-aware accentText().
const ACCENT_BG = {
  brand: 'bg-brand-500/15',
  rose: 'bg-rose-500/15',
  emerald: 'bg-emerald-500/15',
} as const;

export function UnderlineTabs<T extends string>({
  tabs,
  value,
  onChange,
  accent = 'brand',
}: {
  tabs: UnderlineTab<T>[];
  value: T;
  onChange: (id: T) => void;
  accent?: keyof typeof ACCENT_BG;
}) {
  const t = useTheme();
  const dallaglio = t.design === 'dallaglio';
  // Real ARIA tabs pattern via @radix-ui/react-tabs, same technique/reasoning as
  // PillTabs (2026-08-29, UI foundation hardening plan Phase 3, item 3). No
  // Tabs.Content — the pto/work_stoppage/vfl modals that use this render their own
  // panels elsewhere, keyed off the same `value` state.
  return (
    <Tabs.Root value={value} onValueChange={v => onChange(v as T)}>
      <Tabs.List className={`flex overflow-x-auto border-b ${t.border} ${dallaglio ? 'gap-5 px-5 pt-2' : 'gap-1 px-5 pt-4'}`}>
        {tabs.map(tb => (
          <Tabs.Trigger
            key={tb.id}
            value={tb.id}
            className={dallaglio
              ? `min-h-10 whitespace-nowrap border-b-2 px-1 py-2 text-[12px] font-medium outline-none transition-colors ${value === tb.id ? 'border-[var(--d-accent)] text-[var(--d-ink)]' : 'border-transparent text-[var(--d-ink-muted)] hover:text-[var(--d-ink)]'}`
              : `px-3 py-2 text-xs font-medium rounded-t-lg whitespace-nowrap transition-colors outline-none ${value === tb.id ? `${ACCENT_BG[accent]} ${accentText(accent, t.light)}` : `${t.textFaint} ${t.hoverText}`}`}
          >
            {tb.label}
          </Tabs.Trigger>
        ))}
      </Tabs.List>
    </Tabs.Root>
  );
}
